// Ambient future background: drifting glow orbs + slow scan sweep.
// Smooth pulses only — no strobing/flashing (photosensitivity-safe).
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View, Easing } from 'react-native';
import { T } from '../theme';

const { width: W, height: H } = Dimensions.get('window');

function Orb({ color, size, x, y, dur, dx, dy }: any) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.22] }),
      transform: [
        { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
        { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
        { scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) },
      ],
    }} />
  );
}

export default function AnimatedBG() {
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true })).start();
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Orb color={T.cyan}   size={W * 0.9} x={-W * 0.3} y={-H * 0.12} dur={5200} dx={40} dy={60} />
      <Orb color={T.violet} size={W * 0.8} x={W * 0.5}  y={H * 0.25}  dur={6800} dx={-50} dy={-30} />
      <Orb color={T.green}  size={W * 0.7} x={-W * 0.2} y={H * 0.62}  dur={6000} dx={60} dy={-40} />
      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: T.cyan, opacity: 0.25,
        transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [-4, H + 4] }) }],
      }} />
    </View>
  );
}
