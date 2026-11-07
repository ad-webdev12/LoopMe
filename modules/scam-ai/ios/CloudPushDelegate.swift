import ExpoModulesCore
import UIKit
import CloudKit
import BackgroundTasks

// Registered through expo-module.config.json. Expo forwards the app delegate
// calls here alongside every other module's subscriber.
//
// Two jobs: ask iOS for a push token at launch (CloudKit subscriptions ride on
// silent pushes, which need no permission prompt), and when a push arrives,
// pull what changed and raise the local notification while the app is still
// in the background. That is what makes a flagged text land on the
// caretaker's phone whether or not Loop Me is open.
public class CloudPushDelegate: ExpoAppDelegateSubscriber {
  private var shareObserver: NSObjectProtocol?

  public func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    application.registerForRemoteNotifications()
    // Background refresh: iOS wakes us now and then. We use it for one thing:
    // anything the text filter caught while the app was closed goes to the
    // caretaker, so they hear about it without the elder opening Loop Me.
    BGTaskScheduler.shared.register(forTaskWithIdentifier: LM_REFRESH_TASK, using: nil) { task in
      CloudPushDelegate.scheduleRefresh()
      let work = Task {
        let ok = await CloudLink.shared.publishPendingFromFilter()
        task.setTaskCompleted(success: ok)
      }
      task.expirationHandler = { work.cancel() }
    }
    CloudPushDelegate.scheduleRefresh()
    // The AppDelegate posts the accepted share here (see AppDelegate.swift),
    // so the app target never has to import this pod.
    shareObserver = NotificationCenter.default.addObserver(forName: Notification.Name("LoopMeShareAccepted"), object: nil, queue: .main) { note in
      if let metadata = note.object as? CKShare.Metadata { CloudLink.shared.accept(metadata) }
    }
    return true
  }

  public func applicationDidEnterBackground(_ application: UIApplication) {
    CloudPushDelegate.scheduleRefresh()
  }

  static func scheduleRefresh() {
    let req = BGAppRefreshTaskRequest(identifier: LM_REFRESH_TASK)
    req.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
    try? BGTaskScheduler.shared.submit(req)
  }

  public func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    Task {
      let ours = await CloudLink.shared.handleRemoteNotification(userInfo)
      completionHandler(ours ? .newData : .noData)
    }
  }
}
