import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LEVEL_META, T } from '../theme';
import type { Level } from '../engine/ScamDetector';

/** The verdict mark: shape + icon + word together, never color alone. */
export default function VerdictMark({ level, size = 'large' }: { level: Level; size?: 'large' | 'small' }) {
  const m = LEVEL_META[level];
  const d = size === 'large' ? 116 : 44;
  const icon = size === 'large' ? 58 : 24;
  return (
    <View style={s.wrap} accessible accessibilityLabel={`${m.word}. ${m.line}`}>
      <View style={[s.circle, { width: d, height: d, borderRadius: d / 2, backgroundColor: m.color }]}>
        <m.Icon size={icon} color="#FFFFFF" strokeWidth={2.4} />
      </View>
      {size === 'large' && <Text style={[s.word, { color: m.color }]} allowFontScaling>{m.word}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 10 },
  circle: { alignItems: 'center', justifyContent: 'center' },
  word: { fontSize: T.headline, fontWeight: '800', marginTop: 12, letterSpacing: -0.3 },
});
