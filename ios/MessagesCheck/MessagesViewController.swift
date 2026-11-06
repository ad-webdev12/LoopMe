import UIKit
import Messages

// Loop Me inside the Messages app. It sits in the app drawer under the
// keyboard like a sticker app. iOS lets no app read the conversation, so the
// one thing the person does is: hold the message, tap Copy, tap the Loop Me
// icon. The verdict appears right here, in the same big words as the app,
// and one tap opens the full answer. Nothing is sent and nothing leaves the
// phone; the detector and the model run in this process.
final class MessagesViewController: MSMessagesAppViewController {
  static let model = CoreModel.named("ScamText", threshold: 0.8)

  private let card = UIView()
  private let eyebrow = UILabel()
  private let word = UILabel()
  private let line = UILabel()
  private let step = UILabel()
  private let quote = UILabel()
  private let primary = UIButton(type: .system)
  private let secondary = UIButton(type: .system)
  private var lastText = ""
  private var lastChecked = ""

  private let green = UIColor(red: 0.051, green: 0.42, blue: 0.341, alpha: 1)
  private let red = UIColor(red: 0.925, green: 0.188, blue: 0.075, alpha: 1)
  private let amber = UIColor(red: 0.722, green: 0.471, blue: 0.102, alpha: 1)
  private let ink = UIColor(red: 0.09, green: 0.09, blue: 0.09, alpha: 1)
  private let sub = UIColor(red: 0.44, green: 0.44, blue: 0.44, alpha: 1)

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(red: 0.973, green: 0.973, blue: 0.965, alpha: 1)
    build()
    showIdle()
  }

  override func willBecomeActive(with conversation: MSConversation) {
    super.willBecomeActive(with: conversation)
    checkClipboard()
  }

  override func didTransition(to presentationStyle: MSMessagesAppPresentationStyle) {
    super.didTransition(to: presentationStyle)
    layoutForStyle()
  }

  // MARK: - The check

  private func checkClipboard() {
    // iOS shows its own "Loop Me pasted from Messages" line the first time.
    // That is the honest signal: the only thing read is what was copied.
    guard UIPasteboard.general.hasStrings, let text = UIPasteboard.general.string?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
      showIdle(); return
    }
    if text == lastChecked { return }
    lastChecked = text
    run(text)
  }

  private func run(_ text: String) {
    lastText = text
    var opts = DetectorOptions()
    opts.allowlist = SharedStore.allowlist
    let v = Engine.check(text, opts, model: MessagesViewController.model)
    SharedStore.bump("shared")
    if v.level != .green {
      SharedStore.logVerdict([
        "id": "m-" + UUID().uuidString,
        "at": Date().timeIntervalSince1970 * 1000,
        "source": "share",
        "sender": "",
        "excerpt": Redact.privateDetails(text).prefix(180).description,
        "level": v.level.rawValue, "score": v.score, "tags": v.tags,
        "reason": v.reason, "safeStep": v.safeStep, "signals": v.signals,
      ])
    }
    show(v, text: text)
  }

  // MARK: - Views

  private func build() {
    card.backgroundColor = .white
    card.layer.cornerRadius = 14
    card.layer.borderWidth = 1
    card.layer.borderColor = UIColor(red: 0.898, green: 0.898, blue: 0.886, alpha: 1).cgColor
    card.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(card)

    for l in [eyebrow, word, line, step, quote] {
      l.numberOfLines = 0
      l.translatesAutoresizingMaskIntoConstraints = false
      l.adjustsFontForContentSizeCategory = true
      card.addSubview(l)
    }
    eyebrow.font = .systemFont(ofSize: 13, weight: .semibold)
    eyebrow.textColor = sub
    word.font = .systemFont(ofSize: 30, weight: .heavy)
    line.font = .systemFont(ofSize: 17, weight: .regular)
    line.textColor = ink
    step.font = .systemFont(ofSize: 17, weight: .semibold)
    step.textColor = ink
    quote.font = .systemFont(ofSize: 15, weight: .regular)
    quote.textColor = sub
    quote.numberOfLines = 3

    for b in [primary, secondary] {
      b.translatesAutoresizingMaskIntoConstraints = false
      b.titleLabel?.font = .systemFont(ofSize: 17, weight: .bold)
      b.layer.cornerRadius = 12
      b.contentEdgeInsets = UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 16)
      card.addSubview(b)
    }
    primary.backgroundColor = green
    primary.setTitleColor(.white, for: .normal)
    primary.addTarget(self, action: #selector(openApp), for: .touchUpInside)
    secondary.backgroundColor = UIColor(red: 0.973, green: 0.973, blue: 0.965, alpha: 1)
    secondary.setTitleColor(ink, for: .normal)
    secondary.addTarget(self, action: #selector(pasteTapped), for: .touchUpInside)

    NSLayoutConstraint.activate([
      card.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
      card.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
      card.topAnchor.constraint(equalTo: view.topAnchor, constant: 14),
      card.bottomAnchor.constraint(lessThanOrEqualTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -12),

      eyebrow.topAnchor.constraint(equalTo: card.topAnchor, constant: 16),
      eyebrow.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 18),
      eyebrow.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -18),
      word.topAnchor.constraint(equalTo: eyebrow.bottomAnchor, constant: 4),
      word.leadingAnchor.constraint(equalTo: eyebrow.leadingAnchor),
      word.trailingAnchor.constraint(equalTo: eyebrow.trailingAnchor),
      line.topAnchor.constraint(equalTo: word.bottomAnchor, constant: 8),
      line.leadingAnchor.constraint(equalTo: eyebrow.leadingAnchor),
      line.trailingAnchor.constraint(equalTo: eyebrow.trailingAnchor),
      step.topAnchor.constraint(equalTo: line.bottomAnchor, constant: 10),
      step.leadingAnchor.constraint(equalTo: eyebrow.leadingAnchor),
      step.trailingAnchor.constraint(equalTo: eyebrow.trailingAnchor),
      quote.topAnchor.constraint(equalTo: step.bottomAnchor, constant: 10),
      quote.leadingAnchor.constraint(equalTo: eyebrow.leadingAnchor),
      quote.trailingAnchor.constraint(equalTo: eyebrow.trailingAnchor),
      primary.topAnchor.constraint(equalTo: quote.bottomAnchor, constant: 14),
      primary.leadingAnchor.constraint(equalTo: eyebrow.leadingAnchor),
      primary.trailingAnchor.constraint(equalTo: eyebrow.trailingAnchor),
      secondary.topAnchor.constraint(equalTo: primary.bottomAnchor, constant: 8),
      secondary.leadingAnchor.constraint(equalTo: eyebrow.leadingAnchor),
      secondary.trailingAnchor.constraint(equalTo: eyebrow.trailingAnchor),
      secondary.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -16),
    ])
  }

  private func layoutForStyle() {
    // Compact (the drawer) hides the quote and the second button; expanded shows everything.
    let compact = presentationStyle == .compact
    quote.isHidden = compact || quote.text?.isEmpty != false
    secondary.isHidden = compact && !lastChecked.isEmpty
  }

  private func showIdle() {
    eyebrow.text = "LOOP ME"
    word.text = "Copy a message, then tap here."
    word.textColor = ink
    word.font = .systemFont(ofSize: 22, weight: .heavy)
    line.text = "Hold the message, tap Copy, then tap the Loop Me icon. The answer appears here. Nothing is sent to anyone."
    step.text = ""
    quote.text = ""
    primary.setTitle("Check what I copied", for: .normal)
    primary.removeTarget(nil, action: nil, for: .allEvents)
    primary.addTarget(self, action: #selector(pasteTapped), for: .touchUpInside)
    secondary.setTitle("Open Loop Me", for: .normal)
    secondary.removeTarget(nil, action: nil, for: .allEvents)
    secondary.addTarget(self, action: #selector(openApp), for: .touchUpInside)
    layoutForStyle()
  }

  private func show(_ v: Verdict, text: String) {
    let color: UIColor = v.level == .red ? red : v.level == .amber ? amber : green
    eyebrow.text = "OUR ANSWER"
    word.font = .systemFont(ofSize: 30, weight: .heavy)
    word.textColor = color
    word.text = v.level == .red ? "Stop. This is a scam." : v.level == .amber ? "Be careful." : "Looks okay."
    line.text = v.reason
    step.text = v.safeStep
    quote.text = "“" + text.prefix(140) + (text.count > 140 ? "…" : "") + "”"
    primary.setTitle(v.level == .green ? "See the full answer in Loop Me" : "Open in Loop Me and tell someone", for: .normal)
    primary.removeTarget(nil, action: nil, for: .allEvents)
    primary.addTarget(self, action: #selector(openApp), for: .touchUpInside)
    secondary.setTitle("Check a different message", for: .normal)
    secondary.removeTarget(nil, action: nil, for: .allEvents)
    secondary.addTarget(self, action: #selector(pasteTapped), for: .touchUpInside)
    if v.level == .red { UINotificationFeedbackGenerator().notificationOccurred(.error) }
    layoutForStyle()
  }

  @objc private func pasteTapped() {
    lastChecked = ""
    checkClipboard()
    if lastChecked.isEmpty { requestPresentationStyle(.expanded) }
  }

  @objc private func openApp() {
    var comps = URLComponents()
    comps.scheme = "loopmein"
    comps.host = "check"
    if !lastText.isEmpty { comps.queryItems = [URLQueryItem(name: "text", value: String(lastText.prefix(2000)))] }
    guard let url = comps.url else { return }
    extensionContext?.open(url, completionHandler: nil)
  }
}
