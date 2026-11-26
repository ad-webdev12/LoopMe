// Animated intro, from the "Loop Me intro" design: three beats, each on its
// own soft stage colour (peach, mint, butter) that fades into the next. The
// scene sits on the colour, the words sit on a white sheet below. The app
// icon glides in from the launch screen's centre to the header on beat 0.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Camera, Check, Flashlight, Lock, TriangleAlert, User, Users } from 'lucide-react-native';
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
      <KFPop duration={550} delay={100} playKey={k} easing={bez(0.2, 1.25, 0.3, 1)} style={{ alignItems: 'center', gap: 12 }}>
        <MiniPhone>
          {/* The text as it arrives... */}
          <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 26, paddingHorizontal: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Image source={APP_ICON} style={{ width: 11, height: 11, borderRadius: 3 }} />
              <Text style={{ fontSize: 7, fontWeight: '700', color: '#000' }} allowFontScaling={false}>Loop Me</Text>
            </View>
            <View style={{ marginTop: 7, backgroundColor: '#f2f2f7', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 6 }}>
              <Text style={{ fontSize: 7.5, lineHeight: 9.75, color: '#000' }} allowFontScaling={false}>USPS: your parcel is on hold. A $1.95 fee is due…</Text>
            </View>
            <View style={{ marginTop: 5, height: 18, borderRadius: 5, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 7.5, fontWeight: '700', color: '#fff' }} allowFontScaling={false}>Check it</Text>
            </View>
          </View>
          {/* ...then the red warning wipes up over it. */}
          <WipeUp k={k} delay={900} style={[st.abs, { left: 0, right: 0, top: 0, bottom: 0, backgroundColor: T.red, paddingTop: 30, paddingHorizontal: 9 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, opacity: 0.9 }}>
              <View style={{ width: 4, height: 4, backgroundColor: '#fff' }} />
              <Text style={{ fontSize: 6, fontWeight: '800', letterSpacing: 1, color: '#fff' }} allowFontScaling={false}>SCAM</Text>
            </View>
            <Text style={{ fontSize: 17, lineHeight: 17, fontWeight: '800', letterSpacing: -0.5, color: '#fff', marginTop: 8 }} allowFontScaling={false}>{'Stop.\nDon’t reply.'}</Text>
            <Text style={{ fontSize: 7.5, lineHeight: 10, fontWeight: '500', color: '#fff', marginTop: 7, opacity: 0.95 }} allowFontScaling={false}>Real USPS never asks for a fee by text.</Text>
            <View style={{ marginTop: 'auto' }}>
              <KFFade duration={300} delay={2400} playKey={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,.3)', alignItems: 'center', justifyContent: 'center' }}><Check size={7} color="#fff" strokeWidth={3} /></View>
                <Text style={{ fontSize: 7, fontWeight: '600', color: '#fff' }} allowFontScaling={false}>Your family was told</Text>
              </KFFade>
              <View style={{ height: 20, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 7.5, fontWeight: '700', color: T.red }} allowFontScaling={false}>Block this number</Text>
              </View>
              <View style={{ height: 18, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,.6)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 7, fontWeight: '600', color: '#fff' }} allowFontScaling={false}>I didn’t reply</Text>
              </View>
            </View>
          </WipeUp>
        </MiniPhone>
        <View style={st.who}><View style={[st.whoDot, { backgroundColor: T.red }]}><User size={13} color="#fff" strokeWidth={2.4} /></View><Text style={st.whoText} allowFontScaling={false}>You</Text></View>
      </KFPop>

      <View style={{ width: 52, height: 20, marginTop: 128 }}>
        <Line k={k} />
        <Dot k={k} />
      </View>

      <KFPop duration={550} delay={350} playKey={k} easing={bez(0.2, 1.25, 0.3, 1)} style={{ alignItems: 'center', gap: 12 }}>
        <MiniPhone>
          {/* Their lock screen: it wakes, and the alert drops in. */}
          <LinearGradient colors={['#47625a', '#2f4a43', '#5b7f74']} locations={[0, 0.5, 1]} style={{ flex: 1, paddingTop: 28, paddingHorizontal: 7, alignItems: 'center' }}>
            <Lock size={8} color="rgba(255,255,255,.85)" strokeWidth={2.6} />
            <Text style={{ fontSize: 7, fontWeight: '500', color: '#fff', opacity: 0.9, marginTop: 4 }} allowFontScaling={false}>Friday, November 14</Text>
            <Text style={{ fontSize: 38, lineHeight: 40, fontWeight: '700', letterSpacing: -1, color: '#fff', marginTop: 1 }} allowFontScaling={false}>9:42</Text>
            <Drop k={k} delay={2100} style={st.notif}>
              <Image source={APP_ICON} style={{ width: 16, height: 16, borderRadius: 4, marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 7, fontWeight: '700', color: '#000' }} allowFontScaling={false}>Loop Me</Text>
                  <Text style={{ fontSize: 7, color: '#3c3c43' }} allowFontScaling={false}>now</Text>
                </View>
                <Text style={{ fontSize: 7, lineHeight: 9, fontWeight: '600', color: '#000', marginTop: 1 }} allowFontScaling={false}>Mom got a scam text</Text>
                <Text style={{ fontSize: 7, lineHeight: 9, color: '#1c1c1e' }} allowFontScaling={false}>She didn’t reply. Tap to call her.</Text>
              </View>
            </Drop>
            <View style={{ marginTop: 'auto', marginBottom: 12, alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 }}>
              <View style={st.lockBtn}><Flashlight size={9} color="#fff" strokeWidth={2.4} /></View>
              <View style={st.lockBtn}><Camera size={9} color="#fff" strokeWidth={2.4} /></View>
            </View>
          </LinearGradient>
          <Wake k={k} delay={1950} />
        </MiniPhone>
        <View style={st.who}><View style={[st.whoDot, { backgroundColor: T.green }]}><Users size={13} color="#fff" strokeWidth={2.4} /></View><Text style={st.whoText} allowFontScaling={false}>Your family</Text></View>
      </KFPop>
    </View>
  );
}

