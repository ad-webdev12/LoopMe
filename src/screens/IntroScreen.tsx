// Animated intro, from the "Loop Me intro" design: three beats, each on its
// own soft stage colour (peach, mint, butter) that fades into the next. The
// scene sits on the colour, the words sit on a white sheet below. The app
// icon glides in from the launch screen's centre to the header on beat 0.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Phone, TriangleAlert, User } from 'lucide-react-native';
import { T } from '../theme';
import { APP_ICON, motionOff } from '../ui/base';
import { KFFade, KFPop, KFRise, bez } from '../ui/kf';
import type { Ctx } from '../App';

const STAGE = ['#ffe6da', '#d5ede2', '#fbefcf'];
const ACCENT = ['#c23a17', '#0d6b57', '#8a5a00'];
const BEAT_MS = [5000, 5500, 6000];
const { width: W, height: H } = Dimensions.get('window');
const SHEET_TOP = H - 350;      // the white sheet, 494 on the 844 design frame

export default function IntroScreen({ ctx }: { ctx: Ctx }) {
  const [beat, setBeat] = useState(0);
  const [round, setRound] = useState(0);   // bumps when the loop returns to beat 0, so it replays
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const still = motionOff();

  // The launch screen leaves the icon in the middle of the screen at BIG.
  // It glides to the header, and the first beat starts once it has landed.
  const BIG = 96, SMALL = 42, LEFT = 20, TOP = 66;
  const move = useRef(new Animated.Value(still ? 1 : 0)).current;
  const [landed, setLanded] = useState(still);
  useEffect(() => {
    if (!still) {
      Animated.sequence([
        Animated.delay(350),
        Animated.timing(move, { toValue: 1, duration: 640, easing: Easing.bezier(0.2, 0.9, 0.2, 1), useNativeDriver: true }),
      ]).start(() => setLanded(true));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stage colour: launch green until the icon lands, then the beat's colour.
  const stage = useRef(new Animated.Value(0)).current;
  const [stageFrom, setStageFrom] = useState<string>(T.green);
  const [stageTo, setStageTo] = useState<string>(STAGE[0]);
  useEffect(() => {
    if (!landed) return;
    setStageFrom(stageTo); setStageTo(STAGE[beat]);
    stage.setValue(0);
    Animated.timing(stage, { toValue: 1, duration: 700, easing: bez(0.25, 0.1, 0.25, 1), useNativeDriver: false }).start();
  }, [beat, landed]); // eslint-disable-line react-hooks/exhaustive-deps
  const stageColor = stage.interpolate({ inputRange: [0, 1], outputRange: [stageFrom, stageTo] });

  // Beats auto-advance 5 / 5.5 / 6 seconds; tapping a bar jumps.
  const schedule = (b: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const n = (b + 1) % 3;
      if (n === 0) setRound(r => r + 1);
      setBeat(n); schedule(n);
    }, BEAT_MS[b]);
  };
  useEffect(() => { if (landed) schedule(beat); return () => clearTimeout(timer.current); }, [landed]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (i: number) => { setBeat(i); schedule(i); };
  const start = () => { clearTimeout(timer.current); ctx.go('ob1'); };

  const dx = move.interpolate({ inputRange: [0, 1], outputRange: [0, LEFT + SMALL / 2 - W / 2] });
  const dy = move.interpolate({ inputRange: [0, 1], outputRange: [0, TOP + SMALL / 2 - H / 2] });
  const sc = move.interpolate({ inputRange: [0, 1], outputRange: [1, SMALL / BIG] });
  const key = beat + ':' + round;
  const accent = ACCENT[beat];

  return (
    <Animated.View style={{ flex: 1, backgroundColor: stageColor }}>
      <StatusBar barStyle="dark-content" />
      {landed && (
        <>
          {/* Header wordmark, next to where the icon lands. */}
          <KFFade duration={300} playKey="hdr" style={[st.abs, { left: LEFT + SMALL + 10, top: TOP, height: SMALL, justifyContent: 'center' }]}>
            <Text style={st.wordmark} allowFontScaling={false}>Loop Me</Text>
          </KFFade>

          {beat === 0 && <Beat0 k={key} />}
          {beat === 1 && <Beat1 k={key} />}
          {beat === 2 && <Beat2 k={key} />}

          {/* The white sheet with the words. */}
          <View style={[st.abs, { left: 0, right: 0, top: SHEET_TOP, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32 }]} />
          <View style={[st.abs, { left: 24, right: 24, top: SHEET_TOP + 36, alignItems: 'center' }]}>
            <View style={{ overflow: 'hidden' }}>
              <KFRise duration={600} delay={100} playKey={key} easing={bez(0.2, 0.9, 0.2, 1)}>
                <Text style={st.headline} allowFontScaling>
                  {beat === 0 ? 'Got a text that ' : beat === 1 ? 'Bring family ' : 'Scams come in '}
                  <Text style={{ color: accent }}>{beat === 0 ? 'feels off?' : beat === 1 ? 'into your loop.' : 'every day.'}</Text>
                </Text>
              </KFRise>
            </View>
            <KFRise duration={600} delay={250} playKey={key}>
              <Text style={st.sub} allowFontScaling>
                {beat === 0 ? 'Copy it into Loop Me before you reply or tap a link.'
                  : beat === 1 ? 'If a scam reaches you, someone you trust hears about it on their phone.'
                  : 'Not sure about one? Paste it into Loop Me and get a straight answer in seconds.'}
              </Text>
            </KFRise>
          </View>

          {/* Progress bars and the button. */}
          <View style={[st.abs, { left: 24, right: 24, bottom: 40 }]}>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              {[0, 1, 2].map(i => (
                <Pressable key={i} hitSlop={10} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: accent, opacity: i === beat ? 1 : 0.25 }}
                  onPress={() => pick(i)} accessibilityRole="button" accessibilityLabel={'Screen ' + (i + 1) + ' of 3'} />
              ))}
            </View>
            <Pressable style={({ pressed }) => [st.cta, pressed && { transform: [{ scale: 0.98 }] }]} onPress={start} accessibilityRole="button">
              <Text style={st.ctaText} allowFontScaling>Get started</Text>
              <ArrowRight size={20} color="#fff" strokeWidth={2.4} />
            </Pressable>
          </View>
        </>
      )}

      {/* The icon: glides in from the launch screen, then stays in the header. */}
      <Animated.View pointerEvents="none" style={[st.abs, { left: (W - BIG) / 2, top: (H - BIG) / 2, width: BIG, height: BIG, transform: [{ translateX: dx }, { translateY: dy }, { scale: sc }] }]}>
        <Image source={APP_ICON} style={{ width: BIG, height: BIG, borderRadius: BIG * 0.2237 }} />
      </Animated.View>
    </Animated.View>
  );
}

