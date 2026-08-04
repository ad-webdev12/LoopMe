// iOS "freeze": iPhone apps cannot draw over other apps (OS rule, for everyone).
// The real iOS equivalent: SMS Filter junks the scam + Time-Sensitive notification
// opens THIS full-screen calm warning. Same words and buttons as the Android overlay.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { T } from '../theme';
import BigButton from '../components/BigButton';
import { loopIn } from '../lib/loopIn';
import type { Verdict } from '../engine/ScamDetector';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

export default function AlertScreen(props: {
  message: string; verdict: Verdict; settings: Settings; go: (r: Route) => void;
}) {
  useEffect(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }, []);
  return (
    <View style={s.wrap}>
      <View style={s.circle}><Text style={s.icon}>{'\u26D4'}</Text></View>
      <Text style={s.line} allowFontScaling>This looks like a scam.{'\n'}Do not tap anything.</Text>
      <BigButton label="Show me why" color={T.ink}
        onPress={() => props.go({ name: 'verdict', message: props.message, verdict: props.verdict })} />
      <BigButton label="Loop someone in" kind="secondary"
        onPress={() => {
          const p = props.settings.trusted[0] || null;
          if (!p) props.go({ name: 'circle' }); else loopIn(p, props.message, props.verdict);
        }} />
      <BigButton label="I\u2019m okay, close" kind="quiet" onPress={() => props.go({ name: 'home' })} />
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, padding: 28, justifyContent: 'center', backgroundColor: T.redSoft },
  circle: { alignSelf: 'center', width: 132, height: 132, borderRadius: 66, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  icon: { fontSize: 60, color: '#FFF' },
  line: { fontSize: T.headline - 2, fontWeight: '800', color: T.ink, textAlign: 'center', lineHeight: 40, marginBottom: 24 },
});
