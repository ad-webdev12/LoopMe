import IdentityLookup

// The text filter. iOS hands every message from a number that is not in the
// person's contacts to this extension before it reaches Messages, provided
// the person switched Loop Me on under Settings > Messages > Unknown & Junk.
//
// It runs the same detector as the app (ios/Shared/Engine), fully offline:
// a message that comes back red goes to the Junk folder and never rings the
// phone; anything amber is let through but written to the shared log, so the
// app can show it and the caretaker can hear about it the next time Loop Me
// opens. The extension has no network and never sees contacts' messages.
final class MessageFilterExtension: ILMessageFilterExtension {}

extension MessageFilterExtension: ILMessageFilterQueryHandling {
  func handle(_ queryRequest: ILMessageFilterQueryRequest, context: ILMessageFilterExtensionContext,
              completion: @escaping (ILMessageFilterQueryResponse) -> Void) {
    let response = ILMessageFilterQueryResponse()
    response.action = .none

    guard SharedStore.autoCheck, let body = queryRequest.messageBody, !body.isEmpty else {
      completion(response)
      return
    }
    let sender = queryRequest.sender ?? ""
    let canonical = SharedStore.canonical(sender)
    if !canonical.isEmpty && SharedStore.blockedNumbers.contains(canonical) {
      response.action = .junk
      SharedStore.bump("junk")
      completion(response)
      return
    }

    var opts = DetectorOptions()
    opts.allowlist = SharedStore.allowlist
    opts.sender = sender
    let v = Engine.instant(body, opts)
    SharedStore.bump("filtered")

    switch v.level {
    case .red:
      response.action = .junk
      SharedStore.bump("junk")
      if !canonical.isEmpty { SharedStore.flaggedNumbers = SharedStore.flaggedNumbers + [canonical] }
    case .amber:
      response.action = .none
    case .green:
      response.action = .allow
    }

    if v.level != .green {
      SharedStore.logVerdict([
        "id": "f-" + UUID().uuidString,
        "at": Date().timeIntervalSince1970 * 1000,
        "source": "filter",
        "sender": sender,
        "excerpt": Redact.privateDetails(body).prefix(180).description,
        "level": v.level.rawValue,
        "score": v.score,
        "tags": v.tags,
        "reason": v.reason,
        "safeStep": v.safeStep,
        "signals": v.signals,
      ])
    }
    completion(response)
  }
}