/** A small iPhone: dark bezel, side buttons, island and home bar. */
function MiniPhone({ children }: { children: React.ReactNode }) {
  return (
    <View style={st.phone}>
      <View style={[st.side, { left: -2, top: 64, height: 18 }]} />
      <View style={[st.side, { left: -2, top: 90, height: 30 }]} />
      <View style={[st.side, { right: -2, top: 80, height: 40 }]} />
      <View style={{ flex: 1, borderRadius: 20, overflow: 'hidden' }}>
        {children}
        <View style={st.island} />
        <View style={st.homeBar} />
      </View>
    </View>
  );
}

/** zWipeUp: the warning slides up from the bottom and covers the screen. */
function WipeUp({ k, delay, style, children }: { k: string; delay: number; style?: object; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(motionOff() ? 1 : 0);
    if (motionOff()) return;
    const a = Animated.timing(v, { toValue: 1, duration: 450, delay, easing: bez(0.2, 0.9, 0.2, 1), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [270, 0] }) }] }]}>{children}</Animated.View>;
}

/** zWake: a black screen that fades away as the phone wakes. */
function Wake({ k, delay }: { k: string; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(motionOff() ? 1 : 0);
    if (motionOff()) return;
    const a = Animated.timing(v, { toValue: 1, duration: 350, delay, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View pointerEvents="none" style={[st.abs, { left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} />;
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

  phone: { width: 134, height: 276, padding: 4, borderRadius: 24, backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#3a3a3c', shadowColor: '#0d281e', shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 20 } },
  side: { position: 'absolute', width: 2, borderRadius: 1, backgroundColor: '#2c2c2e' },
  island: { position: 'absolute', top: 5, left: '50%', marginLeft: -21, width: 42, height: 12, borderRadius: 6, backgroundColor: '#000' },
  homeBar: { position: 'absolute', bottom: 4, left: '50%', marginLeft: -22, width: 44, height: 2.5, borderRadius: 2, backgroundColor: '#fff', opacity: 0.9 },
  notif: { marginTop: 12, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start', gap: 5, backgroundColor: 'rgba(245,245,245,.92)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 7, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 4 } },
  lockBtn: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,.28)', alignItems: 'center', justifyContent: 'center' },
  who: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 32, paddingLeft: 4, paddingRight: 12, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  whoDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  whoText: { fontSize: 14, fontWeight: '700', color: '#000' },
  dotHalo: { position: 'absolute', left: -5, top: -5, width: 23, height: 23, borderRadius: 12, backgroundColor: 'rgba(13,107,87,.2)' },
  dotCore: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#fff', borderWidth: 3, borderColor: T.green },

  driftBubble: { backgroundColor: '#fff', borderRadius: 18, borderBottomLeftRadius: 6, paddingVertical: 10, paddingLeft: 13, paddingRight: 86, shadowColor: '#8a5a00', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 8 } },
  driftText: { fontSize: 15, lineHeight: 20, color: '#000' },
  stamp: { position: 'absolute', right: 6, top: '50%', marginTop: -14, height: 28, paddingHorizontal: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stampText: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.8, color: '#fff' },
});
