// The design's keyframes, reproduced verbatim as timed RN animations.
// Each one matches the source @keyframes block: identical from/to values,
// durations, delays and cubic-bezier control points. No spring libraries.
//
//   v2in    { from{opacity:0; translateY(10px)} }            ease
//   v2fade  { from{opacity:0} }                              ease
//   v2rise  { 0%{opacity:0; translateY(26px)} }              per-call bezier
//   v2bub   { 0%{opacity:0; translateY(22px) scale(.96)} }   per-call bezier
//   v2wipe  { from{translateY(101%)} }                       per-call bezier
//   v2pop   { 0%{opacity:0; scale(.5)} 70%{scale(1.08)} }    per-call bezier
//   v2slide { from{opacity:0; translateX(-14px)} }           ease
//   v2scan / v2draw / v2link / v2stamp are built inline where used (intro).
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, ViewStyle, StyleProp } from 'react-native';

export const EASE = Easing.bezier(0.25, 0.1, 0.25, 1); // CSS "ease"
export const bez = (a: number, b: number, c: number, d: number) => Easing.bezier(a, b, c, d);

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.().then(v => { reduceMotion = !!v; }).catch(() => {});

type P = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  duration: number;       // ms
  delay?: number;         // ms
  easing?: (t: number) => number;
  /** replays when this changes (e.g. beat index) */
  playKey?: unknown;
};

function useDriver(playKey: unknown) {
  const v = useRef(new Animated.Value(0)).current;
  return { v, playKey };
}

function run(v: Animated.Value, p: P) {
  v.setValue(reduceMotion ? 1 : 0);
  if (reduceMotion) return;
  Animated.timing(v, {
    toValue: 1, duration: p.duration, delay: p.delay ?? 0,
    easing: p.easing ?? EASE, useNativeDriver: true,
  }).start();
}

/** v2in — opacity 0→1, translateY 10→0 */
export function KFIn(p: P) {
  const { v } = useDriver(p.playKey);
  useEffect(() => { run(v, p); }, [p.playKey]);
  return (
    <Animated.View style={[p.style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      {p.children}
    </Animated.View>
  );
}

/** v2fade — opacity 0→1 */
export function KFFade(p: P) {
  const { v } = useDriver(p.playKey);
  useEffect(() => { run(v, p); }, [p.playKey]);
  return <Animated.View style={[p.style, { opacity: v }]}>{p.children}</Animated.View>;
}

/** v2rise — opacity 0→1, translateY 26→0. Wrap in an overflow:hidden mask for the intro. */
export function KFRise(p: P) {
  const { v } = useDriver(p.playKey);
  useEffect(() => { run(v, p); }, [p.playKey]);
  return (
    <Animated.View style={[p.style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }] }]}>
      {p.children}
    </Animated.View>
  );
}

/** v2bub — opacity 0→1, translateY 22→0, scale .96→1 */
export function KFBub(p: P) {
  const { v } = useDriver(p.playKey);
  useEffect(() => { run(v, p); }, [p.playKey]);
  return (
    <Animated.View style={[p.style, {
      opacity: v,
      transform: [
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
      ],
    }]}>
      {p.children}
    </Animated.View>
  );
}

/** v2pop — opacity 0→1; scale .5 → 1.08 (at 70%) → 1 */
export function KFPop(p: P) {
  const { v } = useDriver(p.playKey);
  useEffect(() => { run(v, p); }, [p.playKey]);
  return (
    <Animated.View style={[p.style, {
      opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
      transform: [{ scale: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.5, 1.08, 1] }) }],
    }]}>
      {p.children}
    </Animated.View>
  );
}

/** v2slide — opacity 0→1, translateX -14→0 */
export function KFSlide(p: P) {
  const { v } = useDriver(p.playKey);
  useEffect(() => { run(v, p); }, [p.playKey]);
  return (
    <Animated.View style={[p.style, { opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] }]}>
      {p.children}
    </Animated.View>
  );
}

/** v2wipe — translateY 101% → 0. Pass the field's pixel height. */
export function KFWipe(p: P & { height: number }) {
  const { v } = useDriver(p.playKey);
  useEffect(() => { run(v, p); }, [p.playKey]);
  return (
    <Animated.View style={[p.style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [p.height * 1.01, 0] }) }] }]}>
      {p.children}
    </Animated.View>
  );
}

/** v2scan — loops: translateY 0→105, opacity 0→1 (12%) →1 (88%) →0 */
export function KFScan(p: { delay?: number; style?: StyleProp<ViewStyle>; children?: React.ReactNode; playKey?: unknown }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) { v.setValue(0); return; }
    v.setValue(0);
    const loop = Animated.loop(Animated.timing(v, {
      toValue: 1, duration: 2300, delay: p.delay ?? 0,
      easing: bez(0.45, 0, 0.55, 1), useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, [p.playKey]);
  return (
    <Animated.View style={[p.style, {
      opacity: v.interpolate({ inputRange: [0, 0.12, 0.88, 1], outputRange: [0, 1, 1, 0] }),
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 105] }) }],
    }]}>
      {p.children}
    </Animated.View>
  );
}

/** v2link — width 0 → 64px is a layout prop; animate scaleX from a left origin instead. */
export function KFLink(p: P & { width: number }) {
  const { v } = useDriver(p.playKey);
  useEffect(() => { run(v, p); }, [p.playKey]);
  return (
    <Animated.View style={[p.style, {
      transform: [
        { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-p.width / 2, 0] }) },
        { scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [0.0001, 1] }) },
      ],
    }]}>
      {p.children}
    </Animated.View>
  );
}
