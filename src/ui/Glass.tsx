// Liquid Glass surface — the real iOS material (UIVisualEffectView) via expo-blur,
// finished with a hairline top highlight for physical edge refraction.
//
// Following Apple's Liquid Glass guidance: glass is reserved for NAVIGATION
// surfaces and floating controls, never general content backgrounds — content
// stays solid and legible. And per the accessibility guidance, glass collapses
// to a solid surface when the person has Reduce Transparency turned on.
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { T } from '../theme';

export default function Glass(props: {
  children: React.ReactNode;
  intensity?: number;
  radius?: number;
  style?: ViewStyle;
  /** solid tint used as the Reduce-Transparency fallback and Android base */
  solid?: string;
}) {
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.().then(v => alive && setReduceTransparency(!!v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceTransparencyChanged', (v) => setReduceTransparency(!!v));
    return () => { alive = false; sub?.remove?.(); };
  }, []);

  const radius = props.radius ?? T.radiusLg;
  const solid = props.solid ?? 'rgba(255,253,248,0.92)';

  // No true blur on Android / when transparency is reduced → solid surface.
  if (reduceTransparency || Platform.OS !== 'ios') {
    return (
      <View style={[styles.wrap, { borderRadius: radius, backgroundColor: props.solid ?? T.card }, props.style]}>
        <View style={[styles.highlight, { borderRadius: radius }]} pointerEvents="none" />
        {props.children}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { borderRadius: radius }, props.style]}>
      <BlurView intensity={props.intensity ?? 40} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: solid, opacity: 0.55 }]} pointerEvents="none" />
      <View style={[styles.highlight, { borderRadius: radius }]} pointerEvents="none" />
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  // top edge refraction — a bright hairline that reads as a lit glass rim
  highlight: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(31,27,22,0.06)',
  },
});
