import WidgetKit
import SwiftUI
import AppIntents

// One tap from the Home Screen, the Lock Screen or Control Center: open Loop
// Me on whatever was last copied. The widget itself reads nothing; the app
// reads the clipboard when it opens (iOS shows its own "pasted from" line).

struct Entry: TimelineEntry { let date = Date() }

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Entry { Entry() }
  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) { completion(Entry()) }
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    completion(Timeline(entries: [Entry()], policy: .never))
  }
}

let checkURL = URL(string: "loopmein://check?clip=1")!
let green = Color(red: 0.051, green: 0.42, blue: 0.341)

struct CheckWidgetView: View {
  @Environment(\.widgetFamily) var family
  var body: some View {
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        Image(systemName: "checkmark.shield.fill").font(.system(size: 26, weight: .semibold))
      }
    case .accessoryRectangular:
      HStack(spacing: 8) {
        Image(systemName: "checkmark.shield.fill").font(.system(size: 22, weight: .semibold))
        VStack(alignment: .leading, spacing: 1) {
          Text("Loop Me").font(.headline)
          Text("Check what I copied").font(.caption)
        }
      }
    default:
      VStack(alignment: .leading, spacing: 10) {
        Image(systemName: "checkmark.shield.fill").font(.system(size: 30, weight: .semibold)).foregroundColor(.white)
        Spacer(minLength: 0)
        Text("Check what I copied").font(.system(size: 17, weight: .bold)).foregroundColor(.white).lineLimit(2)
        Text("Loop Me").font(.system(size: 13, weight: .semibold)).foregroundColor(.white.opacity(0.8))
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
  }
}

struct CheckWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "com.loopmescamsafety.app.widget.check", provider: Provider()) { _ in
      if #available(iOS 17.0, *) {
        CheckWidgetView().containerBackground(green, for: .widget).widgetURL(checkURL)
      } else {
        CheckWidgetView().padding(16).background(green).widgetURL(checkURL)
      }
    }
    .configurationDisplayName("Check what I copied")
    .description("Copy a message, tap this, and Loop Me tells you if it is a scam.")
    .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular])
  }
}

// Control Center and the Action button (iOS 18). Opens the app on the clipboard.
@available(iOS 18.0, *)
struct OpenCheckIntent: AppIntent {
  static var title: LocalizedStringResource = "Check what I copied"
  static var description = IntentDescription("Opens Loop Me on the last message you copied.")
  static var openAppWhenRun = true
  func perform() async throws -> some IntentResult & OpensIntent {
    .result(opensIntent: OpenURLIntent(checkURL))
  }
}

@available(iOS 18.0, *)
struct CheckControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: "com.loopmescamsafety.app.widget.control") {
      ControlWidgetButton(action: OpenCheckIntent()) {
        Label("Check what I copied", systemImage: "checkmark.shield")
      }
    }
    .displayName("Check what I copied")
    .description("Loop Me checks the last message you copied.")
  }
}

@main
struct CheckWidgetBundle: WidgetBundle {
  var body: some Widget {
    CheckWidget()
    if #available(iOS 18.0, *) { CheckControl() }
  }
}
