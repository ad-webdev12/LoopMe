// Neon verdict core: pulsing halo rings + rotating orbit ring around the verdict.
// Smooth pulses only — never strobing.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { T, LEVEL_META } from '../theme';
import type { Level } from '../engine/ScamDetector';

function Halo({ color, delay }: { color: string; delay: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(a, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 2, borderColor: color,
      opacity: a.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.7, 0] }),
      transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
    }} />
  );
}

export default function Stoplight({ level }: { level: Level }) {
  const m = LEVEL_META[level];
  const spin = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, [level]);
  return (
    <View style={s.wrap} accessible accessibilityLabel={`${m.word}. ${m.line}`}>
      <Halo color={m.color} delay={0} />
      <Halo color={m.color} delay={700} />
      <Halo color={m.color} delay={1400} />
      <Animated.View style={[s.orbit, { borderColor: m.color, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
      <Animated.View style={[s.circle, {
        backgroundColor: m.soft, borderColor: m.color, shadowColor: m.color,
        transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }],
      }]}>
        <Text style={[s.icon, { color: m.color }]}>{m.icon}</Text>
      </Animated.View>
      <Text style={[s.word, { color: m.color, textShadowColor: m.color }]} allowFontScaling>{m.word}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', marginVertical: 16, height: 240 },
  orbit: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 1.5, borderStyle: 'dashed', opacity: 0.6 },
  circle: { width: 150, height: 150, borderRadius: 75, borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.9, shadowRadius: 26, elevation: 16 },
  icon: { fontSize: 62 },
  word: { fontSize: T.headline, fontWeight: '900', marginTop: 14, letterSpacing: 4, textShadowRadius: 16 },
});
