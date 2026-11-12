// Builds input.txtpb for ConstructDatabase from the FTC's public Do Not Call
// complaint data (https://api.ftc.gov/v0/dnc-complaints) and, when present,
// shared.txt (one number per line: numbers Loop Me users blocked and chose to
// share). Nothing here is verified by anyone; the label says "reported", and
// the thresholds keep one-off reports out.
//
//   FTC_API_KEY=... node build-dataset.mjs [days] [min_reports] [min_block]
import { writeFileSync, existsSync, readFileSync } from 'node:fs';

const KEY = process.env.FTC_API_KEY;
if (!KEY) { console.error('Set FTC_API_KEY (free at https://api.data.gov/signup/)'); process.exit(1); }
const DAYS = Number(process.argv[2] || 30);
const MIN_REPORTS = Number(process.argv[3] || 3);
const MIN_BLOCK = Number(process.argv[4] || 25);

const counts = new Map();
const add = (n, k = 1) => counts.set(n, (counts.get(n) || 0) + k);
const e164 = (raw) => {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d[0] === '1') return '+' + d;
  return null;
};

const day = (d) => d.toISOString().slice(0, 10);
const end = new Date();
for (let i = 0; i < DAYS; i++) {
  const d = new Date(end.getTime() - i * 86400000);
  let offset = 0;
  for (;;) {
    const url = `https://api.ftc.gov/v0/dnc-complaints?api_key=${KEY}&created_date_from="${day(d)} 00:00:00"&created_date_to="${day(d)} 23:59:59"&items_per_page=50&offset=${offset}`;
    const res = await fetch(url);
    if (res.status === 429) { await new Promise(r => setTimeout(r, 2000)); continue; }
    if (!res.ok) { console.error(day(d), res.status); break; }
    const body = await res.json();
    const rows = body.data || [];
    for (const r of rows) { const n = e164(r.attributes?.['company-phone-number']); if (n) add(n); }
    if (rows.length < 50) break;
    offset += 50;
  }
  process.stderr.write(`${day(d)}: ${counts.size} numbers so far\n`);
}

if (existsSync('shared.txt')) {
  for (const line of readFileSync('shared.txt', 'utf8').split('\n')) { const n = e164(line); if (n) add(n, 5); }
}

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const entries = [];
let labeled = 0, blocked = 0;
for (const [n, c] of counts) {
  if (c < MIN_REPORTS) continue;
  labeled++;
  const block = c >= MIN_BLOCK;
  if (block) blocked++;
  entries.push(`identities {\n  key: "${n}"\n  value {\n    name: "${esc(`Reported scam caller · ${c} report${c === 1 ? '' : 's'}`)}"\n    cache_expiry_minutes: 720\n    block: ${block}\n    category: IDENTITY_CATEGORY_BUSINESS\n  }\n}`);
}
// Apple's onboarding test identity.
entries.push(`identities {\n  key: "+14085551212"\n  value {\n    name: "Johnny Appleseed"\n    cache_expiry_minutes: 60\n    block: false\n    category: IDENTITY_CATEGORY_PERSON\n  }\n}`);
writeFileSync('input.txtpb', entries.join('\n') + '\n');
console.log(`${labeled} numbers labeled, ${blocked} blocked, from ${counts.size} reported in ${DAYS} days`);
