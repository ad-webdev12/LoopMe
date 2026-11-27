// Floating tab bar, per the handoff: Check, Family, History. 50pt in from the
// sides, 30pt from the bottom, 64 tall, radius 32, white, shadow 0 10 30
// rgba(0,0,0,.12). The active tab is a dark-green capsule (124 wide, 48 tall)
// showing icon + label that slides between tabs; its label fades in with a
// 120ms delay. Inactive tabs are grey icons only. Settings lives inside
// Family, so its screens keep the Family tab lit.
//
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ScanText, Clock, Users, LucideIcon } from 'lucide-react-native';
import { T, font, Palette } from '../theme';
import { motionOff } from './base';

export type TabId = 'home' | 'history' | 'family' | 'settings' | 'ward';

const PILL_W = 124;
const SETTINGS_SCREENS = ['settings', 'learn', 'setup', 'caregiver', 'blocked', 'safe', 'drawerInfo', 'numbers', 'howto', 'advanced', 'privacy', 'name'];
const PAD = 8;

export default function TabBar({ C, screen, go, careMode, watchName }: { C: Palette; screen: string; go: (t: TabId) => void; careMode: boolean; watchName: string }) {
  const { width } = useWindowDimensions();
  const tabs: { t: TabId; label: string; Icon: LucideIcon; on: boolean }[] = careMode
    ? [
        { t: 'ward', label: watchName || 'Family', Icon: Users, on: ['ward', 'wardItem', 'maria', ...SETTINGS_SCREENS].includes(screen) },
        { t: 'home', label: 'Check', Icon: ScanText, on: ['home', 'checking'].includes(screen) },
        { t: 'history', label: 'History', Icon: Clock, on: screen === 'history' },
      ]
    : [
        { t: 'home', label: 'Check', Icon: ScanText, on: ['home', 'checking', 'callcheck'].includes(screen) },
        { t: 'family', label: 'Family', Icon: Users, on: ['family', 'ask', 'maria', 'watchedBy', 'watch', ...SETTINGS_SCREENS].includes(screen) },
        { t: 'history', label: 'History', Icon: Clock, on: screen === 'history' },
      ];
  const SIDE = tabs.length > 3 ? 14 : 50;
  // Settings and its sub-screens have no tab of their own on this phone, so
  // nothing is highlighted there: all icons sit evenly, no capsule.
  const found = tabs.findIndex(t => t.on);
  const none = found < 0;
  const active = none ? 0 : found;
  const inner = width - SIDE * 2 - PAD * 2;
  const rest = (inner - PILL_W) / (tabs.length - 1);
  const even = inner / tabs.length;
  const x = useRef(new Animated.Value(active * rest)).current;
  const labelOpacity = useRef(new Animated.Value(1)).current;
  const prev = useRef(active);

  useEffect(() => {
    const target = active * rest;
    if (prev.current !== active) {
      prev.current = active;
      labelOpacity.setValue(0);
      Animated.parallel([
        motionOff()
          ? Animated.timing(x, { toValue: target, duration: 150, useNativeDriver: true })
          : Animated.spring(x, { toValue: target, damping: 18, stiffness: 180, mass: 0.9, useNativeDriver: true }),
        Animated.timing(labelOpacity, { toValue: 1, duration: 300, delay: 120, useNativeDriver: true }),
      ]).start();
      Haptics.selectionAsync().catch(() => {});
    } else {
      x.setValue(target);
    }
  }, [active, rest, none]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[st.bar, { left: SIDE, right: SIDE, backgroundColor: C.card, shadowColor: '#000' }]} pointerEvents="box-none">
      <Animated.View style={[st.pill, { transform: [{ translateX: x }] }, none && { opacity: 0 }]} pointerEvents="none">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {React.createElement(tabs[active].Icon, { size: 20, color: '#fff', strokeWidth: 2.2 })}
          <Animated.Text style={[font(15, '600'), { color: '#fff', opacity: labelOpacity }]} numberOfLines={1} allowFontScaling={false}>{tabs[active].label}</Animated.Text>
        </View>
      </Animated.View>
      {tabs.map((t, i) => (
        <Pressable key={t.t} onPress={() => go(t.t)} accessibilityRole="button" accessibilityLabel={t.label} accessibilityState={{ selected: !none && i === active }}
          style={({ pressed }) => [{ width: none ? even : i === active ? PILL_W : rest, height: 48, alignItems: 'center', justifyContent: 'center' }, pressed && { transform: [{ scale: 0.92 }] }]}>
          {(none || i !== active) && <t.Icon size={23} color={C.dark ? '#aeaeb2' : '#6c6c70'} strokeWidth={1.9} />}
        </Pressable>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  bar: {
    position: 'absolute', bottom: 30, height: 64, borderRadius: 32,
    paddingHorizontal: PAD, flexDirection: 'row', alignItems: 'center',
    shadowOpacity: 0.12, shadowRadius: 30, shadowOffset: { width: 0, height: 10 }, zIndex: 6,
  },
  pill: { position: 'absolute', left: PAD, top: 8, width: PILL_W, height: 48, borderRadius: 24, backgroundColor: T.greenDeep, alignItems: 'center', justifyContent: 'center' },
});
