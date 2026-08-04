// Reassurance, not a quiz.
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Gift, Package, PhoneCall, Landmark, KeySquare } from 'lucide-react-native';
import { T, F } from '../theme';
import Card from '../ui/Card';
import Screen from '../ui/Screen';
import type { Route } from '../App';

const CARDS = [
  { Icon: Gift, title: 'The gift card trick', body: 'Someone says you owe money and must pay with gift cards. No real company, and never the government, takes gift cards. Anyone who asks is a scammer — every time.' },
  { Icon: Package, title: 'The package fee', body: 'A text says a small fee will release your package. Real delivery companies don’t text for fees. When in doubt, go to the carrier’s own website yourself.' },
  { Icon: PhoneCall, title: 'The family emergency', body: '“Grandma, I’m in trouble, don’t tell anyone.” Hang up and call that family member back on their usual number. Real family won’t mind you checking.' },
  { Icon: Landmark, title: 'The fake bank alert', body: 'A scary “your account is locked” message with a link. Your bank is fine with you ignoring it and calling the number on the back of your card instead.' },
  { Icon: KeySquare, title: 'The code thief', body: 'Someone asks you to read them a code that was texted to you. That code is a key to your account. Never share it — not with anyone who asks.' },
];

export default function LearnScreen(props: { go: (r: Route) => void }) {
  return (
    <Screen onBack={() => props.go({ name: 'home' })} title="Know the tricks">
      <Text style={s.sub} allowFontScaling>Once you’ve seen them, they’re much easier to spot.</Text>
      {CARDS.map((c, i) => (
        <Card key={i}>
          <c.Icon size={26} color={T.accent} strokeWidth={2} />
          <Text style={s.cardTitle} allowFontScaling>{c.title}</Text>
          <Text style={s.cardBody} allowFontScaling>{c.body}</Text>
        </Card>
      ))}
    </Screen>
  );
}
const s = StyleSheet.create({
  sub: { fontSize: T.body, fontFamily: F.body, color: T.inkSoft, textAlign: 'center', marginVertical: 10, lineHeight: 27 },
  cardTitle: { fontSize: T.bodyLg, fontFamily: F.bodyBold, color: T.ink, marginTop: 8, marginBottom: 6 },
  cardBody: { fontSize: T.body, fontFamily: F.body, color: T.ink, lineHeight: 27 },
});
