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
  const bg =
    kind === 'primary' ? T.accent :
    kind === 'danger' ? T.red :
    kind === 'success' ? T.green :
    kind === 'secondary' ? T.card : 'transparent';
  const fg = kind === 'primary' || kind === 'danger' || kind === 'success' ? '#FFFFFF'
    : kind === 'secondary' ? T.ink : T.inkSoft;
  const compact = size === 'compact';
  const Icon = props.icon;

  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 20, stiffness: 400 }).start();
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
          kind === 'primary' && s.primaryShadow,
          kind === 'secondary' && { borderWidth: 1, borderColor: T.hairline, ...SHADOW },
          compact && s.compact,
          (pressed || props.disabled) && { opacity: props.disabled ? 0.45 : 0.92 },
          props.style,
        ]}>
        {props.loading
          ? <ActivityIndicator color={fg} />
          : <>
              {Icon && <Icon size={compact ? 18 : 21} color={fg} strokeWidth={2.2} style={s.icon} />}
              <Text style={[s.label, { color: fg }, compact && s.labelCompact]} allowFontScaling>{props.label}</Text>
            </>}
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: T.tap, borderRadius: T.radius, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 22, paddingVertical: 13, marginVertical: 7,
  },
  primaryShadow: {
    shadowColor: T.accentDeep, shadowOpacity: 0.28, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  compact: { minHeight: 46, paddingHorizontal: 16, paddingVertical: 9, marginVertical: 4 },
  icon: { marginRight: 9 },
  label: { fontSize: T.button, fontFamily: F.bodyBold, textAlign: 'center', letterSpacing: 0.1 },
  labelCompact: { fontSize: T.small },
});
