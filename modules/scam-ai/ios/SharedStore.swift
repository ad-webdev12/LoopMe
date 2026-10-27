import Foundation
import CallKit

// The app group: the one place the app and its extensions can both read.
//
// The text filter runs in its own process when a message from an unknown
// number arrives, and the share sheet and call directory run in theirs. None
// of them can see the app's storage, so what they need travels through here:
//   config      safe senders, blocked numbers, whether auto-check is on
//   filter log  every verdict the text filter or share sheet produced,
//               drained by the app into history the next time it opens
//   blocked     numbers the person chose to block (the call directory reads it)

let LM_APP_GROUP = "group.com.loopmescamsafety.app"
let LM_CALL_DIRECTORY = "com.loopmescamsafety.app.calls"

enum SharedStore {
  static let defaults: UserDefaults = UserDefaults(suiteName: LM_APP_GROUP) ?? .standard

  static var allowlist: [String] {
    get { defaults.stringArray(forKey: "config.allowlist") ?? [] }
    set { defaults.set(newValue, forKey: "config.allowlist") }
  }
  static var autoCheck: Bool {
    get { defaults.object(forKey: "config.autoCheck") as? Bool ?? true }
    set { defaults.set(newValue, forKey: "config.autoCheck") }
  }
  /// Numbers the person blocked. Digits only, with country code where known.
  static var blockedNumbers: [String] {
    get { defaults.stringArray(forKey: "config.blocked") ?? [] }
    set { defaults.set(Array(Set(newValue)).sorted(), forKey: "config.blocked") }
  }
  /// Numbers that sent something flagged red. Labeled, not blocked.
  static var flaggedNumbers: [String] {
    get { defaults.stringArray(forKey: "config.flagged") ?? [] }
    set { defaults.set(Array(Set(newValue)).sorted(), forKey: "config.flagged") }
  }

  /// Extensions append here; the app drains it.
  static func logVerdict(_ entry: [String: Any]) {
    var list = defaults.array(forKey: "filter.log") as? [[String: Any]] ?? []
    list.insert(entry, at: 0)
    if list.count > 100 { list = Array(list.prefix(100)) }
    defaults.set(list, forKey: "filter.log")
  }
  static func drainLog() -> [[String: Any]] {
    let list = defaults.array(forKey: "filter.log") as? [[String: Any]] ?? []
    defaults.removeObject(forKey: "filter.log")
    return list
  }

  /// Running tallies the app shows ("stopped 4 this month") even for things
  /// the filter caught while the app was closed.
  static func bump(_ key: String) {
    defaults.set(defaults.integer(forKey: "tally." + key) + 1, forKey: "tally." + key)
  }

  /// Digits only, so "+1 (415) 555-0100" and "14155550100" compare equal.
  static func canonical(_ phone: String) -> String {
    phone.filter { $0.isNumber }
  }

  /// Ask iOS to re-read the call directory after the lists change.
  static func reloadCallDirectory() async -> String {
    await withCheckedContinuation { cont in
      CXCallDirectoryManager.sharedInstance.reloadExtension(withIdentifier: LM_CALL_DIRECTORY) { err in
        cont.resume(returning: err == nil ? "ok" : (err?.localizedDescription ?? "failed"))
      }
    }
  }

  /// "enabled" | "disabled" | "unknown"
  static func callDirectoryStatus() async -> String {
    await withCheckedContinuation { cont in
      CXCallDirectoryManager.sharedInstance.getEnabledStatusForExtension(withIdentifier: LM_CALL_DIRECTORY) { status, _ in
        switch status {
        case .enabled: cont.resume(returning: "enabled")
        case .disabled: cont.resume(returning: "disabled")
        default: cont.resume(returning: "unknown")
        }
      }
    }
  }
}
