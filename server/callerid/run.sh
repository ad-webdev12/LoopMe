#!/bin/sh
# Rebuilds the PIR databases from input.txtpb and (re)starts PIRService.
# Safe to run from cron every day: a running service is told to reload.
set -e
cd "$(dirname "$0")"
export PATH="$HOME/.swiftpm/bin:$PATH"
[ -f input.txtpb ] || { echo "No input.txtpb. Run: FTC_API_KEY=... node build-dataset.mjs"; exit 1; }
mkdir -p icons
ConstructDatabase --icon-directory icons input.txtpb block.binpb identity.binpb
PIRProcessDatabase block-config.json
PIRProcessDatabase identity-config.json
BLOCK=$(wc -c < block.binpb); IDENT=$(wc -c < identity.binpb)
echo "block $BLOCK bytes, identity $IDENT bytes"
PID=$(pgrep -f "PIRService" || true)
if [ -n "$PID" ]; then
  kill -SIGHUP "$PID" && echo "reloaded PIRService ($PID)"
else
  nohup PIRService --hostname 0.0.0.0 --port "${PORT:-8080}" service-config.json > pirservice.log 2>&1 &
  echo "started PIRService on :${PORT:-8080}"
fi
