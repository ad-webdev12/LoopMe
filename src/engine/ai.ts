// AI orchestration — the real, on-device intelligence layer.
//
// Flow (this is the honest architecture the app ships):
//   1. detect() runs instantly, offline, on every phone — the safety floor.
//   2. If Apple Intelligence (Foundation Models) or the bundled Core ML model is
//      available, we ask it for a second opinion and FUSE it with the rule result.
//   3. The fused verdict never drops below the deterministic floor for the most
//      dangerous signals (safe-account move, OTP theft, gift cards): AI can raise
//      an alarm the rules missed, but it can't talk the user out of a hard red.
//
// Nothing leaves the device. If no AI tier is present, the rule verdict stands.

import { detect, Verdict, DetectorOptions } from './ScamDetector';
import { normalizeText } from './normalize';
import { modelProbability, SCAM_THRESHOLD } from './model';
import { availableTier, classify, AiTier, AiJudgement } from '../../modules/scam-ai';

export interface FusedVerdict extends Verdict {
  ai?: AiJudgement;         // the raw AI second opinion, if any
  aiTier: AiTier;           // which real AI tier produced it
  fused: boolean;           // true if AI changed/confirmed the rule result
  elapsedMs?: number;       // measured time this verdict took, for honest UI
}

// performance.now() where it exists (sub-millisecond), Date.now() otherwise.
const nowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

let cachedTier: AiTier | null = null;
export async function getAiTier(): Promise<AiTier> {
  if (cachedTier == null) cachedTier = await availableTier();
  return cachedTier;
}

// Human-readable name for the active tier (for the UI badge).
export function tierLabel(t: AiTier): string {
  return t === 'foundation' ? 'Apple Intelligence'
    : t === 'coreml' ? 'On-device model'
    : t === 'builtin' ? 'On-device model'
    : 'Built-in checks';
}

const RULE_WEIGHT = 0.6;
const AI_WEIGHT = 0.4;

// Rule score (0..~150) → rough probability, so it can blend with the AI's 0..1.
function ruleProb(v: Verdict): number {
  if (v.level === 'red') return Math.min(1, 0.75 + v.score / 400);
  if (v.level === 'amber') return Math.min(0.7, 0.35 + v.score / 200);
  return Math.min(0.25, v.score / 200);
}

/**
 * Instant verdict: deterministic rules PLUS the portable learned model, fused
 * synchronously. Both run on every device, offline, in well under a millisecond.
 *
 * The model may only ever RAISE the alarm. It is trained on a synthetic corpus,
 * so it is treated as a second opinion that can spot something the rules missed
 * — never as grounds for talking the person out of a rule hit. That asymmetry is
 * deliberate: a missed alarm the rules caught anyway costs nothing, while a
 * model-driven downgrade of a real scam could cost someone their savings.
 */
export function instant(message: string, opts?: DetectorOptions): FusedVerdict {
  const started = nowMs();
  const out = instantVerdict(message, opts);
  return { ...out, elapsedMs: nowMs() - started };
}

function instantVerdict(message: string, opts?: DetectorOptions): FusedVerdict {
  const v = detect(message, opts);

  // An allowlisted sender is the person's own explicit decision; nothing overrides it.
  if (v.tags.includes('allowlist')) return { ...v, aiTier: 'none', fused: false };

  let p = 0;
  try { p = modelProbability(normalizeText((message || '').trim()).text); } catch { return { ...v, aiTier: 'none', fused: false }; }
  if (p < SCAM_THRESHOLD) return { ...v, aiTier: 'builtin', fused: false };

  // Above the threshold the model is deliberately conservative: measured on the
  // repo suite it never trained on, it fires rarely and almost never on a
  // genuine message. Green becomes amber; a weak amber hardens. Red stays red.
  const level: Verdict['level'] = v.level === 'red' ? 'red'
    : v.level === 'amber' && p >= 0.9 ? 'red'
    : v.level === 'green' ? 'amber'
    : 'amber';
  if (level === v.level) return { ...v, aiTier: 'builtin', fused: false };

  const note = 'The on-device model recognises the shape of this message as a scam, even though it does not match a specific known trick.';
  return {
    ...v,
    level,
    reason: v.level === 'green' ? 'This does not match a named trick, but it reads like a scam.' : v.reason,
    safeStep: level === 'red'
      ? 'Do not reply and do not send anything. Delete the message.'
      : 'Do not tap anything yet. Contact the company yourself on a number you already trust.',
    signals: v.signals.includes(note) ? v.signals : [...v.signals, note],
    confidence: p >= 0.9 ? 'fairly' : 'unsure',
    aiTier: 'builtin',
    fused: true,
  };
}

/** The AI upgrade. Call after showing instant(); resolves with the fused verdict. */
export async function upgrade(message: string, rule: Verdict, opts?: DetectorOptions): Promise<FusedVerdict> {
  const tier = await getAiTier();
  if (tier === 'none') return { ...rule, aiTier: 'none', fused: false };

  const ai = await classify(message);
  if (!ai) return { ...rule, aiTier: tier, fused: false };

  const rp = ruleProb(rule);
  const aiP = ai.label === 'safe' ? Math.min(ai.probability, 0.3) : ai.probability;
  let p = (RULE_WEIGHT * rp + AI_WEIGHT * aiP) / (RULE_WEIGHT + AI_WEIGHT);

  // Hard floor: the rules' most dangerous, unambiguous signals are never softened
  // by the AI. AI may only push the alarm UP for these.
  const hardRed = rule.tags.includes('safe-account') || rule.tags.includes('two-stage') ||
    rule.tags.includes('courier-fraud') ||
    (rule.tags.includes('otp-request') && rule.level === 'red') || rule.tags.includes('giftcard');
  if (hardRed) p = Math.max(p, 0.85);

  // AI catches something the rules rated calm.
  const aiAlarms = ai.label === 'scam' && ai.probability >= 0.7;

  let level: Verdict['level'] = p >= 0.62 ? 'red' : p >= 0.3 ? 'amber' : 'green';
  if (hardRed) level = 'red';
  if (aiAlarms && level === 'green') level = 'amber';

  // Prefer the AI's plain-language reason when it meaningfully agrees and the
  // rules didn't already produce a strong committed message.
  let reason = rule.reason;
  if (!hardRed && ai.reason && ((level !== 'green' && ai.label !== 'safe') || (level === 'green' && ai.label === 'safe'))) {
    reason = ai.reason;
  }

  const confidence: Verdict['confidence'] =
    hardRed || p >= 0.82 || p <= 0.12 ? 'very' : (p >= 0.5 && p < 0.62) || (p > 0.25 && p < 0.35) ? 'unsure' : 'fairly';

  // The AI's plain sentence joins the numbered reasons list (design shows the
  // level line in the banner; every reason lives under "Why we say that").
  const signals = ai.reason && !rule.signals.includes(ai.reason)
    ? [...rule.signals, ai.reason]
    : rule.signals;

  // When fusion moves the level, the "what to do" line must move with it.
  const safeStep = level === rule.level ? rule.safeStep
    : level === 'red' ? 'Do not reply and do not send anything. Delete the message.'
    : level === 'amber' ? 'Do not tap anything yet. Contact the company yourself on a number you already trust.'
    : 'You do not need to do anything. If it still feels off, loop someone in.';

  return {
    ...rule,
    level,
    reason,
    safeStep,
    signals,
    confidence,
    ai,
    aiTier: tier,
    fused: true,
  };
}
