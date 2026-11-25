// ScamNetRunner runs ScamNet, one fine-tuned transformer (MiniLM) that answers "how likely is
// this text a scam or spam" from 0 to 1. Trained on real messages: the UCI
// SMS Spam Collection, the Mishra-Soni smishing set, the IMC 2025 scam
// corpus, Indian bank and telecom spam, OTP codes and Loop Me's own
// elder-scam set. ml/scamnet/README.md has the recipe and the figures.
//
// Pure Foundation + Core ML so the same file compiles into the app's native
// module and into every extension. No Create ML, no NLModel: the tokenizer
// below is the BERT WordPiece tokenizer the model was trained with.
import Foundation
import CoreML

final class ScamNetRunner {
  static let maxLen = 128
  private let model: MLModel
  private let tok: BertWordPiece
  private var pad: Int32 { tok.pad }

  /// Loads ScamNet.mlmodelc (Xcode-compiled) or compiles ScamNet.mlmodel once into Caches.
  static func load(bundle: Bundle = .main) -> ScamNetRunner? {
    let bundles = [bundle, Bundle(for: ScamNetRunner.self)]
    guard let tok = BertWordPiece.load(bundles), let model = compiled(bundles) else { return nil }
    return ScamNetRunner(model: model, tok: tok)
  }

  private static func compiled(_ bundles: [Bundle]) -> MLModel? {
    let cfg = MLModelConfiguration(); cfg.computeUnits = .all
    for b in bundles {
      if let url = b.url(forResource: "ScamNet", withExtension: "mlmodelc"), let m = try? MLModel(contentsOf: url, configuration: cfg) { return m }
    }
    for b in bundles {
      guard let raw = b.url(forResource: "ScamNet", withExtension: "mlmodel") else { continue }
      let fm = FileManager.default
      let stamp = (try? fm.attributesOfItem(atPath: raw.path)[.modificationDate] as? Date)?.timeIntervalSince1970 ?? 0
      let dir = fm.urls(for: .cachesDirectory, in: .userDomainMask).first ?? fm.temporaryDirectory
      let cached = dir.appendingPathComponent("ScamNet-\(Int(stamp)).mlmodelc")
      if !fm.fileExists(atPath: cached.path) {
        guard let tmp = try? MLModel.compileModel(at: raw) else { continue }
        try? fm.removeItem(at: cached)
        guard (try? fm.moveItem(at: tmp, to: cached)) != nil else { continue }
      }
      if let m = try? MLModel(contentsOf: cached, configuration: cfg) { return m }
    }
    return nil
  }

  private init(model: MLModel, tok: BertWordPiece) { self.model = model; self.tok = tok }

  /// Probability that the text is a scam or spam, 0 to 1. nil if Core ML failed.
  func probability(_ text: String) -> Double? {
    let ids = encode(text)
    guard let idArr = try? MLMultiArray(shape: [1, NSNumber(value: ScamNetRunner.maxLen)], dataType: .int32),
          let maskArr = try? MLMultiArray(shape: [1, NSNumber(value: ScamNetRunner.maxLen)], dataType: .int32) else { return nil }
    for i in 0..<ScamNetRunner.maxLen {
      let v: Int32 = i < ids.count ? ids[i] : pad
      idArr[i] = NSNumber(value: v); maskArr[i] = NSNumber(value: i < ids.count ? 1 : 0)
    }
    guard let input = try? MLDictionaryFeatureProvider(dictionary: ["input_ids": MLFeatureValue(multiArray: idArr), "attention_mask": MLFeatureValue(multiArray: maskArr)]),
          let out = try? model.prediction(from: input),
          let p = out.featureValue(for: "scamProbability")?.multiArrayValue else { return nil }
    return max(0, min(1, p[0].doubleValue))
  }

  func encode(_ text: String) -> [Int32] { tok.encode(text, maxLen: ScamNetRunner.maxLen) }
}

/// BERT uncased tokenizer (basic + WordPiece), matching Hugging Face's
/// BertTokenizer. Shared by ScamNet and ScamNet Lite: both use the same vocab.
final class BertWordPiece {
  let vocab: [String: Int32]
  let cls: Int32, sep: Int32, pad: Int32, unk: Int32

  static func load(_ bundles: [Bundle]) -> BertWordPiece? {
    guard let url = bundles.lazy.compactMap({ $0.url(forResource: "ScamNet.vocab", withExtension: "txt") }).first,
          let text = try? String(contentsOf: url, encoding: .utf8) else { return nil }
    var vocab: [String: Int32] = [:]; vocab.reserveCapacity(31000)
    var i: Int32 = 0
    for line in text.split(separator: "\n", omittingEmptySubsequences: false) { vocab[String(line)] = i; i += 1 }
    return BertWordPiece(vocab: vocab)
  }
  init(vocab: [String: Int32]) {
    self.vocab = vocab
    cls = vocab["[CLS]"] ?? 101; sep = vocab["[SEP]"] ?? 102; pad = vocab["[PAD]"] ?? 0; unk = vocab["[UNK]"] ?? 100
  }

  func encode(_ text: String, maxLen: Int) -> [Int32] {
    var ids: [Int32] = [cls]
    for word in basicTokens(text) {
      for piece in wordPiece(word) { ids.append(piece) }
      if ids.count >= maxLen - 1 { break }
    }
    if ids.count > maxLen - 1 { ids = Array(ids.prefix(maxLen - 1)) }
    ids.append(sep)
    return ids
  }
  private func basicTokens(_ text: String) -> [String] {
    // Lowercase, strip accents, split on whitespace, split punctuation and CJK characters into their own tokens.
    let folded = text.lowercased().folding(options: [.diacriticInsensitive], locale: nil)
    var tokens: [String] = []; var cur = ""
    func flush() { if !cur.isEmpty { tokens.append(cur); cur = "" } }
    for scalar in folded.unicodeScalars {
      let v = scalar.value
      if v == 0 || v == 0xFFFD || (v < 32 && v != 9 && v != 10 && v != 13) { continue }
      if scalar.properties.isWhitespace || v == 9 || v == 10 || v == 13 { flush(); continue }
      let isPunct = (v >= 33 && v <= 47) || (v >= 58 && v <= 64) || (v >= 91 && v <= 96) || (v >= 123 && v <= 126)
        || scalar.properties.generalCategory.isPunctuation
      let isCJK = (v >= 0x4E00 && v <= 0x9FFF) || (v >= 0x3400 && v <= 0x4DBF) || (v >= 0x20000 && v <= 0x2A6DF) || (v >= 0xF900 && v <= 0xFAFF)
      if isPunct || isCJK { flush(); tokens.append(String(scalar)); continue }
      if scalar.properties.generalCategory == .nonspacingMark { continue }
      cur.unicodeScalars.append(scalar)
    }
    flush()
    return tokens
  }

  private func wordPiece(_ word: String) -> [Int32] {
    let chars = Array(word)
    if chars.count > 100 { return [unk] }
    var out: [Int32] = []; var start = 0
    while start < chars.count {
      var end = chars.count; var found: Int32? = nil
      while start < end {
        var sub = String(chars[start..<end]); if start > 0 { sub = "##" + sub }
        if let id = vocab[sub] { found = id; break }
        end -= 1
      }
      guard let id = found else { return [unk] }
      out.append(id); start = end
    }
    return out
  }
}

private extension Unicode.GeneralCategory {
  var isPunctuation: Bool {
    switch self {
    case .connectorPunctuation, .dashPunctuation, .openPunctuation, .closePunctuation, .initialPunctuation, .finalPunctuation, .otherPunctuation: return true
    default: return false
    }
  }
}
