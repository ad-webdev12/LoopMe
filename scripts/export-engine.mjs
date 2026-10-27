// Generates ios/Shared/Engine/engine.json from the TypeScript engine, plus a
// cases file the native port is checked against (scripts/check-engine.sh).
//
// The iPhone extensions (text filter, share sheet, call directory) cannot run
// JavaScript, so the detector is ported to Swift. The port reads its rule
// tables, link tables and model weights from this file rather than carrying a
// second copy of them, which is how the two stay the same detector.
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const w = mkdtempSync(join(tmpdir(), 'lm-export-'));
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

const det = await import('file://' + join(w, 'ScamDetector.ts'));
const links = await import('file://' + join(w, 'linkForensics.ts'));
const model = await import('file://' + join(w, 'model.ts'));
const feats = await import('file://' + join(w, 'features.ts'));
const norm = await import('file://' + join(w, 'normalize.ts'));
const ai = await import('file://' + join(w, 'ai.ts'));

const re = (r) => ({ source: r.source, flags: r.flags });
const T = det.ENGINE_TABLES, L = links.LINK_TABLES, F = feats.FEATURE_TABLES(), N = norm.NORMALIZE_TABLES, M = model.MODEL_RAW;

const out = {
  rules: T.RULES.map(r => ({ ...re(r.re), w: r.w, tag: r.tag, plain: r.plain })),
  knownGood: T.KNOWN_GOOD.map(r => ({ ...re(r.re), w: r.w, tag: r.tag })),
  payTags: [...T.PAY_TAGS], urgTags: [...T.URG_TAGS], codeWordTags: [...T.CODE_WORD_TAGS],
  links: {
    brands: L.BRANDS,
    securityWords: re(L.SECURITY_WORDS),
    shorteners: L.SHORTENERS,
    suspiciousTlds: L.SUSPICIOUS_TLDS,
    blockedDomains: [...L.BLOCKED_DOMAINS],
    blockedPatterns: L.BLOCKED_PATTERNS.map(re),
  },
  features: Object.fromEntries(Object.entries(F).map(([k, v]) => [k, re(v)])),
  normalize: { confusables: N.CONFUSABLES, punct: N.PUNCT, sensitive: re(N.SENSITIVE) },
  model: { dim: feats.DIM, charW: feats.CHAR_W, threshold: model.SCAM_THRESHOLD, bias: M.BIAS, idx: [...M.IDX], val: [...M.VAL].map(v => +v.toFixed(5)) },
};

const dir = join(root, 'ios', 'Shared', 'Engine');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'engine.json'), JSON.stringify(out));
console.log(`engine.json: ${out.rules.length} rules, ${out.knownGood.length} precision guards, ${out.model.idx.length} model weights`);

// Cases: the repo suite and the wild bench, with the verdict the TypeScript
// engine gives for each, so the Swift port can be checked message by message.
const suite = readFileSync(join(root, 'src', 'engine', 'ScamDetector.test.ts'), 'utf8');
const pick = (name) => {
  const m = suite.match(new RegExp(`const ${name}: Case\\[\\] = \\[([\\s\\S]*?)\\n\\];`));
  if (!m) return [];
  return [...m[1].matchAll(/\['((?:[^'\\]|\\.)*)',/g)].map(x => JSON.parse('"' + x[1].replace(/\\'/g, "'").replace(/"/g, '\\"') + '"'));
};
const wild = await import('file://' + join(root, 'scripts', 'bench', 'wild.mjs'));
const msgs = [...pick('SCAMS'), ...pick('LEGIT'), ...wild.SCAM, ...wild.LEGIT,
  'Grandma its me, I got in an accident, dont tell mom. Send $500 by Zelle now',
  'Hi Mum, this is my new number, my phone broke. Can you send me £200 until Friday, I will pay you back',
  'Your verification code is 482913. Do not share this code with anyone.',
  'Ｙｏｕｒ Ａｐｐｌｅ ＩＤ has been locked. Verify at apple.id-check.top',
  'Your pаypal account is limited. Confirm your identity: paypal.com-resolve.icu',
  'Did you authorize a $899 Zelle to M. Rivera? Reply NO to dispute.',
  'This is the fraud department, we need to move your funds to a safe account right away',
];
const cases = msgs.map(m => {
  const v = ai.instant(m);
  return { m, level: v.level, score: v.score, tags: v.tags, reason: v.reason, safeStep: v.safeStep, fused: v.fused, signals: v.signals.length };
});
writeFileSync(join(dir, 'cases.json'), JSON.stringify(cases));
console.log(`cases.json: ${cases.length} messages`);
