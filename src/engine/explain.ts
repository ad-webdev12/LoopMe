// What to point at, and why. The detector decides the verdict; this picks
// the few short phrases in the message that show it, each with a plain
// reason, for the highlights and the "why" lists. Every phrase is cut from
// the message exactly as written, so a highlight never covers more than the
// words that matter. ios/Shared/Engine/Engine.swift (Explain) runs the same
// table, exported in engine.json, so the Messages drawer says the same thing.

export interface Point {
  /** The words exactly as they appear in the message. */
  phrase: string;
  /** Three to five words, for a list. Never starts with "It asks you to". */
  short: string;
  /** One sentence: why that matters. */
  why: string;
}

interface Pattern { source: string; flags: string; short: string; why: string; rank: number; needTags?: string[] }

const Q = "['’]";
const P = (re: string, short: string, why: string, rank: number, needTags?: string[]): Pattern =>
  ({ source: re, flags: 'i', short, why, rank, needTags });

// Rank: higher wins when there are more than three. Ties keep text order.
export const EXPLAIN: Pattern[] = [
  P(`\\b(?:send|wire|transfer|pay|zelle|venmo|lend|loan)\\b[^.?!\\n]{0,24}?[$£€]\\s?\\d[\\d,]*(?:\\.\\d\\d)?(?:\\s+(?:today|now|right now|asap|tonight|by \\w+))?`,
    'Wants money fast', 'Rushing you stops you checking.', 10),
  P(`\\b(?:buy|pay(?: with| in)?|purchase|get|pick up|send|scratch)\\b[^.?!\\n]{0,20}?\\b(?:gift ?cards?|itunes cards?|google play cards?|apple cards?|steam cards?|ebay cards?)\\b`,
    'Wants gift cards', 'No real company or agency takes gift cards.', 10),
  P(`\\b(?:don${Q}?t|can${Q}?t|do not|won${Q}?t|mustn${Q}?t) tell (?:anyone|anybody|dad|mom|mum|mum and dad|mom and dad|grandpa|grandma|nana|papa|your \\w+|him|her|them)\\b|\\bkeep (?:this|it) (?:between us|a secret|secret|quiet)\\b|\\bour (?:little )?secret\\b`,
    'Wants it kept secret', 'Real family doesn’t ask for secrets.', 9),
  P(`\\bsafe account\\b`, '“Safe account” trick', 'Your bank will never ask you to move money.', 10),
  P(`\\b(?:send|share|tell|read|give|forward)(?: me| us)?(?: the| your| that| this)?(?: \\d-digit)? (?:code|pin|passcode|otp)\\b`,
    'Asks for a code', 'Never share a code someone else sent you.', 10),
  P(`\\b(?:anydesk|teamviewer|remote access|your (?:computer|device|phone) (?:has|is) (?:a |been )?(?:virus|infected|hacked))\\b`,
    'Wants into your device', 'Apple and Microsoft never contact you like this.', 9),
  P(`\\bnew (?:phone |cell )?number\\b|\\bdifferent (?:phone|number)\\b|\\bmine${Q}?s in for repair\\b`,
    'From a new number', 'You can’t tell who it really is.', 8),
  P(`\\b(?:lost|broke|dropped|smashed|cracked) my phone\\b|\\bmy phone (?:broke|died|is broken)\\b`,
    'Says their phone broke', 'A classic way to explain a strange number.', 6),
  P(`\\b(?:bitcoin|crypto|usdt|btc|ethereum)\\b`,
    'Wants crypto', 'Crypto can’t be taken back once it’s sent.', 8),
  P(`\\b(?:warrant|arrest|lawsuit|legal action|police case)\\b`,
    'Threatens you', 'Agencies don’t threaten people by text.', 8),
  P(`[$£€]\\s?\\d+(?:\\.\\d\\d)? (?:fee|charge|payment)\\b|\\b(?:fee|payment|charge) (?:is )?(?:due|required|pending|outstanding)\\b|\\bredelivery fee\\b`,
    'Small fee to pay', 'Real carriers and agencies don’t ask for fees by text.', 7),
  P(`\\bverify (?:your )?(?:account|identity|details|information|card|payment)\\b|\\bconfirm your (?:identity|details|account|card)\\b`,
    'Wants you to “verify”', 'Banks never ask for this by text.', 7),
  P(`\\b(?:you${Q}?ve won|you have won|you won|winner|claim your (?:prize|reward|gift|refund))\\b`,
    'A prize you didn’t enter', 'Real prizes don’t arrive by text.', 7),
  P(`\\b(?:on hold|suspended|locked|deactivated|frozen|disabled|blocked)\\b`,
    'Says something is blocked', 'Fear makes you act before you think.', 5),
  P(`\\b(?:urgent(?:ly)?|immediately|right away|act now|final (?:notice|warning)|last chance|within \\d+ (?:hours?|minutes?|mins?)|expires? (?:today|tonight|soon))\\b`,
    'Rushing you', 'Rushing you stops you checking.', 5),
  P(`\\breply (?:y(?:es)? or n(?:o)?|yes or no|y\\/n|stop|yes|no|y|n)\\b`,
    'Wants a reply', 'A reply tells a scammer your number works.', 4),
  P(`\\b(?:tap|click|press|open) (?:here|the link|this link|below)\\b`,
    'Wants you to tap a link', 'A link in a text can go anywhere.', 4),
  P(`\\bcall (?:us |me |back )?(?:now |today )?(?:at |on )?\\+?1?[\\s.-]?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}\\b`,
    'Wants you to call back', 'Call the number on your card or bill instead.', 6),
  P(`\\b(?:confirm|verify|update|re-?enter|re-?register|register|send|give|tell|read|provide|need)\\b[^.?!\\n]{0,24}?\\b(?:date of birth|birthday|social security(?: number)?|ssn|national insurance(?: number)?|policy number|account number|card number|card details|bank details|payment (?:details|information|info)|security (?:number|code|questions?)|password|login|sort code|full name and address|personal (?:details|information))\\b`,
    'Wants your details', 'Real companies already have these and never ask by text or call.', 9),
  P(`\\b(?:don${Q}?t|do not|please don${Q}?t) (?:hang up|end the call|put the phone down|disconnect)\\b|\\bstay on the (?:line|phone)\\b|\\bno cuelgue\\b`,
    'Keeps you on the line', 'Hang up. A real caller won’t mind you calling back.', 9),
  P(`\\b(?:not|never) (?:to )?(?:discuss|mention|tell)\\b[^.?!\\n]{0,30}|\\b(?:not|never) be told\\b|\\bwithout telling\\b[^.?!\\n]{0,20}`,
    'Wants it kept secret', 'Anyone honest is happy for you to ask someone.', 9),
  P(`\\b(?:administration|admin|processing|handling|release|success|clearance|courier|customs|activation|registration|upfront|initial)\\s(?:fee|charge|amount|payment|cost)\\b`,
    'A fee before you get anything', 'Paying to receive money is always a trick.', 9),
  P(`\\b(?:sign|log) ?in (?:via|through|using|with|at) (?:the|this|our)?\\s?(?:link|secure portal|portal|page)\\b|\\bre-?enter your (?:payment|card|bank)\\b`,
    'Wants you to log in by link', 'Open the company’s own app instead.', 8),
  P(`\\b(?:will be|is being|has been|to be) (?:closed|terminated|cancelled|canceled|suspended|blocked|bloque|frozen)\\b|\\b(?:permanent )?closure of your\\b`,
    'Threatens to close your account', 'Fear makes you act before you think.', 6),
  P(`\\b(?:been in an accident|had an accident|had a (?:bump|crash|fall)|in hospital|in jail|arrested|in trouble)\\b`,
    'A sudden emergency', 'Call them on the number you know before doing anything.', 8),
  P(`\\b(?:need(?:s)? cash|short on (?:money|cash)|i${Q}?m short|without my (?:purse|wallet|card)|lend me|borrow)\\b`,
    'Asks to borrow money', 'Check with them in person or on their usual number.', 8),
  P(`\\b(?:press (?:one|1)|press \\d to)\\b`, 'Wants you to press a key', 'Hang up and call the company yourself.', 6),
  P(`\\b(?:recover|claw back|get back|reclaim)\\b[^.?!\\n]{0,24}?\\b(?:funds|money|what you lost|losses)\\b`,
    '“Recover your money” con', 'People who lost money get targeted again.', 9),
  P(`\\b(?:fraud (?:prevention|department|team|unit)|card protection team|security team|technical (?:department|support)|helpdesk|tech support)\\b`,
    'Claims to be a fraud or tech team', 'Hang up and call the number you already know.', 5),
  P(`\\b(?:refund|overcharged|owed money|entitled to)\\b`, 'A refund out of nowhere', 'Refund offers are used to get your bank details.', 5),
  P(`\\b(?:picked|selected|chosen) in (?:our|a|the) (?:draw|lottery|promotion)\\b|\\brelease the funds\\b`,
    'A prize you didn’t enter', 'Real prizes don’t arrive like this.', 7),
  P(`\\b(?:send|pay|transfer) (?:you )?(?:extra|more than)\\b|\\bmy courier will (?:collect|pick)\\b`,
    'Overpayment trick', 'They overpay, then ask for the difference back.', 8),
  P(`\\bwarranty\\b[^.?!\\n]{0,20}?\\b(?:lapsed|expired|expiring|expires)\\b`, 'Fake warranty notice', 'Check with the company you actually bought from.', 7),
  P(`\\b(?:holding |a |the )?deposit\\b`, 'Wants a deposit', 'Don’t pay until you’ve seen it in person.', 7),
  P(`\\b(?:overdue|must be (?:paid|repaid|made)|payable|outstanding)\\b`, 'Pressure to pay', 'Check with the company on a number you already have.', 6),
  P(`\\b(?:ring|call|phone) (?:this|the|our) number\\b|\\bpress (?:one|two|three|\\d)\\b`, 'Wants you to call or press', 'Hang up and call the company yourself.', 6),
  P(`\\bwill be deleted\\b|\\bhas expired\\b|\\babout to (?:end|expire)\\b|\\bat risk\\b|\\bgoes to someone else\\b`, 'Threatens a loss', 'Fear makes you act before you think.', 5),
  P(`\\b(?:in|within) \\d+ (?:hours?|days?)\\b|\\bthis week\\b|\\bby (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|tonight)\\b`, 'Rushing you', 'Rushing you stops you checking.', 4),
  // Links only count when the link checks found something wrong with them.
  P(`\\b(?:https?:\\/\\/)?(?:[a-z0-9-]+\\.)+[a-z]{2,10}(?:\\/[^\\s]*)?`,
    'A link that isn’t real', 'It looks official but goes somewhere else.', 8, ['url-lookalike', 'url-blocklisted', 'url-brand-subdomain', 'url-glued', 'url-ip', 'url-look', 'url-punycode', 'url-security-theater', 'url-tld']),
  P(`\\b(?:https?:\\/\\/)?(?:bit\\.ly|tinyurl\\.com|t\\.co|rb\\.gy|is\\.gd|cutt\\.ly|ow\\.ly|shorturl\\.at|tiny\\.cc)\\/[^\\s]*`,
    'A hidden link', 'You can’t see where it really goes.', 7, ['url-shortener']),
];

