import Foundation
import CoreML
// usage: parity <dir with ScamNet.mlmodel + ScamNet.vocab.txt> <csv text,label,source,split> [limit]
let a = CommandLine.arguments
let dir = URL(fileURLWithPath: a[1]); let csv = a[2]; let limit = a.count > 3 ? Int(a[3])! : Int.max
guard let net = ScamNetRunner.load(bundle: Bundle(url: dir) ?? .main) else { fatalError("no model: compile step?") }
// crude CSV reader (handles quoted fields)
func parse(_ s: String) -> [[String]] {
  var rows: [[String]] = []; var row: [String] = []; var f = ""; var q = false; var it = s.makeIterator(); var prev: Character? = nil
  while let c = it.next() {
    if q { if c == "\"" { q = false } else { f.append(c) } }
    else if c == "\"" { if prev == "\"" && f.isEmpty == false { f.append("\"") }; q = true }
    else if c == "," { row.append(f); f = "" }
    else if c == "\n" { row.append(f); rows.append(row); row = []; f = "" }
    else { f.append(c) }
    prev = c
  }
  if !f.isEmpty || !row.isEmpty { row.append(f); rows.append(row) }
  return rows
}
let rows = parse(try! String(contentsOfFile: csv, encoding: .utf8)).dropFirst().filter { $0.count >= 4 && $0[3] == "test" }.prefix(limit)
var tp = 0, fp = 0, fn = 0, tn = 0; var ctp = 0, cfp = 0; let t0 = Date(); var out = "text,label,source,p\n"
for r in rows {
  let p = net.probability(r[0]) ?? -1
  let scam = r[1] == "scam", flag = p >= 0.8
  if scam && flag { tp += 1 } else if scam { fn += 1 } else if flag { fp += 1 } else { tn += 1 }
  // Column 5, when present, is the rules' verdict: the app flags when either side does.
  let combined = flag || (r.count >= 5 && r[4] != "green" && r[4] != "")
  if combined { if scam { ctp += 1 } else { cfp += 1 } }
  out += "\"\(r[0].replacingOccurrences(of: "\"", with: "\"\""))\",\(r[1]),\(r[2]),\(String(format: "%.4f", p))\n"
}
let ms = Date().timeIntervalSince(t0) / Double(rows.count) * 1000
print(String(format: "swift coreml @0.8: caught %d/%d (%.1f%%) false alarms %d/%d (%.2f%%)  %.1f ms/msg", tp, tp + fn, Double(tp) / Double(tp + fn) * 100, fp, fp + tn, Double(fp) / Double(fp + tn) * 100, ms))
if rows.first?.count ?? 0 >= 5 { print(String(format: "rules + scamnet @0.8: caught %d/%d (%.1f%%) false alarms %d/%d (%.2f%%)", ctp, tp + fn, Double(ctp) / Double(tp + fn) * 100, cfp, fp + tn, Double(cfp) / Double(fp + tn) * 100)) }
try! out.write(toFile: URL(fileURLWithPath: csv).deletingLastPathComponent().appendingPathComponent("swift_scores.csv").path, atomically: true, encoding: .utf8)
