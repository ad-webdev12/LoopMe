// Glowing neon button with spring press + tap sound.
import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { T } from '../theme';
import { play } from '../lib/sound';

export default function BigButton(props: {
  label: string; onPress: () => void;
  kind?: 'primary' | 'secondary' | 'quiet'; color?: string; style?: ViewStyle;
}) {
  const { kind = 'primary' } = props;
  const glow = props.color || T.cyan;
  const scale = useRef(new Animated.Value(1)).current;
  const down = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 40 }).start();
  const up = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }).start();
  const fire = () => { play('tap'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); props.onPress(); };
  const bg = kind === 'primary' ? glow : kind === 'secondary' ? T.card : 'transparent';
  const fg = kind === 'primary' ? '#04121C' : T.ink;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={props.label}
        onPressIn={down} onPressOut={up} onPress={fire}
        style={[s.btn, { backgroundColor: bg },
          kind === 'primary' && { shadowColor: glow, shadowOpacity: 0.9, shadowRadius: 18, elevation: 12 },
          kind === 'secondary' && { borderWidth: 1, borderColor: T.cardEdge },
          kind === 'quiet' && { minHeight: 48 }, props.style]}>
        <Text style={[s.label, { color: fg }, kind === 'quiet' && { fontSize: 18, color: T.inkSoft }]} allowFontScaling>
          {props.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
const s = StyleSheet.create({
  btn: { minHeight: T.tap, borderRadius: T.radius, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 14, marginVertical: 8 },
  label: { fontSize: T.button, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
});