// The trick, by the detector's tag, for messages with no single phrase to point at.
export const BY_TAG: Record<string, [string, string]> = {
  'family-emergency': ['Pretends to be family', 'Call them on the number you know.'],
  'borrow-ask': ['Asks to borrow money', 'Check with them in person or on their usual number.'],
  'borrow-repay': ['Asks for money', 'Check who it is before you send anything.'],
  'money-ask': ['Asks for money', 'Check who it is before you send anything.'],
  'money-deadline': ['Money, with a deadline', 'Rushing you stops you checking.'],
  'giftcard': ['Wants gift cards', 'No real company or agency takes gift cards.'],
  'payment': ['Wants money', 'Check who it is before you pay anything.'],
  'payment-demand': ['Demands payment', 'Real bills don’t arrive like this.'],
  'pay-or-lose': ['Pay or lose something', 'Fear makes you act before you think.'],
  'advance-fee': ['A fee before you get anything', 'Paying to receive money is always a trick.'],
  'deposit-hold': ['Wants a deposit', 'Don’t pay until you’ve seen it in person.'],
  'safe-account': ['“Safe account” trick', 'Your bank will never ask you to move money.'],
  'bank-alert': ['Pretends to be your bank', 'Call the number on the back of your card.'],
  'account-locked': ['Says your account is locked', 'Open the company’s own app to check.'],
  'unusual-signin': ['“Unusual sign-in” alarm', 'Open the company’s own app to check.'],
  'verify': ['Wants you to “verify”', 'Banks never ask for this by text.'],
  'detail-harvest': ['Wants your details', 'Real companies never ask for these this way.'],
  'otp-request': ['Asks for a code', 'Never share a code someone else sent you.'],
  'secrecy': ['Wants it kept secret', 'Anyone honest is happy for you to ask someone.'],
  'urgency': ['Rushing you', 'Rushing you stops you checking.'],
  'service-cutoff': ['Threatens a cutoff', 'Call the company on the number on your bill.'],
  'gov-impersonation': ['Pretends to be official', 'Agencies don’t contact people like this.'],
  'digital-arrest': ['Fake arrest threat', 'Police never ask for money to stop an arrest.'],
  'fake-debt': ['A debt you don’t owe', 'Check your own records before paying anything.'],
  'tech-support': ['Fake tech support', 'Apple and Microsoft never contact you like this.'],
  'remote-access': ['Wants into your device', 'Never let a stranger onto your computer.'],
  'callback': ['Wants you to call back', 'Call the number on your card or bill instead.'],
  'stay-on-line': ['Keeps you on the line', 'Hang up. A real caller won’t mind.'],
  'prize': ['A prize you didn’t enter', 'Real prizes don’t arrive like this.'],
  'job-offer': ['A job by text', 'Real employers don’t hire by text.'],
  'job-scam': ['A job that’s too easy', 'Easy money jobs end with you paying.'],
  'investment': ['An investment pitch', 'Never invest because a stranger messaged you.'],
  'crypto': ['Wants crypto', 'Crypto can’t be taken back once it’s sent.'],
  'romance': ['A romance con', 'Someone you haven’t met in person shouldn’t need money.'],
  'wrong-number': ['A “wrong number” opener', 'Don’t reply. It’s how long cons start.'],
  'overpayment': ['Overpayment trick', 'They overpay, then ask for the difference back.'],
  'charity': ['A charity you didn’t contact', 'Give through the charity’s own website.'],
  'recovery': ['“Recover your money” con', 'People who lost money get targeted again.'],
  'refund': ['A refund out of nowhere', 'Refund offers are used to get your bank details.'],
  'delivery-fee': ['A fee for a delivery', 'Real carriers don’t ask for fees by text.'],
  'package-fee': ['A fee for a delivery', 'Real carriers don’t ask for fees by text.'],
  'toll': ['A toll you don’t owe', 'Check on the toll company’s own website.'],
  'warranty': ['Fake warranty notice', 'Check with the company you bought from.'],
  'url-mismatch': ['The link doesn’t match', 'It names one company and links to another.'],
  'url-lookalike': ['A link that isn’t real', 'It looks official but goes somewhere else.'],
  'url-shortener': ['A hidden link', 'You can’t see where it really goes.'],
  'url-blocklisted': ['A known scam link', 'This link has been used in scams before.'],
};

