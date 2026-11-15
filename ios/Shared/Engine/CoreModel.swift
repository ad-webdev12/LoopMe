import Foundation
import CoreML
import NaturalLanguage

// The learned second opinion for the extensions: ScamNet, the one
// fine-tuned transformer the app ships (modules/scam-ai/ios/ScamNetRunner.swift).
// It may only raise the alarm. It cannot talk a rule hit down.
final class CoreModel {
  private let net: ScamNetRunner
  let threshold: Double
  private init(net: ScamNetRunner, threshold: Double) { self.net = net; self.threshold = threshold }

  static func named(_ name: String = "ScamNet", threshold: Double, bundle: Bundle = .main) -> CoreModel? {
    guard let n = ScamNetRunner.load(bundle: bundle) else { return nil }
    return CoreModel(net: n, threshold: threshold)
  }

  /// Probability that the text is a scam, 0 to 1. 0 when Core ML is unavailable.
  func probability(_ text: String) -> Double { net.probability(text) ?? 0 }
}

extension Engine {
  /// The full verdict the extensions use: rules, the portable model, then the
  /// Core ML model on top, with the same raise-only policy as instant().
  static func check(_ message: String, _ opts: DetectorOptions = DetectorOptions(), model: CoreModel?) -> Verdict {
    let v = instant(message, opts)
    guard let model = model, !v.tags.contains("allowlist"), v.level != .red, modelMayJudge(message) else { return v }
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
      : "Don’t tap or reply yet. Check with them on a number you already have."
    if !out.signals.contains(note) { out.signals.append(note) }
    out.confidence = p >= 0.9 ? .fairly : .unsure
    return out
  }
}
