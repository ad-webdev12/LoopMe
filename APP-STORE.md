# Loop Me — App Store submission kit

Everything you paste into App Store Connect. Written and ready.

---

## App identity

| Field | Value |
|---|---|
| **App name** | Loop Me |
| **Subtitle** (30 char max) | Check any message for scams |
| **Bundle ID** | `com.loopme.app` |
| **Primary category** | Utilities |
| **Secondary category** | Lifestyle |
| **Age rating** | 4+ |
| **Price** | Free |

> If "Loop Me" is taken in App Store Connect, fallbacks: **Loop Me — Scam Check**, **Loop Me Safe**, **LoopMe Guard**.

---

## Promotional text (170 char max — editable anytime without review)

Scam texts are getting smarter. Loop Me checks any message in seconds, tells you plainly if it's safe, and lets you loop in family with one tap. Free, private, on your phone.

---

## Description

**Check any message before you trust it.**

Scam texts and calls target older adults every day — fake bank alerts, "your package is on hold," a grandchild in trouble, a code you're asked to read back. Loop Me is the calm second opinion that fits in your pocket.

Paste, share, or speak a message you're unsure about. In seconds, Loop Me gives you one plain answer — Stop, Be careful, or Looks okay — the one thing to do next, and a clear "show me why." No jargon. No judgment. Checking is never foolish.

**Real on-device intelligence.**
Loop Me reads each message right on your iPhone using Apple Intelligence, with a built-in model as backup on every device. Your messages never leave your phone. It works in airplane mode. There is no account, no ads, and nothing to pay.

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

- **Support URL:** a simple page with an email address (required)
- **Privacy Policy URL:** required. Draft text is in `PRIVACY.md` — host it anywhere (GitHub Pages, Notion, a Google Doc set to public).
- **Marketing URL:** optional.

---

## Screenshots

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

## Export compliance

`ITSAppUsesNonExemptEncryption` is set to **false** in the build (Loop Me uses only Apple's standard HTTPS/crypto), so you won't be asked the encryption questions at upload.

---

## Submission steps (once your Apple Developer account is active)

1. **App Store Connect** → **Apps** → **+** → **New App**. Platform iOS, name "Loop Me", primary language English (U.S.), bundle ID `com.loopme.app`, SKU `loopme-1`.
2. Fill the fields above (description, keywords, subtitle, promo text, category, URLs, App Privacy = No data collected).
3. In **Xcode**: open `ios/*.xcworkspace`, select **Any iOS Device (arm64)**, set the **Signing Team** to your account (Automatically manage signing), bump version if needed.
4. **Product → Archive** → when it finishes, **Distribute App → App Store Connect → Upload**.
5. Back in App Store Connect, the build appears under the version in ~15 min. Attach it, add screenshots, then **Add for Review → Submit**.
6. Review is typically 24–48h. You'll get email at each step.

**Reality check:** submitting is the fast part; Apple's review time is the variable. Have the developer account active and this kit pasted in, and you can submit the same day the account activates.
