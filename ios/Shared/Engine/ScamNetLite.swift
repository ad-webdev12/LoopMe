// ScamNet Lite: the version of ScamNet that fits inside the text filter.
//
// The filter extension runs under a memory cap far below the full model's
// size, and iOS kills an extension that goes over it, which means no
// filtering at all. So the filter runs a 2-layer BERT that was taught by
// ScamNet itself (ml/scamnet/distill_lite.py), with the same vocabulary and
// tokenizer.
//
// Core ML is not used here on purpose: it may unpack weights into memory. The
// weights live in one file, ScamNetLite.bin, that is memory-mapped read-only.
// The word table (most of the model) stays as 8-bit numbers on disk and only
// the rows for the words in a message are expanded. Mapped file pages are
// clean memory that iOS can drop, so they do not count against the cap the
// way allocated memory does.
//
// File: "SNL1", u32 header length, JSON header, then tensors at the offsets
// the header names, 16-byte aligned, little-endian.
import Foundation
import Accelerate

final class ScamNetLite {
  static let maxLen = 128

  private let base: UnsafeRawPointer
  private let size: Int
  private let tok: BertWordPiece
  private let hidden: Int, layers: Int, heads: Int, inter: Int, eps: Float
  private var tensors: [String: (offset: Int, count: Int)] = [:]

  static func load(bundle: Bundle = .main) -> ScamNetLite? {
    let bundles = [bundle, Bundle(for: ScamNetLite.self)]
    guard let url = bundles.lazy.compactMap({ $0.url(forResource: "ScamNetLite", withExtension: "bin") }).first,
          let tok = BertWordPiece.load(bundles) else { return nil }
    return ScamNetLite(url: url, tok: tok)
  }

  private init?(url: URL, tok: BertWordPiece) {
    let fd = open(url.path, O_RDONLY)
    guard fd >= 0 else { return nil }
    defer { close(fd) }
    var st = stat()
    guard fstat(fd, &st) == 0, st.st_size > 8 else { return nil }
    let size = Int(st.st_size)
    guard let p = mmap(nil, size, PROT_READ, MAP_PRIVATE, fd, 0), p != MAP_FAILED else { return nil }
    let base = UnsafeRawPointer(p)
    guard String(bytes: UnsafeRawBufferPointer(start: base, count: 4), encoding: .ascii) == "SNL1" else { munmap(p, size); return nil }
    let headerLen = Int(base.loadUnaligned(fromByteOffset: 4, as: UInt32.self).littleEndian)
    guard 8 + headerLen <= size,
          let header = try? JSONSerialization.jsonObject(with: Data(bytes: base + 8, count: headerLen)) as? [String: Any],
          let cfg = header["config"] as? [String: Any], let ts = header["tensors"] as? [String: [String: Any]] else { munmap(p, size); return nil }
    self.base = base; self.size = size; self.tok = tok
    hidden = cfg["hidden"] as? Int ?? 128; layers = cfg["layers"] as? Int ?? 2
    heads = cfg["heads"] as? Int ?? 2; inter = cfg["inter"] as? Int ?? 512
    eps = Float(cfg["eps"] as? Double ?? 1e-12)
    for (name, t) in ts {
      guard let off = t["offset"] as? Int, let count = t["count"] as? Int else { continue }
      tensors[name] = (off, count)
    }
  }

  deinit { munmap(UnsafeMutableRawPointer(mutating: base), size) }

  private func f32(_ name: String) -> UnsafePointer<Float> {
    (base + tensors[name]!.offset).assumingMemoryBound(to: Float.self)
  }
  private func i8(_ name: String) -> UnsafePointer<Int8> {
    (base + tensors[name]!.offset).assumingMemoryBound(to: Int8.self)
  }

