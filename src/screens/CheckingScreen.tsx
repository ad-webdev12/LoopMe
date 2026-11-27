// Checking a message: the message under a scan band, and the engine's real
// stages ticking down a rail. Stages that don't apply (no link, no sender)
// are left out. The last stage holds until the real verdict is in.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
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
  const out: Stage[] = [{ t: 'Unmasking hidden text', title: 'Reading the message' }];
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|co|io|ly|info|xyz|top|me|us|uk|app|link|site|online)\b)/i.test(text)) out.push({ t: 'Following the links', title: 'Checking where links go' });
  if (sender && /\d{3,}|@/.test(sender)) out.push({ t: 'Checking the sender', title: 'Looking at who sent it' });
  out.push({ t: 'AI reading the meaning', title: 'Understanding what it asks' });
  out.push({ t: 'Weighing it all up', title: 'Deciding' });
  return out;
}

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
  const stages = useRef(stagesFor(ctx.msg || '', rec?.sender)).current;
  const STEP_MS = 620;

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
    // The last stage holds until the real verdict arrives and this screen closes.
    const k = stages.slice(1).map((_, i) => setTimeout(() => {
      if (off) { setStep(i + 1); return; }
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setStep(i + 1);
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, STEP_MS * (i + 1)));
    return () => { loops.forEach(l => l.stop()); [...t, ...k].forEach(clearTimeout); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen C={C} playKey="checking" scroll style={{ paddingHorizontal: 16 }}>
      <View style={{ alignItems: 'center', paddingTop: 44 }}>
        <Animated.Image source={APP_ICON} style={[st.icon, !off && { transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }]} />
        <Animated.Text style={[font(24, '700', 1.33, -0.4), { color: C.ink, marginTop: 24, textAlign: 'center', opacity: fade }]} allowFontScaling accessibilityLiveRegion="polite">{stages[step].title}</Animated.Text>
        <View style={[st.track, { backgroundColor: C.dark ? 'rgba(13,107,87,.3)' : '#dfe9e5' }]}>
          <Animated.View style={[st.bar, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </View>

      <View style={[st.card, { backgroundColor: C.card }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[font(13, '400'), { color: C.meta, opacity: C.dark ? 0.6 : 1 }]} allowFontScaling numberOfLines={1}>{senderLabel(rec, ctx.howOf(ctx.recordId))}</Text>
          <Text style={[font(13, '400'), { color: C.meta, opacity: C.dark ? 0.6 : 1 }]} allowFontScaling>{whenLabel(rec?.at || Date.now())}</Text>
        </View>
        <Bubble C={C} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <Highlighted text={ctx.msg} matches={matches} color={C.ink} size={16} lh={1.4} lit={lit} numberOfLines={8} />
        </Bubble>
        {!off && (
          <Animated.View pointerEvents="none" style={[st.band, { opacity: band.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: band.interpolate({ inputRange: [0, 1], outputRange: [-40, 130] }) }] }]} />
        )}
      </View>

      <View style={st.rail}>
        {stages.map((c, i) => {
          const done = step > i, now = step === i;
          return (
            <View key={c.t} style={st.row}>
              <View style={{ alignItems: 'center', width: 28 }}>
                <View style={[st.dot, { backgroundColor: done ? T.green : now ? (C.dark ? 'rgba(13,107,87,.35)' : '#dff0ea') : C.dark ? '#2c2c2e' : '#eef1f0' }]}>
                  {done ? <Check size={15} color="#fff" strokeWidth={3} /> : now ? <ActivityIndicator size="small" color={T.green} /> : null}
                </View>
                {i < stages.length - 1 && <View style={[st.line, { backgroundColor: done ? T.green : C.dark ? '#2c2c2e' : '#e3e8e6' }]} />}
              </View>
              <Text style={[font(18, now ? '700' : '600'), { color: C.ink, opacity: done || now ? 1 : 0.35, paddingTop: 3 }]} allowFontScaling>{c.t}</Text>
            </View>
          );
        })}
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
  rail: { marginTop: 26, paddingHorizontal: 10, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  line: { width: 2, height: 22, borderRadius: 1, marginVertical: 3 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
