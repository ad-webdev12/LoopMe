# Loop Me: App Store submission kit

Everything you paste into App Store Connect. Written and ready.

---

## App identity

| Field | Value |
|---|---|
| **App name** (App Store listing) | Loop Me Scam Safety |
| **Display name** (under the icon) | Loop Me |
| **Subtitle** (30 char max) | Check any message for scams |
| **Bundle ID** | `com.loopmescamsafety.app` |
| **Primary category** | Utilities |
| **Secondary category** | Productivity |
| **Age rating** | 4+ |
| **Price** | Free |

> The listing name is **Loop Me Scam Safety** because plain "LoopMe" is already taken on
> the US App Store by LoopMe Group AB. The name under the icon stays the short "Loop Me",
> which is normal and allowed, Apple only requires the *listing* name to be unique.

---

## Promotional text (170 char max, editable anytime without review)

Scam texts are getting smarter. Loop Me checks any message in seconds, stops the worst before they reach you, and puts a scam on a family member's screen the moment it lands.

---

## Description

**Check any message before you trust it.**

Scam texts and calls target older adults every day: fake bank alerts, "your package is on hold," a grandchild in trouble, a code you're asked to read back. Loop Me is the calm second opinion that fits in your pocket.

Paste, share, or speak a message you're unsure about. In seconds, Loop Me gives you one plain answer, Stop, Be careful, or Looks okay, the one thing to do next, and a clear "show me why." No jargon. No judgment. Checking is never foolish.

**Real on-device intelligence.**
Loop Me reads each message right on your iPhone, using Apple Intelligence on the devices that support it and a built-in model on every other iPhone. Your messages never leave your phone. It works in airplane mode. There is no account, no ads, and nothing to pay.

**Keep your family in the loop.**
Link one person you trust. From then on, when a scam text reaches your phone, it appears on theirs the moment it happens, full screen, with three one-tap replies that land right back on your screen. No texts to forward, nothing to explain. It runs on your own iCloud, so nothing passes through us. If you look after a parent or grandparent, you see what was flagged, what they were told, and you can answer from the lock screen without opening anything.

**It works while the app is closed.**
Turn on the text filter and texts from numbers you do not know are checked before they reach you; scams go straight to Junk. Turn on the call directory and numbers that sent a scam show "Flagged by Loop Me" when they ring. Share any text, link or screenshot from Messages, WhatsApp or Mail and the answer appears right there.

**Built for the moment it matters.**
- A plain verdict with the one safe step to take
- A full-screen warning the moment a text looks like a scam
- Report it in one tap: forward to 7726, or to the FTC with the details already copied
- A family code word, the strongest defense against voice cloning
- A practice scam call, so the real one sounds familiar
- If the worst happens, a calm step-by-step recovery guide
- A dated PDF of your checks for your bank or the police

**Your privacy is the whole point.**
Every check happens on your device. There is no account and no server. The family link runs on your own iCloud. We cannot read your messages, and we never want to.

Loop Me. Ask us before you tap anything.

---

## Keywords (100 char max, comma-separated, no spaces)

scam,fraud,text,phishing,smishing,spam,protect,senior,elderly,safety,check,scam detector,family

---

## What's New (version 1.0.1, build 7)

The family link is new. Link one person you trust and a scam text on your phone appears on theirs the moment it happens, full screen, with one-tap replies that land back on your screen. No texts to forward. It runs on your own iCloud.

Loop Me now works while it is closed: a text filter for numbers you do not know (Settings › Messages › Unknown & Junk), a call directory that labels scam callers (Settings › Phone › Call Blocking), and a share sheet that checks anything from any app.

Also: one-tap reporting to 7726 and the FTC, a real PDF export for your bank, larger type throughout, honest wording on a clear result, and a detector that catches more of the long-tail cons.

---

## Privacy: App Privacy "Nutrition Label" answers

In App Store Connect → App Privacy, answer:

- **Do you collect data from this app?** → **No.**

That's it. Loop Me collects nothing: no analytics, no accounts, no identifiers, no message content. Everything is on-device. (The `PrivacyInfo.xcprivacy` manifest is already in the build, declaring only on-device UserDefaults use with reason `CA92.1`.)

---

## URLs you must provide (create these; one page each is fine)

- **Privacy Policy URL** (required), **live now**:
  `https://ad-webdev12.github.io/LoopMe/privacy.html`
  Generated from `PRIVACY.md` into `docs/` and served by GitHub Pages, so the page and the
  repo copy cannot drift apart. Re-run the generator and push to update it.
- **Support URL** (required), still to create. The repo's GitHub page works in a pinch:
  `https://github.com/ad-webdev12/LoopMe`, though a one-page site with an email address reads better.
