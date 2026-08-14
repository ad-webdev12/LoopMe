// Tab bar — exact per handoff: rgba(247,245,241,.95) ground, 1px hairline top,
// 0 -2px 10px shadow, 25px icons, 11px labels, then a 132×5 home-indicator pill.
// Tabs swap by role. Active: green, stroke 2.4, weight 800. Inactive: #6b6b68.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Shield, Clock3, Users, MoreHorizontal } from 'lucide-react-native';
import { T, F } from '../theme';

export type TabId = 'ward' | 'home' | 'history' | 'people' | 'more';

export default function TabBar(props: {
  careMode: boolean;
  watchName: string;
  screen: string;
  go: (t: TabId) => void;
}) {
  const s = props.screen;
  const tabs = props.careMode
    ? [
        { label: props.watchName, t: 'ward' as TabId, Icon: Users, on: s === 'ward' || s === 'wardItem' },
        { label: 'My checks', t: 'home' as TabId, Icon: Shield, on: s === 'home' || s === 'verdict' },
        { label: 'History', t: 'history' as TabId, Icon: Clock3, on: s === 'history' },
        { label: 'More', t: 'more' as TabId, Icon: MoreHorizontal, on: ['more', 'learn', 'settings', 'care', 'watch'].includes(s) },
      ]
    : [
        { label: 'Check', t: 'home' as TabId, Icon: Shield, on: s === 'home' },
        { label: 'History', t: 'history' as TabId, Icon: Clock3, on: s === 'history' },
        { label: 'People', t: 'people' as TabId, Icon: Users, on: s === 'people' },
        { label: 'More', t: 'more' as TabId, Icon: MoreHorizontal, on: ['more', 'learn', 'settings', 'care'].includes(s) },
      ];
  return (
    <View style={st.wrap}>
      <View style={st.row}>
        {tabs.map((t) => (
          <Pressable key={t.t} style={st.tab} onPress={() => props.go(t.t)} accessibilityRole="button" accessibilityLabel={t.label}>
            <t.Icon size={25} color={t.on ? T.green : '#6b6b68'} strokeWidth={t.on ? 2.4 : 1.8} />
            <Text style={[st.label, { color: t.on ? T.green : '#6b6b68', fontFamily: t.on ? F.display : F.semibold }]} allowFontScaling numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={st.pillWrap}><View style={st.pill} /></View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: T.tabBg, borderTopWidth: 1, borderTopColor: T.hairline,
    shadowColor: '#1f1d1c', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: -2 },
    zIndex: 6,
  },
  row: { flexDirection: 'row', paddingTop: 11, paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 3 },
  label: { fontSize: 11, letterSpacing: 0.11 },
  pillWrap: { alignItems: 'center', paddingVertical: 9 },
  pill: { width: 132, height: 5, borderRadius: 3, backgroundColor: T.fieldBorder },
});
