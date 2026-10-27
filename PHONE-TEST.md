# Test Loop Me on your iPhone — every feature, no examples

The app installs signed with your own free Apple ID. No paid account is
needed for this. A free-signed install runs for 7 days, then just
reinstall with the same command.

## One-time phone setup (2 minutes)

1. **Developer Mode** — on the iPhone: Settings → Privacy & Security →
   Developer Mode → On → restart the phone. (If you don't see the menu item,
   plug the phone in, run the install once, and it will appear.)
2. **Trust the app** — after the first install: Settings → General →
   VPN & Device Management → tap "Apple Development: your Apple ID" →
   Trust.

## Install / reinstall

```bash
cd ~/fresh/LoopMe && npx expo run:ios --device "<your iPhone name>" --configuration Release
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

An iPhone on iOS 17, which has no Apple Intelligence — so the second
opinion comes from the bundled Core ML model (the verdict footer says
"On-device model"). On an iPhone 15 Pro or newer with iOS 26, the same build
automatically uses Apple Intelligence instead. Both are fully on-device; the
deterministic engine is always underneath both.

## Build 7: the parts that only work on real phones

The simulator cannot do any of these. You need the app on two iPhones signed
in to two different iCloud accounts (yours and a family member's, or a second
Apple ID on a spare phone).

**Family link, end to end (10 minutes)**

1. Phone A (the one being looked after): More, Watched over by, Choose someone
   and send the invite. Pick phone B's owner from contacts. Messages opens with
   one text containing a link. Send it.
2. Phone B: tap the link in the text. iOS asks to open it in Loop Me. The app
   opens on "You are looking after ...". Allow notifications when asked.
3. Phone A: the Watched over by screen fills in with B's name on its own
   within a few seconds.
4. Phone B: lock it and put it face down.
5. Phone A: paste "Your account is locked. Read me the 6 digit code we just
   sent you" and tap Check.
6. Phone B: within seconds a time-sensitive notification arrives with three
   buttons. Long-press it and tap "Tell them it is a scam" without opening
   the app.
7. Phone A: a green full-screen note appears on its own: "... says: it is a
   scam."
8. Phone B: open Loop Me. The same check is waiting full screen with the
   reply buttons. Tap "Write your own note", send one. Phone A gets it.
9. Either phone: Stop looking after / Stop ... hearing from this phone. The
   other phone's next check does not travel.

**Text filter (2 minutes)**

1. Settings, Apps, Messages, Unknown & Junk, pick Loop Me.
2. From a number that is not in phone A's contacts, text it: "Your parcel is
   held, pay the 1.99 redelivery fee at bit.ly/x8s2".
3. It lands in the Junk folder in Messages, silently. Open Loop Me: History
   shows it with "Stopped before it reached you", Home's tally counts it, and
   if the family link is on, phone B gets the alert.
4. Text "See you at 6, bring the photos". It arrives normally.

**Call directory (2 minutes)**

1. Settings, Apps, Phone, Call Blocking & Identification, switch Loop Me on.
2. In History, after three flagged texts from one number, tap Block this
   number. Ring from that number: it does not ring.
3. A number that sent one flagged text shows "Flagged by Loop Me" when it
   calls.

**Share sheet (1 minute)**

In Messages, long-press a text, More, Share (or select text in Safari or a
screenshot in Photos), tap Loop Me in the share sheet. The verdict card
appears over the app you were in. Open in Loop Me lands on the full verdict.

**Report (1 minute)**

On a red verdict, tap "Report it". Forward to 7726 opens Messages addressed to
7726 with the text. Report to the FTC copies the details and opens
reportfraud.ftc.gov.
