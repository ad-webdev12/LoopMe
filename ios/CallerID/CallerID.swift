import Foundation
import IdentityLookup

// Live Caller ID Lookup (iOS 18). When a call comes in, iOS asks the Loop Me
// lookup service, over Private Information Retrieval, whether the number is
// known. The phone number itself never reaches the server: the query is
// encrypted and the server answers without being able to read it. The
// service and the dataset live in server/callerid in this repository.
//
// The URLs below must be subdomains over HTTPS once the app ships from the
// App Store (Apple's rule). While testing from Xcode any reachable host works.
@main
struct CallerID: LiveCallerIDLookupProtocol {
  var context: LiveCallerIDLookupExtensionContext {
    LiveCallerIDLookupExtensionContext(
      serviceURL: URL(string: "https://lookup.loopmescamsafety.app")!,
      tokenIssuerURL: URL(string: "https://issuer.loopmescamsafety.app")!,
      userTierToken: Data(base64Encoded: "TG9vcE1lLXB1YmxpYw==")!
    )
  }
}
