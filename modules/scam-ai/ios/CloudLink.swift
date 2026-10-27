import ExpoModulesCore
import Foundation
import UserNotifications
@preconcurrency import CloudKit

// The family link, over the family's own iCloud.
//
// Shape of it: the person being looked after (the "owner") has a private
// CloudKit zone, "LoopMeFamily". It is shared with one caretaker through a
// CKShare whose link travels in a single ordinary text, once. From then on
// every flagged check the owner's phone writes lands on the caretaker's phone
// as a push, and every note the caretaker writes lands back the same way.
// No texts, nothing to read, nothing to parse, and no server of mine: the
// records sit in the owner's own iCloud, where I cannot see them.
//
// Two record types live in the zone:
//   Check: level, excerpt, reason, at, sender, asked, from   (owner writes)
//   Note:  checkId, text, verdict, at, from                  (caretaker writes)
//
// Reads use zone-change fetches with saved change tokens, not queries, so no
// CloudKit index has to exist for anything to work.

let LM_CONTAINER = "iCloud.com.loopmescamsafety.app"
let LM_ZONE = "LoopMeFamily"
let LM_CHECK = "Check"
let LM_NOTE = "Note"
let LM_SUB_SHARED = "loopme-shared-db"
let LM_SUB_PRIVATE = "loopme-private-db"

enum CloudLinkError: Error, LocalizedError {
  case noAccount
  case noShare
  case failed(String)
  var errorDescription: String? {
    switch self {
    case .noAccount: return "Not signed in to iCloud"
    case .noShare:   return "No family link set up yet"
    case .failed(let m): return m
    }
  }
}

/// Events for the JavaScript side. The module hands over a listener when JS
/// subscribes; anything that happens before then waits in `pending`.
final class CloudBus: @unchecked Sendable {
  static let shared = CloudBus()
  private let q = DispatchQueue(label: "loopme.cloudbus")
  private var pending: [[String: Any]] = []
  private var listener: (([String: Any]) -> Void)?

  func emit(_ e: [String: Any]) {
    q.async {
      if let l = self.listener { l(e) } else { self.pending.append(e) }
    }
  }
  func attach(_ l: @escaping ([String: Any]) -> Void) {
    q.async {
      self.listener = l
      for e in self.pending { l(e) }
      self.pending.removeAll()
    }
  }
  func detach() { q.async { self.listener = nil } }
}

final class CloudLink: @unchecked Sendable {
  static let shared = CloudLink()
  private let store = FamilyStore.shared

  // Created on first use, inside an exception catcher. CloudKit traps when the
  // iCloud entitlement is missing (an unsigned simulator run, a build with
  // the capability switched off); a missing link must degrade, never crash.
  private lazy var containerOrNil: CKContainer? = {
    var c: CKContainer?
    var why: NSString?
    guard LMTryBlock({ c = CKContainer(identifier: LM_CONTAINER) }, &why) else { return nil }
    return c
  }()
  private var container: CKContainer {
    get throws {
      guard let c = containerOrNil else { throw CloudLinkError.failed("iCloud is not available in this build") }
      return c
    }
  }
  private var ownZoneID: CKRecordZone.ID {
    CKRecordZone.ID(zoneName: LM_ZONE, ownerName: CKCurrentUserDefaultName)
  }

  // MARK: account

  /// "available" | "noAccount" | "restricted" | "unknown"
  func accountState() async -> String {
    do {
      switch try await container.accountStatus() {
      case .available:        return "available"
      case .noAccount:        return "noAccount"
      case .restricted:       return "restricted"
      case .couldNotDetermine: return "unknown"
      case .temporarilyUnavailable: return "unknown"
      @unknown default:       return "unknown"
      }
    } catch {
      return "unknown"
    }
  }

  // MARK: owner side

