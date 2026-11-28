// Sending the family invite to one person. The link is the same for everyone
// (one iCloud share per phone), so any trusted person can be invited and all
// of them hear about scams once they tap it. The text message here is the
// only text Loop Me ever prepares.
import { cloudCreateInviteOrError, cloudInviteCode, cloudSubscribe } from '../../modules/scam-ai';
import { sendSms, inviteText } from './familyLink';
import { ensureNotificationPermission } from './notify';
import type { Settings, TrustedPerson } from './storage';

export type InviteResult = { ok: true; url: string; code?: string } | { ok: false; error: string; noAccount: boolean };

/** The share link, or the real reason there is none. */
export async function inviteLink(s: Settings): Promise<InviteResult> {
  // Never hang the button: if iCloud has not answered in 12 seconds, say so.
  const slow = new Promise<{ error: string; noAccount: boolean }>(res => setTimeout(() => res({ error: 'iCloud did not answer. Check your connection and try again.', noAccount: false }), 12000));
  const r = await Promise.race([cloudCreateInviteOrError(s.myName || s.careName || 'Family'), slow]);
  if ('url' in r) {
    await cloudSubscribe(); await ensureNotificationPermission();
    // The code is a second way in. If it cannot be made, the link still works.
    const c = await Promise.race([cloudInviteCode(s.myName || s.careName || 'Family'), new Promise<{ error: string }>(res => setTimeout(() => res({ error: 'slow' }), 8000))]);
    return { ok: true, url: r.url, code: 'code' in c ? c.code : undefined };
  }
  return { ok: false, error: r.error, noAccount: r.noAccount };
}

/** Open Messages with the invite addressed to this person. */
export async function sendInviteTo(s: Settings, person: TrustedPerson): Promise<InviteResult> {
  const r = await inviteLink(s);
  if (!r.ok) return r;
  await sendSms(person.phone, inviteText(s.myName || s.careName, r.url, r.code));
  return r;
}

/** Mark one person as invited, by phone. */
export function markInvited(s: Settings, person: TrustedPerson): Settings {
  return { ...s, familyInvited: true, trusted: s.trusted.map(t => t.phone === person.phone ? { ...t, invited: true } : t) };
}

/** Does an iCloud participant name look like this person? First name match is the best iOS gives us. */
export function isLinked(s: Settings, person: TrustedPerson): boolean {
  if (!s.familyLinked || s.familyRole !== 'owner') return false;
  const first = person.name.split(' ')[0].toLowerCase();
  const names = s.linkedNames.length ? s.linkedNames : (s.watchedBy ? [s.watchedBy] : []);
  return names.some(n => n.toLowerCase().startsWith(first) || first.startsWith(n.split(' ')[0].toLowerCase()));
}

/** Make sure the linked person is in the Family list. With `first`, they also
 *  become the main person (index 0). Matched by first name, the best iCloud gives. */
export function withMainPerson(s: Settings, name: string, first: boolean): Settings {
  const fn = (name || '').split(' ')[0].toLowerCase();
  if (!fn) return s;
  const i = s.trusted.findIndex(t => { const tf = t.name.split(' ')[0].toLowerCase(); return tf === fn || tf.startsWith(fn) || fn.startsWith(tf); });
  if (i < 0) {
    if (s.trusted.length >= 3 && !first) return s;
    const p: TrustedPerson = { name, phone: '', invited: true };
    const rest = s.trusted.length >= 3 ? s.trusted.slice(0, 2) : s.trusted;
    return { ...s, trusted: first ? [p, ...rest] : [...rest, p] };
  }
  const p = { ...s.trusted[i], invited: true };
  if (!first || i === 0) return s.trusted[i].invited ? s : { ...s, trusted: s.trusted.map((t, j) => j === i ? p : t) };
  return { ...s, trusted: [p, ...s.trusted.filter((_, j) => j !== i)] };
}
