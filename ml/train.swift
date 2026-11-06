// Trains the on-device scam text classifier with Create ML and scores it on
// every benchmark the TypeScript engine is scored on.
//   swift ml/train.swift [maxent|bert|elmo|static] [--write]
// Data: ml/scam-train.csv (+ ml/extra/*.csv if present) for training,
// ml/bench.csv (never trained on) for scoring. --write exports
// modules/scam-ai/ios/Resources/ScamText.mlmodel.
import Foundation
import CreateML
import TabularData
import NaturalLanguage
import CoreML

let args = CommandLine.arguments.dropFirst()
let algoName = args.first(where: { !$0.hasPrefix("--") }) ?? "bert"
let write = args.contains("--write")
let cwd = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let mlDir = cwd.appendingPathComponent("ml")

var opts = CSVReadingOptions(); opts.hasHeaderRow = true
func load(_ url: URL) throws -> DataFrame {
  try DataFrame(contentsOfCSVFile: url, columns: ["text", "label"], types: ["text": .string, "label": .string], options: opts)
}
var train = try load(mlDir.appendingPathComponent("scam-train.csv"))
let extraDir = mlDir.appendingPathComponent("extra")
if let files = try? FileManager.default.contentsOfDirectory(at: extraDir, includingPropertiesForKeys: nil) {
  for f in files.sorted(by: { $0.path < $1.path }) where f.pathExtension == "csv" {
    let d = try load(f); train.append(d); print("+ \(f.lastPathComponent): \(d.rows.count)")
  }
}
// Drop any training row that also appears in the bench, so the score is honest.
var benchOpts = CSVReadingOptions(); benchOpts.hasHeaderRow = true
let bench = try DataFrame(contentsOfCSVFile: mlDir.appendingPathComponent("bench.csv"), columns: ["set", "text", "label"], types: ["set": .string, "text": .string, "label": .string], options: benchOpts)
let benchTexts = Set(bench.rows.compactMap { ($0["text"] as? String)?.lowercased() })
var leaked = 0
train = DataFrame(train.filter { r in
  if benchTexts.contains(((r["text"] as? String) ?? "").lowercased()) { leaked += 1; return false }
  return true
})
let nScam = train.rows.filter { ($0["label"] as? String) == "scam" }.count
print("train rows: \(train.rows.count) (scam \(nScam), safe \(train.rows.count - nScam)); removed \(leaked) that overlap the bench")

let algo: MLTextClassifier.ModelAlgorithmType
switch algoName {
case "maxent": algo = .maxEnt(revision: nil)
case "elmo": algo = .transferLearning(.elmoEmbedding, revision: nil)
case "static": algo = .transferLearning(.staticEmbedding, revision: nil)
default: algo = .transferLearning(.bertEmbedding, revision: nil)
}
let t0 = Date()
let params = MLTextClassifier.ModelParameters(validation: .split(strategy: .automatic), algorithm: algo, language: .english)
let clf = try MLTextClassifier(trainingData: train, textColumn: "text", labelColumn: "label", parameters: params)
print(String(format: "trained %@ in %.0fs; validation error %.3f", algoName, Date().timeIntervalSince(t0), clf.validationMetrics.classificationError))

// Save, then score through the shared evaluator (ml/eval.swift has the same code).
let outTmp = mlDir.appendingPathComponent("out")
try FileManager.default.createDirectory(at: outTmp, withIntermediateDirectories: true)
let saved = outTmp.appendingPathComponent("ScamText-\(algoName).mlmodel")
try clf.write(to: saved)
print("saved \(saved.path)")
try evaluate(modelURL: saved, benchURL: mlDir.appendingPathComponent("bench.csv"), verbose: args.contains("--verbose"))

if write {
  let outDir = cwd.appendingPathComponent("modules/scam-ai/ios/Resources")
  try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
  let modelURL = outDir.appendingPathComponent("ScamText.mlmodel")
  try clf.write(to: modelURL, metadata: MLModelMetadata(author: "Loop Me", shortDescription: "On-device scam text classifier (\(algoName))", version: "2.0"))
  print("wrote \(modelURL.path)")
}


// Same fold the app applies before the model (ios/Shared/Engine/Normalize.swift).
let leetTokenRe = try! NSRegularExpression(pattern: "\\b(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*[013457])[A-Za-z0-9]{3,}\\b")
let leetMap: [Character: Character] = ["0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t"]
func deleetEval(_ t: String) -> String {
  let ns = t as NSString; var out = ""; var last = 0
  for m in leetTokenRe.matches(in: t, options: [], range: NSRange(location: 0, length: ns.length)) {
    let w = ns.substring(with: m.range)
    out += ns.substring(with: NSRange(location: last, length: m.range.location - last))
    let letters = w.filter { $0.isLetter }.count, digits = w.filter { $0.isNumber }.count
    if letters < 2 || digits == 0 || digits > letters || w.contains(where: { "2689".contains($0) }) || (w.first?.isNumber ?? false) { out += w }
    else { out += String(w.map { leetMap[$0] ?? $0 }) }
    last = m.range.location + m.range.length
  }
  let joined = out + ns.substring(from: last)
  let noEmoji = String(joined.unicodeScalars.filter { !$0.properties.isEmojiPresentation && !($0.properties.isEmoji && $0.value > 0x2000) && $0.value != 0xFE0F && $0.value != 0x200D })
  return noEmoji.replacingOccurrences(of: "  ", with: " ").trimmingCharacters(in: .whitespaces)
}

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
    let p = nl.predictedLabelHypotheses(for: deleetEval(text), maximumCount: 2)["scam"] ?? 0
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
