# Loop Me — App Store submission kit

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
> which is normal and allowed — Apple only requires the *listing* name to be unique.

---

## Promotional text (170 char max — editable anytime without review)

Scam texts are getting smarter. Loop Me checks any message in seconds, tells you plainly if it's safe, and lets you loop in family with one tap. Free, private, on your phone.

---

## Description

**Check any message before you trust it.**

Scam texts and calls target older adults every day — fake bank alerts, "your package is on hold," a grandchild in trouble, a code you're asked to read back. Loop Me is the calm second opinion that fits in your pocket.

Paste, share, or speak a message you're unsure about. In seconds, Loop Me gives you one plain answer — Stop, Be careful, or Looks okay — the one thing to do next, and a clear "show me why." No jargon. No judgment. Checking is never foolish.

**Real on-device intelligence.**
Loop Me reads each message right on your iPhone — using Apple Intelligence on the devices that support it, and a built-in model on every other iPhone. Your messages never leave your phone. It works in airplane mode. There is no account, no ads, and nothing to pay.

**Keep your family in the loop.**
Worried about a message? One tap sends it to someone you trust — they get an ordinary text, tap it, and answer with one button. Their reply comes straight back to your phone. If you look after a parent or grandparent, switch to the family side and see the checks they send you, answer instantly, and learn how each trick works so you can talk it through.

**Built for the moment it matters.**
- A plain verdict with the one safe step to take
- "Someone's calling me" — live help while the phone is in your hand
- "Before you send money" — a 20-second gut check
- A family code word — the strongest defense against AI voice-cloning
- If the worst happens, a calm step-by-step recovery guide with real fraud-line numbers

**Your privacy is the whole point.**
Every check happens on your device. Nothing is uploaded, stored, or sold. We can't read your messages — and we never want to.

Loop Me. Ask us before you tap anything.

---

## Keywords (100 char max, comma-separated, no spaces)

scam,fraud,text,phishing,smishing,spam,protect,senior,elderly,safety,check,scam detector,family

---

## What's New (version 1.0)

The first release of Loop Me. Check any message for scams on your own phone, and loop in family with one tap.

---

## Privacy — App Privacy "Nutrition Label" answers

In App Store Connect → App Privacy, answer:

- **Do you collect data from this app?** → **No.**

That's it. Loop Me collects nothing: no analytics, no accounts, no identifiers, no message content. Everything is on-device. (The `PrivacyInfo.xcprivacy` manifest is already in the build, declaring only on-device UserDefaults use with reason `CA92.1`.)

---

## URLs you must provide (create these — one page each is fine)

- **Privacy Policy URL** (required) — **live now**:
  `https://ad-webdev12.github.io/LoopMe/privacy.html`
  Generated from `PRIVACY.md` into `docs/` and served by GitHub Pages, so the page and the
  repo copy cannot drift apart. Re-run the generator and push to update it.
- **Support URL** (required) — still to create. The repo's GitHub page works in a pinch:
  `https://github.com/ad-webdev12/LoopMe`, though a one-page site with an email address reads better.
- **Marketing URL:** optional, leave blank.

---

## Screenshots

The app ships **iPhone-only** (`supportsTablet: false`), so **no iPad screenshots are
required** — that is deliberate: the layouts are designed for a phone held in one hand,
and on an iPad they stretch badly. iPad owners can still install it and run it in iPhone
compatibility mode.

Required sizes: **6.7"** (iPhone 15/16/17 Pro Max) and **6.5"** are the main ones; App Store Connect accepts the 6.9"/6.7" set. Capture 3–5 from the simulator:

1. Home — "Check a message"
2. Verdict — a red "Stop" result
3. The full-screen scam alert
4. The family side (caretaker dashboard)
5. "Our promise" / privacy screen

Capture command (per screen, with the app open on it):
```bash
xcrun simctl io booted screenshot ~/Desktop/loopme-01.png
```
Frame them with device bezels in App Store Connect's media manager, or upload raw — Apple accepts full-resolution simulator shots.

---

## Before you submit — the fields only you can answer

- **Category**: Primary **Utilities**, Secondary **Productivity**. (Was still empty last I saw.)
- **Age rating questionnaire**: everything "None" gives 4+.
- **EU trader status** (Business tab): required, and it blocks submission until answered.
- **App Privacy**: "Do you collect data from this app?" → **No**.

---

## When CloudKit ships (v1.1) these must change

The family link currently travels as a text message. Once checks sync through the elder's
own iCloud, three things stop being accurate and have to be revised together:

1. The description line "they get an ordinary text message" — the caretaker will need the app.
2. `PRIVACY.md` (and therefore the hosted page): "no server at all" becomes "your own iCloud,
   never ours". Still no server of mine, but it is no longer literally nothing leaving the phone.
3. App Privacy answers, if any data is judged to leave the device.

---

## Export compliance

`ITSAppUsesNonExemptEncryption` is set to **false** in the build (Loop Me uses only Apple's standard HTTPS/crypto), so you won't be asked the encryption questions at upload.

---

## Submission steps (once your Apple Developer account is active)

1. **App Store Connect** → **Apps** → **+** → **New App**. Platform iOS, name "Loop Me", primary language English (U.S.), bundle ID `com.loopmescamsafety.app`, SKU `loopme-1`.
2. Fill the fields above (description, keywords, subtitle, promo text, category, URLs, App Privacy = No data collected).
3. In **Xcode**: open `ios/*.xcworkspace`, select **Any iOS Device (arm64)**, set the **Signing Team** to your account (Automatically manage signing), bump version if needed.
4. **Product → Archive** → when it finishes, **Distribute App → App Store Connect → Upload**.
5. Back in App Store Connect, the build appears under the version in ~15 min. Attach it, add screenshots, then **Add for Review → Submit**.
6. Review is typically 24–48h. You'll get email at each step.

**Reality check:** submitting is the fast part; Apple's review time is the variable. Have the developer account active and this kit pasted in, and you can submit the same day the account activates.
