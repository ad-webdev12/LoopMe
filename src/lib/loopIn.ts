import { Linking } from 'react-native';
import type { TrustedPerson } from './storage';
import type { Verdict } from '../engine/ScamDetector';
import { LEVEL_META } from '../theme';
import { sendSms } from './familyLink';

export function loopInText(message: string, verdict: Verdict): string {
  const m = LEVEL_META[verdict.level];
  return `I got this message and I’m not sure about it. Can you take a look?\n\n“${message.trim()}”\n\nLoop Me In says: ${m.word} — ${verdict.reason}`;
}

export async function loopIn(person: TrustedPerson | null, message: string, verdict: Verdict) {
  await sendSms(person?.phone || null, loopInText(message, verdict));
}

export async function callPerson(person: TrustedPerson) {
  await Linking.openURL(`tel:${person.phone}`);
}
