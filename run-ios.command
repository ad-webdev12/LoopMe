#!/bin/bash
# One-tap native run for Loop Me In.
# A fresh clone has no ios/ folder (it's generated, not committed), so Xcode has
# nothing to open. This script creates it, links the native pods, and launches
# the app on a simulator — everything the README's "fresh clone" steps do, in one go.
set -e
cd "$(dirname "$0")"
export LANG=en_US.UTF-8

echo "→ Installing JS dependencies (if needed)…"
[ -d node_modules ] || npm install

echo "→ Generating the native iOS project…"
npx expo prebuild --platform ios --no-install

echo "→ Linking native pods (first run takes a few minutes)…"
( cd ios && pod install )

echo "→ Building and launching on the simulator…"
npx expo run:ios

echo "✅ Loop Me In is running. To reopen later in Xcode:  open ios/*.xcworkspace"
