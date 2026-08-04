# The button inside Messages — setup (5 minutes, once)

Two shortcut files live in `shortcuts/` (copies are on the Mac's Desktop):

| File | What it does |
|---|---|
| `Check with Loop Me In.shortcut` | Adds Loop Me In to the **share sheet** and **Siri** |
| `Scam Alert.shortcut` | The automation payload: **danger notification** + opens the full-screen red alert |

Both point at the dev tunnel (`exp://jccots4-anonymous-8081.exp.direct/--/…`), so they
work while the dev server runs. For a native build, rebuild them with
`node shortcuts/build-shortcuts.mjs "loopmein://"`.

## Install the files on the iPhone

AirDrop both `.shortcut` files from the Mac to the iPhone (or send via iCloud Drive),
then tap each — Shortcuts opens and asks to add it. They're signed, so no
"untrusted shortcut" hoops.

## Flow 1 — the button in Messages (works on ANY message, including iMessage)

1. In Messages, **long-press** the scam message bubble
2. Tap **More…** (the bubble gets a checkmark)
3. Tap the **share arrow** (bottom-left)
4. Tap **Check with Loop Me In**

Loop Me In opens instantly with the verdict. Four taps, no copying, no typing.
This is the "exception" to Apple's rules: apps can't *read* Messages, but Messages
will happily *hand* a message to a shortcut.

Same shortcut also works from Mail, WhatsApp, Safari — anywhere text can be shared —
and by voice: **"Hey Siri, Check with Loop Me In."**

## Flow 2 — automatic danger notifications (the bold one)

Shortcuts automations CAN see incoming Messages content. Wire the keywords once:

1. Shortcuts app → **Automation** tab → **+**
2. Choose **Message** → **Message Contains:** `gift card` → When: leave sender empty
3. **Run Immediately** (turn OFF "Ask Before Running") → Next
4. Action: **Run Shortcut** → pick **Scam Alert** → for input, choose **Shortcut Input**
5. Repeat step 2–4 for the highest-value trigger phrases:
   - `gift card` · `safe account` · `verify your account` · `unpaid toll`
   - `arrest` · `bail` · `Bitcoin` · `redelivery fee` · `suspended`

Now when a text arrives containing any of those, the phone immediately shows
**"Possible scam detected — do not tap anything"** and opens Loop Me In's
full-screen red alert with the message already analyzed. That's the danger
notification Apple doesn't let any App Store app deliver — built from parts
Apple ships in every iPhone.

Honest limits: automations trigger on Messages only (not WhatsApp), keyword
matching happens before the full engine runs (the engine takes over the moment
the alert opens), and each keyword is a separate automation to create.
