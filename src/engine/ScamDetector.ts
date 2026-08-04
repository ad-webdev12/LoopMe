// ScamDetector v2 — deterministic, on-device, offline, <50ms.
// THE COMPETITIVE MOAT IS NOT THE MODEL. It is speed + commitment + a human on the other end.
// (Norton: 29.8s + restart per check. Scamio: never commits. McAfee: no screenshots. We: instant, committed, looped-in.)

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
}

export interface DetectorOptions {
  allowlist?: string[];
  sender?: string;
  recentTags?: string[];   // tags from the previous check — enables two-stage detection
  postPanic?: boolean;     // person completed the Panic flow in the last 90 days
}

const SHORTENERS = ['bit.ly','tinyurl.com','t.co','goo.gl','is.gd','rb.gy','cutt.ly','ow.ly','buff.ly','rebrand.ly','shorturl.at','tny.im','qrco.de'];
const BRANDS = ['paypal','amazon','apple','netflix','microsoft','chase','wellsfargo','bankofamerica','citibank','usps','ups','fedex','irs','venmo','zelle','costco','walmart','att','verizon','tmobile','medicare','socialsecurity','ezpass','geico','hulu','spotify'];
const BAD_TLDS = ['.xyz','.top','.icu','.click','.link','.rest','.tk','.ml','.cf','.gq','.work','.loan','.vip','.cyou','.sbs'];

interface Rule { re: RegExp; w: number; tag: string; plain: string; }

