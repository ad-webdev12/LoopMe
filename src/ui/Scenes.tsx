// Small looping illustrations for the Settings pages that would otherwise be
// a single row. Drawn with views, so they follow light and dark mode.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Lock, CloudOff, ShieldCheck, Check, Trash2 } from 'lucide-react-native';
import { T, font, Palette } from '../theme';
import { motionOff } from './base';

function useLoop(ms: number) {
  const t = useRef(new Animated.Value(motionOff() ? 0.6 : 0)).current;
  useEffect(() => {
    if (motionOff()) return;
    const l = Animated.loop(Animated.timing(t, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }));
    l.start();
    return () => l.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return t;
}

/** Messages land on the phone and stay there; the cloud is crossed out. */
export function PrivacyScene({ C }: { C: Palette }) {
  const t = useLoop(4200);
  const spin = useLoop(14000);
  const pulse = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });
  return (
    <View style={st.stage}>
      <Animated.View style={[st.orbit, { borderColor: C.dark ? 'rgba(13,107,87,.5)' : '#cfe3db', transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
        {[0, 1, 2].map(k => <View key={k} style={[st.sat, { backgroundColor: T.green, transform: [{ rotate: k * 120 + 'deg' }, { translateY: -96 }] }]} />)}
      </Animated.View>
      <View style={[st.phone, { backgroundColor: C.card, borderColor: C.dark ? '#3a3a3c' : '#e5e5ea' }]}>
        {[0, 1, 2].map(k => (
          <Animated.View key={k} style={[st.line, { width: [62, 44, 54][k], backgroundColor: k === 1 ? T.green : C.dark ? '#3a3a3c' : '#dfe9e5', alignSelf: k === 1 ? 'flex-end' : 'flex-start',
            opacity: t.interpolate({ inputRange: [0, 0.1 + k * 0.12, 0.2 + k * 0.12, 0.85, 1], outputRange: [0, 0, 1, 1, 0], extrapolate: 'clamp' }),
            transform: [{ translateY: t.interpolate({ inputRange: [0, 0.1 + k * 0.12, 0.2 + k * 0.12], outputRange: [8, 8, 0], extrapolate: 'clamp' }) }] }]} />
        ))}
        <Animated.View style={[st.lock, { transform: [{ scale: pulse }] }]}><Lock size={22} color="#fff" strokeWidth={2.2} /></Animated.View>
      </View>
      <View style={[st.cloud, { backgroundColor: C.card }]}><CloudOff size={20} color={C.dark ? '#8e8e93' : '#8e8e93'} strokeWidth={2} /></View>
    </View>
  );
}

/** Texts drop in; the scam one is pulled aside into Junk, the rest stay. */
export function FilterScene({ C }: { C: Palette }) {
  const t = useLoop(4800);
  const rows = [
    { text: 'Running 5 min late!', scam: false },
    { text: 'Your account is locked. Verify now', scam: true },
    { text: 'Dinner Sunday?', scam: false },
  ];
  return (
    <View style={[st.stage, { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 22, gap: 14 }]}>
      <View style={[st.inbox, { backgroundColor: C.card }]}>
        {rows.map((r, k) => {
          const inAt = 0.05 + k * 0.12;
          const out = r.scam ? { translateX: t.interpolate({ inputRange: [0, 0.55, 0.72, 1], outputRange: [0, 0, 120, 120], extrapolate: 'clamp' }) } : { translateX: 0 };
          return (
            <Animated.View key={k} style={[st.msg, { backgroundColor: r.scam ? (C.dark ? 'rgba(236,48,19,.25)' : '#fdeeea') : C.dark ? '#2c2c2e' : '#f2f2f7',
              opacity: t.interpolate({ inputRange: [0, inAt, inAt + 0.08, r.scam ? 0.66 : 0.9, r.scam ? 0.72 : 1], outputRange: [0, 0, 1, 1, 0], extrapolate: 'clamp' }),
              transform: [{ translateY: t.interpolate({ inputRange: [0, inAt, inAt + 0.1], outputRange: [-16, -16, 0], extrapolate: 'clamp' }) }, out] }]}>
              <Text style={[font(12.5, '500', 1.2), { color: C.ink, flex: 1 }]} numberOfLines={1}>{r.text}</Text>
              <Animated.View style={{ opacity: t.interpolate({ inputRange: [0, 0.4, 0.48], outputRange: [0, 0, 1], extrapolate: 'clamp' }) }}>
                {r.scam ? <View style={[st.badge, { backgroundColor: T.red }]}><Text style={[font(10, '800'), { color: '#fff' }]}>SCAM</Text></View>
                  : <View style={[st.badgeRound, { backgroundColor: T.green }]}><Check size={10} color="#fff" strokeWidth={3.2} /></View>}
              </Animated.View>
            </Animated.View>
          );
        })}
      </View>
      <Animated.View style={[st.junk, { backgroundColor: C.card, transform: [{ scale: t.interpolate({ inputRange: [0, 0.68, 0.74, 0.82, 1], outputRange: [1, 1, 1.12, 1, 1], extrapolate: 'clamp' }) }] }]}>
        <Trash2 size={22} color={T.red} strokeWidth={2} />
        <Text style={[font(12, '700'), { color: C.ink, marginTop: 4 }]}>Junk</Text>
      </Animated.View>
    </View>
  );
}

/** For a page with a single fact: a shield that breathes. */
export function ShieldScene({ C }: { C: Palette }) {
  const t = useLoop(3000);
  return (
    <View style={st.stage}>
      <Animated.View style={[st.halo, { backgroundColor: C.greenTint, transform: [{ scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.9, 1.1, 0.9] }) }] }]} />
      <View style={st.shield}><ShieldCheck size={46} color="#fff" strokeWidth={2} /></View>
    </View>
  );
}

const st = StyleSheet.create({
  stage: { height: 230, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  orbit: { position: 'absolute', width: 192, height: 192, borderRadius: 96, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  sat: { position: 'absolute', width: 9, height: 9, borderRadius: 5 },
  phone: { width: 96, height: 150, borderRadius: 20, borderWidth: 3, padding: 12, gap: 8, alignItems: 'stretch' },
  line: { height: 12, borderRadius: 6 },
  lock: { position: 'absolute', bottom: 14, alignSelf: 'center', width: 44, height: 44, borderRadius: 22, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  cloud: { position: 'absolute', top: 6, right: '22%', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  inbox: { width: 210, borderRadius: 18, padding: 10, gap: 8, minHeight: 150 },
  msg: { height: 40, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { paddingHorizontal: 5, height: 16, borderRadius: 4, justifyContent: 'center' },
  badgeRound: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  junk: { width: 70, height: 80, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  halo: { position: 'absolute', width: 150, height: 150, borderRadius: 75 },
  shield: { width: 96, height: 96, borderRadius: 30, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
});
