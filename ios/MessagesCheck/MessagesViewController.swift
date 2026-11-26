import UIKit
import Messages
import AVFoundation

// Loop Me inside the Messages app, to the handoff's eight states: idle, ready,
// checking, scam, see why, be careful, looks okay, ask. Compact presentation
// only; everything works without opening the app. The container is the
// strip under the keyboard: top radius 28, padding 8/20/34, grabber 36×5,
// buttons 54 tall radius 14, every state change a 280 ms fade-up.
//
// Reading the clipboard goes through Apple's paste control, so iOS never
// shows the "would like to paste" alert. The detector and the model run in
// this process; a "Tell" goes to the caretaker over the family link from
// here (ios/Shared/ExtensionCloud.swift). Nothing is sent into the chat.
final class MessagesViewController: MSMessagesAppViewController {
  static let model = CoreModel.named("ScamNet", threshold: 0.8)

  private enum State { case idle, ready, checking, scam, why, careful, safe, asking }
  private var state: State = .idle
  private var text = ""
  private var verdict: Verdict?
  private var recordId = ""
  private var asked = false
  private var sendFailed = false
  private var reply: ExtensionCloud.Reply?
  private var poll: Timer?
  private var pollStarted = Date()
  private let voice = AVSpeechSynthesizer()
  private var container = UIView()

  private let paper = UIColor(red: 0.976, green: 0.976, blue: 0.969, alpha: 1)
  private let ink = UIColor.black
  private let ink2 = UIColor(red: 0.235, green: 0.235, blue: 0.263, alpha: 1)
  private let meta = UIColor(red: 0.424, green: 0.424, blue: 0.439, alpha: 1)
  private let green = UIColor(red: 0.051, green: 0.42, blue: 0.341, alpha: 1)
  private let greenDeep = UIColor(red: 0.051, green: 0.29, blue: 0.231, alpha: 1)
  private let greenTint = UIColor(red: 0.933, green: 0.957, blue: 0.945, alpha: 1)
  private let red = UIColor(red: 0.925, green: 0.188, blue: 0.075, alpha: 1)
  private let redText = UIColor(red: 0.769, green: 0.149, blue: 0.059, alpha: 1)
  private let redInk = UIColor(red: 0.549, green: 0.122, blue: 0.047, alpha: 1)
  private let redTint = UIColor(red: 0.992, green: 0.933, blue: 0.918, alpha: 1)
  private let amber = UIColor(red: 0.722, green: 0.471, blue: 0.102, alpha: 1)
  private let amberInk = UIColor(red: 0.478, green: 0.306, blue: 0.051, alpha: 1)
  private let bubble = UIColor(red: 0.914, green: 0.914, blue: 0.922, alpha: 1)

  override func viewDidLoad() {
    super.viewDidLoad()
    pasteConfiguration = UIPasteConfiguration(forAccepting: NSString.self)
    view.backgroundColor = .clear
    render(.idle, animated: false)
  }

  override func willBecomeActive(with conversation: MSConversation) {
    super.willBecomeActive(with: conversation)
    // Opened with something copied? Straight to Ready. Nothing read until
    // the person taps Paste, so no alert appears here.
    if state == .idle, UIPasteboard.general.hasStrings, text.isEmpty {
      // hasStrings never reads the board; the Ready card fills on Paste.
    }
  }

  override func willResignActive(with conversation: MSConversation) {
    super.willResignActive(with: conversation)
    voice.stopSpeaking(at: .immediate)
  }

  // MARK: - Paste (Apple's control; no system alert)

  override func paste(itemProviders: [NSItemProvider]) {
    guard let p = itemProviders.first(where: { $0.canLoadObject(ofClass: NSString.self) }) else { return }
    _ = p.loadObject(ofClass: NSString.self) { [weak self] obj, _ in
      guard let s = (obj as? NSString)?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else { return }
      DispatchQueue.main.async { self?.text = String(s); self?.check() }
    }
  }
  override func canPaste(_ itemProviders: [NSItemProvider]) -> Bool { itemProviders.contains { $0.canLoadObject(ofClass: NSString.self) } }

  // MARK: - The check

