import SwiftUI
import WatchConnectivity
import WatchKit

// Loop Me on the wrist, for the person who hears about it. The iPhone app
// pushes the latest alerts and the number to call; a new scam alert taps the
// wrist (iOS mirrors the time-sensitive notification too) and one button
// rings them. Nothing is checked on the watch itself.

struct WatchAlert: Identifiable, Hashable {
  let id: String
  let level: String
  let excerpt: String
  let at: Double
  let reason: String
}

final class WatchStore: NSObject, ObservableObject, WCSessionDelegate {
  @Published var personName = ""
  @Published var phone = ""
  @Published var alerts: [WatchAlert] = []
  @Published var linked = false
  private var lastTop: String?

  override init() {
    super.init()
    load(WCSession.default.receivedApplicationContext)
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    DispatchQueue.main.async { self.load(session.receivedApplicationContext) }
  }
  func session(_ session: WCSession, didReceiveApplicationContext ctx: [String: Any]) {
    DispatchQueue.main.async { self.load(ctx) }
  }
  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    DispatchQueue.main.async { self.load(message) }
  }

  private func load(_ c: [String: Any]) {
    guard !c.isEmpty else { return }
    personName = c["name"] as? String ?? ""
    phone = c["phone"] as? String ?? ""
    linked = c["linked"] as? Bool ?? false
    let list = (c["alerts"] as? [[String: Any]] ?? []).map {
      WatchAlert(id: $0["id"] as? String ?? UUID().uuidString, level: $0["level"] as? String ?? "amber",
                 excerpt: $0["excerpt"] as? String ?? "", at: $0["at"] as? Double ?? 0, reason: $0["reason"] as? String ?? "")
    }
    if let top = list.first, top.id != lastTop, lastTop != nil, top.level == "red" {
      WKInterfaceDevice.current().play(.failure)
    }
    lastTop = list.first?.id
    alerts = list
  }
}

@main
struct LoopMeWatchApp: App {
  @StateObject private var store = WatchStore()
  var body: some Scene {
    WindowGroup { RootView().environmentObject(store) }
  }
}

struct RootView: View {
  @EnvironmentObject var store: WatchStore
  private let red = Color(red: 0.925, green: 0.188, blue: 0.075)
  private let amber = Color(red: 0.722, green: 0.471, blue: 0.102)
  private let green = Color(red: 0.051, green: 0.42, blue: 0.341)

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 10) {
          if !store.linked {
            Text("Open Loop Me on your iPhone to link a phone.").font(.footnote).foregroundStyle(.secondary)
          } else if store.alerts.isEmpty {
            Text("Quiet on \(store.personName.isEmpty ? "their" : store.personName + "’s") phone.").font(.headline)
          } else {
            ForEach(store.alerts.prefix(5)) { a in
              VStack(alignment: .leading, spacing: 4) {
                Text(a.level == "red" ? "Scam" : "Worth a look").font(.caption).bold().foregroundStyle(a.level == "red" ? red : amber)
                Text(a.excerpt).font(.footnote).lineLimit(4)
                Text(when(a.at)).font(.caption2).foregroundStyle(.secondary)
              }
              .padding(10)
              .frame(maxWidth: .infinity, alignment: .leading)
              .background(RoundedRectangle(cornerRadius: 10).fill(Color.white.opacity(0.08)))
            }
          }
          if !store.phone.isEmpty {
            Button {
              if let url = URL(string: "tel:" + store.phone.filter { "+0123456789".contains($0) }) {
                WKExtension.shared().openSystemURL(url)
              }
            } label: {
              Label("Call " + (store.personName.isEmpty ? "them" : store.personName), systemImage: "phone.fill")
                .frame(maxWidth: .infinity)
            }
            .tint(green)
            .buttonStyle(.borderedProminent)
          }
        }
        .padding(.horizontal, 4)
      }
      .navigationTitle("Loop Me")
    }
  }

  private func when(_ ms: Double) -> String {
    let d = Date(timeIntervalSince1970: ms / 1000)
    let f = DateFormatter()
    f.dateStyle = Calendar.current.isDateInToday(d) ? .none : .short
    f.timeStyle = .short
    return f.string(from: d)
  }
}
