# Publishing Loop Me to TestFlight — the whole path

Everything in "Already done" is finished and verified. Start at Step 1.

## Already done (do not redo)

- Bundle ID `com.loopmescamsafety.app` matches the App Store Connect record,
  in app.json, both Xcode build configs, and the Info.plist URL scheme.
- Version 1.0.1, build 7 (1.0.0 build 5 is the one in review).
- iPhone-only, icon alpha-free, launch screen, all five privacy strings,
  privacy manifest, export-compliance flag set.
- The empty `ReactNativeDependencies.xcframework` that broke archiving is
  restored, and the corrupted DerivedData is cleared.
- Verified: `xcodebuild ... archive` reports ARCHIVE SUCCEEDED.

## Step 1 — Fix the Xcode account (the current blocker)

Xcode's stored credential is corrupt ("missing Xcode-Username"), which is why
it cannot create the Apple Distribution certificate the App Store requires.
You currently have only a Development certificate.

1. Open Xcode -> Settings (Cmd+,) -> Accounts
2. If deysaurav77@gmail.com is listed, select it and click the minus button
3. Click plus -> Apple ID -> sign in
4. Confirm your PAID team is listed, not only "(Personal Team)"

## Step 2 — Archive (from the Xcode app, not the terminal)

```bash
cd ~/fresh/LoopMe && open ios/LoopMe.xcworkspace
```

1. Top of the window: set the destination to **Any iOS Device (arm64)**
2. Product -> Archive  (5-10 minutes)
3. If a keychain dialog appears, click **Always Allow** (not "Allow")

Signing must run from the Xcode app. From a terminal it fails with
`errSecInternalComponent`, because codesign cannot show you that dialog.

In the Organizer, pick the archive dated TODAY. The right-hand panel must read
`com.loopmescamsafety.app`. Ignore the Oct 7 archive — it has the old bundle ID
and will not attach to your app record.

## Step 3 — Upload

Distribute App -> App Store Connect -> Upload -> keep the defaults ->
Automatically manage signing -> Upload.

If Xcode offers to create a distribution certificate, say yes.

## Step 4 — Finish the listing while the build processes

In App Store Connect:

- **Category** (required): Primary **Utilities**, Secondary **Productivity**
- **Trader status** under Business, if the EU banner is showing
- Delete any stray `com.loopme.app` app record from the earlier attempt

## Step 5 — TestFlight

Your app -> TestFlight tab. The build shows "Processing" for 5-15 minutes.
Answer **No** to export compliance if asked.

- **Internal testing**: add yourself, installs immediately, no review.
- **External testing**: needs a Beta App Review plus a privacy policy URL.

## Re-uploading later

Apple rejects a repeated build number. Before each new upload, raise
`ios.buildNumber` in app.json (1 -> 2 -> 3), then archive again.

## If the archive fails

"Command PhaseScriptExecution failed with a nonzero exit code" is a wrapper,
not the cause. Find the real error:

```bash
cd ~/fresh/LoopMe/ios
xcodebuild -workspace LoopMe.xcworkspace -scheme LoopMe -configuration Release \
  -destination 'generic/platform=iOS' -archivePath /tmp/t.xcarchive \
  CODE_SIGNING_ALLOWED=NO archive 2>&1 | grep -E " error:|No such file" | head
```

If that succeeds, the code is fine and the problem is signing (Step 1).
Two failures seen before, both already fixed: corrupted DerivedData
(`rm -rf ~/Library/Developer/Xcode/DerivedData/LoopMe-*`) and an empty
ReactNativeDependencies.xcframework (`rm -rf ios/Pods/ReactNativeDependencies`
then `cd ios && pod install`).
