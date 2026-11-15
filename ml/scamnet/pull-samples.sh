#!/bin/sh
# Pulls the corrections people chose to share ("Help improve Loop Me" in
# Settings) out of the app's public CloudKit database into
# ml/scamnet/raw/users.csv, where build_corpus.py picks them up on the next
# training run. Nothing is read from anyone's private database.
#
# One-time setup: make a CloudKit management token at
#   https://icloud.developer.apple.com/dashboard  (container iCloud.com.loopmescamsafety.app,
#   Settings, Tokens, Management Tokens) and run  xcrun cktool save-token
#
#   sh ml/scamnet/pull-samples.sh
set -e
cd "$(dirname "$0")/../.."
TEAM="$(grep -m1 -o 'DEVELOPMENT_TEAM = [A-Z0-9]*' ios/LoopMe.xcodeproj/project.pbxproj | awk '{print $3}')"
OUT="ml/scamnet/raw/users.csv"; mkdir -p ml/scamnet/raw
TMP="$(mktemp -d)"; TOKEN=""; N=0
echo "text,label,country,at" > "$OUT"
while :; do
  xcrun cktool query-records --team-id "$TEAM" --container-id iCloud.com.loopmescamsafety.app \
    --environment production --database-type public --record-type Sample \
    --requested-fields text label country at --limit 200 ${TOKEN:+--continuation-token "$TOKEN"} > "$TMP/page.json"
  python3 - "$TMP/page.json" "$OUT" <<'PY'
import json, sys, csv
page = json.load(open(sys.argv[1])); w = csv.writer(open(sys.argv[2], "a"))
for r in page.get("records", []):
    f = r.get("fields", {})
    g = lambda k: (f.get(k) or {}).get("value", "")
    text, label = str(g("text")).strip(), str(g("label")).strip().lower()
    if len(text) >= 4 and label in ("scam", "safe"):
        w.writerow([text, label, g("country"), g("at")])
print(page.get("continuationToken", ""), end="")
PY
  TOKEN="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1])).get('continuationToken',''),end='')" "$TMP/page.json")"
  N=$((N+1)); [ -z "$TOKEN" ] && break
done
echo "$(( $(wc -l < "$OUT") - 1 )) shared corrections in $OUT"
