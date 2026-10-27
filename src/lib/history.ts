// Check history: the shared record that links the two sides of the app.
// Every entry is redacted before it's written; raw message text is never stored.
// On a phone with the family link, flagged entries also travel to the
// caretaker through the family's own iCloud (see lib/family.ts). Nothing of
// ours sits in the middle.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { redactPrivate } from './redact';
import type { Level } from '../engine/ScamDetector';

export interface FamilyReply {
  by: string;                    // responder's name
  verdict: 'scam' | 'safe' | 'call';
  note?: string;
  at: number;
}

export interface Note {
  text: string;
  meta: string;
  from?: string;
  verdict?: 'scam' | 'safe' | 'call' | '';
  mine?: boolean;                // written on this phone
  at?: number;
}

export type Source =
  | 'typed'    // pasted or typed in the app
  | 'link'     // arrived through a Shortcut or the auto-check deep link
  | 'qr'
  | 'family'   // flagged on the phone this one looks after
  | 'filter'   // the text filter stopped it before it reached Messages
  | 'share';   // checked from the share sheet in another app

export interface CheckRecord {
  id: string;
  at: number;
  level: Level;
  score: number;
  tags: string[];
  reason: string;
  excerpt: string;               // redacted, first 180 chars
  source: Source;
  from?: string;                 // the other phone's owner (caretaker side)
  askedFamily: boolean;
  reply?: FamilyReply;
  reminderIds?: string[];        // scheduled "still waiting" notifications, canceled on reply
  notes?: Note[];                // notes under this event, both directions
  sender?: string;               // display sender line for the history list
  safeStep?: string;             // kept for entries that arrived from the filter
  signals?: string[];
  reported?: boolean;            // the person forwarded it to 7726 or the FTC
  seen?: boolean;                // caretaker side: the full-screen alert was shown
}

const KEY = 'loopmein.history.v1';
const CAP = 300;

async function readAll(): Promise<CheckRecord[]> {
  try { const raw = await AsyncStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

async function writeAll(list: CheckRecord[]) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, CAP))); } catch {}
}

export async function listChecks(): Promise<CheckRecord[]> {
  return readAll();
}

export function newRecord(input: {
  message: string; level: Level; score: number; tags: string[]; reason: string;
  source?: Source; from?: string;
}): CheckRecord {
  return {
    id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    at: Date.now(),
    level: input.level,
    score: input.score,
    tags: input.tags,
    reason: input.reason,
    excerpt: redactPrivate(input.message).slice(0, 180),
    source: input.source || 'typed',
    from: input.from,
    askedFamily: false,
  };
}

export async function addCheck(rec: CheckRecord): Promise<void> {
  const list = await readAll();
  await writeAll([rec, ...list]);
}

export async function updateCheck(id: string, patch: Partial<CheckRecord>): Promise<CheckRecord | null> {
  const list = await readAll();
  const i = list.findIndex(r => r.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...patch };
  await writeAll(list);
  return list[i];
}

/** Upsert by id, keeping local-only fields (seen, notes) the patch leaves out. */
export async function upsertCheck(rec: CheckRecord): Promise<boolean> {
  const list = await readAll();
  const i = list.findIndex(r => r.id === rec.id);
  if (i === -1) { await writeAll([rec, ...list].sort((a, b) => b.at - a.at)); return true; }
  list[i] = { ...list[i], ...rec, notes: rec.notes?.length ? rec.notes : list[i].notes, seen: list[i].seen || rec.seen };
  await writeAll(list);
  return false;
}

export async function upsertMany(recs: CheckRecord[]): Promise<number> {
  let fresh = 0;
  for (const r of recs) if (await upsertCheck(r)) fresh++;
  return fresh;
}

export async function clearHistory(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}
