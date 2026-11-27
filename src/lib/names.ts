// What counts as a real first name. Any alphabet, with the joiners real names
// use (space, hyphen, apostrophe, period). No digits, no emoji, not a
// placeholder, not one letter held down.
const PLACEHOLDERS = new Set(['name', 'first name', 'firstname', 'me', 'test', 'none', 'na', 'n/a', 'user', 'abc', 'asdf', 'qwerty', 'xxx', 'unknown', 'nobody', 'anonymous', 'mom', 'dad']);

export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** Why a name can't be used, or null when it's fine. */
export function nameProblem(raw: string): string | null {
  const n = cleanName(raw);
  if (!n) return 'Enter a first name.';
  if (n.length > 30) return 'That’s too long for a first name.';
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(n)) return 'Use letters only.';
  const letters = n.replace(/[^\p{L}]/gu, '');
  if (letters.length < 2) return 'Enter a first name.';
  if (/^(.)\1+$/u.test(letters.toLowerCase())) return 'Enter a real first name.';
  if (PLACEHOLDERS.has(n.toLowerCase())) return 'Enter a real first name.';
  return null;
}

/** "anna marie" → "Anna Marie", leaving names that already have capitals alone. */
export function tidyName(raw: string): string {
  const n = cleanName(raw);
  if (n !== n.toLowerCase()) return n;
  return n.replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}
