import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { T, F, SHADOW } from '../theme';

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

export default function Button(props: {
  label: string;
  onPress: () => void;
  kind?: Kind;
  icon?: LucideIcon;
  size?: 'regular' | 'compact';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { kind = 'primary', size = 'regular' } = props;
  const scale = useRef(new Animated.Value(1)).current;
  // Green is the app's colour — primary AND every safe action share it. Red only for danger.
  const bg =
    kind === 'primary' || kind === 'success' ? T.green :
    kind === 'danger' ? T.red :
    kind === 'secondary' ? T.card : 'transparent';
  const fg = kind === 'primary' || kind === 'danger' || kind === 'success' ? '#FFFFFF'
    : kind === 'secondary' ? T.ink : T.green;
  const compact = size === 'compact';
  const Icon = props.icon;

  const pressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, damping: 20, stiffness: 400 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 300 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={props.label}
        disabled={props.disabled || props.loading}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft); props.onPress(); }}
        style={({ pressed }) => [
          s.base,
          { backgroundColor: bg },
          kind === 'secondary' && { borderWidth: 1, borderColor: T.hairline, ...SHADOW },
          kind === 'ghost' && { minHeight: 44 },
          compact && s.compact,
          (pressed || props.disabled) && { opacity: props.disabled ? 0.45 : 0.9 },
          props.style,
        ]}>
        {props.loading
          ? <ActivityIndicator color={fg} />
          : <>
              {Icon && <Icon size={compact ? 18 : 20} color={fg} strokeWidth={2} style={s.icon} />}
              <Text style={[s.label, { color: fg }, compact && s.labelCompact]} allowFontScaling>{props.label}</Text>
            </>}
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: T.tap, borderRadius: T.radiusSm, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 13, marginVertical: 6,
  },
  compact: { minHeight: 44, paddingHorizontal: 15, paddingVertical: 9, marginVertical: 4, borderRadius: 10 },
  icon: { marginRight: 9 },
  label: { fontSize: T.button, fontFamily: F.bold, textAlign: 'center' },
  labelCompact: { fontSize: T.small, fontFamily: F.semibold },
});