/* ---------------- Beat 0: a text that feels off ---------------- */
function Beat0({ k }: { k: string }) {
  const [cardH, setCardH] = useState(220);
  return (
    <KFRise duration={550} delay={150} playKey={k} style={[st.abs, { left: 16, right: 16, top: 150 }]}>
      <View style={st.card} onLayout={e => setCardH(e.nativeEvent.layout.height)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 2, marginBottom: 10 }}>
          <View style={st.avatar}><User size={18} color="#8e8e93" strokeWidth={2.2} /></View>
          <View style={{ flex: 1 }}>
            <Text style={st.sender} allowFontScaling={false}>+1 (628) 555-0117</Text>
            <Text style={st.meta} allowFontScaling={false}>Not in your contacts</Text>
          </View>
          <Text style={st.meta} allowFontScaling={false}>9:41</Text>
        </View>
        <View style={st.bubble}>
          <Text style={st.bubbleText} allowFontScaling={false}>
            Grandma, it’s me. I lost my phone. Can you <Hl k={k} delay={1500}>send $400 today</Hl>? <Hl k={k} delay={1850}>Don’t tell anyone</Hl>.
          </Text>
        </View>
        <Band k={k} travel={cardH + 48} />
        <KFPop duration={450} delay={2300} playKey={k} easing={bez(0.2, 1.25, 0.3, 1)} style={st.verdictRow}>
          <View style={st.scamChip}><TriangleAlert size={14} color="#fff" strokeWidth={2.4} /><Text style={st.scamChipText} allowFontScaling={false}>Scam</Text></View>
          <Text style={st.verdictText} allowFontScaling={false}>Stop. Don’t reply.</Text>
        </KFPop>
      </View>
    </KFRise>
  );
}

