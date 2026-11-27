// Interactive mini tutorials: a drawn phone, one short caption per step, a
// finger that shows where to tap. Steps advance on their own; tap the phone
// or the arrows to move yourself. Everything is drawn, nothing is a picture,
// so it always matches the real app.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, Plus, ClipboardPaste, Camera, Phone, Send, Check, ArrowRight, Mic, Keyboard } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { T, font, Palette } from '../theme';
import { APP_ICON, motionOff } from './base';

export type Step = { caption: string; scene: (p: SceneProps) => React.ReactNode };
type SceneProps = { C: Palette; t: Animated.Value };

const STEP_MS = 3400;
const W = 250, H = 440;

export function Tutorial({ C, steps, onDone }: { C: Palette; steps: Step[]; onDone?: () => void }) {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const t = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    t.setValue(0);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    const run = Animated.timing(t, { toValue: 1, duration: motionOff() ? 1 : STEP_MS - 400, easing: Easing.linear, useNativeDriver: true });
    run.start();
    if (!auto) return () => run.stop();
    const id = setTimeout(() => setI(n => (n + 1) % steps.length), STEP_MS);
    return () => { run.stop(); clearTimeout(id); };
  }, [i, auto]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (n: number) => {
    Haptics.selectionAsync().catch(() => {});
    setAuto(false);
    if (n >= steps.length) { onDone ? onDone() : setI(0); return; }
    setI(Math.max(0, n));
  };

  const step = steps[i];
  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable onPress={() => goTo(i + 1)} accessibilityRole="button" accessibilityLabel={'Step ' + (i + 1) + ' of ' + steps.length + ': ' + step.caption + '. Tap for the next step.'}>
        <View style={[st.phone, { backgroundColor: C.dark ? '#0b0b0c' : '#fff', borderColor: C.dark ? '#3a3a3c' : '#d1d1d6' }]}>
          <Animated.View style={{ flex: 1, opacity: fade }}>{step.scene({ C, t })}</Animated.View>
        </View>
      </Pressable>
      <Animated.Text style={[font(24, '700', 1.2, -0.4), { color: C.ink, textAlign: 'center', marginTop: 22, opacity: fade, paddingHorizontal: 24 }]} allowFontScaling accessibilityLiveRegion="polite">{step.caption}</Animated.Text>
      <View style={st.nav}>
        <Pressable onPress={() => goTo(i - 1)} disabled={i === 0} hitSlop={10} style={[st.arrow, { backgroundColor: C.card, opacity: i === 0 ? 0.35 : 1 }]} accessibilityRole="button" accessibilityLabel="Previous step"><ChevronLeft size={22} color={C.ink} strokeWidth={2.2} /></Pressable>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {steps.map((_, k) => <View key={k} style={[st.dot, { width: k === i ? 22 : 7, backgroundColor: k === i ? T.green : C.dark ? '#3a3a3c' : '#d1d1d6' }]} />)}
        </View>
        <Pressable onPress={() => goTo(i + 1)} hitSlop={10} style={[st.arrow, { backgroundColor: T.green }]} accessibilityRole="button" accessibilityLabel={i === steps.length - 1 ? 'Done' : 'Next step'}>
          {i === steps.length - 1 && onDone ? <Check size={22} color="#fff" strokeWidth={2.4} /> : <ChevronRight size={22} color="#fff" strokeWidth={2.2} />}
        </Pressable>
      </View>
    </View>
  );
}

// ---------- drawing pieces ----------

/** A finger: fades in at (x, y), presses (ripple) around t = at. */
function Finger({ t, x, y, at = 0.35, hold }: { t: Animated.Value; x: number; y: number; at?: number; hold?: boolean }) {
  const a = Math.max(0.01, at - 0.15), b = Math.min(0.98, at + (hold ? 0.3 : 0.08));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - 22, top: y - 22, width: 44, height: 44 }}>
      <Animated.View style={[st.ripple, { opacity: t.interpolate({ inputRange: [0, at, b, Math.min(0.99, b + 0.15)], outputRange: [0, 0.55, 0.3, 0], extrapolate: 'clamp' }), transform: [{ scale: t.interpolate({ inputRange: [0, at, Math.min(0.99, b + 0.15)], outputRange: [0.4, 0.6, 1.6], extrapolate: 'clamp' }) }] }]} />
      <Animated.View style={[st.finger, { opacity: t.interpolate({ inputRange: [0, a, at, 0.9, 1], outputRange: [0, 1, 1, 1, 0.6], extrapolate: 'clamp' }), transform: [{ scale: t.interpolate({ inputRange: [0, a, at, b, Math.min(0.99, b + 0.05)], outputRange: [1.3, 1.1, 0.82, 0.82, 1], extrapolate: 'clamp' }) }] }]} />
    </View>
  );
}

