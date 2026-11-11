import UIKit
import Messages

// Loop Me inside the Messages app. It sits in the "+" list like Photos or
// Audio. iOS lets no app read the conversation, so the person copies the
// message and taps one button. That button is Apple's own paste control, which
// hands over the clipboard with no "would like to paste" alert. The answer is
// the same red, amber or green field the app shows, right here in the drawer.
// Nothing is sent; the detector and the model run in this process.
final class MessagesViewController: MSMessagesAppViewController {
  static let model = CoreModel.named("ScamText", threshold: 0.8)

  private let paper = UIColor(red: 0.973, green: 0.973, blue: 0.965, alpha: 1)
  private let ink = UIColor(red: 0.09, green: 0.09, blue: 0.09, alpha: 1)
  private let sub = UIColor(red: 0.44, green: 0.44, blue: 0.44, alpha: 1)
  private let hair = UIColor(red: 0.898, green: 0.898, blue: 0.886, alpha: 1)
  private let green = UIColor(red: 0.051, green: 0.42, blue: 0.341, alpha: 1)
  private let red = UIColor(red: 0.925, green: 0.188, blue: 0.075, alpha: 1)
  private let amber = UIColor(red: 0.722, green: 0.471, blue: 0.102, alpha: 1)

  private let eyebrow = UILabel()
  private let headline = UILabel()
  private let line = UILabel()
  private let steps = UIStackView()
  private let quote = UILabel()
  private let primary = UIButton(type: .system)
  private let again = UIButton(type: .system)
  private var pasteButton: UIControl?
  private var bottom: UIStackView!

  private var text = ""
  private var verdict: Verdict?

  override func viewDidLoad() {
    super.viewDidLoad()
    build()
    showIdle()
  }

  override func didTransition(to presentationStyle: MSMessagesAppPresentationStyle) {
    super.didTransition(to: presentationStyle)
    relayout()
  }

  // MARK: - Paste

  // UIPasteControl calls this with whatever was copied. Reading the board
  // this way never shows the system paste alert.
  override func paste(itemProviders: [NSItemProvider]) {
    guard let p = itemProviders.first(where: { $0.canLoadObject(ofClass: NSString.self) }) else { return }
    _ = p.loadObject(ofClass: NSString.self) { [weak self] obj, _ in
      guard let s = (obj as? NSString)?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else { return }
      DispatchQueue.main.async { self?.run(String(s)) }
    }
  }

  override func canPaste(_ itemProviders: [NSItemProvider]) -> Bool {
    itemProviders.contains { $0.canLoadObject(ofClass: NSString.self) }
  }

  private func run(_ t: String) {
    text = t
    var opts = DetectorOptions()
    opts.allowlist = SharedStore.allowlist
    let v = Engine.check(t, opts, model: MessagesViewController.model)
    verdict = v
    SharedStore.bump("messages")
    if v.level != .green {
      SharedStore.logVerdict([
        "id": "m-" + UUID().uuidString,
        "at": Date().timeIntervalSince1970 * 1000,
        "source": "messages",
        "sender": "",
        "excerpt": Redact.privateDetails(t).prefix(180).description,
        "level": v.level.rawValue, "score": v.score, "tags": v.tags,
        "reason": v.reason, "safeStep": v.safeStep, "signals": v.signals,
      ])
      UINotificationFeedbackGenerator().notificationOccurred(v.level == .red ? .error : .warning)
    }
    show(v)
  }

  // MARK: - Build

