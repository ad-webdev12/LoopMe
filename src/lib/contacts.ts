// Picking a trusted person from the address book.
//
// This used to live inline in two screens and fail silently: it required
// `picked.name` AND a phone number, and when either was missing it simply
// returned, so the person tapped "Choose from contacts", picked someone, and
// nothing happened with no explanation. Every path here now reports back.
import * as Contacts from 'expo-contacts';
import type { TrustedPerson } from './storage';
import { openContactPicker } from '../ui/ContactPicker';

export type PickResult =
  | { ok: true; person: TrustedPerson }
  | { ok: false; reason: string };

/** Best human name for a contact, however sparsely it is filled in. */
export function displayName(c: Contacts.Contact): string {
  const joined = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  return (c.name || '').trim() || joined || (c.nickname || '').trim() || (c.company || '').trim();
}

/**
 * Opens the system contact picker and returns one person with a phone number.
 * The picker is user-mediated, so it is attempted even when the contacts
 * permission was previously denied. On modern iOS it still works, and
 * refusing to open it was stranding people with no way back.
 */
export async function pickTrustedPerson(): Promise<PickResult> {
  // Loop Me's own list (src/ui/ContactPicker.tsx): the system picker's search
  // did nothing and sometimes returned the wrong row.
  let granted = false, canAskAgain = true;
  try {
    const r = await Contacts.requestPermissionsAsync();
    granted = r.granted; canAskAgain = r.canAskAgain;
  } catch { return { ok: false, reason: 'Your contacts could not be opened. You can try again in a moment.' }; }
  if (!granted) {
    return {
      ok: false,
      reason: canAskAgain
        ? 'Loop Me needs permission to open your contacts. Tap again and choose Allow.'
        : 'Contacts are turned off for Loop Me. Turn them on in Settings, Privacy, Contacts, then try again.',
    };
  }
  const picked = await openContactPicker();
  if (!picked) return { ok: false, reason: '' };          // dismissed: say nothing

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
  // Their Contacts photo. The picker often returns the contact without its
  // image, so fetch the full record by id when we are allowed to.
  let photo = (picked.image as { uri?: string } | undefined)?.uri || (picked.rawImage as { uri?: string } | undefined)?.uri;
  const id = (picked as { id?: string }).id;
  if (!photo && id) photo = await photoFor(id);
  const person: TrustedPerson = { name, phone, ...(photo ? { photo } : {}), ...(id ? { contactId: id } : {}) };
  return { ok: true, person };
}

/** Same phone, ignoring spaces, dashes, brackets and a leading country code. */
export function samePhone(a: string, b: string): boolean {
  const d = (s: string) => s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d(a) === d(b) && d(a).length > 0;
}

/** The current Contacts photo for one contact id, or undefined. Never prompts. */
export async function photoFor(contactId: string): Promise<string | undefined> {
  try {
    const { granted } = await Contacts.getPermissionsAsync();
    if (!granted) return undefined;
    // Ask for the thumbnail as base64 too: the file path expo writes lives in
    // the app's cache, which moves on every update and can be purged by iOS.
    const c = await Contacts.getContactByIdAsync(contactId, [Contacts.Fields.Image, Contacts.Fields.ImageAvailable, 'imageBase64' as Contacts.FieldType]);
    const img = c?.image as { uri?: string; base64?: string } | undefined;
    return img?.base64 || img?.uri || undefined;
  } catch { return undefined; }
}

/** Re-read every trusted person's photo from Contacts. Returns the list only if something changed. */
export async function refreshPhotos(list: TrustedPerson[]): Promise<TrustedPerson[] | null> {
  let changed = false;
  const out: TrustedPerson[] = [];
  for (const p of list) {
    if (!p.contactId) { out.push(p); continue; }
    const photo = await photoFor(p.contactId);
    if ((photo || undefined) !== (p.photo || undefined)) { changed = true; out.push({ ...p, ...(photo ? { photo } : { photo: undefined }) }); }
    else out.push(p);
  }
  return changed ? out : null;
}
