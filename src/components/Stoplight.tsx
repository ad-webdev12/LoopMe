import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T, LEVEL_META } from '../theme';
import type { Level } from '../engine/ScamDetector';

// Never color alone: icon + word + shape (circle) together.
export default function Stoplight({ level }: { level: Level }) {
  const m = LEVEL_META[level];
  return (
    <View style={s.wrap} accessible accessibilityLabel={`${m.word}. ${m.line}`}>
      <View style={[s.circle, { backgroundColor: m.color }]}>
        <Text style={s.icon}>{m.icon}</Text>
      </View>
      <Text style={[s.word, { color: m.color }]} allowFontScaling>{m.word}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 12 },
  circle: { width: 148, height: 148, borderRadius: 74, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 64, color: '#FFF' },
  word: { fontSize: T.headline, fontWeight: '800', marginTop: 12 },
});
