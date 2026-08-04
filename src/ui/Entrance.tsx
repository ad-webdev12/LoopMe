// Staggered entrance — each child rises 24px and fades in on a soft spring,
// delayed by its index. Disabled automatically when the system asks for
// reduced motion. Transform + opacity only; nothing re-layouts.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.().then(v => { reduceMotion = !!v; }).catch(() => {});

export default function Entrance({ index = 0, children }: { index?: number; children: React.ReactNode }) {
  const y = useRef(new Animated.Value(reduceMotion ? 0 : 24)).current;
  const a = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const delay = Math.min(index, 8) * 70;
    Animated.parallel([
      Animated.spring(y, { toValue: 0, delay, useNativeDriver: true, damping: 18, stiffness: 160, mass: 0.9 }),
      Animated.timing(a, { toValue: 1, delay, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: y }] }}>
      {children}
    </Animated.View>
  );
}
