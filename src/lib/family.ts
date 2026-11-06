// The family link on the JavaScript side. Everything that moves between the
// two phones goes through here: the owner's phone publishes flagged checks,
// the caretaker's phone writes notes back, and each side folds what it
// receives into its own history. The transport is CloudKit, in the family's
// own iCloud (modules/scam-ai/ios/CloudLink.swift).
import {
  cloudCreateInvite, cloudLinkStatus, cloudPublishCheck, cloudPublishPulse, cloudSendNote, cloudSnapshot, cloudSubscribe,
  cloudSync, cloudUnlink, addCloudListener, sharedDrainLog, sharedPutConfig, sharedTallies, callDirectoryStatus,
  CloudEvent, FamilyNote, FamilyPulse, LinkStatus, SharedCheck, FilterLogEntry,
} from '../../modules/scam-ai';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { CheckRecord, Note, listChecks, upsertMany, updateCheck } from './history';
import { timeLabel } from './clock';
import type { Settings } from './storage';

export type { FamilyNote, FamilyPulse, LinkStatus, SharedCheck, CloudEvent };

const QUICK: Record<'scam' | 'safe' | 'call' | 'block', string> = {
  scam: 'It is fake. Delete it and do not reply.',
  safe: 'That one is genuine. You are fine.',
  call: 'Do not tap anything, I will call you now.',
  block: 'I blocked that number for you.',
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
export function quickNote(verdict: 'scam' | 'safe' | 'call' | 'block'): string { return QUICK[verdict]; }

function noteOf(n: FamilyNote): Note {
  return { text: n.text, meta: (n.mine ? 'Sent ' : (n.from || 'Family') + ', ') + timeLabel(new Date(n.at)), from: n.from, verdict: n.verdict, mine: n.mine, at: n.at };
}

/**
 * Fold the native snapshot into history. On the caretaker's phone every shared
 * check becomes a 'family' record carrying its notes; on the owner's phone
 * the notes attach to the checks they answer. Returns ids of checks that are
 * new on this phone (for the full-screen alert).
 */
export async function fold(): Promise<{ newChecks: CheckRecord[]; newNotes: FamilyNote[]; newBlocks: string[]; newSafes: string[] }> {
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

  // Owner side: attach the caretaker's notes to my own checks. A 'block' note
  // also names the sender to block; the app does that and tells the person.
  const newNotes: FamilyNote[] = [];
  const newBlocks: string[] = [];
  const newSafes: string[] = [];
  for (const r of existing) {
    const theirs = (notesByCheck.get(r.id) || []).filter(n => !n.mine);
    if (!theirs.length) continue;
    const have = new Set((r.notes || []).map(n => n.at));
    const fresh = theirs.filter(n => !have.has(n.at));
    if (!fresh.length) continue;
    newNotes.push(...fresh);
    if (r.sender && fresh.some(n => n.verdict === 'block')) newBlocks.push(r.sender);
    if (r.sender && fresh.some(n => n.verdict === 'safe')) newSafes.push(r.sender);
    const merged = [...(r.notes || []), ...fresh.map(noteOf)].sort((a, b) => (a.at || 0) - (b.at || 0));
    const last = fresh[fresh.length - 1];
    await updateCheck(r.id, {
      notes: merged,
      reply: last.verdict ? { by: last.from, verdict: last.verdict, note: last.text, at: last.at } : r.reply,
    });
  }
  return { newChecks, newNotes, newBlocks, newSafes };
}

/** Pull, then fold. */
export async function sync(): Promise<{ newChecks: CheckRecord[]; newNotes: FamilyNote[]; newBlocks: string[]; newSafes: string[] }> {
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
  const already = new Set(entries.filter(e => e.published).map(e => e.id));
  for (const r of recs) if (r.level !== 'green' && !already.has(r.id)) void publish(r, s, false);
  return recs;
}

/** Keep the extensions' view of settings current. Cheap; call on every settings change. */
export function pushConfig(s: Settings, hist: CheckRecord[]) {
  const flagged = hist
    .filter(h => h.level === 'red' && h.sender && h.sender.replace(/\D/g, '').length >= 7)
    .map(h => h.sender as string);
  sharedPutConfig({ allowlist: s.allowlist, blocked: s.blocked, flagged, autoCheck: s.autoCheck });
}

/** Caretaker: the owner's latest weekly picture, or null before the first one lands. */
export function pulse(): FamilyPulse | null {
  return cloudSnapshot().pulse;
}

/**
 * Owner: write the weekly picture. Counts only. Called whenever the app comes
 * to the front, at most once an hour, and whenever a check is added.
 */
let lastPulseAt = 0;
export async function sendPulse(s: Settings, hist: CheckRecord[], force = false): Promise<void> {
  if (!s.familyLinked || s.familyRole !== 'owner') return;
  if (!force && Date.now() - lastPulseAt < 3600 * 1000) return;
  lastPulseAt = Date.now();
  const day = 86400000, now = Date.now();
  const mine = hist.filter(h => h.source !== 'family');
  const w = mine.filter(h => now - h.at < 7 * day);
  const m = mine.filter(h => now - h.at < 30 * day);
  const t = sharedTallies();
  let notifOn = false;
  try { notifOn = (await Notifications.getPermissionsAsync()).status === 'granted'; } catch {}
  const callsOn = (await callDirectoryStatus()) === 'enabled';
  await cloudPublishPulse({
    checked7: w.length, stopped7: w.filter(h => h.level === 'red').length, flagged7: w.filter(h => h.level === 'amber').length,
    checked30: m.length, stopped30: m.filter(h => h.level === 'red').length,
    filterOn: now - t.lastFilteredAt < 7 * day, callsOn, notifOn,
    version: String(Constants.expoConfig?.version || ''), since: s.installedAt, lastFiltered: t.lastFilteredAt,
  });
}

/** Repeat senders among the checks this caretaker has seen: numbers that keep trying. */
export function repeatSenders(hist: CheckRecord[]): { sender: string; count: number; last: number; blocked: boolean }[] {
  const by = new Map<string, { count: number; last: number; blocked: boolean }>();
  for (const h of hist) {
    if (h.source !== 'family' || !h.sender || h.sender.replace(/\D/g, '').length < 7) continue;
    const cur = by.get(h.sender) || { count: 0, last: 0, blocked: false };
    cur.count++; cur.last = Math.max(cur.last, h.at);
    if ((h.notes || []).some(n => n.mine && n.verdict === 'block')) cur.blocked = true;
    by.set(h.sender, cur);
  }
  return [...by.entries()].filter(([, v]) => v.count >= 2).map(([sender, v]) => ({ sender, ...v })).sort((a, b) => b.count - a.count);
}
