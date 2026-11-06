// Scores a saved Core ML text classifier on ml/bench.csv, rules-only, model-only
// and fused, at several thresholds. No training.
//   swift ml/eval.swift ml/out/ScamText-bert.mlmodel [--verbose]
import Foundation
import TabularData
import NaturalLanguage
import CoreML

let args = CommandLine.arguments.dropFirst()
let modelPath = args.first(where: { !$0.hasPrefix("--") }) ?? "ml/out/ScamText-bert.mlmodel"
let cwd = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
try evaluate(modelURL: URL(fileURLWithPath: modelPath, relativeTo: cwd), benchURL: cwd.appendingPathComponent("ml/bench.csv"), verbose: args.contains("--verbose"))

// ---- shared evaluator (kept identical in ml/eval.swift) ----------------
func evaluate(modelURL: URL, benchURL: URL, verbose: Bool) throws {
  var o = CSVReadingOptions(); o.hasHeaderRow = true
  let bench = try DataFrame(contentsOfCSVFile: benchURL, columns: ["set", "text", "label", "rule", "pure"], types: ["set": .string, "text": .string, "label": .string, "rule": .string, "pure": .string], options: o)
  let compiled = try MLModel.compileModel(at: modelURL)
  let nl = try NLModel(contentsOf: compiled)
  let size = (try? FileManager.default.allocatedSizeOfDirectory(at: compiled)) ?? 0
  struct Row { let set: String; let text: String; let scam: Bool; let ruleFlag: Bool; let pureFlag: Bool; let p: Double }
  var rows: [Row] = []
  let t1 = Date()
  for r in bench.rows {
    guard let set = r["set"] as? String, let text = r["text"] as? String, let label = r["label"] as? String, let rule = r["rule"] as? String else { continue }
    let pure = (r["pure"] as? String) ?? rule
    let p = nl.predictedLabelHypotheses(for: text, maximumCount: 2)["scam"] ?? 0
    rows.append(Row(set: set, text: text, scam: label == "scam", ruleFlag: rule != "green", pureFlag: pure != "green", p: p))
  }
  let perMsg = Date().timeIntervalSince(t1) / Double(rows.count) * 1000
  print(String(format: "model %.1f MB compiled, %.2f ms per message, %d bench rows", Double(size) / 1e6, perMsg, rows.count))
  let sets = rows.reduce(into: [String]()) { if !$0.contains($1.set) { $0.append($1.set) } }
  func report(_ name: String, _ flag: (Row) -> Bool) {
    var H = 0, S = 0, F = 0, N = 0
    var line = String(format: "%-18@", name as NSString)
    for set in sets {
      let rs = rows.filter { $0.set == set }
      let h = rs.filter { $0.scam && flag($0) }.count, sc = rs.filter { $0.scam }.count
      let f = rs.filter { !$0.scam && flag($0) }.count, n = rs.filter { !$0.scam }.count
      H += h; S += sc; F += f; N += n
      line += String(format: " %@ %d/%d|%d", set.prefix(5) as NSString, h, sc, f)
    }
    print(line + String(format: "   ALL %d/%d (%.1f%%) fp %d/%d (%.1f%%)", H, S, Double(H) / Double(S) * 100, F, N, Double(F) / Double(N) * 100))
  }
  report("rules only") { $0.ruleFlag }
  for t in [0.5, 0.6, 0.7, 0.8, 0.9] {
    report(String(format: "model >= %.1f", t)) { $0.p >= t }
    // Fused as shipped: a portable-model-only raise is dropped when the strong model is under 0.3.
    report(String(format: "fused  >= %.1f", t)) { $0.pureFlag || ($0.ruleFlag && $0.p >= 0.3) || $0.p >= t }
  }
  if verbose {
    for r in rows where r.scam && !r.ruleFlag && r.p < 0.7 { print(String(format: "MISS-BOTH [%@] %.2f %@", r.set as NSString, r.p, r.text as NSString)) }
    for r in rows where !r.scam && (r.ruleFlag || r.p >= 0.7) { print(String(format: "FALSE [%@] rule=%@ %.2f %@", r.set as NSString, r.ruleFlag ? "Y" : "n", r.p, r.text as NSString)) }
  }
}

extension FileManager {
  func allocatedSizeOfDirectory(at url: URL) throws -> Int {
    var total = 0
    if let e = enumerator(at: url, includingPropertiesForKeys: [.totalFileAllocatedSizeKey]) {
      for case let f as URL in e { total += (try? f.resourceValues(forKeys: [.totalFileAllocatedSizeKey]).totalFileAllocatedSize) ?? 0 }
    }
    return total
  }
}
