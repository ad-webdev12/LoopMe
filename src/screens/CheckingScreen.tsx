// Checking a message. A ring fills stage by stage around the app icon while a
// comet circles it and soft ripples breathe out; under it the message is swept
// by a light band, and the engine's real stages light up one by one. Stages
// that don't apply (no link, no sender) are left out. The ring and the last
// stage hold until the real verdict is in.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { highlights } from '../engine/explain';
import { T, font } from '../theme';
import { APP_ICON, Screen, motionOff } from '../ui/base';
import { Bubble, Highlighted, senderLabel, whenLabel } from '../ui/pieces';
import type { Ctx } from '../App';

// The stages the engine really runs, in order. Only the ones that apply to
// this message are shown: no link, no link stage; no sender, no sender stage.
type Stage = { t: string; title: string };
function stagesFor(text: string, sender?: string | null): Stage[] {
  const out: Stage[] = [{ t: 'Unmasking hidden text', title: 'Reading' }];
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|co|io|ly|info|xyz|top|me|us|uk|app|link|site|online)\b)/i.test(text)) out.push({ t: 'Following the links', title: 'Checking links' });
  if (sender && /\d{3,}|@/.test(sender)) out.push({ t: 'Checking the sender', title: 'Checking sender' });
  out.push({ t: 'AI reading the meaning', title: 'Understanding' });
  out.push({ t: 'Weighing it all up', title: 'Deciding' });
  return out;
}

const ACirc = Animated.createAnimatedComponent(Circle);
const R = 76, RING = 2 * Math.PI * R, SIZE = 200;

