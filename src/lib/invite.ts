// Sending the family invite to one person. The link is the same for everyone
// (one iCloud share per phone), so any trusted person can be invited and all
// of them hear about scams once they tap it. The text message here is the
// only text Loop Me ever prepares.
import { cloudCreateInviteOrError, cloudSubscribe } from '../../modules/scam-ai';
import { sendSms, inviteText } from './familyLink';
import { ensureNotificationPermission } from './notify';
import type { Settings, TrustedPerson } from './storage';

export type InviteResult = { ok: true; url: string } | { ok: false; error: string; noAccount: boolean };

/** The share link, or the real reason there is none. */
export async function inviteLink(s: Settings): Promise<InviteResult> {
  const r = await cloudCreateInviteOrError(s.myName || s.careName || 'Family');
  if ('url' in r) { await cloudSubscribe(); await ensureNotificationPermission(); return { ok: true, url: r.url }; }
  return { ok: false, error: r.error, noAccount: r.noAccount };
}

/** Open Messages with the invite addressed to this person. */
export async function sendInviteTo(s: Settings, person: TrustedPerson): Promise<InviteResult> {
  const r = await inviteLink(s);
  if (!r.ok) return r;
  await sendSms(person.phone, inviteText(s.myName || s.careName, r.url));
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
