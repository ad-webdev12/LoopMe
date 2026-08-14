// Toast — #171717 on white shadow, 13.5/1.4 semibold, v2in .2s, sits above the
// tab bar (bottom 104). Dismissed by the app after 2200ms.
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { KFIn } from './kf';
import { F } from '../theme';

export default function Toast({ text }: { text: string }) {
  if (!text) return null;
  return (
    <KFIn duration={200} playKey={text} style={st.wrap}>
      <Text style={st.text} allowFontScaling>{text}</Text>
    </KFIn>
  );
}
const st = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 18, right: 18, bottom: 104,
    backgroundColor: '#171717', paddingHorizontal: 15, paddingVertical: 13, zIndex: 30,
    shadowColor: '#d6d6d1', shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 6 },
  },
  text: { color: '#fff', fontSize: 13.5, lineHeight: 19, fontFamily: F.semibold },
});
