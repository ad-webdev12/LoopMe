// The verdict mark: shape + icon + word together, never color alone.
// Reveals on a spring — the circle lands with weight, the word follows.
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { LEVEL_META, T, F } from '../theme';
import type { Level } from '../engine/ScamDetector';

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.().then(v => { reduceMotion = !!v; }).catch(() => {});

export default function VerdictMark({ level, size = 'large' }: { level: Level; size?: 'large' | 'small' }) {
  const m = LEVEL_META[level];
  const d = size === 'large' ? 118 : 44;
  const icon = size === 'large' ? 58 : 24;
  const scale = useRef(new Animated.Value(reduceMotion || size === 'small' ? 1 : 0.4)).current;
  const wordY = useRef(new Animated.Value(reduceMotion || size === 'small' ? 0 : 14)).current;
  const wordA = useRef(new Animated.Value(reduceMotion || size === 'small' ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion || size === 'small') return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 200, mass: 0.8 }),
    ]).start();
    Animated.parallel([
      Animated.spring(wordY, { toValue: 0, delay: 120, useNativeDriver: true, damping: 16, stiffness: 180 }),
      Animated.timing(wordA, { toValue: 1, delay: 120, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={s.wrap} accessible accessibilityLabel={`${m.word}. ${m.line}`}>
      <Animated.View
        style={[
          s.circle,
          { width: d, height: d, borderRadius: d / 2, backgroundColor: m.color, transform: [{ scale }] },
          size === 'large' && { shadowColor: m.color, shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
        ]}>
        <m.Icon size={icon} color="#FFFFFF" strokeWidth={2.4} />
      </Animated.View>
      {size === 'large' && (
        <Animated.Text
          style={[s.word, { color: m.color, opacity: wordA, transform: [{ translateY: wordY }] }]}
          allowFontScaling>
          {m.word}
        </Animated.Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 12 },
  circle: { alignItems: 'center', justifyContent: 'center' },
  word: { fontSize: T.headline + 3, fontFamily: F.displayBold, marginTop: 14, letterSpacing: -0.5 },
});
