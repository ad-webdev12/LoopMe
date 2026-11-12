// Shared pieces of the redesigned screens: exact sizes from the handoff.
// Every screen is built from these so the whole app moves together.
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, ImageStyle, Pressable, StyleSheet, Text, View, ViewStyle, StyleProp, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight, Check, X, LucideIcon } from 'lucide-react-native';
import { T, font, Palette, LIGHT, DARK, MOTION } from '../theme';

export const APP_ICON = require('../../assets/icon.png');

// ---- theme ------------------------------------------------------------------
export function palette(dark: boolean): Palette { return dark ? DARK : LIGHT; }

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled().then(v => { reduceMotion = v; }).catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', v => { reduceMotion = v; });
export const motionOff = () => reduceMotion;

const bez = (b: readonly [number, number, number, number]) => Easing.bezier(b[0], b[1], b[2], b[3]);

// ---- screen wrappers --------------------------------------------------------
/** Pushed / tab screen: opacity 0→1, x 16→0, 340ms cubic-bezier(.2,.8,.2,1). */
export function Screen({ C, children, style, playKey }: { C: Palette; children: React.ReactNode; style?: StyleProp<ViewStyle>; playKey?: unknown }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: reduceMotion ? 150 : MOTION.screen.ms, easing: bez(MOTION.screen.bez), useNativeDriver: true }).start();
  }, [playKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const tx = reduceMotion ? 0 : v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  return (
    <Animated.View style={[{ flex: 1, backgroundColor: C.ground, opacity: v, transform: [{ translateX: tx }] }, style]}>
      {children}
    </Animated.View>
  );
}

/** Full-screen colour takeover: opacity 0→1, scale .97→1, 320ms + haptic. */
export function Takeover({ color, haptic, children, style, playKey }: { color: string; haptic?: 'error' | 'warning' | 'success' | null; children: React.ReactNode; style?: StyleProp<ViewStyle>; playKey?: unknown }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: reduceMotion ? 150 : MOTION.takeover.ms, easing: bez(MOTION.takeover.bez), useNativeDriver: true }).start();
    if (haptic) {
      const k = haptic === 'error' ? Haptics.NotificationFeedbackType.Error : haptic === 'warning' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success;
      Haptics.notificationAsync(k).catch(() => {});
    }
  }, [playKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const sc = reduceMotion ? 1 : v.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });
  return (
    <Animated.View style={[{ flex: 1, backgroundColor: color, opacity: v, transform: [{ scale: sc }] }, style]}>
      {children}
    </Animated.View>
  );
}

/** In-place content swap: opacity 0→1, y 8→0, 200–300ms ease. */
export function Swap({ children, playKey, ms = 250, style }: { children: React.ReactNode; playKey: unknown; ms?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: reduceMotion ? 150 : ms, easing: Easing.ease, useNativeDriver: true }).start();
  }, [playKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const ty = reduceMotion ? 0 : v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return <Animated.View style={[{ opacity: v, transform: [{ translateY: ty }] }, style]}>{children}</Animated.View>;
}

/** Background colour pulse (warning boxes). Static colour under Reduce Motion. */
export function usePulse(from: string, to: string, ms = 2400) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(v, { toValue: 0, duration: ms / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return v.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
}

/** The red dot with the ring that pulses out (box-shadow 0→9px, 1.6s). */
export function PulseDot({ size = 10, color = T.red, still }: { size?: number; color?: string; still?: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still || reduceMotion) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [still]); // eslint-disable-line react-hooks/exhaustive-deps
  const ring = size + 18;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {!still && !reduceMotion && (
        <Animated.View style={{ position: 'absolute', width: ring, height: ring, borderRadius: ring / 2, backgroundColor: color,
          opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.55, 0, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [size / ring, 1, 1] }) }] }} />
      )}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

// ---- text -------------------------------------------------------------------
export function LargeTitle({ C, children, right }: { C: Palette; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <Text style={[font(34, '700', 1.1, 0.3), { color: C.ink }]} allowFontScaling>{children}</Text>
      {right}
    </View>
  );
}

export function ScreenTitle({ C, children, top = 6 }: { C: Palette; children: React.ReactNode; top?: number }) {
  return <Text style={[font(32, '700', 1.08), { color: C.ink, paddingHorizontal: 20, paddingTop: top }]} allowFontScaling>{children}</Text>;
}

