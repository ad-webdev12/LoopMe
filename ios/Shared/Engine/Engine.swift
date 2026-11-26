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

    // Long text raises the bar, exactly as ScamDetector.ts does.
    let words = text.split(whereSeparator: { $0.isWhitespace || $0.isNewline }).count
    let longFactor: Double = words > 40 ? min(4, 1 + Double(words - 40) / 30) : 1
    if tags.contains("url-blocklisted") { forceRed = true }
    let redAt = 50 * longFactor, amberAt = 20 * longFactor
    let level: Level = (Double(score) >= redAt || forceRed) ? .red : Double(score) >= amberAt ? .amber : .green
    let confidence: Confidence = (forceRed || Double(score) >= 75 * longFactor) ? .very
      : level == .red ? .very
      : level == .amber ? (Double(score) >= 35 * longFactor ? .fairly : .unsure)
      : (signals.isEmpty ? .very : .fairly)

    let hasBadLink = links.hits.contains { $0.w > 0 }
    var reason: String, safeStep: String
    switch level {
    case .red:
      reason = twoStage
        ? "A fake alert, then a “fraud agent” who wants your money moved."
        : (signals.first ?? "This is a scam.")
      if twoStage || tags.contains("safe-account") { safeStep = "Hang up. Call the number on the back of your bank card. No other number." }
      else if hasBadLink { safeStep = "Do not tap the link. Delete the message." }
      else if tags.contains("otp-request") { safeStep = "Don’t share the code with anyone. Delete the message." }
      else if tags.contains("sextortion") { safeStep = "Don’t pay and don’t reply. It’s a mass-sent bluff. Delete it, and tell someone you trust." }
      else if codeWordMoment { safeStep = "Before anything else, ask them for your family code word." }
      else { safeStep = "Do not reply and do not send anything. Delete the message." }
    case .amber:
      reason = signals.first ?? "Something’s off here."
      // Mirrors ScamDetector.ts exactly; checked by scripts/check-engine.sh.
      let has: ([String]) -> Bool = { list in list.contains { tags.contains($0) } }
      if has(["bank-alert", "account-locked", "unusual-signin", "otp-request", "safe-account", "detail-harvest", "verify", "payment"]) {
        safeStep = "Don’t use anything in the message. Ring your bank on the number on the back of your card and ask."
      } else if has(["delivery-fee", "package-fee", "toll", "subscription", "renewal-pressure", "service-cutoff", "refund"]) {
        safeStep = "Don’t tap the link. Open the company’s own app or website and look there."
      } else if has(["family-emergency", "wrong-number", "borrow-ask", "borrow-repay", "money-ask"]) {
        safeStep = "Ring them on the number you already have for them before you do anything."
      } else if has(["callback", "stay-on-line", "tech-support", "warranty", "claims-bait"]) {
        safeStep = "Don’t call the number in the message. Find the real one yourself."
      } else if has(["job-offer", "pay-bait"]) {
        safeStep = "Don’t reply or text the number. Real employers don’t hire by text message."
      } else if has(["prize"]) {
        safeStep = "Real prize draws never ask for a fee, a code or your card. If you did enter one, check with the organizer yourself."
      } else {
        safeStep = "Don’t tap or reply yet. Check with them on a number you already have."
      }
    case .green:
      reason = signals.first ?? ""
      safeStep = "Nothing to do now. If it later asks for money, a code or a password, treat it as a scam."
    }

    v.level = level; v.reason = reason; v.safeStep = safeStep
    v.signals = signals; v.matches = matches; v.tags = tags
    v.confidence = confidence; v.codeWordMoment = codeWordMoment; v.score = score
    return v
  }

  /// Long enough to hold a pitch, or carrying a link, a phone number or money.
  /// A bare email address or a short note gets no model raise. Mirrors ai.ts.
  static func modelMayJudge(_ message: String) -> Bool {
    // ScamNet only knows Latin script; it abstains unless most letters are ASCII. Mirrors guard.ts.
    var letters = 0, ascii = 0
    for ch in message where ch.isLetter { letters += 1; if ch.isASCII { ascii += 1 } }
    if letters > 0 && Double(ascii) / Double(letters) < 0.6 { return false }
    let words = message.split(whereSeparator: { $0.isWhitespace || $0.isNewline }).count
    if words >= 6 { return true }
    return message.range(of: #"https?://|www\.|\$\s?\d|\d{3}[-.\s]\d{4}"#, options: [.regularExpression, .caseInsensitive]) != nil
  }

  /// Rules only, same as ai.ts instant(). ScamNet (CoreModel) votes on top.
  static func instant(_ message: String, _ opts: DetectorOptions = DetectorOptions()) -> Verdict {
    return detect(message, opts)
  }
}