const appear = (t: Animated.Value, at: number, dy = 14) => ({
  opacity: t.interpolate({ inputRange: [0, at, Math.min(0.99, at + 0.1)], outputRange: [0, 0, 1], extrapolate: 'clamp' }),
  transform: [{ translateY: t.interpolate({ inputRange: [0, at, Math.min(0.99, at + 0.12)], outputRange: [dy, dy, 0], extrapolate: 'clamp' }) }],
});

function MsgHeader({ C }: { C: Palette }) {
  return (
    <View style={[st.msgHead, { borderBottomColor: C.dark ? '#2c2c2e' : '#e5e5ea' }]}>
      <View style={[st.av, { backgroundColor: '#a1a1a6' }]}><Text style={[font(13, '600'), { color: '#fff' }]}>?</Text></View>
      <Text style={[font(11, '500'), { color: C.ink, marginTop: 3 }]}>+1 (833) 555-0142</Text>
    </View>
  );
}

function ScamBubble({ C, style }: { C: Palette; style?: object }) {
  return (
    <View style={[st.inBubble, { backgroundColor: C.dark ? '#262628' : '#e9e9eb' }, style]}>
      <Text style={[font(13, '400', 1.3), { color: C.ink }]}>USPS: Your parcel is on hold. Pay $1.99 now: usps-redeliver.top</Text>
    </View>
  );
}

function InputBar({ C, plusHot }: { C: Palette; plusHot?: boolean }) {
  return (
    <View style={st.inputBar}>
      <View style={[st.plus, { backgroundColor: plusHot ? T.green : C.dark ? '#2c2c2e' : '#e9e9eb' }]}><Plus size={16} color={plusHot ? '#fff' : C.ink} strokeWidth={2.4} /></View>
      <View style={[st.field, { borderColor: C.dark ? '#3a3a3c' : '#d1d1d6' }]}><Text style={[font(12, '400'), { color: '#8e8e93' }]}>iMessage</Text></View>
    </View>
  );
}

function Drawer({ C, children, t, at = 0 }: { C: Palette; children: React.ReactNode; t?: Animated.Value; at?: number }) {
  const slide = t ? { transform: [{ translateY: t.interpolate({ inputRange: [0, at, Math.min(0.99, at + 0.14)], outputRange: [230, 230, 0], extrapolate: 'clamp' }) }] } : null;
  return <Animated.View style={[st.drawer, { backgroundColor: C.dark ? '#1c1c1e' : '#f7f7f5' }, slide]}><View style={st.grab} />{children}</Animated.View>;
}

function Verdict({ color, title, sub, t, at }: { color: string; title: string; sub: string; t: Animated.Value; at: number }) {
  return (
    <Animated.View style={[st.verdict, { backgroundColor: color }, appear(t, at, 30)]}>
      <Text style={[font(26, '800', 1.05, -0.5), { color: '#fff' }]}>{title}</Text>
      <Text style={[font(13, '500', 1.3), { color: 'rgba(255,255,255,.9)', marginTop: 4 }]}>{sub}</Text>
    </Animated.View>
  );
}

