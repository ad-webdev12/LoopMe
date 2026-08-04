// iOS "freeze": iPhone apps cannot draw over other apps (OS rule, for everyone).
// The real iOS equivalent: SMS Filter junks the scam + Time-Sensitive notification
// opens THIS full-screen calm warning. Same words and buttons as the Android overlay.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { play } from '../lib/sound';
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
  const shake = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    play('red');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([8, -8, 6, -6, 3, -3, 0].map(v =>
      Animated.timing(shake, { toValue: v, duration: 55, useNativeDriver: true }))).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={[s.wrap, { transform: [{ translateX: shake }] }]}>
      <Animated.View style={[s.circle, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }]}>
        <Text style={s.icon}>{'\u26A0'}</Text>
      </Animated.View>
      <Text style={s.line} allowFontScaling>This looks like a scam.{'\n'}Do not tap anything.</Text>
      <BigButton label="Show me why" color={T.ink}
        onPress={() => props.go({ name: 'verdict', message: props.message, verdict: props.verdict })} />
      <BigButton label="Loop someone in" kind="secondary"
        onPress={() => {
          const p = props.settings.trusted[0] || null;
          if (!p) props.go({ name: 'circle' }); else loopIn(p, props.message, props.verdict);
        }} />
      <BigButton label="I\u2019m okay, close" kind="quiet" onPress={() => props.go({ name: 'home' })} />
    </Animated.View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, padding: 28, justifyContent: 'center', backgroundColor: T.redSoft },
  circle: { alignSelf: 'center', width: 132, height: 132, borderRadius: 66, backgroundColor: 'transparent', borderWidth: 3, borderColor: T.red, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: T.red, shadowOpacity: 1, shadowRadius: 30, elevation: 20 },
  icon: { fontSize: 60, color: T.red },
  line: { fontSize: T.headline - 2, fontWeight: '800', color: T.ink, textAlign: 'center', lineHeight: 40, marginBottom: 24 },
});
