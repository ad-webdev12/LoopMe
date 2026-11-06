// The red screen. One field, three lines, and for two seconds nothing to
// tap. Then two buttons. Everything else lives one tap away on the verdict.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ban } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFFade, KFRise } from '../ui/kf';
import type { Ctx } from '../App';

export default function AlertScreen({ ctx }: { ctx: Ctx }) {
  const [held, setHeld] = useState(true);
  useEffect(() => {
    setHeld(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    const t1 = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 450);
    const t2 = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 900);
    const t3 = setTimeout(() => setHeld(false), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [ctx.recordId]);

  const s = ctx.settings;
  const rec = ctx.hist.find(r => r.id === ctx.recordId);
  const sender = rec?.sender && rec.sender.replace(/\D/g, '').length >= 7 ? rec.sender : '';
  const canBlock = !!sender && !s.blocked.includes(sender.replace(/\D/g, ''));
  const linked = s.familyLinked && s.familyRole === 'owner';
  const who = linked ? (s.watchedBy?.split(' ')[0] || '') : '';

  return (
    <KFFade duration={200} style={st.root} playKey={ctx.recordId}>
      <View style={st.field}>
        <KFRise duration={550} delay={100} playKey={ctx.recordId}>
          <Text style={st.eyebrow} allowFontScaling>SCAM</Text>
          <Text style={st.display} allowFontScaling>Stop.{'\n'}Do not reply.</Text>
        </KFRise>
        <KFRise duration={550} delay={260} playKey={ctx.recordId}>
          <Text style={st.line} allowFontScaling>{sender ? 'From ' + sender + '. ' : ''}Nothing happens if you do nothing.{who ? ' ' + who + ' has been told.' : ''}</Text>
        </KFRise>
      </View>

      <View style={st.bottom}>
        {held ? (
          <View style={st.holdBar}><View style={st.holdFill} /></View>
        ) : (
          <KFFade duration={250} playKey="buttons" style={{ gap: 10 }}>
            {canBlock ? (
              <Pressable style={st.primary} onPress={() => { void ctx.blockNumber(sender); ctx.go('home'); }} accessibilityRole="button">
                <Ban size={20} color="#fff" strokeWidth={2.4} />
                <Text style={st.primaryText} allowFontScaling>Block this number</Text>
              </Pressable>
            ) : (
              <Pressable style={st.primary} onPress={() => ctx.go('home')} accessibilityRole="button">
                <Text style={st.primaryText} allowFontScaling>Okay, I will leave it</Text>
              </Pressable>
            )}
            <Pressable style={st.secondary} onPress={() => ctx.go('verdict')} accessibilityRole="button">
              <Text style={st.secondaryText} allowFontScaling>{canBlock ? 'Leave it, show me more' : 'Show me more'}</Text>
            </Pressable>
          </KFFade>
        )}
      </View>
    </KFFade>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.red },
  field: { flex: 1, justifyContent: 'center', paddingHorizontal: 26, paddingBottom: 20 },
  eyebrow: { fontSize: 13, fontFamily: F.bold, letterSpacing: 2.4, color: 'rgba(255,255,255,.8)', marginBottom: 14 },
  display: { fontSize: 46, fontFamily: F.display, letterSpacing: -1.4, color: '#fff', lineHeight: 48 },
  line: { fontSize: 19, fontFamily: F.medium, color: '#fff', lineHeight: 28, marginTop: 22 },
  bottom: { paddingHorizontal: 26, paddingBottom: 40, minHeight: 190, justifyContent: 'flex-end' },
  holdBar: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.25)', overflow: 'hidden', marginBottom: 60 },
  holdFill: { width: '100%', height: 5, backgroundColor: '#fff' },
  primary: { height: 64, borderRadius: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryText: { fontSize: 19, fontFamily: F.bold, color: T.red },
  secondary: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,.55)' },
  secondaryText: { fontSize: 17, fontFamily: F.semibold, color: '#fff' },
});
