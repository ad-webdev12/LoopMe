// Link forensics — fully offline. Catches the tricks scam links rely on:
//   • look-alike / impersonation domains (netfl1x-billing.com → "Netflix")
//   • brand-as-subdomain disguises (chase.secure-login.xyz)
//   • URL shorteners that hide the destination
//   • raw IP addresses, punycode, user@host tricks
//   • throwaway TLDs and digits glued onto a real-looking domain
//   • a curated offline blocklist of known smishing infrastructure

export interface LinkHit { w: number; tag: string; plain: string; match: string; }

interface Brand { label: string; match: string[]; domains: string[]; }

// Brand name (as it appears in message text) → its real, official domains.
const BRANDS: Brand[] = [
  { label: 'Netflix', match: ['netflix'], domains: ['netflix.com'] },
  { label: 'PayPal', match: ['paypal'], domains: ['paypal.com'] },
  { label: 'Amazon', match: ['amazon'], domains: ['amazon.com'] },
  { label: 'Apple', match: ['apple', 'icloud'], domains: ['apple.com', 'icloud.com'] },
  { label: 'Microsoft', match: ['microsoft', 'windows'], domains: ['microsoft.com'] },
  { label: 'Chase', match: ['chase'], domains: ['chase.com'] },
  { label: 'Bank of America', match: ['bank of america', 'bofa'], domains: ['bankofamerica.com'] },
  { label: 'Wells Fargo', match: ['wells fargo', 'wellsfargo'], domains: ['wellsfargo.com'] },
  { label: 'Citibank', match: ['citibank', 'citi'], domains: ['citi.com'] },
  { label: 'USPS', match: ['usps', 'postal service'], domains: ['usps.com'] },
  { label: 'FedEx', match: ['fedex'], domains: ['fedex.com'] },
  { label: 'UPS', match: ['ups'], domains: ['ups.com'] },
  { label: 'DHL', match: ['dhl'], domains: ['dhl.com'] },
  { label: 'E-ZPass', match: ['ezpass', 'e-zpass'], domains: ['e-zpass.com', 'ezpassva.com', 'ezpassny.com'] },
  { label: 'Venmo', match: ['venmo'], domains: ['venmo.com'] },
  { label: 'Zelle', match: ['zelle'], domains: ['zellepay.com'] },
  { label: 'Coinbase', match: ['coinbase'], domains: ['coinbase.com'] },
  { label: 'Google', match: ['google', 'gmail'], domains: ['google.com', 'gmail.com'] },
  { label: 'Walmart', match: ['walmart'], domains: ['walmart.com'] },
  { label: 'Costco', match: ['costco'], domains: ['costco.com'] },
  { label: 'AT&T', match: ['att', 'at&t'], domains: ['att.com'] },
  { label: 'Verizon', match: ['verizon'], domains: ['verizon.com'] },
  { label: 'T-Mobile', match: ['tmobile', 't-mobile'], domains: ['t-mobile.com'] },
  { label: 'Spotify', match: ['spotify'], domains: ['spotify.com'] },
  { label: 'Hulu', match: ['hulu'], domains: ['hulu.com'] },
  { label: 'the IRS', match: ['irs', 'internal revenue'], domains: ['irs.gov'] },
  { label: 'Social Security', match: ['social security', 'ssa'], domains: ['ssa.gov'] },
  { label: 'Medicare', match: ['medicare'], domains: ['medicare.gov'] },
];

const SHORTENERS = [
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly',
  'cutt.ly', 'rebrand.ly', 'rb.gy', 'shorturl.at', 'tiny.cc', 'lnkd.in',
  'tny.im', 'qrco.de',
];

const SUSPICIOUS_TLDS = [
  'zip', 'mov', 'xyz', 'top', 'icu', 'click', 'link', 'live', 'vip', 'rest',
  'tk', 'ml', 'ga', 'cf', 'gq', 'work', 'loan', 'kim', 'men', 'party',
  'review', 'stream', 'win', 'bid', 'date', 'faith', 'science', 'buzz',
  'cam', 'sbs', 'cyou',
];

// Curated offline blocklist: only hosts that are unambiguously phishing infrastructure.
const BLOCKED_DOMAINS = new Set([
  'fake-bank.top', 'chase-secure-login.top', 'secure-verify.xyz',
  'account-verify.click', 'usps-redelivery.top', 'paypal-resolve.xyz',
  'apple-icloud-locked.top', 'irs-refund.click', 'ezpass-toll.top',
]);
const BLOCKED_PATTERNS = [
  /secure.*login.*\.(top|xyz|click|live|vip)$/i,
  /verify.*account.*\.(top|xyz|click)$/i,
  /\b(icloud|apple|paypal|chase|wellsfargo|usps|fedex)-[a-z-]+\.(top|xyz|click|vip|live|sbs)$/i,
];

// Trailing [a-z0-9-]* catches garbage glued to the TLD ("chase.com278282") so it
// reads as a non-official host instead of slipping through as chase.com.
const URL_RE = /\b(?:https?:\/\/)?(?:\d{1,3}(?:\.\d{1,3}){3}|(?:[a-z0-9@-]+\.)+[a-z]{2,}[a-z0-9-]*)(?:\/[^\s,]*)?/gi;

function leet(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/rn/g, 'm').replace(/vv/g, 'w');
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}

function hostOf(raw: string): string {
  let h = raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  h = h.split('/')[0].split('?')[0];
  if (h.includes('@')) h = h.split('@').pop() || h; // strip user@host trick
  return h.toLowerCase();
}