const RULES: Rule[] = [
  // — SECRECY: the single highest-weight signal. Every real institution is fine with you calling your daughter.
  { re: /(?:don'?t|do not) (?:tell|contact|call|inform|discuss(?: this)? with) (?:anyone|anybody|your (?:family|wife|husband|son|daughter|kids|children|lawyer|attorney|bank)|mom|dad|the police)/i, w: 55, tag: 'secrecy', plain: 'It tells you not to talk to your family or a lawyer. Honest people never need secrecy — this is the biggest warning sign there is.' },
  { re: /keep (?:this|it) (?:a )?(?:secret|between us|confidential|private|quiet)/i, w: 55, tag: 'secrecy', plain: 'It asks you to keep this secret. Honest people never need secrecy.' },
  // — Digital arrest / government threats
  { re: /(?:arrest warrant|warrant (?:for|has been issued)|court order|legal action|federal (?:agent|officer|case)|you (?:will|may) be arrested|under investigation)/i, w: 45, tag: 'digital-arrest', plain: 'It threatens arrest or legal action. Real police and courts never call, text, or video-chat threats — ever.' },
  { re: /\b(?:irs|social security(?: administration)?|ssa|medicare|dea|fbi|homeland security)\b[\s\S]{0,90}(?:suspend|arrest|owe|fine|immediately|final|blocked|frozen)/i, w: 45, tag: 'gov-impersonation', plain: 'It pretends to be the government and threatens you. The government sends letters, not scary messages.' },
  // — Bank impersonation (stage 1 of the two-stage con)
  { re: /(?:did you (?:authorize|approve|make)|unauthorized|suspicious) (?:a |an |this )?(?:\$[\d,.]+ )?(?:charge|payment|transaction|transfer|purchase|zelle)/i, w: 30, tag: 'bank-alert', plain: 'It looks like a bank fraud alert. Scammers send fake ones, then call pretending to be the fraud department.' },
  { re: /reply (?:no|yes|stop|1|y|n) (?:to|if)/i, w: 12, tag: 'bank-alert', plain: 'It asks you to reply — that tells the scammer a real person is here.' },
  // — Stage 2: the "safe account" move. Firing this is the app's highest duty.
  { re: /(?:move|transfer) (?:your |the )?(?:money|funds|balance)[\s\S]{0,50}(?:safe|secure|protected|new) account/i, w: 90, tag: 'safe-account', plain: 'They want you to move money to a \u201Csafe account.\u201D There is no such thing. Your bank will NEVER ask this. This is the trick itself.' },
  { re: /fraud (?:department|team|agent|specialist)[\s\S]{0,80}(?:verify|secure|move|transfer|protect)/i, w: 45, tag: 'safe-account', plain: 'A \u201Cfraud department\u201D asking you to act is the second half of a two-part con.' },
  // — Family emergency / voice-clone territory
  { re: /(?:grandm[ao]|grandpa|grandson|granddaughter|your (?:son|daughter|grandchild|nephew|niece))[\s\S]{0,90}(?:trouble|jail|arrest|accident|bail|hospital|hurt|money|help)/i, w: 50, tag: 'family-emergency', plain: 'It says a family member is in trouble and needs money fast. Call that person back on the number you already have.' },
  { re: /(?:it'?s me|this is your grandson|this is your granddaughter)[\s\S]{0,80}(?:jail|accident|bail|trouble|hospital|money)/i, w: 50, tag: 'family-emergency', plain: 'A voice or message claiming to be family in an emergency. A cloned voice can sound exactly like them — your code word cannot be cloned.' },
  // — Gift cards, crypto, payments
  { re: /gift\s*card|itunes\s*card|google\s*play\s*card|steam\s*card|vanilla\s*card/i, w: 50, tag: 'giftcard', plain: 'It involves gift cards. No real company, and never the government, takes gift cards. Anyone who asks is a scammer — every time.' },
  { re: /bitcoin|crypto(?:currency)?|\bbtc\b|\busdt\b|coinbase|binance|crypto ?atm/i, w: 25, tag: 'crypto', plain: 'It involves cryptocurrency, which scammers love because payments can\u2019t be undone.' },
  { re: /(?:western union|moneygram)|wire (?:transfer|\$?\d)/i, w: 35, tag: 'payment', plain: 'It asks for a wire transfer, which can\u2019t be reversed once sent.' },
  { re: /(?:zelle|cash ?app|venmo|apple ?pay)[\s\S]{0,60}(?:send|pay|transfer|owe)|(?:send|pay|transfer)[\s\S]{0,50}(?:by |via |through )?(?:zelle|cash ?app|venmo)/i, w: 28, tag: 'payment', plain: 'It asks you to send money through a payment app — those payments usually can\u2019t be recovered.' },
  { re: /(?:this is your (?:son|daughter|grandson|granddaughter|mom|dad))[\s\S]{0,90}(?:money|send|broken|new number)|(?:phone (?:is |got )?broken|lost my phone|new number)[\s\S]{0,80}(?:send|money|zelle|venmo|cash)/i, w: 45, tag: 'family-emergency', plain: 'A \u201Cfamily member\u201D with a broken phone asking for money is a classic con. Call their real number — the one you already have.' },
  // — Account/verify pressure
  { re: /account (?:has been |is |was )?(?:locked|suspended|closed|compromised|on hold|restricted|deactivat|frozen)/i, w: 30, tag: 'account-locked', plain: 'It claims your account is locked to scare you into clicking fast.' },
  { re: /(?:verify|confirm|update|validate) your (?:account|identity|information|payment|card|billing|details)/i, w: 26, tag: 'verify', plain: 'It pushes you to \u201Cverify\u201D through a link. Real companies let you log in yourself, on your own.' },
  { re: /(?:unusual|suspicious) (?:sign[- ]?in|login|activity|attempt)/i, w: 25, tag: 'unusual-signin', plain: 'It claims suspicious activity to make you panic and click.' },
  // — OTP theft
  { re: /(?:send|share|read|give|tell|forward)(?: me| us)? (?:the |that |your )?(?:one[- ]?time |verification |security |6[- ]digit |four[- ]digit )?(?:code|otp|passcode|pin)\b/i, w: 55, tag: 'otp-request', plain: 'It asks for a security code. That code is the key to your account. Never share it with anyone who asks — no exceptions.' },
  // — Delivery / toll / subscription workhorses
  { re: /(?:re-?deliver|redelivery|package|parcel|shipment)[\s\S]{0,70}(?:fee|held|pending|customs|unable|address (?:issue|problem|incomplete))/i, w: 35, tag: 'package-fee', plain: 'It says a package needs a small fee or new address — one of the most common tricks in the world.' },
  { re: /(?:toll|e-?z ?pass|fastrak|sunpass)[\s\S]{0,70}(?:unpaid|due|fee|balance|violation|invoice)/i, w: 40, tag: 'toll', plain: 'Fake unpaid-toll texts are everywhere right now. Toll agencies send bills by mail, not text.' },
  { re: /(?:netflix|apple|amazon prime|hulu|spotify|disney)[\s\S]{0,70}(?:payment (?:failed|declined|problem)|suspend|expired|renew|update your payment)/i, w: 32, tag: 'subscription', plain: 'It claims a streaming payment failed. Check inside the app itself, never through a link in a message.' },
  // — Prizes, refunds, jobs
  { re: /(?:you(?:'ve| have)? (?:won|been selected)|winner|prize|lottery|sweepstake|claim your (?:reward|prize)|congratulations[\s\S]{0,40}(?:won|selected))/i, w: 42, tag: 'prize', plain: 'It says you won something you never entered. Real prizes never ask for money or details first.' },
  { re: /(?:tax refund|stimulus|rebate|reimbursement)[\s\S]{0,60}(?:claim|click|pending|verify)/i, w: 32, tag: 'refund', plain: 'It dangles a refund you must \u201Cclaim\u201D through a link. The IRS mails checks; it doesn\u2019t text links.' },
  { re: /(?:work from home|easy money|earn \$\d+|make \$\d+ (?:a |per )?(?:day|week)|part[- ]time job[\s\S]{0,50}(?:no experience|apply now|telegram|whatsapp))/i, w: 34, tag: 'job-scam', plain: 'Too-easy job offers are usually after your identity, your face and voice, or an upfront fee.' },
  // — Romance / pig butchering / wrong number / platform hop
  { re: /(?:my (?:love|darling|dear|dearest))|(?:i(?:'ve| have) (?:fallen for|feelings for) you)|soul\s*mate|destiny brought us/i, w: 22, tag: 'romance', plain: 'It uses romance language to build false trust — the opening of a long con.' },
  { re: /(?:invest|investment|trading platform|guaranteed (?:return|profit)|double your money|portfolio)[\s\S]{0,60}(?:crypto|bitcoin|usdt|forex|opportunity)/i, w: 40, tag: 'investment', plain: 'A stranger with an investment opportunity is the \u201Cpig butchering\u201D con: weeks of friendliness, then a fake trading site.' },
  { re: /(?:wrong number|sorry,? who is this|is this (?!my)[A-Z][a-z]+\?)[\s\S]{0,120}(?:nice|friendly|chat|anyway|by the way|new friend|where are you from)/i, w: 28, tag: 'wrong-number', plain: 'A friendly stranger from a \u201Cwrong number\u201D who keeps chatting — this is exactly how a long con starts. It\u2019s fine to just not reply.' },
  { re: /(?:message|text|chat with|add|contact|reach) me on (?:whatsapp|telegram|signal|wechat|viber)/i, w: 26, tag: 'platform-hop', plain: 'It pushes you to move to another app. Scammers hop platforms so no one can trace the whole story.' },
  // — Recovery scams (weighted up further when postPanic is on)
  { re: /(?:recover|get back|retrieve|reclaim)[\s\S]{0,30}(?:money|funds|losses)|(?:funds? |asset |money )?recovery (?:firm|service|agent|department|specialist)|refund department/i, w: 30, tag: 'recovery', plain: 'It offers to recover money you lost. People who report a scam get targeted again by fake \u201Crecovery services.\u201D This is one.' },
  // — Remote access / urgency
  { re: /(?:anydesk|teamviewer|ultraviewer|remote access|screen shar\w+|install (?:this|the) (?:app|software))/i, w: 45, tag: 'remote-access', plain: 'It asks you to install software that lets someone control your device. Never do this for a caller or a message.' },
  { re: /(?:act now|urgent|immediately|right away|within (?:24|48) hours|expires? (?:today|soon|tonight)|final notice|last (?:chance|warning)|asap|don'?t delay)/i, w: 15, tag: 'urgency', plain: 'It uses pressure words to rush you. Rushing is a scammer\u2019s favorite tool — real business can always wait a day.' },
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
];

const PAY_TAGS = new Set(['giftcard','crypto','payment','package-fee','toll','refund','investment','recovery']);
const URG_TAGS = new Set(['urgency','account-locked','gov-impersonation','family-emergency','digital-arrest','bank-alert','safe-account','subscription']);
const CODE_WORD_TAGS = new Set(['family-emergency']);

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"')\]]+|\b[a-z0-9][a-z0-9.-]*\.(?:xyz|top|icu|click|link|rest|tk|ml|cf|gq|work|loan|vip|cyou|sbs)\b/gi;

function analyzeUrl(raw: string): { w: number; tag: string; plain: string; match: string }[] {
  const out: { w: number; tag: string; plain: string; match: string }[] = [];
  let host = '';
  try { host = new URL(raw.startsWith('http') ? raw : 'http://' + raw).hostname.toLowerCase(); } catch { return out; }
  const push = (w: number, tag: string, plain: string) => out.push({ w, tag, plain, match: raw });

  if (SHORTENERS.some(s => host === s || host.endsWith('.' + s)))
    push(30, 'url-shortener', 'The link is shortened, so you can\u2019t see where it really goes.');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host))
    push(40, 'url-ip', 'The link points to a raw numeric address — real companies never do that.');
  if (host.includes('xn--'))
    push(40, 'url-punycode', 'The link uses look-alike letters to imitate a real website.');
  if (BAD_TLDS.some(t => host.endsWith(t)))
    push(28, 'url-tld', 'The link ends in a web address type that scammers use because it\u2019s nearly free.');

  const parts = host.split('.');
  const regDomain = parts.slice(-2).join('.');
  const bare = host.replace(/[^a-z0-9]/g, '');
  const bareReg = regDomain.replace(/[^a-z0-9]/g, '');
  for (const b of BRANDS) {
    const swapped = bare.replace(/1/g, 'l').replace(/0/g, 'o').replace(/rn/g, 'm').replace(/vv/g, 'w');
    if (!bare.includes(b) && swapped.includes(b)) { push(50, 'url-lookalike', `The link is spelled almost like ${b} to fool the eye.`); break; }
    if (bare.includes(b) && !bareReg.includes(b)) { push(45, 'url-brand-subdomain', `The link puts \u201C${b}\u201D in front of a website ${b} doesn\u2019t own — a disguise.`); break; }
    if (bare.includes(b) && bareReg.includes(b) && !host.endsWith(b + '.com') && !host.endsWith('.gov')) { push(42, 'url-lookalike', `The link imitates ${b} but is not really ${b}\u2019s website.`); break; }
  }
  return out;
}

export function detect(message: string, opts: DetectorOptions = {}): Verdict {
  const text = (message || '').trim();
  const base: Omit<Verdict, 'level' | 'reason' | 'safeStep'> = { signals: [], matches: [], tags: [], confidence: 'very', codeWordMoment: false, score: 0 };
  if (!text) return { ...base, level: 'green', reason: 'There\u2019s nothing to check yet.', safeStep: 'Paste or share a message and tap \u201CCheck it\u201D.' };

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

  // URL forensics
  const urls = text.match(URL_RE) || [];
  for (const u of urls) for (const h of analyzeUrl(u)) { score += h.w; signals.push(h.plain); matches.push(h.match); if (!tags.includes(h.tag)) tags.push(h.tag); }
  if (urls.length >= 3) { score += 15; signals.push('It contains several links. Real banks send one link at most; scammers scatter many.'); tags.push('url-many'); }
  if (urls.length) {
    const lower = text.toLowerCase();
    for (const b of BRANDS) {
      if (lower.includes(b) && !urls.some(u => u.toLowerCase().replace(/[^a-z0-9]/g, '').includes(b))) {
        score += 18; signals.push(`The message talks about ${b}, but its link goes somewhere else entirely.`); tags.push('url-mismatch'); break;
      }
    }
  }

  // Precision guard — subtract for known-good patterns, but never when an OTP is being *requested*
  for (const g of KNOWN_GOOD) {
    if (g.tag === 'good-otp-arriving' && tags.includes('otp-request')) continue;
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
  if (level === 'red') {
    reason = twoStage
      ? 'This is the trick: a fake alert, then a \u201Cfraud agent.\u201D Your bank will never move your money to a \u201Csafe account.\u201D'
      : (signals[0] || 'This is a scam.');
    safeStep = twoStage || tags.includes('safe-account')
      ? 'Hang up. Call the number on the back of your bank card — no other number.'
      : urls.length ? 'Don\u2019t tap the link. Delete the message.'
      : tags.includes('otp-request') ? 'Don\u2019t share the code with anyone. Delete the message.'
      : codeWordMoment ? 'Before anything else, ask them for your family code word.'
      : 'Don\u2019t reply and don\u2019t send anything. Delete the message.';
  } else if (level === 'amber') {
    reason = signals[0] || 'Something\u2019s off here.';
    safeStep = 'Don\u2019t tap anything yet. Contact the company or person yourself, using a number you already trust.';
  } else {
    reason = 'This looks okay — nothing in it matches a known scam trick.';
    safeStep = 'You don\u2019t have to do anything. If it still feels off, loop in someone you trust.';
  }

  return { level, reason, safeStep, signals, matches, tags, confidence, codeWordMoment, score };
}