function Chip({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <View style={[st.chip, { backgroundColor: bg }]}><Text style={[font(13, '700'), { color }]}>{label}</Text></View>;
}

// ---------- the Messages drawer tutorial ----------

export const DRAWER_STEPS: Step[] = [
  {
    caption: 'Press and hold the text',
    scene: ({ C, t }) => (
      <View style={{ flex: 1 }}>
        <MsgHeader C={C} />
        <Animated.View style={{ transform: [{ scale: t.interpolate({ inputRange: [0, 0.35, 0.6, 1], outputRange: [1, 1, 0.96, 0.96], extrapolate: 'clamp' }) }] }}><ScamBubble C={C} /></Animated.View>
        <Animated.View style={[st.menu, { backgroundColor: C.dark ? '#2c2c2e' : '#fff' }, appear(t, 0.6, 6)]}>
          {['Reply', 'Copy', 'Translate'].map((m, k) => <Text key={m} style={[font(13, k === 1 ? '700' : '400'), { color: C.ink, paddingVertical: 7, paddingHorizontal: 12, borderTopWidth: k ? StyleSheet.hairlineWidth : 0, borderTopColor: '#c6c6c8' }]}>{m}</Text>)}
        </Animated.View>
        <Finger t={t} x={110} y={98} at={0.3} hold />
        <View style={{ flex: 1 }} /><InputBar C={C} />
      </View>
    ),
  },
  {
    caption: 'Tap Copy',
    scene: ({ C, t }) => (
      <View style={{ flex: 1 }}>
        <MsgHeader C={C} />
        <ScamBubble C={C} style={{ transform: [{ scale: 0.96 }] }} />
        <View style={[st.menu, { backgroundColor: C.dark ? '#2c2c2e' : '#fff' }]}>
          {['Reply', 'Copy', 'Translate'].map((m, k) => (
            <Animated.Text key={m} style={[font(13, k === 1 ? '700' : '400'), { color: C.ink, paddingVertical: 7, paddingHorizontal: 12, borderTopWidth: k ? StyleSheet.hairlineWidth : 0, borderTopColor: '#c6c6c8' }, k === 1 && { backgroundColor: t.interpolate({ inputRange: [0, 0.4, 0.5], outputRange: ['rgba(13,107,87,0)', 'rgba(13,107,87,0)', 'rgba(13,107,87,.18)'], extrapolate: 'clamp' }) as unknown as string }]}>{m}</Animated.Text>
          ))}
        </View>
        <Finger t={t} x={58} y={216} at={0.4} />
        <View style={{ flex: 1 }} /><InputBar C={C} />
      </View>
    ),
  },
  {
    caption: 'Tap + next to the typing box',
    scene: ({ C, t }) => (
      <View style={{ flex: 1 }}>
        <MsgHeader C={C} />
        <ScamBubble C={C} />
        <View style={{ flex: 1 }} />
        <InputBar C={C} plusHot />
        <Finger t={t} x={27} y={H - 34} at={0.4} />
      </View>
    ),
  },
  {
    caption: 'Tap Loop Me',
    scene: ({ C, t }) => (
      <View style={{ flex: 1 }}>
        <MsgHeader C={C} />
        <ScamBubble C={C} />
        <View style={{ flex: 1 }} />
        <Animated.View style={[st.appList, { backgroundColor: C.dark ? '#1c1c1e' : '#f2f2f7' }, appear(t, 0.02, 40)]}>
          {[['Camera', '#8e8e93'], ['Photos', '#ff9f0a'], ['Loop Me', ''], ['Stickers', '#5e5ce6']].map(([n, c]) => (
            <View key={n} style={st.appRow}>
              {n === 'Loop Me' ? <Image source={APP_ICON} style={st.appIco} /> : <View style={[st.appIco, { backgroundColor: c }]} />}
              <Text style={[font(13, n === 'Loop Me' ? '700' : '400'), { color: C.ink }]}>{n}</Text>
            </View>
          ))}
        </Animated.View>
        <Finger t={t} x={60} y={H - 92} at={0.45} />
      </View>
    ),
  },
  {
    caption: 'Tap Paste',
    scene: ({ C, t }) => (
      <View style={{ flex: 1 }}>
        <MsgHeader C={C} />
        <ScamBubble C={C} />
        <Drawer C={C}>
          <View style={{ alignItems: 'center' }}>
            <Image source={APP_ICON} style={{ width: 30, height: 30, borderRadius: 8 }} />
            <Text style={[font(16, '800', 1.15), { color: C.ink, marginTop: 8, textAlign: 'center' }]}>Not sure about this text?</Text>
          </View>
          <View style={[st.paste, { marginTop: 18 }]}><ClipboardPaste size={16} color="#fff" strokeWidth={2.2} /><Text style={[font(15, '700'), { color: '#fff' }]}>Paste</Text></View>
        </Drawer>
        <Finger t={t} x={W / 2} y={H - 52} at={0.4} />
      </View>
    ),
  },
  {
    caption: 'Get a clear answer',
    scene: ({ C, t }) => (
      <View style={{ flex: 1 }}>
        <MsgHeader C={C} />
        <ScamBubble C={C} />
        <View style={{ flex: 1 }} />
        <Verdict color={T.red} title="Scam" sub="A fake delivery fee. USPS doesn’t text for money." t={t} at={0.08} />
        <Animated.View style={[{ flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingBottom: 12, marginTop: -2 }, appear(t, 0.3, 8)]}>
          <Chip label="Why?" bg="#fff" color={T.redText} /><Chip label="Done" bg={C.dark ? '#3a3a3c' : '#e5e5ea'} color={C.ink} />
        </Animated.View>
      </View>
    ),
  },
  {
    caption: 'Ask family in one tap',
    scene: ({ C, t }) => (
      <View style={{ flex: 1 }}>
        <MsgHeader C={C} />
        <View style={{ flex: 1 }} />
        <Drawer C={C}>
          <Text style={[font(16, '800'), { color: C.ink }]}>Be careful</Text>
          <View style={[st.askBtn, { backgroundColor: T.amber }]}><Send size={14} color="#fff" strokeWidth={2.2} /><Text style={[font(14, '700'), { color: '#fff' }]}>Ask Anna</Text></View>
          <Animated.View style={[st.reply, { backgroundColor: C.dark ? '#2c2c2e' : '#fff' }, appear(t, 0.5, 10)]}>
            <Text style={[font(11, '600'), { color: T.green }]}>Anna replied</Text>
            <Text style={[font(13, '500', 1.25), { color: C.ink, marginTop: 2 }]}>It’s a scam. Don’t tap the link.</Text>
          </Animated.View>
          <Animated.View style={[{ flexDirection: 'row', gap: 6, marginTop: 8 }, appear(t, 0.62, 6)]}>
            <View style={[st.callBtn, { backgroundColor: C.greenTint }]}><Phone size={13} color={T.green} strokeWidth={2.2} /><Text style={[font(13, '700'), { color: T.green }]}>Call Anna</Text></View>
          </Animated.View>
        </Drawer>
        <Finger t={t} x={W / 2} y={H - 150} at={0.25} />
      </View>
    ),
  },
];

// ---------- the in-app tutorial ----------

export const APP_STEPS: Step[] = [
  {
    caption: 'Copy the text, then tap Check',
    scene: ({ C, t }) => (
      <View style={{ flex: 1, backgroundColor: C.dark ? '#000' : '#f2f2f7' }}>
        <View style={[st.homeCard, { backgroundColor: T.green, flex: 1 }]}>
          <Image source={APP_ICON} style={{ width: 24, height: 24, borderRadius: 6 }} />
          <Text style={[font(22, '800', 1.05, -0.5), { color: '#fff', marginTop: 16 }]}>Not sure about a text?</Text>
          <Animated.View style={appear(t, 0.05, 10)}>
            <Text style={[font(11, '600'), { color: '#fff', marginTop: 14, marginBottom: 4 }]}>You copied this</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 9 }}><Text style={[font(12, '400', 1.3), { color: '#000' }]} numberOfLines={3}>USPS: Your parcel is on hold. Pay $1.99 now…</Text></View>
          </Animated.View>
          <View style={[st.homeBtn, { marginTop: 14 }]}><Text style={[font(14, '700'), { color: T.greenDeep }]}>Check this message</Text><View style={st.homeArrow}><ArrowRight size={14} color="#fff" strokeWidth={2.4} /></View></View>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            {[[Camera, 'Photo'], [Mic, 'Say it'], [Keyboard, 'Type it']].map(([I, l]) => { const Icon = I as typeof Camera; return (
              <View key={l as string} style={{ flex: 1, alignItems: 'center', gap: 4 }}><Icon size={16} color="#fff" strokeWidth={2} /><Text style={[font(10, '600'), { color: '#fff' }]}>{l as string}</Text></View>
            ); })}
          </View>
        </View>
        <Finger t={t} x={W / 2 - 10} y={252} at={0.5} />
      </View>
    ),
  },
  {
    caption: 'Or take a photo, say it, or type it',
    scene: ({ C, t }) => (
      <View style={{ flex: 1, backgroundColor: C.dark ? '#000' : '#f2f2f7' }}>
        <View style={[st.homeCard, { backgroundColor: T.green, flex: 1, justifyContent: 'flex-end' }]}>
          <View style={[st.homeBtn]}><Text style={[font(14, '700'), { color: T.greenDeep }]}>Check a message</Text><View style={st.homeArrow}><ArrowRight size={14} color="#fff" strokeWidth={2.4} /></View></View>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            {[[Camera, 'Photo'], [Mic, 'Say it'], [Keyboard, 'Type it']].map(([I, l], k) => { const Icon = I as typeof Camera; return (
              <Animated.View key={l as string} style={[{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 8, borderRadius: 12 }, { backgroundColor: t.interpolate({ inputRange: [0, 0.15 + k * 0.25, 0.25 + k * 0.25, 0.35 + k * 0.25], outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,.25)', 'rgba(255,255,255,0)'], extrapolate: 'clamp' }) as unknown as string }]}>
                <Icon size={20} color="#fff" strokeWidth={2} /><Text style={[font(11, '600'), { color: '#fff' }]}>{l as string}</Text>
              </Animated.View>
            ); })}
          </View>
        </View>
      </View>
    ),
  },
  {
    caption: 'It checks right on your phone',
    scene: ({ C, t }) => (
      <View style={{ flex: 1, backgroundColor: C.dark ? '#000' : '#f2f2f7', padding: 16 }}>
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Animated.Image source={APP_ICON} style={{ width: 54, height: 54, borderRadius: 14, transform: [{ scale: t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 1.06, 1, 1.06, 1] }) }] }} />
        </View>
        <View style={{ marginTop: 24, gap: 10 }}>
          {['Unmasking hidden text', 'Following the links', 'AI reading the meaning', 'Weighing it all up'].map((s, k) => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Animated.View style={[st.tick, { opacity: t.interpolate({ inputRange: [0, 0.12 + k * 0.18, 0.2 + k * 0.18], outputRange: [0.25, 0.25, 1], extrapolate: 'clamp' }) }]}><Check size={11} color="#fff" strokeWidth={3} /></Animated.View>
              <Text style={[font(14, '600'), { color: C.ink }]}>{s}</Text>
            </View>
          ))}
        </View>
      </View>
    ),
  },
  {
    caption: 'Red, amber or green',
    scene: ({ C, t }) => (
      <View style={{ flex: 1, backgroundColor: C.dark ? '#000' : '#f2f2f7', padding: 10, gap: 8, justifyContent: 'center' }}>
        {[[T.red, 'Scam', 'Don’t reply or tap'], [T.amber, 'Be careful', 'Check before you act'], [T.green, 'Looks okay', 'Nothing worrying']].map(([c, a, b], k) => (
          <Animated.View key={a} style={[st.verdictSm, { backgroundColor: c }, appear(t, 0.05 + k * 0.17, 20)]}>
            <Text style={[font(20, '800'), { color: '#fff' }]}>{a}</Text>
            <Text style={[font(13, '500'), { color: 'rgba(255,255,255,.9)' }]}>{b}</Text>
          </Animated.View>
        ))}
      </View>
    ),
  },
  {
    caption: 'Ask family or call them',
    scene: ({ C, t }) => (
      <View style={{ flex: 1, backgroundColor: C.dark ? '#000' : '#f2f2f7' }}>
        <View style={{ flex: 1 }} />
        <Verdict color={T.amber} title="Be careful" sub="Wants payment by gift card." t={t} at={0.02} />
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingBottom: 14 }}>
          <View style={[st.callBtn, { flex: 1, backgroundColor: '#fff' }]}><Send size={13} color={T.amberInk} strokeWidth={2.2} /><Text style={[font(13, '700'), { color: T.amberInk }]}>Ask Anna</Text></View>
          <View style={[st.callBtn, { flex: 1, backgroundColor: C.greenTint }]}><Phone size={13} color={T.green} strokeWidth={2.2} /><Text style={[font(13, '700'), { color: T.green }]}>Call</Text></View>
        </View>
        <Finger t={t} x={70} y={H - 30} at={0.5} />
      </View>
    ),
  },
];

