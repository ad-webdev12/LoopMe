// Scams to know. Five cards, each with a tinted icon tile and the line the
// scammer uses. Tap one to see what to do, with a button that reads it aloud.
// A green button at the end leads to the practice call.
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Phone, Volume2, Gift, Package, Heart, Landmark, Monitor } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, ScreenTitle, Lead, Swap, Pill } from '../ui/base';
import { readAloud, stopReading } from '../lib/speech';
import type { Ctx } from '../App';

const TIPS = [
  { n: 1, Icon: Gift, title: 'The gift card demand', quote: '“You owe money. Pay with gift cards.”', answer: 'Hang up. No real company or agency takes gift cards. Ever.' },
  { n: 2, Icon: Package, title: 'The delivery fee', quote: '“Pay a small fee to release your package.”', answer: 'Ignore the link. Check the order on the carrier’s own website or app.' },
  { n: 3, Icon: Heart, title: 'The family emergency', quote: '“It’s your grandchild. Don’t tell anyone.”', answer: 'Hang up and call them on their usual number. Ask for your family’s secret word.' },
  { n: 4, Icon: Landmark, title: 'The bank’s “fraud team”', quote: '“Your account is at risk. Move your money.”', answer: 'Your bank will never ask you to move money to a “safe account.” Hang up and call the number on the back of your card.' },
  { n: 5, Icon: Monitor, title: 'The computer pop-up', quote: '“Your computer has a virus. Call this number.”', answer: 'Apple and Microsoft never put a phone number on screen. Close it. Never let a stranger onto your computer.' },
];

export default function LearnScreen({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => () => stopReading(), []);
  const read = (t: typeof TIPS[number]) => readAloud(t.title + '. ' + t.answer);
  return (
    <Screen C={C} playKey="learn">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <BackLink label="Settings" onPress={() => ctx.go('settings')} />
        <ScreenTitle C={C}>Scams to know</ScreenTitle>
        <Lead C={C} top={4}>Tap one to see what to do.</Lead>
        <View style={{ marginHorizontal: 16, marginTop: 16, gap: 10 }}>
          {TIPS.map(t => {
            const isOpen = open === t.n;
            return (
              <Pressable key={t.n} onPress={() => setOpen(isOpen ? null : t.n)} style={({ pressed }) => [st.card, { backgroundColor: C.card }, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={[st.tile, { backgroundColor: C.redTint }]}><t.Icon size={22} color={T.red} strokeWidth={2} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[font(17, '700'), { color: C.ink }]} allowFontScaling>{t.title}</Text>
                    <Text style={[font(15, '400', 1.35), { color: C.ink2, marginTop: 2 }]} allowFontScaling>{t.quote}</Text>
                  </View>
                </View>
                {isOpen && (
                  <Swap playKey={t.n} ms={200} style={[st.answer, { backgroundColor: C.greenTint }]}>
                    <Text style={[font(13, '700'), { color: C.accent }]} allowFontScaling>WHAT TO DO</Text>
                    <Text style={[font(16, '600', 1.4), { color: C.ink, marginTop: 4 }]} allowFontScaling>{t.answer}</Text>
                    <Pressable onPress={() => read(t)} hitSlop={8} style={({ pressed }) => [st.read, pressed && { opacity: 0.6 }]} accessibilityRole="button">
                      <Volume2 size={18} color={C.accent} strokeWidth={2} />
                      <Text style={[font(15, '600'), { color: C.accent }]} allowFontScaling>Read it to me</Text>
                    </Pressable>
                  </Swap>
                )}
              </Pressable>
            );
          })}
        </View>
        <Pill label="Learn how to spot a scam call" style={{ marginHorizontal: 16, marginTop: 18 }} icon={<Phone size={20} color="#fff" strokeWidth={2} />} onPress={() => ctx.go('practice')} />
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: 20, paddingVertical: 14, paddingHorizontal: 14 },
  tile: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  answer: { marginTop: 12, padding: 12, borderRadius: 12 },
  read: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start' },
});
