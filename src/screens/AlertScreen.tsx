// iOS "freeze": iPhone apps cannot draw over other apps (OS rule, for everyone).
// The real iOS equivalent: SMS Filter junks the scam + Time-Sensitive notification
// opens THIS full-screen calm warning. Same words and buttons as the Android overlay.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OctagonX } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { T, F } from '../theme';
import Button from '../ui/Button';
import { loopIn } from '../lib/loopIn';
import type { Verdict } from '../engine/ScamDetector';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

export default function AlertScreen(props: {
  message: string; verdict: Verdict; recordId: string; settings: Settings; go: (r: Route) => void;
}) {
  useEffect(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }, []);
  return (
    <View style={s.wrap}>
      <View style={s.circle}><OctagonX size={62} color="#FFFFFF" strokeWidth={2.4} /></View>
      <Text style={s.line} allowFontScaling>This looks like a scam.{'\n'}Do not tap anything.</Text>
      <Button label="Show me why"
        onPress={() => props.go({ name: 'verdict', message: props.message, verdict: props.verdict, recordId: props.recordId })} />
      <Button label="Loop someone in" kind="secondary"
        onPress={() => {
          const p = props.settings.trusted[0] || null;
          if (!p) props.go({ name: 'circle' }); else loopIn(p, props.message, props.verdict);
        }} />
      <Button label="I’m okay, close" kind="ghost" onPress={() => props.go({ name: 'home' })} />
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, padding: 28, justifyContent: 'center', backgroundColor: T.redSoft },
  circle: { alignSelf: 'center', width: 124, height: 124, borderRadius: 62, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  line: { fontSize: T.title, fontFamily: F.displayBold, color: T.ink, textAlign: 'center', lineHeight: 36, marginBottom: 22 },
});
