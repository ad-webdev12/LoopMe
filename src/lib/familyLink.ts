// Plain text messages. Loop Me sends a text in exactly three situations, and
// each one is written to be read by a person, with no code in it:
//   the one-time invite that sets up the family link,
//   a heads-up to a trusted contact when there is no family link yet,
//   the "I think I was caught" note from the recovery steps.
// Everything else between the two phones goes over the family link.
import { Linking, Platform, Share } from 'react-native';
import type { CheckRecord } from './history';

export async function sendSms(phone: string | null, body: string) {
  if (phone) {
    const sep = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${phone.replace(/[^\d+]/g, '')}${sep}body=${encodeURIComponent(body)}`;
    try {
      if (await Linking.canOpenURL(url)) { await Linking.openURL(url); return; }
    } catch {}
  }
  await Share.share({ message: body }); // WhatsApp, Mail, anything. The person picks.
}

/** The invite. One tap on the link joins the caretaker's phone to this one's iCloud share. */
export function inviteText(myName: string, url: string): string {
  const me = myName ? myName.split(' ')[0] : 'I';
  return (
    `${me === 'I' ? 'I have' : me + ' has'} set up Loop Me, which checks texts and calls for scams.\n\n` +
    `Tap this link once and you will hear from it straight away if a scam reaches ${me === 'I' ? 'my' : me + '’s'} phone:\n${url}`
  );
}

/** A heads-up to a trusted contact, when there is no family link to use. */
export function loopInText(myName: string, rec: CheckRecord): string {
  const me = myName ? myName.split(' ')[0] : 'I';
  const word = rec.level === 'red' ? 'a scam' : rec.level === 'amber' ? 'worth a second look' : 'probably fine';
  return (
    `${me === 'I' ? 'I just' : me + ' just'} checked a message with Loop Me and it came back as ${word}.\n\n` +
    `“${rec.excerpt}”\n\n` +
    `${rec.reason}\n\nCould you give ${me === 'I' ? 'me' : me} a ring when you have a minute?`
  );
}

export function panicText(myName: string): string {
  const me = myName ? myName.split(' ')[0] : 'I';
  return `${me === 'I' ? 'I think I' : me + ' thinks they'} may have been caught by a scam and could use a hand. Can you call when you have a minute?`;
}
