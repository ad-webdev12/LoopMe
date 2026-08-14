// Renders the Loop Me app icon (1024×1024 PNG) with CoreGraphics — a warm green
// field with a white shield-check mark. Run: swift ml/make_icon.swift
import AppKit

let S: CGFloat = 1024
let cs = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(data: nil, width: Int(S), height: Int(S), bitsPerComponent: 8,
  bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }

func rgb(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat) -> CGColor { CGColor(red: r/255, green: g/255, blue: b/255, alpha: 1) }

// Background: deep-green vertical gradient.
let grad = CGGradient(colorsSpace: cs, colors: [rgb(17,120,96), rgb(9,82,66)] as CFArray, locations: [0, 1])!
ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: S), end: CGPoint(x: 0, y: 0), options: [])

// Soft light bloom top-left.
if let bloom = CGGradient(colorsSpace: cs, colors: [CGColor(red: 1, green: 1, blue: 1, alpha: 0.10), CGColor(red: 1, green: 1, blue: 1, alpha: 0)] as CFArray, locations: [0, 1]) {
  ctx.drawRadialGradient(bloom, startCenter: CGPoint(x: S*0.32, y: S*0.78), startRadius: 0,
    endCenter: CGPoint(x: S*0.32, y: S*0.78), endRadius: S*0.6, options: [])
}

// Shield path (centered), drawn in flipped-y math then handled by context coords.
let cx = S/2
let top = S*0.20, bot = S*0.82
let halfW = S*0.235
let shoulder = S*0.30   // y where the shield is widest, from top
let midTop = top
let wideY = S*0.20 + shoulder

let shield = CGMutablePath()
shield.move(to: CGPoint(x: cx, y: S - midTop))                                  // top center
shield.addLine(to: CGPoint(x: cx + halfW, y: S - (top + S*0.085)))              // upper right
shield.addLine(to: CGPoint(x: cx + halfW, y: S - (wideY + S*0.05)))            // right side
shield.addCurve(to: CGPoint(x: cx, y: S - bot),                                 // to bottom point
  control1: CGPoint(x: cx + halfW, y: S - (bot - S*0.16)),
  control2: CGPoint(x: cx + halfW*0.55, y: S - (bot - S*0.02)))
shield.addCurve(to: CGPoint(x: cx - halfW, y: S - (wideY + S*0.05)),
  control1: CGPoint(x: cx - halfW*0.55, y: S - (bot - S*0.02)),
  control2: CGPoint(x: cx - halfW, y: S - (bot - S*0.16)))
shield.addLine(to: CGPoint(x: cx - halfW, y: S - (top + S*0.085)))
shield.closeSubpath()

// White shield with a subtle inner tint.
ctx.setShadow(offset: CGSize(width: 0, height: -18), blur: 40, color: CGColor(red: 0, green: 0, blue: 0, alpha: 0.22))
ctx.addPath(shield); ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1)); ctx.fillPath()
ctx.setShadow(offset: .zero, blur: 0, color: nil)

// Green checkmark inside.
let check = CGMutablePath()
check.move(to: CGPoint(x: cx - S*0.115, y: S - S*0.505))
check.addLine(to: CGPoint(x: cx - S*0.025, y: S - S*0.595))
check.addLine(to: CGPoint(x: cx + S*0.135, y: S - S*0.40))
ctx.addPath(check)
ctx.setStrokeColor(rgb(13,107,87))
ctx.setLineWidth(S*0.052)
ctx.setLineCap(.round); ctx.setLineJoin(.round)
ctx.strokePath()

guard let img = ctx.makeImage() else { exit(1) }
let rep = NSBitmapImageRep(cgImage: img)
guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
let out = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
  .appendingPathComponent("assets/icon.png")
try! png.write(to: out)
print("Wrote \(out.path)")

// Also write an adaptive foreground (transparent bg) for Android + a splash mark.
guard let ctx2 = CGContext(data: nil, width: Int(S), height: Int(S), bitsPerComponent: 8,
  bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(0) }
ctx2.addPath(shield); ctx2.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1)); ctx2.fillPath()
ctx2.addPath(check); ctx2.setStrokeColor(rgb(13,107,87)); ctx2.setLineWidth(S*0.052)
ctx2.setLineCap(.round); ctx2.setLineJoin(.round); ctx2.strokePath()
if let img2 = ctx2.makeImage() {
  let png2 = NSBitmapImageRep(cgImage: img2).representation(using: .png, properties: [:])
  try? png2?.write(to: URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("assets/adaptive-icon.png"))
}
