import Foundation

// macOS harness: runs the Swift engine over cases.json (verdicts from the
// TypeScript engine) and reports every disagreement. Run via
// scripts/check-engine.sh. Exit code 1 on any mismatch in level, score or tags.

let args = CommandLine.arguments
guard args.count >= 2 else { print("usage: check <cases.json>"); exit(2) }
let data = try! Data(contentsOf: URL(fileURLWithPath: args[1]))
let cases = try! JSONSerialization.jsonObject(with: data) as! [[String: Any]]

var bad = 0
let started = Date()
for c in cases {
  let m = c["m"] as! String
  let v = Engine.instant(m)
  let wantLevel = c["level"] as! String
  let wantScore = c["score"] as! Int
  let wantTags = c["tags"] as! [String]
  let wantReason = c["reason"] as! String
  let wantStep = c["safeStep"] as! String
  var diffs: [String] = []
  if v.level.rawValue != wantLevel { diffs.append("level \(v.level.rawValue) vs \(wantLevel)") }
  if v.score != wantScore { diffs.append("score \(v.score) vs \(wantScore)") }
  if v.tags != wantTags { diffs.append("tags \(v.tags) vs \(wantTags)") }
  if v.reason != wantReason { diffs.append("reason differs") }
  if v.safeStep != wantStep { diffs.append("safeStep differs") }
  if !diffs.isEmpty {
    bad += 1
    print("MISMATCH: \(m.prefix(90))")
    for d in diffs { print("   " + d) }
  }
}
let ms = Date().timeIntervalSince(started) * 1000
print("\(cases.count - bad)/\(cases.count) agree with the TypeScript engine (\(String(format: "%.1f", ms / Double(cases.count))) ms per message)")
exit(bad == 0 ? 0 : 1)
