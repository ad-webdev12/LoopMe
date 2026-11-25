import IdentityLookup
import os

// The text filter. iOS hands every message from a number that is not in the
// person's contacts to this extension before it reaches Messages, provided
// the person switched Loop Me on under Settings > Messages > Unknown & Junk.
//
// It runs the same detector as the app (ios/Shared/Engine) plus a small
// learned model, fully offline:
// a message that comes back red goes to the Junk folder and never rings the
// phone; anything amber is let through but written to the shared log, so the
// app can show it and the caretaker can hear about it the next time Loop Me
// opens. The extension has no network and never sees contacts' messages.
final class MessageFilterExtension: ILMessageFilterExtension {
  // ScamNet Lite, loaded once per extension process. The filter runs under a
  // memory cap the full ScamNet does not fit in, and going over it means iOS
  // kills the filter and nothing gets filtered at all. Lite is ScamNet taught
  // into a 2-layer model, read from a memory-mapped file.
  //
  // Before loading, the filter asks iOS how much memory it has left. If that
  // is too little, it runs the rules alone instead of risking a kill. Either
  // way it records what happened, so the app can show whether the filter is
  // running and with how much room (Settings, Text filter).
  static let model: CoreModel? = {
    let before = os_proc_available_memory()
    let m: CoreModel? = before == 0 || before > 16 << 20 ? CoreModel.named("ScamNetLite", threshold: MessageFilterExtension.liteThreshold) : nil
    let after = os_proc_available_memory()
    let d = SharedStore.defaults
    d.set(m?.kind ?? (before > 0 && before <= 16 << 20 ? "rules (low memory)" : "rules (model missing)"), forKey: "filter.health.model")
    d.set(Double(before) / 1_048_576, forKey: "filter.health.memBeforeMB")
    d.set(Double(after) / 1_048_576, forKey: "filter.health.memAfterMB")
    return m
  }()
  static let liteThreshold = 0.8
}

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
    let v = Engine.check(body, opts, model: MessageFilterExtension.model)
    SharedStore.bump("filtered")
    SharedStore.defaults.set(Date().timeIntervalSince1970 * 1000, forKey: "filter.health.lastAt")
    SharedStore.defaults.set(Double(os_proc_available_memory()) / 1_048_576, forKey: "filter.health.memNowMB")

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
