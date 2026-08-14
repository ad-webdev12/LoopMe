// Full-screen scam alert — Design 4. The whole screen goes red so there is no
// mistaking it. Big words, three clear choices. (On iPhone this is opened by a
// Time-Sensitive notification from the SMS filter; same words on every platform.)
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OctagonX, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { F } from '../theme';
import { loopIn } from '../lib/loopIn';
import type { FusedVerdict } from '../engine/ai';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

export default function AlertScreen(props: {
  message: string; verdict: FusedVerdict; recordId: string; settings: Settings; go: (r: Route) => void;
}) {
  useEffect(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }, []);
  const first = props.settings.trusted[0]?.name.split(' ')[0];
  return (
    <View style={s.wrap}>
      <View style={s.top}>
        <View style={s.badge}><OctagonX size={30} color="#EC3013" strokeWidth={2.4} /></View>
        <Text style={s.eyebrow} allowFontScaling>SCAM DETECTED</Text>
        <Text style={s.line} allowFontScaling>This looks like a scam.</Text>
        <Text style={s.sub} allowFontScaling>Do not tap anything, do not reply, do not send money.</Text>
      </View>

      <View style={s.actions}>
        <Pressable style={s.primary} onPress={() => props.go({ name: 'verdict', message: props.message, verdict: props.verdict, recordId: props.recordId })} accessibilityRole="button">
          <Text style={s.primaryText} allowFontScaling>Show me why</Text>
          <ArrowRight size={19} color="#EC3013" strokeWidth={2.2} />
        </Pressable>
        <Pressable style={s.secondary} onPress={() => {
          const p = props.settings.trusted[0] || null;
          if (!p) props.go({ name: 'circle' }); else loopIn(p, props.message, props.verdict);
        }} accessibilityRole="button">
          <Text style={s.secondaryText} allowFontScaling>{first ? `Tell ${first}` : 'Loop someone in'}</Text>
        </Pressable>
        <Pressable style={s.quiet} onPress={() => props.go({ name: 'home' })} accessibilityRole="button">
          <Text style={s.quietText} allowFontScaling>I’m okay, close this</Text>
        </Pressable>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#EC3013', paddingHorizontal: 26, paddingTop: 90, paddingBottom: 40, justifyContent: 'space-between' },
  top: { alignItems: 'flex-start' },
  badge: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  eyebrow: { fontSize: 12, fontFamily: F.bold, color: 'rgba(255,255,255,0.85)', letterSpacing: 1.6 },
  line: { fontSize: 38, fontFamily: F.display, color: '#fff', letterSpacing: -0.8, marginTop: 10, lineHeight: 42 },
  sub: { fontSize: 17, fontFamily: F.medium, color: 'rgba(255,255,255,0.92)', marginTop: 14, lineHeight: 25 },
  actions: { gap: 10 },
  primary: { height: 58, borderRadius: 13, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontSize: 17, fontFamily: F.bold, color: '#EC3013' },
  secondary: { height: 54, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 16, fontFamily: F.bold, color: '#fff' },
  quiet: { height: 48, alignItems: 'center', justifyContent: 'center' },
  quietText: { fontSize: 15, fontFamily: F.medium, color: 'rgba(255,255,255,0.85)' },
});
