// Five tricks worth knowing. Tap one to see what to do; the answer box fades
// up. A green banner leads to the practice call; one button reads the open
// trick aloud.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { Phone, ChevronRight, Volume2 } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, ScreenTitle, Lead, Swap } from '../ui/base';
import type { Ctx } from '../App';

const TIPS = [
  { n: 1, red: true, title: 'The gift card demand', body: 'Someone says you owe money and must pay with gift cards.', answer: 'Hang up. No real company or agency takes gift cards. Ever.' },
  { n: 2, red: false, title: 'The delivery fee', body: 'A text says a small fee will release your package.', answer: 'Ignore the link. Check the order on the carrier’s own website or app.' },
  { n: 3, red: true, title: 'The family emergency', body: 'A panicked message from “your grandchild”, sworn to secrecy.', answer: 'Hang up and ring them on their usual number. Ask for your family’s secret word.' },
  { n: 4, red: true, title: 'The bank’s “fraud team”', body: 'A caller says your account is at risk and you must move your money.', answer: 'Your bank will never ask you to move money to a “safe account”. Hang up and call the number on your card.' },
  { n: 5, red: false, title: 'The computer pop-up', body: 'A loud warning says your computer has a virus and gives a number to call.', answer: 'Apple and Microsoft never put a phone number on screen. Close it. Never let a stranger onto your computer.' },
];

export default function LearnScreen({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const [open, setOpen] = useState<number | null>(null);
  const read = () => {
    const t = TIPS.find(x => x.n === open);
    if (!t) { ctx.flash('Tap a trick first.'); return; }
    Speech.speak(t.title + '. ' + t.body + ' ' + t.answer, { rate: 0.9 });
  };
  return (
    <Screen C={C} playKey="learn">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <BackLink label="Settings" onPress={() => ctx.go('settings')} />
        <ScreenTitle C={C}>Five tricks worth knowing</ScreenTitle>
        <Lead C={C} top={8}>Tap one to see what to do.</Lead>
        <Pressable onPress={() => ctx.go('practice')} style={({ pressed }) => [st.banner, pressed && { opacity: 0.8 }]} accessibilityRole="button">
          <Phone size={22} color="#fff" strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={[font(17, '600'), { color: '#fff' }]} allowFontScaling>Practice a scam call</Text>
            <Text style={[font(15, '400'), { color: '#fff', marginTop: 1 }]} allowFontScaling>A rehearsal. Nobody really calls.</Text>
          </View>
          <ChevronRight size={18} color="#fff" strokeWidth={2.2} />
        </Pressable>
        <View style={[st.list, { backgroundColor: C.card }]}>
          {TIPS.map((t, i) => (
            <Pressable key={t.n} onPress={() => setOpen(open === t.n ? null : t.n)} style={[st.row, i < TIPS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep }]} accessibilityRole="button" accessibilityState={{ expanded: open === t.n }}>
              <Text style={[font(17, '700'), { color: t.red ? T.red : T.amber }]} allowFontScaling>{t.n}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>{t.title}</Text>
                <Text style={[font(15, '400', 1.4), { color: C.ink2, marginTop: 2 }]} allowFontScaling>{t.body}</Text>
                {open === t.n && (
                  <Swap playKey={t.n} ms={200} style={[st.answer, { backgroundColor: t.red ? C.redTint : C.amberTint }]}>
                    <Text style={[font(16, '600', 1.4), { color: t.red ? T.redInk : T.amberInk }]} allowFontScaling>{t.answer}</Text>
                  </Swap>
                )}
              </View>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={read} style={({ pressed }) => [st.read, { backgroundColor: C.card }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <Volume2 size={18} color={T.green} strokeWidth={2} />
          <Text style={[font(16, '600'), { color: T.green }]} allowFontScaling>Read the open one to me</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  banner: { marginHorizontal: 16, marginTop: 16, backgroundColor: T.green, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  list: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 14 },
  answer: { marginTop: 10, padding: 12, borderRadius: 12 },
  read: { marginHorizontal: 16, marginTop: 14, height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
