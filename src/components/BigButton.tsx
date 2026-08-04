import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { T } from '../theme';

export default function BigButton(props: {
  label: string; onPress: () => void;
  kind?: 'primary' | 'secondary' | 'quiet'; color?: string; style?: ViewStyle;
}) {
  const { kind = 'primary' } = props;
  const bg = kind === 'primary' ? (props.color || T.ink) : kind === 'secondary' ? T.card : 'transparent';
  const fg = kind === 'primary' ? '#FFF' : T.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft); props.onPress(); }}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: pressed ? 0.85 : 1 },
        kind === 'secondary' && s.shadow,
        kind === 'quiet' && { minHeight: 48 },
        props.style,
      ]}>
      <Text style={[s.label, { color: fg }, kind === 'quiet' && { fontSize: 18, color: T.inkSoft }]} allowFontScaling>
        {props.label}
      </Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  btn: { minHeight: T.tap, borderRadius: T.radius, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 14, marginVertical: 8 },
  shadow: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  label: { fontSize: T.button, fontWeight: '700', textAlign: 'center' },
});
