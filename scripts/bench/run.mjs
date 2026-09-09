// Benchmark runner for the fused pipeline (rules + learned model).
//   node --experimental-strip-types scripts/bench/run.mjs [dev|holdout]
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const which = ['dev','holdout','final','fresh4','fresh5','fresh6'].includes(process.argv[2]) ? process.argv[2] : 'dev';
const { SCAM, LEGIT } = await import(`./${which}.mjs`);

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

const { detect } = await import('file://' + join(w, 'ScamDetector.ts'));
const { instant } = await import('file://' + join(w, 'ai.ts'));

const run = (fn) => {
  let hit = 0, fp = 0; const misses = [], falses = [];
  for (const m of SCAM) (fn(m).level !== 'green') ? hit++ : misses.push(m);
  for (const m of LEGIT) (fn(m).level !== 'green') ? (fp++, falses.push(m)) : 0;
  return { hit, fp, misses, falses };
};
const R = run(detect), F = run(instant);
const acc = r => ((r.hit + (LEGIT.length - r.fp)) / (SCAM.length + LEGIT.length) * 100);

console.log(`\n══ ${which.toUpperCase()} benchmark — ${SCAM.length} scam / ${LEGIT.length} legit ══`);
console.log(`  rules only : caught ${R.hit}/${SCAM.length}  false alarms ${R.fp}/${LEGIT.length}   accuracy ${acc(R).toFixed(1)}%`);
console.log(`  FUSED      : caught ${F.hit}/${SCAM.length}  false alarms ${F.fp}/${LEGIT.length}   accuracy ${acc(F).toFixed(1)}%`);
if (process.env.SHOW) {
  if (F.misses.length) { console.log('\n  MISSED:'); F.misses.forEach(m => console.log('   - ' + m.slice(0, 84))); }
  if (F.falses.length) { console.log('\n  FALSE ALARMS:'); F.falses.forEach(m => console.log('   ! ' + m.slice(0, 84))); }
}