/** The words that turn red as they are read. */
function Hl({ k, delay, children }: { k: string; delay: number; children: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(motionOff() ? 1 : 0);
    if (motionOff()) return;
    const a = Animated.timing(v, { toValue: 1, duration: 350, delay, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.Text style={{ color: v.interpolate({ inputRange: [0, 1], outputRange: ['#000000', '#8c1f0c'] }), backgroundColor: v.interpolate({ inputRange: [0, 1], outputRange: ['rgba(236,48,19,0)', 'rgba(236,48,19,.14)'] }), borderRadius: 4 }}>
      {children}
    </Animated.Text>
  );
}

/** The reading band that sweeps down the card once. */
function Band({ k, travel }: { k: string; travel: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    if (motionOff()) return;
    const a = Animated.timing(v, { toValue: 1, duration: 1200, delay: 450, easing: bez(0.45, 0, 0.55, 1), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [k, travel]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View pointerEvents="none" style={[st.abs, { left: 0, right: 0, top: -48, height: 48, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) }] }]}>
      <LinearGradient colors={['rgba(13,107,87,0)', 'rgba(13,107,87,.16)']} style={{ flex: 1, borderBottomWidth: 2.5, borderBottomColor: T.green }} />
    </Animated.View>
  );
}

/* ---------------- Beat 1: your phone, their phone ---------------- */
function Beat1({ k }: { k: string }) {
  return (
    <View style={[st.abs, { left: 16, right: 16, top: 140, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start' }]}>
      <KFPop duration={550} delay={100} playKey={k} easing={bez(0.2, 1.25, 0.3, 1)} style={{ alignItems: 'center', gap: 10 }}>
        <View style={st.phone}>
          <View style={st.notch} />
          <View style={st.miniBubble}><Text style={st.miniText} allowFontScaling={false}>USPS: your parcel is on hold. A $1.95 fee is due.</Text></View>
          <KFPop duration={400} delay={1000} playKey={k} easing={bez(0.2, 1.25, 0.3, 1)} style={st.miniFlag}>
            <TriangleAlert size={11} color="#fff" strokeWidth={2.6} />
            <Text style={st.miniFlagText} allowFontScaling={false} numberOfLines={1}>Flagged as a scam</Text>
          </KFPop>
          <KFFade duration={300} delay={1300} playKey={k}>
            <Text style={[st.meta, { fontSize: 10, fontWeight: '500', marginTop: 8 }]} allowFontScaling={false}>You didn’t reply.</Text>
          </KFFade>
        </View>
        <View style={st.who}><View style={[st.whoDot, { borderColor: T.red }]} /><Text style={st.whoText} allowFontScaling={false}>You</Text></View>
      </KFPop>

      <View style={{ width: 58, height: 20, marginTop: 110 }}>
        <Line k={k} />
        <Dot k={k} />
      </View>

      <KFPop duration={550} delay={600} playKey={k} easing={bez(0.2, 1.25, 0.3, 1)} style={{ alignItems: 'center', gap: 10 }}>
        <View style={st.phone}>
          <View style={st.notch} />
          <Text style={st.clock} allowFontScaling={false}>9:42</Text>
          <Drop k={k} delay={2000} style={st.notif}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Image source={APP_ICON} style={{ width: 14, height: 14, borderRadius: 4 }} />
              <Text style={{ fontSize: 9.5, fontWeight: '600', color: '#000' }} allowFontScaling={false}>Loop Me</Text>
              <Text style={{ marginLeft: 'auto', fontSize: 9, color: '#6c6c70' }} allowFontScaling={false}>now</Text>
            </View>
            <Text style={{ fontSize: 10.5, lineHeight: 13.6, fontWeight: '500', color: '#000', marginTop: 4 }} allowFontScaling={false}>Mom got a scam text. She didn’t reply.</Text>
          </Drop>
          <KFFade duration={300} delay={2800} playKey={k} style={st.callBtn}>
            <Phone size={10} color="#fff" strokeWidth={2.6} />
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#fff' }} allowFontScaling={false}>Call Mom</Text>
          </KFFade>
        </View>
        <View style={st.who}><View style={[st.whoDot, { borderColor: T.green }]} /><Text style={st.whoText} allowFontScaling={false}>Your family</Text></View>
      </KFPop>
    </View>
  );
}

/** The line between the two phones, drawn left to right. */
function Line({ k }: { k: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(motionOff() ? 1 : 0);
    if (motionOff()) return;
    const a = Animated.timing(v, { toValue: 1, duration: 500, delay: 400, easing: bez(0.25, 0.1, 0.25, 1), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={[st.abs, { left: 2, right: 2, top: 9, height: 3, borderRadius: 2, backgroundColor: T.green, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-27, 0] }) }, { scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [0.0001, 1] }) }] }]} />;
}