  /// Create (or reuse) the shared zone and return a share URL to text once.
  func createInvite(myName: String) async throws -> String {
    guard await accountState() == "available" else { throw CloudLinkError.noAccount }
    let db = try container.privateCloudDatabase

    let zone = CKRecordZone(zoneID: ownZoneID)
    _ = try? await db.modifyRecordZones(saving: [zone], deleting: [])

    // One share per zone. Reuse the existing one so a second invite does not
    // orphan the caretaker who already accepted the first.
    if let existing = try? await db.record(for: CKRecord.ID(recordName: CKRecordNameZoneWideShare, zoneID: ownZoneID)) as? CKShare,
       let url = existing.url {
      store.ownerName = myName
      return url.absoluteString
    }

    let share = CKShare(recordZoneID: ownZoneID)
    share[CKShare.SystemFieldKey.title] = "Loop Me: \(myName)" as CKRecordValue
    // Anyone holding the link can join and write notes back. The link is a
    // secret that travels once, to one person, and the owner can revoke it.
    share.publicPermission = .readWrite

    let saved = try await db.modifyRecords(saving: [share], deleting: [])
    for (_, result) in saved.saveResults {
      if case .success(let rec) = result, let s = rec as? CKShare, let url = s.url {
        store.ownerName = myName
        return url.absoluteString
      }
    }
    throw CloudLinkError.failed("Could not create the family link")
  }

  /// Owner side: who has accepted. `linked` once a caretaker is in.
  func linkStatus() async -> [String: Any] {
    // Caretaker side answers from what it saved when it accepted.
    if let peer = store.joinedOwnerName {
      return ["linked": true, "role": "caretaker", "name": peer]
    }
    guard await accountState() == "available" else {
      return ["linked": false, "role": "none", "name": NSNull(), "account": await accountState()]
    }
    guard let db = try? container.privateCloudDatabase else {
      return ["linked": false, "role": "none", "name": NSNull(), "account": "unknown"]
    }
    guard let share = try? await db.record(for: CKRecord.ID(recordName: CKRecordNameZoneWideShare, zoneID: ownZoneID)) as? CKShare else {
      return ["linked": false, "role": "none", "name": NSNull(), "account": "available"]
    }
    let joined = share.participants.filter { $0.role != .owner && $0.acceptanceStatus == .accepted }
    if let p = joined.first {
      let name = CloudLink.displayName(p.userIdentity) ?? store.caretakerName ?? "your caretaker"
      store.caretakerName = name
      return ["linked": true, "role": "owner", "name": name, "account": "available"]
    }
    return ["linked": false, "role": "owner", "name": NSNull(), "invited": true, "account": "available"]
  }

  /// Owner side: publish one flagged check into the shared zone.
  func publish(_ c: [String: Any]) async throws {
    guard await accountState() == "available" else { throw CloudLinkError.noAccount }
    let id = c["id"] as? String ?? UUID().uuidString
    let rec = CKRecord(recordType: LM_CHECK, recordID: CKRecord.ID(recordName: id, zoneID: ownZoneID))
    rec["level"] = (c["level"] as? String ?? "red") as CKRecordValue
    rec["excerpt"] = (c["excerpt"] as? String ?? "") as CKRecordValue
    rec["reason"] = (c["reason"] as? String ?? "") as CKRecordValue
    rec["sender"] = (c["sender"] as? String ?? "") as CKRecordValue
    rec["asked"] = ((c["asked"] as? Bool ?? false) ? 1 : 0) as CKRecordValue
    rec["from"] = (c["from"] as? String ?? store.ownerName ?? "") as CKRecordValue
    rec["at"] = Date(timeIntervalSince1970: (c["at"] as? Double ?? Date().timeIntervalSince1970 * 1000) / 1000) as CKRecordValue
    _ = try await container.privateCloudDatabase.modifyRecords(saving: [rec], deleting: [])
  }

  /// Owner side: tear the share down. The caretaker's phone loses access at once.
  func revoke() async throws {
    let db = try container.privateCloudDatabase
    let shareID = CKRecord.ID(recordName: CKRecordNameZoneWideShare, zoneID: ownZoneID)
    _ = try? await db.modifyRecords(saving: [], deleting: [shareID])
    _ = try? await db.modifyRecordZones(saving: [], deleting: [ownZoneID])
    store.caretakerName = nil
    store.resetTokens()
  }

  // MARK: caretaker side

  /// Called from the AppDelegate when the caretaker opens the share link.
  func accept(_ metadata: CKShare.Metadata) {
    let op = CKAcceptSharesOperation(shareMetadatas: [metadata])
    let ownerName = CloudLink.displayName(metadata.ownerIdentity)
      ?? metadata.share[CKShare.SystemFieldKey.title].flatMap { ($0 as? String)?.replacingOccurrences(of: "Loop Me: ", with: "") }
      ?? "Family"
    op.acceptSharesResultBlock = { [weak self] result in
      guard let self else { return }
      switch result {
      case .success:
        self.store.joinedOwnerName = ownerName
        self.store.joinedZone = metadata.share.recordID.zoneID
        CloudBus.shared.emit(["kind": "joined", "name": ownerName])
        Task {
          _ = try? await self.subscribe()
          _ = try? await self.sync(notify: false)
        }
      case .failure(let e):
        CloudBus.shared.emit(["kind": "joinFailed", "message": e.localizedDescription])
      }
    }
    guard let c = try? container else {
      CloudBus.shared.emit(["kind": "joinFailed", "message": "iCloud is not available in this build"])
      return
    }
    c.add(op)
  }

