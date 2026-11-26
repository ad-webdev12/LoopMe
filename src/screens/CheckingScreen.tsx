// Checking a message. The breathing app icon, a status line that steps
// through what is being looked at, a progress bar, the message with its
// flagged phrases lighting up under a scan band. The rules and the model run
// underneath (App.check) and this screen stays until the real verdict is in;
// the last status line simply holds until then.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Check, Lock } from 'lucide-react-native';
import { highlights } from '../engine/explain';
import { T, font } from '../theme';
import { APP_ICON, Screen, motionOff } from '../ui/base';
import { Bubble, Highlighted, senderLabel, whenLabel } from '../ui/pieces';
import type { Ctx } from '../App';

const STEPS = ['Reading the words…', 'Checking the number…', 'Looking for scam tricks…'];
const CHECKS = [
  { t: 'The words', d: 'Money, secrets, rushing you' },
  { t: 'Links and numbers', d: 'Where they really go' },
  { t: 'Scams we know', d: 'Compared with thousands of real ones' },
];

export default function CheckingScreen({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const rec = ctx.hist.find(h => h.id === ctx.recordId);
  const matches = ctx.verdict ? highlights(ctx.msg, ctx.verdict.level, ctx.verdict.tags || []) : [];
  const off = motionOff();

  const fill = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const band = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [lit, setLit] = useState(-1);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];
    // Fills most of the way on its own, then waits on the verdict.
    Animated.timing(fill, { toValue: 0.92, duration: 2600, delay: 100, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }).start();
    if (!off) {
      loops.push(Animated.loop(Animated.sequence([Animated.timing(breathe, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), Animated.timing(breathe, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })])));
      loops.push(Animated.loop(Animated.timing(band, { toValue: 1, duration: 1400, easing: Easing.bezier(0.45, 0, 0.55, 1), useNativeDriver: true })));
      loops.forEach(l => l.start());
    }
    const t = [900, 1300, 1700].map((ms, i) => setTimeout(() => setLit(i), ms));
    const k = [900, 1800].map((ms, i) => setTimeout(() => {
      if (off) { setStep(i + 1); return; }
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setStep(i + 1);
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, ms));
    return () => { loops.forEach(l => l.stop()); [...t, ...k].forEach(clearTimeout); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen C={C} playKey="checking" scroll style={{ paddingHorizontal: 16 }}>
      <View style={{ alignItems: 'center', paddingTop: 44 }}>
        <Animated.Image source={APP_ICON} style={[st.icon, !off && { transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }]} />
        <Animated.Text style={[font(24, '700', 1.33, -0.4), { color: C.ink, marginTop: 24, textAlign: 'center', opacity: fade }]} allowFontScaling accessibilityLiveRegion="polite">{STEPS[step]}</Animated.Text>
        <View style={[st.track, { backgroundColor: C.dark ? 'rgba(13,107,87,.3)' : '#dfe9e5' }]}>
          <Animated.View style={[st.bar, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </View>

      <View style={[st.card, { backgroundColor: C.card }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[font(13, '400'), { color: C.meta, opacity: C.dark ? 0.6 : 1 }]} allowFontScaling numberOfLines={1}>{senderLabel(rec)}</Text>
          <Text style={[font(13, '400'), { color: C.meta, opacity: C.dark ? 0.6 : 1 }]} allowFontScaling>{whenLabel(rec?.at || Date.now())}</Text>
        </View>
        <Bubble C={C} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <Highlighted text={ctx.msg} matches={matches} color={C.ink} size={16} lh={1.4} lit={lit} numberOfLines={8} />
        </Bubble>
        {!off && (
          <Animated.View pointerEvents="none" style={[st.band, { opacity: band.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: band.interpolate({ inputRange: [0, 1], outputRange: [-40, 130] }) }] }]} />
        )}
      </View>

      {/* What is being looked at, ticked off as it goes. Real steps: the rules,
          the link checks, then ScamNet, the model trained on real scam texts. */}
      <View style={[st.list, { backgroundColor: C.card }]}>
        {CHECKS.map((c, i) => {
          const done = step > i, now = step === i;
          return (
            <View key={c.t} style={[st.row, i < CHECKS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep2 }]}>
              <View style={[st.dot, { backgroundColor: done ? T.green : C.dark ? '#2c2c2e' : '#eef4f1' }]}>
                {done ? <Check size={15} color="#fff" strokeWidth={3} /> : now ? <ActivityIndicator size="small" color={T.green} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[font(17, '600'), { color: C.ink, opacity: done || now ? 1 : 0.45 }]} allowFontScaling>{c.t}</Text>
                <Text style={[font(15, '400'), { color: C.ink2, opacity: done || now ? 0.7 : 0.35, marginTop: 1 }]} allowFontScaling>{c.d}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={st.foot}>
        <Lock size={16} color={C.dark ? '#ebebf5' : '#3c3c43'} strokeWidth={2} />
        <Text style={[font(15, '500'), { color: C.dark ? '#ebebf5' : '#3c3c43' }]} allowFontScaling>Checked on this phone. Nothing is sent.</Text>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  icon: { width: 84, height: 84, borderRadius: 21, shadowColor: 'rgba(13,74,59,1)', shadowOpacity: 0.25, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } },
  track: { width: 180, height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 16 },
  bar: { height: '100%', borderRadius: 3, backgroundColor: T.green },
  card: { marginTop: 24, borderRadius: 20, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, top: 0, height: 44, backgroundColor: 'rgba(13,107,87,.12)', borderBottomWidth: 2.5, borderBottomColor: T.green },
  list: { marginTop: 14, borderRadius: 20, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  foot: { marginTop: 'auto', paddingTop: 24, paddingBottom: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