// When nothing looks wrong, say what was checked rather than inventing praise.
export const CLEAN: Point[] = [
  { phrase: '', short: 'No money', why: 'It doesn’t ask you to pay or send anything.' },
  { phrase: '', short: 'No link', why: 'There’s nothing to tap.' },
  { phrase: '', short: 'No rush', why: 'It doesn’t push you to act right now.' },
];

const compiled = EXPLAIN.map(p => ({ ...p, re: new RegExp(p.source, p.flags + 'g') }));

export function explain(text: string, level: 'red' | 'amber' | 'green', tags: string[] = []): Point[] {
  const found: { at: number; end: number; rank: number; p: Pattern; phrase: string }[] = [];
  compiled.forEach(p => {
    if (p.needTags && !p.needTags.some(t => tags.includes(t))) return;
    p.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.re.exec(text))) {
      const phrase = m[0].trim().replace(/[.,;:!?)]+$/, '');
      if (phrase.length > 1) found.push({ at: m.index, end: m.index + phrase.length, rank: p.rank, p, phrase });
      if (m[0].length === 0) p.re.lastIndex++;
    }
  });
  // Best first; no overlaps; one phrase per reason.
  found.sort((a, b) => b.rank - a.rank || a.at - b.at);
  const pick: typeof found = [];
  for (const f of found) {
    if (pick.length >= 3) break;
    if (pick.some(g => g.p.short === f.p.short)) continue;
    if (pick.some(g => f.at < g.end && g.at < f.end)) continue;
    pick.push(f);
  }
  pick.sort((a, b) => a.at - b.at);
  const points = pick.map(f => ({ phrase: f.phrase, short: f.p.short, why: f.p.why }));
  // Nothing short enough to point at: name the trick from the detector's tags.
  if (level !== 'green' && points.length < 2) {
    for (const t of tags) {
      const f = BY_TAG[t];
      if (f && points.length < 3 && !points.some(p => p.short === f[0])) points.push({ phrase: '', short: f[0], why: f[1] });
    }
  }
  if (level === 'green') {
    // A clean verdict lists what it checked, except anything the text does contain.
    const has = (s: string) => points.some(x => x.short === s);
    return CLEAN.filter(c => !(c.short === 'No money' && (has('Wants money fast') || has('Small fee to pay')))
      && !(c.short === 'No link' && /\b(?:https?:\/\/|www\.)|\.[a-z]{2,6}\//i.test(text))
      && !(c.short === 'No rush' && has('Rushing you')));
  }
  return points;
}

/** The phrases to highlight, in message order. */
export function highlights(text: string, level: 'red' | 'amber' | 'green', tags: string[] = []): string[] {
  return level === 'green' ? [] : explain(text, level, tags).map(p => p.phrase).filter(Boolean);
}

/** One line under the headline: who it pretends to be, or the strongest reason. */
export function headline(text: string, level: 'red' | 'amber' | 'green', tags: string[] = []): string {
  if (level === 'green') return 'Nothing here matches a scam we know.';
  if (tags.includes('family-emergency')) return 'Someone is pretending to be family.';
  const pts = explain(text, level, tags);
  const best = EXPLAIN.filter(x => pts.some(p => p.short === x.short)).sort((a, b) => b.rank - a.rank)[0];
  return best ? best.why : level === 'red' ? 'This matches a scam we know.' : 'Texts like this are easy to fake.';
}
