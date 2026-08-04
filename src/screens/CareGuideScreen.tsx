// The full playbook, browsable — every scam family the engine knows, with the
// psychology and the words that help. This is the caretaker's "explanatory and
// detailed" side of the product.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { T } from '../theme';
import Card from '../ui/Card';
import Screen from '../ui/Screen';
import { PLAYBOOK } from '../lib/playbook';
import type { Route } from '../App';

export default function CareGuideScreen(props: { go: (r: Route) => void }) {
  return (
    <Screen onBack={() => props.go({ name: 'home' })} title="The playbook">
      <Text style={s.intro} allowFontScaling>
        Every trick the checker knows, and how to talk about it without blame. Shame is the scammer’s
        best friend — it keeps people quiet. These scripts starve it.
      </Text>
      {PLAYBOOK.map(p => (
        <Card key={p.tag}>
          <Text style={s.title} allowFontScaling>{p.title}</Text>
          <Text style={s.body} allowFontScaling>{p.what}</Text>
          <Text style={s.why} allowFontScaling>Why it works: {p.why}</Text>
          <View style={s.sayBox}>
            <Text style={s.sayLabel} allowFontScaling>Words that help</Text>
            <Text style={s.sayText} allowFontScaling>{p.say}</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  intro: { fontSize: T.body, color: T.inkSoft, lineHeight: 27, marginVertical: 10 },
  title: { fontSize: T.body, fontWeight: '800', color: T.ink, marginBottom: 6 },
  body: { fontSize: T.small, color: T.ink, lineHeight: 25, marginBottom: 6 },
  why: { fontSize: T.small, color: T.inkSoft, lineHeight: 24, marginBottom: 10 },
  sayBox: { backgroundColor: T.accentSoft, borderRadius: T.radiusSm, padding: 12 },
  sayLabel: { fontSize: T.caption, fontWeight: '800', color: T.accentDeep, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  sayText: { fontSize: T.small, color: T.ink, lineHeight: 24 },
});
