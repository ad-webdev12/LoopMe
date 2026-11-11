import CloudKit
import Foundation

// The family link from inside an extension. The app owns the link
// (modules/scam-ai/ios/CloudLink.swift); this is the one write an extension
// needs: put a flagged check into the owner's shared zone so it lands on the
// caretaker's phone right now, not when the app next opens. Same container,
// same zone, same record shape, read from the same app group.
enum ExtensionCloud {
  private static let container = "iCloud.com.loopmescamsafety.app"
  private static let zone = "LoopMeFamily"

  /// First name of the person who hears about it, when this phone is the
  /// protected one and the link is up. Nil on the caretaker's phone or with
  /// no link.
  static var caretakerFirstName: String? {
    let d = SharedStore.defaults
    guard d.string(forKey: "family.joinedOwnerName") == nil, let n = d.string(forKey: "family.caretakerName") else { return nil }
    return n.split(separator: " ").first.map(String.init)
  }

  static func publish(id: String, level: String, excerpt: String, reason: String, at: Double) async -> Bool {
    guard caretakerFirstName != nil else { return false }
    let d = SharedStore.defaults
    let zoneID = CKRecordZone.ID(zoneName: zone, ownerName: CKCurrentUserDefaultName)
    let rec = CKRecord(recordType: "Check", recordID: CKRecord.ID(recordName: id, zoneID: zoneID))
    rec["level"] = level as CKRecordValue
    rec["excerpt"] = excerpt as CKRecordValue
    rec["reason"] = reason as CKRecordValue
    rec["sender"] = "" as CKRecordValue
    rec["asked"] = 1 as CKRecordValue
    rec["from"] = (d.string(forKey: "family.ownerName") ?? "") as CKRecordValue
    rec["at"] = Date(timeIntervalSince1970: at / 1000) as CKRecordValue
    let db = CKContainer(identifier: container).privateCloudDatabase
    return await withCheckedContinuation { cont in
      let op = CKModifyRecordsOperation(recordsToSave: [rec], recordIDsToDelete: [])
      op.savePolicy = .allKeys
      op.qualityOfService = .userInitiated
      op.modifyRecordsResultBlock = { r in
        if case .success = r { cont.resume(returning: true) } else { cont.resume(returning: false) }
      }
      db.add(op)
    }
  }
}
