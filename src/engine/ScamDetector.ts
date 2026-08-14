// ScamDetector v3 — deterministic, on-device, offline, <50ms.
// THE COMPETITIVE MOAT IS NOT THE MODEL. It is speed + commitment + a human on the other end.
// (Norton: 29.8s + restart per check. Scamio: never commits. McAfee: no screenshots. We: instant, committed, looped-in.)
//
// v3 over v2: unicode de-obfuscation (homoglyphs, zero-width), full link forensics
// (blocklist, levenshtein look-alikes, brand-subdomain disguises), 9 new scam
// families (advance-fee, overpayment, sextortion, charity, callback, QR-bait,
// crypto-wallet, tech-support, pet/rental deposit), and safety-disclaimer
// negative signals so real bank warnings stop looking like threats.

import { normalizeText } from './normalize';
import { analyzeLinks } from './linkForensics';

export type Level = 'red' | 'amber' | 'green';
export type Confidence = 'very' | 'fairly' | 'unsure';

export interface Verdict {
  level: Level;
  reason: string;          // one plain sentence, committed — never hedged
  safeStep: string;        // exactly one action
  signals: string[];       // plain-language reasons for "Show me why"
  matches: string[];       // exact phrases from the message, for highlighting
  tags: string[];          // machine tags (also feeds two-stage detection)
  confidence: Confidence;
  codeWordMoment: boolean; // surface the family code word banner
  score: number;
  disguised: boolean;      // message used hidden/look-alike characters to dodge filters
}

export interface DetectorOptions {
  allowlist?: string[];
  sender?: string;
  recentTags?: string[];   // tags from the previous check — enables two-stage detection
  postPanic?: boolean;     // person completed the Panic flow in the last 90 days
}

interface Rule { re: RegExp; w: number; tag: string; plain: string; }

