// Setup, three or four short screens on the app's own primitives.
// Ob1 which phone · Ob2 whose phone (caregiver) · Ob3 what stays here ·
// Ob4 the one person to tell. The contacts picker and the invite are real.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Contacts from 'expo-contacts';
import { ArrowRight, Check, Plus, Send, Smartphone, Users } from 'lucide-react-native';
import * as Family from '../lib/family';
import { sendSms, inviteText } from '../lib/familyLink';
import { ensureNotificationPermission } from '../lib/notify';
import { T, font } from '../theme';
import { Screen, ScreenTitle, Lead, Card, Row, Group, Pill, Segmented, Note, TextBtn } from '../ui/base';
import { PermCard, TEXT_STEPS, CALL_STEPS, TEXT_FRAMES, TEXT_CAPTIONS, CALL_FRAMES, CALL_CAPTIONS } from './SetupScreen';
import { callDirectoryStatus } from '../../modules/scam-ai';
import { AppState, Linking } from 'react-native';
import { MessageCircle, Phone } from 'lucide-react-native';
import { pickTrustedPerson, samePhone } from '../lib/contacts';
import type { Ctx } from '../App';

function Steps({ ctx, i, of }: { ctx: Ctx; i: number; of: number }) {
  const { C } = ctx;
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {Array.from({ length: of }).map((_, k) => <View key={k} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: k < i ? T.green : (C.dark ? '#3a3a3c' : '#d1d1d6') }} />)}
      </View>
      <Text style={[font(15, '600'), { color: C.ink, marginTop: 10 }]} allowFontScaling>Step {i} of {of}</Text>
    </View>
  );
}
function Bottom({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={{ marginTop: 'auto', paddingHorizontal: 16, paddingBottom: 34, paddingTop: 16 }}>
      <Pill label={label} onPress={onPress} trailing={<ArrowRight size={18} color="#fff" strokeWidth={2.2} />} />
    </View>
  );
}

