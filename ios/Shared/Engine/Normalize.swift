import Foundation

// Port of src/engine/normalize.ts. Folds the evasion tricks (look-alike
// letters, zero-width characters, full-width text, smart punctuation) so the
// rules see the message the way a person reads it.

struct Normalized {
  let text: String
  let disguised: Bool
}

enum Normalize {
  private static let zeroWidth = try! NSRegularExpression(pattern: "[\\u200B-\\u200D\\uFEFF\\u2060\\u00AD]")
  private static let wordSplit = try! NSRegularExpression(pattern: "[^\\p{L}\\p{N}]+")
  private static let latin = try! NSRegularExpression(pattern: "[a-zA-Z]")
  private static let threeLetters = try! NSRegularExpression(pattern: "[a-z]{3,}", options: .caseInsensitive)
  private static let innerSpace = try! NSRegularExpression(pattern: "[^\\S\\n]+")

  static func run(_ input: String) -> Normalized {
    if input.isEmpty { return Normalized(text: "", disguised: false) }
    let tables = EngineTables.shared
    var disguised = false
    var t = input

    // Words that mix Latin letters with confusables, and fold to a sensitive
    // keyword, are deliberate disguise. Legit foreign text does not do this.
    let pieces = wordSplit.stringByReplacingMatches(in: t, options: [], range: NSRange(t.startIndex..., in: t), withTemplate: "\u{1}")
    for word in pieces.split(separator: "\u{1}").map(String.init) {
      guard word.contains(where: { tables.confusables[$0] != nil }) else { continue }
      let latinCount = latin.numberOfMatches(in: word, options: [], range: NSRange(word.startIndex..., in: word))
      if latinCount < 2 { continue }
      let folded = String(word.map { tables.confusables[$0] ?? $0 })
      if tables.sensitive.test(folded) { disguised = true; break }
    }
    if !disguised && zeroWidth.test(t) {
      let stripped = zeroWidth.strip(t)
      if stripped != t && threeLetters.test(stripped) { disguised = true }
    }

    t = t.precomposedStringWithCompatibilityMapping   // NFKC
    t = zeroWidth.strip(t)
    t = String(t.map { tables.confusables[$0] ?? $0 })
    var folded = ""
    folded.reserveCapacity(t.count)
    for ch in t { if let p = tables.punct[ch] { folded += p } else { folded.append(ch) } }
    t = innerSpace.stringByReplacingMatches(in: folded, options: [], range: NSRange(folded.startIndex..., in: folded), withTemplate: " ")
    t = deleet(t)
    t = String(t.unicodeScalars.filter { !$0.properties.isEmojiPresentation && !($0.properties.isEmoji && $0.value > 0x2000) && $0.value != 0xFE0F && $0.value != 0x200D })
    t = innerSpace.stringByReplacingMatches(in: t, options: [], range: NSRange(t.startIndex..., in: t), withTemplate: " ").trimmingCharacters(in: .whitespaces)
    return Normalized(text: t, disguised: disguised)
  }

  // Mirrors deleet() in src/engine/normalize.ts.
  static let leetToken = try! NSRegularExpression(pattern: "\\b(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*[013457])[A-Za-z0-9]{3,}\\b")
  static let leet: [Character: Character] = ["0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t"]
  static func deleet(_ t: String) -> String {
    let ns = t as NSString
    var out = ""
    var last = 0
    for m in leetToken.matches(in: t, options: [], range: NSRange(location: 0, length: ns.length)) {
      let w = ns.substring(with: m.range)
      out += ns.substring(with: NSRange(location: last, length: m.range.location - last))
      let letters = w.filter { $0.isLetter }.count
      let digits = w.filter { $0.isNumber }.count
      if letters < 2 || digits == 0 || digits > letters || w.contains(where: { "2689".contains($0) }) || (w.first?.isNumber ?? false) {
        out += w
      } else {
        out += String(w.map { leet[$0] ?? $0 })
      }
      last = m.range.location + m.range.length
    }
    out += ns.substring(from: last)
    return out
  }
}