  /// Caretaker side: write a note back under one check.
  func sendNote(checkId: String, text: String, verdict: String, from: String) async throws {
    guard await accountState() == "available" else { throw CloudLinkError.noAccount }
    guard let zone = store.joinedZone else { throw CloudLinkError.noShare }
    let rec = CKRecord(recordType: LM_NOTE, recordID: CKRecord.ID(recordName: "note-" + UUID().uuidString, zoneID: zone))
    rec["checkId"] = checkId as CKRecordValue
    rec["text"] = text as CKRecordValue
    rec["verdict"] = verdict as CKRecordValue
    rec["from"] = from as CKRecordValue
    rec["at"] = Date() as CKRecordValue
    _ = try await container.sharedCloudDatabase.modifyRecords(saving: [rec], deleting: [])
    store.appendNote(["id": rec.recordID.recordName, "checkId": checkId, "text": text, "verdict": verdict, "from": from,
                      "at": Date().timeIntervalSince1970 * 1000, "mine": true])
  }

  /// Caretaker side: leave. Removing the zone from the shared database is how
  /// a participant removes themselves from a share.
  func leave() async throws {
    if let zone = store.joinedZone {
      _ = try? await container.sharedCloudDatabase.modifyRecordZones(saving: [], deleting: [zone])
    }
    store.joinedOwnerName = nil
    store.joinedZone = nil
    store.resetTokens()
  }

  // MARK: push

  /// Silent pushes for both databases. Harmless to ask for both on either side.
  func subscribe() async throws {
    guard await accountState() == "available" else { throw CloudLinkError.noAccount }
    let c = try container
    for (db, id) in [(c.sharedCloudDatabase, LM_SUB_SHARED), (c.privateCloudDatabase, LM_SUB_PRIVATE)] {
      let sub = CKDatabaseSubscription(subscriptionID: id)
      let note = CKSubscription.NotificationInfo()
      note.shouldSendContentAvailable = true
      sub.notificationInfo = note
      _ = try? await db.modifySubscriptions(saving: [sub], deleting: [])
    }
  }

  /// Pull everything new from whichever zones this phone can see. Returns the
  /// number of new items. When `notify` is on, each new item from the other
  /// side becomes a local notification.
  @discardableResult
  func sync(notify: Bool) async throws -> Int {
    guard await accountState() == "available" else { throw CloudLinkError.noAccount }
    var fresh = 0

    // Caretaker: the owner's zone, through the shared database.
    if let zone = store.joinedZone {
      let (changed, _) = try await fetchChanges(db: container.sharedCloudDatabase, zone: zone, tokenKey: "shared")
      for r in changed where r.recordType == LM_CHECK {
        let dict = CloudLink.checkDict(r)
        if store.appendCheck(dict) {
          fresh += 1
          if notify { CloudLink.notifyCheck(dict) }
          CloudBus.shared.emit(["kind": "check", "check": dict])
        }
      }
      for r in changed where r.recordType == LM_NOTE {
        _ = store.appendNote(CloudLink.noteDict(r))
      }
    }

    // Owner: my own zone, for notes the caretaker wrote.
    if store.joinedZone == nil {
      let zones = (try? await container.privateCloudDatabase.allRecordZones()) ?? []
      if zones.contains(where: { $0.zoneID.zoneName == LM_ZONE }) {
        let (changed, _) = try await fetchChanges(db: container.privateCloudDatabase, zone: ownZoneID, tokenKey: "private")
        for r in changed where r.recordType == LM_NOTE {
          let dict = CloudLink.noteDict(r)
          if store.appendNote(dict) {
            fresh += 1
            if notify { CloudLink.notifyNote(dict) }
            CloudBus.shared.emit(["kind": "note", "note": dict])
          }
        }
      }
    }
    if fresh == 0 { CloudBus.shared.emit(["kind": "synced"]) }
    return fresh
  }

