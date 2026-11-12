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
  static let model = CoreModel.named("ScamText", threshold: 0.8)

  private enum State { case idle, ready, checking, scam, why, careful, safe, asking }
  private var state: State = .idle
  private var text = ""
  private var verdict: Verdict?
  private var recordId = ""
  private var asked = false
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
      DispatchQueue.main.async { self?.text = String(s); self?.render(.ready) }
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
          if v.level == .red { UINotificationFeedbackGenerator().notificationOccurred(.error) }
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
  private func buildIdle(_ col: UIStackView) {
    let lock = UIStackView(arrangedSubviews: [{ let i = UIImageView(image: UIImage(systemName: "lock.fill")); i.tintColor = meta; i.widthAnchor.constraint(equalToConstant: 13).isActive = true; i.contentMode = .scaleAspectFit; return i }(), label("Stays on this phone", 13.5, .medium, meta)])
    lock.spacing = 5; lock.alignment = .center
    col.addArrangedSubview(header(lock))
    col.setCustomSpacing(12, after: col.arrangedSubviews.last!)
    col.addArrangedSubview(label("Not sure about a message?\nCopy it, then tap Paste.", 26, .heavy, ink, ls: -0.5))
    col.setCustomSpacing(16, after: col.arrangedSubviews.last!)
    let steps = rowOf(["Press and hold the text", "Tap Copy", "Tap Paste below"].enumerated().map { i, t in
      let card = UIView(); card.backgroundColor = .white; card.layer.cornerRadius = 12
      let n = label("\(i + 1)", 13, .bold, green); let l = label(t, 14, .medium, ink2)
      let st = UIStackView(arrangedSubviews: [n, l]); st.axis = .vertical; st.spacing = 3; st.translatesAutoresizingMaskIntoConstraints = false
      card.addSubview(st)
      NSLayoutConstraint.activate([st.topAnchor.constraint(equalTo: card.topAnchor, constant: 9), st.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 10), st.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -10), st.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -10)])
      return card
    })
    steps.spacing = 6
    col.addArrangedSubview(steps)
    col.addArrangedSubview(spacer())
    let paste: UIControl
    if #available(iOS 16.0, *) {
      let c = UIPasteControl.Configuration(); c.displayMode = .iconAndLabel; c.baseBackgroundColor = green; c.baseForegroundColor = .white; c.cornerStyle = .fixed
      let pc = UIPasteControl(configuration: c); pc.target = self; pc.layer.cornerRadius = 14; pc.clipsToBounds = true; paste = pc
    } else {
      paste = button("Paste", bg: green, fg: .white, icon: "doc.on.clipboard", action: #selector(readBoard))
    }
    paste.heightAnchor.constraint(equalToConstant: 54).isActive = true
    let img = button("", bg: greenTint, fg: green, icon: "photo", action: #selector(openAppPhoto))
    img.widthAnchor.constraint(equalToConstant: 54).isActive = true
    let row = UIStackView(arrangedSubviews: [paste, img]); row.spacing = 8
    col.addArrangedSubview(row)
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

  private func buildScam(_ col: UIStackView) {
    guard let v = verdict else { return }
    let scamPill = pill("Scam", bg: UIColor.black.withAlphaComponent(0.18), fg: .white)
    scamPill.setContentHuggingPriority(.required, for: .horizontal)
    let top = UIStackView(arrangedSubviews: [scamPill])
    top.alignment = .center
    if who == nil { let sp = UIView(); sp.setContentHuggingPriority(.defaultLow, for: .horizontal); top.addArrangedSubview(sp) }
    if let who = who {
      let sp = UIView(); sp.setContentHuggingPriority(.defaultLow, for: .horizontal); top.addArrangedSubview(sp)
      let a = avatar(24, onColor: true)
      let ring = CABasicAnimation(keyPath: "shadowOpacity"); a.layer.shadowColor = UIColor.white.cgColor; a.layer.shadowRadius = 6; a.layer.shadowOffset = .zero
      ring.fromValue = 0.6; ring.toValue = 0; ring.duration = 1.8; ring.repeatCount = .infinity; a.layer.add(ring, forKey: "ring")
      let loop = UIStackView(arrangedSubviews: [a, label(asked ? who + " has been looped in" : "Tell " + who + " below", 14, .semibold, .white)]); loop.spacing = 7; loop.alignment = .center
      top.addArrangedSubview(loop)
    }
    col.addArrangedSubview(top)
    col.setCustomSpacing(14, after: top)
    col.addArrangedSubview(label("Stop. Don’t reply.", 34, .heavy, .white, ls: -1))
    col.setCustomSpacing(8, after: col.arrangedSubviews.last!)
    col.addArrangedSubview(label(v.reason, 17, .medium, .white, lines: 2))
    col.setCustomSpacing(12, after: col.arrangedSubviews.last!)
    let chips = UIStackView(arrangedSubviews: MessagesViewController.chipLabels(for: v).map { pill($0, bg: UIColor.white.withAlphaComponent(0.2), fg: .white, height: 30, weight: .semibold) })
    chips.spacing = 6; chips.alignment = .leading
    let chipSpacer = UIView(); chipSpacer.setContentHuggingPriority(.defaultLow, for: .horizontal); chips.addArrangedSubview(chipSpacer)
    col.addArrangedSubview(chips)
    col.addArrangedSubview(spacer())
    let first = who != nil && !asked ? button("Tell " + who!, bg: .white, fg: red, action: #selector(tellTapped)) : button("See why", bg: .white, fg: red, action: #selector(whyTapped))
    let second = who != nil && !asked ? button("See why", bg: UIColor.white.withAlphaComponent(0.2), fg: .white, action: #selector(whyTapped)) : button("Done", bg: UIColor.white.withAlphaComponent(0.2), fg: .white, action: #selector(reset))
    col.addArrangedSubview(rowOf([first, second]))
  }

  private func buildWhy(_ col: UIStackView) {
    guard let v = verdict else { return }
    let back = UIButton(type: .system); back.setTitle("Back", for: .normal); back.setImage(UIImage(systemName: "chevron.left", withConfiguration: UIImage.SymbolConfiguration(pointSize: 14, weight: .semibold)), for: .normal); back.tintColor = redText; back.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold); back.addTarget(self, action: #selector(backToScam), for: .touchUpInside)
    let top = UIStackView(arrangedSubviews: [back, { let s = UIView(); s.setContentHuggingPriority(.defaultLow, for: .horizontal); return s }(), pill("Scam", bg: red, fg: .white, radius: 8, height: 26, size: 13)]); top.alignment = .center
    col.addArrangedSubview(top)
    col.setCustomSpacing(4, after: top)
    col.addArrangedSubview(label("Why it’s a scam", 22, .bold, redInk))
    col.setCustomSpacing(10, after: col.arrangedSubviews.last!)
    let list = UIStackView(arrangedSubviews: v.signals.prefix(3).enumerated().map { i, s in
      let n = UIView(); n.backgroundColor = self.red; n.layer.cornerRadius = 11; n.widthAnchor.constraint(equalToConstant: 22).isActive = true; n.heightAnchor.constraint(equalToConstant: 22).isActive = true
      let nl = self.label("\(i + 1)", 12.5, .bold, .white); nl.translatesAutoresizingMaskIntoConstraints = false; n.addSubview(nl)
      NSLayoutConstraint.activate([nl.centerXAnchor.constraint(equalTo: n.centerXAnchor), nl.centerYAnchor.constraint(equalTo: n.centerYAnchor)])
      let r = UIStackView(arrangedSubviews: [n, self.label(s, 15.5, .regular, self.ink2, lines: 2)]); r.spacing = 10; r.alignment = .top; return r
    })
    list.axis = .vertical; list.spacing = 9
    col.addArrangedSubview(list)
    col.addArrangedSubview(spacer())
    col.addArrangedSubview(rowOf([button("Read it to me", bg: .white, fg: redText, icon: "speaker.wave.2.fill", action: #selector(speakTapped)), button("Block in Loop Me", bg: red, fg: .white, action: #selector(openApp))]))
  }

  private func buildCareful(_ col: UIStackView) {
    guard let v = verdict else { return }
    let top = UIStackView(arrangedSubviews: [pill("Be careful", bg: UIColor.black.withAlphaComponent(0.16), fg: .white)]); top.alignment = .leading
    col.addArrangedSubview(top); col.setCustomSpacing(14, after: top)
    col.addArrangedSubview(label("Don’t reply to it.", 34, .heavy, .white, ls: -1))
    col.setCustomSpacing(10, after: col.arrangedSubviews.last!)
    col.addArrangedSubview(label(v.reason + " " + v.safeStep, 17, .medium, .white, lines: 3))
    col.addArrangedSubview(spacer())
    let first = button("Call the number on your card", bg: .white, fg: amberInk, icon: "phone.fill", action: #selector(dial))
    let second = who != nil ? button("Ask " + who!, bg: UIColor.white.withAlphaComponent(0.2), fg: .white, action: #selector(askTapped)) : button("Done", bg: UIColor.white.withAlphaComponent(0.2), fg: .white, action: #selector(reset))
    col.addArrangedSubview(rowOf([first, second]))
  }

  private func buildSafe(_ col: UIStackView) {
    let top = UIStackView(arrangedSubviews: [pill("Looks okay", bg: UIColor.black.withAlphaComponent(0.16), fg: .white)]); top.alignment = .leading
    col.addArrangedSubview(top); col.setCustomSpacing(14, after: top)
    col.addArrangedSubview(label("Looks okay.", 34, .heavy, .white, ls: -1))
    if let r = verdict?.reason, !r.isEmpty {
      col.setCustomSpacing(10, after: col.arrangedSubviews.last!)
      col.addArrangedSubview(label(r, 17, .medium, .white, lines: 3))
    }
    col.addArrangedSubview(spacer())
    let second = who != nil ? button("Ask " + who! + " anyway", bg: UIColor.white.withAlphaComponent(0.2), fg: .white, action: #selector(askTapped)) : button("See it in Loop Me", bg: UIColor.white.withAlphaComponent(0.2), fg: .white, action: #selector(openApp))
    col.addArrangedSubview(rowOf([button("Done", bg: .white, fg: greenDeep, action: #selector(reset)), second]))
  }

  private func buildAsking(_ col: UIStackView) {
    let who = self.who ?? "them"
    let top = UIStackView(arrangedSubviews: [avatar(32, onColor: false), label(who, 17, .bold, ink), { let s = UIView(); s.setContentHuggingPriority(.defaultLow, for: .horizontal); return s }(), label(asked ? "Sent to their phone" : "Sending", 13.5, .medium, meta)]); top.spacing = 10; top.alignment = .center
    col.addArrangedSubview(top); col.setCustomSpacing(14, after: top)
    let out = UIView(); out.backgroundColor = green; out.layer.cornerRadius = 18; out.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner, .layerMinXMaxYCorner]
    let st = UIStackView(arrangedSubviews: [label("Is this real?", 16, .semibold, .white), label("“" + String(text.prefix(120)) + (text.count > 120 ? "…”" : "”"), 14, .regular, UIColor(red: 0.89, green: 0.937, blue: 0.918, alpha: 1), lines: 2)]); st.axis = .vertical; st.spacing = 3; st.translatesAutoresizingMaskIntoConstraints = false
    out.addSubview(st)
    NSLayoutConstraint.activate([st.topAnchor.constraint(equalTo: out.topAnchor, constant: 9), st.leadingAnchor.constraint(equalTo: out.leadingAnchor, constant: 13), st.trailingAnchor.constraint(equalTo: out.trailingAnchor, constant: -13), st.bottomAnchor.constraint(equalTo: out.bottomAnchor, constant: -10)])
    let wrap = UIStackView(arrangedSubviews: [{ let s = UIView(); s.setContentHuggingPriority(.defaultLow, for: .horizontal); return s }(), out]); wrap.alignment = .top
    out.widthAnchor.constraint(lessThanOrEqualToConstant: 270).isActive = true
    col.addArrangedSubview(wrap); col.setCustomSpacing(6, after: wrap)
    let typing = UIView(); typing.backgroundColor = bubble; typing.layer.cornerRadius = 18; typing.heightAnchor.constraint(equalToConstant: 36).isActive = true; typing.widthAnchor.constraint(equalToConstant: 62).isActive = true
    let dots = UIStackView(); dots.spacing = 5; dots.translatesAutoresizingMaskIntoConstraints = false
    for i in 0..<3 { let d = UIView(); d.backgroundColor = meta; d.layer.cornerRadius = 4; d.widthAnchor.constraint(equalToConstant: 8).isActive = true; d.heightAnchor.constraint(equalToConstant: 8).isActive = true
      let a = CAKeyframeAnimation(keyPath: "transform.translation.y"); a.values = [0, -3, 0, 0]; a.keyTimes = [0, 0.3, 0.6, 1]; a.duration = 1.2; a.repeatCount = .infinity; a.beginTime = CACurrentMediaTime() + Double(i) * 0.2; d.layer.add(a, forKey: "t"); dots.addArrangedSubview(d) }
    typing.addSubview(dots)
    NSLayoutConstraint.activate([dots.centerXAnchor.constraint(equalTo: typing.centerXAnchor), dots.centerYAnchor.constraint(equalTo: typing.centerYAnchor)])
    let tw = UIStackView(arrangedSubviews: [typing, { let s = UIView(); s.setContentHuggingPriority(.defaultLow, for: .horizontal); return s }()])
    col.addArrangedSubview(tw)
    col.addArrangedSubview(spacer())
    col.addArrangedSubview(rowOf([button("Done", bg: green, fg: .white, action: #selector(reset)), button("Call " + who, bg: greenTint, fg: green, icon: "phone.fill", action: #selector(callWho))]))
  }

  // Short labels for the reason chips, from the engine's tags.
  static func chipLabels(for v: Verdict) -> [String] {
    let map: [String: String] = [
      "family-emergency": "Pretends to be family", "giftcard": "Wants gift cards", "payment": "Wants money", "safe-account": "“Safe account” trick",
      "otp": "Asks for a code", "code": "Asks for a code", "secrecy": "Keep it secret", "urgency": "Rushing you", "link": "Has a link", "shortlink": "Hidden link",
      "parcel": "Fake delivery fee", "delivery": "Fake delivery fee", "bank": "Pretends to be a bank", "government": "Pretends to be official", "tech-support": "Fake tech support",
      "prize": "Prize bait", "lottery": "Prize bait", "job-scam": "Too-easy job", "romance": "Romance con", "crypto": "Crypto pitch", "money-ask": "Asks for money", "fake-debt": "Fake debt", "overpayment": "Overpayment trick", "charity": "Fake charity",
    ]
    var out: [String] = []
    for t in v.tags { if let l = map[t], !out.contains(l) { out.append(l) } }
    if out.isEmpty { out = v.signals.prefix(2).map { s in String(s.split(separator: " ").prefix(3).joined(separator: " ")) } }
    return Array(out.prefix(3))
  }

  // MARK: - Actions
  @objc private func reset() { voice.stopSpeaking(at: .immediate); text = ""; verdict = nil; asked = false; render(.idle) }
  @objc private func readBoard() { if let t = UIPasteboard.general.string?.trimmingCharacters(in: .whitespacesAndNewlines), !t.isEmpty { text = t; render(.ready) } }
  @objc private func checkTapped() { check() }
  @objc private func whyTapped() { render(.why) }
  @objc private func backToScam() { render(.scam) }
  @objc private func dial() { if let u = URL(string: "tel:") { extensionContext?.open(u, completionHandler: nil) } }
  @objc private func callWho() {
    let digits = SharedStore.defaults.string(forKey: "family.caretakerPhone") ?? ""
    if !digits.isEmpty, let u = URL(string: "tel:" + digits) { extensionContext?.open(u, completionHandler: nil) } else { openApp() }
  }
  @objc private func speakTapped() {
    guard let v = verdict else { return }
    if voice.isSpeaking { voice.stopSpeaking(at: .immediate); return }
    let u = AVSpeechUtterance(string: "Stop. Don't reply. " + v.signals.prefix(3).joined(separator: " ")); u.rate = 0.46
    try? AVAudioSession.sharedInstance().setCategory(.playback, options: .duckOthers); try? AVAudioSession.sharedInstance().setActive(true)
    voice.speak(u)
  }
  @objc private func tellTapped() { publish(); render(.scam) }
  @objc private func askTapped() { publish(); render(.asking) }
  private func publish() {
    guard let v = verdict, !asked else { return }
    asked = true
    let id = recordId, excerpt = Redact.privateDetails(text).prefix(180).description
    Task {
      let ok = await ExtensionCloud.publish(id: id, level: v.level.rawValue, excerpt: excerpt, reason: v.reason, at: Date().timeIntervalSince1970 * 1000)
      await MainActor.run {
        SharedStore.markPublished([id]); SharedStore.logVerdict(self.entry(v, asked: true, published: ok))
        if ok { UINotificationFeedbackGenerator().notificationOccurred(.success) }
        if self.state == .asking { self.render(.asking, animated: false) }
      }
    }
  }
  @objc private func openAppPhoto() { open(host: "check", query: [URLQueryItem(name: "photo", value: "1")]) }
  @objc private func openApp() { open(host: "check", query: text.isEmpty ? [] : [URLQueryItem(name: "text", value: String(text.prefix(2000)))]) }
  private func open(host: String, query: [URLQueryItem]) {
    var c = URLComponents(); c.scheme = "loopmein"; c.host = host; if !query.isEmpty { c.queryItems = query }
    if let u = c.url { extensionContext?.open(u, completionHandler: nil) }
  }
}
