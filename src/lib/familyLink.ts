// The one text Loop Me ever sends: the invite that sets up the family link.
// Everything after it travels over the link and shows up in the app and in
// notifications, never as a message.
import { Linking, Platform, Share } from 'react-native';

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
  const me = myName ? myName.split(' ')[0] : 'me';
  return `Tap this once and Loop Me will tell you if a scam text reaches ${me === 'me' ? 'my' : me + '’s'} phone: ${url}`;
}
