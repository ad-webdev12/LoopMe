// Toast at the top: rgba(28,28,30,.94), radius 16, 16/500 white, in 200ms,
// stays 2.4s. Confirms one-off actions (call, block, save PDF).
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Swap } from './base';
import { T, font } from '../theme';

export default function Toast({ text }: { text: string }) {
  if (!text) return null;
  return (
    <Swap playKey={text} ms={200} style={st.wrap}>
      <Text style={[font(16, '500', 1.35), { color: '#fff', textAlign: 'center' }]} allowFontScaling>{text}</Text>
    </Swap>
  );
}
const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20, top: 6, zIndex: 30, backgroundColor: T.toast, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
});
