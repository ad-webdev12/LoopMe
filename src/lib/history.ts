// Check history — the shared record that links the two sides of the app.
// Every entry is redacted before it's written; raw message text is never stored.
// History travels between family phones only inside messages the person
// chooses to send (an "ask family" text carries the entry; the reply carries
// the response). No server, no account, nothing leaves the phone on its own.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { redactPrivate } from './redact';
import type { Level } from '../engine/ScamDetector';

export interface FamilyReply {
  by: string;                    // responder's name
  verdict: 'scam' | 'safe' | 'call';
  note?: string;
  at: number;
}

export interface CheckRecord {
  id: string;
  at: number;
  level: Level;
  score: number;
  tags: string[];
  reason: string;
  excerpt: string;               // redacted, first 180 chars
  source: 'typed' | 'link' | 'qr' | 'family';  // family = arrived via an ask-link
  from?: string;                 // ask-link sender's name (caretaker side)
  askedFamily: boolean;
  reply?: FamilyReply;
  reminderIds?: string[];        // scheduled "still waiting" notifications, cancelled on reply
  notes?: { text: string; meta: string }[]; // caretaker notes attached to this event
  sender?: string;               // display sender line for the history list
}

const KEY = 'loopmein.history.v1';
const CAP = 200;

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
  source?: CheckRecord['source']; from?: string;
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

/** Upsert by id — used when the same ask-link is opened twice. */
export async function upsertCheck(rec: CheckRecord): Promise<void> {
  const list = await readAll();
  const i = list.findIndex(r => r.id === rec.id);
  if (i === -1) await writeAll([rec, ...list]);
  else { list[i] = { ...list[i], ...rec }; await writeAll(list); }
}

export async function clearHistory(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}
