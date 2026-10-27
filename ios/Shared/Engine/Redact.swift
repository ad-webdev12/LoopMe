import Foundation

// Port of src/lib/redact.ts. Strips personal details before anything is
// written to the shared log or sent to family: emails, phone numbers and long
// ID-like numbers go; short numbers (amounts, dates) stay so it still reads.
enum Redact {
  private static let email = try! NSRegularExpression(pattern: "[\\w.+-]+@[\\w-]+\\.[\\w.]+")
  private static let phone = try! NSRegularExpression(pattern: "(?:\\+?1[-.\\s]?)?(?:\\(\\d{3}\\)|\\d{3})[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b")
  private static let longNum = try! NSRegularExpression(pattern: "\\b\\d{9,}\\b")

  static func privateDetails(_ text: String) -> String {
    var t = text
    for (re, rep) in [(email, "[email]"), (phone, "[phone]"), (longNum, "[number]")] {
      t = re.stringByReplacingMatches(in: t, options: [], range: NSRange(t.startIndex..., in: t), withTemplate: rep)
    }
    return t
  }
}
