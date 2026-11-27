// Settings. Built for someone who wants to know one thing first: am I
// protected? One status card at the top, read from the iPhone itself. Then a
// few plain rows; everything else sits one level down.
import React from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { ShieldCheck, Volume2, Users, BookOpen, LifeBuoy, SlidersHorizontal, Lock, ChevronRight, HelpCircle } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, LargeTitle, Group, Row, IOSSwitch, PulseDot, Note, SectionHeader, usePulse } from '../ui/base';
import { useProtection } from '../lib/protection';
import type { Ctx, ScreenId } from '../App';

// The tab Settings was opened from. Coming back from a Settings page keeps it,
// so Done always returns to where the person started.
let openedFrom: ScreenId = 'home';
const OPENERS: ScreenId[] = ['home', 'family', 'history', 'ward'];

export default function SettingsScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  if (OPENERS.includes(ctx.from)) openedFrom = ctx.from;
  const p = useProtection(ctx.tallies);
  const version = Constants.expoConfig?.version || '1.0.1';
  const set = (patch: Partial<typeof s>) => ctx.update({ ...s, ...patch });
  const counts = s.allowlist.length + s.blocked.length;

  return (
    <Screen C={C} playKey="settings">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <LargeTitle C={C} right={<Pressable onPress={() => ctx.go(openedFrom)} style={({ pressed }) => [st.done, { backgroundColor: C.dark ? '#2c2c2e' : '#e5e5ea' }, pressed && { opacity: 0.7 }]} accessibilityRole="button"><Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>Done</Text></Pressable>}>Settings</LargeTitle>

        <View style={{ height: 8 }} />
        <ProtectionCard ctx={ctx} p={p} />

        <View style={{ height: 20 }} />
        <Group C={C}>
          <Row C={C} chip={Volume2} chipColor={T.iosGrey} title="Read answers aloud" pad={9} right={<IOSSwitch C={C} on={!!s.readAloud} onChange={v => set({ readAloud: v })} />} />
          <Row C={C} chip={Users} chipColor={T.green} title="Trusted and blocked numbers" pad={9} chevron last onPress={() => ctx.go('numbers')} right={counts > 0 ? <Text style={[font(17, '400'), { color: C.meta }]} allowFontScaling>{counts}</Text> : undefined} />
        </Group>

        <View style={{ height: 20 }} />
        <Group C={C}>
          <Row C={C} chip={HelpCircle} chipColor={T.green} title="How to use Loop Me" pad={9} chevron onPress={() => ctx.go('howto')} />
          <Row C={C} chip={BookOpen} chipColor={T.amber} title="Learn about scams" pad={9} chevron onPress={() => ctx.go('learn')} />
          <Row C={C} chip={LifeBuoy} chipColor={T.red} title="Get help" pad={9} chevron last onPress={() => ctx.go('support')} />
        </Group>

        <View style={{ height: 20 }} />
        <Group C={C}>
          <Row C={C} chip={SlidersHorizontal} chipColor={T.iosGrey} title="More settings" pad={9} chevron onPress={() => ctx.go('advanced')} />
          <Row C={C} chip={Lock} chipColor={T.iosGrey} title="Privacy" pad={9} chevron last onPress={() => ctx.go('privacy')} />
        </Group>

        <Note C={C} center top={22}>Loop Me {version} · No account required</Note>
      </ScrollView>
    </Screen>
  );
}

function ProtectionCard({ ctx, p }: { ctx: Ctx; p: ReturnType<typeof useProtection> }) {
  const { C } = ctx;
  const rowBg = usePulse(C.card, C.redTint);
  if (!p.known) return <View style={[st.card, { backgroundColor: C.card, minHeight: 76 }]} />;
  if (p.done) {
    return (
      <Pressable onPress={() => ctx.go('setup')} style={({ pressed }) => [st.card, { backgroundColor: T.green, alignItems: 'flex-start', flexDirection: 'column' }, pressed && { opacity: 0.85 }]} accessibilityRole="button">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ShieldCheck size={30} color="#fff" strokeWidth={2} />
          <Text style={[font(20, '700', 1.2), { color: '#fff', flex: 1 }]} allowFontScaling>Protection is on</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 12 }}>
          <Text style={[font(17, '600'), { color: '#fff' }]} allowFontScaling>Manage protection</Text>
          <ChevronRight size={18} color="#fff" strokeWidth={2.4} />
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={() => ctx.go('setup')} accessibilityRole="button" accessibilityLabel="Turn on scam protection">
      <Animated.View style={[st.card, { backgroundColor: rowBg, paddingRight: 14 }]}>
        <View style={{ marginHorizontal: 3 }}><PulseDot size={12} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[font(18, '700'), { color: C.ink }]} allowFontScaling>Protection is off</Text>
          <Text style={[font(15, '500', 1.35), { color: C.redText, marginTop: 2 }]} allowFontScaling>{p.left === 1 ? '1 step left' : p.left + ' steps to turn it on'}</Text>
        </View>
        <View style={st.start}><Text style={[font(15, '600'), { color: '#fff' }]} allowFontScaling>Start</Text></View>
      </Animated.View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  done: { height: 36, paddingHorizontal: 16, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  card: { marginHorizontal: 16, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  start: { height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center' },
});
