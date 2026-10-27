// Full-screen alert. Red field with the eyebrow, the display line, a hairline,
// one sentence about the actual message; the bottom half is ground-colored
// with the three actions and the offline note.
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, ArrowRight, User, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { T, F } from '../theme';
import { KFFade, KFRise } from '../ui/kf';
import type { Ctx } from '../App';

export default function AlertScreen({ ctx }: { ctx: Ctx }) {
  const v = ctx.verdict;
  useEffect(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }, []);
  const rec = ctx.hist.find(r => r.id === ctx.recordId);
  const sender = rec?.sender || 'an unknown number';
  const firstSignal = v?.signals?.[0] || 'It matches a known scam.';
  const s = ctx.settings;
  const linked = s.familyLinked && s.familyRole === 'owner';
  const who = linked ? (s.watchedBy?.split(' ')[0] || 'family') : (s.trusted[0]?.name.split(' ')[0] || 'someone');
  // Measured, not asserted: the time this very check actually took.
  const took = v?.elapsedMs;
  const speed = took == null ? 'in an instant'
    : took < 1 ? 'in under a millisecond'
    : 'in ' + Math.round(took) + (Math.round(took) === 1 ? ' millisecond' : ' milliseconds');
  const usedAppleIntelligence = v?.aiTier === 'foundation' && v?.ai != null;
  const ms = usedAppleIntelligence ? 'with Apple Intelligence' : speed;

  return (
    <KFFade duration={200} style={{ flex: 1 }} playKey={ctx.recordId}>
    <ScrollView style={st.root} bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={st.top}>
        <KFFade duration={400} playKey={ctx.recordId} style={st.eyebrowRow}>
          <View style={st.eyeIcon}><AlertTriangle size={20} color="#fff" strokeWidth={2.2} /></View>
          <Text style={st.eyebrow} allowFontScaling>Stop: likely scam</Text>
        </KFFade>
        <KFRise duration={550} delay={100} playKey={ctx.recordId}>
          <Text style={st.display} allowFontScaling>Please don’t{'\n'}tap anything.</Text>
        </KFRise>
        <View style={st.rule} />
        <KFRise duration={550} delay={200} playKey={ctx.recordId}>
          <Text style={st.line} allowFontScaling>A text from {sender} just arrived. {firstSignal}</Text>
        </KFRise>
        <Text style={st.sub} allowFontScaling>
          {linked ? who + ' has been told as well. ' : ''}Nothing happens unless you tap something, so you can simply leave it.
        </Text>
      </View>

      <View style={st.bottom}>
        <Pressable style={st.darkBtn} onPress={() => ctx.go('verdict')} accessibilityRole="button">
          <Text style={st.darkBtnText} allowFontScaling>Show me why</Text>
          <ArrowRight size={19} color="#fff" strokeWidth={2.2} />
        </Pressable>
        <Pressable style={st.greenBtn} onPress={() => ctx.loopIn(ctx.recordId)} accessibilityRole="button">
          <Text style={st.greenBtnText} allowFontScaling>{linked ? 'Ask ' + who + ' about it' : 'Loop in ' + who}</Text>
          <User size={19} color="#fff" strokeWidth={1.9} />
        </Pressable>
        <Pressable style={st.quiet} onPress={() => ctx.go('home')} accessibilityRole="button">
          <Text style={st.quietText} allowFontScaling>I’m okay, close this</Text>
        </Pressable>
        <View style={st.offline}>
          <Shield size={15} color={T.green} strokeWidth={2} />
          <Text style={st.offlineText} allowFontScaling>Checked on this phone, offline, {ms}.</Text>
        </View>
      </View>
    </ScrollView>
    </KFFade>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.red },
  top: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 26 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  eyeIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 12, fontFamily: F.bold, letterSpacing: 2, textTransform: 'uppercase', color: '#fff' },
  display: { fontSize: 38, fontFamily: F.display, letterSpacing: -1.14, color: '#fff', lineHeight: 38 },
  rule: { height: 1, backgroundColor: 'rgba(255,255,255,.45)', marginVertical: 20 },
  line: { fontSize: 18, fontFamily: F.semibold, color: '#fff', lineHeight: 26 },
  sub: { fontSize: 16, fontFamily: F.body, color: 'rgba(255,255,255,.85)', lineHeight: 23, marginTop: 12 },

  bottom: { flexGrow: 1, minHeight: 330, backgroundColor: T.ground, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 30, gap: 9 },
  darkBtn: { height: 58, borderRadius: 12, backgroundColor: '#171717', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  darkBtnText: { fontSize: 17, fontFamily: F.bold, color: '#fff' },
  greenBtn: { height: 58, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  greenBtnText: { fontSize: 17, fontFamily: F.bold, color: '#fff' },
  quiet: { height: 48, alignItems: 'center', justifyContent: 'center' },
  quietText: { fontSize: 16, fontFamily: F.semibold, color: T.sub },
  offline: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 },
  offlineText: { fontSize: 13.5, fontFamily: F.body, color: T.sub },
});
