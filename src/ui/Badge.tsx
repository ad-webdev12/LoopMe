import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LEVEL_META, T } from '../theme';
import type { Level } from '../engine/ScamDetector';

/** Small risk chip for lists and history rows. */
export default function Badge({ level }: { level: Level }) {
  const m = LEVEL_META[level];
  return (
    <View style={[s.chip, { backgroundColor: m.soft }]}>
      <m.Icon size={15} color={m.text} strokeWidth={2.6} />
      <Text style={[s.text, { color: m.text }]} allowFontScaling>{m.word}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, gap: 5,
  },
  text: { fontSize: T.caption, fontWeight: '700' },
});
