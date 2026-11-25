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

/** The invite. One tap on the link joins the caretaker's phone to this one's iCloud share.
 *  The code is for a phone that has to install Loop Me first: iOS does not
 *  pass the link on after an App Store install, so they type the code instead. */
export function inviteText(myName: string, url: string, code?: string): string {
  const me = myName ? myName.split(' ')[0] : 'me';
  const whose = me === 'me' ? 'my' : me + '’s';
  const base = `Tap this once and Loop Me will tell you if a scam text reaches ${whose} phone: ${url}`;
  if (!code) return base;
  const shown = code.length === 8 ? code.slice(0, 4) + ' ' + code.slice(4) : code;
  return `${base}\n\nNo Loop Me yet? Get it from the App Store, open it, choose “The phone that hears about it” and enter this code: ${shown}`;
}
