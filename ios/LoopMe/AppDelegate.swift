import Expo
import React
import CloudKit
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

    // The window is made by SceneDelegate: apps built with the iOS 27 SDK
    // must use the scene life cycle or iOS will not launch them.

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // CloudKit share links (the family invite). The module's push subscriber
  // listens for this and accepts the share, so nothing here imports the pod.
  public func application(_ application: UIApplication, userDidAcceptCloudKitShareWith metadata: CKShare.Metadata) {
    NotificationCenter.default.post(name: Notification.Name("LoopMeShareAccepted"), object: metadata)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

// One window, one scene. Starts React Native in the scene's window and
// passes links, universal links and family invites on to the same places
// the app delegate used to.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
          let app = UIApplication.shared.delegate as? AppDelegate else { return }
    let window = UIWindow(windowScene: windowScene)
    // Same green as the launch screen, so there is no white flash before the first frame.
    window.backgroundColor = UIColor(red: 0.051, green: 0.42, blue: 0.341, alpha: 1)
    self.window = window
    app.window = window
    // A cold launch from a link: hand the URL to React Native as a launch option
    // so Linking.getInitialURL() still returns it.
    var launch: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url { launch[.url] = url }
    app.reactNativeFactory?.startReactNative(withModuleName: "main", in: window, launchOptions: launch)
    window.makeKeyAndVisible()
    if let activity = connectionOptions.userActivities.first { self.scene(scene, continue: activity) }
    if let metadata = connectionOptions.cloudKitShareMetadata {
      // React Native needs a moment to start listening before the share is accepted.
      DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
        NotificationCenter.default.post(name: Notification.Name("LoopMeShareAccepted"), object: metadata)
      }
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for ctx in URLContexts {
      var opts: [UIApplication.OpenURLOptionsKey: Any] = [:]
      if let src = ctx.options.sourceApplication { opts[.sourceApplication] = src }
      _ = RCTLinkingManager.application(UIApplication.shared, open: ctx.url, options: opts)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(UIApplication.shared, continue: userActivity) { _ in }
  }

  // The family invite link, tapped while the app is installed.
  func windowScene(_ windowScene: UIWindowScene, userDidAcceptCloudKitShareWith metadata: CKShare.Metadata) {
    NotificationCenter.default.post(name: Notification.Name("LoopMeShareAccepted"), object: metadata)
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  // The React root view is white until the first frame. Paint it the launch
  // green so the hand-off from the launch screen is invisible.
  override func customize(_ rootView: UIView) {
    super.customize(rootView)
    rootView.backgroundColor = UIColor(red: 0.051, green: 0.42, blue: 0.341, alpha: 1)
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