  /// Handle a CloudKit push. Returns true when it was one of ours.
  func handleRemoteNotification(_ userInfo: [AnyHashable: Any]) async -> Bool {
    guard let info = userInfo as? [String: NSObject],
          let note = CKNotification(fromRemoteNotificationDictionary: info),
          note.containerIdentifier == LM_CONTAINER else { return false }
    _ = try? await sync(notify: true)
    return true
  }

  // MARK: fetching

  private func fetchChanges(db: CKDatabase, zone: CKRecordZone.ID, tokenKey: String) async throws -> ([CKRecord], [CKRecord.ID]) {
    try await withCheckedThrowingContinuation { (cont: CheckedContinuation<([CKRecord], [CKRecord.ID]), Error>) in
      let cfg = CKFetchRecordZoneChangesOperation.ZoneConfiguration()
      cfg.previousServerChangeToken = store.token(tokenKey)
      let op = CKFetchRecordZoneChangesOperation(recordZoneIDs: [zone], configurationsByRecordZoneID: [zone: cfg])
      var changed: [CKRecord] = []
      var deleted: [CKRecord.ID] = []
      var finished = false
      op.recordWasChangedBlock = { _, result in
        if case .success(let r) = result { changed.append(r) }
      }
      op.recordWithIDWasDeletedBlock = { id, _ in deleted.append(id) }
      op.recordZoneChangeTokensUpdatedBlock = { [weak self] _, token, _ in
        if let token { self?.store.setToken(tokenKey, token) }
      }
      op.recordZoneFetchResultBlock = { [weak self] _, result in
        switch result {
        case .success(let (token, _, _)):
          self?.store.setToken(tokenKey, token)
        case .failure(let e):
          if let ck = e as? CKError, ck.code == .changeTokenExpired {
            self?.store.setToken(tokenKey, nil)
          }
        }
      }
      op.fetchRecordZoneChangesResultBlock = { result in
        guard !finished else { return }
        finished = true
        switch result {
        case .success: cont.resume(returning: (changed, deleted))
        case .failure(let e): cont.resume(throwing: e)
        }
      }
      db.add(op)
    }
  }

  // MARK: helpers

  static func displayName(_ id: CKUserIdentity?) -> String? {
    guard let id else { return nil }
    if let n = id.nameComponents {
      let s = PersonNameComponentsFormatter.localizedString(from: n, style: .default)
      if !s.trimmingCharacters(in: .whitespaces).isEmpty { return s }
    }
    return nil
  }

  static func checkDict(_ r: CKRecord) -> [String: Any] {
    [
      "id": r.recordID.recordName,
      "level": (r["level"] as? String) ?? "red",
      "excerpt": (r["excerpt"] as? String) ?? "",
      "reason": (r["reason"] as? String) ?? "",
      "sender": (r["sender"] as? String) ?? "",
      "asked": ((r["asked"] as? Int) ?? 0) == 1,
      "from": (r["from"] as? String) ?? "",
      "at": ((r["at"] as? Date)?.timeIntervalSince1970 ?? Date().timeIntervalSince1970) * 1000,
    ]
  }

  static func noteDict(_ r: CKRecord) -> [String: Any] {
    [
      "id": r.recordID.recordName,
      "checkId": (r["checkId"] as? String) ?? "",
      "text": (r["text"] as? String) ?? "",
      "verdict": (r["verdict"] as? String) ?? "",
      "from": (r["from"] as? String) ?? "",
      "at": ((r["at"] as? Date)?.timeIntervalSince1970 ?? Date().timeIntervalSince1970) * 1000,
      "mine": false,
    ]
  }

