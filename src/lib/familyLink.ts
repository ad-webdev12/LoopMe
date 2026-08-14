// The family link — how the two sides of Loop Me stay connected WITHOUT a
// server. A check travels inside a normal text message the person chooses to
// send: the text is readable on its own (works even without the app), and it
// carries a link that opens the other phone's Loop Me straight to the right
// screen. Replies travel back the same way. Privacy falls out of the design:
// there is nothing in the middle to breach.
import { Linking, Platform, Share } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import type { CheckRecord, FamilyReply } from './history';
import type { Level } from '../engine/ScamDetector';
import { LEVEL_META } from '../theme';

export type FamilyPayload =
  | { k: 'ask'; id: string; n: string; l: Level; s: number; t: string[]; r: string; e: string; st?: string }
  | { k: 'reply'; id: string; n: string; v: FamilyReply['verdict'] }
  | { k: 'note'; id: string; n: string; x: string }
  | { k: 'pair'; n: string; p: string }
  | { k: 'pairreq'; n: string; p: string; c: string }
  | { k: 'pairok'; n: string; p: string }
  | { k: 'pairno'; n: string };

export function buildFamilyUrl(payload: FamilyPayload): string {
  return ExpoLinking.createURL('family', { queryParams: { d: JSON.stringify(payload) } });
}

export function parseFamilyUrl(url: string): FamilyPayload | null {
  try {
    const { hostname, path, queryParams } = ExpoLinking.parse(url);
    const where = hostname || path || '';
    if (!String(where).includes('family')) return null;
    const d = queryParams?.d;
    if (typeof d !== 'string') return null;
    const p = JSON.parse(d);
    if (p && ['ask', 'reply', 'note', 'pair', 'pairreq', 'pairok', 'pairno'].includes(p.k)) return p as FamilyPayload;
    return null;
  } catch { return null; }
}

export function askText(myName: string, rec: CheckRecord): string {
  const m = LEVEL_META[rec.level];
  const who = myName ? `${myName} would` : 'I would';
  return (
    `${who} like a second opinion on a message.\n\n` +
    `“${rec.excerpt}”\n\n` +
    `Loop Me says: ${m.word} — ${rec.reason}\n\n` +
    `Tap to see the full check and reply:\n${buildFamilyUrl({ k: 'ask', id: rec.id, n: myName || 'Family', l: rec.level, s: rec.score, t: rec.tags, r: rec.reason, e: rec.excerpt })}`
  );
}

export function replyText(myName: string, rec: CheckRecord, verdict: FamilyReply['verdict']): string {
  const word = verdict === 'scam' ? 'This is a scam — please don’t reply to it or send anything.'
    : verdict === 'safe' ? 'This one looks okay to me.'
    : 'Let’s talk before you do anything — call me when you can.';
  return (
    `${myName ? myName + ' looked' : 'I looked'} at the message you checked.\n\n${word}\n\n` +
    `Tap to save this answer in Loop Me:\n${buildFamilyUrl({ k: 'reply', id: rec.id, n: myName || 'Family', v: verdict })}`
  );
}

export function pairText(myName: string, myPhone: string): string {
  return (
    `${myName || 'Someone'} wants to link Loop Me with you, so you can watch out for each other’s messages.\n\n` +
    `Tap to link:\n${buildFamilyUrl({ k: 'pair', n: myName, p: myPhone })}`
  );
}

export async function sendSms(phone: string | null, body: string) {
  if (phone) {
    const sep = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${phone}${sep}body=${encodeURIComponent(body)}`;
    try {
      if (await Linking.canOpenURL(url)) { await Linking.openURL(url); return; }
    } catch {}
  }
  await Share.share({ message: body }); // WhatsApp, Mail, anything — the person picks.
}

export function noteText(myName: string, recId: string, text: string): string {
  return (
    (myName || 'Family') + ' sent a note through Loop Me:\n\n' + text +
    '\n\nTap to see it in the app:\n' + buildFamilyUrl({ k: 'note', id: recId, n: myName || 'Family', x: text })
  );
}

export function pairRequestText(myName: string, myPhone: string, code: string): string {
  return (
    (myName || 'Someone') + ' wants to be looped in on Loop Me, using the code from your phone.\n\n' +
    'Tap to say yes or no:\n' + buildFamilyUrl({ k: 'pairreq', n: myName, p: myPhone, c: code })
  );
}

export function pairOkText(myName: string, myPhone: string): string {
  return ((myName || 'They') + ' said yes. You are looped in now.\n\nTap to open their activity:\n' + buildFamilyUrl({ k: 'pairok', n: myName, p: myPhone }));
}

export function pairNoText(myName: string): string {
  return ('They tapped Not now. Nothing was shared.\n\nTap to go back:\n' + buildFamilyUrl({ k: 'pairno', n: myName }));
}
