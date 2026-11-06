// Makes the training data look like real phones: typos, missing punctuation,
// ALL CAPS, emoji, digits for letters, run-together words. Writes
// ml/extra/noisy.csv from every other CSV in ml/ and ml/extra/. Deterministic.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = a => a[Math.floor(rnd() * a.length)];
function parse(csv) {
  const out = []; const lines = csv.split('\n').slice(1);
  for (const l of lines) { const m = l.match(/^"((?:[^"]|"")*)",(scam|safe)\s*$/); if (m) out.push({ text: m[1].replace(/""/g, '"'), label: m[2] }); }
  return out;
}
const rows = [];
for (const f of ['ml/scam-train.csv', ...readdirSync(join(root, 'ml/extra')).filter(f => f.endsWith('.csv') && f !== 'noisy.csv').map(f => 'ml/extra/' + f)])
  rows.push(...parse(readFileSync(join(root, f), 'utf8')));
const EMOJI = ['🚨', '⚠️', '✅', '📦', '💳', '🔒', '👉', '❗', '🎁', '📱'];
const LEET = { a: '4', e: '3', i: '1', o: '0', s: '5' };
const ops = [
  t => t.toUpperCase(),
  t => t.toLowerCase(),
  t => t.replace(/[.,!?'’"“”]/g, ''),
  t => t.split(' ').map(w => rnd() < 0.12 && w.length > 4 ? w.slice(0, 2) + w.slice(3) : w).join(' '),
  t => t.split(' ').map(w => rnd() < 0.08 && w.length > 3 ? w[0] + w[2] + w[1] + w.slice(3) : w).join(' '),
  t => pick(EMOJI) + ' ' + t,
  t => t + ' ' + pick(EMOJI),
  t => t.replace(/[aeios]/g, c => rnd() < 0.25 ? LEET[c] : c),
  t => t.split(' ').map((w, i, a) => rnd() < 0.06 && i < a.length - 1 ? w + a[i + 1].slice(0, 0) : w).join('  '),
  t => t.replace(/ (?=[a-z])/g, m => rnd() < 0.08 ? '' : m),
];
const q = s => '"' + s.replace(/"/g, '""') + '"';
const out = [];
for (const r of rows) {
  const n = 1;
  for (let k = 0; k < n; k++) {
    let t = r.text;
    const count = 1 + Math.floor(rnd() * 2);
    for (let j = 0; j < count; j++) t = pick(ops)(t);
    if (t !== r.text) out.push(q(t) + ',' + r.label);
  }
}
writeFileSync(join(root, 'ml/extra/noisy.csv'), 'text,label\n' + out.join('\n') + '\n');
console.log('noisy rows', out.length, 'from', rows.length);
