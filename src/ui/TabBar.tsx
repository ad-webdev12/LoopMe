// Floating tab bar, exact per the handoff: 14px from the sides, 30px from the
// bottom, 64 tall, radius 32, white, shadow 0 10px 30px rgba(0,0,0,.12). The
// active tab is a dark-green pill (124 wide, 48 tall) that slides between
// tabs in 450ms cubic-bezier(.3,.9,.25,1); its label fades in with a 120ms
// delay. Inactive tabs are grey icons only, sharing the remaining width.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ScanText, Clock, Users, Settings, LucideIcon } from 'lucide-react-native';
import { T, font, Palette } from '../theme';
import { motionOff } from './base';

export type TabId = 'home' | 'history' | 'family' | 'settings' | 'ward';

const PILL_W = 124;
const SIDE = 14;
const PAD = 8;

export default function TabBar({ C, screen, go, careMode, watchName }: { C: Palette; screen: string; go: (t: TabId) => void; careMode: boolean; watchName: string }) {
  const { width } = useWindowDimensions();
  const tabs: { t: TabId; label: string; Icon: LucideIcon; on: boolean }[] = careMode
    ? [
        { t: 'ward', label: watchName || 'Family', Icon: Users, on: ['ward', 'wardItem', 'maria'].includes(screen) },
        { t: 'home', label: 'Check', Icon: ScanText, on: ['home', 'checking'].includes(screen) },
        { t: 'history', label: 'History', Icon: Clock, on: screen === 'history' },
        { t: 'settings', label: 'Settings', Icon: Settings, on: ['settings', 'learn', 'setup', 'caregiver', 'blocked', 'safe', 'drawerInfo'].includes(screen) },
      ]
    : [
        { t: 'home', label: 'Check', Icon: ScanText, on: ['home', 'checking', 'callcheck'].includes(screen) },
        { t: 'history', label: 'History', Icon: Clock, on: screen === 'history' },
        { t: 'family', label: 'Family', Icon: Users, on: ['family', 'ask', 'maria', 'watchedBy', 'watch'].includes(screen) },
        { t: 'settings', label: 'Settings', Icon: Settings, on: ['settings', 'learn', 'setup', 'caregiver', 'blocked', 'safe', 'drawerInfo'].includes(screen) },
      ];
  let active = tabs.findIndex(t => t.on);
  if (active < 0) active = 0;
  const inner = width - SIDE * 2 - PAD * 2;
  const rest = (inner - PILL_W) / (tabs.length - 1);
  const x = useRef(new Animated.Value(active * rest)).current;
  const labelOpacity = useRef(new Animated.Value(1)).current;
  const prev = useRef(active);

  useEffect(() => {
    const target = active * rest;
    if (prev.current !== active) {
      prev.current = active;
      labelOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(x, { toValue: target, duration: motionOff() ? 150 : 450, easing: Easing.bezier(0.3, 0.9, 0.25, 1), useNativeDriver: true }),
        Animated.timing(labelOpacity, { toValue: 1, duration: 300, delay: 120, useNativeDriver: true }),
      ]).start();
    } else {
      x.setValue(target);
    }
  }, [active, rest]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[st.bar, { backgroundColor: C.card, shadowColor: '#000' }]} pointerEvents="box-none">
      <Animated.View style={[st.pill, { transform: [{ translateX: x }] }]} pointerEvents="none">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {React.createElement(tabs[active].Icon, { size: 20, color: '#fff', strokeWidth: 2.2 })}
          <Animated.Text style={[font(15, '600'), { color: '#fff', opacity: labelOpacity }]} numberOfLines={1} allowFontScaling={false}>{tabs[active].label}</Animated.Text>
        </View>
      </Animated.View>
      {tabs.map((t, i) => (
        <Pressable key={t.t} onPress={() => go(t.t)} accessibilityRole="button" accessibilityLabel={t.label} accessibilityState={{ selected: i === active }}
          style={{ width: i === active ? PILL_W : rest, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          {i !== active && <t.Icon size={23} color={C.dark ? 'rgba(235,235,245,.6)' : T.meta} strokeWidth={1.9} />}
        </Pressable>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  bar: {
    position: 'absolute', left: SIDE, right: SIDE, bottom: 30, height: 64, borderRadius: 32,
    paddingHorizontal: PAD, flexDirection: 'row', alignItems: 'center',
    shadowOpacity: 0.12, shadowRadius: 30, shadowOffset: { width: 0, height: 10 }, zIndex: 6,
  },
  pill: { position: 'absolute', left: PAD, top: 8, width: PILL_W, height: 48, borderRadius: 24, backgroundColor: T.greenDeep, alignItems: 'center', justifyContent: 'center' },
});
