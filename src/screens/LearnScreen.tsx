// Reassurance, not a quiz.
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { T } from '../theme';
import BigButton from '../components/BigButton';
import type { Route } from '../App';

const CARDS = [
  { icon: '\uD83C\uDF81', title: 'The gift card trick', body: 'Someone says you owe money and must pay with gift cards. No real company, and never the government, takes gift cards. Anyone who asks is a scammer \u2014 every time.' },
  { icon: '\uD83D\uDCE6', title: 'The package fee', body: 'A text says a small fee will release your package. Real delivery companies don\u2019t text for fees. When in doubt, go to the carrier\u2019s own website yourself.' },
  { icon: '\uD83D\uDC76', title: 'The family emergency', body: '\u201CGrandma, I\u2019m in trouble, don\u2019t tell anyone.\u201D Hang up and call that family member back on their usual number. Real family won\u2019t mind you checking.' },
  { icon: '\uD83C\uDFE6', title: 'The fake bank alert', body: 'A scary \u201Cyour account is locked\u201D message with a link. Your bank is fine with you ignoring it and calling the number on the back of your card instead.' },
  { icon: '\uD83D\uDD22', title: 'The code thief', body: 'Someone asks you to read them a code that was texted to you. That code is a key to your account. Never share it \u2014 not with anyone who asks.' },
];

export default function LearnScreen(props: { go: (r: Route) => void }) {
  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.title} allowFontScaling>What these tricks look like</Text>
      <Text style={s.sub} allowFontScaling>Once you\u2019ve seen them, they\u2019re much easier to spot.</Text>
      {CARDS.map((c, i) => (
        <View key={i} style={s.card}>
          <Text style={s.icon}>{c.icon}</Text>
          <Text style={s.cardTitle} allowFontScaling>{c.title}</Text>
          <Text style={s.cardBody} allowFontScaling>{c.body}</Text>
        </View>
      ))}
      <BigButton label="Back home" kind="quiet" onPress={() => props.go({ name: 'home' })} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 24 },
  title: { fontSize: T.headline, fontWeight: '800', color: T.ink, textAlign: 'center' },
  sub: { fontSize: T.body, color: T.inkSoft, textAlign: 'center', marginVertical: 12 },
  card: { backgroundColor: T.card, borderRadius: T.radius, padding: 22, marginVertical: 8 },
  icon: { fontSize: 40, marginBottom: 8 },
  cardTitle: { fontSize: T.body + 2, fontWeight: '800', color: T.ink, marginBottom: 6 },
  cardBody: { fontSize: T.body - 1, color: T.ink, lineHeight: 28 },
});