export function Lead({ C, children, top = 10 }: { C: Palette; children: React.ReactNode; top?: number }) {
  return <Text style={[font(17, '400', 1.45), { color: C.ink2, paddingHorizontal: 20, paddingTop: top }]} allowFontScaling>{children}</Text>;
}

export function SectionHeader({ C, children }: { C: Palette; children: React.ReactNode }) {
  return <Text style={[font(20, '700'), { color: C.ink, paddingTop: 22, paddingHorizontal: 20, paddingBottom: 8 }]} allowFontScaling>{children}</Text>;
}

export function Note({ C, children, center, top = 12, style }: { C: Palette; children: React.ReactNode; center?: boolean; top?: number; style?: StyleProp<TextStyle> }) {
  return <Text style={[font(15, '400', 1.45), { color: C.ink2, paddingHorizontal: 20, paddingTop: top, textAlign: center ? 'center' : 'left' }, style]} allowFontScaling>{children}</Text>;
}

/** "‹ Back" in green, 17px, 22px chevron. */
export function BackLink({ label = 'Back', onPress, color = T.green, Icon = ChevronLeft }: { label?: string; onPress: () => void; color?: string; Icon?: LucideIcon }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
      <Icon size={22} color={color} strokeWidth={2} />
      <Text style={[font(17, '400'), { color }]} allowFontScaling>{label}</Text>
    </Pressable>
  );
}

// ---- containers -------------------------------------------------------------
export function Card({ C, children, style, radius = 20, pad = 16, onPress }: { C: Palette; children: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number; pad?: number; onPress?: () => void }) {
  const s = [{ backgroundColor: C.card, borderRadius: radius, padding: pad }, style];
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.7 }]} accessibilityRole="button">{children}</Pressable>;
  return <View style={s}>{children}</View>;
}

/** iOS grouped list: white, radius 12, 16px left inset, .5px separators. */
export function Group({ C, children, style, radius = 12 }: { C: Palette; children: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number }) {
  return <View style={[{ marginHorizontal: 16, backgroundColor: C.card, borderRadius: radius, paddingLeft: 16 }, style]}>{children}</View>;
}

export function Sep({ C, inset = 0 }: { C: Palette; inset?: number }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.sep, marginLeft: inset }} />;
}

/** A list row: optional icon chip, title, subtitle, right value, chevron. */
export function Row({ C, title, sub, chip, chipColor, right, chevron, onPress, last, titleColor, titleWeight = '400', pad = 12, danger }: {
  C: Palette; title: string; sub?: string; chip?: LucideIcon; chipColor?: string; right?: React.ReactNode; chevron?: boolean;
  onPress?: () => void; last?: boolean; titleColor?: string; titleWeight?: '400' | '600'; pad?: number; danger?: boolean;
}) {
  const Chip = chip;
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: pad, paddingRight: 16, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: C.sep }}>
      {Chip && (
        <View style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: chipColor || T.green, alignItems: 'center', justifyContent: 'center' }}>
          <Chip size={18} color="#fff" strokeWidth={2} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[font(17, titleWeight), { color: titleColor || (danger ? T.redText : C.ink) }]} allowFontScaling>{title}</Text>
        {!!sub && <Text style={[font(15, '400'), { color: C.ink2, marginTop: 1 }]} allowFontScaling>{sub}</Text>}
      </View>
      {right}
      {chevron && <ChevronRight size={16} color={C.chevron} strokeWidth={2.2} />}
    </View>
  );
  if (!onPress) return body;
  return <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.6 }} accessibilityRole="button">{body}</Pressable>;
}

// ---- buttons ----------------------------------------------------------------
/** Full pill button, 56 tall, radius 28, 17/600. */
export function Pill({ label, onPress, bg = T.green, color = '#fff', icon, height = 56, style, disabled, border }: {
  label: string; onPress?: () => void; bg?: string; color?: string; icon?: React.ReactNode; height?: number; style?: StyleProp<ViewStyle>; disabled?: boolean; border?: string;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [{ height, borderRadius: height / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, border ? { borderWidth: 1, borderColor: border } : null, pressed && { opacity: 0.8 }, disabled && { opacity: 0.6 }, style]}>
      {icon}
      <Text style={[font(17, '600'), { color }]} allowFontScaling>{label}</Text>
    </Pressable>
  );
}

