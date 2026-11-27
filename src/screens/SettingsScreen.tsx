// Settings, opened from the Family page. Am I protected comes first, read
// from the iPhone itself. Then three short groups: what protects you, what is
// about you, and where to get help.
import React, { useEffect, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { nameProblem, tidyName } from '../lib/names';
import Constants from 'expo-constants';
import { ShieldCheck, Volume2, BookOpen, Lock, ChevronRight, HelpCircle, UserRound, Check, Ban, Filter } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, SectionHeader, LargeTitle, Group, Row, IOSSwitch, PulseDot, Note, Pill, usePulse } from '../ui/base';
import { useProtection } from '../lib/protection';
import type { Ctx } from '../App';

export default function SettingsScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const p = useProtection(ctx.tallies);
  const version = Constants.expoConfig?.version || '1.0.1';
  const set = (patch: Partial<typeof s>) => ctx.update({ ...s, ...patch });
  // Set up for someone else: the name on this phone is theirs (careName).
  const nameKey: 'careName' | 'myName' = s.careName && !s.myName ? 'careName' : 'myName';
  const [editing, setEditing] = useState(false);

  const careMode = s.role === 'caretaker';
  const meta = { color: C.dark ? '#8e8e93' : '#6c6c70' };
  const count = (n: number) => n ? <Text style={[font(17, '400'), meta]} allowFontScaling>{n}</Text> : undefined;

  return (
    <Screen C={C} playKey="settings">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <BackLink label={careMode ? 'Back' : 'Family'} onPress={() => ctx.go(careMode ? 'ward' : 'family')} />
        <LargeTitle C={C}>Settings</LargeTitle>

        <View style={{ height: 8 }} />
        <ProtectionCard ctx={ctx} p={p} />

        <SectionHeader C={C}>Protection</SectionHeader>
        <Group C={C}>
          <Row C={C} chip={Filter} chipColor={T.red} title="Scam text filter" pad={9} chevron onPress={() => ctx.go('advanced')} right={<Text style={[font(17, '400'), meta]} allowFontScaling>{s.autoCheck !== false ? 'On' : 'Off'}</Text>} />
          <Row C={C} chip={Check} chipColor={T.green} title="Trusted numbers" pad={9} chevron onPress={() => ctx.go('safe')} right={count(s.allowlist.length)} />
          <Row C={C} chip={Ban} chipColor={T.red} title="Blocked numbers" pad={9} chevron last onPress={() => ctx.go('blocked')} right={count(s.blocked.length)} />
        </Group>

        <SectionHeader C={C}>You</SectionHeader>
        <Group C={C}>
          <Row C={C} chip={UserRound} chipColor={T.green} title="Name" pad={9} chevron onPress={() => setEditing(true)} right={<Text style={[font(17, '400'), meta]} numberOfLines={1} allowFontScaling>{s[nameKey] || 'Add'}</Text>} />
          <Row C={C} chip={Volume2} chipColor={T.iosGrey} title="Read answers aloud" pad={9} last right={<IOSSwitch C={C} on={!!s.readAloud} onChange={v => set({ readAloud: v })} />} />
        </Group>

        <SectionHeader C={C}>Help</SectionHeader>
        <Group C={C}>
          <Row C={C} chip={HelpCircle} chipColor={T.green} title="How to use Loop Me" pad={9} chevron onPress={() => ctx.go('howto')} />
          <Row C={C} chip={BookOpen} chipColor={T.amber} title="Learn about scams" pad={9} chevron onPress={() => ctx.go('learn')} />
          <Row C={C} chip={Lock} chipColor={T.iosGrey} title="Privacy" pad={9} chevron last onPress={() => ctx.go('privacy')} />
        </Group>

        <Note C={C} center top={22}>Loop Me {version}</Note>
      </ScrollView>
      <NameSheet ctx={ctx} visible={editing} field={nameKey} onClose={() => setEditing(false)} />
    </Screen>
  );
}

function NameSheet({ ctx, visible, field, onClose }: { ctx: Ctx; visible: boolean; field: 'careName' | 'myName'; onClose: () => void }) {
  const { C } = ctx;
  const [draft, setDraft] = useState(ctx.settings[field]);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (visible) { setDraft(ctx.settings[field]); setTried(false); } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const problem = nameProblem(draft);
  const save = () => {
    setTried(true);
    if (problem) return;
    ctx.update({ ...ctx.settings, [field]: tidyName(draft) });
    onClose();
    ctx.flash('Name saved');
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.dim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior="padding">
          <View style={[st.sheet, { backgroundColor: C.card }]}>
            <Text style={[font(20, '700'), { color: C.ink }]} allowFontScaling>{field === 'careName' ? 'Their first name' : 'Your first name'}</Text>
            <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={save} returnKeyType="done" autoFocus autoCapitalize="words" autoCorrect={false} maxLength={30} textContentType="givenName" placeholder="First name" placeholderTextColor={C.dark ? '#636366' : '#a1a1a6'}
              style={[font(22, '600'), { color: C.ink, backgroundColor: C.ground, borderRadius: 12, padding: 14, marginTop: 14 }]} accessibilityLabel="First name" />
            {problem && (tried || draft.trim().length > 0) && <Text style={[font(15, '500'), { color: C.redText, marginTop: 8 }]} allowFontScaling accessibilityLiveRegion="polite">{problem}</Text>}
            <Pill label="Save" style={{ marginTop: 14 }} onPress={save} disabled={!!problem} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
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
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  start: { height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center' },
});
