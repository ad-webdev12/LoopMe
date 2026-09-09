// Feature extraction for the on-device learned classifier.
//
// Shared by BOTH training and inference — that is the point of it living here.
// If the trainer and the app ever disagreed about what a feature is, the model
// would silently score garbage, so there is exactly one implementation.
//
// Everything is hashed into a fixed number of buckets so the shipped model is a
// flat array of floats rather than a vocabulary. No dependencies, no allocation
// beyond one Map, and it runs in well under a millisecond.

export const DIM = 4096;

// Character n-grams catch look-alike domains and deliberate misspellings, but
// left at full weight they memorise the exact phrasing of the training set and
// stop transferring to anything new. Held down, they help; loose, they hurt.
export const CHAR_W = 0.35;

/** FNV-1a — small, fast, and stable across engines (no locale or Math.random). */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % DIM;
}

const URL_RE = /(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+\.(?:com|net|org|co|xyz|top|icu|info|online|shop|live|click|link|buzz|cyou|sbs|rest|vip|fit|bond)\b[^\s]*/gi;
const SHORTENER_RE = /\b(?:bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|cutt\.ly|shorturl)\b/i;
const RISKY_TLD_RE = /\.(?:xyz|top|icu|info|online|shop|live|click|link|buzz|cyou|sbs|rest|vip|fit|bond|zip|mov)\b/i;
const MONEY_RE = /(?:[$£€]\s?\d[\d,.]*|\b\d[\d,.]*\s?(?:dollars|usd|pounds|euros)\b)/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const CODE_RE = /\b\d{4,8}\b/;
// The sharpest distinction in this whole problem, and one that bag-of-words
// cannot see: a genuine one-time-code message DELIVERS a code to you, while an
// OTP-theft scam ASKS you to hand one back. The words are nearly identical, so
// the direction is given its own feature.
const CODE_DELIVERED_RE = /(?:your|the)[^.]{0,40}\b(?:code|otp|pin|password)\b[^.]{0,20}\bis\b[:\s]*\d{3,8}|\b\d{3,8}\b[^.]{0,20}is your[^.]{0,30}\b(?:code|otp|pin)\b/i;
const CODE_REQUESTED_RE = /(?:send|share|read|give|tell|forward|reply with|confirm|provide|enter)(?:\s+(?:me|us|back))?[^.]{0,40}\b(?:code|otp|pin|passcode)\b|\b(?:code|otp|pin|passcode)\b[^.]{0,30}(?:back to us|to verify|to confirm|so (?:i|we) can)/i;
const NEVER_SHARE_RE = /(?:never|do ?n'?t|will never)\s+(?:ask|share|give|request)[^.]{0,50}(?:code|pin|password|otp)|(?:code|otp)[^.]{0,30}(?:do ?n'?t|never) share/i;

/**
 * Structural facts about a message that individual words cannot express.
 * These get their own stable buckets so the model can learn them directly.
 */
function structural(raw: string, words: string[]): string[] {
  const out: string[] = [];
  const urls = raw.match(URL_RE) || [];
  if (urls.length) out.push('S:url');
  if (urls.length > 1) out.push('S:multiurl');
  if (SHORTENER_RE.test(raw)) out.push('S:shortener');
  if (RISKY_TLD_RE.test(raw)) out.push('S:riskytld');
  if (MONEY_RE.test(raw)) out.push('S:money');
  if (PHONE_RE.test(raw)) out.push('S:phone');
  if (CODE_RE.test(raw)) out.push('S:code');
  const delivered = CODE_DELIVERED_RE.test(raw);
  const requested = CODE_REQUESTED_RE.test(raw);
  if (delivered && !requested) out.push('S:code-delivered');   // a real one-time code
  if (requested) out.push('S:code-requested');                  // someone wants yours
  if (NEVER_SHARE_RE.test(raw)) out.push('S:never-share');      // real senders say this
  if (/[!]{2,}|[?]{2,}/.test(raw)) out.push('S:bangbang');

  const letters = raw.replace(/[^a-z]/gi, '');
  if (letters.length > 12) {
    const caps = (raw.match(/[A-Z]/g) || []).length / letters.length;
    if (caps > 0.4) out.push('S:shouty');
  }
  // Length carries real signal: scam texts cluster in a middle band, while a
  // genuine note from family is usually very short.
  const n = words.length;
  out.push(n < 8 ? 'S:len:xs' : n < 18 ? 'S:len:s' : n < 35 ? 'S:len:m' : 'S:len:l');
  return out;
}

/**
 * Turns a message into a sparse bag of hashed features with counts.
 * `raw` should already be normalized (see normalize.ts) by the caller.
 */
export function featurize(raw: string): Map<number, number> {
  const lower = raw.toLowerCase();
  const words = lower.split(/[^a-z0-9$£€@.'-]+/).filter(Boolean);
  const feats = new Map<number, number>();
  const add = (key: string, v = 1) => {
    const i = hash(key);
    feats.set(i, (feats.get(i) || 0) + v);
  };

  for (let i = 0; i < words.length; i++) {
    add('W:' + words[i]);
    if (i + 1 < words.length) add('B:' + words[i] + '_' + words[i + 1]);
    if (i + 2 < words.length) add('T:' + words[i] + '_' + words[i + 1] + '_' + words[i + 2]);
  }
  // Character 4-grams over a collapsed form: catches look-alike domains and
  // deliberate misspellings that word features slice apart.
  const squished = lower.replace(/\s+/g, ' ');
  for (let i = 0; i + 4 <= squished.length; i++) add('C:' + squished.slice(i, i + 4), CHAR_W);

  for (const s of structural(raw, words)) add(s, 1);

  // L2-normalize so a long message cannot outvote a short one purely on volume.
  let norm = 0;
  for (const v of feats.values()) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  for (const [k, v] of feats) feats.set(k, v / norm);
  return feats;
}
