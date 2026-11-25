import Foundation
import Darwin
// Checks ScamNet Lite in Swift against PyTorch, and measures memory.
//   swiftc -O ScamNetRunner.swift ScamNetLite.swift lite_check.swift -o lite_check
//   ./lite_check <dir with ScamNetLite.bin + ScamNet.vocab.txt> <test_scores.csv> [limit]
func footprintMB() -> Double {
  var info = task_vm_info_data_t(); var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<natural_t>.size)
  let kr = withUnsafeMutablePointer(to: &info) { $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count) } }
  return kr == KERN_SUCCESS ? Double(info.phys_footprint) / 1_048_576 : -1
}
let a = CommandLine.arguments
let limit = a.count > 3 ? Int(a[3])! : Int.max
// Read the CSV first so its memory is not counted against the model.
let s = try! String(contentsOfFile: a[2], encoding: .utf8)
var rows: [[String]] = []; var row: [String] = []; var f = ""; var q = false
let cs = Array(s); var i = 0
while i < cs.count { let c = cs[i]
  if q { if c == "\"" { if i+1 < cs.count && cs[i+1] == "\"" { f.append("\""); i += 1 } else { q = false } } else { f.append(c) } }
  else if c == "\"" { q = true } else if c == "," { row.append(f); f = "" } else if c == "\n" { row.append(f); rows.append(row); row = []; f = "" } else { f.append(c) }
  i += 1 }
let hdr = rows.removeFirst(); let ti = hdr.firstIndex(of: "text")!, li = hdr.firstIndex(of: "label")!, pi = hdr.firstIndex(of: "p")!
let sample = Array(rows.filter { $0.count == hdr.count }.prefix(limit))
let m0 = footprintMB()
guard let net = ScamNetLite.load(bundle: Bundle(url: URL(fileURLWithPath: a[1]))!) else { fatalError("could not load ScamNetLite") }
let m1 = footprintMB()
_ = net.probability("Your account is locked. Verify now at chase-secure-verify.com or your card will be closed.")
let m2 = footprintMB()
var maxDiff = 0.0, agree = 0, tp = 0, fn = 0, fp = 0, tn = 0; let t0 = Date(); var peak = m2
for r in sample {
  let p = net.probability(r[ti]) ?? -1, ref = Double(r[pi]) ?? -1
  maxDiff = max(maxDiff, abs(p - ref)); if (p >= 0.8) == (ref >= 0.8) { agree += 1 }
  let scam = r[li] == "scam", flag = p >= 0.8
  if scam && flag { tp += 1 } else if scam { fn += 1 } else if flag { fp += 1 } else { tn += 1 }
  peak = max(peak, footprintMB())
}
let ms = Date().timeIntervalSince(t0) / Double(sample.count) * 1000
print(String(format: "memory: %.1f MB before load, +%.1f MB after load, +%.1f MB after first check, +%.1f MB peak over %d checks", m0, m1 - m0, m2 - m0, peak - m0, sample.count))
print(String(format: "parity with PyTorch: max difference %.4f, same answer at 0.8 on %d of %d", maxDiff, agree, sample.count))
print(String(format: "Lite alone @0.8: caught %d/%d (%.1f%%), false alarms %d/%d (%.2f%%), %.2f ms per message", tp, tp + fn, Double(tp) / Double(max(1, tp + fn)) * 100, fp, fp + tn, Double(fp) / Double(max(1, fp + tn)) * 100, ms))