// ---------------- Ob1: which phone is this? ----------------
export function Ob1({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  return (
    <Screen C={C} playKey="ob1">
      <Steps ctx={ctx} i={1} of={5} />
      <ScreenTitle C={C} top={18}>Which phone is this?</ScreenTitle>
      <Lead C={C}>Loop Me works in pairs. One phone is protected. One phone hears about it.</Lead>
      <Group C={C} style={{ marginHorizontal: 16, marginTop: 22 }}>
        <View style={{ paddingLeft: 16 }}>
          <Row C={C} chip={Smartphone} title="The phone to protect" sub="This is the phone that gets the texts." chevron titleWeight="600"
            onPress={() => { ctx.update({ ...ctx.settings, role: 'elder' }); ctx.go('ob2'); }} />
          <Row C={C} chip={Users} title="The phone that hears about it" sub="Someone else’s phone is protected. This one gets the alerts." chevron titleWeight="600" last
            onPress={() => ctx.go('watch')} />
        </View>
      </Group>
      <Note C={C} top={16}>Both? Pick the first. You can add the second later from Settings.</Note>
    </Screen>
  );
}

// ---------------- Ob2: whose phone is it? ----------------
export function Ob2({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const [name, setName] = useState(ctx.settings.careName);
  const [rel, setRel] = useState(ctx.settings.careRel || 'Mother');
  const [whose, setWhose] = useState<'mine' | 'theirs'>(ctx.settings.careName ? 'theirs' : 'mine');
  const [me, setMe] = useState(ctx.settings.myName);
  return (
    <Screen C={C} playKey="ob2">
      <Steps ctx={ctx} i={2} of={whose === 'theirs' ? 6 : 5} />
      <ScreenTitle C={C} top={18}>Whose phone is it?</ScreenTitle>
      <View style={{ marginTop: 22 }}>
        <Segmented C={C} options={['Mine', 'Someone I look after']} value={whose === 'mine' ? 'Mine' : 'Someone I look after'} onChange={v => setWhose(v === 'Mine' ? 'mine' : 'theirs')} />
      </View>
      {whose === 'mine' && (
        <Card C={C} style={{ marginHorizontal: 16, marginTop: 16 }} radius={16}>
          <Text style={[font(15, '600'), { color: C.ink, marginBottom: 8 }]} allowFontScaling>Your first name</Text>
          <TextInput style={[st.input, { backgroundColor: C.ground, color: C.ink }]} value={me} onChangeText={setMe} placeholder="First name" placeholderTextColor={C.ink2} accessibilityLabel="Your first name" />
          <Note C={C} top={10} style={{ paddingHorizontal: 0 }}>So the person you choose next knows who the alerts are about.</Note>
        </Card>
      )}
      {whose === 'theirs' && (
        <Card C={C} style={{ marginHorizontal: 16, marginTop: 16, gap: 16 }} radius={16}>
          <View>
            <Text style={[font(15, '600'), { color: C.ink, marginBottom: 8 }]} allowFontScaling>Their first name</Text>
            <TextInput style={[st.input, { backgroundColor: C.ground, color: C.ink }]} value={name} onChangeText={setName} placeholder="First name" placeholderTextColor={C.ink2} accessibilityLabel="Their first name" />
          </View>
          <View>
            <Text style={[font(15, '600'), { color: C.ink, marginBottom: 8 }]} allowFontScaling>They are your</Text>
            <Segmented C={C} options={['Mother', 'Father', 'Other']} value={rel} onChange={setRel} />
          </View>
          <Note C={C} top={0} style={{ paddingHorizontal: 0 }}>You are setting it up on their phone. They keep every setting.</Note>
        </Card>
      )}
      <Bottom label="Continue" onPress={() => {
        if (whose === 'mine') { ctx.update({ ...ctx.settings, careName: '', myName: me.trim() }); ctx.go('ob3'); return; }
        if (!name.trim()) { ctx.flash('Add their first name so alerts can use it.'); return; }
        ctx.update({ ...ctx.settings, careName: name.trim(), careRel: rel }); ctx.go('ob3');
      }} />
    </Screen>
  );
}

// ---------------- Ob3: what stays on this phone ----------------
export function Ob3({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const care = !!ctx.settings.careName;
  const rows = [
    'Messages are checked right here. No internet needed.',
    'No account. Your history stays on this phone.',
    'A message leaves only when you choose to ask someone about it.',
  ];
  return (
    <Screen C={C} playKey="ob3">
      <Steps ctx={ctx} i={3} of={care ? 6 : 5} />
      <ScreenTitle C={C} top={18}>Nothing leaves this phone.</ScreenTitle>
      <Group C={C} style={{ marginHorizontal: 16, marginTop: 22 }}>
        <View style={{ paddingLeft: 16 }}>
          {rows.map((r, i) => <Row key={i} C={C} title={r} last={i === rows.length - 1} pad={14} />)}
        </View>
      </Group>
      <Bottom label="Continue" onPress={() => ctx.go('ob4')} />
    </Screen>
  );
}

// ---------------- Ob4: who should hear about it? ----------------
export function Ob4({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const care = !!ctx.settings.careName;
  const first = ctx.settings.trusted[0];
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(ctx.settings.familyInvited);
  const firstName = first ? first.name.split(' ')[0] : '';
  const sendLink = async () => {
    if (!first) return;
    setSending(true);
    try {
      const url = await Family.invite(ctx.settings.myName || ctx.settings.careName);
      if (!url) { ctx.flash('iCloud is not signed in on this phone. You can send the invite later from Family.'); return; }
      await ensureNotificationPermission();
      ctx.update({ ...ctx.settings, familyInvited: true });
      setSent(true);
      await sendSms(first.phone, inviteText(ctx.settings.myName || ctx.settings.careName, url));
    } finally { setSending(false); }
  };
  const addFromContacts = async () => {
    try {
      const { granted } = await Contacts.requestPermissionsAsync();
      if (!granted) { ctx.flash('Opens your contacts to pick one person.'); return; }
      const res = await pickTrustedPerson();
      if (!res.ok) { if (res.reason) ctx.flash(res.reason); return; }
      const rest = ctx.settings.trusted.filter(x => !samePhone(x.phone, res.person.phone));
      ctx.update({ ...ctx.settings, trusted: [res.person, ...rest].slice(0, 3) });
      ctx.flash(res.person.name.split(' ')[0] + ' is saved.');
    } catch { ctx.flash('Your contacts could not be opened. Try again in a moment.'); }
  };
  return (
    <Screen C={C} playKey="ob4">
      <Steps ctx={ctx} i={4} of={care ? 6 : 5} />
      <ScreenTitle C={C} top={18}>Who should hear when a scam lands?</ScreenTitle>
      <Lead C={C}>{care ? 'Add yourself, then send the invite to your own number. Flagged texts will show up on your phone.' : 'They get one text with a link. Tapping it joins their phone to this one.'}</Lead>
      <Group C={C} style={{ marginHorizontal: 16, marginTop: 22 }}>
        <View style={{ paddingLeft: 16 }}>
          {first && (
            <Row C={C} title={firstName} sub={first.phone} titleWeight="600" right={<Check size={19} color={T.green} strokeWidth={2.4} />} />
          )}
          <Pressable onPress={addFromContacts} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingRight: 16 }, pressed && { opacity: 0.6 }]}>
            <View style={[st.plus, { borderColor: T.green }]}><Plus size={16} color={T.green} strokeWidth={2} /></View>
            <Text style={[font(17, '600'), { color: T.green }]} allowFontScaling>{first ? 'Choose someone else' : 'Choose from contacts'}</Text>
          </Pressable>
        </View>
      </Group>
      {first && (
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Pill label={sent ? 'Invite sent to ' + firstName : 'Send ' + firstName + ' the invite'} bg={sent ? C.card : T.green} color={sent ? T.green : '#fff'} disabled={sending || sent} onPress={sendLink}
            icon={sent ? <Check size={18} color={T.green} strokeWidth={2.4} /> : <Send size={18} color="#fff" strokeWidth={2.2} />} />
        </View>
      )}
      <Bottom label="Continue" onPress={() => ctx.go('ob5')} />
    </Screen>
  );
}

// ---------------- Ob5: turn on scam protection, with a way to come back later ----------------
export function Ob5({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const care = !!ctx.settings.careName;
  const [calls, setCalls] = useState<'enabled' | 'disabled' | 'unknown'>('unknown');
  const refresh = () => { callDirectoryStatus().then(setCalls).catch(() => {}); };
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', st => { if (st === 'active') refresh(); });
    return () => sub.remove();
  }, []);
  const textsOn = ctx.tallies.filtered > 0;
  const callsOn = calls === 'enabled';
  const done = textsOn && callsOn;
  const finish = async (later: boolean) => {
    // Full-screen warnings and the after-call nudge need this. Asked once, here.
    await ensureNotificationPermission().catch(() => {});
    if (care) { ctx.update({ ...ctx.settings, protectionLater: later }); ctx.go('ob6'); return; }
    ctx.update({ ...ctx.settings, introSeen: true, role: 'elder', protectionLater: later });
    ctx.go('home');
  };
  return (
    <Screen C={C} playKey="ob5">
      <Steps ctx={ctx} i={5} of={care ? 6 : 5} />
      <ScreenTitle C={C} top={18}>Turn on scam protection</ScreenTitle>
      <Lead C={C}>Two switches in iPhone Settings. Apple only lets you flip them yourself. Here is where they are.</Lead>
      <PermCard C={C} Icon={MessageCircle} title="Unknown texts" on={textsOn} steps={TEXT_STEPS} frames={TEXT_FRAMES} captions={TEXT_CAPTIONS} onOpen={() => Linking.openSettings()} first />
      <PermCard C={C} Icon={Phone} title="Scam callers" on={callsOn} steps={CALL_STEPS} frames={CALL_FRAMES} captions={CALL_CAPTIONS} onOpen={() => Linking.openSettings()} />
      <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 34, gap: 6 }}>
        <Pill label={done ? 'Continue' : 'Do this later'} bg={done ? T.green : C.card} color={done ? '#fff' : T.green} onPress={() => finish(!done)} trailing={done ? <ArrowRight size={18} color="#fff" strokeWidth={2.2} /> : undefined} />
      </View>
    </Screen>
  );
}