export default function CheckingScreen({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const rec = ctx.hist.find(h => h.id === ctx.recordId);
  const matches = ctx.verdict ? highlights(ctx.msg, ctx.verdict.level, ctx.verdict.tags || []) : [];
  const off = motionOff();
  const stages = useRef(stagesFor(ctx.msg || '', rec?.sender)).current;
  // Spread across the 3.6 s the app holds this screen; the last stage keeps
  // going until the verdict is shown.
  const STEP_MS = Math.round(3000 / stages.length);

  const prog = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const ripple = useRef([new Animated.Value(0), new Animated.Value(0)]).current;
  const band = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const titleIn = useRef(new Animated.Value(1)).current;
  const rows = useRef(stages.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const pops = useRef(stages.map(() => new Animated.Value(0))).current;
  const [lit, setLit] = useState(-1);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const n = stages.length;
    const loops: Animated.CompositeAnimation[] = [];
    const to = (k: number) => Animated.timing(prog, { toValue: Math.min(0.94, (k + 0.85) / n), duration: STEP_MS - 40, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    to(0);
    if (!off) {
      loops.push(Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })));
      loops.push(Animated.loop(Animated.sequence([Animated.timing(breathe, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), Animated.timing(breathe, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true })])));
      ripple.forEach((r, i) => loops.push(Animated.loop(Animated.sequence([Animated.delay(i * 900), Animated.timing(r, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }), Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: true })]))));
      loops.push(Animated.loop(Animated.timing(band, { toValue: 1, duration: 1500, easing: Easing.bezier(0.45, 0, 0.55, 1), useNativeDriver: true })));
      loops.push(Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })));
      loops.forEach(l => l.start());
    }
    const t = [900, 1300, 1700].map((ms, i) => setTimeout(() => setLit(i), ms));
    const k = stages.slice(1).map((_, i) => setTimeout(() => {
      const next = i + 1;
      Animated.spring(pops[i], { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
      Animated.timing(rows[next], { toValue: 1, duration: off ? 0 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      to(next);
      if (off) { setStep(next); return; }
      Animated.timing(titleIn, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
        setStep(next);
        Animated.timing(titleIn, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      });
    }, STEP_MS * (i + 1)));
    return () => { loops.forEach(l => l.stop()); [...t, ...k].forEach(clearTimeout); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const track = C.dark ? 'rgba(13,107,87,.28)' : '#e3eeea';
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Screen C={C} playKey="checking" scroll style={{ paddingHorizontal: 16 }}>
      <View style={{ alignItems: 'center', paddingTop: 28 }}>
        <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
          {!off && ripple.map((r, i) => (
            <Animated.View key={i} pointerEvents="none" style={[st.ripple, { borderColor: T.green, opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1.12] }) }] }]} />
          ))}
          <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgGrad id="arc" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#3fbf95" />
                <Stop offset="1" stopColor={T.greenDeep} />
              </SvgGrad>
            </Defs>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={track} strokeWidth={8} fill="none" />
            <ACirc cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="url(#arc)" strokeWidth={8} strokeLinecap="round" fill="none"
              strokeDasharray={RING} strokeDashoffset={prog.interpolate({ inputRange: [0, 1], outputRange: [RING, 0] })}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} />
          </Svg>
          {!off && (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ rotate: rot }] }]}>
              <Svg width={SIZE} height={SIZE}>
                <Defs>
                  <SvgGrad id="comet" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={T.green} stopOpacity="0" />
                    <Stop offset="1" stopColor={T.green} stopOpacity="0.9" />
                  </SvgGrad>
                </Defs>
                <Circle cx={SIZE / 2} cy={SIZE / 2} r={R + 14} stroke="url(#comet)" strokeWidth={3} strokeLinecap="round" fill="none" strokeDasharray={`${(R + 14) * 1.3} ${2 * Math.PI * (R + 14)}`} />
                <Circle cx={SIZE / 2 + (R + 14) * Math.cos(1.3)} cy={SIZE / 2 + (R + 14) * Math.sin(1.3)} r={4.5} fill={T.green} />
              </Svg>
            </Animated.View>
          )}
          <Animated.Image source={APP_ICON} style={[st.icon, !off && { transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.04] }) }] }]} />
        </View>
        <Animated.Text accessibilityLiveRegion="polite" allowFontScaling numberOfLines={1} adjustsFontSizeToFit
          style={[font(26, '700', 1.25, -0.5), { color: C.ink, marginTop: 14, height: 34, textAlign: 'center', opacity: titleIn, transform: [{ translateY: titleIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>{stages[step].title}</Animated.Text>
      </View>

      <View style={[st.card, { backgroundColor: C.card }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[font(13, '400'), { color: C.meta, opacity: C.dark ? 0.6 : 1 }]} allowFontScaling numberOfLines={1}>{senderLabel(rec, ctx.howOf(ctx.recordId))}</Text>
          <Text style={[font(13, '400'), { color: C.meta, opacity: C.dark ? 0.6 : 1 }]} allowFontScaling>{whenLabel(rec?.at || Date.now())}</Text>
        </View>
        <Bubble C={C} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <Highlighted text={ctx.msg} matches={matches} color={C.ink} size={16} lh={1.4} lit={lit} numberOfLines={6} />
        </Bubble>
        {!off && (
          <Animated.View pointerEvents="none" style={[st.band, { opacity: band.interpolate({ inputRange: [0, 0.12, 0.88, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: band.interpolate({ inputRange: [0, 1], outputRange: [-60, 170] }) }] }]}>
            <LinearGradient colors={['rgba(13,107,87,0)', 'rgba(13,107,87,.16)']} style={{ flex: 1 }} />
            <View style={{ height: 2, backgroundColor: T.green, shadowColor: T.green, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }} />
          </Animated.View>
        )}
      </View>

      <View style={st.rail}>
        {stages.map((c, i) => {
          const done = step > i, now = step === i;
          return (
            <Animated.View key={c.t} style={[st.row, { backgroundColor: now ? (C.dark ? 'rgba(13,107,87,.22)' : '#eaf5f1') : 'transparent', opacity: rows[i].interpolate({ inputRange: [0, 1], outputRange: [0.32, 1] }), transform: [{ translateX: rows[i].interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] }]}>
              {now && !off && (
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-240, 400] }) }] }]}>
                  <LinearGradient start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} colors={['rgba(255,255,255,0)', C.dark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.75)', 'rgba(255,255,255,0)']} style={{ width: 160, height: '100%' }} />
                </Animated.View>
              )}
              <View style={[st.dot, { backgroundColor: done ? T.green : now ? 'transparent' : C.dark ? '#2c2c2e' : '#e9eeec', borderWidth: now ? 2.5 : 0, borderColor: T.green }]}>
                {done && <Animated.View style={{ transform: [{ scale: pops[i] }] }}><Check size={15} color="#fff" strokeWidth={3.2} /></Animated.View>}
                {now && <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.green, transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] }) }] }} />}
              </View>
              <Text style={[font(18, now ? '700' : '600'), { color: done ? C.ink2 : C.ink, flex: 1 }]} allowFontScaling>{c.t}</Text>
            </Animated.View>
          );
        })}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  icon: { width: 96, height: 96, borderRadius: 24, shadowColor: 'rgba(13,74,59,1)', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  ripple: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2 },
  card: { marginTop: 20, borderRadius: 20, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, top: 0, height: 56 },
  rail: { marginTop: 18, paddingBottom: 40, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14, overflow: 'hidden' },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
