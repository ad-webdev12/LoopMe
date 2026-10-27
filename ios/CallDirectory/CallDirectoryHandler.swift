import Foundation
import CallKit

// The call directory. iOS reads this list once the person switches Loop Me on
// under Settings > Phone > Call Blocking & Identification, and from then on:
//   blocked   numbers the person chose to block never ring at all
//   flagged   numbers that sent a scam text show "Flagged by Loop Me" on the
//             incoming-call screen, so the call that follows the text is
//             recognized for what it is
// Both lists live in the app group and come from the person's own history.
// There is no central blocklist and nothing is downloaded.
final class CallDirectoryHandler: CXCallDirectoryProvider {
  override func beginRequest(with context: CXCallDirectoryExtensionContext) {
    context.delegate = self
    if context.isIncremental {
      context.removeAllBlockingEntries()
      context.removeAllIdentificationEntries()
    }
    let blocked = numbers(SharedStore.blockedNumbers)
    for n in blocked { context.addBlockingEntry(withNextSequentialPhoneNumber: n) }

    let flagged = numbers(SharedStore.flaggedNumbers).filter { !blocked.contains($0) }
    for n in flagged { context.addIdentificationEntry(withNextSequentialPhoneNumber: n, label: "Flagged by Loop Me") }
    context.completeRequest()
  }

  /// CallKit wants Int64 numbers with a country code, in ascending order,
  /// no duplicates. A bare ten-digit US number gets its 1.
  private func numbers(_ raw: [String]) -> [CXCallDirectoryPhoneNumber] {
    var out = Set<CXCallDirectoryPhoneNumber>()
    for r in raw {
      var digits = r.filter { $0.isNumber }
      if digits.count == 10 { digits = "1" + digits }
      if digits.count < 7 || digits.count > 15 { continue }
      if let n = CXCallDirectoryPhoneNumber(digits) { out.insert(n) }
    }
    return out.sorted()
  }
}

extension CallDirectoryHandler: CXCallDirectoryExtensionContextDelegate {
  func requestFailed(for extensionContext: CXCallDirectoryExtensionContext, withError error: Error) {}
}
