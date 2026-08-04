// The theater: the verdict is computed instantly (engine <10ms), but the neon build
// plays a 1.4s ANALYZING sequence — scanning beam, ticking signature checks, sweep sound —
// before revealing it. Pure drama layer for the test build.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { T } from '../theme';
import AnimatedBG from '../components/AnimatedBG';
import { play } from '../lib/sound';

const CHECKS = ['LINK FORENSICS', 'PRESSURE PATTERNS', 'IMPERSONATION DB', 'PAYMENT TRAPS', 'SECRECY SIGNALS'];

export default function ScanScreen({ onDone }: { onDone: () => void }) {
  const beam = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(0);
  useEffect(() => {
    play('scan');
    Animated.loop(Animated.timing(beam, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true })).start();
    Animated.timing(bar, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const t = setInterval(() => setStep(s => Math.min(s + 1, CHECKS.length)), 260);
    const done = setTimeout(onDone, 1450);
    return () => { clearInterval(t); clearTimeout(done); };
  }, []);
  return (
    <View style={s.wrap}>
      <AnimatedBG />
      <Text style={s.title} allowFontScaling>ANALYZING</Text>
      <View style={s.scanBox}>
        <Animated.View style={[s.beam, { transform: [{ translateY: beam.interpolate({ inputRange: [0, 1], outputRange: [0, 150] }) }] }]} />
        {CHECKS.map((c, i) => (
          <Text key={c} style={[s.check, { color: i < step ? T.green : T.inkSoft, opacity: i < step ? 1 : 0.4 }]} allowFontScaling>
            {i < step ? '\u2713' : '\u25CB'}  {c}
          </Text>
        ))}
      </View>
      <View style={s.barTrack}>
        <Animated.View style={[s.barFill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.cream, justifyContent: 'center', padding: 28 },
  title: { fontSize: 26, fontWeight: '900', color: T.cyan, textAlign: 'center', letterSpacing: 8, marginBottom: 24, textShadowColor: T.cyan, textShadowRadius: 14 },
  scanBox: { backgroundColor: T.card, borderRadius: T.radius, borderWidth: 1, borderColor: T.cardEdge, padding: 22, overflow: 'hidden', height: 210, justifyContent: 'center' },
  beam: { position: 'absolute', left: 0, right: 0, top: 10, height: 3, backgroundColor: T.cyan, opacity: 0.5, shadowColor: T.cyan, shadowOpacity: 1, shadowRadius: 10 },
  check: { fontSize: 17, fontWeight: '700', letterSpacing: 2, marginVertical: 5, fontVariant: ['tabular-nums'] },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: T.card, marginTop: 22, overflow: 'hidden', borderWidth: 1, borderColor: T.cardEdge },
  barFill: { height: '100%', backgroundColor: T.cyan, shadowColor: T.cyan, shadowOpacity: 1, shadowRadius: 8 },
});
