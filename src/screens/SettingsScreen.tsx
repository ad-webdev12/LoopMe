// Settings. Permissions row first (pulses red until both are on), the iOS
// toggles, the family secret word behind Face ID, blocked and safe lists,
// then learn and get help. Footer with the version.
import React, { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import Constants from 'expo-constants';
import { Bell, MessageCircle, Volume2, Moon, ScanFace, Ban, Check, BookOpen, Phone, HandHeart, LifeBuoy, Sparkles } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, LargeTitle, Group, Row, IOSSwitch, PulseDot, Note, SectionHeader, SmallBtn, Swap, usePulse } from '../ui/base';
import { callDirectoryStatus } from '../../modules/scam-ai';
import { ensureNotificationPermission } from '../lib/notify';
import { loopPerson, firstName } from '../ui/pieces';
import type { Ctx } from '../App';

export default function SettingsScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const [calls, setCalls] = useState<'enabled' | 'disabled' | 'unknown'>('unknown');
  const [word, setWord] = useState<'locked' | 'scanning' | 'shown'>('locked');
  useEffect(() => { callDirectoryStatus().then(setCalls).catch(() => {}); return () => setWord('locked'); }, []);
  const permsDone = ctx.tallies.filtered > 0 && calls === 'enabled';
  const rowBg = usePulse(C.card, C.redTint);
  const who = firstName(loopPerson(s)?.name);
  const version = Constants.expoConfig?.version || '1.0.1';
  const setupLeft = [s.trusted.length > 0, s.familyLinked, permsDone, s.codeWordSet].filter(x => !x).length;

  const showWord = async () => {
    if (word === 'shown') { setWord('locked'); return; }
    if (!s.codeWordSet || !s.codeWord) { ctx.flash('Set the secret word under Finish setting up.'); return; }
    setWord('scanning');
    try {
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Show the family secret word', cancelLabel: 'Cancel' });
      setWord(r.success ? 'shown' : 'locked');
    } catch { setWord('locked'); }
  };
  const set = (patch: Partial<typeof s>) => ctx.update({ ...s, ...patch });

  return (
    <Screen C={C} playKey="settings">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <LargeTitle C={C}>Settings</LargeTitle>

        {permsDone ? (
          <Pressable onPress={() => ctx.go('setup')} style={[st.perm, { backgroundColor: C.card }]} accessibilityRole="button">
            <View style={{ marginHorizontal: 3 }}><PulseDot size={12} color={C.accent} still /></View>
            <Text style={[font(17, '600'), { color: C.ink, flex: 1 }]} allowFontScaling>iPhone permissions</Text>
            <Text style={[font(17, '400'), { color: C.accent }]} allowFontScaling>All allowed</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => ctx.go('setup')} accessibilityRole="button">
            <Animated.View style={[st.perm, { backgroundColor: rowBg, paddingRight: 14 }]}>
              <View style={{ marginHorizontal: 3 }}><PulseDot size={12} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>Turn on scam protection</Text>
                <Text style={[font(15, '500', 1.35), { color: C.redText, marginTop: 2 }]} allowFontScaling>Allow 2 iPhone permissions</Text>
              </View>
              <View style={st.start}><Text style={[font(15, '600'), { color: '#fff' }]} allowFontScaling>Start</Text></View>
            </Animated.View>
          </Pressable>
        )}

        {setupLeft > 0 && (
          <Group C={C} style={{ marginTop: 12 }}>
            <Row C={C} chip={HandHeart} chipColor={T.amber} title="Finish setting up" sub={setupLeft + (setupLeft === 1 ? ' thing left' : ' things left')} chevron last onPress={() => ctx.go('caregiver')} />
          </Group>
        )}
        <Group C={C} style={{ marginTop: 20 }}>
          <Row C={C} chip={Bell} chipColor={T.red} title="Full-screen warning" pad={9} right={<IOSSwitch C={C} on={s.alerts !== false} onChange={v => { set({ alerts: v }); if (v) void ensureNotificationPermission(); }} />} />
          <Row C={C} chip={MessageCircle} chipColor={T.green} title="Check unknown texts" pad={9} right={<IOSSwitch C={C} on={s.autoCheck !== false} onChange={v => set({ autoCheck: v })} />} />
          <Row C={C} chip={Volume2} chipColor={T.iosGrey} title="Read answers aloud" pad={9} right={<IOSSwitch C={C} on={!!s.readAloud} onChange={v => set({ readAloud: v })} />} />
          <Row C={C} chip={Sparkles} chipColor={T.amber} title="Help improve Loop Me" pad={9} right={<IOSSwitch C={C} on={!!s.improve} onChange={v => set({ improve: v })} />} />
          <Row C={C} chip={Moon} chipColor="#1c1c1e" title="Dark mode" pad={9} last right={<IOSSwitch C={C} on={!!s.darkMode} onChange={v => set({ darkMode: v })} />} />
        </Group>
        <Note C={C} top={10}>Scam texts from numbers you don’t know go straight to Junk.{s.improve ? ' When you correct an answer, the text is sent to Loop Me with numbers and names blanked, to train the next version.' : ''}</Note>

        <View style={st.secret}>
          <Text style={[font(15, '600'), { color: '#fff' }]} allowFontScaling>Your family’s secret word</Text>
          {word === 'locked' && (
            <Swap playKey="locked">
              <Text style={[font(28, '800', 1.0, s.codeWordSet ? 6 : 0), { color: '#fff', marginTop: 10 }]} allowFontScaling={false}>{s.codeWordSet ? '•••••••' : 'Not set'}</Text>
              <Text style={[font(16, '400', 1.4), { color: '#fff', marginTop: 8 }]} allowFontScaling>If a caller sounds like family and asks for money, ask them for it.</Text>
              <SmallBtn label={s.codeWordSet ? 'Show it' : 'Set it'} bg="#fff" color={T.greenDeep} style={{ marginTop: 12 }} icon={<ScanFace size={18} color={T.greenDeep} strokeWidth={2} />} onPress={() => s.codeWordSet ? showWord() : ctx.go('caregiver')} />
            </Swap>
          )}
          {word === 'scanning' && (
            <Swap playKey="scan" style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 6, gap: 10 }}>
              <ScanFace size={54} color="#fff" strokeWidth={1.6} />
              <Text style={[font(15, '600'), { color: '#fff' }]} allowFontScaling>Face ID</Text>
            </Swap>
          )}
          {word === 'shown' && (
            <Swap playKey="shown">
              <Text style={[font(34, '800', 1.0), { color: '#fff', marginTop: 10 }]} allowFontScaling>{s.codeWord}</Text>
              <Text style={[font(16, '400', 1.4), { color: '#fff', marginTop: 8 }]} allowFontScaling>Hides again when you leave this screen.</Text>
              <SmallBtn label="Hide" bg="rgba(255,255,255,.16)" color="#fff" style={{ marginTop: 12 }} onPress={() => setWord('locked')} />
            </Swap>
          )}
        </View>

        <Group C={C} style={{ marginTop: 20 }}>
          <Row C={C} chip={Ban} chipColor={T.red} title="Blocked Numbers" pad={9} chevron onPress={() => ctx.go('blocked')} right={<Text style={[font(17, '400'), { color: C.meta }]} allowFontScaling>{s.blocked.length}</Text>} />
          <Row C={C} chip={Check} chipColor={T.green} title="Safe Senders" pad={9} last chevron onPress={() => ctx.go('safe')} right={<Text style={[font(17, '400'), { color: C.meta }]} allowFontScaling>{s.allowlist.length}</Text>} />
        </Group>

        <SectionHeader C={C}>Learn and get help</SectionHeader>
        <Group C={C}>
          <Row C={C} chip={MessageCircle} chipColor={T.amber} title="Use Loop Me in Messages" sub="Check a text from inside Messages" chevron onPress={() => ctx.go('drawerInfo')} />
          <Row C={C} chip={BookOpen} chipColor={T.amber} title="The five most common scams" chevron onPress={() => ctx.go('learn')} />
          <Row C={C} chip={Phone} chipColor={T.green} title="Practice a scam call" sub="A pretend call, so you know the pattern" chevron onPress={() => ctx.go('practice')} />
          <Row C={C} chip={LifeBuoy} chipColor={T.red} title="I think I’ve been scammed" titleWeight="600" danger sub="What to do, step by step" chevron last onPress={() => ctx.go('scammed')} />
        </Group>
        {s.familyLinked && (
          <Pressable onPress={ctx.unlinkFamily} style={{ paddingTop: 18 }} accessibilityRole="button">
            <Text style={[font(15, '500'), { color: C.redText, textAlign: 'center' }]} allowFontScaling>{s.familyRole === 'owner' ? 'Stop ' + (who || 'them') + ' hearing from this phone' : 'Stop looking after this phone'}</Text>
          </Pressable>
        )}
        <Note C={C} center top={18}>Loop Me {version}{'\n'}Everything is checked on this phone. No account.</Note>
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  perm: { marginHorizontal: 16, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  start: { height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center' },
  secret: { marginHorizontal: 16, marginTop: 20, backgroundColor: T.greenDeep, borderRadius: 20, padding: 18, minHeight: 150 },
});
