// Turn on scam protection. Two switches that live in iPhone Settings, with
// the exact path, live on/off state, and Open Settings. On iOS 18 a third
// card for Who is calling.
import React, { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MessageCircle, Phone, ChevronRight, Check, PhoneIncoming } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, ScreenTitle, Lead, Note } from '../ui/base';
import { callDirectoryStatus, callerIdStatus, callerIdOpenSettings, CallerIdStatus } from '../../modules/scam-ai';
import { loopPerson, firstName } from '../ui/pieces';
import type { Ctx } from '../App';

const TEXT_STEPS = ['Open Settings', 'Scroll down, tap Apps', 'Tap Messages', 'Tap Unknown & Spam', 'Under SMS Filtering, tap Loop Me'];
const CALL_STEPS = ['Open Settings', 'Scroll down, tap Apps', 'Tap Phone', 'Tap Call Blocking & Identification', 'Switch Loop Me on'];
const LOOKUP_STEPS = ['Tap the button below', 'Under Call Identification, switch Loop Me on'];

export default function SetupScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const [calls, setCalls] = useState<'enabled' | 'disabled' | 'unknown'>('unknown');
  const [lookup, setLookup] = useState<CallerIdStatus>('unavailable');
  const refresh = () => { callDirectoryStatus().then(setCalls).catch(() => {}); callerIdStatus().then(setLookup).catch(() => {}); };
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', st => { if (st === 'active') refresh(); });
    return () => sub.remove();
  }, []);
  const textsOn = ctx.tallies.filtered > 0;
  const callsOn = calls === 'enabled';
  const lookupOn = lookup === 'enabled';
  const total = lookup === 'unavailable' ? 2 : 3;
  const on = [textsOn, callsOn, lookup !== 'unavailable' && lookupOn].filter(Boolean).length;
  const who = firstName(loopPerson(s)?.name);

  return (
    <Screen C={C} playKey="setup">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <BackLink label="Settings" onPress={() => ctx.go('settings')} />
        <ScreenTitle C={C}>Turn on scam protection</ScreenTitle>
        <Lead C={C}>{total === 2 ? 'Two switches' : 'Three switches'} in your iPhone’s Settings. Apple only lets you turn them on yourself, so here’s exactly where they are.</Lead>
        <Text style={[font(15, '600'), { color: T.green, paddingHorizontal: 20, paddingTop: 12 }]} allowFontScaling>{on} of {total} switched on</Text>

        <PermCard C={C} Icon={MessageCircle} title="Unknown texts" on={textsOn} steps={TEXT_STEPS} onOpen={() => Linking.openSettings()} first
          foot={!textsOn ? 'Turns green once the first text from a stranger is checked.' : undefined} />
        <PermCard C={C} Icon={Phone} title="Scam callers" on={callsOn} steps={CALL_STEPS} onOpen={() => Linking.openSettings()} />
        {lookup !== 'unavailable' && (
          <PermCard C={C} Icon={PhoneIncoming} title="Who is calling" on={lookupOn} steps={LOOKUP_STEPS} onOpen={() => { callerIdOpenSettings().then(ok => { if (!ok) Linking.openSettings(); }); }} />
        )}

        {on === total && (
          <View style={[st.card, { backgroundColor: T.green }]}>
            <Text style={[font(20, '700'), { color: '#fff' }]} allowFontScaling>You’re fully protected.</Text>
            <Text style={[font(16, '400', 1.4), { color: '#fff', marginTop: 6 }]} allowFontScaling>Scam texts and calls are now stopped before they reach you.</Text>
          </View>
        )}
        <Note C={C} top={14}>Stuck? {who ? who + ' can walk you through it on the phone.' : 'Someone you trust can walk you through it on the phone.'}</Note>
      </ScrollView>
    </Screen>
  );
}

function PermCard({ C, Icon, title, on, steps, onOpen, first, foot }: { C: Ctx['C']; Icon: typeof Phone; title: string; on: boolean; steps: string[]; onOpen: () => void; first?: boolean; foot?: string }) {
  return (
    <View style={[st.card, { backgroundColor: C.card, marginTop: first ? 14 : 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[st.chip, { backgroundColor: on ? T.green : T.amber }]}><Icon size={20} color="#fff" strokeWidth={2} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[font(19, '700'), { color: C.ink }]} allowFontScaling>{title}</Text>
          <Text style={[font(15, '500'), { color: on ? T.green : T.redText, marginTop: 1 }]} allowFontScaling>{on ? 'On' : 'Off'}</Text>
        </View>
      </View>
      <View style={{ marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.sep }}>
        {steps.map((t, i) => (
          <View key={t} style={[{ flexDirection: 'row', gap: 14, paddingVertical: 11 }, i < steps.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep2 }]}>
            <Text style={[font(15, '700'), { color: C.ink, width: 12 }]} allowFontScaling>{i + 1}</Text>
            <Text style={[font(16, '400', 1.35), { color: C.ink, flex: 1 }]} allowFontScaling>{t}</Text>
          </View>
        ))}
      </View>
      {on ? (
        <View style={[st.btn, { backgroundColor: C.greenTint }]}>
          <Check size={18} color={T.green} strokeWidth={2.4} />
          <Text style={[font(17, '600'), { color: T.green }]} allowFontScaling>Switched on</Text>
        </View>
      ) : (
        <Pressable onPress={onOpen} style={({ pressed }) => [st.btn, { backgroundColor: T.green }, pressed && { opacity: 0.8 }]} accessibilityRole="button">
          <Text style={[font(17, '600'), { color: '#fff' }]} allowFontScaling>Open Settings</Text>
          <ChevronRight size={18} color="#fff" strokeWidth={2.4} />
        </Pressable>
      )}
      {!!foot && <Text style={[font(14, '400', 1.4), { color: C.ink2, marginTop: 10 }]} allowFontScaling>{foot}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 20, padding: 16 },
  chip: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  btn: { height: 52, borderRadius: 26, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
