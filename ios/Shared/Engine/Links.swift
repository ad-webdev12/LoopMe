import Foundation

// Port of src/engine/linkForensics.ts. Look-alike domains, brand-as-subdomain
// disguises, shorteners, bare IPs, punycode, throwaway TLDs, glued digits and
// the offline blocklist. Line for line, so the two engines agree.

struct LinkHit {
  let w: Int
  let tag: String
  let plain: String
  let match: String
}

struct LinkReport {
  let hits: [LinkHit]
  let urlCount: Int
  let officialOnly: Bool
}

enum Links {
  private static let urlRe = try! NSRegularExpression(
    pattern: "\\b(?:https?://)?(?:\\d{1,3}(?:\\.\\d{1,3}){3}|(?:[a-z0-9@-]+\\.)+[a-z]{2,}[a-z0-9-]*)(?:/[^\\s,]*)?",
    options: .caseInsensitive)
  private static let ipRe = try! NSRegularExpression(pattern: "^\\d{1,3}(\\.\\d{1,3}){3}$")
  private static let gluedRe = try! NSRegularExpression(pattern: "\\.[a-z]{2,}[0-9]")
  private static let tldTail = try! NSRegularExpression(pattern: "[0-9-].*$")

  static func leet(_ s: String) -> String {
    var t = s.lowercased().filter { ($0 >= "a" && $0 <= "z") || ($0 >= "0" && $0 <= "9") }
    t = t.replacingOccurrences(of: "0", with: "o").replacingOccurrences(of: "1", with: "l").replacingOccurrences(of: "3", with: "e")
      .replacingOccurrences(of: "4", with: "a").replacingOccurrences(of: "5", with: "s").replacingOccurrences(of: "7", with: "t")
      .replacingOccurrences(of: "rn", with: "m").replacingOccurrences(of: "vv", with: "w")
    return t
  }

