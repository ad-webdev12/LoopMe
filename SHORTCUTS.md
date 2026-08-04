# Zero-friction entry points

The app already ships two of these; the third takes two minutes of setup on the phone.

## 1. Copy → open (built in, works today)

Copy any suspicious text anywhere (Messages, WhatsApp, Mail), then open Loop Me In.
A card appears at the top of the home screen: **"You copied a message — Check it now."**
One tap runs the check. Nothing is uploaded; the clipboard is read on the device only.

## 2. Family links (built in, works today)

"Ask my family" sends a normal text that carries a deep link. Tapping it on the family
phone opens Loop Me In directly on the answer screen. Replies come back the same way.

## 3. Share sheet + Siri, via an Apple Shortcut (two-minute setup)

Until the native build ships a true Share Extension, an Apple Shortcut gives the same
one-tap flow:

1. Open the **Shortcuts** app → **+** → name it **Check with Loop Me In**.
2. Add action **Receive Text from Share Sheet** (turn on "Show in Share Sheet").
3. Add action **URL** — set it to:
   - Expo Go (development): the URL that `npx expo start` prints, plus
     `/--/check?text=` and the Shortcut's **Shortcut Input** variable.
   - Installed app (native build): `loopmein://check?text=` + **Shortcut Input**.
4. Add action **Open URLs**.

Now any message can be shared → **Check with Loop Me In**, and
"Hey Siri, Check with Loop Me In" works too (Siri runs Shortcuts by name).

## What deliberately waits for the native Xcode build

These need capabilities Expo Go cannot load. They are designed, not half-built:

- **True Share Extension** — Loop Me In appears natively in every share sheet.
- **SMS Filter Extension** — unknown-sender texts checked automatically (Apple's
  `ILMessageFilterExtension`; the engine is already fast and offline, so it qualifies).
- **Live Activity** — after a red verdict with "ask family" pending, a Lock-Screen
  activity shows "Waiting for [name] to answer…" until the reply arrives.
- **App Intents** — first-class Siri phrases without the Shortcuts app.
- **Push notifications** — would require a server; the family-link design
  intentionally avoids one. Local notifications cover the reply moment.
- **CallKit call screening** — needs a curated number-reputation database and a
  paid data source; out of scope until there's real usage data.
