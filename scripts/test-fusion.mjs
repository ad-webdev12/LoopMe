// Fused-pipeline test: rules + the learned model together, which is what the
// app actually runs. The messages here are held deliberately OUTSIDE the
// training corpus and outside the rule table's vocabulary, and several legit
// ones are adversarial twins of a scam above them ("I run a small pottery
// class" against "I run a small crypto desk"). It asserts two things:
//   1. fusion catches strictly more than the rules alone
//   2. fusion adds no false alarms
// Fusion may only ever raise a verdict, so any false positive here is one a
// person would actually see.
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const w = mkdtempSync(join(tmpdir(), 'lm-fusion-'));
cpSync(join(root, 'src', 'engine'), w, { recursive: true });
for (const f of readdirSync(w)) {
  if (!f.endsWith('.ts')) continue;
  const p = join(w, f);
  let t = readFileSync(p, 'utf8').replace(/from '(\.\/[^']+?)'/g, (m, s) => s.endsWith('.ts') ? m : `from '${s}.ts'`);
  t = t.replace(/import \{ detect, Verdict, DetectorOptions \} from '\.\/ScamDetector\.ts';/,
    "import { detect } from './ScamDetector.ts';\nimport type { Verdict, DetectorOptions } from './ScamDetector.ts';");
  t = t.replace(/import \{ availableTier, classify, AiTier, AiJudgement \} from '\.\.\/\.\.\/modules\/scam-ai';/,
    "import { availableTier, classify } from './scam-ai-stub.ts';\nimport type { AiTier, AiJudgement } from './scam-ai-stub.ts';");
  writeFileSync(p, t);
}
// Native tier is absent off-device; this is exactly the 'builtin'-only path
// that most phones take, which is the one worth testing here.
writeFileSync(join(w, 'scam-ai-stub.ts'), `export type AiTier='foundation'|'coreml'|'builtin'|'none';
export interface AiJudgement{tier:AiTier;label:'scam'|'suspicious'|'safe';probability:number;reason:string;category:string;}
export async function availableTier():Promise<AiTier>{return 'none';}
export async function classify(_t:string):Promise<AiJudgement|null>{return null;}`);

const { detect } = await import('file://' + join(w, 'ScamDetector.ts'));
const { instant } = await import('file://' + join(w, 'ai.ts'));

const SCAMS = [
  "Ms Chen from the Inland Revenue here. Our records show a discrepancy in your filing. This is a formal matter and I would advise you not to discuss it while the investigation is open.",
  "Nan!! Locked out of my accounts and mum's not picking up. Can you send something to tide me over till Friday? I'll explain properly later.",
  "Your policy is set to auto-renew at a higher rate. To lock in the old price, confirm your card details on the portal before Friday.",
  "Hello, this is the technical department. We are seeing your router broadcasting on an insecure channel. I can fix it remotely if you let me on.",
  "Congratulations, your number was picked in our customer draw. To release the funds we just need the small transfer levy cleared first.",
  "I run a small crypto desk and my client list is closed, but a mutual friend spoke highly of you. Minimum entry is modest and returns are steady.",
  "Delivery attempted. Reschedule required. A handling amount of 1.79 is outstanding before we can release the item to you.",
  "This is a courtesy call regarding suspicious use of your national insurance number. Do not discuss this call with anyone until we verify you.",
  "Hi, sorry to bother — it's me from number 42. Had a bit of an emergency and I'm short. Could you help and I'll drop it back tomorrow?",
  "Your account will be closed for inactivity unless you log in through the secure portal today. Use the address in this message.",
  "We can help you claw back what you lost in that investment. Our success fee is only payable up front.",
  "Hola, soy del banco. Hemos detectado un cargo sospechoso. No cuelgue y confirme sus datos por favor.",
];
const LEGIT = [
  "Ms Chen from the surgery here — your repeat prescription is ready whenever you want to pop in.",
  "Nan!! Just got my exam results and I passed everything!! Ringing you tonight xx",
  "Your policy auto-renews next month at the same rate. Nothing to do, but the documents are in your account if you want a look.",
  "Hello, it's the engineer about your broadband appointment tomorrow — I should be with you between 9 and 11.",
  "Congratulations on the new job! We're all so pleased for you. Drinks on Friday to celebrate?",
  "I run a small pottery class on Tuesdays and there's a space free if you fancy it. No pressure!",
  "Delivery attempted today but nobody was home. We've left it in the porch as agreed. No charge.",
  "This is a courtesy call from the dentist about your check-up next Thursday. Ring us if that no longer suits.",
  "Hi, it's me from number 42 — took in a parcel for you, pop round any time this evening.",
  "Your account has been inactive for a while. If you'd like to keep it, just sign in through the app when convenient.",
  "We got your complaint about the investment charges and have escalated it. No fee for this, we'll update you within 10 days.",
  "Hola, soy Marta del club de lectura. La reunion es el jueves a las seis. Hasta pronto!",
];

let rHit = 0, fHit = 0, rFP = 0, fFP = 0;
const newFalse = [];
for (const m of SCAMS) { if (detect(m).level !== 'green') rHit++; if (instant(m).level !== 'green') fHit++; }
for (const m of LEGIT) {
  const r = detect(m).level !== 'green', f = instant(m).level !== 'green';
  if (r) rFP++;
  if (f) { fFP++; if (!r) newFalse.push(m); }
}
console.log(`\nrules alone : caught ${rHit}/${SCAMS.length}   false alarms ${rFP}/${LEGIT.length}`);
console.log(`fused       : caught ${fHit}/${SCAMS.length}   false alarms ${fFP}/${LEGIT.length}`);
if (newFalse.length) { console.log('\nFALSE ALARMS INTRODUCED BY FUSION:'); newFalse.forEach(m => console.log('  ' + m.slice(0, 76))); }

const pass = fHit > rHit && fFP <= rFP;
console.log(pass ? '\nFUSION PASS — strictly better, no new false alarms' : '\nFUSION FAIL');
process.exit(pass ? 0 : 1);
