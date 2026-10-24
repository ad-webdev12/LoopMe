// Picking a trusted person from the address book.
//
// This used to live inline in two screens and fail silently: it required
// `picked.name` AND a phone number, and when either was missing it simply
// returned, so the person tapped "Choose from contacts", picked someone, and
// nothing happened with no explanation. Every path here now reports back.
import * as Contacts from 'expo-contacts';
import type { TrustedPerson } from './storage';

export type PickResult =
  | { ok: true; person: TrustedPerson }
  | { ok: false; reason: string };

/** Best human name for a contact, however sparsely it is filled in. */
function displayName(c: Contacts.Contact): string {
  const joined = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  return (c.name || '').trim() || joined || (c.nickname || '').trim() || (c.company || '').trim();
}

/**
 * Opens the system contact picker and returns one person with a phone number.
 * The picker is user-mediated, so it is attempted even when the contacts
 * permission was previously denied — on modern iOS it still works, and
 * refusing to open it was stranding people with no way back.
 */
export async function pickTrustedPerson(): Promise<PickResult> {
  let picked: Contacts.Contact | null = null;
  try {
    picked = await Contacts.presentContactPickerAsync();
  } catch {
    // Older iOS, or the picker is genuinely unavailable: fall back to asking
    // for permission so there is still a route through.
    try {
      const { granted } = await Contacts.requestPermissionsAsync();
      if (!granted) {
        return { ok: false, reason: 'Loop Me needs permission to open your contacts. Turn it on in Settings, Privacy, Contacts.' };
      }
      picked = await Contacts.presentContactPickerAsync();
    } catch {
      return { ok: false, reason: 'Your contacts could not be opened. You can try again in a moment.' };
    }
  }

  if (!picked) {
    // A null result is ambiguous: the person cancelled, OR the picker never
    // opened because contacts access is denied. Those must not look the same —
    // treating both as "cancelled" is what made this button feel dead. Ask iOS
    // which it was, and only stay quiet for a real cancel.
    try {
      const { granted, canAskAgain } = await Contacts.getPermissionsAsync();
      if (!granted) {
        return {
          ok: false,
          reason: canAskAgain
            ? 'Loop Me needs permission to open your contacts. Tap again and choose Continue.'
            : 'Contacts are turned off for Loop Me. Turn them on in Settings, Privacy, Contacts, then try again.',
        };
      }
    } catch {
      return { ok: false, reason: 'Your contacts could not be opened. You can try again in a moment.' };
    }
    return { ok: false, reason: '' };                      // genuinely cancelled: say nothing
  }

  const numbers = picked.phoneNumbers || [];
  // Prefer a mobile number when the contact has several.
  const best =
    numbers.find(n => /mobile|iphone|cell/i.test(n.label || '')) || numbers[0];
  const phone = (best?.number || '').trim();
  const name = displayName(picked);

  if (!phone) {
    return { ok: false, reason: (name || 'That contact') + ' has no phone number saved, so we cannot text them.' };
  }
  if (!name) {
    return { ok: false, reason: 'That contact has no name saved. Give them a name in Contacts first.' };
  }
  return { ok: true, person: { name, phone } };
}

/** Same phone, ignoring spaces, dashes, brackets and a leading country code. */
export function samePhone(a: string, b: string): boolean {
  const d = (s: string) => s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d(a) === d(b) && d(a).length > 0;
}
