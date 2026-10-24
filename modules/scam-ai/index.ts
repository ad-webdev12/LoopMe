import { requireOptionalNativeModule } from 'expo';

// 'builtin' is the portable logistic-regression model in src/engine/model.ts.
// It needs no native module and no particular iOS version, so it is the tier
// that actually runs for most people — the other two are upgrades on top.
export type AiTier = 'foundation' | 'coreml' | 'builtin' | 'none';

/** Whether this phone can use the iCloud family link at all. */
export type CloudAccountState = 'available' | 'noAccount' | 'restricted' | 'unknown';

/** One flagged check as it arrives on the caretaker's phone. */
export interface SharedCheck {
  id: string;
  level: 'red' | 'amber' | 'green';
  excerpt: string;
  reason: string;
  at: number;
  from: string;
}

export interface AiJudgement {
  tier: AiTier;
  label: 'scam' | 'suspicious' | 'safe';
  probability: number; // 0..1
  reason: string;
  category: string;
}

// requireOptionalNativeModule returns null in environments where the native
// module isn't linked (Expo Go, web) so the JS never throws.
const native = requireOptionalNativeModule<{
  availableTier(): Promise<AiTier>;
  classify(text: string): Promise<string>;
  recognizeText(uri: string): Promise<string>;
  listenOnce(): Promise<string>;
  stopListening(): void;
  prepareAudioForSpeech(): Promise<boolean>;
  cloudAccountState(): Promise<CloudAccountState>;
  cloudCreateInvite(myName: string): Promise<string>;
  cloudPublishCheck(id: string, level: string, excerpt: string, reason: string, at: number): Promise<boolean>;
  cloudFetchShared(): Promise<SharedCheck[]>;
  cloudSubscribe(): Promise<boolean>;
}>('ScamAi');

export const isNativeAiLinked = () => native != null;

export async function availableTier(): Promise<AiTier> {
  if (!native) return 'none';
  try { return await native.availableTier(); } catch { return 'none'; }
}

/** On-device OCR via Vision. Returns '' when nothing is readable. */
export async function recognizeText(uri: string): Promise<string> {
  if (!native) return '';
  try { return (await native.recognizeText(uri)) || ''; } catch { return ''; }
}

/** On-device speech-to-text. Listens once (stops on silence), resolves the transcript. */
export async function listenOnce(): Promise<string> {
  if (!native) return '';
  try { return (await native.listenOnce()) || ''; } catch { return ''; }
}

export function stopListening(): void {
  try { native?.stopListening(); } catch {}
}

/**
 * Put the audio session into playback so speech is heard even when the phone's
 * ring/silent switch is on. Safe to call before every utterance.
 */
export async function prepareAudioForSpeech(): Promise<void> {
  if (!native) return;
  try { await native.prepareAudioForSpeech(); } catch {}
}

export async function classify(text: string): Promise<AiJudgement | null> {
  if (!native) return null;
  try {
    const raw = await native.classify(text);
    const j = JSON.parse(raw) as AiJudgement;
    if (j && (j.label === 'scam' || j.label === 'suspicious' || j.label === 'safe')) return j;
    return null;
  } catch {
    return null;
  }
}

// ---- Family link over the family's own iCloud ---------------------------
// Nothing here throws: every call degrades to a value the UI can act on, so a
// phone with no iCloud account simply falls back to the texting path.

export async function cloudAccountState(): Promise<CloudAccountState> {
  if (!native) return 'unknown';
  try { return await native.cloudAccountState(); } catch { return 'unknown'; }
}

/** Elder: a share link to text the caretaker once. Null if it cannot be made. */
export async function cloudCreateInvite(myName: string): Promise<string | null> {
  if (!native) return null;
  try { return (await native.cloudCreateInvite(myName)) || null; } catch { return null; }
}

/** Elder: publish a flagged check for the caretaker. False if it did not go. */
export async function cloudPublishCheck(c: {
  id: string; level: string; excerpt: string; reason: string; at: number;
}): Promise<boolean> {
  if (!native) return false;
  try { return await native.cloudPublishCheck(c.id, c.level, c.excerpt, c.reason, c.at); }
  catch { return false; }
}

/** Caretaker: every check shared with this phone, newest first. */
export async function cloudFetchShared(): Promise<SharedCheck[]> {
  if (!native) return [];
  try { return (await native.cloudFetchShared()) || []; } catch { return []; }
}

/** Caretaker: ask CloudKit to push when new checks land. */
export async function cloudSubscribe(): Promise<boolean> {
  if (!native) return false;
  try { return await native.cloudSubscribe(); } catch { return false; }
}