  private func build() {
    pasteConfiguration = UIPasteConfiguration(forAccepting: NSString.self)
    view.backgroundColor = paper

    for l in [eyebrow, headline, line, quote] {
      l.numberOfLines = 0
      l.adjustsFontForContentSizeCategory = true
    }
    eyebrow.font = .systemFont(ofSize: 13, weight: .semibold)
    headline.font = .systemFont(ofSize: 28, weight: .heavy)
    line.font = .systemFont(ofSize: 17, weight: .semibold)
    quote.font = .systemFont(ofSize: 15, weight: .regular)
    quote.numberOfLines = 3

    steps.axis = .vertical
    steps.spacing = 0
    for (i, s) in ["Hold the message", "Tap Copy", "Tap Paste below"].enumerated() {
      steps.addArrangedSubview(stepRow(i + 1, s))
    }

    let top = UIStackView(arrangedSubviews: [eyebrow, headline, line, steps, quote])
    top.axis = .vertical
    top.spacing = 8
    top.setCustomSpacing(4, after: eyebrow)
    top.setCustomSpacing(14, after: headline)
    top.setCustomSpacing(14, after: line)
    top.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(top)

    for b in [primary, again] {
      b.titleLabel?.font = .systemFont(ofSize: 17, weight: .bold)
      b.layer.cornerRadius = 14
      b.heightAnchor.constraint(equalToConstant: 56).isActive = true
    }
    primary.addTarget(self, action: #selector(openApp), for: .touchUpInside)
    again.addTarget(self, action: #selector(reset), for: .touchUpInside)

    let pc: UIControl
    if #available(iOS 16.0, *) {
      let c = UIPasteControl.Configuration()
      c.displayMode = .labelOnly
      c.baseBackgroundColor = green
      c.baseForegroundColor = .white
      c.cornerStyle = .large
      let control = UIPasteControl(configuration: c)
      control.target = self
      pc = control
    } else {
      // Older iOS: a plain button that reads the board (iOS may ask first).
      let b = UIButton(type: .system)
      b.setTitle("Check what I copied", for: .normal)
      b.titleLabel?.font = .systemFont(ofSize: 17, weight: .bold)
      b.backgroundColor = green
      b.setTitleColor(.white, for: .normal)
      b.layer.cornerRadius = 14
      b.addTarget(self, action: #selector(readBoard), for: .touchUpInside)
      pc = b
    }
    pc.heightAnchor.constraint(equalToConstant: 56).isActive = true
    pasteButton = pc

    bottom = UIStackView(arrangedSubviews: [pc, primary, again])
    bottom.axis = .vertical
    bottom.spacing = 8
    bottom.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(bottom)

    let g = view.safeAreaLayoutGuide
    NSLayoutConstraint.activate([
      top.topAnchor.constraint(equalTo: g.topAnchor, constant: 18),
      top.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 24),
      top.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -24),
      bottom.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 24),
      bottom.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -24),
      bottom.bottomAnchor.constraint(equalTo: g.bottomAnchor, constant: -12),
      bottom.topAnchor.constraint(greaterThanOrEqualTo: top.bottomAnchor, constant: 12),
    ])
  }

  private func stepRow(_ n: Int, _ s: String) -> UIView {
    let row = UIView()
    let num = UILabel()
    num.text = "\(n)"
    num.font = .systemFont(ofSize: 15, weight: .bold)
    num.textColor = green
    let t = UILabel()
    t.text = s
    t.font = .systemFont(ofSize: 17, weight: .regular)
    t.textColor = ink
    t.numberOfLines = 0
    let rule = UIView()
    rule.backgroundColor = hair
    for v in [num, t, rule] { v.translatesAutoresizingMaskIntoConstraints = false; row.addSubview(v) }
    NSLayoutConstraint.activate([
      rule.topAnchor.constraint(equalTo: row.topAnchor),
      rule.leadingAnchor.constraint(equalTo: row.leadingAnchor),
      rule.trailingAnchor.constraint(equalTo: row.trailingAnchor),
      rule.heightAnchor.constraint(equalToConstant: 1),
      num.leadingAnchor.constraint(equalTo: row.leadingAnchor),
      num.widthAnchor.constraint(equalToConstant: 22),
      num.firstBaselineAnchor.constraint(equalTo: t.firstBaselineAnchor),
      t.leadingAnchor.constraint(equalTo: num.trailingAnchor, constant: 8),
      t.trailingAnchor.constraint(equalTo: row.trailingAnchor),
      t.topAnchor.constraint(equalTo: row.topAnchor, constant: 13),
      t.bottomAnchor.constraint(equalTo: row.bottomAnchor, constant: -13),
    ])
    return row
  }

  // MARK: - States

  private func showIdle() {
    verdict = nil
    text = ""
    view.backgroundColor = paper
    eyebrow.text = "LOOP ME"
    eyebrow.textColor = sub
    headline.text = "Copy the message, then tap Paste."
    headline.textColor = ink
    line.text = ""
    quote.text = ""
    for case let l as UILabel in steps.arrangedSubviews.flatMap({ $0.subviews }) where l.font.pointSize == 17 { l.textColor = ink }
    primary.isHidden = true
    again.isHidden = true
    pasteButton?.isHidden = false
    relayout()
  }

  private func show(_ v: Verdict) {
    let color: UIColor = v.level == .red ? red : v.level == .amber ? amber : green
    view.backgroundColor = color
    eyebrow.text = v.level == .red ? "SCAM" : v.level == .amber ? "BE CAREFUL" : "LOOKS OKAY"
    eyebrow.textColor = UIColor.white.withAlphaComponent(0.8)
    headline.text = v.level == .red ? "Stop. Do not reply." : v.level == .amber ? "Be careful with this one." : "This looks okay."
    headline.textColor = .white
    line.text = v.safeStep
    line.textColor = .white
    quote.text = v.reason
    quote.textColor = UIColor.white.withAlphaComponent(0.85)
    primary.setTitle(v.level == .green ? "See it in Loop Me" : "Show me more", for: .normal)
    primary.backgroundColor = .white
    primary.setTitleColor(color, for: .normal)
    again.setTitle("Check another message", for: .normal)
    again.backgroundColor = .clear
    again.setTitleColor(.white, for: .normal)
    again.layer.borderWidth = 1
    again.layer.borderColor = UIColor.white.withAlphaComponent(0.55).cgColor
    primary.isHidden = false
    again.isHidden = false
    pasteButton?.isHidden = true
    relayout()
  }

  // Compact is the strip under the keyboard, about 250 points tall. It keeps
  // the headline and one button. Expanded shows the steps or the reason.
  private func relayout() {
    let compact = presentationStyle == .compact
    let idle = verdict == nil
    steps.isHidden = !idle || compact
    quote.isHidden = idle || compact || (quote.text ?? "").isEmpty
    line.isHidden = idle || (line.text ?? "").isEmpty
    again.isHidden = idle || compact
    headline.font = .systemFont(ofSize: compact ? 24 : 28, weight: .heavy)
  }

  // MARK: - Actions

  @objc private func reset() { showIdle() }

  @objc private func readBoard() {
    guard let t = UIPasteboard.general.string?.trimmingCharacters(in: .whitespacesAndNewlines), !t.isEmpty else { return }
    run(t)
  }

  @objc private func openApp() {
    var comps = URLComponents()
    comps.scheme = "loopmein"
    comps.host = "check"
    if !text.isEmpty { comps.queryItems = [URLQueryItem(name: "text", value: String(text.prefix(2000)))] }
    guard let url = comps.url else { return }
    extensionContext?.open(url, completionHandler: nil)
  }
}
