// Turn on scam protection. Two switches that live in iPhone Settings, with
// the exact path, live on/off state, and Open Settings. On iOS 18 a third
// card for Who is calling.
import React, { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MessageCircle, Phone, ChevronRight, Check, PhoneIncoming } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, ScreenTitle, Lead, Note } from '../ui/base';
import { PermFrames, Frame } from '../ui/PermFrames';
import { callDirectoryStatus, callerIdStatus, callerIdOpenSettings, CallerIdStatus } from '../../modules/scam-ai';
import { loopPerson, firstName } from '../ui/pieces';
import type { Ctx } from '../App';

const SETTINGS_APPS = { image: require('../../assets/perm/settings-apps.png') };
export const TEXT_FRAMES: Frame[] = [
  SETTINGS_APPS,
  { image: require('../../assets/perm/apps-messages.png') },
  { page: 'Messages', rows: [{ label: 'Send as Text Message', on: true }, { label: 'Unknown & Spam', chevron: true, hit: true }, { label: 'Message Filtering', chevron: true }] },
  { page: 'Unknown & Spam', rows: [{ label: 'Filter Unknown Senders', on: true }, { label: 'SMS Filtering', header: true }, { label: 'None' }, { label: 'Loop Me', sub: 'Checks texts from strangers on this phone', hit: true }] },
];
export const TEXT_CAPTIONS = ['Settings, then Apps', 'Messages', 'Unknown & Spam', 'Under SMS Filtering, tap Loop Me'];
export const CALL_FRAMES: Frame[] = [
  SETTINGS_APPS,
  { page: 'Apps', rows: [{ label: 'Passwords', chevron: true }, { label: 'Phone', chevron: true, hit: true }, { label: 'Photos', chevron: true }] },
  { page: 'Phone', rows: [{ label: 'Silence Unknown Callers', chevron: true }, { label: 'Call Blocking & Identification', chevron: true, hit: true }, { label: 'SMS/Call Reporting', chevron: true }] },
  { page: 'Call Blocking & Identification', rows: [{ label: 'Allow these apps to block calls and provide caller ID', header: true }, { label: 'Loop Me', on: true, hit: true }] },
];
export const CALL_CAPTIONS = ['Settings, then Apps', 'Phone', 'Call Blocking & Identification', 'Switch Loop Me on'];
// Live Caller ID Lookup (the "Who is calling" card) needs the lookup service
// in server/callerid hosted and onboarded with Apple. The card shows only when
// this iPhone supports the feature AND the service answers, so it appears on
// its own the day the server goes live and never offers a dead switch.
const LOOKUP_URL = 'https://lookup.loopmescamsafety.app/.well-known/private-token-issuer-directory';
let lookupLiveCache: boolean | null = null;
export async function lookupServiceLive(): Promise<boolean> {
  if (lookupLiveCache != null) return lookupLiveCache;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(LOOKUP_URL, { method: 'GET', signal: ctl.signal });
    clearTimeout(t);
    lookupLiveCache = r.ok;
  } catch { lookupLiveCache = false; }
  return lookupLiveCache;
}
export const TEXT_STEPS = ['Open Settings', 'Scroll down, tap Apps', 'Tap Messages', 'Tap Unknown & Spam', 'Under SMS Filtering, tap Loop Me'];
export const CALL_STEPS = ['Open Settings', 'Scroll down, tap Apps', 'Tap Phone', 'Tap Call Blocking & Identification', 'Switch Loop Me on'];
const LOOKUP_STEPS = ['Tap the button below', 'Under Call Identification, switch Loop Me on'];

export default function SetupScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const [calls, setCalls] = useState<'enabled' | 'disabled' | 'unknown'>('unknown');
  const [lookup, setLookup] = useState<CallerIdStatus>('unavailable');
  const refresh = () => { callDirectoryStatus().then(setCalls).catch(() => {}); lookupServiceLive().then(live => { if (live) callerIdStatus().then(setLookup).catch(() => {}); }); };
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
        <BackLink onPress={ctx.back} />
        <ScreenTitle C={C}>Turn on scam protection</ScreenTitle>
        <Lead C={C}>{total === 2 ? 'Two switches' : 'Three switches'} in your iPhone’s Settings. Apple only lets you turn them on yourself, so here’s exactly where they are.</Lead>
        <Text style={[font(15, '600'), { color: T.green, paddingHorizontal: 20, paddingTop: 12 }]} allowFontScaling>{on} of {total} switched on</Text>

        <PermCard C={C} Icon={MessageCircle} title="Unknown texts" on={textsOn} steps={TEXT_STEPS} frames={TEXT_FRAMES} captions={TEXT_CAPTIONS} onOpen={() => Linking.openSettings()} first
          foot={!textsOn ? 'Turns green once the first text from a stranger is checked.' : undefined} />
        <PermCard C={C} Icon={Phone} title="Scam callers" on={callsOn} steps={CALL_STEPS} frames={CALL_FRAMES} captions={CALL_CAPTIONS} onOpen={() => Linking.openSettings()} />
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

export function PermCard({ C, Icon, title, on, steps, frames, captions, onOpen, first, foot }: { C: Ctx['C']; Icon: typeof Phone; title: string; on: boolean; steps: string[]; frames?: Frame[]; captions?: string[]; onOpen: () => void; first?: boolean; foot?: string }) {
  return (
    <View style={[st.card, { backgroundColor: C.card, marginTop: first ? 14 : 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[st.chip, { backgroundColor: on ? T.green : T.amber }]}><Icon size={20} color="#fff" strokeWidth={2} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[font(19, '700'), { color: C.ink }]} allowFontScaling>{title}</Text>
          <Text style={[font(15, '500'), { color: on ? T.green : C.redText, marginTop: 1 }]} allowFontScaling>{on ? 'On' : 'Off'}</Text>
        </View>
      </View>
      {!on && frames && captions && <PermFrames C={C} frames={frames} captions={captions} />}
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
          <Check size={18} color={C.accent} strokeWidth={2.4} />
          <Text style={[font(17, '600'), { color: C.accent }]} allowFontScaling>Switched on</Text>
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
