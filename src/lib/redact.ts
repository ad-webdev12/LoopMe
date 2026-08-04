// Strips personal details before anything is stored in history or sent to
// family. Short numbers (dollar amounts, dates) stay, so the message still
// reads naturally; emails, phone numbers, and long ID-like numbers do not.

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const PHONE_RE = /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const LONG_NUM_RE = /\b\d{9,}\b/g;

export function redactPrivate(text: string): string {
  return (text || '')
    .replace(EMAIL_RE, '[email]')
    .replace(PHONE_RE, '[phone]')
    .replace(LONG_NUM_RE, '[number]');
}