// MARK: - Explain
// Mirrors src/engine/explain.ts: the few short phrases in the message that
// show the verdict, each with a plain reason. Same table (engine.json), same
// order, so the Messages drawer says exactly what the app says.
struct ExplainPoint { let phrase: String; let short: String; let why: String }

enum Explain {
  private struct Pat { let re: NSRegularExpression; let short: String; let why: String; let rank: Int; let needTags: [String] }
  private static let pats: [Pat] = {
    let list = EngineTables.shared.explain["patterns"] as? [[String: Any]] ?? []
    return list.compactMap { d in
      guard let src = d["source"] as? String, let re = try? NSRegularExpression(pattern: src, options: (d["flags"] as? String ?? "").contains("i") ? [.caseInsensitive] : []) else { return nil }
      return Pat(re: re, short: d["short"] as? String ?? "", why: d["why"] as? String ?? "", rank: d["rank"] as? Int ?? 0, needTags: d["needTags"] as? [String] ?? [])
    }
  }()
  private static let byTag: [String: [String]] = EngineTables.shared.explain["byTag"] as? [String: [String]] ?? [:]
  private static let clean: [ExplainPoint] = (EngineTables.shared.explain["clean"] as? [[String: Any]] ?? []).map {
    ExplainPoint(phrase: "", short: $0["short"] as? String ?? "", why: $0["why"] as? String ?? "")
  }

  static func points(_ text: String, _ level: Level, _ tags: [String]) -> [ExplainPoint] {
    let ns = text as NSString
    struct F { let at: Int; let end: Int; let rank: Int; let order: Int; let p: Pat; let phrase: String }
    var found: [F] = []
    for (k, p) in pats.enumerated() {
      if !p.needTags.isEmpty && !p.needTags.contains(where: { tags.contains($0) }) { continue }
      for m in p.re.matches(in: text, range: NSRange(location: 0, length: ns.length)) {
        var phrase = ns.substring(with: m.range).trimmingCharacters(in: .whitespaces)
        while let last = phrase.last, ".,;:!?)".contains(last) { phrase.removeLast() }
        let len = (phrase as NSString).length
        if len > 1 { found.append(F(at: m.range.location, end: m.range.location + len, rank: p.rank, order: k, p: p, phrase: phrase)) }
      }
    }
    found.sort { $0.rank != $1.rank ? $0.rank > $1.rank : $0.at < $1.at }
    var pick: [F] = []
    for f in found {
      if pick.count >= 3 { break }
      if pick.contains(where: { $0.p.short == f.p.short }) { continue }
      if pick.contains(where: { f.at < $0.end && $0.at < f.end }) { continue }
      pick.append(f)
    }
    pick.sort { $0.at < $1.at }
    var out = pick.map { ExplainPoint(phrase: $0.phrase, short: $0.p.short, why: $0.p.why) }
    if level != .green && out.count < 2 {
      for t in tags {
        if let f = byTag[t], f.count == 2, out.count < 3, !out.contains(where: { $0.short == f[0] }) { out.append(ExplainPoint(phrase: "", short: f[0], why: f[1])) }
      }
    }
    if level == .green {
      let has = { (s: String) in out.contains { $0.short == s } }
      let hasLink = text.range(of: "\\b(?:https?://|www\\.)|\\.[a-z]{2,6}/", options: [.regularExpression, .caseInsensitive]) != nil
      return clean.filter { c in
        !(c.short == "No money" && (has("Wants money fast") || has("Small fee to pay"))) && !(c.short == "No link" && hasLink) && !(c.short == "No rush" && has("Rushing you"))
      }
    }
    return out
  }

  static func headline(_ text: String, _ level: Level, _ tags: [String]) -> String {
    if level == .green { return "Nothing here matches a scam we know." }
    if tags.contains("family-emergency") { return "Someone is pretending to be family." }
    let pts = points(text, level, tags)
    if let best = pats.filter({ p in pts.contains { $0.short == p.short } }).max(by: { $0.rank < $1.rank }) { return best.why }
    return level == .red ? "This matches a scam we know." : "Texts like this are easy to fake."
  }
}
