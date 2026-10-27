import UIKit
import UniformTypeIdentifiers
import Vision

// The share sheet. From Messages, WhatsApp, Mail, Safari, Photos: select the
// text, a link or a screenshot, tap Share, tap Loop Me, and the answer appears
// right there. Nothing to copy, no app switch, nothing leaves the phone.
//
// Runs the same detector as the app (ios/Shared/Engine). The verdict is also
// written to the shared log so it shows in History and reaches the caretaker
// the next time Loop Me opens.
final class ShareViewController: UIViewController {
  private let card = UIView()
  private let stack = UIStackView()
  private let spinner = UIActivityIndicatorView(style: .large)
  private var checkedText = ""

  // The app's tokens, so this looks like Loop Me and not like a system sheet.
  private enum C {
    static let red = UIColor(red: 0.925, green: 0.188, blue: 0.075, alpha: 1)
    static let redTint = UIColor(red: 0.992, green: 0.933, blue: 0.918, alpha: 1)
    static let redInk = UIColor(red: 0.549, green: 0.122, blue: 0.047, alpha: 1)
    static let green = UIColor(red: 0.051, green: 0.420, blue: 0.341, alpha: 1)
    static let greenTint = UIColor(red: 0.933, green: 0.957, blue: 0.945, alpha: 1)
    static let greenInk = UIColor(red: 0.051, green: 0.290, blue: 0.231, alpha: 1)
    static let amber = UIColor(red: 0.722, green: 0.471, blue: 0.102, alpha: 1)
    static let amberTint = UIColor(red: 0.984, green: 0.941, blue: 0.867, alpha: 1)
    static let amberInk = UIColor(red: 0.478, green: 0.306, blue: 0.051, alpha: 1)
    static let ink = UIColor(white: 0.09, alpha: 1)
    static let sub = UIColor(white: 0.44, alpha: 1)
    static let ground = UIColor(red: 0.973, green: 0.973, blue: 0.965, alpha: 1)
    static let hairline = UIColor(red: 0.898, green: 0.898, blue: 0.886, alpha: 1)
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor.black.withAlphaComponent(0.35)
    card.backgroundColor = C.ground
    card.layer.cornerRadius = 22
    card.layer.cornerCurve = .continuous
    card.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(card)
    NSLayoutConstraint.activate([
      card.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 14),
      card.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -14),
      card.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -10),
    ])
    stack.axis = .vertical
    stack.spacing = 12
    stack.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 20),
      stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
      stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),
      stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -20),
    ])
    spinner.startAnimating()
    stack.addArrangedSubview(label("Reading it on this phone", size: 15, weight: .semibold, color: C.sub))
    stack.addArrangedSubview(spinner)
    loadInput()
  }

  // MARK: input

  private func loadInput() {
    guard let items = extensionContext?.inputItems as? [NSExtensionItem] else { return finish(with: nil) }
    let providers = items.flatMap { $0.attachments ?? [] }
    if let p = providers.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) }) {
      p.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] item, _ in
        let text = (item as? String) ?? (item as? NSAttributedString)?.string ?? ((item as? Data).flatMap { String(data: $0, encoding: .utf8) })
        DispatchQueue.main.async { self?.finish(with: text) }
      }
      return
    }
    if let p = providers.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.url.identifier) }) {
      p.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] item, _ in
        let text = (item as? URL)?.absoluteString ?? (item as? String)
        DispatchQueue.main.async { self?.finish(with: text) }
      }
      return
    }
    if let p = providers.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.image.identifier) }) {
      p.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] item, _ in
        var image: UIImage? = item as? UIImage
        if image == nil, let url = item as? URL, let d = try? Data(contentsOf: url) { image = UIImage(data: d) }
        if image == nil, let d = item as? Data { image = UIImage(data: d) }
        guard let cg = image?.cgImage else { DispatchQueue.main.async { self?.finish(with: nil) }; return }
        self?.recognize(cg) { text in DispatchQueue.main.async { self?.finish(with: text) } }
      }
      return
    }
    // Some apps hand over the selection as an attributed string or a rich item.
    if let text = items.compactMap({ $0.attributedContentText?.string }).first(where: { !$0.isEmpty }) {
      return finish(with: text)
    }
    finish(with: nil)
  }

  private func recognize(_ cg: CGImage, done: @escaping (String?) -> Void) {
    let req = VNRecognizeTextRequest { r, _ in
      let lines = (r.results as? [VNRecognizedTextObservation] ?? [])
        .sorted { $0.boundingBox.minY > $1.boundingBox.minY }
        .compactMap { $0.topCandidates(1).first?.string }
      done(lines.isEmpty ? nil : lines.joined(separator: "\n"))
    }
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = true
    DispatchQueue.global(qos: .userInitiated).async {
      try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
    }
  }

  // MARK: verdict

  private func finish(with text: String?) {
    stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
    guard let text = text?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
      stack.addArrangedSubview(label("Nothing to check", size: 24, weight: .heavy, color: C.ink))
      stack.addArrangedSubview(label("Select the words of the message first, or share a screenshot of it.", size: 17, weight: .regular, color: C.sub))
      stack.addArrangedSubview(button("Close", fill: C.ink, action: #selector(close)))
      return
    }
    checkedText = text
    var opts = DetectorOptions()
    opts.allowlist = SharedStore.allowlist
    let v = Engine.instant(text, opts)
    SharedStore.bump("shared")
    SharedStore.logVerdict([
      "id": "s-" + UUID().uuidString,
      "at": Date().timeIntervalSince1970 * 1000,
      "source": "share",
      "sender": "",
      "excerpt": Redact.privateDetails(text).prefix(180).description,
      "level": v.level.rawValue, "score": v.score, "tags": v.tags,
      "reason": v.reason, "safeStep": v.safeStep, "signals": v.signals,
    ])

    let (word, line, tint, ink, fill): (String, String, UIColor, UIColor, UIColor) = {
      switch v.level {
      case .red: return ("Stop", "This looks like a scam.", C.redTint, C.redInk, C.red)
      case .amber: return ("Be careful", "Something about this is not right.", C.amberTint, C.amberInk, C.amber)
      case .green: return ("Looks okay", "Nothing here matches a scam we know. That is not a promise.", C.greenTint, C.greenInk, C.green)
      }
    }()

    let banner = UIView()
    banner.backgroundColor = tint
    banner.layer.cornerRadius = 14
    banner.layer.cornerCurve = .continuous
    let bs = UIStackView()
    bs.axis = .vertical; bs.spacing = 6
    bs.translatesAutoresizingMaskIntoConstraints = false
    banner.addSubview(bs)
    NSLayoutConstraint.activate([
      bs.topAnchor.constraint(equalTo: banner.topAnchor, constant: 16),
      bs.leadingAnchor.constraint(equalTo: banner.leadingAnchor, constant: 18),
      bs.trailingAnchor.constraint(equalTo: banner.trailingAnchor, constant: -18),
      bs.bottomAnchor.constraint(equalTo: banner.bottomAnchor, constant: -18),
    ])
    bs.addArrangedSubview(label("Loop Me says", size: 14, weight: .semibold, color: ink))
    bs.addArrangedSubview(label(word, size: 34, weight: .heavy, color: ink))
    bs.addArrangedSubview(label(line, size: 17, weight: .medium, color: ink))
    stack.addArrangedSubview(banner)

    stack.addArrangedSubview(label("What to do", size: 14, weight: .semibold, color: C.sub))
    stack.addArrangedSubview(label(v.safeStep, size: 19, weight: .semibold, color: C.ink))

    if let first = v.signals.first, v.level != .green {
      stack.addArrangedSubview(label("Why", size: 14, weight: .semibold, color: C.sub))
      stack.addArrangedSubview(label(first, size: 16, weight: .regular, color: C.ink))
    }

    let row = UIStackView()
    row.axis = .vertical; row.spacing = 8
    row.addArrangedSubview(button("Open in Loop Me", fill: fill, action: #selector(openApp)))
    row.addArrangedSubview(button("Done", fill: C.ink, action: #selector(close)))
    stack.addArrangedSubview(row)
    stack.addArrangedSubview(label("Checked on this phone. Nothing was sent anywhere.", size: 13, weight: .regular, color: C.sub))
  }

  // MARK: actions

  @objc private func close() {
    extensionContext?.completeRequest(returningItems: nil)
  }

  /// Extensions cannot open apps directly. Walking the responder chain to the
  /// hosting UIApplication is how every share extension that offers "Open in
  /// app" does it; if the host refuses, the text is on the clipboard instead.
  @objc private func openApp() {
    var comps = URLComponents()
    comps.scheme = "loopmein"
    comps.host = "check"
    comps.queryItems = [URLQueryItem(name: "text", value: String(checkedText.prefix(1500)))]
    guard let url = comps.url else { return close() }
    var responder: UIResponder? = self
    let sel = NSSelectorFromString("openURL:")
    while let r = responder {
      if r.responds(to: sel) {
        r.perform(sel, with: url)
        break
      }
      responder = r.next
    }
    if responder == nil { UIPasteboard.general.string = checkedText }
    close()
  }

  // MARK: views

  private func label(_ text: String, size: CGFloat, weight: UIFont.Weight, color: UIColor) -> UILabel {
    let l = UILabel()
    l.text = text
    l.numberOfLines = 0
    l.textColor = color
    l.font = UIFontMetrics.default.scaledFont(for: .systemFont(ofSize: size, weight: weight))
    l.adjustsFontForContentSizeCategory = true
    return l
  }

  private func button(_ title: String, fill: UIColor, action: Selector) -> UIButton {
    let b = UIButton(type: .system)
    b.setTitle(title, for: .normal)
    b.setTitleColor(.white, for: .normal)
    b.titleLabel?.font = UIFontMetrics.default.scaledFont(for: .systemFont(ofSize: 17, weight: .bold))
    b.backgroundColor = fill
    b.layer.cornerRadius = 12
    b.layer.cornerCurve = .continuous
    b.heightAnchor.constraint(equalToConstant: 54).isActive = true
    b.addTarget(self, action: action, for: .touchUpInside)
    return b
  }
}