const st = StyleSheet.create({
  phone: { width: W, height: H, borderRadius: 38, borderWidth: 6, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: W + 30, marginTop: 18 },
  arrow: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  dot: { height: 7, borderRadius: 4 },
  finger: { position: 'absolute', left: 8, top: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(120,120,128,.55)', borderWidth: 2, borderColor: 'rgba(255,255,255,.9)' },
  ripple: { position: 'absolute', left: 0, top: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: T.green },
  msgHead: { alignItems: 'center', paddingTop: 14, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  av: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  inBubble: { marginTop: 14, marginLeft: 10, maxWidth: 190, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8 },
  menu: { position: 'absolute', left: 14, top: 170, width: 130, borderWidth: StyleSheet.hairlineWidth, borderColor: '#c6c6c8', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingBottom: 14 },
  plus: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  field: { flex: 1, height: 30, borderRadius: 15, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 12 },
  drawer: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingTop: 6, paddingBottom: 20, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14 },
  grab: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#c7c7cc', alignSelf: 'center', marginBottom: 12 },
  paste: { height: 42, borderRadius: 21, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  appList: { margin: 8, borderRadius: 16, paddingVertical: 4 },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  appIco: { width: 26, height: 26, borderRadius: 7 },
  verdict: { marginHorizontal: 10, marginBottom: 8, borderRadius: 18, padding: 16 },
  verdictSm: { borderRadius: 16, padding: 14 },
  chip: { flex: 1, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  askBtn: { marginTop: 10, height: 38, borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  reply: { marginTop: 10, borderRadius: 14, padding: 10 },
  callBtn: { height: 36, paddingHorizontal: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  homeCard: { margin: 10, borderRadius: 20, padding: 16 },
  homeBtn: { height: 44, borderRadius: 22, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 5 },
  homeArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  tick: { width: 20, height: 20, borderRadius: 10, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
});
