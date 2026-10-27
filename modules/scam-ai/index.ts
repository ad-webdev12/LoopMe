import { requireOptionalNativeModule } from 'expo';

// 'builtin' is the portable logistic-regression model in src/engine/model.ts.
// It needs no native module and no particular iOS version, so it is the tier
// that actually runs for most people. The other two are upgrades on top.
export type AiTier = 'foundation' | 'coreml' | 'builtin' | 'none';

/** Whether this phone can use the iCloud family link at all. */
export type CloudAccountState = 'available' | 'noAccount' | 'restricted' | 'unknown';

/** One flagged check as it travels between the two phones. */
export interface SharedCheck {
  id: string;
  level: 'red' | 'amber' | 'green';
  excerpt: string;
  reason: string;
  sender: string;
  asked: boolean;     // the person chose "loop in", rather than it being flagged automatically
  from: string;       // the owner's name
  at: number;
}

/** A note the caretaker wrote back under a check. */
export interface FamilyNote {
  id: string;
  checkId: string;
  text: string;
  verdict: 'scam' | 'safe' | 'call' | '';
  from: string;
  at: number;
  mine: boolean;      // written on this phone
}

export interface LinkStatus {
  linked: boolean;
  role: 'owner' | 'caretaker' | 'none';
  name: string | null;   // the other person's name, once linked
  invited?: boolean;     // owner sent an invite nobody has tapped yet
  account?: CloudAccountState;
}

export interface FamilySnapshot {
  checks: SharedCheck[];
  notes: FamilyNote[];
  ownerName: string | null;
  caretakerName: string | null;
  joinedOwnerName: string | null;
}

export type CloudEvent =
  | { kind: 'joined'; name: string }
  | { kind: 'joinFailed'; message: string }
  | { kind: 'check'; check: SharedCheck }
  | { kind: 'note'; note: FamilyNote }
  | { kind: 'synced' };

/** A verdict the text filter or the share sheet produced while the app was closed. */
export interface FilterLogEntry {
  id: string;
  at: number;
  source: 'filter' | 'share';
  sender: string;
  excerpt: string;
  level: 'red' | 'amber' | 'green';
  score: number;
  tags: string[];
  reason: string;
  safeStep: string;
  signals: string[];
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
  cloudLinkStatus(): Promise<LinkStatus>;
  cloudPublishCheck(check: Record<string, unknown>): Promise<boolean>;
  cloudSendNote(checkId: string, text: string, verdict: string, from: string): Promise<boolean>;
  cloudSync(): Promise<number>;
  cloudSnapshot(): FamilySnapshot;
  cloudSubscribe(): Promise<boolean>;
  cloudUnlink(): Promise<boolean>;
  sharedPutConfig(allowlist: string[], blocked: string[], flagged: string[], autoCheck: boolean): void;
  sharedDrainLog(): FilterLogEntry[];
  sharedTallies(): { filtered: number; junk: number; shared: number };
  callDirectoryReload(): Promise<string>;
  callDirectoryStatus(): Promise<'enabled' | 'disabled' | 'unknown'>;
  addListener(event: 'cloudEvent', cb: (e: CloudEvent) => void): { remove: () => void };
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
// phone with no iCloud account gets told so, plainly, instead of crashing.

export async function cloudAccountState(): Promise<CloudAccountState> {
  if (!native) return 'unknown';
  try { return await native.cloudAccountState(); } catch { return 'unknown'; }
}

/** Owner: a share link to text the caretaker once. Null if it cannot be made. */
export async function cloudCreateInvite(myName: string): Promise<string | null> {
  if (!native) return null;
  try { return (await native.cloudCreateInvite(myName)) || null; } catch { return null; }
}

export async function cloudLinkStatus(): Promise<LinkStatus> {
  if (!native) return { linked: false, role: 'none', name: null, account: 'unknown' };
  try { return await native.cloudLinkStatus(); } catch { return { linked: false, role: 'none', name: null, account: 'unknown' }; }
}

/** Owner: publish a flagged check for the caretaker. False if it did not go. */
export async function cloudPublishCheck(c: Omit<SharedCheck, 'at'> & { at?: number }): Promise<boolean> {
  if (!native) return false;
  try { return await native.cloudPublishCheck({ ...c, at: c.at ?? Date.now() }); } catch { return false; }
}

/** Caretaker: a note back under one check. */
export async function cloudSendNote(checkId: string, text: string, verdict: FamilyNote['verdict'], from: string): Promise<boolean> {
  if (!native) return false;
  try { return await native.cloudSendNote(checkId, text, verdict, from); } catch { return false; }
}

/** Either side: pull what is new. Resolves with how many new items arrived. */
export async function cloudSync(): Promise<number> {
  if (!native) return 0;
  try { return await native.cloudSync(); } catch { return 0; }
}

export function cloudSnapshot(): FamilySnapshot {
  const empty: FamilySnapshot = { checks: [], notes: [], ownerName: null, caretakerName: null, joinedOwnerName: null };
  if (!native) return empty;
  try { return { ...empty, ...native.cloudSnapshot() }; } catch { return empty; }
}

export async function cloudSubscribe(): Promise<boolean> {
  if (!native) return false;
  try { return await native.cloudSubscribe(); } catch { return false; }
}

export async function cloudUnlink(): Promise<boolean> {
  if (!native) return false;
  try { return await native.cloudUnlink(); } catch { return false; }
}

export function addCloudListener(cb: (e: CloudEvent) => void): () => void {
  if (!native) return () => {};
  try {
    const sub = native.addListener('cloudEvent', cb);
    return () => { try { sub.remove(); } catch {} };
  } catch { return () => {}; }
}

// ---- App group: what the text filter, call directory and share sheet see ----

export function sharedPutConfig(c: { allowlist: string[]; blocked: string[]; flagged: string[]; autoCheck: boolean }): void {
  try { native?.sharedPutConfig(c.allowlist, c.blocked, c.flagged, c.autoCheck); } catch {}
}

export function sharedDrainLog(): FilterLogEntry[] {
  if (!native) return [];
  try { return native.sharedDrainLog() || []; } catch { return []; }
}

export function sharedTallies(): { filtered: number; junk: number; shared: number } {
  if (!native) return { filtered: 0, junk: 0, shared: 0 };
  try { return native.sharedTallies(); } catch { return { filtered: 0, junk: 0, shared: 0 }; }
}

export async function callDirectoryReload(): Promise<boolean> {
  if (!native) return false;
  try { return (await native.callDirectoryReload()) === 'ok'; } catch { return false; }
}

export async function callDirectoryStatus(): Promise<'enabled' | 'disabled' | 'unknown'> {
  if (!native) return 'unknown';
  try { return await native.callDirectoryStatus(); } catch { return 'unknown'; }
}
