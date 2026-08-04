// Phone-number check — honest local lookup, no reputation database theater.
// The one truth that matters: caller ID can be faked to show ANY name or number,
// so no number can prove who's calling. What we CAN do offline:
//   • confirm a number IS a bank's real fraud line (call-back safe list)
//   • flag premium-rate and lookalike patterns
//   • teach the call-back rule at the exact moment it matters
import { BANK_FRAUD_LINES } from '../lib/banks';

export interface NumberVerdict {
  level: 'green' | 'amber' | 'red';
  title: string;
  body: string;
}

const digitsOf = (raw: string) => {
  let d = (raw || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d;
};

export function checkNumber(raw: string): NumberVerdict {
  const d = digitsOf(raw);
  if (d.length < 3) {
    return { level: 'amber', title: 'That doesn’t look like a full number', body: 'Type the whole number as it appears on your screen.' };
  }

  const bank = BANK_FRAUD_LINES.find(b => digitsOf(b.phone) === d);
  if (bank) {
    return {
      level: 'green',
      title: `This is ${bank.name}’s real fraud line`,
      body: `${bank.phone} is the published ${bank.name} fraud number — safe to call it yourself. Careful: a scammer can still fake this number on YOUR caller ID. Safe to dial out, never proof of who’s dialing in.`,
    };
  }

  if (d.startsWith('900') || d.startsWith('976')) {
    return {
      level: 'red',
      title: 'Premium-rate number',
      body: 'Numbers starting 900 or 976 charge by the minute. No bank, agency, or family member calls from one. Don’t call it back.',
    };
  }

  if (d.length >= 5 && d.length <= 6) {
    return {
      level: 'amber',
      title: 'That’s a short code',
      body: 'Short codes send automated texts (delivery updates, login codes). A real short code never calls you, and no one texting from one should ever ask you to send a code back or pay anything.',
    };
  }

  return {
    level: 'amber',
    title: 'This number can’t prove anything',
    body: 'Caller ID can be faked to show any name or number — even your bank’s. If the caller wants money, gift cards, a security code, or remote access: hang up, then call back using a number you already have (the back of your card, a saved contact). A real caller will never mind.',
  };
}
