import AppIntents
import UIKit

// "Hey Siri, check this with Loop Me." Appears in Siri and the Shortcuts app
// on its own, with no setup: iOS registers it when the app is installed. It
// reads what was last copied and opens the app on the answer.
@available(iOS 16.0, *)
struct CheckCopiedIntent: AppIntent {
  static var title: LocalizedStringResource = "Check what I copied"
  static var description = IntentDescription("Checks the last message you copied for scams, on this phone.")
  static var openAppWhenRun = true

  @MainActor
  func perform() async throws -> some IntentResult {
    let text = UIPasteboard.general.string?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    var comps = URLComponents()
    comps.scheme = "loopmein"
    comps.host = text.isEmpty ? "home" : "check"
    if !text.isEmpty { comps.queryItems = [URLQueryItem(name: "text", value: String(text.prefix(2000)))] }
    if let url = comps.url { await UIApplication.shared.open(url) }
    return .result()
  }
}

@available(iOS 16.0, *)
struct LoopMeShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: CheckCopiedIntent(),
      phrases: ["Check this with \(.applicationName)", "Is this a scam, \(.applicationName)", "\(.applicationName), check what I copied"],
      shortTitle: "Check what I copied",
      systemImageName: "checkmark.shield"
    )
  }
}