  static func levenshtein(_ a: String, _ b: String) -> Int {
    let a = Array(a), b = Array(b)
    let m = a.count, n = b.count
    var dp = [[Int]](repeating: [Int](repeating: 0, count: n + 1), count: m + 1)
    for i in 0...m { dp[i][0] = i }
    for j in 0...n { dp[0][j] = j }
    if m > 0 && n > 0 {
      for i in 1...m { for j in 1...n {
        dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1))
      } }
    }
    return dp[m][n]
  }

  static func hostOf(_ raw: String) -> String {
    var h = raw
    if let r = h.range(of: "^https?://", options: [.regularExpression, .caseInsensitive]) { h.removeSubrange(r) }
    if let r = h.range(of: "^www\\.", options: [.regularExpression, .caseInsensitive]) { h.removeSubrange(r) }
    h = String(h.split(separator: "/", omittingEmptySubsequences: false).first ?? "")
    h = String(h.split(separator: "?", omittingEmptySubsequences: false).first ?? "")
    if h.contains("@") { h = String(h.split(separator: "@").last ?? Substring(h)) }
    return h.lowercased()
  }

  static func registrable(_ host: String) -> String {
    host.split(separator: ".", omittingEmptySubsequences: false).suffix(2).joined(separator: ".")
  }

  private static func isBlocklisted(_ host: String, _ reg: String, _ t: EngineTables) -> Bool {
    if t.blockedDomains.contains(reg) || t.blockedDomains.contains(host) { return true }
    return t.blockedPatterns.contains { $0.test(host) }
  }

  static func analyze(_ text: String) -> LinkReport {
    let t = EngineTables.shared
    let matches = urlRe.all(in: text)
    var hits: [LinkHit] = []
    if matches.isEmpty { return LinkReport(hits: hits, urlCount: 0, officialOnly: false) }

    let lowerText = text.lowercased()
    let brandsInText = t.brands.filter { b in b.match.contains { lowerText.contains($0) } }
    var sawOfficial = 0, sawBad = 0

    for raw in matches {
      let host = hostOf(raw)
      if !host.contains(".") { continue }
      let reg = registrable(host)
      func push(_ w: Int, _ tag: String, _ plain: String) {
        hits.append(LinkHit(w: w, tag: tag, plain: plain, match: raw))
        if w > 0 { sawBad += 1 }
      }

      if t.brands.contains(where: { b in b.domains.contains { host == $0 || host.hasSuffix("." + $0) } }) { sawOfficial += 1; continue }

      if isBlocklisted(host, reg, t) { push(70, "url-blocklisted", "This link (\(host)) is a known scam website."); continue }
      if ipRe.test(host) { push(40, "url-ip", "The link goes to a bare numeric address. Real companies never do that."); continue }
      if t.shorteners.contains(reg) { push(30, "url-shortener", "The link is shortened, so you cannot see where it really goes."); continue }
      if host.contains("xn--") { push(45, "url-punycode", "The link uses look-alike letters to imitate a real website."); continue }

      var flagged = false
      let bare = leet(host)
      let bareReg = leet(reg)
      for b in brandsInText {
        let core = leet(String(b.domains[0].split(separator: ".")[0]))
        let hostCore = leet(String(host.split(separator: ".")[0]))
        let nearMiss = core.count >= 5 && levenshtein(hostCore, core) <= 2 && hostCore != core
        if nearMiss || (!bare.contains(core) && core.count >= 4 && bare.replacingOccurrences(of: "-", with: "").contains(core)) {
          push(55, "url-lookalike", "The link is spelled almost like \(b.label) to fool the eye. It is not \(b.label)’s real website (\(b.domains[0]))."); flagged = true; break
        }
        if bare.contains(core) && !bareReg.contains(core) {
          push(50, "url-brand-subdomain", "The link puts “\(b.label)” in front of a website \(b.label) doesn’t own. A disguise. The real address is \(b.domains[0])."); flagged = true; break
        }
        if bare.contains(core) && bareReg.contains(core) {
          push(48, "url-lookalike", "The link imitates \(b.label) but is not really \(b.label)’s website (\(b.domains[0]))."); flagged = true; break
        }
      }
      if flagged { continue }

      for b in t.brands {
        let core = leet(String(b.domains[0].split(separator: ".")[0]))
        if core.count < 5 { continue }
        for segSub in host.split(whereSeparator: { $0 == "." || $0 == "-" }) {
          let seg = String(segSub)
          if seg.count < 4 { continue }
          let fold = leet(seg)
          let exactFold = fold == core && seg.lowercased() != String(b.domains[0].split(separator: ".")[0])
          let nearMiss = core.count >= 6 && fold != core && levenshtein(fold, core) <= 1
          if exactFold || nearMiss {
            push(55, "url-lookalike", "The link is spelled almost like \(b.label) to fool the eye. It is not \(b.label)’s real website (\(b.domains[0]))."); flagged = true; break
          }
        }
        if flagged { break }
      }
      if flagged { continue }

      let regName = String(reg.split(separator: ".", omittingEmptySubsequences: false).first ?? "")
      if regName.contains("-") && t.securityWords.test(regName) {
        push(38, "url-security-theater", "The link’s address is dressed up in security words. Real companies never do that."); continue
      }

      let tld = String(host.split(separator: ".").last ?? "")
      if t.suspiciousTlds.contains(tldTail.strip(tld)) {
        push(28, "url-tld", "The link ends in a web-address type that scammers favor because it’s nearly free."); continue
      }
      if gluedRe.test(host) {
        push(30, "url-glued", "The link has numbers glued onto the end of the address. Real websites never look like that.")
      }
    }

    if !matches.isEmpty && sawOfficial == 0 && !hits.contains(where: { $0.tag.hasPrefix("url-look") || $0.tag == "url-brand-subdomain" }) {
      for b in brandsInText {
        let core = leet(String(b.domains[0].split(separator: ".")[0]))
        let anyMentions = matches.contains { leet(hostOf($0)).contains(core) }
        if !anyMentions {
          hits.append(LinkHit(w: 18, tag: "url-mismatch", plain: "The message talks about \(b.label), but its link goes somewhere else entirely.", match: matches.first ?? ""))
          sawBad += 1
          break
        }
      }
    }
    return LinkReport(hits: hits, urlCount: matches.count, officialOnly: sawOfficial > 0 && sawBad == 0)
  }
}
