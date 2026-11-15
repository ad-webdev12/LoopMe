#!/bin/sh
# Compiles ScamNet (the fine-tuned transformer, with its Swift tokenizer) for
# macOS and scores it on ml/bench.csv, which it was never trained on. Fails
# if it misses too many scams or raises false alarms on plain messages.
#   sh scripts/check-scamnet.sh
set -e
cd "$(dirname "$0")/.."
OUT="$(mktemp -d)"
cp modules/scam-ai/ios/ScamNetRunner.swift "$OUT/"; cp ml/scamnet/parity.swift "$OUT/main.swift"
swiftc -O -o "$OUT/scamnet" "$OUT/ScamNetRunner.swift" "$OUT/main.swift" 2>&1 | grep -v warning || true
# bench.csv -> text,label,source,split
node -e '
const fs=require("fs");const s=fs.readFileSync("ml/bench.csv","utf8");const rows=[];let f="",row=[],q=false;
for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==="\""){if(s[i+1]==="\""){f+="\"";i++;}else q=false;}else f+=c;}else if(c==="\"")q=true;else if(c===","){row.push(f);f="";}else if(c==="\n"){row.push(f);rows.push(row);row=[];f="";}else f+=c;}
if(f||row.length){row.push(f);rows.push(row);}
const out=["text,label,source,split,rule"];for(const r of rows.slice(1)){if(r.length<3)continue;out.push([r[1],r[2],"bench_"+r[0],"test",r[4]||r[3]].map(v=>"\""+String(v).replace(/"/g,"\"\"")+"\"").join(","));}
fs.writeFileSync(process.argv[1],out.join("\n")+"\n");' "$OUT/bench.csv"
"$OUT/scamnet" modules/scam-ai/ios/Resources "$OUT/bench.csv" | tee "$OUT/result.txt"
# Gate on what ships: rules plus the model. At least 92% caught, at most 2% false alarms.
LINE=$(grep "rules + scamnet" "$OUT/result.txt")
CAUGHT=$(echo "$LINE" | sed -E 's/.*caught [0-9]+\/[0-9]+ \(([0-9.]+)%\).*/\1/')
FP=$(echo "$LINE" | sed -E 's/.*false alarms [0-9]+\/[0-9]+ \(([0-9.]+)%\).*/\1/')
if [ "$(echo "$CAUGHT < 92" | bc)" = 1 ] || [ "$(echo "$FP > 2.0" | bc)" = 1 ]; then echo "SCAMNET FAIL (caught $CAUGHT%, false alarms $FP%)"; exit 1; fi
echo "scamnet ok"
