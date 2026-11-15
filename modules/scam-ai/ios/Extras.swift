import Foundation
import UIKit
import Photos
import Speech
import AVFoundation
import CoreImage
#if canImport(ActivityKit)
import ActivityKit
#endif
#if canImport(IdentityLookup)
import IdentityLookup
#endif
#if canImport(WatchConnectivity)
import WatchConnectivity
#endif

// MARK: - Listen mode: continuous on-device speech, delivered as it is heard.

final class ContinuousListener: NSObject, @unchecked Sendable {
  static let shared = ContinuousListener()
  // Speech stays on the phone, so the recognizer must support on-device
  // recognition. The phone's own language first; English if that language
  // cannot run on device; nil if neither can, and start() says why.
  private let recognizer: SFSpeechRecognizer? = {
    let candidates = [SFSpeechRecognizer(locale: Locale.current), SFSpeechRecognizer(locale: Locale(identifier: "en-US"))]
    return candidates.compactMap { $0 }.first { $0.supportsOnDeviceRecognition } ?? candidates.compactMap { $0 }.first
  }()
  private let audioEngine = AVAudioEngine()
  private var task: SFSpeechRecognitionTask?
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var restartTimer: Timer?
  var onText: ((String, Bool) -> Void)?
  /// A plain sentence for the person when listening cannot start or stops on its own.
  var onError: ((String) -> Void)?
  private(set) var running = false
  private(set) var lastError = ""

  /// Returns false when permission was refused or the phone cannot listen; `lastError` says why.
  func start() async -> Bool {
    lastError = ""
    let speechStatus = await withCheckedContinuation { (c: CheckedContinuation<SFSpeechRecognizerAuthorizationStatus, Never>) in
      SFSpeechRecognizer.requestAuthorization { c.resume(returning: $0) }
    }
    guard speechStatus == .authorized else { lastError = "Speech recognition is turned off for Loop Me. Turn it on in Settings, Privacy & Security, Speech Recognition."; return false }
    let micOK = await withCheckedContinuation { (c: CheckedContinuation<Bool, Never>) in
      AVAudioSession.sharedInstance().requestRecordPermission { c.resume(returning: $0) }
    }
    guard micOK else { lastError = "The microphone is turned off for Loop Me. Turn it on in Settings, Privacy & Security, Microphone."; return false }
    guard let recognizer = recognizer else { lastError = "This phone cannot turn speech into text."; return false }
    guard recognizer.supportsOnDeviceRecognition else { lastError = "This phone cannot turn speech into text without sending it away, so Say it stays off. Type the message instead."; return false }
    guard recognizer.isAvailable else { lastError = "Speech recognition is busy or still downloading its language. Try again in a minute."; return false }
    let ok = await MainActor.run { beginSegment() }
    if !ok && lastError.isEmpty { lastError = "The microphone could not start. Close other apps using it and try again." }
    return ok
  }

  // One recognition request runs at most a minute; a new one starts in its
  // place so a long call keeps flowing. The caller joins the segments.
  @MainActor private func beginSegment() -> Bool {
    SpeechListener.shared.stop()
    task?.cancel(); task = nil
    audioEngine.inputNode.removeTap(onBus: 0)
    let req = SFSpeechAudioBufferRecognitionRequest()
    req.shouldReportPartialResults = true
    req.requiresOnDeviceRecognition = true   // speech never leaves the phone
    req.taskHint = .dictation
    request = req
    do {
      let session = AVAudioSession.sharedInstance()
      // playAndRecord, not record: record alone is refused on some phones
      // while another app holds audio, and it silences the earpiece route.
      try session.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .defaultToSpeaker, .allowBluetooth])
      try session.setActive(true, options: .notifyOthersOnDeactivation)
      let input = audioEngine.inputNode
      var format = input.outputFormat(forBus: 0)
      // Right after the microphone permission is granted the input route can
      // take a moment to come up and reports 0 Hz. Give it a few tries.
      var tries = 0
      while (format.sampleRate == 0 || format.channelCount == 0) && tries < 5 {
        tries += 1
        try? session.setActive(false)
        Thread.sleep(forTimeInterval: 0.2)
        try session.setActive(true, options: .notifyOthersOnDeactivation)
        format = audioEngine.inputNode.outputFormat(forBus: 0)
      }
      guard format.sampleRate > 0, format.channelCount > 0 else {
        lastError = "No microphone input is available right now. If headphones or a car are connected, disconnect them and try again."
        return false
      }
      input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in self?.request?.append(buffer) }
      audioEngine.prepare()
      try audioEngine.start()
    } catch {
      lastError = "The microphone could not start: " + error.localizedDescription
      return false
    }
    running = true
    task = recognizer?.recognitionTask(with: req) { [weak self] result, error in
      DispatchQueue.main.async {
        guard let self = self, self.running else { return }
        if let r = result { self.onText?(r.bestTranscription.formattedString, r.isFinal) }
        if let e = error as NSError? {
          // Silence and the one-minute limit are normal: start the next
          // segment. Anything else used to restart forever with a blank
          // sheet; now it stops and says so.
          let benign = e.domain == "kAFAssistantErrorDomain" && [203, 216, 1110, 1107].contains(e.code)
          if benign || (result?.isFinal ?? false) { _ = self.beginSegment(); return }
          self.stop()
          self.lastError = "Listening stopped: " + e.localizedDescription
          self.onError?(self.lastError)
          return
        }
        if result?.isFinal ?? false { _ = self.beginSegment() }
      }
    }
    restartTimer?.invalidate()
    restartTimer = Timer.scheduledTimer(withTimeInterval: 55, repeats: false) { [weak self] _ in
      guard let self = self, self.running else { return }
      self.request?.endAudio()
    }
    return true
  }

  func stop() {
    running = false
    restartTimer?.invalidate(); restartTimer = nil
    request?.endAudio(); request = nil
    task?.cancel(); task = nil
    audioEngine.inputNode.removeTap(onBus: 0)
    if audioEngine.isRunning { audioEngine.stop() }
    AudioSession.activatePlayback()
  }
}

