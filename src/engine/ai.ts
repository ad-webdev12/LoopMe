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
import { availableTier, classify, AiTier, AiJudgement } from '../../modules/scam-ai';

export interface FusedVerdict extends Verdict {
  ai?: AiJudgement;         // the raw AI second opinion, if any
  aiTier: AiTier;           // which real AI tier produced it
  fused: boolean;           // true if AI changed/confirmed the rule result
}

let cachedTier: AiTier | null = null;
export async function getAiTier(): Promise<AiTier> {
  if (cachedTier == null) cachedTier = await availableTier();
  return cachedTier;
}

// Human-readable name for the active tier (for the UI badge).
export function tierLabel(t: AiTier): string {
  return t === 'foundation' ? 'Apple Intelligence' : t === 'coreml' ? 'On-device model' : 'Built-in checks';
}

const RULE_WEIGHT = 0.6;
const AI_WEIGHT = 0.4;

// Rule score (0..~150) → rough probability, so it can blend with the AI's 0..1.
function ruleProb(v: Verdict): number {
  if (v.level === 'red') return Math.min(1, 0.75 + v.score / 400);
  if (v.level === 'amber') return Math.min(0.7, 0.35 + v.score / 200);
  return Math.min(0.25, v.score / 200);
}

/** Instant rule verdict — synchronous, offline, always available. */
export function instant(message: string, opts?: DetectorOptions): FusedVerdict {
  const v = detect(message, opts);
  return { ...v, aiTier: 'none', fused: false };
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

  return {
    ...rule,
    level,
    reason,
    signals,
    confidence,
    ai,
    aiTier: tier,
    fused: true,
  };
}
