// Text normalization: defeats the evasion tricks scammers use to slip past
// keyword detection, so the rules see the message the way a person reads it:
//   • homoglyphs: Cyrillic/Greek look-alikes (раypal, аpple, miсrosoft)
//   • zero-width characters splitting words (pass​word)
//   • full-width / styled unicode (ｐａｓｓｗｏｒｄ, 𝗉𝖺𝗌𝗌𝗐𝗈𝗋𝖽)
//   • typographic punctuation: iOS autocorrects ' to ’, and NFKC does NOT
//     fold it back, so every rule spelling "don't" silently missed messages
//     typed on an iPhone. Folded here so the rules can stay ASCII.
// Pure-ASCII messages pass through unchanged.

const CONFUSABLES: Record<string, string> = {
  // Cyrillic
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', ѕ: 's', і: 'i',
  ј: 'j', ԁ: 'd', һ: 'h', ո: 'n', м: 'm', т: 't', к: 'k', в: 'b', н: 'h',
  Р: 'P', С: 'C', Е: 'E', О: 'O', А: 'A', Х: 'X', Т: 'T', В: 'B', М: 'M', К: 'K',
  // Greek
  ο: 'o', α: 'a', ε: 'e', ρ: 'p', τ: 't', ι: 'i', κ: 'k', ν: 'v', Ο: 'O', Α: 'A',
  // misc look-alikes
  ӏ: 'l',
};

// Smart punctuation → ASCII. Not evasion, just what phones type by default,
// but it breaks rules just as thoroughly, so it is folded on the same pass.
const PUNCT: Record<string, string> = {
  '\u2018': "'", '\u2019': "'", '\u201a': "'", '\u201b': "'", '\u2032': "'", '\u00b4': "'", '\u0060': "'",
  '\u201c': '"', '\u201d': '"', '\u201e': '"', '\u201f': '"', '\u2033': '"',
  '\u2010': '-', '\u2011': '-', '\u2012': '-', '\u2013': '-', '\u2014': '-', '\u2015': '-', '\u2212': '-',
  '\u2026': '...', '\u00a0': ' ', '\u202f': ' ', '\u2009': ' ',
};
const PUNCT_RE = new RegExp(`[${Object.keys(PUNCT).join('')}]`, 'g');

const CONFUSABLE_RE = new RegExp(`[${Object.keys(CONFUSABLES).join('')}]`, 'g');
// zero-width space/joiner/non-joiner, BOM, word-joiner, soft hyphen
const ZERO_WIDTH_RE = /[​-‍﻿⁠­]/g;

// Words a scammer would bother disguising. Used to decide whether mixed-script
// letters are an evasion attempt or just ordinary foreign-language text.
const SENSITIVE = /^(?:apple|paypal|amazon|chase|netflix|microsoft|google|account|verify|password|passcode|code|bank|login|secure|security|wallet|bitcoin|zelle|venmo|medicare|irs|usps|fedex|refund|gift|card)$/i;

export const NORMALIZE_TABLES = { CONFUSABLES, PUNCT, SENSITIVE };

export interface Normalized {
  text: string;
  /** true when look-alike letters were hidden inside sensitive Latin words. Itself a scam signal */
  disguised: boolean;
}

export function normalizeText(input: string): Normalized {
  if (!input) return { text: '', disguised: false };
  let disguised = false;
  let t = String(input);

  // Words that mix Latin letters with confusables, and fold to a sensitive
  // keyword, are deliberate disguise. Legit foreign text doesn't do this.
  for (const word of t.split(/[^\p{L}\p{N}]+/u)) {
    if (!CONFUSABLE_RE.test(word)) continue;
    CONFUSABLE_RE.lastIndex = 0;
    const latinCount = (word.match(/[a-zA-Z]/g) || []).length;
    if (latinCount < 2) continue;
    const folded = word.replace(CONFUSABLE_RE, (ch) => CONFUSABLES[ch] || ch);
    CONFUSABLE_RE.lastIndex = 0;
    if (SENSITIVE.test(folded)) { disguised = true; break; }
  }
  if (!disguised && ZERO_WIDTH_RE.test(t)) {
    // Zero-width characters buried inside words serve no honest purpose in a text message.
    ZERO_WIDTH_RE.lastIndex = 0;
    const stripped = t.replace(ZERO_WIDTH_RE, '');
    if (stripped !== t && /[a-z]{3,}/i.test(stripped)) disguised = true;
  }
  ZERO_WIDTH_RE.lastIndex = 0;

  t = t.normalize('NFKC');
  t = t.replace(ZERO_WIDTH_RE, '');
  t = t.replace(CONFUSABLE_RE, (ch) => CONFUSABLES[ch] || ch);
  t = t.replace(PUNCT_RE, (ch) => PUNCT[ch] || ch);
  t = t.replace(/[^\S\n]+/g, ' ');
  t = deleet(t);
  // Emoji carry no meaning the detector should learn from, in either direction.
  t = t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/[^\S\n]+/g, ' ').trim();
  return { text: t, disguised };
}

// "fr4ud te4m", "pam3nt": digits standing in for letters inside a word, the
// way texts arrive after a filter-dodging rewrite. Only a token with more
// letters than digits, where every digit is one that stands for a letter,
// is folded; "x8s2", "Rs5000" and "17" are left alone.
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't' };
export function deleet(t: string): string {
  return t.replace(/\b(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*[013457])[A-Za-z0-9]{3,}\b/g, (w) => {
    const letters = (w.match(/[A-Za-z]/g) || []).length;
    const digits = (w.match(/[0-9]/g) || []).length;
    if (letters < 2 || digits === 0 || digits > letters || /[2689]/.test(w) || /^[0-9]/.test(w)) return w;
    return w.replace(/[013457]/g, (d) => LEET[d]);
  });
}
