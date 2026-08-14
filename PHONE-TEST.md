# Test Loop Me on your iPhone — every feature, no examples

The app installs signed with your free Apple ID (deysaurav77@gmail.com). No paid
account needed for this. A free-signed install runs for 7 days, then just
reinstall with the same command.

## One-time phone setup (2 minutes)

1. **Developer Mode** — on the iPhone: Settings → Privacy & Security →
   Developer Mode → On → restart the phone. (If you don't see the menu item,
   plug the phone in, run the install once, and it will appear.)
2. **Trust the app** — after the first install: Settings → General →
   VPN & Device Management → tap "Apple Development: deysaurav77@gmail.com" →
   Trust.

## Install / reinstall

```bash
cd ~/fresh/LoopMe && npx expo run:ios --device "Aarav’s iPhone" --configuration Release
```

Release builds are self-contained — the phone does not need your Mac after
install.

## Feature test order (about 15 minutes)

Everything below is real data — nothing is pre-filled.

**First run**
1. Intro plays (3 animated beats). Get started.
2. "Whose phone is this?" → It's mine → privacy card → pick a real trusted
   contact from your contacts → Done, start checking.

**The core loop**
3. Type any ordinary text ("running late, see you at 6") → Check → green
   "Looks okay".
4. Copy this into Messages to yourself, then copy it and open Loop Me — the
   "Paste what I copied" shortcut appears. Check it:
   `Your package has a $1.95 redelivery fee. Confirm here: usps-redeliver-fee.co/8Kd21`
   → full-screen red alert → "Do not tap the link."
5. On the verdict: **Why we say that** (numbered reasons — the last one is the
   on-device AI's own sentence), **Read this to me, slowly** (word-by-word
   highlight; flagged words hold longer), **Loop in <your person>** → real
   Messages composer with the real text and link.
6. **Speak it** → allow mic + speech → say a message out loud → it types
   itself and checks. This phone does it fully on-device.
7. **Screenshot** → take a screenshot of any real text conversation first →
   allow photos → pick it → the words are read on the phone (Vision OCR) and
   checked.
8. **Photo** → point the camera at any printed text.

**Around the loop**
9. History tab — real stats, 7-day chart, day groups. Check the same scam
   text 3 times to see the repeat-sender warning.
10. People tab — your real person, one-tap call, the exact opening line of
    the real SMS this app sends.
11. More → Learn the tricks (5 cards), Settings (alerts, auto-check,
    safe senders, replay intro), "I think I've been scammed" (5 calm steps —
    step 5 opens the real FTC site).
12. More → Call screening → **this one is a demonstration**: iPhones do not
    let any app listen to a real phone call, so this screen shows how
    screening reads a scam call. Everything else in the app is live.

**Family link (needs a second iPhone — optional)**
13. Elder phone: More → "Watched over by" → read the 6-digit code.
    Caretaker phone: setup → "I look after someone" → enter the code → Ask
    them to accept → a real SMS goes over → tap the link on the elder phone →
    consent screen → Yes → caretaker gets the ward tab with live activity,
    quick notes land under the exact check.

**Siri and the Messages button**
14. AirDrop the two files on your Desktop (`Check with Loop Me.shortcut`,
    `Scam Alert.shortcut`) to the phone and add them. Then: select any text
    anywhere → Share → "Check with Loop Me" → the app opens straight into the
    verdict. Or say "Hey Siri, Check with Loop Me".

## What the AI tier shows on this phone

This iPhone runs iOS 17, which has no Apple Intelligence — so the second
opinion comes from the bundled Core ML model (the verdict footer says
"On-device model"). On an iPhone 15 Pro or newer with iOS 26, the same build
automatically uses Apple Intelligence instead. Both are fully on-device; the
deterministic engine is always underneath both.
