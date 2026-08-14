import ExpoModulesCore
import Foundation
import NaturalLanguage

#if canImport(FoundationModels)
import FoundationModels
#endif

// On-device scam intelligence. Two real ML tiers, both fully offline:
//   Tier 1 — Apple Foundation Models (iOS 26+, Apple Intelligence): an on-device
//            LLM that reads the message and returns a structured judgement.
//   Tier 2 — a bundled Core ML text classifier (NaturalLanguage NLModel), for
//            phones without Apple Intelligence.
// The JS layer keeps a deterministic safety-net underneath both. Nothing is
// sent off the device; there is no network path in this module at all.

public class ScamAiModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ScamAi")

    // Which real AI tier is available on THIS phone, right now.
    // -> "foundation" | "coreml" | "none"
    AsyncFunction("availableTier") { () -> String in
      if #available(iOS 26.0, *) {
        #if canImport(FoundationModels)
        let model = SystemLanguageModel.default
        if case .available = model.availability { return "foundation" }
        #endif
      }
      if ScamClassifier.shared.isLoaded { return "coreml" }
      return "none"
    }

    // Real on-device classification. Returns a JSON string:
    // { tier, label: "scam"|"suspicious"|"safe", probability: 0..1,
    //   reason: string, category: string }
    AsyncFunction("classify") { (text: String) -> String in
      return await ScamAI.classify(text)
    }
  }
}

enum ScamAI {
  static func classify(_ text: String) async -> String {
    let clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
    if clean.isEmpty { return json(tier: "none", label: "safe", p: 0, reason: "There is nothing to check yet.", category: "empty") }

    if #available(iOS 26.0, *) {
      #if canImport(FoundationModels)
      if case .available = SystemLanguageModel.default.availability {
        if let r = await foundationClassify(clean) { return r }
      }
      #endif
    }
    if let r = ScamClassifier.shared.classify(clean) { return r }
    return json(tier: "none", label: "safe", p: 0, reason: "On-device AI is not available on this phone; using the built-in checks.", category: "unavailable")
  }

  @available(iOS 26.0, *)
  static func foundationClassify(_ text: String) async -> String? {
    #if canImport(FoundationModels)
    let instructions = """
    You are a scam-detection assistant for older adults. Read one message and \
    judge whether it is a scam. Be decisive and protective. Scam families: fake \
    bank fraud alerts and the "safe account" move, gift-card demands, \
    family-emergency and grandparent scams, government-impersonation threats, \
    package/toll fee smishing, one-time-code theft, romance and investment \
    ("pig butchering") cons, tech-support and remote-access, prize/refund bait, \
    look-alike links. A message asking for money, codes, gift cards, secrecy, or \
    urgent action from an unexpected sender is almost always a scam. Ordinary \
    receipts, appointment reminders, delivery updates, and arriving verification \
    codes are safe.

    Respond with ONE line of strict JSON and nothing else:
    {"label":"scam|suspicious|safe","probability":0.0-1.0,"reason":"one short plain sentence","category":"short-label"}
    """
    do {
      let session = LanguageModelSession(instructions: instructions)
      let prompt = "Judge this message:\n\"\"\"\n\(text)\n\"\"\""
      let response = try await session.respond(to: prompt)
      guard let parsed = parseModelJSON(response.content) else { return nil }
      return json(tier: "foundation", label: parsed.label, p: parsed.probability, reason: parsed.reason, category: parsed.category)
    } catch {
      return nil
    }
    #else
    return nil
    #endif
  }

  // Pull the JSON object out of a model's text reply (tolerant of stray prose).
  static func parseModelJSON(_ raw: String) -> (label: String, probability: Double, reason: String, category: String)? {
    guard let start = raw.firstIndex(of: "{"), let end = raw.lastIndex(of: "}") else { return nil }
    let slice = String(raw[start...end])
    guard let data = slice.data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
    let labelRaw = (obj["label"] as? String)?.lowercased() ?? "safe"
    let label = ["scam", "suspicious", "safe"].contains(labelRaw) ? labelRaw : "safe"
    let prob = (obj["probability"] as? Double) ?? Double(obj["probability"] as? Int ?? 0)
    let reason = (obj["reason"] as? String) ?? ""
    let category = (obj["category"] as? String) ?? label
    return (label, prob, reason, category)
  }

  static func json(tier: String, label: String, p: Double, reason: String, category: String) -> String {
    let obj: [String: Any] = [
      "tier": tier, "label": label,
      "probability": max(0, min(1, p)),
      "reason": reason, "category": category
    ]
    if let d = try? JSONSerialization.data(withJSONObject: obj),
       let s = String(data: d, encoding: .utf8) { return s }
    return "{\"tier\":\"none\",\"label\":\"safe\",\"probability\":0,\"reason\":\"\",\"category\":\"error\"}"
  }
}

// Bundled Core ML text classifier (Create ML MLTextClassifier -> NLModel).
// Loads ScamText.mlmodelc from the app bundle if present.
final class ScamClassifier {
  static let shared = ScamClassifier()
  private var model: NLModel?
  var isLoaded: Bool { model != nil }

  private init() {
    if let url = Bundle.main.url(forResource: "ScamText", withExtension: "mlmodelc"),
       let m = try? NLModel(contentsOf: url) {
      model = m
    } else if let url = Bundle.main.url(forResource: "ScamText", withExtension: "mlmodel"),
              let compiled = try? MLModel.compileModel(at: url),
              let m = try? NLModel(contentsOf: compiled) {
      model = m
    }
  }

  func classify(_ text: String) -> String? {
    guard let model = model else { return nil }
    guard let label = model.predictedLabel(for: text) else { return nil }
    let hypotheses = model.predictedLabelHypotheses(for: text, maximumCount: 2)
    let scamProb = hypotheses["scam"] ?? (label == "scam" ? 0.8 : 0.15)
    let isScam = label == "scam"
    let reason = isScam
      ? "The on-device model recognizes the wording and structure of a known scam."
      : "The on-device model does not match this to a known scam pattern."
    return ScamAI.json(
      tier: "coreml",
      label: isScam ? "scam" : "safe",
      p: scamProb,
      reason: reason,
      category: isScam ? "model-flagged" : "safe"
    )
  }
}

import CoreML
