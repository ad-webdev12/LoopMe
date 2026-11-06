// "Was this right?" The one thing that lets the detector get better after
// release without a server. A correction does three things on this phone:
// it is remembered, so the same text is never misjudged again; a scam sender
// is flagged for the call directory; and, only if the person switched it on
// in Settings, the redacted text goes to the app's public CloudKit database
// so the next version can be trained on real scams.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cloudSubmitSample } from '../../modules/scam-ai';
import { normalizeText } from '../engine/normalize';
import { redactPrivate } from './redact';
import { updateCheck, listChecks } from './history';
import { phoneRegion } from './region';
import type { Settings } from './storage';

const KEY = 'loopmein.corrections.v1';
type Label = 'scam' | 'fine';
let cache: Record<string, Label> | null = null;

function keyOf(text: string): string {
  return normalizeText((text || '').trim()).text.toLowerCase().replace(/\s+/g, ' ').slice(0, 400);
}

async function load(): Promise<Record<string, Label>> {
  if (cache) return cache;
  try { const raw = await AsyncStorage.getItem(KEY); cache = raw ? JSON.parse(raw) : {}; } catch { cache = {}; }
  return cache!;
}

/** The person's own earlier correction for this exact text, if any. */
export async function remembered(text: string): Promise<Label | null> {
  const m = await load();
  return m[keyOf(text)] || null;
}

export async function correct(recId: string, label: Label, s: Settings, fullText?: string): Promise<void> {
  const rec = (await listChecks()).find(r => r.id === recId);
  if (!rec) return;
  const text = fullText && fullText.trim() ? fullText.trim() : rec.excerpt;
  const m = await load();
  m[keyOf(text)] = label;
  const keys = Object.keys(m);
  if (keys.length > 500) for (const k of keys.slice(0, keys.length - 500)) delete m[k];
  try { await AsyncStorage.setItem(KEY, JSON.stringify(m)); } catch {}
  await updateCheck(recId, { userLabel: label, level: label === 'scam' ? 'red' : 'green' });
  if (s.improve) void cloudSubmitSample(redactPrivate(text), label === 'scam' ? 'scam' : 'safe', phoneRegion() || 'XX');
}
