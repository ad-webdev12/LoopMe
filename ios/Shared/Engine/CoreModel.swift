import Foundation
import CoreML

// The learned second opinion for the extensions. The share sheet and the
// Messages drawer run ScamNet itself (modules/scam-ai/ios/ScamNetRunner.swift).
// The text filter runs ScamNet Lite (ScamNetLite.swift), the version of
// ScamNet small enough for the filter's memory cap. Either may only raise the
// alarm. Neither can talk a rule hit down.
final class CoreModel {
  private let score: (String) -> Double?
  let threshold: Double
  /// "ScamNet" or "ScamNetLite": which one answered, for the filter's health record.
  let kind: String
  private init(kind: String, threshold: Double, score: @escaping (String) -> Double?) { self.kind = kind; self.threshold = threshold; self.score = score }

  static func named(_ name: String = "ScamNet", threshold: Double, bundle: Bundle = .main) -> CoreModel? {
    if name == "ScamNetLite" {
      guard let n = ScamNetLite.load(bundle: bundle) else { return nil }
      return CoreModel(kind: name, threshold: threshold) { n.probability($0) }
    }
    guard let n = ScamNetRunner.load(bundle: bundle) else { return nil }
    return CoreModel(kind: "ScamNet", threshold: threshold) { n.probability($0) }
  }

  /// Probability that the text is a scam, 0 to 1. 0 when the model could not answer.
  func probability(_ text: String) -> Double { score(text) ?? 0 }
}

extension Engine {
  /// The full verdict the extensions use: rules first, then ScamNet on top.
  static func check(_ message: String, _ opts: DetectorOptions = DetectorOptions(), model: CoreModel?) -> Verdict {
    let v = instant(message, opts)
    guard let model = model, !v.tags.contains("allowlist"), v.level != .red, modelMayJudge(message) else { return v }
    let text = Normalize.run(message.trimmingCharacters(in: .whitespacesAndNewlines)).text
    if text.isEmpty { return v }
    // ScamNet may only raise a level, never lower one. See ai.ts upgrade()
    // for why the amber-clear idea was measured and dropped.
    // Long text: the model reads about 100 words, so read it a few sentences at a time (as ai.ts).
    let parts = text.split(whereSeparator: { $0.isWhitespace || $0.isNewline }).count > 40 ? Array(sentenceWindows(text).prefix(12)) : [text]
    let p = parts.map { model.probability($0) }.max() ?? 0
    return fuse(v, p: p, threshold: model.threshold)
  }

  /// Same as BANK_ONLY_OK in ai.ts.
  static let bankOnlyOK: Set<String> = ["bank-alert", "urgency", "url-mismatch"]

  static func fuse(_ v: Verdict, p: Double, threshold: Double) -> Verdict {
    guard p >= threshold else { return v }
    let bankOnly = v.tags.contains("bank-alert") && v.tags.allSatisfy { bankOnlyOK.contains($0) }
    let level: Level = v.level == .red ? .red
      : (v.level == .amber && p >= 0.9 && !bankOnly) ? .red
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
