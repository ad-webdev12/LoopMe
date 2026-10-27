// The family link on the JavaScript side. Everything that moves between the
// two phones goes through here: the owner's phone publishes flagged checks,
// the caretaker's phone writes notes back, and each side folds what it
// receives into its own history. The transport is CloudKit, in the family's
// own iCloud (modules/scam-ai/ios/CloudLink.swift).
import {
  cloudCreateInvite, cloudLinkStatus, cloudPublishCheck, cloudSendNote, cloudSnapshot, cloudSubscribe,
  cloudSync, cloudUnlink, addCloudListener, sharedDrainLog, sharedPutConfig,
  CloudEvent, FamilyNote, LinkStatus, SharedCheck, FilterLogEntry,
} from '../../modules/scam-ai';
import { CheckRecord, Note, listChecks, upsertMany, updateCheck } from './history';
import { timeLabel } from './clock';
import type { Settings } from './storage';

export type { FamilyNote, LinkStatus, SharedCheck, CloudEvent };

const QUICK: Record<'scam' | 'safe' | 'call', string> = {
  scam: 'It is fake. Please delete it and do not reply.',
  safe: 'That one is genuine, you are fine to open it.',
  call: 'Do not tap anything, I will call you now.',
};
export const QUICK_NOTES = QUICK;

export const linkStatus = cloudLinkStatus;
export const subscribe = cloudSubscribe;
export const unlink = cloudUnlink;
export const onEvent = addCloudListener;

/** Owner: the one-time invite link. Null when iCloud is not available. */
export async function invite(myName: string): Promise<string | null> {
  const url = await cloudCreateInvite(myName || 'Family');
  if (url) await cloudSubscribe();
  return url;
}

/** Owner: send one check across. Quiet failure; the record simply stays local. */
export async function publish(rec: CheckRecord, s: Settings, asked: boolean): Promise<boolean> {
  if (!s.familyLinked || s.familyRole !== 'owner') return false;
  return cloudPublishCheck({
    id: rec.id, level: rec.level, excerpt: rec.excerpt, reason: rec.reason,
    sender: rec.sender || '', asked, from: s.myName || s.careName || 'Family', at: rec.at,
  });
}

/** Caretaker: a note back. `checkId` may be 'general' for a heads-up with no check. */
export async function sendNote(checkId: string, text: string, verdict: FamilyNote['verdict'], from: string): Promise<boolean> {
  return cloudSendNote(checkId, text, verdict, from || 'Family');
}

/** The three one-tap replies, with their text. */
export function quickNote(verdict: 'scam' | 'safe' | 'call'): string { return QUICK[verdict]; }

function noteOf(n: FamilyNote): Note {
  return { text: n.text, meta: (n.mine ? 'Sent ' : (n.from || 'Family') + ', ') + timeLabel(new Date(n.at)), from: n.from, verdict: n.verdict, mine: n.mine, at: n.at };
}

/**
 * Fold the native snapshot into history. On the caretaker's phone every shared
 * check becomes a 'family' record carrying its notes; on the owner's phone
 * the notes attach to the checks they answer. Returns ids of checks that are
 * new on this phone (for the full-screen alert).
 */
export async function fold(): Promise<{ newChecks: CheckRecord[]; newNotes: FamilyNote[] }> {
  const snap = cloudSnapshot();
  const existing = await listChecks();
  const known = new Set(existing.map(r => r.id));
  const notesByCheck = new Map<string, FamilyNote[]>();
  for (const n of snap.notes) {
    const list = notesByCheck.get(n.checkId) || [];
    list.push(n);
    notesByCheck.set(n.checkId, list);
  }

  const recs: CheckRecord[] = snap.checks.map((c: SharedCheck) => ({
    id: c.id, at: c.at, level: c.level, score: 0, tags: [], reason: c.reason, excerpt: c.excerpt,
    source: 'family', from: c.from, askedFamily: c.asked, sender: c.sender || undefined,
    notes: (notesByCheck.get(c.id) || []).slice().sort((a, b) => a.at - b.at).map(noteOf),
  }));
  await upsertMany(recs);
  const newChecks = recs.filter(r => !known.has(r.id));

  // Owner side: attach the caretaker's notes to my own checks.
  const newNotes: FamilyNote[] = [];
  for (const r of existing) {
    const theirs = (notesByCheck.get(r.id) || []).filter(n => !n.mine);
    if (!theirs.length) continue;
    const have = new Set((r.notes || []).map(n => n.at));
    const fresh = theirs.filter(n => !have.has(n.at));
    if (!fresh.length) continue;
    newNotes.push(...fresh);
    const merged = [...(r.notes || []), ...fresh.map(noteOf)].sort((a, b) => (a.at || 0) - (b.at || 0));
    const last = fresh[fresh.length - 1];
    await updateCheck(r.id, {
      notes: merged,
      reply: last.verdict ? { by: last.from, verdict: last.verdict, note: last.text, at: last.at } : r.reply,
    });
  }
  return { newChecks, newNotes };
}

/** Pull, then fold. */
export async function sync(): Promise<{ newChecks: CheckRecord[]; newNotes: FamilyNote[] }> {
  await cloudSync();
  return fold();
}

/**
 * What the text filter and the share sheet did while the app was closed:
 * every verdict becomes a history entry, and a flagged one goes to the
 * caretaker just as if it had been checked in the app.
 */
export async function drainExtensions(s: Settings): Promise<CheckRecord[]> {
  const entries: FilterLogEntry[] = sharedDrainLog();
  if (!entries.length) return [];
  const recs: CheckRecord[] = entries.map(e => ({
    id: e.id, at: e.at, level: e.level, score: e.score, tags: e.tags, reason: e.reason, excerpt: e.excerpt,
    source: e.source, askedFamily: false, sender: e.sender || undefined, safeStep: e.safeStep, signals: e.signals,
  }));
  await upsertMany(recs);
  for (const r of recs) if (r.level !== 'green') void publish(r, s, false);
  return recs;
}

/** Keep the extensions' view of settings current. Cheap; call on every settings change. */
export function pushConfig(s: Settings, hist: CheckRecord[]) {
  const flagged = hist
    .filter(h => h.level === 'red' && h.sender && /\d{7,}/.test(h.sender))
    .map(h => h.sender as string);
  sharedPutConfig({ allowlist: s.allowlist, blocked: s.blocked, flagged, autoCheck: s.autoCheck });
}
