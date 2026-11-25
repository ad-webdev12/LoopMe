import Foundation
// Scores every row of a CSV (first column text) with the shipped ScamNet and
// writes one probability per line. Used to teach ScamNet Lite.
//   swiftc -O ScamNetRunner.swift score.swift -o score && ./score <Resources dir> <in.csv> <out.txt>
let a = CommandLine.arguments
guard let net = ScamNetRunner.load(bundle: Bundle(url: URL(fileURLWithPath: a[1])) ?? .main) else { fatalError("no model") }
let s = try! String(contentsOfFile: a[2], encoding: .utf8)
var rows: [[String]] = []; var row: [String] = []; var f = ""; var q = false
let cs = Array(s); var i = 0
while i < cs.count { let c = cs[i]
  if q { if c == "\"" { if i+1 < cs.count && cs[i+1] == "\"" { f.append("\""); i += 1 } else { q = false } } else { f.append(c) } }
  else if c == "\"" { q = true } else if c == "," { row.append(f); f = "" } else if c == "\n" { row.append(f); rows.append(row); row = []; f = "" } else { f.append(c) }
  i += 1 }
if !f.isEmpty || !row.isEmpty { row.append(f); rows.append(row) }
var out = ""; out.reserveCapacity(rows.count * 8); let t0 = Date()
for (n, r) in rows.dropFirst().enumerated() {
  out += String(format: "%.5f\n", net.probability(r[0]) ?? 0)
  if n % 10000 == 0 { FileHandle.standardError.write("\(n) \(Int(Date().timeIntervalSince(t0)))s\n".data(using: .utf8)!) }
}
try! out.write(toFile: a[3], atomically: true, encoding: .utf8)
print("scored \(rows.count - 1) rows")
