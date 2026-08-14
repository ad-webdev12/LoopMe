// Learn the tricks — source lines 340-345. Five numbered tricks with the
// "What to do:" line coloured by tone.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import { readAloud } from '../lib/speech';
import type { Ctx } from '../App';

const TRICKS = [
  { title: 'The gift card demand', body: 'Someone says you owe money and must pay with gift cards.', doThis: 'hang up. No real company or agency takes gift cards. Ever.', tone: 'red' },
  { title: 'The delivery fee', body: 'A text says a small fee will release your package.', doThis: 'ignore the link and check the order on the carrier’s own site.', tone: 'amber' },
  { title: 'The family emergency', body: 'A panicked message from “your grandchild”, sworn to secrecy.', doThis: 'hang up and ring that person on their usual number.', tone: 'red' },
  { title: 'The bank alert', body: 'A frightening “your account is locked” message with a link.', doThis: 'call the number printed on the back of your card.', tone: 'amber' },
  { title: 'The code request', body: 'Someone asks you to read out a code that was just texted to you.', doThis: 'never read it out. That code is the key to your account.', tone: 'red' },
] as const;

export default function LearnScreen({ ctx }: { ctx: Ctx }) {
  return (
    <KFIn duration={260} style={{ flex: 1 }} playKey="learn">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={st.topRow}>
        <Pressable style={st.back} onPress={() => ctx.go('more')} accessibilityRole="button">
          <ChevronLeft size={18} color={T.ink} strokeWidth={2.2} />
          <Text style={st.backText} allowFontScaling>Back</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
        <Text style={st.title} allowFontScaling>Five tricks worth knowing</Text>
        <Text style={st.sub} allowFontScaling>Once you have seen them, they are much easier to spot.</Text>
      </View>
      <View style={st.card}>
        {TRICKS.map((t, i) => {
          const edge = t.tone === 'red' ? T.red : T.amber;
          return (
            <Pressable key={i} style={[st.row, i === TRICKS.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => readAloud(t.title + '. ' + t.body + ' What to do: ' + t.doThis)} accessibilityRole="button">
              <Text style={[st.num, { color: edge }]} allowFontScaling>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.rowTitle} allowFontScaling>{t.title}</Text>
                <Text style={st.rowBody} allowFontScaling>{t.body}</Text>
                <Text style={[st.doThis, { color: edge }]} allowFontScaling>What to do: {t.doThis}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: 104 }} />
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  topRow: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  back: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  backText: { fontSize: 14, fontFamily: F.semibold, color: T.ink },
  title: { fontSize: 27, fontFamily: F.display, letterSpacing: -0.54, color: T.ink, lineHeight: 28.6 },
  sub: { fontSize: 13.5, fontFamily: F.body, color: T.sub, lineHeight: 20.25, marginTop: 6 },
  card: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  row: { flexDirection: 'row', gap: 13, paddingHorizontal: 15, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  num: { fontSize: 14, fontFamily: F.bold, width: 15, paddingTop: 1 },
  rowTitle: { fontSize: 16, fontFamily: F.bold, color: T.ink },
  rowBody: { fontSize: 13.5, fontFamily: F.body, color: T.sub, lineHeight: 20.25, marginTop: 4 },
  doThis: { fontSize: 12.5, fontFamily: F.bold, lineHeight: 18.1, marginTop: 9 },
});
