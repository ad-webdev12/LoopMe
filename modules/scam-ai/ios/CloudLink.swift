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
let LM_PULSE = "Pulse"
let LM_WORD = "Word"     // the family secret word, one record per family, encrypted, newest wins
let LM_INVITE = "Invite" // public: inv-<code> -> share url, so a typed code can join
let LM_PING = "Ping"     // caretaker to owner: "send me anything you are holding", delivered as a silent push
let LM_REFRESH_TASK = "com.loopmescamsafety.app.refresh"   // one record per owner, overwritten: counts, last seen, what is switched on
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
    // Right after launch iOS can answer "temporarily unavailable" for a
    // second or two while the account loads. Ask again before giving up,
    // otherwise a signed-in phone is told it is not signed in.
    for attempt in 0..<4 {
      let st = await accountStateOnce()
      if st != "unknown" { return st }
      if attempt < 3 { try? await Task.sleep(nanoseconds: 500_000_000) }
    }
    return "unknown"
  }
  private func accountStateOnce() async -> String {
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
    // Say exactly what is wrong. "Not signed in" was shown for every state,
    // including iCloud simply not answering yet, which is what a signed-in
    // phone saw in the first minute after launch.
    switch await accountState() {
    case "available": break
    case "noAccount": throw CloudLinkError.noAccount
    case "restricted": throw CloudLinkError.failed("iCloud is restricted on this phone, usually by Screen Time or a work profile")
    default: throw CloudLinkError.failed("iCloud did not answer. Check Settings, your name at the top, then iCloud, and that Loop Me is switched on there. Then try again.")
    }
    let db = try container.privateCloudDatabase

    // The zone. A failure here is the usual root cause (iCloud switched off
    // for Loop Me, no iCloud Drive, quota, network), so it is named, not hidden.
    let zone = CKRecordZone(zoneID: ownZoneID)
    do { _ = try await db.modifyRecordZones(saving: [zone], deleting: []) }
    catch { throw CloudLinkError.failed("iCloud would not make the family folder. " + CloudLink.describe(error)) }

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

    var why = ""
    do {
      let saved = try await db.modifyRecords(saving: [share], deleting: [])
      for (_, result) in saved.saveResults {
        switch result {
        case .success(let rec):
          if let s = rec as? CKShare, let url = s.url { store.ownerName = myName; return url.absoluteString }
          why = "iCloud saved the link but gave back no address"
        case .failure(let e):
          why = CloudLink.describe(e)
        }
      }
      if why.isEmpty { why = "iCloud answered without saving anything" }
    } catch {
      why = CloudLink.describe(error)
    }
    throw CloudLinkError.failed("iCloud would not make the family link. " + why)
  }

  // MARK: invite code
  //
  // A link that opens the App Store first is lost: iOS does not hand it to the
  // app after the install. So every invite also has a short code. The owner's
  // phone writes one public record, named after the code, that holds the
  // share link. The other phone types the code, reads that record, and joins.
  // Public records are readable by anyone who knows the name. The code is
  // five digits so it is easy to read out and type, so it lives only one hour
  // and is deleted as soon as someone joins with it.

  static let codeAlphabet = Array("0123456789")
  static let codeLength = 5
  static let codeLife: TimeInterval = 3600

  /// "48 213" style input to "48213": everything but digits dropped.
  static func normalizeCode(_ raw: String) -> String {
    String(raw.filter { codeAlphabet.contains($0) })
  }

  /// Owner side: the invite code for this phone's share, made once and reused for a week.
  func inviteCode(myName: String) async throws -> String {
    let url = try await createInvite(myName: myName)
    if let code = store.inviteCode, let at = store.inviteCodeAt, store.inviteCodeURL == url,
       Date().timeIntervalSince(at) < CloudLink.codeLife - 10 * 60 {
      return code
    }
    let pub = try container.publicCloudDatabase
    var code = ""
    var lastError: Error?
    // Another family may hold the same five digits right now; try a few.
    for _ in 0..<6 {
      let candidate = String((0..<CloudLink.codeLength).map { _ in CloudLink.codeAlphabet.randomElement()! })
      let rec = CKRecord(recordType: LM_INVITE, recordID: CKRecord.ID(recordName: "inv-" + candidate))
      rec["url"] = url as CKRecordValue
      rec["name"] = myName as CKRecordValue
      rec["at"] = Date() as CKRecordValue
      do {
        let (saved, _) = try await pub.modifyRecords(saving: [rec], deleting: [], savePolicy: .ifServerRecordUnchanged)
        if case .failure(let e)? = saved[rec.recordID] {
          lastError = e
          // Taken, but maybe by a code that has run out: reuse that one.
          if let old = try? await pub.record(for: rec.recordID), let at = old["at"] as? Date,
             Date().timeIntervalSince(at) > CloudLink.codeLife {
            old["url"] = url as CKRecordValue
            old["name"] = myName as CKRecordValue
            old["at"] = Date() as CKRecordValue
            if (try? await pub.modifyRecords(saving: [old], deleting: [], savePolicy: .ifServerRecordUnchanged)) != nil {
              code = candidate; lastError = nil; break
            }
          }
          continue
        }
        code = candidate; lastError = nil; break
      } catch { lastError = error }
    }
    if let error = lastError {
      let ns = error as NSError
      if ns.domain == CKError.errorDomain, [CKError.Code.invalidArguments.rawValue, CKError.Code.serverRejectedRequest.rawValue].contains(ns.code) {
        throw CloudLinkError.failed("Invite codes are not switched on for this app yet. Use the link for now. " + CloudLink.describe(error))
      }
      throw CloudLinkError.failed("The code could not be made. " + CloudLink.describe(error))
    }
    // The previous code stops working once there is a new one.
    if let old = store.inviteCode, old != code {
      _ = try? await pub.modifyRecords(saving: [], deleting: [CKRecord.ID(recordName: "inv-" + old)])
    }
    store.inviteCode = code; store.inviteCodeAt = Date(); store.inviteCodeURL = url
    // Count who is already in, so only someone new takes the code down.
    if let share = try? await container.privateCloudDatabase.record(for: CKRecord.ID(recordName: CKRecordNameZoneWideShare, zoneID: ownZoneID)) as? CKShare {
      UserDefaults.standard.set(share.participants.filter { $0.role != .owner && $0.acceptanceStatus == .accepted }.count, forKey: "loopme.inviteCodeBase")
    }
    return code
  }

  /// Caretaker side: join with a code typed in or scanned. Returns the owner's name.
  func join(code raw: String) async throws -> String {
    let code = CloudLink.normalizeCode(raw)
    guard code.count == CloudLink.codeLength else { throw CloudLinkError.failed("The code is 5 numbers. Check it and try again.") }
    switch await accountState() {
    case "available": break
    case "noAccount": throw CloudLinkError.noAccount
    default: throw CloudLinkError.failed("iCloud did not answer. Check the connection and that you are signed in to iCloud, then try again.")
    }
    let rec: CKRecord
    do { rec = try await (try container).publicCloudDatabase.record(for: CKRecord.ID(recordName: "inv-" + code)) }
    catch {
      let ns = error as NSError
      if ns.domain == CKError.errorDomain, ns.code == CKError.Code.unknownItem.rawValue {
        throw CloudLinkError.failed("No invite has that code. It may have expired. Ask them to open Loop Me, go to Family and show the code again.")
      }
      throw CloudLinkError.failed("The code could not be checked. " + CloudLink.describe(error))
    }
    if let at = rec["at"] as? Date, Date().timeIntervalSince(at) > CloudLink.codeLife {
      throw CloudLinkError.failed("That code has expired. Ask them to show a new one in Loop Me, under Family.")
    }
    guard let s = rec["url"] as? String, let url = URL(string: s) else { throw CloudLinkError.failed("That invite is damaged. Ask them to make a new one.") }
    let metadata: CKShare.Metadata
    do { metadata = try await (try container).shareMetadata(for: url) }
    catch { throw CloudLinkError.failed("The invite could not be opened. " + CloudLink.describe(error)) }
    if metadata.participantRole == .owner {
      throw CloudLinkError.failed("This phone made that invite. Enter the code on the other phone, the one that should hear about scams.")
    }
    return try await acceptNow(metadata)
  }

  /// Accept a share and remember it. Shared by the link and the code.
  @discardableResult
  func acceptNow(_ metadata: CKShare.Metadata) async throws -> String {
    let ownerName = CloudLink.displayName(metadata.ownerIdentity)
      ?? metadata.share[CKShare.SystemFieldKey.title].flatMap { ($0 as? String)?.replacingOccurrences(of: "Loop Me: ", with: "") }
      ?? "Family"
    if metadata.participantStatus != .accepted {
      do { _ = try await (try container).accept(metadata) }
      catch { throw CloudLinkError.failed("iCloud would not join the family link. " + CloudLink.describe(error)) }
    }
    let zone = metadata.share.recordID.zoneID
    let sameFamily = store.joinedZone == zone
    // Joining someone new replaces whoever this phone looked after before.
    if !sameFamily {
      if let old = store.joinedZone { _ = try? await (try container).sharedCloudDatabase.modifyRecordZones(saving: [], deleting: [old]) }
      store.setToken("shared", nil)
      store.clearShared()
      store.joinApproved = false
      store.joinedAt = Date().timeIntervalSince1970 * 1000
    }
    store.joinedOwnerName = ownerName
    store.joinedZone = zone
    CloudBus.shared.emit(["kind": "joined", "name": ownerName, "approved": store.joinApproved])
    if !store.joinApproved { try? await askToJoin(zone: zone) }
    Task { _ = try? await self.subscribe(); _ = try? await self.sync(notify: false) }
    return ownerName
  }

  /// Caretaker side: the "join" note that puts a yes/no question on the owner's phone.
  private func askToJoin(zone: CKRecordZone.ID) async throws {
    let c = try container
    let uid = try await c.userRecordID().recordName
    store.myUserID = uid
    let rec = CKRecord(recordType: LM_NOTE, recordID: CKRecord.ID(recordName: "join-" + uid, zoneID: zone))
    rec["checkId"] = "join" as CKRecordValue
    rec["verdict"] = "join" as CKRecordValue
    rec["text"] = uid as CKRecordValue
    rec["from"] = (store.myName.flatMap { $0.isEmpty ? nil : $0 } ?? "Someone") as CKRecordValue
    rec["at"] = Date() as CKRecordValue
    _ = try await c.sharedCloudDatabase.modifyRecords(saving: [rec], deleting: [], savePolicy: .allKeys)
  }

  /// Owner side: yes or no to someone who joined. A no takes them out of the share at once.
  func answer(userID: String, allow: Bool) async throws {
    let c = try container
    let db = c.privateCloudDatabase
    let rec = CKRecord(recordType: LM_NOTE, recordID: CKRecord.ID(recordName: "ans-" + userID, zoneID: ownZoneID))
    rec["checkId"] = "answer" as CKRecordValue
    rec["verdict"] = (allow ? "allow" : "deny") as CKRecordValue
    rec["text"] = userID as CKRecordValue
    rec["from"] = (store.ownerName ?? "") as CKRecordValue
    rec["at"] = Date() as CKRecordValue
    _ = try await db.modifyRecords(saving: [rec], deleting: [], savePolicy: .allKeys)
    store.requests = store.requests.filter { ($0["id"] as? String) != userID }
    if allow {
      if !store.approvedUsers.contains(userID) { store.approvedUsers = store.approvedUsers + [userID] }
      return
    }
    store.approvedUsers = store.approvedUsers.filter { $0 != userID }
    _ = try? await db.modifyRecords(saving: [], deleting: [CKRecord.ID(recordName: "join-" + userID, zoneID: ownZoneID)])
    if let share = try? await db.record(for: CKRecord.ID(recordName: CKRecordNameZoneWideShare, zoneID: ownZoneID)) as? CKShare {
      for p in share.participants where p.role != .owner && p.userIdentity.userRecordID?.recordName == userID {
        share.removeParticipant(p)
      }
      _ = try? await db.modifyRecords(saving: [share], deleting: [], savePolicy: .changedKeys)
    }
  }

  /// A CloudKit error in words a person can act on, with the code kept so
  /// support can look it up. Partial failures name the first inner error.
  static func describe(_ e: Error) -> String {
    let ns = e as NSError
    guard ns.domain == CKError.errorDomain, let code = CKError.Code(rawValue: ns.code) else { return ns.localizedDescription }
    let names: [CKError.Code: String] = [
      .internalError: "internalError", .partialFailure: "partialFailure", .networkUnavailable: "networkUnavailable",
      .networkFailure: "networkFailure", .badContainer: "badContainer", .serviceUnavailable: "serviceUnavailable",
      .requestRateLimited: "requestRateLimited", .notAuthenticated: "notAuthenticated", .permissionFailure: "permissionFailure",
      .unknownItem: "unknownItem", .invalidArguments: "invalidArguments", .serverRecordChanged: "serverRecordChanged",
      .serverRejectedRequest: "serverRejectedRequest", .zoneNotFound: "zoneNotFound", .limitExceeded: "limitExceeded",
      .userDeletedZone: "userDeletedZone", .quotaExceeded: "quotaExceeded", .zoneBusy: "zoneBusy",
      .accountTemporarilyUnavailable: "accountTemporarilyUnavailable", .managedAccountRestricted: "managedAccountRestricted",
    ]
    var parts: [String] = []
    switch code {
    case .notAuthenticated, .permissionFailure:
      parts.append("iCloud is switched off for Loop Me. In Settings, tap your name, then iCloud, then Apps, and turn Loop Me on.")
    case .networkUnavailable, .networkFailure, .serviceUnavailable, .requestRateLimited, .zoneBusy:
      parts.append("iCloud could not be reached. Check the connection and try again in a minute.")
    case .quotaExceeded:
      parts.append("iCloud storage is full on this account.")
    case .managedAccountRestricted:
      parts.append("This Apple account is managed and does not allow sharing.")
    case .badContainer, .invalidArguments, .serverRejectedRequest:
      parts.append("iCloud refused the request. Please send this message to support.")
    default: break
    }
    parts.append("[\(names[code] ?? "code \(ns.code)")] " + ns.localizedDescription)
    if let inner = (ns.userInfo[CKPartialErrorsByItemIDKey] as? [AnyHashable: NSError])?.values.first {
      parts.append("inner: " + inner.localizedDescription)
    }
    if let reason = ns.userInfo[NSLocalizedFailureReasonErrorKey] as? String { parts.append(reason) }
    return parts.joined(separator: " ")
  }

  /// Both sides at once. A phone can have its own people (owner) and also
  /// look after someone else (caretaker); neither hides the other.
  ///   linked/names: approved people who hear from this phone
  ///   watching/watchApproved: the person this phone looks after
  ///   requests: people waiting for a yes on this phone
  func linkStatus() async -> [String: Any] {
    var out: [String: Any] = [
      "linked": false, "role": "none", "name": NSNull(), "names": [String](),
      "watching": store.joinedOwnerName ?? NSNull(), "watchApproved": store.joinApproved,
      "requests": store.requests,
    ]
    let account = await accountState()
    out["account"] = account
    guard account == "available", let db = try? container.privateCloudDatabase,
          let share = try? await db.record(for: CKRecord.ID(recordName: CKRecordNameZoneWideShare, zoneID: ownZoneID)) as? CKShare else {
      store.migrateApproval(participants: [])
      if store.joinedZone != nil { out["role"] = "caretaker"; out["name"] = store.joinedOwnerName ?? NSNull(); out["watchApproved"] = store.joinApproved }
      return out
    }
    let joined = share.participants.filter { $0.role != .owner && $0.acceptanceStatus == .accepted }
    store.migrateApproval(participants: joined.compactMap { $0.userIdentity.userRecordID?.recordName })
    let approved = Set(store.approvedUsers)
    let ok = joined.filter { p in p.userIdentity.userRecordID.map { approved.contains($0.recordName) } ?? false }
    let names = ok.compactMap { CloudLink.displayName($0.userIdentity) }
    // A code is single use: once someone new has joined, take it down.
    let base = UserDefaults.standard.integer(forKey: "loopme.inviteCodeBase")
    if let old = store.inviteCode, joined.count > base {
      _ = try? await (try? container)?.publicCloudDatabase.modifyRecords(saving: [], deleting: [CKRecord.ID(recordName: "inv-" + old)])
      store.inviteCode = nil; store.inviteCodeAt = nil
    }
    UserDefaults.standard.set(joined.count, forKey: "loopme.inviteCodeBase")
    out["role"] = "owner"
    out["invited"] = ok.isEmpty
    out["count"] = ok.count
    out["names"] = names
    out["watchApproved"] = store.joinApproved
    if let p = ok.first {
      let name = CloudLink.displayName(p.userIdentity) ?? store.caretakerName ?? "your caretaker"
      store.caretakerName = name
      out["linked"] = true
      out["name"] = name
    } else if store.joinedZone != nil {
      // Shared nothing yet, but looks after someone: answer as the caretaker.
      out["role"] = "caretaker"
      out["name"] = store.joinedOwnerName ?? NSNull()
    }
    return out
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

  /// Owner side: the weekly picture for the caretaker. One record, always
  /// overwritten, so the caretaker's phone can say "quiet week" with numbers
  /// and show what is switched on. No message content travels in it.
  func publishPulse(_ p: [String: Any]) async throws {
    guard await accountState() == "available" else { throw CloudLinkError.noAccount }
    let rec = CKRecord(recordType: LM_PULSE, recordID: CKRecord.ID(recordName: "pulse", zoneID: ownZoneID))
    for key in ["checked7", "stopped7", "flagged7", "checked30", "stopped30"] {
      rec[key] = (p[key] as? Int ?? 0) as CKRecordValue
    }
    for key in ["filterOn", "callsOn", "notifOn"] {
      rec[key] = ((p[key] as? Bool ?? false) ? 1 : 0) as CKRecordValue
    }
    rec["version"] = (p["version"] as? String ?? "") as CKRecordValue
    rec["since"] = Date(timeIntervalSince1970: (p["since"] as? Double ?? 0) / 1000) as CKRecordValue
    rec["lastFiltered"] = Date(timeIntervalSince1970: (p["lastFiltered"] as? Double ?? 0) / 1000) as CKRecordValue
    rec["at"] = Date() as CKRecordValue
    let op = CKModifyRecordsOperation(recordsToSave: [rec], recordIDsToDelete: [])
    op.savePolicy = .allKeys
    let db = try container.privateCloudDatabase
    try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
      op.modifyRecordsResultBlock = { r in
        switch r { case .success: cont.resume(); case .failure(let e): cont.resume(throwing: e) }
      }
      db.add(op)
    }
  }

  /// Caretaker side: one overwritten record in the owner's zone. The owner's
  /// phone subscribes to its own zone, so this lands there as a silent push
  /// within seconds and the owner's app publishes whatever the text filter
  /// caught while it was closed. Fired when the caretaker opens the app.
  func ping() async {
    guard let zone = store.joinedZone, await accountState() == "available" else { return }
    let rec = CKRecord(recordType: LM_PING, recordID: CKRecord.ID(recordName: "ping", zoneID: zone))
    rec["at"] = Date() as CKRecordValue
    let op = CKModifyRecordsOperation(recordsToSave: [rec], recordIDsToDelete: [])
    op.savePolicy = .allKeys
    op.qualityOfService = .userInitiated
    (try? container.sharedCloudDatabase)?.add(op)
  }

  /// Owner side, from background refresh: every flagged entry the text filter
  /// or share sheet logged and nobody has published yet goes to the caretaker.
  /// The entries stay in the log for the app to fold into history later; they
  /// are only marked so the app does not publish them twice.
  func publishPendingFromFilter() async -> Bool {
    guard store.caretakerName != nil, !store.approvedUsers.isEmpty else { return true }
    guard await accountState() == "available" else { return false }
    let pending = SharedStore.unpublishedFlagged()
    if pending.isEmpty { return true }
    var done: [String] = []
    for e in pending {
      let c: [String: Any] = [
        "id": e["id"] ?? UUID().uuidString, "level": e["level"] ?? "red", "excerpt": e["excerpt"] ?? "",
        "reason": e["reason"] ?? "", "sender": e["sender"] ?? "", "asked": false,
        "from": store.ownerName ?? "", "at": e["at"] ?? Date().timeIntervalSince1970 * 1000,
      ]
      if (try? await publish(c)) != nil, let id = e["id"] as? String { done.append(id) }
    }
    SharedStore.markPublished(done)
    return done.count == pending.count
  }

  /// Owner side: tear the share down. The caretaker's phone loses access at once.
  func revoke() async throws {
    let db = try container.privateCloudDatabase
    let shareID = CKRecord.ID(recordName: CKRecordNameZoneWideShare, zoneID: ownZoneID)
    _ = try? await db.modifyRecords(saving: [], deleting: [shareID])
    _ = try? await db.modifyRecordZones(saving: [], deleting: [ownZoneID])
    store.caretakerName = nil
    store.approvedUsers = []
    store.requests = []
    store.setToken("private", nil)
  }

  // MARK: caretaker side

  /// Called from the AppDelegate when the caretaker opens the share link.
  func accept(_ metadata: CKShare.Metadata) {
    Task {
      do { try await self.acceptNow(metadata) }
      catch { CloudBus.shared.emit(["kind": "joinFailed", "message": (error as? LocalizedError)?.errorDescription ?? error.localizedDescription]) }
    }
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

  /// Either side: share the family secret word with the other phone. The
  /// newest word wins; an older one never overwrites a newer one.
  /// Returns the word that is now current, with its time.
  func putWord(_ word: String, at: Double) async throws -> [String: Any] {
    guard await accountState() == "available" else { throw CloudLinkError.noAccount }
    let db: CKDatabase
    let zone: CKRecordZone.ID
    // The word belongs to this phone's own family when it has one.
    if store.approvedUsers.isEmpty, let z = store.joinedZone { db = try container.sharedCloudDatabase; zone = z }
    else { db = try container.privateCloudDatabase; zone = ownZoneID }
    let id = CKRecord.ID(recordName: "secret-word", zoneID: zone)
    let rec: CKRecord
    if let existing = try? await db.record(for: id) {
      let theirAt = (existing["at"] as? Double) ?? 0
      if theirAt >= at, let w = existing.encryptedValues["word"] as? String { return ["word": w, "at": theirAt] }
      rec = existing
    } else {
      rec = CKRecord(recordType: LM_WORD, recordID: id)
    }
    rec.encryptedValues["word"] = word as CKRecordValue
    rec["at"] = at as CKRecordValue
    _ = try await db.modifyRecords(saving: [rec], deleting: [], savePolicy: .allKeys)
    return ["word": word, "at": at]
  }

  private static func emitWord(_ r: CKRecord) {
    guard let w = r.encryptedValues["word"] as? String else { return }
    CloudBus.shared.emit(["kind": "word", "word": w, "at": (r["at"] as? Double) ?? 0])
  }

  /// Caretaker side: leave. Removing the zone from the shared database is how
  /// a participant removes themselves from a share.
  func leave() async throws {
    if let zone = store.joinedZone {
      _ = try? await container.sharedCloudDatabase.modifyRecordZones(saving: [], deleting: [zone])
    }
    store.joinedOwnerName = nil
    store.joinedZone = nil
    store.joinApproved = false
    store.joinedAt = 0
    store.setToken("shared", nil)
    store.clearShared()
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
  /// side becomes a local notification. A phone can be on both sides.
  @discardableResult
  func sync(notify: Bool) async throws -> Int {
    guard await accountState() == "available" else { throw CloudLinkError.noAccount }
    var fresh = 0

    // Looking after someone: their zone, through the shared database.
    if let zone = store.joinedZone {
      // The join question never made it across (offline at the time): ask again.
      if !store.joinApproved, store.myUserID == nil { try? await askToJoin(zone: zone) }
      let (changed, _) = try await fetchChanges(db: container.sharedCloudDatabase, zone: zone, tokenKey: "shared")
      for r in changed where r.recordType == LM_NOTE {
        let verdict = (r["verdict"] as? String) ?? ""
        if verdict == "join" { continue }
        if verdict == "allow" || verdict == "deny" {
          guard let me = store.myUserID, (r["text"] as? String) == me else { continue }
          // An answer from an earlier time this phone joined does not count.
          let when = (r.modificationDate ?? (r["at"] as? Date) ?? Date()).timeIntervalSince1970 * 1000
          if store.joinedAt > 0, when < store.joinedAt - 120_000 { continue }
          if verdict == "allow" {
            if !store.joinApproved {
              store.joinApproved = true
              CloudBus.shared.emit(["kind": "approved", "name": store.joinedOwnerName ?? ""])
              if notify { CloudLink.notifySimple("You’re linked", "\(store.joinedOwnerName ?? "They") said yes. You’ll hear the moment a scam reaches their phone.") }
            }
          } else {
            let who = store.joinedOwnerName ?? "They"
            try? await leave()
            CloudBus.shared.emit(["kind": "denied", "name": who])
            if notify { CloudLink.notifySimple("Not linked", "\(who) said no on their phone.") }
            return fresh
          }
          continue
        }
        _ = store.appendNote(CloudLink.noteDict(r))
      }
      for r in changed where r.recordType == LM_CHECK {
        let dict = CloudLink.checkDict(r)
        // Only what happened after this phone joined.
        if let at = dict["at"] as? Double, store.joinedAt > 0, at < store.joinedAt - 60_000 { continue }
        if store.appendCheck(dict) {
          fresh += 1
          if store.joinApproved {
            if notify { CloudLink.notifyCheck(dict) }
            CloudBus.shared.emit(["kind": "check", "check": dict])
          }
        }
      }
      for r in changed where r.recordType == LM_WORD { CloudLink.emitWord(r) }
      for r in changed where r.recordType == LM_PULSE {
        let dict = CloudLink.pulseDict(r)
        store.pulse = dict
        CloudBus.shared.emit(["kind": "pulse", "pulse": dict])
      }
    }

    // My own zone: people asking to join, and notes from the people I said yes to.
    let zones = (try? await container.privateCloudDatabase.allRecordZones()) ?? []
    if zones.contains(where: { $0.zoneID.zoneName == LM_ZONE }) {
      let (changed, _) = try await fetchChanges(db: container.privateCloudDatabase, zone: ownZoneID, tokenKey: "private")
      for r in changed where r.recordType == LM_WORD { CloudLink.emitWord(r) }
      for r in changed where r.recordType == LM_NOTE {
        let verdict = (r["verdict"] as? String) ?? ""
        if verdict == "allow" || verdict == "deny" { continue }
        if verdict == "join" {
          guard let uid = r["text"] as? String else { continue }
          let name = (r["from"] as? String) ?? "Someone"
          if store.approvedUsers.contains(uid) {
            // Same person again (a reinstall): they were already allowed.
            try? await answer(userID: uid, allow: true)
            continue
          }
          if !store.requests.contains(where: { ($0["id"] as? String) == uid }) {
            let req: [String: Any] = ["id": uid, "name": name, "at": Date().timeIntervalSince1970 * 1000]
            store.requests = store.requests + [req]
            fresh += 1
            if notify { CloudLink.notifySimple("\(name) wants to link", "Open Loop Me to say yes or no.") }
            CloudBus.shared.emit(["kind": "request", "request": req])
          }
          continue
        }
        let dict = CloudLink.noteDict(r)
        if store.appendNote(dict) {
          fresh += 1
          if notify { CloudLink.notifyNote(dict) }
          CloudBus.shared.emit(["kind": "note", "note": dict])
        }
      }
    }
    if fresh == 0 { CloudBus.shared.emit(["kind": "synced"]) }
    return fresh
  }

  static func notifySimple(_ title: String, _ body: String) {
    let content = UNMutableNotificationContent()
    content.title = title
    content.body = body
    content.sound = .default
    content.threadIdentifier = "loopme-family"
    content.userInfo = ["kind": "link"]
    UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "link-" + UUID().uuidString, content: content, trigger: nil))
  }

  /// Handle a CloudKit push. Returns true when it was one of ours.
  func handleRemoteNotification(_ userInfo: [AnyHashable: Any]) async -> Bool {
    guard let info = userInfo as? [String: NSObject],
          let note = CKNotification(fromRemoteNotificationDictionary: info),
          note.containerIdentifier == LM_CONTAINER else { return false }
    _ = try? await sync(notify: true)
    // Owner: a push is also the moment to send anything the filter caught.
    _ = await publishPendingFromFilter()
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

  static func pulseDict(_ r: CKRecord) -> [String: Any] {
    [
      "checked7": (r["checked7"] as? Int) ?? 0,
      "stopped7": (r["stopped7"] as? Int) ?? 0,
      "flagged7": (r["flagged7"] as? Int) ?? 0,
      "checked30": (r["checked30"] as? Int) ?? 0,
      "stopped30": (r["stopped30"] as? Int) ?? 0,
      "filterOn": ((r["filterOn"] as? Int) ?? 0) == 1,
      "callsOn": ((r["callsOn"] as? Int) ?? 0) == 1,
      "notifOn": ((r["notifOn"] as? Int) ?? 0) == 1,
      "version": (r["version"] as? String) ?? "",
      "since": ((r["since"] as? Date)?.timeIntervalSince1970 ?? 0) * 1000,
      "lastFiltered": ((r["lastFiltered"] as? Date)?.timeIntervalSince1970 ?? 0) * 1000,
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
  var inviteCode: String? {
    get { d.string(forKey: "family.inviteCode") }
    set { d.set(newValue, forKey: "family.inviteCode") }
  }
  var inviteCodeAt: Date? {
    get { d.object(forKey: "family.inviteCodeAt") as? Date }
    set { d.set(newValue, forKey: "family.inviteCodeAt") }
  }
  var inviteCodeURL: String? {
    get { d.string(forKey: "family.inviteCodeURL") }
    set { d.set(newValue, forKey: "family.inviteCodeURL") }
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

  // Approval. A phone that joins writes a "join" note; the owner's phone asks
  // the person, and answers with an "allow" or "deny" note. Nothing reaches
  // the joining phone's screen until it is allowed.
  var myName: String? {
    get { d.string(forKey: "family.myName") }
    set { d.set(newValue, forKey: "family.myName") }
  }
  var myUserID: String? {
    get { d.string(forKey: "family.myUserID") }
    set { d.set(newValue, forKey: "family.myUserID") }
  }
  /// Caretaker side: when this phone joined. Checks from before are history it was never meant to see.
  var joinedAt: Double {
    get { d.double(forKey: "family.joinedAt") }
    set { d.set(newValue, forKey: "family.joinedAt") }
  }
  var joinApproved: Bool {
    get { d.bool(forKey: "family.joinApproved") }
    set { d.set(newValue, forKey: "family.joinApproved") }
  }
  /// Owner side: iCloud user ids this person said yes to.
  var approvedUsers: [String] {
    get { d.stringArray(forKey: "family.approvedUsers") ?? [] }
    set { d.set(newValue, forKey: "family.approvedUsers") }
  }
  /// Owner side: people waiting for a yes or no. [{ id, name, at }]
  var requests: [[String: Any]] {
    get { d.array(forKey: "family.requests") as? [[String: Any]] ?? [] }
    set { d.set(newValue, forKey: "family.requests") }
  }

  /// Links made before approval existed count as approved, once.
  func migrateApproval(participants: [String]) {
    guard !d.bool(forKey: "family.approvalMigrated") else { return }
    d.set(true, forKey: "family.approvalMigrated")
    if caretakerName != nil { approvedUsers = Array(Set(approvedUsers + participants)) }
    if joinedZone != nil && joinedAt == 0 { joinApproved = true }
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
  func clearShared() {
    d.removeObject(forKey: "family.checks"); d.removeObject(forKey: "family.notes"); d.removeObject(forKey: "family.pulse")
  }
  func resetTokens() {
    setToken("shared", nil); setToken("private", nil)
    d.removeObject(forKey: "family.checks"); d.removeObject(forKey: "family.notes"); d.removeObject(forKey: "family.pulse")
  }

  var pulse: [String: Any]? {
    get { d.dictionary(forKey: "family.pulse") }
    set { d.set(newValue, forKey: "family.pulse") }
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
      "checks": joinApproved || joinedZone == nil ? checks : [],
      "requests": requests,
      "watchApproved": joinApproved,
      "notes": notes,
      "ownerName": ownerName ?? NSNull(),
      "caretakerName": caretakerName ?? NSNull(),
      "joinedOwnerName": joinedOwnerName ?? NSNull(),
      "pulse": pulse ?? NSNull(),
    ]
  }
}