// ---------------- Ob6: the family secret word (setting up for someone else) ----------------
export function Ob6({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const [word, setWord] = useState(s.codeWord || '');
  const finish = (save: boolean) => {
    const w = word.trim();
    if (save && w.length < 3) { ctx.flash('Pick a word of three letters or more.'); return; }
    ctx.update({ ...s, introSeen: true, role: 'elder', ...(save ? { codeWord: w, codeWordSet: true } : {}) });
    ctx.go('home');
    ctx.flash('All set. Hand the phone back.');
  };
  return (
    <Screen C={C} playKey="ob6">
      <Steps ctx={ctx} i={6} of={6} />
      <ScreenTitle C={C} top={18}>Pick a family secret word</ScreenTitle>
      <Lead C={C}>If a caller sounds like family and asks for money, {s.careName ? firstNameOf(s.careName) + ' asks' : 'they ask'} for the word. A cloned voice won’t know it.</Lead>
      <Card C={C} style={{ marginHorizontal: 16, marginTop: 22 }} radius={16}>
        <TextInput value={word} onChangeText={setWord} autoCapitalize="words" autoCorrect={false} placeholder="One word" placeholderTextColor={C.ink2}
          style={[font(22, '600'), { color: C.ink, backgroundColor: C.ground, borderRadius: 12, padding: 14 }]} accessibilityLabel="Secret word" />
        <Note C={C} top={10} style={{ paddingHorizontal: 0 }}>Stays on this phone, behind Face ID in Settings.</Note>
      </Card>
      <View style={{ marginTop: 'auto', paddingHorizontal: 16, paddingBottom: 34, gap: 6 }}>
        <Pill label="Save and hand the phone back" onPress={() => finish(true)} trailing={<ArrowRight size={18} color="#fff" strokeWidth={2.2} />} />
        <TextBtn label="Skip for now" color={C.ink} onPress={() => finish(false)} />
      </View>
    </Screen>
  );
}
const firstNameOf = (n: string) => (n || '').split(' ')[0] || 'they';

const st = StyleSheet.create({
  input: { height: 50, borderRadius: 12, paddingHorizontal: 14, fontSize: 17 },
  plus: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
});
