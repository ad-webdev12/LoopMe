import { requireOptionalNativeModule } from 'expo';

export type AiTier = 'foundation' | 'coreml' | 'none';

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
