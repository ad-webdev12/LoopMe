// Setup, three or four short screens on the app's own primitives.
// Ob1 which phone · Ob2 whose phone (caregiver) · Ob3 what stays here ·
// Ob4 the one person to tell. The contacts picker and the invite are real.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Contacts from 'expo-contacts';
import { ArrowRight, Check, Plus, Send, Smartphone, Users } from 'lucide-react-native';
import * as Family from '../lib/family';
import { sendSms, inviteText } from '../lib/familyLink';
import { ensureNotificationPermission } from '../lib/notify';
import { T, font } from '../theme';
import { Screen, ScreenTitle, Lead, Card, Row, Group, Pill, Avatar, Segmented, Note } from '../ui/base';
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
      <Steps ctx={ctx} i={1} of={3} />
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
  return (
    <Screen C={C} playKey="ob2">
      <Steps ctx={ctx} i={2} of={whose === 'theirs' ? 4 : 3} />
      <ScreenTitle C={C} top={18}>Whose phone is it?</ScreenTitle>
      <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
        <Segmented C={C} options={['Mine', 'Someone I look after']} value={whose === 'mine' ? 'Mine' : 'Someone I look after'} onChange={v => setWhose(v === 'Mine' ? 'mine' : 'theirs')} />
      </View>
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
        if (whose === 'mine') { ctx.update({ ...ctx.settings, careName: '' }); ctx.go('ob3'); return; }
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
      <Steps ctx={ctx} i={care ? 3 : 2} of={care ? 4 : 3} />
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
      <Steps ctx={ctx} i={care ? 4 : 3} of={care ? 4 : 3} />
      <ScreenTitle C={C} top={18}>Who should hear when a scam lands?</ScreenTitle>
      <Lead C={C}>They get one text with a link. Tapping it joins their phone to this one.</Lead>
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
      <Bottom label="Start checking" onPress={() => { ctx.update({ ...ctx.settings, introSeen: true, role: 'elder' }); ctx.go('home'); }} />
    </Screen>
  );
}

const st = StyleSheet.create({
  input: { height: 50, borderRadius: 12, paddingHorizontal: 14, fontSize: 17 },
  plus: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
});
