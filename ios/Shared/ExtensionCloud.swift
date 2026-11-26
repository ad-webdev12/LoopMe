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

  struct Reply { let text: String; let verdict: String; let from: String; let at: Date }

  /// The caretaker's answer to one check, if it has landed. Reads the owner's
  /// zone with the drawer's own change token, so it never takes changes away
  /// from the app's sync.
  static func reply(for checkId: String) async -> Reply? {
    let d = SharedStore.defaults
    let key = "drawer.noteToken"
    if let cached = d.dictionary(forKey: "drawer.reply." + checkId), let t = cached["text"] as? String {
      return Reply(text: t, verdict: cached["verdict"] as? String ?? "", from: cached["from"] as? String ?? "", at: Date(timeIntervalSince1970: cached["at"] as? Double ?? 0))
    }
    let zoneID = CKRecordZone.ID(zoneName: zone, ownerName: CKCurrentUserDefaultName)
    let cfg = CKFetchRecordZoneChangesOperation.ZoneConfiguration()
    if let data = d.data(forKey: key) { cfg.previousServerChangeToken = try? NSKeyedUnarchiver.unarchivedObject(ofClass: CKServerChangeToken.self, from: data) }
    let db = CKContainer(identifier: container).privateCloudDatabase
    let notes: [CKRecord] = await withCheckedContinuation { cont in
      let op = CKFetchRecordZoneChangesOperation(recordZoneIDs: [zoneID], configurationsByRecordZoneID: [zoneID: cfg])
      var found: [CKRecord] = []
      op.recordWasChangedBlock = { _, r in if case .success(let rec) = r, rec.recordType == "Note" { found.append(rec) } }
      op.recordZoneChangeTokensUpdatedBlock = { _, token, _ in
        if let token, let data = try? NSKeyedArchiver.archivedData(withRootObject: token, requiringSecureCoding: true) { d.set(data, forKey: key) }
      }
      op.recordZoneFetchResultBlock = { _, r in
        if case .success(let v) = r, let data = try? NSKeyedArchiver.archivedData(withRootObject: v.serverChangeToken, requiringSecureCoding: true) { d.set(data, forKey: key) }
      }
      op.fetchRecordZoneChangesResultBlock = { _ in cont.resume(returning: found) }
      op.qualityOfService = .userInitiated
      db.add(op)
    }
    // Remember every answer seen, so a later poll (with a newer token) still finds it.
    for n in notes {
      guard let cid = n["checkId"] as? String, let t = n["text"] as? String else { continue }
      let at = (n["at"] as? Date ?? Date()).timeIntervalSince1970
      d.set(["text": t, "verdict": n["verdict"] as? String ?? "", "from": n["from"] as? String ?? "", "at": at], forKey: "drawer.reply." + cid)
    }
    guard let c = d.dictionary(forKey: "drawer.reply." + checkId), let t = c["text"] as? String else { return nil }
    return Reply(text: t, verdict: c["verdict"] as? String ?? "", from: c["from"] as? String ?? "", at: Date(timeIntervalSince1970: c["at"] as? Double ?? 0))
  }
}
