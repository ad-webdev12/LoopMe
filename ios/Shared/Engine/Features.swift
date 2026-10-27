import Foundation

// Port of src/engine/features.ts and model.ts: hashed word, bigram, trigram
// and character 4-gram features, a handful of structural facts, L2 norm, then
// logistic regression over the weights in engine.json.
//
// Hashing runs over UTF-16 code units, because that is what JavaScript's
// charCodeAt sees, and the two engines must land in the same buckets.

enum Model {
  private static let notWord = try! NSRegularExpression(pattern: "[^a-z0-9$£€@.'-]+")
  private static let bangbang = try! NSRegularExpression(pattern: "[!]{2,}|[?]{2,}")
  private static let whitespace = try! NSRegularExpression(pattern: "\\s+")

  private static func hash(_ units: [UInt16], dim: Int) -> Int {
    var h: UInt32 = 0x811c9dc5
    for u in units {
      h ^= UInt32(u)
      h = h &* 0x01000193
    }
    return Int(h % UInt32(dim))
  }

  private static func structural(_ raw: String, _ words: [String], _ t: EngineTables) -> [String] {
    var out: [String] = []
    let f = t.features
    let urls = f["URL_RE"]?.all(in: raw) ?? []
    if !urls.isEmpty { out.append("S:url") }
    if urls.count > 1 { out.append("S:multiurl") }
    if f["SHORTENER_RE"]?.test(raw) == true { out.append("S:shortener") }
    if f["RISKY_TLD_RE"]?.test(raw) == true { out.append("S:riskytld") }
    if f["MONEY_RE"]?.test(raw) == true { out.append("S:money") }
    if f["PHONE_RE"]?.test(raw) == true { out.append("S:phone") }
    if f["CODE_RE"]?.test(raw) == true { out.append("S:code") }
    let delivered = f["CODE_DELIVERED_RE"]?.test(raw) == true
    let requested = f["CODE_REQUESTED_RE"]?.test(raw) == true
    if delivered && !requested { out.append("S:code-delivered") }
    if requested { out.append("S:code-requested") }
    if f["NEVER_SHARE_RE"]?.test(raw) == true { out.append("S:never-share") }
    if bangbang.test(raw) { out.append("S:bangbang") }

    var letters = 0, caps = 0
    for u in raw.unicodeScalars {
      if (u >= "a" && u <= "z") { letters += 1 }
      else if (u >= "A" && u <= "Z") { letters += 1; caps += 1 }
    }
    if letters > 12 && Double(caps) / Double(letters) > 0.4 { out.append("S:shouty") }
    let n = words.count
    out.append(n < 8 ? "S:len:xs" : n < 18 ? "S:len:s" : n < 35 ? "S:len:m" : "S:len:l")
    return out
  }

  /// Sparse hashed features with counts, L2-normalized. `raw` is already normalized text.
  static func featurize(_ raw: String) -> [Int: Double] {
    let t = EngineTables.shared
    let lower = raw.lowercased()
    let words = notWord.stringByReplacingMatches(in: lower, options: [], range: NSRange(lower.startIndex..., in: lower), withTemplate: "\u{1}")
      .split(separator: "\u{1}").map(String.init)
    var feats: [Int: Double] = [:]
    func add(_ key: String, _ v: Double = 1) {
      let i = hash(Array(key.utf16), dim: t.dim)
      feats[i, default: 0] += v
    }
    for i in 0..<words.count {
      add("W:" + words[i])
      if i + 1 < words.count { add("B:" + words[i] + "_" + words[i + 1]) }
      if i + 2 < words.count { add("T:" + words[i] + "_" + words[i + 1] + "_" + words[i + 2]) }
    }
    let squished = Array(whitespace.stringByReplacingMatches(in: lower, options: [], range: NSRange(lower.startIndex..., in: lower), withTemplate: " ").utf16)
    let prefix = Array("C:".utf16)
    if squished.count >= 4 {
      for i in 0...(squished.count - 4) {
        let idx = hash(prefix + squished[i..<(i + 4)], dim: t.dim)
        feats[idx, default: 0] += t.charW
      }
    }
    for s in structural(raw, words, t) { add(s, 1) }

    var norm = 0.0
    for v in feats.values { norm += v * v }
    norm = norm.squareRoot()
    if norm == 0 { norm = 1 }
    for (k, v) in feats { feats[k] = v / norm }
    return feats
  }

  /// Probability in 0..1 that `normalized` is a scam.
  static func probability(_ normalized: String) -> Double {
    let t = EngineTables.shared
    var z = t.bias
    for (i, v) in featurize(normalized) { z += t.weights[i] * v }
    z = max(-30, min(30, z))
    return 1 / (1 + exp(-z))
  }
}
