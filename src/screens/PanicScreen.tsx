// Panic — source lines 312-325. Five steps, progress bars, the amber action
// row on the steps that carry one, read-aloud, forward and back.
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ArrowRight } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import { readAloud } from '../lib/speech';
import { sendSms } from '../lib/familyLink';
import type { Ctx } from '../App';

export default function PanicScreen({ ctx }: { ctx: Ctx }) {
  const [i, setI] = useState(0);
  const first = ctx.settings.trusted[0];
  const STEPS = [
    { t: 'First: you are okay.', b: 'This happens to millions of careful people every year. Take one slow breath. We will go one step at a time.' },
    { t: 'Stop all contact now.', b: 'Do not reply, do not answer their calls, and do not send anything more, whatever they say will happen.' },
    { t: 'Call your bank.', b: 'Use the number on the back of your card, never a number from a message. They deal with this every day.', a: 'Call the number on my card' },
    { t: 'Loop in someone you trust.', b: 'You do not have to handle this alone. One tap sends them a short note explaining what happened.', a: 'Send a note to ' + (first ? first.name.split(' ')[0] : 'someone') },
    { t: 'Report it.', b: 'Reporting at ReportFraud.ftc.gov helps stop them doing it again. It takes a few minutes and no one will blame you.', a: 'Open ReportFraud.ftc.gov' },
  ];
  const step = STEPS[i];
  const doAction = async () => {
    if (i === 2) ctx.flash('Call the number on my card…');
    else if (i === 3) {
      if (!first) { ctx.go('people'); return; }
      await sendSms(first.phone, 'I think I may have been caught by a scam and could use a hand. Can you call me when you have a minute?');
      ctx.flash('Send a note to ' + first.name.split(' ')[0] + '…');
    } else if (i === 4) Linking.openURL('https://reportfraud.ftc.gov').catch(() => {});
  };
  const next = () => {
    if (i === 4) {
      ctx.update({ ...ctx.settings, panicCompletedAt: Date.now() }); // arms the 90-day recovery-scam guard
      ctx.go('home');
    } else setI(i + 1);
  };

  return (
    <KFIn duration={260} style={{ flex: 1 }} playKey={'panic' + i}>
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={st.topRow}>
        <Pressable style={st.back} onPress={() => ctx.go('home')} accessibilityRole="button">
          <ChevronLeft size={18} color={T.ink} strokeWidth={2.2} />
          <Text style={st.backText} allowFontScaling>Close</Text>
        </Pressable>
        <Text style={st.stepLabel} allowFontScaling>STEP {i + 1} OF 5</Text>
      </View>
      <View style={st.bars}>
        {STEPS.map((_, j) => <View key={j} style={[st.bar, { backgroundColor: j <= i ? T.green : T.hairline }]} />)}
      </View>
      <View style={st.card}>
        <Text style={st.title} allowFontScaling>{step.t}</Text>
        <Text style={st.body} allowFontScaling>{step.b}</Text>
      </View>
      {step.a && (
        <View style={{ paddingHorizontal: 22, paddingTop: 14 }}>
          <Pressable style={st.amberBtn} onPress={doAction} accessibilityRole="button">
            <Text style={st.amberText} allowFontScaling>{step.a}</Text>
            <ArrowRight size={19} color="#8a5a11" strokeWidth={2.1} />
          </Pressable>
        </View>
      )}
      <View style={st.actions}>
        <Pressable style={st.cta} onPress={next} accessibilityRole="button">
          <Text style={st.ctaText} allowFontScaling>{i === 4 ? 'Done, back to checking' : 'Next step'}</Text>
          <ArrowRight size={19} color="#fff" strokeWidth={2.2} />
        </Pressable>
        <Pressable style={st.readBtn} onPress={() => readAloud(step.t + ' ' + step.b)} accessibilityRole="button">
          <Text style={st.readText} allowFontScaling>Read this to me</Text>
        </Pressable>
        {i > 0 && (
          <Pressable style={st.backStep} onPress={() => setI(i - 1)} accessibilityRole="button">
            <Text style={st.backStepText} allowFontScaling>Back a step</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  back: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 5 },
  backText: { fontSize: 14, fontFamily: F.semibold, color: T.ink },
  stepLabel: { fontSize: 11, fontFamily: F.semibold, letterSpacing: 1.1, color: T.sub },
  bars: { flexDirection: 'row', gap: 5, paddingHorizontal: 22, paddingBottom: 18 },
  bar: { flex: 1, height: 5 },
  card: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 22,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  title: { fontSize: 27, fontFamily: F.display, letterSpacing: -0.59, color: T.ink, lineHeight: 28.6 },
  body: { fontSize: 16, fontFamily: F.body, color: T.ink2, lineHeight: 24.8, marginTop: 12 },
  amberBtn: {
    height: 54, backgroundColor: T.amberTint, borderWidth: 1, borderColor: T.amber,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
  },
  amberText: { fontSize: 15, fontFamily: F.bold, color: '#8a5a11' },
  actions: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 104, gap: 8 },
  cta: { height: 56, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  ctaText: { fontSize: 16.5, fontFamily: F.bold, color: '#fff' },
  readBtn: { height: 48, borderWidth: 1, borderColor: T.fieldBorder, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  readText: { fontSize: 14, fontFamily: F.bold, color: T.ink },
  backStep: { height: 44, alignItems: 'center', justifyContent: 'center' },
  backStepText: { fontSize: 13.5, fontFamily: F.semibold, color: T.sub },
});
