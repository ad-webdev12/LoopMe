import Foundation
import CoreML
import NaturalLanguage

// The learned second opinion for the extensions. Two Create ML text
// classifiers ship with the app, trained by ml/train.swift on the same data:
//   ScamText   BERT transfer learning, about 70 MB at inference. The app and
//              the share sheet use it.
//   ScamFilter maximum entropy bag of words, under 1 MB. The text filter
//              uses it because that extension runs under a tight memory cap.
// Either may only raise the alarm. Neither can talk a rule hit down.
final class CoreModel {
  private let model: NLModel
  // ScamText needs Apple's contextual-embedding assets, which a phone may not
  // have yet; it then answers nil. ScamFilter steps in for that text.
  private let fallback: NLModel?
  let threshold: Double

  private init(model: NLModel, fallback: NLModel?, threshold: Double) { self.model = model; self.fallback = fallback; self.threshold = threshold }

  static func named(_ name: String, threshold: Double, bundle: Bundle = .main) -> CoreModel? {
    guard let m = load(name, bundle) else { return nil }
    let fb = name == "ScamText" ? load("ScamFilter", bundle) : nil
    return CoreModel(model: m, fallback: fb, threshold: threshold)
  }

  /// Loads `name.mlmodelc` (compiled by Xcode) or, failing that, compiles
  /// `name.mlmodel` once and keeps the result in Caches.
  private static func load(_ name: String, _ bundle: Bundle) -> NLModel? {
    if let url = bundle.url(forResource: name, withExtension: "mlmodelc"), let m = try? NLModel(contentsOf: url) { return m }
    guard let raw = bundle.url(forResource: name, withExtension: "mlmodel") else { return nil }
    let fm = FileManager.default
    let stamp = (try? fm.attributesOfItem(atPath: raw.path)[.modificationDate] as? Date)?.timeIntervalSince1970 ?? 0
    let cacheDir = fm.urls(for: .cachesDirectory, in: .userDomainMask).first ?? fm.temporaryDirectory
    let cached = cacheDir.appendingPathComponent("\(name)-\(Int(stamp)).mlmodelc")
    if !fm.fileExists(atPath: cached.path) {
      guard let tmp = try? MLModel.compileModel(at: raw) else { return nil }
      try? fm.removeItem(at: cached)
      guard (try? fm.moveItem(at: tmp, to: cached)) != nil else { return nil }
    }
    return try? NLModel(contentsOf: cached)
  }

  /// Probability that the text is a scam, 0 to 1. Both models are asked and
  /// the higher answer wins: each may only ever raise the alarm, and they
  /// miss different things (the BERT model slept through a job scam the
  /// bag-of-words model caught at 0.9).
  func probability(_ text: String) -> Double {
    var p = 0.0
    if model.predictedLabel(for: text) != nil {
      p = model.predictedLabelHypotheses(for: text, maximumCount: 2)["scam"] ?? 0
    }
    if let fb = fallback, fb.predictedLabel(for: text) != nil {
      p = max(p, fb.predictedLabelHypotheses(for: text, maximumCount: 2)["scam"] ?? 0)
    }
    return p
  }
}

extension Engine {
  /// The full verdict the extensions use: rules, the portable model, then the
  /// Core ML model on top, with the same raise-only policy as instant().
  static func check(_ message: String, _ opts: DetectorOptions = DetectorOptions(), model: CoreModel?) -> Verdict {
    let v = instant(message, opts)
    guard let model = model, !v.tags.contains("allowlist"), v.level != .red else { return v }
    let text = Normalize.run(message.trimmingCharacters(in: .whitespacesAndNewlines)).text
    if text.isEmpty { return v }
    // No model ever lowers a level. The same text must get the same answer
    // in the drawer, the share sheet, the text filter and the app.
    return fuse(v, p: model.probability(text), threshold: model.threshold)
  }

  static func fuse(_ v: Verdict, p: Double, threshold: Double) -> Verdict {
    guard p >= threshold else { return v }
    let level: Level = v.level == .red ? .red
      : (v.level == .amber && p >= 0.9) ? .red
      : .amber
    if level == v.level { return v }
    let note = "The on-device model recognizes the shape of this message as a scam, even though it does not match a specific known trick."
    var out = v
    out.fused = true
    out.probability = max(out.probability, p)
    if v.level == .green { out.reason = "This does not match a named trick, but it reads like a scam." }
    out.level = level
    out.safeStep = level == .red
      ? "Do not reply and do not send anything. Delete the message."
      : "Do not tap anything yet. Contact the company yourself on a number you already trust."
    if !out.signals.contains(note) { out.signals.append(note) }
    out.confidence = p >= 0.9 ? .fairly : .unsure
    return out
  }
}
