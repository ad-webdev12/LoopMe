# Run Loop Me In natively (Xcode + iOS Simulator)

This is the **full native build** — real fonts, deep links (`loopmein://`), local
notifications, share sheet — everything Expo Go can't do. Verified building with
**0 errors** on Xcode 26 / iOS 26 simulator.

## Fastest path (one command)

```bash
cd ~/fresh/LoopMeIn
npx expo run:ios                     # builds, installs, launches on a booted simulator
```

Pick a specific simulator:

```bash
npx expo run:ios --device "iPhone 17 Pro"
```

The first build takes a few minutes (compiles ~80 native pods); later runs are
incremental and fast. A Metro bundler starts automatically — leave it running.

## Open it in Xcode instead

```bash
cd ~/fresh/LoopMeIn
npx expo prebuild --platform ios     # only if ios/ doesn't exist yet
open ios/LoopMeIn.xcworkspace        # NOT the .xcodeproj — always the .xcworkspace
```

In Xcode: pick a simulator in the toolbar, press **⌘R**. (Start Metro first with
`npx expo start` if it isn't already running.)

## If ios/ isn't there (fresh clone)

The `ios/` folder is generated, not committed. Recreate it in one step:

```bash
npm install
npx expo prebuild --platform ios
cd ios && pod install && cd ..
npx expo run:ios
```

## Testing the deep links on the simulator

Because these come from *outside* the app, iOS shows a one-time
"Open in Loop Me In?" prompt — tap **Open**. (In-app taps and the real share
sheet never prompt.)

```bash
# a scam check → verdict screen
xcrun simctl openurl booted "loopmein://check?text=Chase%20fraud%20department%3A%20move%20your%20balance%20to%20a%20safe%20account%20now"

# full-screen red alert (what the Scam Alert automation fires)
xcrun simctl openurl booted "loopmein://alert?text=Pay%20with%20Apple%20gift%20cards%20today%20or%20your%20account%20closes"
```

## Notes

- **Choosing a role:** first launch shows the Welcome screen. Pick "This phone is
  mine" (elder) or "I'm a family member" (caretaker); switch anytime in Settings.
- **The "Open debugger to view warnings" toast** is a harmless dev-build overlay
  (one deprecation notice). It does not appear in a release build.
- **Release build** (no Metro, standalone app): `npx expo run:ios --configuration Release`.
