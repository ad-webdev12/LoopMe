# Loop Me

**Check any message before you trust it — and keep your family in the loop.**

Loop Me is a scam-safety app for iPhone built for the people scammers actually target:
older adults, and the family members who look out for them. Paste, share, or speak a
suspicious message and get a committed verdict in plain words — **Stop**, **Be careful**,
or **Looks okay** — with one safe step and a one-tap way to ask family for a second opinion.

## Run it on your Mac

Anyone with a Mac can build and run the full app. The simulator needs **no
Apple account** of any kind.

**Prerequisites:** Xcode 16+ with the iOS platform installed, and Node 20+.

```bash
git clone https://github.com/ad-webdev12/LoopMe.git
cd LoopMe
npm install
```

Then start the bundler and build, in **two terminals**:

```bash
# terminal 1 — leave this running
npx expo start
```

```bash
# terminal 2 — builds the native app and launches it
npx expo run:ios
```

The first build generates the native iOS project, installs CocoaPods, compiles
and launches. It takes several minutes; later builds take seconds.

> **Why two terminals?** `npx expo run:ios` finishes by trying to open the app
> through the `expo-development-client` URL scheme, which this project does not
> install. That last step fails and takes the bundler down with it — the app
> still builds and installs correctly, but nothing loads. Starting the bundler
> separately avoids it entirely.

### Opening it in Xcode

The Xcode project is committed, so it opens directly. Open the **workspace**,
not the `.xcodeproj` — the project alone cannot see the CocoaPods dependencies.

```bash
git clone https://github.com/ad-webdev12/LoopMe.git
cd LoopMe
npm install
cd ios && pod install
open LoopMe.xcworkspace
```

Then press ▶ in Xcode.

Two things that are easy to trip over:

- **The bundler must be running.** ▶ produces a Debug build, which loads its
  JavaScript over the network from Metro. Run `npx expo start` in a terminal
  first, or the app opens to a red screen.
- **`pod install` is not optional.** `ios/Pods/` is not in this repository: it
  is 923MB and contains four `React.xcframework` binaries of 105-109MB each,
  past GitHub's 100MB per-file limit. `pod install` fetches them, and takes a
  few minutes the first time.

If `pod install` fails with `Unicode Normalization not appropriate for
ASCII-8BIT`, your shell has no UTF-8 locale. Fix it with:

```bash
export LANG=en_US.UTF-8
```

If the build cannot find Node, create `ios/.xcode.env.local` pointing at your
own install — it is git-ignored precisely because the path differs per machine:

```bash
echo "export NODE_BINARY=$(which node)" > ios/.xcode.env.local
```

### Other ways to run it

- **On a real iPhone:** plug it in, enable Developer Mode on the phone, sign
  into Xcode once with any free Apple ID (Xcode -> Settings -> Accounts), then
  `bash install-on-iphone.sh` (or `npx expo run:ios --device`). A full
  on-device walkthrough is in [PHONE-TEST.md](PHONE-TEST.md).
- **Engine only, no Xcode needed:** `npm test` runs the full detection suite and
  the fused-pipeline test in plain Node — no simulator, no build, a few seconds.
  `npm run bench` runs the six held-out benchmarks.

## Why it's different

- **Two-sided by design.** Every other checker ends at the verdict. Here the verdict is the
  middle: the elder taps *"Ask Sarah to look"*, Sarah's phone opens on the evidence with
  three one-tap answers, and her answer lands back as a saved, notification-backed record.
- **No server. Anywhere.** Family asks, replies, and pairing travel as deep links inside
  the family's own text messages. Analysis is 100% on-device — it works in airplane mode.
  There is nothing in the middle to breach, sell, or subpoena.
- **A caretaker playbook.** The family side explains *which* con it is, why it works
  psychologically, and gives a shame-free script for the conversation — the hardest part
  of the entire scam lifecycle, unserved by every competitor.
- **Detection that remembers.** The engine tracks conversation state (fake bank alert →
  "fraud department" call = the two-stage con), arms a 90-day recovery-scam guard after a
  victim completes the panic flow, and integrates a family code word against voice cloning.

## The engine

Deterministic, on-device, and fast (<10 ms): 40+ weighted intent rules across every major
scam family, unicode de-obfuscation (homoglyphs, zero-width characters), full link
forensics (look-alike domains by edit distance, brand-as-subdomain disguises, shorteners,
raw IPs, throwaway TLDs, offline blocklist), precision guards that subtract score for
known-good patterns, and the urgency × payment × secrecy triangle.

Measured, not vibes: `npm test` runs a 163-case labeled suite —
**100% recall on 82 scams, 0% false positives on 71 legit messages** —
including Spanish, French, and Portuguese scam families.

## Zero-friction entry

- **The button inside Messages** — long-press a message → More → Share →
  *Check with Loop Me*. Signed Shortcuts in `shortcuts/`; setup in
  [MESSAGES-BUTTON.md](MESSAGES-BUTTON.md).
- **Danger notifications** — keyword-triggered Message automations fire
  *"Possible scam detected"* and open the full-screen alert automatically. Built from
  parts Apple ships in every iPhone; no App Store app is allowed to do this natively.
- **Clipboard auto-offer** — copy a message anywhere, open the app, tap once.
- **Siri / Action Button** — *"Hey Siri, Check with Loop Me."*

## Run it

```bash
npm install
npx expo start --tunnel   # scan the QR with the iPhone Camera (Expo Go required)
npm test                  # engine test suite
```

Roles: pick **"This phone is mine"** (elder side) or **"I'm a family member"** (caretaker
side) on first launch — switchable in Settings.

## What waits for the native Xcode build

True Share Extension, SMS Filter, Live Activities ("Scam Risk: HIGH — waiting for
family…" on the Lock Screen), and first-class App Intents. Architecture and rationale in
[SHORTCUTS.md](SHORTCUTS.md). The state machines already exist; the native tier is a
rendering layer, not a redesign.

---

Built at the NJX hackathon. Companion projects: a React web checker and a macOS
Messages monitor that watches iMessage on the Mac (where Apple permits it) using the
same engine.
