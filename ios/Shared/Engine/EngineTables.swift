import Foundation

// The detector's tables, read from engine.json. That file is generated from
// the TypeScript engine by scripts/export-engine.mjs, so the rules the
// extensions run are the rules the app runs. Never edit engine.json by hand.

struct EngineRule {
  let re: NSRegularExpression
  let w: Int
  let tag: String
  let plain: String
}

struct EngineBrand {
  let label: String
  let match: [String]
  let domains: [String]
}

final class EngineTables {
  static let shared = EngineTables()

  let rules: [EngineRule]
  let knownGood: [EngineRule]
  let payTags: Set<String>
  let urgTags: Set<String>
  let codeWordTags: Set<String>

  let brands: [EngineBrand]
  let securityWords: NSRegularExpression
  let shorteners: Set<String>
  let suspiciousTlds: Set<String>
  let blockedDomains: Set<String>
  let blockedPatterns: [NSRegularExpression]

  let features: [String: NSRegularExpression]
  let confusables: [Character: Character]
  let punct: [Character: String]
  let sensitive: NSRegularExpression

  let dim: Int
  let charW: Double
  let threshold: Double
  let bias: Double
  let weights: [Double]

  private init() {
    let url = EngineTables.locate()
    guard let url, let data = try? Data(contentsOf: url),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      fatalError("engine.json is missing from the bundle. Run: node --experimental-strip-types scripts/export-engine.mjs")
    }
    func regex(_ o: Any?) -> NSRegularExpression {
      let d = o as? [String: Any] ?? [:]
      let src = d["source"] as? String ?? "(?!)"
      let flags = d["flags"] as? String ?? ""
      var opts: NSRegularExpression.Options = []
      if flags.contains("i") { opts.insert(.caseInsensitive) }
      // JavaScript regexes are given to ICU unchanged. The tables only use
      // the common subset (classes, groups, lookahead, lazy quantifiers), and
      // scripts/check-engine.sh proves both engines agree on every case.
      return (try? NSRegularExpression(pattern: src, options: opts)) ?? (try! NSRegularExpression(pattern: "(?!)"))
    }
    func ruleList(_ o: Any?) -> [EngineRule] {
      (o as? [[String: Any]] ?? []).map {
        EngineRule(re: regex($0), w: $0["w"] as? Int ?? 0, tag: $0["tag"] as? String ?? "", plain: $0["plain"] as? String ?? "")
      }
    }
    rules = ruleList(json["rules"])
    knownGood = ruleList(json["knownGood"])
    payTags = Set(json["payTags"] as? [String] ?? [])
    urgTags = Set(json["urgTags"] as? [String] ?? [])
    codeWordTags = Set(json["codeWordTags"] as? [String] ?? [])

    let l = json["links"] as? [String: Any] ?? [:]
    brands = (l["brands"] as? [[String: Any]] ?? []).map {
      EngineBrand(label: $0["label"] as? String ?? "", match: $0["match"] as? [String] ?? [], domains: $0["domains"] as? [String] ?? [])
    }
    securityWords = regex(l["securityWords"])
    shorteners = Set(l["shorteners"] as? [String] ?? [])
    suspiciousTlds = Set(l["suspiciousTlds"] as? [String] ?? [])
    blockedDomains = Set(l["blockedDomains"] as? [String] ?? [])
    blockedPatterns = (l["blockedPatterns"] as? [[String: Any]] ?? []).map { regex($0) }

    var f: [String: NSRegularExpression] = [:]
    for (k, v) in json["features"] as? [String: Any] ?? [:] { f[k] = regex(v) }
    features = f

    let n = json["normalize"] as? [String: Any] ?? [:]
    var c: [Character: Character] = [:]
    for (k, v) in n["confusables"] as? [String: String] ?? [:] { if let a = k.first, let b = v.first { c[a] = b } }
    confusables = c
    var p: [Character: String] = [:]
    for (k, v) in n["punct"] as? [String: String] ?? [:] { if let a = k.first { p[a] = v } }
    punct = p
    sensitive = regex(n["sensitive"])

    let m = json["model"] as? [String: Any] ?? [:]
    dim = m["dim"] as? Int ?? 4096
    charW = m["charW"] as? Double ?? 0.35
    threshold = m["threshold"] as? Double ?? 0.668
    bias = m["bias"] as? Double ?? 0
    var w = [Double](repeating: 0, count: dim)
    let idx = m["idx"] as? [Int] ?? []
    let val = m["val"] as? [Double] ?? []
    for i in 0..<min(idx.count, val.count) where idx[i] >= 0 && idx[i] < dim { w[idx[i]] = val[i] }
    weights = w
  }

  private static func locate() -> URL? {
    if let u = Bundle.main.url(forResource: "engine", withExtension: "json") { return u }
    if let u = Bundle(for: EngineTables.self).url(forResource: "engine", withExtension: "json") { return u }
    // The macOS check harness passes the path explicitly.
    if let p = ProcessInfo.processInfo.environment["LOOPME_ENGINE_JSON"] { return URL(fileURLWithPath: p) }
    return nil
  }
}

// Small helpers shared by the port, mirroring the JavaScript calls they replace.
extension NSRegularExpression {
  /// JavaScript `re.test(s)`.
  func test(_ s: String) -> Bool {
    firstMatch(in: s, options: [], range: NSRange(s.startIndex..., in: s)) != nil
  }
  /// JavaScript `s.match(re)?.[0]` (first match, no global flag).
  func first(in s: String) -> String? {
    guard let m = firstMatch(in: s, options: [], range: NSRange(s.startIndex..., in: s)),
          let r = Range(m.range, in: s) else { return nil }
    return String(s[r])
  }
  /// JavaScript `s.match(re)` with the global flag: every match.
  func all(in s: String) -> [String] {
    matches(in: s, options: [], range: NSRange(s.startIndex..., in: s)).compactMap { m in
      Range(m.range, in: s).map { String(s[$0]) }
    }
  }
  /// JavaScript `s.replace(re, "")` with the global flag.
  func strip(_ s: String) -> String {
    stringByReplacingMatches(in: s, options: [], range: NSRange(s.startIndex..., in: s), withTemplate: "")
  }
}
