// Reporting, in one tap each. Two real routes exist in the US and neither
// takes a form the app could fill in for you, so the app does the next best
// thing: hands the carrier the text itself, and hands the FTC a write-up that
// is already on the clipboard when their page opens.
//   7726 (SPAM): every US carrier accepts a forwarded scam text at this short
//   code. Forwarding is how numbers get cut off at the network.
//   ReportFraud.ftc.gov: the report goes into the database law enforcement
//   actually uses.
import { ActionSheetIOS, Alert, Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { listChecks, updateCheck } from './history';
import { sendSms } from './familyLink';
import type { Ctx } from '../App';

export function reportText(excerpt: string, sender: string | undefined, reason: string, when: number): string {
  const d = new Date(when);
  return (
    'Scam report from Loop Me\n' +
    'Received: ' + d.toLocaleDateString() + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) + '\n' +
    'From: ' + (sender || 'unknown number') + '\n' +
    'Message: "' + excerpt + '"\n' +
    'Why it was flagged: ' + reason + '\n' +
    'No money was sent and nothing was tapped.'
  );
}

export async function reportScam(ctx: Ctx, recId: string) {
  const rec = (await listChecks()).find(r => r.id === recId);
  if (!rec) return;
  const digits = (rec.sender || '').replace(/\D/g, '');
  const forward = async () => {
    await sendSms('7726', (rec.sender && digits.length >= 7 ? 'From ' + rec.sender + ': ' : '') + rec.excerpt);
    await updateCheck(recId, { reported: true });
    ctx.refreshHist();
  };
  const ftc = async () => {
    await Clipboard.setStringAsync(reportText(rec.excerpt, rec.sender, rec.reason, rec.at));
    await updateCheck(recId, { reported: true });
    ctx.refreshHist();
    ctx.flash('The details are copied. Paste them into the form.');
    setTimeout(() => Linking.openURL('https://reportfraud.ftc.gov').catch(() => {}), 900);
  };
  const options = ['Forward it to 7726 (your carrier)', 'Report it to the FTC', 'Not now'];
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Report this scam', message: 'Takes a minute. Both are free and nobody will blame you for anything.', options, cancelButtonIndex: 2 },
      (i) => { if (i === 0) void forward(); else if (i === 1) void ftc(); },
    );
  } else {
    Alert.alert('Report this scam', undefined, [
      { text: options[0], onPress: () => void forward() },
      { text: options[1], onPress: () => void ftc() },
      { text: 'Not now', style: 'cancel' },
    ]);
  }
}
