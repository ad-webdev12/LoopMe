// Dumps every benchmark set and the labelled unit suite into ml/bench.csv so
// the Core ML trainer can score a model on exactly the messages the TypeScript
// engine is scored on. Nothing in this file is ever trained on.
//   node scripts/export-bench.mjs
import { writeFileSync, readFileSync, cpSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Rule verdict per message, so the trainer can report fused numbers.
const w = mkdtempSync(join(tmpdir(), 'lm-bench-'));
cpSync(join(root, 'src', 'engine'), w, { recursive: true });
for (const f of readdirSync(w)) {
  if (!f.endsWith('.ts')) continue;
  const p = join(w, f);
  let t = readFileSync(p, 'utf8').replace(/from '(\.\/[^']+?)'/g, (m, s) => s.endsWith('.ts') ? m : `from '${s}.ts'`);
  t = t.replace(/import \{ detect, Verdict, DetectorOptions \} from '\.\/ScamDetector\.ts';/,
    "import { detect } from './ScamDetector.ts';\nimport type { Verdict, DetectorOptions } from './ScamDetector.ts';");
  t = t.replace(/import \{ availableTier, classify, AiTier, AiJudgement \} from '\.\.\/\.\.\/modules\/scam-ai';/,
    "import { availableTier, classify } from './stub.ts';\nimport type { AiTier, AiJudgement } from './stub.ts';");
  writeFileSync(p, t);
}
writeFileSync(join(w, 'stub.ts'), `export type AiTier='foundation'|'coreml'|'builtin'|'none';
export interface AiJudgement{tier:AiTier;label:'scam'|'suspicious'|'safe';probability:number;reason:string;category:string;}
export async function availableTier():Promise<AiTier>{return 'none';}
export async function classify(_t:string):Promise<AiJudgement|null>{return null;}`);
const { instant } = await import('file://' + join(w, 'ai.ts'));
const q = s => '"' + String(s).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
const rows = [];
for (const b of ['dev','holdout','final','fresh4','fresh5','fresh6','wild','blind','blind2']) {
  const m = await import('./bench/' + b + '.mjs');
  for (const t of m.SCAM) rows.push([b, t, 'scam']);
  for (const t of m.LEGIT) rows.push([b, t, 'safe']);
}
// The unit suite: pull the string literals out of the two arrays.
const src = readFileSync(join(root, 'src/engine/ScamDetector.test.ts'), 'utf8');
const grab = (name) => {
  const start = src.indexOf('const ' + name + ': Case[] = ['); const end = src.indexOf('\n];', start);
  const body = src.slice(start, end);
  return [...body.matchAll(/^\s*\[\s*(['"`])((?:\\.|(?!\1).)*)\1\s*,/gm)].map(m => m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
};
for (const t of grab('SCAMS')) rows.push(['suite', t, 'scam']);
for (const t of grab('LEGIT')) rows.push(['suite', t, 'safe']);
writeFileSync(join(root, 'ml/bench.csv'), 'set,text,label,rule\n' + rows.map(r => [...r, instant(r[1]).level].map(q).join(',')).join('\n') + '\n');
const by = {}; for (const r of rows) { by[r[0]] ??= { scam: 0, safe: 0 }; by[r[0]][r[2]]++; }
console.log(by, 'total', rows.length);
