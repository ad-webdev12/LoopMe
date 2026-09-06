#!/bin/bash
# Builds Loop Me (Release, self-contained) and installs it on a connected iPhone.
#
# Usage:  bash install-on-iphone.sh [device-udid]
# With no argument it uses the only connected iPhone.
#
# One-time prerequisites, each about a minute:
#   1. iPhone: Settings -> Privacy & Security -> Developer Mode -> On, then restart.
#   2. Mac:    Xcode -> Settings -> Accounts -> + -> sign in with any Apple ID.
#              A free account is enough for installing on your own device.
# After the first install, trust the certificate on the iPhone:
#   Settings -> General -> VPN & Device Management -> tap your Apple ID -> Trust.
set -e
cd "$(dirname "$0")/ios"

UDID="$1"
if [ -z "$UDID" ]; then
  UDID=$(xcrun xctrace list devices 2>/dev/null \
    | grep -iE "iphone|ipad" | grep -v -i simulator \
    | head -1 | sed -E 's/.*\(([0-9A-Fa-f-]{25,})\).*/\1/')
fi
if [ -z "$UDID" ]; then
  echo "No connected iPhone found. Plug one in and unlock it, or pass its UDID:"
  echo "  bash install-on-iphone.sh <device-udid>"
  echo "Connected devices:"
  xcrun xctrace list devices 2>/dev/null | grep -v -i simulator | head -10
  exit 1
fi
echo "== Target device: $UDID"

echo "== Building (Release, signed with your own free personal team)..."
xcodebuild -workspace LoopMe.xcworkspace -scheme LoopMe -configuration Release \
  -destination "id=$UDID" -derivedDataPath /tmp/loopme-dd \
  -allowProvisioningUpdates build

APP=$(find /tmp/loopme-dd/Build/Products -name "LoopMe.app" -maxdepth 3 | head -1)
echo "== Installing $APP ..."
xcrun devicectl device install app --device "$UDID" "$APP"

echo "== Launching..."
xcrun devicectl device process launch --device "$UDID" com.loopme.app || true

echo "== Done. If the app will not open, trust the developer first:"
echo "   iPhone Settings -> General -> VPN & Device Management -> Trust."
