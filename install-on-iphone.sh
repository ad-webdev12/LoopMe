#!/bin/bash
# Builds Loop Me (Release, self-contained) and installs it on the connected iPhone.
# One-time prerequisites, both done in a minute:
#   1. iPhone: Settings -> Privacy & Security -> Developer Mode -> On (done already)
#   2. Mac:    Xcode -> Settings -> Accounts -> + -> Apple ID (deysaurav77@gmail.com)
# After the first install, on the iPhone: Settings -> General ->
# VPN & Device Management -> trust "Apple Development: deysaurav77@gmail.com".
set -e
cd "$(dirname "$0")/ios"

UDID="${1:-00008120-000430212252201E}"   # Aarav's iPhone 14 Pro Max

echo "== Building (Release, signs with your free personal team)..."
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
