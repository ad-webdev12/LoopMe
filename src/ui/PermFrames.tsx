// A short loop of frames showing where a switch lives in iPhone Settings.
// The first frames are real Settings screenshots; the pages the simulator
// cannot show (Messages and Phone have no settings pages there) are drawn in
// the same style, so the person sees the exact row to look for.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { T, font } from '../theme';
import type { Palette } from '../theme';

export type Frame = { image: ImageSourcePropType } | { page: string; rows: MockRow[] };
export type MockRow = { label: string; sub?: string; on?: boolean; chevron?: boolean; header?: boolean; hit?: boolean };

export function PermFrames({ C, frames, captions, ms = 1900 }: { C: Palette; frames: Frame[]; captions: string[]; ms?: number }) {
  const [i, setI] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const t = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
        setI(k => (k + 1) % frames.length);
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, ms);
    return () => clearInterval(t);
  }, [frames.length, ms, fade]);
  const f = frames[i];
  return (
    <View style={{ marginTop: 12 }}>
      <Animated.View style={[st.frame, { backgroundColor: '#f2f2f7', opacity: fade }]}>
        {'image' in f ? (
          <Animated.Image source={f.image} style={st.img} resizeMode="cover" accessibilityLabel={captions[i]} />
        ) : (
          <SettingsMock page={f.page} rows={f.rows} />
        )}
      </Animated.View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {frames.map((_, k) => <View key={k} style={{ width: k === i ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: k === i ? T.green : C.sep }} />)}
        </View>
        <Text style={[font(15, '500'), { color: C.ink, flex: 1 }]} allowFontScaling numberOfLines={1}>{captions[i]}</Text>
      </View>
    </View>
  );
}

/** A Settings page drawn in iOS style: title, then grouped rows. Light only, like a screenshot. */
function SettingsMock({ page, rows }: { page: string; rows: MockRow[] }) {
  return (
    <View style={{ flex: 1, padding: 14 }}>
      <Text style={[font(15, '600'), { color: '#000', textAlign: 'center' }]} allowFontScaling={false}>{page}</Text>
      <View style={{ marginTop: 12, gap: 10 }}>
        {rows.map((r, k) => r.header ? (
          <Text key={k} style={[font(12, '400'), { color: '#6c6c70', marginLeft: 12, marginTop: 4, textTransform: 'uppercase' }]} allowFontScaling={false}>{r.label}</Text>
        ) : (
          <View key={k} style={[st.row, r.hit && { borderWidth: 2, borderColor: T.green }]}>
            <View style={{ flex: 1 }}>
              <Text style={[font(15, r.hit ? '600' : '400'), { color: '#000' }]} allowFontScaling={false}>{r.label}</Text>
              {!!r.sub && <Text style={[font(12, '400'), { color: '#6c6c70', marginTop: 1 }]} allowFontScaling={false}>{r.sub}</Text>}
            </View>
            {r.on != null && (
              <View style={[st.toggle, { backgroundColor: r.on ? '#34c759' : '#e9e9ea', alignItems: r.on ? 'flex-end' : 'flex-start' }]}><View style={st.knob} /></View>
            )}
            {r.chevron && <ChevronRight size={14} color="#c4c4c7" strokeWidth={2.4} />}
          </View>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  frame: { borderRadius: 14, overflow: 'hidden', aspectRatio: 402 / 300 },
  img: { width: '100%', height: '100%' },
  row: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggle: { width: 36, height: 22, borderRadius: 11, padding: 2, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
});