/** Square-cornered button, radius 14–16, 54–56 tall. */
export function Btn({ label, onPress, bg = T.green, color = '#fff', icon, height = 56, radius = 16, style, size = 17, weight = '600', justify = 'center' }: {
  label: string; onPress?: () => void; bg?: string; color?: string; icon?: React.ReactNode; height?: number; radius?: number; style?: StyleProp<ViewStyle>; size?: number; weight?: '600' | '700'; justify?: 'center' | 'flex-start';
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [{ height, borderRadius: radius, backgroundColor: bg, alignItems: 'center', justifyContent: justify, flexDirection: 'row', gap: 8, paddingHorizontal: justify === 'flex-start' ? 18 : 0 }, pressed && { opacity: 0.8 }, style]}>
      {icon}
      <Text style={[font(size, weight), { color }]} allowFontScaling>{label}</Text>
    </Pressable>
  );
}

/** Text-only button, 46 tall, 16/600, white on takeovers. */
export function TextBtn({ label, onPress, color = '#fff', style }: { label: string; onPress: () => void; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ height: 46, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.7 }, style]}>
      <Text style={[font(16, '600'), { color }]} allowFontScaling>{label}</Text>
    </Pressable>
  );
}

/** Small inline pill button, 36–40 tall, 15/600. */
export function SmallBtn({ label, onPress, bg, color, icon, height = 40, radius, style }: { label: string; onPress?: () => void; bg: string; color: string; icon?: React.ReactNode; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ height, borderRadius: radius ?? height / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16, alignSelf: 'flex-start' }, pressed && { opacity: 0.7 }, style]}>
      {icon}
      <Text style={[font(15, '600'), { color }]} allowFontScaling>{label}</Text>
    </Pressable>
  );
}

/** Verdict pill: 28 tall, radius 14, 14/600. */
export function Tag({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={{ height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={[font(14, '600'), { color }]} allowFontScaling>{label}</Text>
    </View>
  );
}

// ---- people -----------------------------------------------------------------
export function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
}

/** A person: their Contacts photo, or initials on #eef4f1 in #0d6b57. */
export function Avatar({ name, photo, size, ring, onPhoto }: { name: string; photo?: string | null; size: number; ring?: string; onPhoto?: boolean }) {
  const base: ViewStyle = { width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: onPhoto ? 'rgba(255,255,255,.35)' : '#eef4f1', alignItems: 'center', justifyContent: 'center' };
  if (ring) Object.assign(base, { borderWidth: 2, borderColor: ring });
  if (photo) return <Image source={{ uri: photo }} style={base as unknown as ImageStyle} accessibilityLabel={name} />;
  return (
    <View style={base} accessibilityLabel={name}>
      <Text style={[font(Math.max(11, Math.round(size * 0.36)), '600'), { color: onPhoto ? '#fff' : T.green }]} allowFontScaling={false}>{initials(name) || '?'}</Text>
    </View>
  );
}

// ---- iOS controls -----------------------------------------------------------
export function IOSSwitch({ on, onChange, C }: { on: boolean; onChange: (v: boolean) => void; C: Palette }) {
  const v = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { Animated.timing(v, { toValue: on ? 1 : 0, duration: 200, useNativeDriver: false }).start(); }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Pressable onPress={() => onChange(!on)} accessibilityRole="switch" accessibilityState={{ checked: on }} hitSlop={8}>
      <Animated.View style={{ width: 51, height: 31, borderRadius: 16, padding: 2, backgroundColor: v.interpolate({ inputRange: [0, 1], outputRange: [C.switchOff, T.green] }) }}>
        <Animated.View style={{ width: 27, height: 27, borderRadius: 14, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 2 }, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }} />
      </Animated.View>
    </Pressable>
  );
}

export function Segmented({ C, options, value, onChange }: { C: Palette; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ marginHorizontal: 16, height: 32, borderRadius: 9, backgroundColor: C.segTrack, flexDirection: 'row', padding: 2 }}>
      {options.map(o => (
        <Pressable key={o} onPress={() => onChange(o)} style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 7 }, o === value && { backgroundColor: C.dark ? '#636366' : '#fff', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }]} accessibilityRole="button" accessibilityState={{ selected: o === value }}>
          <Text style={[font(14, o === value ? '600' : '500'), { color: C.ink }]} allowFontScaling>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function CheckCircle({ on, size = 28 }: { on: boolean; size?: number }) {
  if (!on) return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: T.dashed }} />;
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' }}><Check size={16} color="#fff" strokeWidth={3} /></View>;
}

export { ChevronRight, ChevronLeft, Check, X };
