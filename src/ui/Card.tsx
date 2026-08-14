import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { T, SHADOW } from '../theme';

/** Soft surface card — white with a hairline and a whisper of shadow. `tone`
 *  washes the background in a tint (green for safe/info, red for danger). */
export default function Card(props: {
  children: React.ReactNode;
  tone?: 'plain' | 'red' | 'amber' | 'green' | 'accent';
  style?: ViewStyle;
}) {
  const tinted = props.tone && props.tone !== 'plain';
  const bg =
    props.tone === 'red' ? T.redSoft :
    props.tone === 'amber' ? T.amberSoft :
    props.tone === 'green' || props.tone === 'accent' ? T.greenSoft : T.card;
  return (
    <View style={[s.card, { backgroundColor: bg }, tinted && { borderColor: 'transparent' }, props.style]}>
      {props.children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: T.radius, padding: 16, marginVertical: 6,
    borderWidth: 1, borderColor: T.hairline, ...SHADOW,
  },
});
