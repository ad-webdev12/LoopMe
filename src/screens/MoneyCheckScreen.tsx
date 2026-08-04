// "Before you send money" — the 20-second checklist for the moment that matters.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { T, F } from '../theme';
import Button from '../ui/Button';
import type { Route } from '../App';

const CHECKS = [
  { q: 'Did they contact you first — a call, text, email, or pop-up you didn’t ask for?', bad: 'Money requests that start with THEM reaching out are almost always scams.' },
  { q: 'Do they want gift cards, crypto, a wire, Zelle, or Venmo?', bad: 'Those payments can’t be undone. Real bills never require them.' },
  { q: 'Is there a deadline — today, right now, before you can talk to anyone?', bad: 'Real business can always wait a day. Only scammers can’t.' },
  { q: 'Have you told someone you trust about this payment?', badOnNo: true, bad: 'Tell one person first. A scam that survives a second opinion is very rare.' },
];

export default function MoneyCheckScreen(props: { go: (r: Route) => void }) {
  const [i, setI] = useState(0);
  const [stop, setStop] = useState('');
  const c = CHECKS[i];
  const answer = (yes: boolean) => {
    const flagged = c.badOnNo ? !yes : yes;
    if (flagged) { setStop(c.bad); return; }
    if (i + 1 < CHECKS.length) setI(i + 1);
    else props.go({ name: 'home' });
  };
  if (stop) return (
    <View style={[s.wrap, { backgroundColor: T.amberSoft }]}>
      <Text style={s.big} allowFontScaling>Wait a day.</Text>
      <Text style={s.sub} allowFontScaling>{stop}{'\n\n'}Nothing bad happens by waiting until tomorrow. A lot of bad things happen by paying today.</Text>
      <Button label="Loop someone in" onPress={() => props.go({ name: 'circle' })} />
      <Button label="Back home" kind="ghost" onPress={() => props.go({ name: 'home' })} />
    </View>
  );
  return (
    <View style={s.wrap}>
      <Text style={s.count} allowFontScaling>Before you send money — {i + 1} of {CHECKS.length}</Text>
      <Text style={s.big} allowFontScaling>{c.q}</Text>
      <Button label="Yes" kind="secondary" onPress={() => answer(true)} />
      <Button label="No" kind="secondary" onPress={() => answer(false)} />
      <Button label="Back home" kind="ghost" onPress={() => props.go({ name: 'home' })} />
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, padding: 28, justifyContent: 'center', backgroundColor: T.cream },
  count: { fontSize: T.caption, fontFamily: F.bodyBold, color: T.inkSoft, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.8 },
  big: { fontSize: T.title + 2, fontFamily: F.displayBold, color: T.ink, textAlign: 'center', marginVertical: 18, lineHeight: 37, letterSpacing: -0.3 },
  sub: { fontSize: T.bodyLg, fontFamily: F.body, color: T.ink, textAlign: 'center', lineHeight: 31, marginBottom: 16 },
});
