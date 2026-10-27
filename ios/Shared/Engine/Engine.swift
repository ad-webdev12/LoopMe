import Foundation

// Port of src/engine/ScamDetector.ts detect() and the synchronous fusion in
// src/engine/ai.ts instant(). This is what the text filter, the share sheet
// and the call directory run, with no JavaScript in the process.
//
// Checked against the TypeScript engine message by message by
// scripts/check-engine.sh. If you change either side, run that.

enum Level: String { case red, amber, green }
enum Confidence: String { case very, fairly, unsure }

struct Verdict {
  var level: Level
  var reason: String
  var safeStep: String
  var signals: [String]
  var matches: [String]
  var tags: [String]
  var confidence: Confidence
  var codeWordMoment: Bool
  var score: Int
  var disguised: Bool
  var fused: Bool = false
  var probability: Double = 0
}

struct DetectorOptions {
  var allowlist: [String] = []
  var sender: String? = nil
  var recentTags: [String] = []
  var postPanic: Bool = false
}

enum Engine {
  static func detect(_ message: String, _ opts: DetectorOptions = DetectorOptions()) -> Verdict {
    let t = EngineTables.shared
    let norm = Normalize.run(message.trimmingCharacters(in: .whitespacesAndNewlines))
    let text = norm.text
    var v = Verdict(level: .green, reason: "", safeStep: "", signals: [], matches: [], tags: [], confidence: .very, codeWordMoment: false, score: 0, disguised: norm.disguised)
    if text.isEmpty {
      v.reason = "There’s nothing to check yet."
      v.safeStep = "Paste or share a message and tap “Check it”."
      return v
    }

    let allow = opts.allowlist.map { $0.lowercased().trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    let hay = (text + " " + (opts.sender ?? "")).lowercased()
    if allow.contains(where: { hay.contains($0) }) {
      v.reason = "This matches a sender you told me is safe."
      v.safeStep = "If anything still feels off, loop in someone you trust."
      v.tags = ["allowlist"]
      v.confidence = .fairly
      return v
    }

    var score = 0
    var signals: [String] = [], matches: [String] = [], tags: [String] = []
    for r in t.rules {
      if let m = r.re.first(in: text) {
        score += r.w; signals.append(r.plain); matches.append(m)
        if !tags.contains(r.tag) { tags.append(r.tag) }
      }
    }
    if opts.postPanic && tags.contains("recovery") { score += 35 }

    if norm.disguised {
      score += 25
      signals.append("The message hides its words behind look-alike or invisible characters so filters can’t read them. Honest senders never do this.")
      if !tags.contains("disguise") { tags.append("disguise") }
    }

    let links = Links.analyze(text)
    for h in links.hits {
      score += h.w; signals.append(h.plain); matches.append(h.match)
      if !tags.contains(h.tag) { tags.append(h.tag) }
    }
    if links.urlCount >= 3 {
      score += 15
      signals.append("It contains several links. Real banks send one link at most; scammers scatter many.")
      tags.append("url-many")
    }

    for g in t.knownGood {
      if g.tag == "good-otp-arriving" && tags.contains("otp-request") { continue }
      if g.tag == "good-disclaimer" && (tags.contains("otp-request") || tags.contains("safe-account")) { continue }
      if g.re.test(text) { score += g.w }
    }
    score = max(0, score)

    let hasPay = tags.contains { t.payTags.contains($0) }
    let hasUrg = tags.contains { t.urgTags.contains($0) }
    let hasSec = tags.contains("secrecy")
    let triangle = (hasPay ? 1 : 0) + (hasUrg ? 1 : 0) + (hasSec ? 1 : 0)
    if triangle >= 2 { score = max(score, 30) + 20 }
    var forceRed = triangle == 3

    let twoStage = opts.recentTags.contains("bank-alert") && (tags.contains("safe-account") || tags.contains("bank-alert"))
    if tags.contains("safe-account") { forceRed = true }
    if twoStage { forceRed = true; if !tags.contains("two-stage") { tags.append("two-stage") } }

    let codeWordMoment = tags.contains { t.codeWordTags.contains($0) }

    let level: Level = (score >= 50 || forceRed) ? .red : score >= 20 ? .amber : .green
    let confidence: Confidence = (forceRed || score >= 75) ? .very
      : level == .red ? .very
      : level == .amber ? (score >= 35 ? .fairly : .unsure)
      : (signals.isEmpty ? .very : .fairly)

    let hasBadLink = links.hits.contains { $0.w > 0 }
    var reason: String, safeStep: String
    switch level {
    case .red:
      reason = twoStage
        ? "This is the trick: a fake alert, then a “fraud agent.” Your bank will never move your money to a “safe account.”"
        : (signals.first ?? "This is a scam.")
      if twoStage || tags.contains("safe-account") { safeStep = "Hang up. Call the number on the back of your bank card. No other number." }
      else if hasBadLink { safeStep = "Do not tap the link. Delete the message." }
      else if tags.contains("otp-request") { safeStep = "Don’t share the code with anyone. Delete the message." }
      else if tags.contains("sextortion") { safeStep = "Don’t pay and don’t reply. It’s a mass-sent bluff. Delete it, and tell someone you trust." }
      else if codeWordMoment { safeStep = "Before anything else, ask them for your family code word." }
      else { safeStep = "Do not reply and do not send anything. Delete the message." }
    case .amber:
      reason = signals.first ?? "Something’s off here."
      safeStep = "Do not tap anything yet. Contact the company yourself on a number you already trust."
    case .green:
      reason = "Nothing in this message matches a known scam trick."
      safeStep = "Nothing to do now. If it later asks for money, a code or a password, treat it as a scam."
    }

    v.level = level; v.reason = reason; v.safeStep = safeStep
    v.signals = signals; v.matches = matches; v.tags = tags
    v.confidence = confidence; v.codeWordMoment = codeWordMoment; v.score = score
    return v
  }

  /// Rules plus the learned model, fused the way ai.ts instant() fuses them.
  /// The model may only ever raise the alarm, never lower it.
  static func instant(_ message: String, _ opts: DetectorOptions = DetectorOptions()) -> Verdict {
    var v = detect(message, opts)
    if v.tags.contains("allowlist") { return v }
    let t = EngineTables.shared
    let normalized = Normalize.run(message.trimmingCharacters(in: .whitespacesAndNewlines)).text
    let p = Model.probability(normalized)
    v.probability = p
    if p < t.threshold { return v }

    let level: Level = v.level == .red ? .red
      : (v.level == .amber && p >= 0.9) ? .red
      : .amber
    if level == v.level { return v }

    let note = "The on-device model recognizes the shape of this message as a scam, even though it does not match a specific known trick."
    var out = v
    out.fused = true
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
