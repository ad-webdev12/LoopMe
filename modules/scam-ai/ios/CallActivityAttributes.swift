import ActivityKit
import Foundation

// The Live Activity shown on the caretaker's lock screen and in the Dynamic
// Island while they are on the phone with the person they look after: the
// flagged text and the verdict, so both can read it together. Compiled into
// the app (through the ScamAi pod) and into the widget extension.
@available(iOS 16.1, *)
struct CallActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var excerpt: String
    var level: String     // red | amber
    var advice: String
  }
  var personName: String
}
