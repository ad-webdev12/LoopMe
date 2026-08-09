import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { T, SHADOW } from '../theme';

/** Surface card: hairline border + one soft shadow. `tone` washes the background. */
export default function Card(props: {
  children: React.ReactNode;
  tone?: 'plain' | 'red' | 'amber' | 'green' | 'accent';
  style?: ViewStyle;
}) {
  const bg =
    props.tone === 'red' ? T.redSoft :
    props.tone === 'amber' ? T.amberSoft :
    props.tone === 'green' ? T.greenSoft :
    props.tone === 'accent' ? T.accentSoft : T.card;
  return (
    <View style={[s.card, { backgroundColor: bg }, props.tone && props.tone !== 'plain' && { borderColor: 'transparent' }, props.style]}>
      <View style={s.rim} pointerEvents="none" />
      {props.children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: T.radius, padding: 18, marginVertical: 7,
    borderWidth: 1, borderColor: T.hairline, ...SHADOW,
  },
  // a faint lit top edge, so cards catch light like a physical surface
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: T.radius,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.7)',
  },
});