function registrable(host: string): string {
  return host.split('.').slice(-2).join('.');
}

function isBlocklisted(host: string, reg: string): boolean {
  if (BLOCKED_DOMAINS.has(reg) || BLOCKED_DOMAINS.has(host)) return true;
  return BLOCKED_PATTERNS.some((re) => re.test(host));
}

/** All weighted link findings in the message. Official brand links contribute a negative (good) signal. */
export function analyzeLinks(text: string): { hits: LinkHit[]; urlCount: number; officialOnly: boolean } {
  const matches = text.match(URL_RE) || [];
  const hits: LinkHit[] = [];
  if (!matches.length) return { hits, urlCount: 0, officialOnly: false };

  const lowerText = text.toLowerCase();
  const brandsInText = BRANDS.filter((b) => b.match.some((m) => lowerText.includes(m)));
  let sawOfficial = 0, sawBad = 0;

  for (const raw of matches) {
    const host = hostOf(raw);
    if (!host.includes('.')) continue;
    const reg = registrable(host);
    const push = (w: number, tag: string, plain: string) => { hits.push({ w, tag, plain, match: raw }); if (w > 0) sawBad++; };

    const official = BRANDS.find((b) => b.domains.some((d) => host === d || host.endsWith('.' + d)));
    if (official) { sawOfficial++; continue; }

    if (isBlocklisted(host, reg)) {
      push(70, 'url-blocklisted', `This link (${host}) is a known scam website.`);
      continue;
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      push(40, 'url-ip', 'The link goes to a bare numeric address — real companies never do that.');
      continue;
    }
    if (SHORTENERS.includes(reg)) {
      push(30, 'url-shortener', 'The link is shortened, so you can’t see where it really goes.');
      continue;
    }
    if (host.includes('xn--')) {
      push(45, 'url-punycode', 'The link uses look-alike letters to imitate a real website.');
      continue;
    }

    // Impersonation checks — only against brands actually named in the message,
    // so unrelated legit domains never false-match.
    let flagged = false;
    const bare = leet(host);
    const bareReg = leet(reg);
    for (const b of brandsInText) {
      const core = leet(b.domains[0].split('.')[0]);
      const hostCore = leet(host.split('.')[0]);
      const nearMiss = core.length >= 5 && levenshtein(hostCore, core) <= 2 && hostCore !== core;
      if (nearMiss || (!bare.includes(core) && core.length >= 4 && bare.replace(/-/g, '').includes(core))) {
        push(55, 'url-lookalike', `The link is spelled almost like ${b.label} to fool the eye — it is not ${b.label}’s real website (${b.domains[0]}).`);
        flagged = true; break;
      }
      if (bare.includes(core) && !bareReg.includes(core)) {
        push(50, 'url-brand-subdomain', `The link puts “${b.label}” in front of a website ${b.label} doesn’t own — a disguise. The real address is ${b.domains[0]}.`);
        flagged = true; break;
      }
      if (bare.includes(core) && bareReg.includes(core)) {
        push(48, 'url-lookalike', `The link imitates ${b.label} but is not really ${b.label}’s website (${b.domains[0]}).`);
        flagged = true; break;
      }
    }
    if (flagged) continue;

    // Global near-miss check against every brand, even when the brand isn't
    // named in the text (e.g. "netfl1x-billing.com" alone). Strict criteria so
    // ordinary domains never false-match: a host segment must leet-fold to the
    // brand core exactly, or sit within edit distance 1 of a 6+ letter core.
    for (const b of BRANDS) {
      const core = leet(b.domains[0].split('.')[0]);
      if (core.length < 5) continue;
      for (const seg of host.split(/[.-]/)) {
        if (seg.length < 4) continue;
        const fold = leet(seg);
        const exactFold = fold === core && seg.toLowerCase() !== b.domains[0].split('.')[0];
        const nearMiss = core.length >= 6 && fold !== core && levenshtein(fold, core) <= 1;
        if (exactFold || nearMiss) {
          push(55, 'url-lookalike', `The link is spelled almost like ${b.label} to fool the eye — it is not ${b.label}’s real website (${b.domains[0]}).`);
          flagged = true; break;
        }
      }
      if (flagged) break;
    }
    if (flagged) continue;

    const tld = host.split('.').pop() || '';
    if (SUSPICIOUS_TLDS.includes(tld.replace(/[0-9-].*$/, ''))) {
      push(28, 'url-tld', 'The link ends in a web-address type that scammers favor because it’s nearly free.');
      continue;
    }
    if (/\.[a-z]{2,}[0-9]/.test(host)) {
      push(30, 'url-glued', 'The link has numbers glued onto the end of the address — real websites never look like that.');
    }
  }

  // A brand named in text whose links all point elsewhere entirely.
  if (matches.length && !sawOfficial && !hits.some(h => h.tag.startsWith('url-look') || h.tag === 'url-brand-subdomain')) {
    for (const b of brandsInText) {
      const anyMentions = matches.some(u => leet(hostOf(u)).includes(leet(b.domains[0].split('.')[0])));
      if (!anyMentions) {
        hits.push({ w: 18, tag: 'url-mismatch', plain: `The message talks about ${b.label}, but its link goes somewhere else entirely.`, match: matches[0] ?? '' });
        sawBad++;
        break;
      }
    }
  }

  return { hits, urlCount: matches.length, officialOnly: sawOfficial > 0 && sawBad === 0 };
}