const RULES: Rule[] = [
  // — SECRECY: the single highest-weight signal. Every real institution is fine with you calling your daughter.
  { re: /(?:don'?t|do not) (?:tell|contact|call|inform|discuss(?: this)? with) (?:anyone|anybody|your (?:family|wife|husband|son|daughter|kids|children|lawyer|attorney|bank)|mom|dad|the police)/i, w: 55, tag: 'secrecy', plain: 'It asks you to keep it secret. Honest people never need secrecy.' },
  { re: /keep (?:this|it) (?:a )?(?:secret|between us|confidential|private|quiet)/i, w: 55, tag: 'secrecy', plain: 'It asks you to keep it secret. Honest people never need secrecy.' },
  // — Digital arrest / government threats
  { re: /(?:arrest warrant|warrant (?:for|has been issued)|court order|legal action|federal (?:agent|officer|case)|you (?:will|may) be arrested|under investigation)/i, w: 45, tag: 'digital-arrest', plain: 'It threatens arrest or legal action. Real police and courts never call, text, or video-chat threats — ever.' },
  { re: /\b(?:irs|social security(?: administration)?|ssa|medicare|dea|fbi|homeland security)\b[\s\S]{0,90}(?:suspend|arrest|owe|fine|immediately|final|blocked|frozen)/i, w: 45, tag: 'gov-impersonation', plain: 'It pretends to be the government and threatens you. The government does not text threats.' },
  // — Bank impersonation (stage 1 of the two-stage con)
  { re: /(?:did you (?:authorize|approve|make)|unauthorized|suspicious) (?:a |an |this )?(?:\$[\d,.]+ )?(?:charge|payment|transaction|transfer|purchase|zelle)/i, w: 30, tag: 'bank-alert', plain: 'It looks like a bank fraud alert. Scammers send fake ones, then call pretending to be the fraud department.' },
  { re: /reply (?:no|yes|stop|1|y|n) (?:to|if)/i, w: 12, tag: 'bank-alert', plain: 'It asks you to reply — that tells the scammer a real person is here.' },
  // — Stage 2: the "safe account" move. Firing this is the app's highest duty.
  { re: /(?:move|transfer) (?:your |the )?(?:money|funds|balance)[\s\S]{0,50}(?:safe|secure|protected|new) account/i, w: 90, tag: 'safe-account', plain: 'They want you to move money to a “safe account.” There is no such thing. Your bank will NEVER ask this. This is the trick itself.' },
  { re: /fraud (?:department|team|agent|specialist)[\s\S]{0,80}(?:verify|secure|move|transfer|protect)/i, w: 45, tag: 'safe-account', plain: 'A “fraud department” asking you to act is the second half of a two-part con.' },
  // — Family emergency / voice-clone territory
  { re: /(?:grandm[ao]|grandpa|grandson|granddaughter|your (?:son|daughter|grandchild|nephew|niece))[\s\S]{0,90}(?:trouble|jail|arrest|accident|bail|hospital|hurt|money|help)/i, w: 50, tag: 'family-emergency', plain: 'It pretends a family member is in trouble and needs money fast.' },
  { re: /(?:it'?s me|this is your grandson|this is your granddaughter)[\s\S]{0,80}(?:jail|accident|bail|trouble|hospital|money)/i, w: 50, tag: 'family-emergency', plain: 'A voice or message claiming to be family in an emergency. A cloned voice can sound exactly like them — your code word cannot be cloned.' },
  // — Gift cards, crypto, payments
  { re: /gift\s*card|itunes\s*card|google\s*play\s*card|steam\s*card|vanilla\s*card/i, w: 50, tag: 'giftcard', plain: 'It asks about gift cards. Real companies and the government never ask for gift cards.' },
  { re: /bitcoin|crypto(?:currency)?|\bbtc\b|\busdt\b|coinbase|binance|crypto ?atm/i, w: 25, tag: 'crypto', plain: 'It involves cryptocurrency, which scammers use because payments cannot be undone.' },
  { re: /(?:western union|moneygram)|wire (?:transfer|\$?\d)/i, w: 35, tag: 'payment', plain: 'It asks for a wire transfer, which can’t be reversed once sent.' },
  { re: /(?:zelle|cash ?app|venmo|apple ?pay)[\s\S]{0,60}(?:send|pay|transfer|owe)|(?:send|pay|transfer)[\s\S]{0,50}(?:by |via |through )?(?:zelle|cash ?app|venmo)/i, w: 28, tag: 'payment', plain: 'It asks you to send money by wire or app, which cannot be reversed.' },
  { re: /(?:this is your (?:son|daughter|grandson|granddaughter|mom|dad))[\s\S]{0,90}(?:money|send|broken|new number)|(?:phone (?:is |got )?broken|lost my phone|new number)[\s\S]{0,80}(?:send|money|zelle|venmo|cash)/i, w: 45, tag: 'family-emergency', plain: 'A “family member” with a broken phone asking for money is a classic con. Call their real number — the one you already have.' },
  // — Account/verify pressure
  { re: /account (?:has been |is |was |will be )?(?:locked|suspended|closed|compromised|on hold|restricted|deactivat|frozen)/i, w: 30, tag: 'account-locked', plain: 'It claims your account is locked or suspended to scare you into clicking.' },
  { re: /(?:verify|confirm|update|validate) your (?:account|identity|information|payment|card|billing|details)/i, w: 26, tag: 'verify', plain: 'It pushes you to \u201cverify\u201d information through a link.' },
  { re: /(?:unusual|suspicious) (?:sign[- ]?in|login|activity|attempt)/i, w: 25, tag: 'unusual-signin', plain: 'It claims suspicious sign-in activity to make you panic and click.' },
  // — OTP theft
  { re: /(?:send|share|read|give|tell|forward)(?: me| us)? (?:the |that |your )?(?:one[- ]?time |verification |security |6[- ]digit |four[- ]digit )?(?:code|otp|passcode|pin)\b/i, w: 55, tag: 'otp-request', plain: 'It asks for a security code. Never share codes. That is how accounts get stolen.' },
  // — Crypto wallet / seed phrase theft
  { re: /(?:seed phrase|recovery phrase|secret phrase|private key|wallet (?:key|password))/i, w: 50, tag: 'wallet-phrase', plain: 'It mentions your wallet’s secret phrase. Anyone who asks for it is stealing — no support team ever needs it.' },
  // — Delivery / toll / subscription workhorses
  { re: /(?:re-?deliver|redelivery|package|parcel|shipment)[\s\S]{0,70}(?:fee|held|pending|customs|unable|address (?:issue|problem|incomplete))/i, w: 35, tag: 'package-fee', plain: 'It says a package needs a fee or a new address, a very common trick.' },
  { re: /(?:toll|e-?z ?pass|fastrak|sunpass)[\s\S]{0,70}(?:unpaid|due|fee|balance|violation|invoice)/i, w: 40, tag: 'toll', plain: 'Fake unpaid-toll texts are everywhere right now. Toll agencies send bills by mail, not text.' },
  { re: /(?:netflix|apple|amazon prime|hulu|spotify|disney)[\s\S]{0,70}(?:payment (?:failed|declined|problem)|suspend|expired|renew|update your payment)/i, w: 32, tag: 'subscription', plain: 'It claims a streaming payment failed. Check inside the app itself, never through a link in a message.' },
  // — Prizes, refunds, jobs
  { re: /(?:you(?:'ve| have)? (?:won|been selected)|winner|prize|lottery|sweepstake|claim your (?:reward|prize)|congratulations[\s\S]{0,40}(?:won|selected))/i, w: 42, tag: 'prize', plain: 'It says you won a prize you never entered for.' },
  { re: /(?:tax refund|stimulus|rebate|reimbursement)[\s\S]{0,60}(?:claim|click|pending|verify)/i, w: 32, tag: 'refund', plain: 'It dangles a refund you must “claim” through a link. The IRS mails checks; it doesn’t text links.' },
  { re: /(?:work from home|easy money|earn \$\d+|make \$\d+ (?:a |per )?(?:day|week)|part[- ]time job[\s\S]{0,50}(?:no experience|apply now|telegram|whatsapp))/i, w: 34, tag: 'job-scam', plain: 'Too-easy job offers are usually after your identity, your face and voice, or an upfront fee.' },
  // — Advance-fee / inheritance
  { re: /(?:inheritance|unclaimed (?:funds|estate)|beneficiary|next of kin|barrister|late client)[\s\S]{0,90}(?:fee|claim|transfer|million|\$)/i, w: 45, tag: 'advance-fee', plain: 'A stranger promising a fortune once you pay a small fee first — the oldest con on the internet.' },
  // — Overpayment / fake check
  { re: /(?:overpaid|paid (?:you )?too much|sent (?:you )?too much)[\s\S]{0,80}(?:send|return|refund|difference)|deposit (?:the|this) check[\s\S]{0,60}(?:send|wire|return)/i, w: 48, tag: 'overpayment', plain: 'It “overpays” you and asks you to send the difference back. The check will bounce after your real money is gone.' },
  // — Sextortion
  { re: /(?:i (?:have|recorded|made) (?:a )?(?:video|videos|photos|footage) of you|your (?:webcam|camera) was (?:hacked|accessed)|intimate (?:video|photo))/i, w: 55, tag: 'sextortion', plain: 'It claims to have embarrassing video of you and demands payment. It’s a mass-sent bluff — do not pay, do not reply.' },
  // — Charity pressure
  { re: /(?:donate|donation|disaster relief|hurricane|earthquake)[\s\S]{0,70}(?:gift card|wire|bitcoin|crypto|zelle|cash ?app|western union|moneygram)/i, w: 42, tag: 'charity', plain: 'Real charities never take gift cards, wire transfers, or crypto. This uses generosity as the hook.' },
  // — Tech support
  { re: /(?:your (?:computer|pc|iphone|phone|device) (?:has been|is|was) (?:infected|hacked|compromised)|virus(?:es)? (?:was |were |has been )?(?:detected|found|sent))/i, w: 40, tag: 'tech-support', plain: 'It claims your device is infected to scare you into calling or installing something. Real companies don’t monitor your computer.' },
  // — Callback bait
  { re: /call (?:us|now|back|this number|immediately|\+?1?[-.\s(]*\d{3})[\s\S]{0,60}(?:suspend|arrest|frozen|blocked|final|expire|avoid|cancel)|(?:suspend|arrest|frozen|blocked|final notice|expire)[\s\S]{0,60}call (?:us|now|back|this number|immediately|\+?1?[-.\s(]*\d{3})/i, w: 30, tag: 'callback', plain: 'It pressures you to call a number from the message itself. Never call a number a message gives you — find the real one yourself.' },
  // — QR bait
  { re: /scan (?:the|this) qr[\s\S]{0,60}(?:refund|payment|verify|claim|unlock|receive)/i, w: 35, tag: 'qr-bait', plain: 'It wants you to scan a QR code — a link you can’t read before opening. Scammers use them to hide where you’re really going.' },
  // — Pet / rental deposit
  { re: /(?:puppy|puppies|kitten|teacup)[\s\S]{0,80}(?:deposit|shipping|delivery fee|hold (?:him|her|it))/i, w: 38, tag: 'pet-deposit', plain: 'A pet you can’t see first, held for a deposit or shipping fee, is almost always a photo stolen from someone else’s listing.' },
  // — Romance / pig butchering / wrong number / platform hop
  { re: /(?:my (?:love|darling|dear|dearest))|(?:i(?:'ve| have) (?:fallen for|feelings for) you)|soul\s*mate|destiny brought us/i, w: 22, tag: 'romance', plain: 'It uses romance language to build false trust — the opening of a long con.' },
  { re: /(?:invest|investment|trading platform|guaranteed (?:return|profit)|double your money|portfolio)[\s\S]{0,60}(?:crypto|bitcoin|usdt|forex|opportunity)/i, w: 40, tag: 'investment', plain: 'A stranger with an investment opportunity is the “pig butchering” con: weeks of friendliness, then a fake trading site.' },
  { re: /(?:wrong number|sorry,? who is this|is this (?!my)[A-Z][a-z]+\?)[\s\S]{0,120}(?:nice|friendly|chat|anyway|by the way|new friend|where are you from)/i, w: 28, tag: 'wrong-number', plain: 'A friendly stranger from a “wrong number” who keeps chatting — this is exactly how a long con starts. It’s fine to just not reply.' },
  { re: /(?:message|text|chat with|add|contact|reach) me on (?:whatsapp|telegram|signal|wechat|viber)/i, w: 26, tag: 'platform-hop', plain: 'It pushes you to move to another app. Scammers hop platforms so no one can trace the whole story.' },
  // — Recovery scams (weighted up further when postPanic is on)
  { re: /(?:recover|get back|retrieve|reclaim)[\s\S]{0,30}(?:money|funds|losses)|(?:funds? |asset |money )?recovery (?:firm|service|agent|department|specialist)|refund department/i, w: 30, tag: 'recovery', plain: 'It offers to recover money you lost. People who report a scam get targeted again by fake “recovery services.” This is one.' },
  // — Remote access / urgency
  { re: /(?:anydesk|teamviewer|ultraviewer|remote access|screen shar\w+|install (?:this|the) (?:app|software))/i, w: 45, tag: 'remote-access', plain: 'It asks you to install remote-access software so someone can control your phone.' },
  { re: /(?:act now|urgent|immediately|right away|within (?:24|48) hours|expires? (?:today|soon|tonight)|final notice|last (?:chance|warning)|asap|don'?t delay)/i, w: 15, tag: 'urgency', plain: 'It uses pressure words to rush you. Rushing is a scammer\u2019s favourite tool.' },
];

// PRECISION GUARD — the false-positive killer. Trend Micro flagged a real Amazon receipt; we will not.
// These patterns SUBTRACT from the score. A first-class feature, measured in the test suite.
const KNOWN_GOOD: Rule[] = [
  { re: /order (?:number|#|no\.?)[: ]*[\w-]{5,}/i, w: -30, tag: 'good-order', plain: '' },
  { re: /(?:has (?:been )?shipped|out for delivery|was delivered|arriving (?:today|tomorrow))(?![\s\S]{0,60}(?:fee|\$|pay|click))/i, w: -22, tag: 'good-delivery', plain: '' },
  { re: /(?:your|the) (?:appointment|visit|reservation) (?:with|is|on|at)[\s\S]{0,80}(?:reply c|confirm|reschedule|cancel)/i, w: -28, tag: 'good-appointment', plain: '' },
  { re: /(?:your|the) (?:verification |security |one[- ]?time |login )?code is[: ]*\d{4,8}/i, w: -25, tag: 'good-otp-arriving', plain: '' },
  { re: /(?:do not|don'?t|never) share (?:this|the|your) code/i, w: -15, tag: 'good-otp-arriving', plain: '' },
  { re: /(?:thanks|thank you) for your payment|payment (?:of \$[\d,.]+ )?(?:received|posted|confirmed)/i, w: -20, tag: 'good-receipt', plain: '' },
  // Real institutions warning you about scams — the opposite of a threat.
  { re: /(?:we|our (?:staff|team|employees)|your bank) will never (?:ask|call|text|request)[\s\S]{0,60}(?:password|pin|code|card|social security)/i, w: -20, tag: 'good-disclaimer', plain: '' },
  { re: /if this was(?:n'?t)? you[\s\S]{0,40}(?:no action|ignore|nothing|you can ignore)/i, w: -20, tag: 'good-noaction', plain: '' },
];

const PAY_TAGS = new Set(['giftcard','crypto','payment','package-fee','toll','refund','investment','recovery','advance-fee','overpayment','charity','pet-deposit','wallet-phrase']);
const URG_TAGS = new Set(['urgency','account-locked','gov-impersonation','family-emergency','digital-arrest','bank-alert','safe-account','subscription','sextortion','tech-support','callback']);
const CODE_WORD_TAGS = new Set(['family-emergency']);

export function detect(message: string, opts: DetectorOptions = {}): Verdict {
  const norm = normalizeText((message || '').trim());
  const text = norm.text;
  const base: Omit<Verdict, 'level' | 'reason' | 'safeStep'> = { signals: [], matches: [], tags: [], confidence: 'very', codeWordMoment: false, score: 0, disguised: norm.disguised };
  if (!text) return { ...base, level: 'green', reason: 'There’s nothing to check yet.', safeStep: 'Paste or share a message and tap “Check it”.' };

  // Person-editable allowlist ("this really is my bank's number")
  const allow = (opts.allowlist || []).map(a => a.toLowerCase().trim()).filter(Boolean);
  const hay = (text + ' ' + (opts.sender || '')).toLowerCase();
  if (allow.some(a => hay.includes(a)))
    return { ...base, level: 'green', reason: 'This matches a sender you told me is safe.', safeStep: 'If anything still feels off, loop in someone you trust.', tags: ['allowlist'], confidence: 'fairly' };

  let score = 0;
  const signals: string[] = [], matches: string[] = [], tags: string[] = [];
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) { score += r.w; signals.push(r.plain); matches.push(m[0]); if (!tags.includes(r.tag)) tags.push(r.tag); }
  }
  // Recovery-scam guard: post-panic, recovery patterns hit much harder
  if (opts.postPanic && tags.includes('recovery')) score += 35;

  // Disguised characters: hiding "apple" or "gift card" behind look-alike letters
  // is itself proof of bad intent — no honest sender does this.
  if (norm.disguised) {
    score += 25;
    signals.push('The message hides its words behind look-alike or invisible characters so filters can’t read them. Honest senders never do this.');
    if (!tags.includes('disguise')) tags.push('disguise');
  }

  // URL forensics
  const links = analyzeLinks(text);
  for (const h of links.hits) { score += h.w; signals.push(h.plain); matches.push(h.match); if (!tags.includes(h.tag)) tags.push(h.tag); }
  if (links.urlCount >= 3) { score += 15; signals.push('It contains several links. Real banks send one link at most; scammers scatter many.'); tags.push('url-many'); }

  // Precision guard — subtract for known-good patterns, but never when the scam
  // half of the pattern is present (OTP being *requested*, "safe account" move).
  for (const g of KNOWN_GOOD) {
    if (g.tag === 'good-otp-arriving' && tags.includes('otp-request')) continue;
    if (g.tag === 'good-disclaimer' && (tags.includes('otp-request') || tags.includes('safe-account'))) continue;
    if (g.re.test(text)) score += g.w;
  }
  score = Math.max(0, score);

  // The scam triangle: urgency × payment × secrecy. Any two = at least amber. All three = red, always.
  const hasPay = tags.some(t => PAY_TAGS.has(t));
  const hasUrg = tags.some(t => URG_TAGS.has(t));
  const hasSec = tags.includes('secrecy');
  const triangle = (hasPay ? 1 : 0) + (hasUrg ? 1 : 0) + (hasSec ? 1 : 0);
  if (triangle >= 2) score = Math.max(score, 30) + 20;
  let forceRed = triangle === 3;

  // Two-stage bank con: prior bank-alert + now a "fraud department"/"safe account" follow-up → highest alert
  const twoStage = (opts.recentTags || []).includes('bank-alert') && (tags.includes('safe-account') || tags.includes('bank-alert'));
  if (tags.includes('safe-account')) forceRed = true;
  if (twoStage) { forceRed = true; if (!tags.includes('two-stage')) tags.push('two-stage'); }

  const codeWordMoment = tags.some(t => CODE_WORD_TAGS.has(t));

  // Verdict — COMMITTED. Red means red. (Scamio's hedging is the most-criticized thing in this market.)
  let level: Level = score >= 50 || forceRed ? 'red' : score >= 20 ? 'amber' : 'green';
  const confidence: Confidence = forceRed || score >= 75 ? 'very' : level === 'red' ? 'very' : level === 'amber' ? (score >= 35 ? 'fairly' : 'unsure') : (signals.length ? 'fairly' : 'very');

  let reason: string, safeStep: string;
  const hasBadLink = links.hits.some(h => h.w > 0);
  if (level === 'red') {
    reason = twoStage
      ? 'This is the trick: a fake alert, then a “fraud agent.” Your bank will never move your money to a “safe account.”'
      : (signals[0] || 'This is a scam.');
    safeStep = twoStage || tags.includes('safe-account')
      ? 'Hang up. Call the number on the back of your bank card — no other number.'
      : hasBadLink ? 'Do not tap the link. Delete the message.'
      : tags.includes('otp-request') ? 'Don’t share the code with anyone. Delete the message.'
      : tags.includes('sextortion') ? 'Don’t pay and don’t reply — it’s a mass-sent bluff. Delete it, and tell someone you trust.'
      : codeWordMoment ? 'Before anything else, ask them for your family code word.'
      : 'Do not reply and do not send anything. Delete the message.';
  } else if (level === 'amber') {
    reason = signals[0] || 'Something’s off here.';
    safeStep = 'Do not tap anything yet. Contact the company yourself on a number you already trust.';
  } else {
    reason = 'Nothing in this message matches a known scam trick.';
    safeStep = 'You do not need to do anything. If it still feels off, loop someone in.';
  }

  return { level, reason, safeStep, signals, matches, tags, confidence, codeWordMoment, score, disguised: norm.disguised };
}
