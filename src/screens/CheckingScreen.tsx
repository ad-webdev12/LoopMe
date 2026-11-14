// Checking a message (2.8 s). Ripples, a ring that fills once over 2.6 s, the
// breathing app icon, a scan band over the message, phrases lighting up at
// 900/1300/1700 ms, three checklist ticks at 700/1400/2100 ms. The rules and
// the model run underneath (App.check); this screen only shows the time.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Check } from 'lucide-react-native';
import { T, font } from '../theme';
import { APP_ICON, Screen, motionOff } from '../ui/base';
import { Bubble, Highlighted, senderLabel, whenLabel } from '../ui/pieces';
import type { Ctx } from '../App';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const R = 56, CIRC = 2 * Math.PI * R;

export default function CheckingScreen({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const rec = ctx.hist.find(h => h.id === ctx.recordId);
  const matches = ctx.verdict?.matches || [];
  const off = motionOff();

  const fill = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const band = useRef(new Animated.Value(0)).current;
  const [lit, setLit] = useState(-1);
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];
    Animated.timing(fill, { toValue: 1, duration: 2600, delay: 150, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }).start();
    if (!off) {
      const ripple = (v: Animated.Value, delay: number) => Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: 2000, easing: Easing.bezier(0.2, 0.6, 0.3, 1), useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })]));
      loops.push(ripple(r1, 0), ripple(r2, 1000));
      loops.push(Animated.loop(Animated.sequence([Animated.timing(breathe, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), Animated.timing(breathe, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })])));
      loops.push(Animated.loop(Animated.timing(band, { toValue: 1, duration: 1400, easing: Easing.bezier(0.45, 0, 0.55, 1), useNativeDriver: true })));
      loops.forEach(l => l.start());
    }
    const t = [900, 1300, 1700].map((ms, i) => setTimeout(() => setLit(i), ms));
    const k = [700, 1400, 2100].map((ms, i) => setTimeout(() => setTicks(i + 1), ms));
    return () => { loops.forEach(l => l.stop()); [...t, ...k].forEach(clearTimeout); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rippleStyle = (v: Animated.Value) => ({
    position: 'absolute' as const, left: 10, right: 10, top: 10, bottom: 10, borderRadius: 52, backgroundColor: 'rgba(13,107,87,.14)',
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.55] }) }],
  });

  return (
    <Screen C={C} playKey="checking" scroll style={{ paddingHorizontal: 16 }}>
      <View style={{ alignItems: 'center', paddingTop: 34 }}>
        <View style={{ width: 124, height: 124, alignItems: 'center', justifyContent: 'center', marginTop: -14 }}>
          {!off && <Animated.View style={rippleStyle(r1)} />}
          {!off && <Animated.View style={rippleStyle(r2)} />}
          <Svg width={124} height={124} viewBox="0 0 124 124" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={62} cy={62} r={R} fill="none" stroke={T.ringTrack} strokeWidth={4} />
            <AnimatedCircle cx={62} cy={62} r={R} fill="none" stroke={T.green} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${CIRC}`}
              strokeDashoffset={fill.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] })} />
          </Svg>
          <Animated.Image source={APP_ICON} style={[st.icon, !off && { transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }]} />
        </View>
        <Text style={[font(26, '700'), { color: C.ink, marginTop: 22 }]} allowFontScaling>Checking this message</Text>
        <Text style={[font(16, '400'), { color: C.ink2, marginTop: 6 }]} allowFontScaling>This takes a couple of seconds.</Text>
      </View>

      <View style={[st.card, { backgroundColor: C.card }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[font(13, '400'), { color: C.meta }]} allowFontScaling numberOfLines={1}>{senderLabel(rec)}</Text>
          <Text style={[font(13, '400'), { color: C.meta }]} allowFontScaling>{whenLabel(rec?.at || Date.now())}</Text>
        </View>
        <Bubble C={C} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <Highlighted text={ctx.msg} matches={matches} color={C.ink} size={16} lh={1.4} lit={lit} numberOfLines={8} />
        </Bubble>
        {!off && (
          <Animated.View pointerEvents="none" style={[st.band, { opacity: band.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: band.interpolate({ inputRange: [0, 1], outputRange: [-40, 130] }) }] }]} />
        )}
      </View>

      <View style={[st.list, { backgroundColor: C.card }]}>
        {['Reading the words', 'Checking the number and any links', 'Comparing with scams we know'].map((t, i) => (
          <View key={t} style={[st.row, i < 2 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep2 }]}>
            <Tick done={ticks > i} />
            <Text style={[font(17, '500'), { color: C.ink }]} allowFontScaling>{t}</Text>
          </View>
        ))}
      </View>

    </Screen>
  );
}

function Tick({ done }: { done: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }));
    if (!motionOff()) l.start();
    return () => l.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (done) Animated.timing(pop, { toValue: 1, duration: 300, easing: Easing.bezier(0.2, 1.4, 0.4, 1), useNativeDriver: true }).start();
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ width: 24, height: 24 }}>
      {!done && <Animated.View style={[st.spinner, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />}
      {done && (
        <Animated.View style={[st.tick, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}>
          <Check size={14} color="#fff" strokeWidth={3} />
        </Animated.View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  icon: { width: 80, height: 80, borderRadius: 20, shadowColor: 'rgba(13,74,59,1)', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  card: { marginTop: 24, borderRadius: 20, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, top: 0, height: 44, backgroundColor: 'rgba(13,107,87,.08)', borderBottomWidth: 2.5, borderBottomColor: T.green },
  list: { marginTop: 12, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  spinner: { width: 24, height: 24, borderRadius: 12, borderWidth: 2.5, borderColor: T.iosGrey2, borderTopColor: T.green },
  tick: { width: 24, height: 24, borderRadius: 12, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
});