  /// Caretaker's phone: a time-sensitive notification with the three replies
  /// on it, so they can answer from the lock screen without opening anything.
  static func notifyCheck(_ c: [String: Any]) {
    let content = UNMutableNotificationContent()
    let who = (c["from"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "Someone you look after"
    let red = (c["level"] as? String) == "red"
    content.title = red ? "\(who) just got a scam text" : "A text on \(who)’s phone needs a look"
    let sender = (c["sender"] as? String) ?? ""
    let excerpt = (c["excerpt"] as? String) ?? ""
    content.body = (sender.isEmpty ? "" : "From \(sender). ") + "“\(excerpt.prefix(140))”"
    content.sound = .default
    content.categoryIdentifier = "LOOPME_CHECK"
    content.threadIdentifier = "loopme-family"
    content.userInfo = ["kind": "check", "id": c["id"] ?? ""]
    if #available(iOS 15.0, *) { content.interruptionLevel = .timeSensitive }
    let req = UNNotificationRequest(identifier: "check-" + ((c["id"] as? String) ?? UUID().uuidString), content: content, trigger: nil)
    UNUserNotificationCenter.current().add(req)
  }

  /// Owner's phone: the caretaker's note, as a notification that opens it.
  static func notifyNote(_ n: [String: Any]) {
    let content = UNMutableNotificationContent()
    let who = (n["from"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "Your family"
    content.title = "\(who) sent you a note"
    content.body = (n["text"] as? String) ?? ""
    content.sound = .default
    content.categoryIdentifier = "LOOPME_NOTE"
    content.threadIdentifier = "loopme-family"
    content.userInfo = ["kind": "note", "id": n["id"] ?? "", "checkId": n["checkId"] ?? ""]
    if #available(iOS 15.0, *) { content.interruptionLevel = .timeSensitive }
    let req = UNNotificationRequest(identifier: "note-" + ((n["id"] as? String) ?? UUID().uuidString), content: content, trigger: nil)
    UNUserNotificationCenter.current().add(req)
  }
}

/// What this phone knows about the family link, kept in the app group so the
/// extensions can read the caretaker's name and the app survives relaunch.
final class FamilyStore: @unchecked Sendable {
  static let shared = FamilyStore()
  private let d = SharedStore.defaults
  private let q = DispatchQueue(label: "loopme.familystore")
  private let cap = 300

  var ownerName: String? {
    get { d.string(forKey: "family.ownerName") }
    set { d.set(newValue, forKey: "family.ownerName") }
  }
  var caretakerName: String? {
    get { d.string(forKey: "family.caretakerName") }
    set { d.set(newValue, forKey: "family.caretakerName") }
  }
  var joinedOwnerName: String? {
    get { d.string(forKey: "family.joinedOwnerName") }
    set { d.set(newValue, forKey: "family.joinedOwnerName") }
  }
  var joinedZone: CKRecordZone.ID? {
    get {
      guard let name = d.string(forKey: "family.joinedZoneName"), let owner = d.string(forKey: "family.joinedZoneOwner") else { return nil }
      return CKRecordZone.ID(zoneName: name, ownerName: owner)
    }
    set {
      d.set(newValue?.zoneName, forKey: "family.joinedZoneName")
      d.set(newValue?.ownerName, forKey: "family.joinedZoneOwner")
    }
  }

  func token(_ key: String) -> CKServerChangeToken? {
    guard let data = d.data(forKey: "family.token." + key) else { return nil }
    return try? NSKeyedUnarchiver.unarchivedObject(ofClass: CKServerChangeToken.self, from: data)
  }
  func setToken(_ key: String, _ t: CKServerChangeToken?) {
    if let t, let data = try? NSKeyedArchiver.archivedData(withRootObject: t, requiringSecureCoding: true) {
      d.set(data, forKey: "family.token." + key)
    } else {
      d.removeObject(forKey: "family.token." + key)
    }
  }
  func resetTokens() {
    setToken("shared", nil); setToken("private", nil)
    d.removeObject(forKey: "family.checks"); d.removeObject(forKey: "family.notes")
  }

  var checks: [[String: Any]] { d.array(forKey: "family.checks") as? [[String: Any]] ?? [] }
  var notes: [[String: Any]] { d.array(forKey: "family.notes") as? [[String: Any]] ?? [] }

  /// Returns true when the item was new.
  func appendCheck(_ c: [String: Any]) -> Bool { append("family.checks", c) }
  func appendNote(_ n: [String: Any]) -> Bool { append("family.notes", n) }

  private func append(_ key: String, _ item: [String: Any]) -> Bool {
    q.sync {
      var list = d.array(forKey: key) as? [[String: Any]] ?? []
      let id = item["id"] as? String ?? ""
      if let i = list.firstIndex(where: { ($0["id"] as? String) == id }) {
        list[i] = item
        d.set(list, forKey: key)
        return false
      }
      list.insert(item, at: 0)
      if list.count > cap { list = Array(list.prefix(cap)) }
      d.set(list, forKey: key)
      return true
    }
  }

  func snapshot() -> [String: Any] {
    [
      "checks": checks,
      "notes": notes,
      "ownerName": ownerName ?? NSNull(),
      "caretakerName": caretakerName ?? NSNull(),
      "joinedOwnerName": joinedOwnerName ?? NSNull(),
    ]
  }
}