- **Marketing URL:** optional, leave blank.

---

## Screenshots

The app ships **iPhone-only** (`supportsTablet: false`), so **no iPad screenshots are
required**, that is deliberate: the layouts are designed for a phone held in one hand,
and on an iPad they stretch badly. iPad owners can still install it and run it in iPhone
compatibility mode.

Required sizes: **6.7"** (iPhone 15/16/17 Pro Max) and **6.5"** are the main ones; App Store Connect accepts the 6.9"/6.7" set. Capture 3–5 from the simulator:

1. Home, "Check a message"
2. Verdict, a red "Stop" result
3. The full-screen scam alert
4. The family side (caretaker dashboard)
5. "Our promise" / privacy screen

Capture command (per screen, with the app open on it):
```bash
xcrun simctl io booted screenshot ~/Desktop/loopme-01.png
```
Frame them with device bezels in App Store Connect's media manager, or upload raw; Apple accepts full-resolution simulator shots.

---

## Before you submit: the fields only you can answer

- **Category**: Primary **Utilities**, Secondary **Productivity**. 
- **Age rating questionnaire**: everything "None" gives 4+.
- **EU trader status** (Business tab): required, and it blocks submission until answered.
- **App Privacy**: "Do you collect data from this app?" → **No**.

---

## Build 7 (1.0.1): what changed and what Apple needs to see

**Capabilities now in the build** (all must be enabled on the App ID; Xcode's automatic
signing adds them when you archive, but check the developer portal if signing complains):

- iCloud, CloudKit, container `iCloud.com.loopmescamsafety.app`
- Push Notifications (silent pushes carry the CloudKit changes)
- Background Modes: Remote notifications
- App Groups: `group.com.loopmescamsafety.app` (shared by the app and the three extensions)
- Time Sensitive Notifications

**Three new bundle IDs** are created automatically by Xcode the first time you archive:
`com.loopmescamsafety.app.textfilter`, `com.loopmescamsafety.app.calls`,
`com.loopmescamsafety.app.share`. They sign with the same team.

**CloudKit schema must be deployed to Production before release.** Development works
on its own, but App Store builds use the Production environment, which starts empty:

1. Run the app from Xcode on a real phone signed in to iCloud, open More › Watched over by,
   and send one invite. That creates the `Check` and `Note` record types in Development.
2. Open https://icloud.developer.apple.com, pick the container, Schema, then
   **Deploy Schema Changes to Production**. Confirm.

Without step 2 the family link silently fails on App Store builds.

**App Review notes** (paste into the Notes field):

> Loop Me checks messages for scams on the device. The family link (More › Watched over by)
> shares flagged checks between two phones through the user's own iCloud, with no server
> of ours. To test it you need two devices signed in to different iCloud accounts: on one,
> send the invite; on the other, tap the link in the text. The text filter and call
> directory extensions are switched on by the user in iOS Settings (Messages › Unknown &
> Junk, Phone › Call Blocking & Identification). The share extension appears in the share
> sheet for text, links and images. Nothing is uploaded anywhere.

**App Privacy answers stay "No, we do not collect data."** CloudKit records live in the
user's own iCloud account and are not accessible to the developer; Apple's guidance treats
this as data the user stores, not data the developer collects. The privacy policy says so
in plain words.

**What the reviewer will not be able to test on one phone:** the full-screen alert on the
caretaker's side. Everything else works on a single device.

## Export compliance

`ITSAppUsesNonExemptEncryption` is set to **false** in the build (Loop Me uses only Apple's standard HTTPS/crypto), so you won't be asked the encryption questions at upload.

---

## Submission steps (once your Apple Developer account is active)

1. **App Store Connect** → **Apps** → **+** → **New App**. Platform iOS, name "Loop Me", primary language English (U.S.), bundle ID `com.loopmescamsafety.app`, SKU `loopme-1`.
2. Fill the fields above (description, keywords, subtitle, promo text, category, URLs, App Privacy = No data collected).
3. In **Xcode**: open `ios/LoopMe.xcworkspace`, select **Any iOS Device (arm64)**, set the **Signing Team** on the LoopMe target **and on the three extension targets** (TextFilter, CallDirectory, ShareCheck) to your account, Automatically manage signing. The version is already 1.0.1, build 7.
4. **Product → Archive** → when it finishes, **Distribute App → App Store Connect → Upload**.
5. Back in App Store Connect, the build appears under the version in ~15 min. Attach it, add screenshots, then **Add for Review → Submit**.
6. Review is typically 24–48h. You'll get email at each step.

**Reality check:** submitting is the fast part; Apple's review time is the variable. Have the developer account active and this kit pasted in, and you can submit the same day the account activates.
