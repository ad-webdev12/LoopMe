import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { T, SHADOW } from '../theme';

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
  const bg =
    kind === 'primary' ? T.accent :
    kind === 'danger' ? T.red :
    kind === 'success' ? T.green :
    kind === 'secondary' ? T.card : 'transparent';
  const fg = kind === 'primary' || kind === 'danger' || kind === 'success' ? '#FFFFFF'
    : kind === 'secondary' ? T.ink : T.inkSoft;
  const compact = size === 'compact';
  const Icon = props.icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      disabled={props.disabled || props.loading}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft); props.onPress(); }}
      style={({ pressed }) => [
        s.base,
        { backgroundColor: bg },
        kind === 'secondary' && { borderWidth: 1, borderColor: T.hairline, ...SHADOW },
        compact && s.compact,
        (pressed || props.disabled) && { opacity: props.disabled ? 0.45 : 0.85 },
        props.style,
      ]}>
      {props.loading
        ? <ActivityIndicator color={fg} />
        : <>
            {Icon && <Icon size={compact ? 18 : 21} color={fg} strokeWidth={2.2} style={s.icon} />}
            <Text style={[s.label, { color: fg }, compact && s.labelCompact]} allowFontScaling>{props.label}</Text>
          </>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: T.tap, borderRadius: T.radius, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 22, paddingVertical: 13, marginVertical: 7,
  },
  compact: { minHeight: 46, paddingHorizontal: 16, paddingVertical: 9, marginVertical: 4 },
  icon: { marginRight: 9 },
  label: { fontSize: T.button, fontWeight: '700', textAlign: 'center', letterSpacing: 0.1 },
  labelCompact: { fontSize: T.small, fontWeight: '600' },
});
