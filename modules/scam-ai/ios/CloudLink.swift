import ExpoModulesCore
import Foundation
@preconcurrency import CloudKit

// The family link, over the family's own iCloud.
//
// Shape of it: the elder owns a private custom zone ("LoopMeFamily") holding
// one record per flagged check. That zone is shared with exactly one caretaker
// through a CKShare. The caretaker accepts once (a link that travels in a
// single ordinary text), and from then on every new check lands on their phone
// as a push — no further texts, nothing to read, nothing to parse.
//
// Why this and not a server: the records live in the elder's own iCloud, so
// there is still nothing of mine in the middle holding anyone's messages.

let LM_CONTAINER = "iCloud.com.loopmescamsafety.app"
let LM_ZONE = "LoopMeFamily"
let LM_RECORD = "Check"

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

final class CloudLink: @unchecked Sendable {
  static let shared = CloudLink()
  private let container = CKContainer(identifier: LM_CONTAINER)
  private var zoneID: CKRecordZone.ID {
    CKRecordZone.ID(zoneName: LM_ZONE, ownerName: CKCurrentUserDefaultName)
  }

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

  /// Create (or reuse) the shared zone and return a share URL to text once.
  func createInvite(myName: String) async throws -> String {
    guard await accountState() == "available" else { throw CloudLinkError.noAccount }
    let db = container.privateCloudDatabase

    // The zone is created once and reused; CloudKit errors harmlessly if it exists.
    let zone = CKRecordZone(zoneID: zoneID)
    _ = try? await db.modifyRecordZones(saving: [zone], deleting: [])

    // One share per zone. Reuse the existing one so a second invite does not
    // orphan the caretaker who already accepted the first.
    if let existing = try? await db.record(for: CKRecord.ID(recordName: CKRecordNameZoneWideShare, zoneID: zoneID)) as? CKShare,
       let url = existing.url {
      return url.absoluteString
    }

    let share = CKShare(recordZoneID: zoneID)
    share[CKShare.SystemFieldKey.title] = "Loop Me — \(myName)" as CKRecordValue
    share.publicPermission = .none          // invited caretaker only

    let saved = try await db.modifyRecords(saving: [share], deleting: [])
    for (_, result) in saved.saveResults {
      if case .success(let rec) = result, let s = rec as? CKShare, let url = s.url {
        return url.absoluteString
      }
    }
    throw CloudLinkError.failed("Could not create the family link")
  }

  /// Elder side: publish one flagged check into the shared zone.
  func publish(id: String, level: String, excerpt: String, reason: String, at: Double) async throws {
    guard await accountState() == "available" else { throw CloudLinkError.noAccount }
    let rec = CKRecord(recordType: LM_RECORD,
                       recordID: CKRecord.ID(recordName: id, zoneID: zoneID))
    rec["level"] = level as CKRecordValue
    rec["excerpt"] = excerpt as CKRecordValue
    rec["reason"] = reason as CKRecordValue
    rec["at"] = Date(timeIntervalSince1970: at / 1000) as CKRecordValue
    _ = try await container.privateCloudDatabase.modifyRecords(saving: [rec], deleting: [])
  }

  /// Caretaker side: everything shared with me, newest first.
  func fetchShared() async throws -> [[String: Any]] {
    guard await accountState() == "available" else { throw CloudLinkError.noAccount }
    let db = container.sharedCloudDatabase
    let zones = try await db.allRecordZones()
    var out: [[String: Any]] = []
    for z in zones where z.zoneID.zoneName == LM_ZONE {
      let q = CKQuery(recordType: LM_RECORD, predicate: NSPredicate(value: true))
      q.sortDescriptors = [NSSortDescriptor(key: "at", ascending: false)]
      guard let res = try? await db.records(matching: q, inZoneWith: z.zoneID) else { continue }
      for (_, r) in res.matchResults {
        guard case .success(let rec) = r else { continue }
        out.append([
          "id": rec.recordID.recordName,
          "level": (rec["level"] as? String) ?? "red",
          "excerpt": (rec["excerpt"] as? String) ?? "",
          "reason": (rec["reason"] as? String) ?? "",
          "at": ((rec["at"] as? Date)?.timeIntervalSince1970 ?? 0) * 1000,
          "from": z.zoneID.ownerName,
        ])
      }
    }
    return out
  }

  /// Caretaker side: a silent push whenever the elder adds a check.
  func subscribe() async throws {
    guard await accountState() == "available" else { throw CloudLinkError.noAccount }
    let sub = CKDatabaseSubscription(subscriptionID: "loopme-shared-checks")
    let note = CKSubscription.NotificationInfo()
    note.shouldSendContentAvailable = true     // wakes the app, no banner of its own
    sub.notificationInfo = note
    _ = try await container.sharedCloudDatabase.modifySubscriptions(saving: [sub], deleting: [])
  }
}
