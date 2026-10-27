#!/bin/sh
# Runs add-extensions.rb with the Ruby that CocoaPods ships (it has xcodeproj).
set -e
cd "$(dirname "$0")/../.."
WRAP="$(command -v pod)"
GEMS="$(grep -o 'GEM_HOME="[^"]*"' "$WRAP" 2>/dev/null | head -1 | sed 's/GEM_HOME=//; s/"//g')"
if [ -n "$GEMS" ] && [ -f "$GEMS/bin/pod" ]; then
  RUBY="$(head -1 "$GEMS/bin/pod" | sed 's/^#!//')"
  GEM_HOME="$GEMS" exec "$RUBY" scripts/ios/add-extensions.rb
fi
exec ruby scripts/ios/add-extensions.rb
