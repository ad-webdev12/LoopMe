// AI orchestration: the real, on-device intelligence layer.
//
// Flow (this is the honest architecture the app ships):
//   1. detect() runs instantly, offline, on every phone. The safety floor.
//   2. If Apple Intelligence (Foundation Models) or the bundled Core ML model is
//      available, we ask it for a second opinion and FUSE it with the rule result.
//   3. The fused verdict never drops below the deterministic floor for the most
//      dangerous signals (safe-account move, OTP theft, gift cards): AI can raise
//      an alarm the rules missed, but it can't talk the user out of a hard red.
//
// Nothing leaves the device. If no AI tier is present, the rule verdict stands.

import { detect, Verdict, DetectorOptions } from './ScamDetector';
import { modelMayJudge } from './guard';
import { normalizeText } from './normalize';
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
  // 'none' is not cached: the model compiles on first launch and may be
  // ready a moment later.
  if (cachedTier == null || cachedTier === 'none') cachedTier = await availableTier();
  return cachedTier;
}

// Human-readable name for the active tier (for the UI badge).
export function tierLabel(t: AiTier): string {
  return t === 'foundation' ? 'Apple Intelligence'
    : t === 'coreml' ? 'On-device model'
    : t === 'builtin' ? 'On-device model'
    : 'Built-in checks';
}

/**
 * Instant verdict: deterministic rules PLUS the portable learned model, fused
 * synchronously. Both run on every device, offline, in well under a millisecond.
 *
 * The model may only ever RAISE the alarm. It is trained on a synthetic corpus,
 * so it is treated as a second opinion that can spot something the rules missed
 *: never as grounds for talking the person out of a rule hit. That asymmetry is
 * deliberate: a missed alarm the rules caught anyway costs nothing, while a
 * model-driven downgrade of a real scam could cost someone their savings.
 */
export function instant(message: string, opts?: DetectorOptions): FusedVerdict {
  const started = nowMs();
  const out = instantVerdict(message, opts);
  return { ...out, elapsedMs: nowMs() - started };
}

function instantVerdict(message: string, opts?: DetectorOptions): FusedVerdict {
  // Rules only. The one learned model, ScamNet, answers asynchronously in
  // upgrade(); the old hashed word model that used to vote here is gone.
  return { ...detect(message, opts), aiTier: 'none', fused: false };
}

/**
 * The AI upgrade. Call after showing instant(); resolves with the fused verdict.
 *
 * Same policy as instant(), applied to the stronger on-device model (Apple
 * Intelligence where present, otherwise the bundled BERT classifier, the one
 * measured in ml/eval.swift): it may only raise the alarm. Green becomes amber
 * from 0.8, an amber hardens to red from 0.9, and a rule red is never touched.
 * The model never lowers a level. That asymmetry is the whole point: a missed
 * raise costs nothing the rules did not already catch, while a model-driven
 * downgrade of a real scam could cost someone their savings.
 */
export const COREML_THRESHOLD = 0.8;
export { modelMayJudge } from './guard';


export async function upgrade(message: string, rule: Verdict, opts?: DetectorOptions): Promise<FusedVerdict> {
  const tier = await getAiTier();
  if (tier === 'none') return { ...rule, aiTier: 'none', fused: false };
  if (rule.tags.includes('allowlist') || rule.level === 'red') return { ...rule, aiTier: tier, fused: false };

  // A bare email address, a name, "ok see you at 5": there is nothing in
  // there for a scam to be made of, and the classifiers were never trained on
  // fragments. They only get a say when the text could carry a pitch.
  if (!modelMayJudge(message)) return { ...rule, aiTier: tier, fused: false };

  const ai = await classify(message);
  if (!ai) return { ...rule, aiTier: tier, fused: false };

  // ScamNet may only raise a level, never lower one. Tried letting it clear a
  // rule amber when under 0.1 (15 Nov 2026): on ten public sets false alarms
  // fell from 6.4% to 3.2%, but it also cleared 31 of 432 bench scams, nearly
  // all non-English or the quiet elder cons this app exists for ("Mum's had a
  // fall, can you send something"). Rules stay in charge of those.

  // Apple Intelligence returns a label with a looser probability; the Core ML
  // classifier returns a calibrated probability. Normalize to one number.
  // Go by the tier that actually answered, not the one expected.
  const answered: AiTier = (ai.tier as AiTier) || tier;
  const p = answered === 'foundation'
    ? (ai.label === 'scam' ? Math.max(ai.probability, 0.8) : ai.label === 'suspicious' ? Math.min(Math.max(ai.probability, 0.5), 0.89) : 0)
    : ai.probability;
  if (p < (answered === 'foundation' ? 0.5 : COREML_THRESHOLD)) return { ...rule, ai, aiTier: tier, fused: false };

  const level: Verdict['level'] = rule.level === 'amber' && p >= 0.9 ? 'red' : 'amber';
  if (level === rule.level) {
    // Agreement: keep the rules' wording, add the model's sentence to the reasons.
    const signals = ai.reason && !rule.signals.includes(ai.reason) ? [...rule.signals, ai.reason] : rule.signals;
    return { ...rule, signals, confidence: rule.confidence === 'unsure' ? 'fairly' : rule.confidence, ai, aiTier: tier, fused: true };
  }

  const note = answered === 'foundation' && ai.reason
    ? ai.reason
    : 'The on-device model recognizes the shape of this message as a scam, even though it does not match a specific known trick.';
  return {
    ...rule,
    level,
    reason: rule.level === 'green' ? (answered === 'foundation' && ai.reason ? ai.reason : 'This does not match a named trick, but it reads like a scam.') : rule.reason,
    safeStep: level === 'red'
      ? 'Do not reply and do not send anything. Delete the message.'
      : 'Don’t tap or reply yet. Check with them on a number you already have.',
    signals: rule.signals.includes(note) ? rule.signals : [...rule.signals, note],
    confidence: p >= 0.9 ? 'fairly' : 'unsure',
    ai,
    aiTier: tier,
    fused: true,
  };
}
