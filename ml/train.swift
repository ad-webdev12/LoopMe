// Trains the on-device scam text classifier with Apple's Create ML and exports
// a Core ML model. Run from the project root: swift ml/train.swift
// Produces: modules/scam-ai/ios/Resources/ScamText.mlmodel
import Foundation
import CreateML
import TabularData

let cwd = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let mlDir = cwd.appendingPathComponent("ml")
let trainURL = mlDir.appendingPathComponent("scam-train.csv")
let testURL = mlDir.appendingPathComponent("scam-test.csv")

do {
  var options = CSVReadingOptions()
  options.hasHeaderRow = true
  let trainTable = try DataFrame(contentsOfCSVFile: trainURL, columns: ["text", "label"], options: options)
  let testTable = try DataFrame(contentsOfCSVFile: testURL, columns: ["text", "label"], options: options)
  print("Loaded \(trainTable.rows.count) train / \(testTable.rows.count) test")

  let classifier = try MLTextClassifier(
    trainingData: trainTable,
    textColumn: "text",
    labelColumn: "label"
  )

  let eval = classifier.evaluation(on: testTable, textColumn: "text", labelColumn: "label")
  let acc = (1.0 - eval.classificationError) * 100.0
  print(String(format: "Test accuracy: %.1f%%", acc))

  let outDir = cwd.appendingPathComponent("modules/scam-ai/ios/Resources")
  try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
  let modelURL = outDir.appendingPathComponent("ScamText.mlmodel")
  try classifier.write(to: modelURL, metadata: MLModelMetadata(
    author: "Loop Me In",
    shortDescription: "On-device scam vs. safe text classifier",
    version: "1.0"
  ))
  print("Wrote \(modelURL.path)")
} catch {
  print("Training failed: \(error)")
  exit(1)
}