  private func check() {
    render(.checking)
    let t = text
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { return }
      var opts = DetectorOptions()
      opts.allowlist = SharedStore.allowlist
      let v = Engine.check(t, opts, model: MessagesViewController.model)
      DispatchQueue.main.async {
        self.verdict = v
        self.recordId = "m-" + UUID().uuidString
        self.asked = false
        SharedStore.bump("messages")
        if v.level != .green { SharedStore.logVerdict(self.entry(v)) }
        // The animation takes 2.5 s; the answer waits for it.
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.6) {
          guard self.state == .checking else { return }
          if v.level == .red { UINotificationFeedbackGenerator().notificationOccurred(.error); if self.who != nil { self.publish(asked: false) } }
          self.render(v.level == .red ? .scam : v.level == .amber ? .careful : .safe)
        }
      }
    }
  }

  private func entry(_ v: Verdict, asked: Bool = false, published: Bool = false) -> [String: Any] {
    ["id": recordId, "at": Date().timeIntervalSince1970 * 1000, "source": "messages", "sender": "",
     "excerpt": Redact.privateDetails(text).prefix(180).description,
     "level": v.level.rawValue, "score": v.score, "tags": v.tags, "reason": v.reason, "safeStep": v.safeStep, "signals": v.signals,
     "asked": asked, "published": published]
  }

  // MARK: - Rendering

  private func render(_ s: State, animated: Bool = true) {
    state = s
    container.removeFromSuperview()
    container = UIView()
    container.translatesAutoresizingMaskIntoConstraints = false
    container.layer.cornerRadius = 28
    container.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
    container.clipsToBounds = true
    view.addSubview(container)
    NSLayoutConstraint.activate([
      container.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      container.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      container.topAnchor.constraint(equalTo: view.topAnchor),
      container.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ])
    let column = UIStackView()
    column.axis = .vertical
    column.translatesAutoresizingMaskIntoConstraints = false
    container.addSubview(column)
    NSLayoutConstraint.activate([
      column.topAnchor.constraint(equalTo: container.topAnchor, constant: 8),
      column.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 20),
      column.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -20),
      column.bottomAnchor.constraint(equalTo: container.safeAreaLayoutGuide.bottomAnchor, constant: -12),
    ])
    let dark: Bool
    switch s {
    case .idle: container.backgroundColor = paper; dark = false; buildIdle(column)
    case .ready: container.backgroundColor = paper; dark = false; buildReady(column)
    case .checking: container.backgroundColor = paper; dark = false; buildChecking(column)
    case .scam: container.backgroundColor = red; dark = true; buildScam(column)
    case .why: container.backgroundColor = redTint; dark = false; buildWhy(column)
    case .careful: container.backgroundColor = amber; dark = true; buildCareful(column)
    case .safe: container.backgroundColor = green; dark = true; buildSafe(column)
    case .asking: container.backgroundColor = paper; dark = false; buildAsking(column)
    }
    let grab = UIView()
    grab.backgroundColor = dark ? UIColor.white.withAlphaComponent(0.5) : (s == .why ? UIColor(red: 0.91, green: 0.72, blue: 0.675, alpha: 1) : UIColor(red: 0.78, green: 0.78, blue: 0.8, alpha: 1))
    grab.layer.cornerRadius = 2.5
    grab.translatesAutoresizingMaskIntoConstraints = false
    container.addSubview(grab)
    NSLayoutConstraint.activate([grab.widthAnchor.constraint(equalToConstant: 36), grab.heightAnchor.constraint(equalToConstant: 5), grab.centerXAnchor.constraint(equalTo: container.centerXAnchor), grab.topAnchor.constraint(equalTo: container.topAnchor, constant: 8)])
    if animated {
      container.alpha = 0
      container.transform = CGAffineTransform(translationX: 0, y: 10)
      UIView.animate(withDuration: 0.28, delay: 0, options: [.curveEaseOut]) { self.container.alpha = 1; self.container.transform = .identity }
    }
  }

  // MARK: pieces
  private func label(_ s: String, _ size: CGFloat, _ weight: UIFont.Weight, _ color: UIColor, lines: Int = 0, ls: CGFloat = 0) -> UILabel {
    let l = UILabel()
    l.numberOfLines = lines
    l.textColor = color
    l.font = .systemFont(ofSize: size, weight: weight)
    if ls != 0 { l.attributedText = NSAttributedString(string: s, attributes: [.kern: ls]) } else { l.text = s }
    l.adjustsFontForContentSizeCategory = true
    return l
  }
  private func button(_ title: String, bg: UIColor, fg: UIColor, icon: String? = nil, action: Selector) -> UIButton {
    var c = UIButton.Configuration.filled()
    c.baseBackgroundColor = bg
    c.baseForegroundColor = fg
    c.cornerStyle = .fixed
    c.background.cornerRadius = 14
    c.imagePadding = 8
    if let icon = icon { c.image = UIImage(systemName: icon, withConfiguration: UIImage.SymbolConfiguration(pointSize: 15, weight: .semibold)) }
    c.attributedTitle = AttributedString(title, attributes: AttributeContainer([.font: UIFont.systemFont(ofSize: 17, weight: .semibold)]))
    let b = UIButton(configuration: c)
    b.heightAnchor.constraint(equalToConstant: 54).isActive = true
    b.addTarget(self, action: action, for: .touchUpInside)
    return b
  }
  private func header(_ right: UIView?) -> UIStackView {
    let icon = UIImageView(image: UIImage(named: "loopme-icon"))
    icon.contentMode = .scaleAspectFill
    icon.layer.cornerRadius = 6
    icon.clipsToBounds = true
    icon.widthAnchor.constraint(equalToConstant: 24).isActive = true
    icon.heightAnchor.constraint(equalToConstant: 24).isActive = true
    icon.backgroundColor = green
    let h = UIStackView(arrangedSubviews: [icon, label("Loop Me", 15, .semibold, ink2)])
    h.spacing = 8
    h.alignment = .center
    if let r = right { let sp = UIView(); sp.setContentHuggingPriority(.defaultLow, for: .horizontal); h.addArrangedSubview(sp); h.addArrangedSubview(r) }
    return h
  }
  private func pill(_ title: String, bg: UIColor, fg: UIColor, radius: CGFloat = 9, height: CGFloat = 28, size: CGFloat = 14, weight: UIFont.Weight = .bold) -> UIView {
    let v = UIView()
    v.backgroundColor = bg
    v.layer.cornerRadius = radius
    let l = label(title, size, weight, fg)
    l.translatesAutoresizingMaskIntoConstraints = false
    v.addSubview(l)
    NSLayoutConstraint.activate([v.heightAnchor.constraint(equalToConstant: height), l.leadingAnchor.constraint(equalTo: v.leadingAnchor, constant: 11), l.trailingAnchor.constraint(equalTo: v.trailingAnchor, constant: -11), l.centerYAnchor.constraint(equalTo: v.centerYAnchor)])
    return v
  }
  private func spacer() -> UIView { let v = UIView(); v.setContentHuggingPriority(.defaultLow, for: .vertical); v.setContentCompressionResistancePriority(.defaultLow, for: .vertical); return v }
  private func rowOf(_ views: [UIView]) -> UIStackView { let r = UIStackView(arrangedSubviews: views); r.spacing = 8; r.distribution = .fillEqually; return r }
  private var who: String? { ExtensionCloud.caretakerFirstName }
  private func avatar(_ size: CGFloat, onColor: Bool) -> UIView {
    let v = UIView()
    v.backgroundColor = onColor ? UIColor.white.withAlphaComponent(0.35) : greenTint
    v.layer.cornerRadius = size / 2
    v.widthAnchor.constraint(equalToConstant: size).isActive = true
    v.heightAnchor.constraint(equalToConstant: size).isActive = true
    let l = label(String((who ?? "?").prefix(1)).uppercased(), size * 0.42, .semibold, onColor ? .white : green)
    l.translatesAutoresizingMaskIntoConstraints = false
    v.addSubview(l)
    NSLayoutConstraint.activate([l.centerXAnchor.constraint(equalTo: v.centerXAnchor), l.centerYAnchor.constraint(equalTo: v.centerYAnchor)])
    return v
  }

  // MARK: states
  // Capsule buttons, as in the design: 56 tall, fully round.
  private func cap(_ title: String, bg: UIColor, fg: UIColor, icon: String? = nil, action: Selector) -> UIButton {
    let b = button(title, bg: bg, fg: fg, icon: icon, action: action)
    b.configuration?.background.cornerRadius = 28
    b.constraints.first { $0.firstAttribute == .height }?.constant = 56
    return b
  }
  private func hstretch() -> UIView { let s = UIView(); s.setContentHuggingPriority(.defaultLow, for: .horizontal); return s }
  private func appIcon(_ size: CGFloat) -> UIView {
    let i = UIImageView(image: UIImage(named: "loopme-icon")); i.contentMode = .scaleAspectFill; i.backgroundColor = green
    i.layer.cornerRadius = size * 0.23; i.clipsToBounds = true
    i.widthAnchor.constraint(equalToConstant: size).isActive = true; i.heightAnchor.constraint(equalToConstant: size).isActive = true
    return i
  }
  private func centered(_ v: UIView) -> UIStackView { let s = UIStackView(arrangedSubviews: [v]); s.axis = .vertical; s.alignment = .center; return s }

  private func buildIdle(_ col: UIStackView) {
    let top = UIView(); top.heightAnchor.constraint(equalToConstant: 18).isActive = true
    col.addArrangedSubview(top)
    col.addArrangedSubview(centered(appIcon(44)))
    col.setCustomSpacing(14, after: col.arrangedSubviews.last!)
    let title = label("Not sure about this text?", 26, .heavy, ink, ls: -0.6); title.textAlignment = .center
    col.addArrangedSubview(title)
    col.setCustomSpacing(8, after: title)
    let steps = UIStackView(); steps.spacing = 10; steps.alignment = .center
    for (i, t) in ["Hold the text", "Copy", "Paste here"].enumerated() {
      if i > 0 { let c = UIImageView(image: UIImage(systemName: "chevron.right", withConfiguration: UIImage.SymbolConfiguration(pointSize: 11, weight: .semibold))); c.tintColor = UIColor(white: 0.62, alpha: 1); steps.addArrangedSubview(c) }
      steps.addArrangedSubview(label(t, 16, .medium, ink2))
    }
    col.addArrangedSubview(centered(steps))
    col.addArrangedSubview(spacer())
    let paste: UIControl
    if #available(iOS 16.0, *) {
      let c = UIPasteControl.Configuration(); c.displayMode = .labelOnly; c.baseBackgroundColor = green; c.baseForegroundColor = .white; c.cornerStyle = .capsule
      let pc = UIPasteControl(configuration: c); pc.target = self; paste = pc
    } else {
      paste = cap("Paste and check", bg: green, fg: .white, action: #selector(readBoard))
    }
    paste.heightAnchor.constraint(equalToConstant: 56).isActive = true
    // A soft halo round the button, as drawn.
    let halo = UIView(); halo.backgroundColor = greenTint; halo.layer.cornerRadius = 36
    paste.translatesAutoresizingMaskIntoConstraints = false; halo.addSubview(paste)
    NSLayoutConstraint.activate([paste.topAnchor.constraint(equalTo: halo.topAnchor, constant: 8), paste.bottomAnchor.constraint(equalTo: halo.bottomAnchor, constant: -8), paste.leadingAnchor.constraint(equalTo: halo.leadingAnchor, constant: 8), paste.trailingAnchor.constraint(equalTo: halo.trailingAnchor, constant: -8)])
    col.addArrangedSubview(halo)
    col.setCustomSpacing(6, after: halo)
    if #available(iOS 16.0, *) {
      let hint = label("Tap Paste, then Loop Me checks it", 13, .medium, meta); hint.textAlignment = .center
      col.addArrangedSubview(hint); col.setCustomSpacing(4, after: hint)
    }
    let lock = UIStackView(arrangedSubviews: [{ let i = UIImageView(image: UIImage(systemName: "lock", withConfiguration: UIImage.SymbolConfiguration(pointSize: 12, weight: .medium))); i.tintColor = meta; return i }(), label("Checked on this phone", 14, .medium, meta)])
    lock.spacing = 5; lock.alignment = .center
    col.addArrangedSubview(centered(lock))
  }

  private func buildReady(_ col: UIStackView) {
    col.addArrangedSubview(header(label("You copied this just now", 13.5, .medium, meta)))
    col.setCustomSpacing(12, after: col.arrangedSubviews.last!)
    col.addArrangedSubview(label("Check this message?", 26, .heavy, ink, ls: -0.5))
    col.setCustomSpacing(12, after: col.arrangedSubviews.last!)
    let card = UIView(); card.backgroundColor = .white; card.layer.cornerRadius = 16
    let st = UIStackView(arrangedSubviews: [label("Copied message", 13, .medium, meta), label(text, 16, .regular, ink, lines: 3)]); st.axis = .vertical; st.spacing = 3; st.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(st)
    NSLayoutConstraint.activate([st.topAnchor.constraint(equalTo: card.topAnchor, constant: 11), st.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14), st.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14), st.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -12)])
    col.addArrangedSubview(card)
    col.addArrangedSubview(spacer())
    let go = button("Check it", bg: green, fg: .white, icon: "arrow.right", action: #selector(checkTapped))
    go.configuration?.imagePlacement = .trailing
    let clear = button("", bg: bubble, fg: ink2, icon: "xmark", action: #selector(reset))
    clear.widthAnchor.constraint(equalToConstant: 54).isActive = true
    let row = UIStackView(arrangedSubviews: [go, clear]); row.spacing = 8
    col.addArrangedSubview(row)
  }

  private func buildChecking(_ col: UIStackView) {
    let stage = UIView(); stage.widthAnchor.constraint(equalToConstant: 56).isActive = true; stage.heightAnchor.constraint(equalToConstant: 56).isActive = true
    let track = CAShapeLayer(); let path = UIBezierPath(arcCenter: CGPoint(x: 28, y: 28), radius: 25, startAngle: -.pi / 2, endAngle: 1.5 * .pi, clockwise: true).cgPath
    track.path = path; track.strokeColor = UIColor(red: 0.875, green: 0.914, blue: 0.898, alpha: 1).cgColor; track.fillColor = nil; track.lineWidth = 3.5
    let ring = CAShapeLayer(); ring.path = path; ring.strokeColor = green.cgColor; ring.fillColor = nil; ring.lineWidth = 3.5; ring.lineCap = .round; ring.strokeEnd = 0
    stage.layer.addSublayer(track); stage.layer.addSublayer(ring)
    let fill = CABasicAnimation(keyPath: "strokeEnd"); fill.fromValue = 0; fill.toValue = 1; fill.duration = 2.5; fill.beginTime = CACurrentMediaTime() + 0.1; fill.timingFunction = CAMediaTimingFunction(controlPoints: 0.4, 0, 0.2, 1); fill.fillMode = .forwards; fill.isRemovedOnCompletion = false
    ring.add(fill, forKey: "fill")
    let icon = UIImageView(image: UIImage(named: "loopme-icon")); icon.backgroundColor = green; icon.layer.cornerRadius = 10; icon.clipsToBounds = true; icon.contentMode = .scaleAspectFill
    icon.frame = CGRect(x: 9, y: 9, width: 38, height: 38); stage.addSubview(icon)
    let breathe = CABasicAnimation(keyPath: "transform.scale"); breathe.fromValue = 1; breathe.toValue = 1.04; breathe.duration = 0.9; breathe.autoreverses = true; breathe.repeatCount = .infinity; breathe.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
    icon.layer.add(breathe, forKey: "breathe")
    let words = UIStackView(arrangedSubviews: [label("Checking this message", 20, .bold, ink), label("This takes a couple of seconds.", 15, .regular, ink2)]); words.axis = .vertical; words.spacing = 2
    let top = UIStackView(arrangedSubviews: [stage, words]); top.spacing = 14; top.alignment = .center
    col.addArrangedSubview(top)
    col.setCustomSpacing(14, after: top)
    let card = UIView(); card.backgroundColor = .white; card.layer.cornerRadius = 16; card.clipsToBounds = true
    let l = label(text, 15.5, .regular, ink, lines: 2); l.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(l)
    NSLayoutConstraint.activate([l.topAnchor.constraint(equalTo: card.topAnchor, constant: 11), l.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14), l.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14), l.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -12)])
    let band = UIView(); band.backgroundColor = green.withAlphaComponent(0.1); band.translatesAutoresizingMaskIntoConstraints = false
    let line = UIView(); line.backgroundColor = green; line.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(band); band.addSubview(line)
    NSLayoutConstraint.activate([band.leadingAnchor.constraint(equalTo: card.leadingAnchor), band.trailingAnchor.constraint(equalTo: card.trailingAnchor), band.heightAnchor.constraint(equalToConstant: 40), band.topAnchor.constraint(equalTo: card.topAnchor, constant: -40),
                                 line.leadingAnchor.constraint(equalTo: band.leadingAnchor), line.trailingAnchor.constraint(equalTo: band.trailingAnchor), line.bottomAnchor.constraint(equalTo: band.bottomAnchor), line.heightAnchor.constraint(equalToConstant: 2.5)])
    let sweep = CABasicAnimation(keyPath: "transform.translation.y"); sweep.fromValue = 0; sweep.toValue = 110; sweep.duration = 1.3; sweep.repeatCount = .infinity; sweep.timingFunction = CAMediaTimingFunction(controlPoints: 0.45, 0, 0.55, 1)
    band.layer.add(sweep, forKey: "sweep")
    col.addArrangedSubview(card)
    col.addArrangedSubview(spacer())
    let tiles = rowOf(["The words", "Number and links", "Scams we know"].enumerated().map { i, t in
      let tile = UIView(); tile.backgroundColor = .white; tile.layer.cornerRadius = 12
      let dot = UIView(); dot.widthAnchor.constraint(equalToConstant: 22).isActive = true; dot.heightAnchor.constraint(equalToConstant: 22).isActive = true
      let spin = UIActivityIndicatorView(style: .medium); spin.color = self.green; spin.startAnimating(); spin.translatesAutoresizingMaskIntoConstraints = false
      let check = UIView(); check.backgroundColor = self.green; check.layer.cornerRadius = 11; check.alpha = 0; check.translatesAutoresizingMaskIntoConstraints = false
      let ck = UIImageView(image: UIImage(systemName: "checkmark", withConfiguration: UIImage.SymbolConfiguration(pointSize: 11, weight: .bold))); ck.tintColor = .white; ck.translatesAutoresizingMaskIntoConstraints = false
      check.addSubview(ck); dot.addSubview(spin); dot.addSubview(check)
      NSLayoutConstraint.activate([spin.centerXAnchor.constraint(equalTo: dot.centerXAnchor), spin.centerYAnchor.constraint(equalTo: dot.centerYAnchor), check.topAnchor.constraint(equalTo: dot.topAnchor), check.bottomAnchor.constraint(equalTo: dot.bottomAnchor), check.leadingAnchor.constraint(equalTo: dot.leadingAnchor), check.trailingAnchor.constraint(equalTo: dot.trailingAnchor), ck.centerXAnchor.constraint(equalTo: check.centerXAnchor), ck.centerYAnchor.constraint(equalTo: check.centerYAnchor)])
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.6 + Double(i) * 0.7) {
        spin.stopAnimating(); check.transform = CGAffineTransform(scaleX: 0.5, y: 0.5)
        UIView.animate(withDuration: 0.3, delay: 0, usingSpringWithDamping: 0.6, initialSpringVelocity: 1) { check.alpha = 1; check.transform = .identity }
      }
      let l = self.label(t, 13.5, .medium, self.ink, lines: 2); l.textAlignment = .center
      let st = UIStackView(arrangedSubviews: [dot, l]); st.axis = .vertical; st.alignment = .center; st.spacing = 7; st.translatesAutoresizingMaskIntoConstraints = false
      tile.addSubview(st)
      NSLayoutConstraint.activate([st.topAnchor.constraint(equalTo: tile.topAnchor, constant: 11), st.leadingAnchor.constraint(equalTo: tile.leadingAnchor, constant: 6), st.trailingAnchor.constraint(equalTo: tile.trailingAnchor, constant: -6), st.bottomAnchor.constraint(equalTo: tile.bottomAnchor, constant: -10)])
      return tile
    })
    tiles.spacing = 6
    col.addArrangedSubview(tiles)
  }

  private func verdictTop(_ tag: String, dark: UIColor) -> UIStackView {
    let p = pill(tag, bg: UIColor.black.withAlphaComponent(0.16), fg: .white, radius: 14, height: 28, size: 14, weight: .semibold)
    p.setContentHuggingPriority(.required, for: .horizontal)
    let top = UIStackView(arrangedSubviews: [p, hstretch()]); top.alignment = .center
    return top
  }

  private func buildScam(_ col: UIStackView) {
    guard let v = verdict else { return }
    let top = verdictTop("Scam", dark: red)
    if let who = who {
      let a = avatar(26, onColor: true)
      let loop = UIStackView(arrangedSubviews: [a, label(sendFailed ? "Couldn’t reach " + who : asked ? who + " has been looped in" : "Telling " + who + "…", 14.5, .semibold, .white)]); loop.spacing = 7; loop.alignment = .center
      top.addArrangedSubview(loop)
    }
    col.addArrangedSubview(top)
    col.setCustomSpacing(16, after: top)
    col.addArrangedSubview(label("Stop. Don’t reply.", 34, .heavy, .white, ls: -1))
    col.setCustomSpacing(8, after: col.arrangedSubviews.last!)
    col.addArrangedSubview(label(v.reason, 17, .medium, .white, lines: 3))
    col.addArrangedSubview(spacer())
    col.addArrangedSubview(rowOf([cap("Why?", bg: .white, fg: redText, action: #selector(whyTapped)),
                                  sendFailed && who != nil ? cap("Try again", bg: UIColor.white.withAlphaComponent(0.22), fg: .white, action: #selector(tellTapped))
                                                           : cap("Done", bg: UIColor.white.withAlphaComponent(0.22), fg: .white, action: #selector(reset))]))
  }

  /// The quoted phrase and what it means, paired from the engine's matches and signals.
  private func whyRows(_ v: Verdict) -> [(String?, String)] {
    let sig = Array(v.signals.prefix(3))
    let m = Array(v.matches.prefix(3))
    return sig.enumerated().map { i, s in (i < m.count && sig.count == m.count ? "“" + m[i].prefix(1).uppercased() + m[i].dropFirst() + "”" : nil, s) }
  }

  private func buildWhy(_ col: UIStackView) {
    guard let v = verdict else { return }
    let tone: (UIColor, UIColor, UIColor, String) = v.level == .red ? (red, redText, UIColor(red: 0.98, green: 0.84, blue: 0.81, alpha: 1), "Scam")
      : v.level == .amber ? (amber, amberInk, UIColor(red: 0.96, green: 0.89, blue: 0.76, alpha: 1), "Be careful")
      : (green, greenDeep, UIColor(red: 0.84, green: 0.92, blue: 0.88, alpha: 1), "Looks okay")
    let back = UIButton(type: .system); back.setTitle(" Back", for: .normal); back.setImage(UIImage(systemName: "chevron.left", withConfiguration: UIImage.SymbolConfiguration(pointSize: 15, weight: .semibold)), for: .normal); back.tintColor = tone.1; back.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold); back.addTarget(self, action: #selector(backToVerdict), for: .touchUpInside)
    let tag = pill(tone.3, bg: tone.0, fg: .white, radius: 13, height: 26, size: 14, weight: .semibold)
    let top = UIStackView(arrangedSubviews: [back, hstretch(), label("Why", 18, .bold, ink), tag]); top.alignment = .center; top.spacing = 8
    col.addArrangedSubview(top)
    col.setCustomSpacing(8, after: top)
    let list = UIStackView(); list.axis = .vertical
    for (i, r) in whyRows(v).enumerated() {
      let line = UIView(); line.backgroundColor = UIColor(white: 0.88, alpha: 1); line.heightAnchor.constraint(equalToConstant: 0.5).isActive = true
      list.addArrangedSubview(line)
      let item = UIStackView(); item.axis = .vertical; item.alignment = .leading; item.spacing = 3; item.isLayoutMarginsRelativeArrangement = true; item.layoutMargins = UIEdgeInsets(top: 8, left: 0, bottom: 8, right: 0)
      if let q = r.0 { item.addArrangedSubview(pill(q, bg: tone.2, fg: ink, radius: 6, height: 26, size: 16, weight: .bold)) }
      item.addArrangedSubview(label(r.1, 15.5, .regular, ink2, lines: 2))
      list.addArrangedSubview(item)
      _ = i
    }
    col.addArrangedSubview(list)
    col.addArrangedSubview(spacer())
    var row: [UIView] = [cap("Read it to me", bg: bubble, fg: ink, icon: "speaker.wave.2.fill", action: #selector(speakTapped))]
    row.append(cap("Done", bg: tone.0, fg: .white, action: #selector(reset)))
    col.addArrangedSubview(rowOf(row))
  }

  private func buildCareful(_ col: UIStackView) {
    guard let v = verdict else { return }
    col.addArrangedSubview(verdictTop("Be careful", dark: amber)); col.setCustomSpacing(16, after: col.arrangedSubviews.last!)
    col.addArrangedSubview(label("Don’t reply yet.", 34, .heavy, .white, ls: -1))
    col.setCustomSpacing(8, after: col.arrangedSubviews.last!)
    col.addArrangedSubview(label(v.reason + " " + v.safeStep, 17, .medium, .white, lines: 4))
    col.addArrangedSubview(spacer())
    let first = who != nil ? cap("Ask " + who!, bg: .white, fg: amberInk, action: #selector(askTapped)) : cap("Done", bg: .white, fg: amberInk, action: #selector(reset))
    col.addArrangedSubview(rowOf([first, cap("Why?", bg: UIColor.white.withAlphaComponent(0.22), fg: .white, action: #selector(whyTapped))]))
  }

  private func buildSafe(_ col: UIStackView) {
    col.addArrangedSubview(verdictTop("Looks okay", dark: green)); col.setCustomSpacing(16, after: col.arrangedSubviews.last!)
    col.addArrangedSubview(label("Looks okay.", 34, .heavy, .white, ls: -1))
    col.setCustomSpacing(8, after: col.arrangedSubviews.last!)
    col.addArrangedSubview(label("Nothing here matches a scam we know. It doesn’t ask for money, a code or a link.", 17, .medium, .white, lines: 3))
    col.addArrangedSubview(spacer())
    let second = who != nil ? cap("Ask " + who!, bg: UIColor.white.withAlphaComponent(0.22), fg: .white, action: #selector(askTapped)) : cap("Why?", bg: UIColor.white.withAlphaComponent(0.22), fg: .white, action: #selector(whyTapped))
    col.addArrangedSubview(rowOf([cap("Done", bg: .white, fg: greenDeep, action: #selector(reset)), second]))
  }

  private func bubbleView(_ views: [UIView], bg: UIColor, mine: Bool) -> UIStackView {
    let b = UIView(); b.backgroundColor = bg; b.layer.cornerRadius = 18
    b.layer.maskedCorners = mine ? [.layerMinXMinYCorner, .layerMaxXMinYCorner, .layerMinXMaxYCorner] : [.layerMinXMinYCorner, .layerMaxXMinYCorner, .layerMaxXMaxYCorner]
    let st = UIStackView(arrangedSubviews: views); st.axis = .vertical; st.spacing = 3; st.translatesAutoresizingMaskIntoConstraints = false
    b.addSubview(st)
    NSLayoutConstraint.activate([st.topAnchor.constraint(equalTo: b.topAnchor, constant: 10), st.leadingAnchor.constraint(equalTo: b.leadingAnchor, constant: 14), st.trailingAnchor.constraint(equalTo: b.trailingAnchor, constant: -14), st.bottomAnchor.constraint(equalTo: b.bottomAnchor, constant: -11)])
    b.widthAnchor.constraint(lessThanOrEqualToConstant: 280).isActive = true
    let w = UIStackView(arrangedSubviews: mine ? [hstretch(), b] : [b, hstretch()]); w.alignment = .top
    return w
  }

  private func buildAsking(_ col: UIStackView) {
    let who = self.who ?? "them"
    let status: UIView
    if sendFailed {
      status = label("Not sent", 14, .semibold, redText)
    } else if asked {
      let s = UIStackView(arrangedSubviews: [{ let i = UIImageView(image: UIImage(systemName: "checkmark", withConfiguration: UIImage.SymbolConfiguration(pointSize: 12, weight: .bold))); i.tintColor = green; return i }(), label(reply != nil ? "Answered" : "Sent to their phone", 14, .medium, green)]); s.spacing = 5; s.alignment = .center; status = s
    } else {
      status = label("Sending…", 14, .medium, meta)
    }
    let top = UIStackView(arrangedSubviews: [avatar(32, onColor: false), label(who, 18, .bold, ink), hstretch(), status]); top.spacing = 10; top.alignment = .center
    col.addArrangedSubview(top); col.setCustomSpacing(14, after: top)
    let q = label("“" + String(text.prefix(120)) + (text.count > 120 ? "…”" : "”"), 14.5, .regular, UIColor(red: 0.89, green: 0.937, blue: 0.918, alpha: 1), lines: 2)
    let out = bubbleView([label("Is this real?", 16.5, .semibold, .white), q], bg: green, mine: true)
    col.addArrangedSubview(out); col.setCustomSpacing(8, after: out)
    if let r = reply {
      col.addArrangedSubview(bubbleView([label(r.text, 16.5, .regular, ink, lines: 4)], bg: bubble, mine: false))
    } else if sendFailed {
      col.addArrangedSubview(label("Check the internet and that iCloud is on, then try again.", 15, .regular, ink2, lines: 2))
    } else {
      let typing = UIView(); typing.backgroundColor = bubble; typing.layer.cornerRadius = 18; typing.heightAnchor.constraint(equalToConstant: 36).isActive = true; typing.widthAnchor.constraint(equalToConstant: 62).isActive = true
      let dots = UIStackView(); dots.spacing = 5; dots.translatesAutoresizingMaskIntoConstraints = false
      for i in 0..<3 { let d = UIView(); d.backgroundColor = meta; d.layer.cornerRadius = 4; d.widthAnchor.constraint(equalToConstant: 8).isActive = true; d.heightAnchor.constraint(equalToConstant: 8).isActive = true
        let a = CAKeyframeAnimation(keyPath: "transform.translation.y"); a.values = [0, -3, 0, 0]; a.keyTimes = [0, 0.3, 0.6, 1]; a.duration = 1.2; a.repeatCount = .infinity; a.beginTime = CACurrentMediaTime() + Double(i) * 0.2; d.layer.add(a, forKey: "t"); dots.addArrangedSubview(d) }
      typing.addSubview(dots)
      NSLayoutConstraint.activate([dots.centerXAnchor.constraint(equalTo: typing.centerXAnchor), dots.centerYAnchor.constraint(equalTo: typing.centerYAnchor)])
      col.addArrangedSubview(UIStackView(arrangedSubviews: [typing, hstretch()]))
    }
    col.addArrangedSubview(spacer())
    let first = sendFailed ? cap("Try again", bg: green, fg: .white, action: #selector(askTapped)) : cap("Done", bg: green, fg: .white, action: #selector(reset))
    col.addArrangedSubview(rowOf([first, cap("Call " + who, bg: greenTint, fg: green, icon: "phone.fill", action: #selector(callWho))]))
  }

  // Short labels for the reason chips, from the engine's tags.
  static func chipLabels(for v: Verdict) -> [String] {
    // Keyed by the engine's real tag names (src/engine/ScamDetector.ts, linkForensics.ts).
    let map: [String: String] = [
      "family-emergency": "Pretends to be family", "borrow-ask": "Asks to borrow money", "borrow-repay": "Asks for money", "money-ask": "Asks for money", "money-deadline": "Money, with a deadline",
      "giftcard": "Wants gift cards", "payment": "Wants money", "payment-demand": "Demands payment", "pay-or-lose": "Pay or lose something", "advance-fee": "Fee to get money", "deposit-hold": "Wants a deposit", "pet-deposit": "Wants a deposit", "dependant-fee": "Fee for a relative",
      "safe-account": "“Safe account” trick", "bank-alert": "Pretends to be a bank", "account-locked": "“Account locked”", "unusual-signin": "“Unusual sign-in”", "verify": "Wants you to “verify”", "detail-harvest": "Asks for your details", "otp-request": "Asks for a code",
      "secrecy": "Keep it secret", "urgency": "Rushing you", "service-cutoff": "Threatens a cutoff", "renewal-pressure": "Renewal pressure", "subscription": "Fake subscription",
      "url-mismatch": "Link isn’t what it says", "url-lookalike": "Lookalike link", "url-blocklisted": "Known scam link", "url-shortener": "Hidden link", "url-many": "Many links", "qr-bait": "QR code bait", "platform-hop": "Move to another app",
      "delivery-fee": "Fake delivery fee", "package-fee": "Fake delivery fee", "courier-fraud": "Courier trick", "toll": "Fake toll", "refund": "Fake refund", "gov-impersonation": "Pretends to be official", "digital-arrest": "Fake arrest threat", "fake-debt": "Fake debt",
      "tech-support": "Fake tech support", "remote-access": "Wants into your device", "callback": "Wants you to call back", "stay-on-line": "“Stay on the line”", "warranty": "Warranty bait", "claims-bait": "Claims bait", "doorstep": "Doorstep pitch",
      "prize": "Prize bait", "job-offer": "Job by text", "job-scam": "Too-easy job", "pay-bait": "Pay too good", "investment": "Investment pitch", "crypto": "Crypto pitch", "wallet-phrase": "Asks for wallet words", "romance": "Romance con", "wrong-number": "“Wrong number” opener",
      "overpayment": "Overpayment trick", "charity": "Fake charity", "sextortion": "Blackmail bluff", "recovery": "“Recover your money” con",
    ]
    var out: [String] = []
    for t in v.tags { if let l = map[t], !out.contains(l) { out.append(l) } }
    // No known tag: show the exact phrases that matched, never a cut-off sentence.
    if out.isEmpty { out = v.matches.prefix(2).map { m in "“" + String(m.prefix(28)) + (m.count > 28 ? "…”" : "”") } }
    // Two fit on every width; a third wraps letter by letter.
    return Array(out.prefix(2))
  }

  // MARK: - Actions
  @objc private func reset() { voice.stopSpeaking(at: .immediate); stopPolling(); text = ""; verdict = nil; asked = false; sendFailed = false; reply = nil; render(.idle) }
  @objc private func readBoard() { if let t = UIPasteboard.general.string?.trimmingCharacters(in: .whitespacesAndNewlines), !t.isEmpty { text = t; check() } }
  @objc private func checkTapped() { check() }
  @objc private func whyTapped() { render(.why) }
  @objc private func backToVerdict() {
    guard let v = verdict else { return render(.idle) }
    render(v.level == .red ? .scam : v.level == .amber ? .careful : .safe)
  }
  /// Dial the person in the loop. The number comes from the app (Family), saved in the app group.
  @objc private func callWho() {
    let digits = (SharedStore.defaults.string(forKey: "family.caretakerPhone") ?? "").filter { $0.isNumber || $0 == "+" }
    if digits.count >= 7, let u = URL(string: "tel:" + digits) {
      extensionContext?.open(u) { ok in if !ok { DispatchQueue.main.async { self.open(host: "go", query: [URLQueryItem(name: "screen", value: "family")]) } } }
    } else {
      // No number saved for them yet: Family in the app is where it gets added.
      open(host: "go", query: [URLQueryItem(name: "screen", value: "family")])
    }
  }
  @objc private func speakTapped() {
    guard let v = verdict else { return }
    if voice.isSpeaking { voice.stopSpeaking(at: .immediate); return }
    let head = v.level == .red ? "Stop. Don't reply. " : v.level == .amber ? "Don't reply yet. " : "Looks okay. "
    let u = AVSpeechUtterance(string: head + v.signals.prefix(3).joined(separator: " ")); u.rate = 0.46
    try? AVAudioSession.sharedInstance().setCategory(.playback, options: .duckOthers); try? AVAudioSession.sharedInstance().setActive(true)
    voice.speak(u)
  }
  @objc private func tellTapped() { asked = false; publish(asked: false); render(.scam, animated: false) }
  @objc private func askTapped() { asked = false; publish(asked: true); render(.asking) }

  /// Send this check to the person in the loop. `asked` makes it a question
  /// that waits for their answer; a scam is sent as a heads-up.
  private func publish(asked isQuestion: Bool) {
    guard let v = verdict, !asked else { return }
    asked = true; sendFailed = false
    let id = recordId, excerpt = Redact.privateDetails(text).prefix(180).description
    Task {
      let ok = await ExtensionCloud.publish(id: id, level: v.level.rawValue, excerpt: excerpt, reason: v.reason, at: Date().timeIntervalSince1970 * 1000)
      await MainActor.run {
        if ok { SharedStore.markPublished([id]) }
        SharedStore.logVerdict(self.entry(v, asked: isQuestion, published: ok))
        if ok { UINotificationFeedbackGenerator().notificationOccurred(.success) } else { self.asked = false; self.sendFailed = true }
        if ok && isQuestion { self.startPolling() }
        if self.state == .asking || self.state == .scam { self.render(self.state, animated: false) }
      }
    }
  }

  // Wait for the answer: check every 4 seconds while the drawer is open, for up to 20 minutes.
  private func startPolling() {
    stopPolling(); pollStarted = Date()
    poll = Timer.scheduledTimer(withTimeInterval: 4, repeats: true) { [weak self] _ in
      guard let self = self else { return }
      if Date().timeIntervalSince(self.pollStarted) > 1200 { self.stopPolling(); return }
      let id = self.recordId
      Task {
        guard let r = await ExtensionCloud.reply(for: id) else { return }
        await MainActor.run {
          guard self.recordId == id, self.reply == nil else { return }
          self.reply = r; self.stopPolling()
          UINotificationFeedbackGenerator().notificationOccurred(.success)
          if self.state == .asking { self.render(.asking) }
        }
      }
    }
  }
  private func stopPolling() { poll?.invalidate(); poll = nil }
  @objc private func openAppPhoto() { open(host: "check", query: [URLQueryItem(name: "photo", value: "1")]) }
  @objc private func openApp() { open(host: "check", query: text.isEmpty ? [] : [URLQueryItem(name: "text", value: String(text.prefix(2000)))]) }
  private func open(host: String, query: [URLQueryItem]) {
    var c = URLComponents(); c.scheme = "loopmein"; c.host = host; if !query.isEmpty { c.queryItems = query }
    if let u = c.url { extensionContext?.open(u, completionHandler: nil) }
  }
}
