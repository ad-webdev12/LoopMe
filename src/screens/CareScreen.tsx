// Caregiver mode — source lines 347-356. Amber badge, four checkable steps,
// done counter, hand the phone back.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ArrowRight, Check, User } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import type { Ctx } from '../App';

const STEPS = [
  { title: 'Add yourself as the trusted person', body: 'You get the text when something looks wrong.' },
  { title: 'Turn on automatic checking', body: 'Unknown-sender texts get checked without them doing anything.' },
  { title: 'Show them one check together', body: 'Walk through one real message and the answer once.' },
  { title: 'Save your own number as safe', body: 'So your texts are never flagged.' },
];

export default function CareScreen({ ctx }: { ctx: Ctx }) {
  const [done, setDone] = useState([true, true, false, false]);
  const name = ctx.settings.careName || 'them';
  const count = done.filter(Boolean).length;
  return (
    <KFIn duration={260} style={{ flex: 1 }} playKey="care">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={st.topRow}>
        <Pressable style={st.back} onPress={() => ctx.go('more')} accessibilityRole="button">
          <ChevronLeft size={18} color={T.ink} strokeWidth={2.2} />
          <Text style={st.backText} allowFontScaling>Back</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
        <View style={st.badge}>
          <User size={14} color={T.amber} strokeWidth={2.2} />
          <Text style={st.badgeText} allowFontScaling>CAREGIVER MODE</Text>
        </View>
        <Text style={st.title} allowFontScaling>Set up for {name}</Text>
        <Text style={st.sub} allowFontScaling>Four things to check, then hand the phone back. Nothing here is hidden from them.</Text>
      </View>
      <View style={st.card}>
        {STEPS.map((c, i) => (
          <Pressable key={i} style={[st.row, i === STEPS.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => { const d = done.slice(); d[i] = !d[i]; setDone(d); }} accessibilityRole="checkbox" accessibilityState={{ checked: done[i] }}>
            <View style={[st.tick, { borderColor: done[i] ? T.green : T.fieldBorder, backgroundColor: done[i] ? T.green : T.surface }]}>
              {done[i] && <Check size={13} color="#fff" strokeWidth={3} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.rowTitle} allowFontScaling>{c.title}</Text>
              <Text style={st.rowBody} allowFontScaling>{c.body}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 104, gap: 9 }}>
        <Text style={st.doneLabel} allowFontScaling>{count} OF 4 DONE</Text>
        <Pressable style={st.cta} onPress={() => ctx.go('home')} accessibilityRole="button">
          <Text style={st.ctaText} allowFontScaling>Hand the phone back</Text>
          <ArrowRight size={19} color="#fff" strokeWidth={2.2} />
        </Pressable>
        <Pressable style={st.ghost} onPress={() => ctx.flash('Text myself a copy of these settings…')} accessibilityRole="button">
          <Text style={st.ghostText} allowFontScaling>Text myself a copy of these settings</Text>
        </Pressable>
      </View>
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  topRow: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  back: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  backText: { fontSize: 14, fontFamily: F.semibold, color: T.ink },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: T.amberTint, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, marginBottom: 11 },
  badgeText: { fontSize: 10, fontFamily: F.display, letterSpacing: 1.4, color: T.amber },
  title: { fontSize: 27, fontFamily: F.display, letterSpacing: -0.54, color: T.ink, lineHeight: 28.6 },
  sub: { fontSize: 13.5, fontFamily: F.body, color: T.sub, lineHeight: 20.25, marginTop: 6 },
  card: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  row: { flexDirection: 'row', gap: 13, padding: 15, borderBottomWidth: 1, borderBottomColor: T.divider },
  tick: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  rowTitle: { fontSize: 15, fontFamily: F.bold, color: T.ink },
  rowBody: { fontSize: 13, fontFamily: F.body, color: T.sub, lineHeight: 18.85, marginTop: 3 },
  doneLabel: { fontSize: 10, fontFamily: F.semibold, letterSpacing: 1.4, color: T.sub },
  cta: { height: 56, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17, marginTop: 4 },
  ctaText: { fontSize: 16.5, fontFamily: F.bold, color: '#fff' },
  ghost: { height: 48, borderWidth: 1, borderColor: T.fieldBorder, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontSize: 14, fontFamily: F.bold, color: T.ink },
});
