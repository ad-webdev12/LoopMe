// "Was this right?" The one thing that lets the detector get better after
// release without a server. A correction does two things on this phone:
// it is remembered, so the same text is never misjudged again, and a scam sender
// is flagged for the call directory. Nothing leaves the phone.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeText } from '../engine/normalize';
import { updateCheck, listChecks } from './history';
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

/** A correction made outside the app (the Messages drawer). Same memory, no history row to update. */
export async function rememberText(text: string, label: Label, s: Settings): Promise<void> {
  const t = text.trim();
  if (!t) return;
  const m = await load();
  m[keyOf(t)] = label;
  try { await AsyncStorage.setItem(KEY, JSON.stringify(m)); } catch {}
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
}