  /// Probability that the text is a scam or spam, 0 to 1.
  func probability(_ text: String) -> Double? {
    let ids = tok.encode(text, maxLen: ScamNetLite.maxLen)
    let n = ids.count, H = hidden
    let vocabRows = tensors["emb.word.q"].map { $0.count / H } ?? 0
    var x = [Float](repeating: 0, count: n * H)

    // Embeddings: 8-bit word row times its scale, plus position and type 0, then LayerNorm.
    let wq = i8("emb.word.q"), ws = f32("emb.word.scale"), pos = f32("emb.pos"), typ = f32("emb.type")
    for i in 0..<n {
      let id = Int(ids[i]); guard id >= 0, id < vocabRows else { return nil }
      let row = wq + id * H, s = ws[id]
      for j in 0..<H { x[i * H + j] = Float(row[j]) * s + pos[i * H + j] + typ[j] }
    }
    layerNorm(&x, n, f32("emb.ln.g"), f32("emb.ln.b"))

    let hd = H / heads, scale = 1 / sqrtf(Float(hd))
    var q = [Float](repeating: 0, count: n * H), k = q, v = q, ctx = q, tmp = q
    var scores = [Float](repeating: 0, count: n * n)
    var mid = [Float](repeating: 0, count: n * inter)
    for l in 0..<layers {
      let P = "l\(l)."
      linear(x, n, H, f32(P + "q.w"), f32(P + "q.b"), H, &q)
      linear(x, n, H, f32(P + "k.w"), f32(P + "k.b"), H, &k)
      linear(x, n, H, f32(P + "v.w"), f32(P + "v.b"), H, &v)
      for h in 0..<heads {
        q.withUnsafeBufferPointer { qp in k.withUnsafeBufferPointer { kp in scores.withUnsafeMutableBufferPointer { sp in
          cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, Int32(n), Int32(n), Int32(hd), scale,
                      qp.baseAddress! + h * hd, Int32(H), kp.baseAddress! + h * hd, Int32(H), 0, sp.baseAddress!, Int32(n))
        } } }
        for r in 0..<n { softmax(&scores, r * n, n) }
        scores.withUnsafeBufferPointer { sp in v.withUnsafeBufferPointer { vp in ctx.withUnsafeMutableBufferPointer { cp in
          cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, Int32(n), Int32(hd), Int32(n), 1,
                      sp.baseAddress!, Int32(n), vp.baseAddress! + h * hd, Int32(H), 0, cp.baseAddress! + h * hd, Int32(H))
        } } }
      }
      linear(ctx, n, H, f32(P + "ao.w"), f32(P + "ao.b"), H, &tmp)
      for i in 0..<(n * H) { x[i] += tmp[i] }
      layerNorm(&x, n, f32(P + "ln1.g"), f32(P + "ln1.b"))
      linear(x, n, H, f32(P + "fi.w"), f32(P + "fi.b"), inter, &mid)
      for i in 0..<(n * inter) { let z = mid[i]; mid[i] = 0.5 * z * (1 + erff(z / 1.4142135)) }
      linear(mid, n, inter, f32(P + "fo.w"), f32(P + "fo.b"), H, &tmp)
      for i in 0..<(n * H) { x[i] += tmp[i] }
      layerNorm(&x, n, f32(P + "ln2.g"), f32(P + "ln2.b"))
    }

    // Pooler on the [CLS] row, then the two-way classifier.
    var pooled = [Float](repeating: 0, count: H)
    linear(Array(x[0..<H]), 1, H, f32("pool.w"), f32("pool.b"), H, &pooled)
    for j in 0..<H { pooled[j] = tanhf(pooled[j]) }
    var logits = [Float](repeating: 0, count: 2)
    linear(pooled, 1, H, f32("cls.w"), f32("cls.b"), 2, &logits)
    let d = Double(logits[1] - logits[0])
    return 1 / (1 + exp(-d))
  }

  /// y[n, out] = x[n, in] * W[out, in]^T + b
  private func linear(_ x: [Float], _ n: Int, _ inDim: Int, _ w: UnsafePointer<Float>, _ b: UnsafePointer<Float>, _ out: Int, _ y: inout [Float]) {
    for i in 0..<n { for j in 0..<out { y[i * out + j] = b[j] } }
    x.withUnsafeBufferPointer { xp in y.withUnsafeMutableBufferPointer { yp in
      cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, Int32(n), Int32(out), Int32(inDim), 1,
                  xp.baseAddress!, Int32(inDim), w, Int32(inDim), 1, yp.baseAddress!, Int32(out))
    } }
  }

  private func layerNorm(_ x: inout [Float], _ n: Int, _ g: UnsafePointer<Float>, _ b: UnsafePointer<Float>) {
    let H = hidden
    for i in 0..<n {
      var mean: Float = 0, sq: Float = 0
      for j in 0..<H { mean += x[i * H + j] }
      mean /= Float(H)
      for j in 0..<H { let d = x[i * H + j] - mean; sq += d * d }
      let inv = 1 / sqrtf(sq / Float(H) + eps)
      for j in 0..<H { x[i * H + j] = (x[i * H + j] - mean) * inv * g[j] + b[j] }
    }
  }

  private func softmax(_ a: inout [Float], _ start: Int, _ n: Int) {
    var m = -Float.infinity
    for j in 0..<n { m = max(m, a[start + j]) }
    var sum: Float = 0
    for j in 0..<n { let e = expf(a[start + j] - m); a[start + j] = e; sum += e }
    for j in 0..<n { a[start + j] /= sum }
  }
}
