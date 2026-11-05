// Reporting, in one tap each. No reporting office takes a form the app could
// fill in for you, so the app does the next best thing: hands the carrier the
// text itself where a short code exists (7726 in the US, Canada, UK and New
// Zealand), and hands the official office a write-up that is already on the
// clipboard when their page opens. The office depends on the phone's country,
// see region.ts. Where Loop Me does not know the office it says so.
import { ActionSheetIOS, Alert, Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { listChecks, updateCheck } from './history';
import { sendSms } from './familyLink';
import { reportRoute } from './region';
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
  const route = reportRoute();
  const forward = async () => {
    await sendSms(route.smsCode || '7726', (rec.sender && digits.length >= 7 ? 'From ' + rec.sender + ': ' : '') + rec.excerpt);
    await updateCheck(recId, { reported: true });
    ctx.refreshHist();
  };
  const ftc = async () => {
    await Clipboard.setStringAsync(reportText(rec.excerpt, rec.sender, rec.reason, rec.at));
    await updateCheck(recId, { reported: true });
    ctx.refreshHist();
    ctx.flash('The details are copied. Paste them into the form.');
    setTimeout(() => Linking.openURL(route.site!).catch(() => {}), 900);
  };
  const copyOnly = async () => {
    await Clipboard.setStringAsync(reportText(rec.excerpt, rec.sender, rec.reason, rec.at));
    await updateCheck(recId, { reported: true });
    ctx.refreshHist();
    ctx.flash('The details are copied. Paste them to your country\u2019s fraud office or your bank.');
  };
  const acts: { text: string; run: () => Promise<void> }[] = [];
  if (route.smsCode) acts.push({ text: route.smsLabel!, run: forward });
  if (route.site) acts.push({ text: route.siteLabel!, run: ftc });
  if (!acts.length) acts.push({ text: 'Copy the details to report it', run: copyOnly });
  const message = route.site
    ? 'Takes a minute. It is free and nobody will blame you for anything.'
    : 'Loop Me does not know the reporting office for your country yet. The details are copied so you can send them to your bank or the police.';
  const options = [...acts.map(a => a.text), 'Not now'];
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Report this scam', message, options, cancelButtonIndex: options.length - 1 },
      (i) => { const a = acts[i]; if (a) void a.run(); },
    );
  } else {
    Alert.alert('Report this scam', message, [
      ...acts.map(a => ({ text: a.text, onPress: () => void a.run() })),
      { text: 'Not now', style: 'cancel' as const },
    ]);
  }
}