/** The pulse that travels along it, over and over. */
function Dot({ k }: { k: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    if (motionOff()) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1600, delay: 1400, easing: bez(0.45, 0, 0.55, 1), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[st.abs, { left: 0, top: 4, width: 13, height: 13, opacity: v.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 50] }) }] }]}>
      <View style={st.dotHalo} /><View style={st.dotCore} />
    </Animated.View>
  );
}

/** rDrop: opacity 0, translateY -14, scale .96 → settled. */
function Drop({ k, delay, style, children }: { k: string; delay: number; style?: object; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(motionOff() ? 1 : 0);
    if (motionOff()) return;
    const a = Animated.timing(v, { toValue: 1, duration: 500, delay, easing: bez(0.2, 1.25, 0.3, 1), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/* ---------------- Beat 2: scams come in every day ---------------- */
function Beat2({ k }: { k: string }) {
  return (
    <View style={[st.abs, { left: 16, right: 16, top: 130, height: 330, overflow: 'hidden' }]}>
      <Drift k={k} offset={0} side="left" text="USPS: your parcel is on hold. A $1.95 fee is due." stamp="SCAM" color={T.red} />
      <Drift k={k} offset={1 / 3} side="right" text="Grandma, I need help. Please don’t tell anyone." stamp="SCAM" color={T.red} />
      <Drift k={k} offset={2 / 3} side="left" text="Walgreens: your prescription is ready to pick up." stamp="OKAY" color={T.green} />
      <LinearGradient pointerEvents="none" colors={['#fbefcf', 'rgba(251,239,207,0)']} style={[st.abs, { left: 0, right: 0, top: 0, height: 60 }]} />
      <LinearGradient pointerEvents="none" colors={['rgba(251,239,207,0)', '#fbefcf']} style={[st.abs, { left: 0, right: 0, bottom: 0, height: 60 }]} />
    </View>
  );
}

/** A bubble drifting up through the window on a 6s loop, stamped halfway. */
function Drift({ k, offset, side, text, stamp, color }: { k: string; offset: number; side: 'left' | 'right'; text: string; stamp: string; color: string }) {
  const v = useRef(new Animated.Value(offset)).current;
  useEffect(() => {
    if (motionOff()) { v.setValue(0.5); return; }
    v.setValue(offset);
    let loop: Animated.CompositeAnimation | undefined;
    const first = Animated.timing(v, { toValue: 1, duration: (1 - offset) * 6000, easing: Easing.linear, useNativeDriver: true });
    first.start(({ finished }) => {
      if (!finished) return;
      v.setValue(0);
      loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }));
      loop.start();
    });
    return () => { first.stop(); loop?.stop(); };
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[st.abs, { top: 135, width: 250, [side]: 12, opacity: v.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [190, -190] }) }] }]}>
      <View style={st.driftBubble}><Text style={st.driftText} allowFontScaling={false}>{text}</Text></View>
      <Animated.View style={[st.stamp, { backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 0.46, 0.5, 1], outputRange: [0, 0, 1, 1] }), transform: [
        { scale: v.interpolate({ inputRange: [0, 0.46, 0.5, 0.52, 1], outputRange: [2.2, 2.2, 0.95, 1, 1] }) },
        { rotate: v.interpolate({ inputRange: [0, 0.46, 0.5, 1], outputRange: ['-14deg', '-14deg', '-7deg', '-7deg'] }) },
      ] }]}>
        <Text style={st.stampText} allowFontScaling={false}>{stamp}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  abs: { position: 'absolute' },
  wordmark: { fontSize: 18, fontWeight: '800', color: '#000' },
  headline: { fontSize: 32, lineHeight: 34, fontWeight: '800', letterSpacing: -1, color: '#000', textAlign: 'center' },
  sub: { fontSize: 17, lineHeight: 24.5, color: '#3c3c43', marginTop: 10, textAlign: 'center' },
  cta: { height: 56, borderRadius: 16, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 24, padding: 16, overflow: 'hidden', shadowColor: '#963214', shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 18 } },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e9e9eb', alignItems: 'center', justifyContent: 'center' },
  sender: { fontSize: 14.5, fontWeight: '600', color: '#000' },
  meta: { fontSize: 12, color: '#6c6c70' },
  bubble: { backgroundColor: '#e9e9eb', borderRadius: 18, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 11 },
  bubbleText: { fontSize: 17, lineHeight: 23.5, color: '#000' },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#fdece6' },
  scamChip: { height: 30, paddingHorizontal: 12, borderRadius: 9, backgroundColor: T.red, flexDirection: 'row', alignItems: 'center', gap: 6 },
  scamChipText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  verdictText: { fontSize: 17, fontWeight: '700', color: '#8c1f0c' },

  phone: { width: 136, height: 240, borderWidth: 2.5, borderColor: '#1b1b1b', borderRadius: 28, backgroundColor: '#fff', paddingTop: 24, paddingHorizontal: 9, paddingBottom: 10, overflow: 'hidden', shadowColor: '#0d4a3b', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 18 } },
  notch: { position: 'absolute', top: 7, left: 46, width: 40, height: 9, borderRadius: 5, backgroundColor: '#1b1b1b' },
  miniBubble: { backgroundColor: '#e9e9eb', borderRadius: 12, borderBottomLeftRadius: 4, paddingVertical: 6, paddingHorizontal: 8 },
  miniText: { fontSize: 11, lineHeight: 14.3, color: '#000' },
  miniFlag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: T.red, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 6 },
  miniFlagText: { fontSize: 9, fontWeight: '700', color: '#fff', flexShrink: 1, letterSpacing: -0.1 },
  clock: { fontSize: 24, fontWeight: '600', color: '#000', textAlign: 'center', marginTop: 4 },
  notif: { marginTop: 12, backgroundColor: 'rgba(242,242,247,.96)', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
  callBtn: { marginTop: 7, height: 26, borderRadius: 13, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 34, paddingLeft: 4, paddingRight: 12, borderRadius: 17, backgroundColor: '#fff' },
  whoDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, backgroundColor: '#e3e3e8' },
  whoText: { fontSize: 14.5, fontWeight: '700', color: '#000' },
  dotHalo: { position: 'absolute', left: -5, top: -5, width: 23, height: 23, borderRadius: 12, backgroundColor: 'rgba(13,107,87,.2)' },
  dotCore: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#fff', borderWidth: 3, borderColor: T.green },

  driftBubble: { backgroundColor: '#fff', borderRadius: 18, borderBottomLeftRadius: 6, paddingVertical: 10, paddingLeft: 13, paddingRight: 86, shadowColor: '#8a5a00', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 8 } },
  driftText: { fontSize: 15, lineHeight: 20, color: '#000' },
  stamp: { position: 'absolute', right: 6, top: '50%', marginTop: -14, height: 28, paddingHorizontal: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stampText: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.8, color: '#fff' },
});
