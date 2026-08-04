import { Linking, Platform, Share } from 'react-native';
import type { TrustedPerson } from './storage';
import type { Verdict } from '../engine/ScamDetector';
import { LEVEL_META } from '../theme';

export function loopInText(message: string, verdict: Verdict): string {
  const m = LEVEL_META[verdict.level];
  return `I got this message and I\u2019m not sure about it. Can you take a look?\n\n\u201C${message.trim()}\u201D\n\nLoop Me In says: ${m.icon} ${m.word} \u2014 ${verdict.reason}`;
}

export async function loopIn(person: TrustedPerson | null, message: string, verdict: Verdict) {
  const body = loopInText(message, verdict);
  if (person?.phone) {
    const sep = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${person.phone}${sep}body=${encodeURIComponent(body)}`;
    if (await Linking.canOpenURL(url)) { await Linking.openURL(url); return; }
  }
  await Share.share({ message: body }); // WhatsApp, Mail, anything — the person picks.
}

export async function callPerson(person: TrustedPerson) {
  await Linking.openURL(`tel:${person.phone}`);
}