// MARK: - The screenshot they just took.

enum Screenshots {
  /// The newest screenshot taken after `sinceMs`, exported to a temp JPEG.
  /// Asks for photo access the first time; returns nil when refused.
  static func latest(sinceMs: Double) async -> [String: Any]? {
    // Never prompts. Access is asked for by the screenshot picker; from then
    // on the watcher can see what was just taken.
    let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    guard status == .authorized || status == .limited else { return nil }
    let opts = PHFetchOptions()
    opts.predicate = NSPredicate(format: "(mediaSubtype & %d) != 0 AND creationDate > %@", PHAssetMediaSubtype.photoScreenshot.rawValue, Date(timeIntervalSince1970: sinceMs / 1000) as NSDate)
    opts.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
    opts.fetchLimit = 1
    let found = PHAsset.fetchAssets(with: .image, options: opts)
    guard let asset = found.firstObject else { return nil }
    let at = (asset.creationDate ?? Date()).timeIntervalSince1970 * 1000
    let data: Data? = await withCheckedContinuation { cont in
      let o = PHImageRequestOptions()
      o.isNetworkAccessAllowed = true
      o.deliveryMode = .highQualityFormat
      PHImageManager.default().requestImageDataAndOrientation(for: asset, options: o) { d, _, _, _ in cont.resume(returning: d) }
    }
    guard let d = data, let img = UIImage(data: d), let jpg = img.jpegData(compressionQuality: 0.9) else { return nil }
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("shot-\(Int(at)).jpg")
    try? jpg.write(to: url)
    return ["uri": url.absoluteString, "at": at, "id": asset.localIdentifier]
  }
}

// MARK: - QR code for the invite, drawn on the phone.

enum QR {
  static func png(_ text: String, size: CGFloat = 640) -> String? {
    guard let f = CIFilter(name: "CIQRCodeGenerator") else { return nil }
    f.setValue(text.data(using: .utf8), forKey: "inputMessage")
    f.setValue("M", forKey: "inputCorrectionLevel")
    guard let out = f.outputImage else { return nil }
    let scale = size / out.extent.width
    let scaled = out.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let ctx = CIContext()
    guard let cg = ctx.createCGImage(scaled, from: scaled.extent) else { return nil }
    return UIImage(cgImage: cg).pngData()?.base64EncodedString()
  }
}

// MARK: - Live Activity during "call and read together".

enum CallActivity {
  static func start(name: String, excerpt: String, level: String, advice: String) -> Bool {
    #if canImport(ActivityKit)
    if #available(iOS 16.2, *) {
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }
      end()
      let attrs = CallActivityAttributes(personName: name)
      let state = CallActivityAttributes.ContentState(excerpt: excerpt, level: level, advice: advice)
      do {
        _ = try Activity.request(attributes: attrs, content: .init(state: state, staleDate: Date().addingTimeInterval(1800)), pushType: nil)
        return true
      } catch { return false }
    }
    #endif
    return false
  }

  static func end() {
    #if canImport(ActivityKit)
    if #available(iOS 16.2, *) {
      for a in Activity<CallActivityAttributes>.activities {
        Task { await a.end(nil, dismissalPolicy: .immediate) }
      }
    }
    #endif
  }
}

// MARK: - Live Caller ID Lookup (iOS 18): is our lookup switched on?

enum CallerID {
  static let extensionId = "com.loopmescamsafety.app.callerid"

  /// "enabled" | "disabled" | "unavailable"
  static func status() async -> String {
    #if canImport(IdentityLookup)
    if #available(iOS 18.0, *) {
      do {
        let s = try await LiveCallerIDLookupManager.shared.status(forExtensionWithIdentifier: extensionId)
        switch s {
        case .enabled: return "enabled"
        case .disabled: return "disabled"
        default: return "unavailable"
        }
      } catch { return "unavailable" }
    }
    #endif
    return "unavailable"
  }

  static func openSettings() async -> Bool {
    #if canImport(IdentityLookup)
    if #available(iOS 18.0, *) {
      do { try await LiveCallerIDLookupManager.shared.openSettings(); return true } catch { return false }
    }
    #endif
    return false
  }

  static func refresh() async {
    #if canImport(IdentityLookup)
    if #available(iOS 18.0, *) {
      try? await LiveCallerIDLookupManager.shared.refreshPIRParameters(forExtensionWithIdentifier: extensionId)
    }
    #endif
  }
}

// MARK: - Apple Watch: the latest alerts and the number to call.

final class WatchBridge: NSObject, WCSessionDelegate {
  static let shared = WatchBridge()
  private override init() {
    super.init()
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }
  func activate() {}

  /// Replaces what the watch shows. Small and whole, so a watch that was off
  /// catches up in one go.
  func push(_ payload: [String: Any]) {
    guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return }
    try? WCSession.default.updateApplicationContext(payload)
    if WCSession.default.isReachable { WCSession.default.sendMessage(payload, replyHandler: nil, errorHandler: nil) }
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) { session.activate() }
}


