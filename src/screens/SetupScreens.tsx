// Onboarding: source lines 122-209. Ob1 whose phone · Ob2 caregiver name/rel ·
// Ob3 privacy · Ob4 trusted person. Copy verbatim; contacts picker is real.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Contacts from 'expo-contacts';
import { ChevronRight, ArrowRight, Check, Plus, Send } from 'lucide-react-native';
import * as Family from '../lib/family';
import { sendSms, inviteText } from '../lib/familyLink';
import { ensureNotificationPermission } from '../lib/notify';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import { pickTrustedPerson, samePhone } from '../lib/contacts';
import type { Ctx } from '../App';

function Kicker({ text, amber, step, of = 3 }: { text: string; amber?: boolean; step?: number; of?: number }) {
  return (
    <View style={k.kickerRow}>
      {step != null && (
        <View style={k.dots}>
          {Array.from({ length: of }).map((_, i) => (
            <View key={i} style={[k.dot, i < step && { backgroundColor: amber ? T.amber : T.green, width: i === step - 1 ? 22 : 8 }]} />
          ))}
        </View>
      )}
      <Text style={[k.kicker, amber && { color: T.amber }]} allowFontScaling>{text}</Text>
    </View>
  );
}
function Title({ text }: { text: string }) {
  return <Text style={k.title} allowFontScaling>{text}</Text>;
}
function CTA({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={k.cta} onPress={onPress} accessibilityRole="button">
      <Text style={k.ctaText} allowFontScaling>{label}</Text>
      <ArrowRight size={20} color="#fff" strokeWidth={2.2} />
    </Pressable>
  );
}
const k = StyleSheet.create({
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.hairline },
  kicker: { fontSize: 12, fontFamily: F.semibold, letterSpacing: 1.8, textTransform: 'uppercase', color: T.green, lineHeight: 14 },
  title: { fontSize: 31, fontFamily: F.display, letterSpacing: -0.7, color: T.ink, lineHeight: 34 },
  cta: { height: 60, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  ctaText: { fontSize: 17.5, fontFamily: F.bold, color: '#fff' },
});

// ---------------- Ob1: whose phone is this? ----------------
export function Ob1({ ctx }: { ctx: Ctx }) {
  const Choice = ({ title, body, amber, bold, onPress }: { title: string; body: string; amber?: boolean; bold?: boolean; onPress: () => void }) => (
    <Pressable style={s1.choice} onPress={onPress} accessibilityRole="button">
      <View style={{ flex: 1 }}>
        <Text style={[s1.choiceTitle, !bold && { fontFamily: F.bold }]} allowFontScaling>{title}</Text>
        <Text style={s1.choiceBody} allowFontScaling>{body}</Text>
      </View>
      <ChevronRight size={18} color={amber ? T.amber : T.green} strokeWidth={2.2} />
    </Pressable>
  );
  return (
    <KFIn duration={300} style={{ flex: 1 }} playKey="ob1">
    <View style={s1.root}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 18 }}>
        <Kicker text="Setting up" step={1} />
        <Title text="Which phone is this?" />
        <Text style={s1.lead} allowFontScaling>Loop Me works in pairs. One phone is protected. One phone hears about it.</Text>
      </View>
      <View style={{ paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: T.hairline }}>
        <Choice title="The phone to protect" bold body="This is the phone that gets the texts. Scams are caught here."
          onPress={() => { ctx.update({ ...ctx.settings, role: 'elder' }); ctx.go('ob2'); }} />
        <Choice title="The phone that hears about it" bold body="Someone else’s phone is protected. This one gets the alerts."
          onPress={() => ctx.go('watch')} />
      </View>
      <Text style={s1.reassureText} allowFontScaling>Protecting your own phone and watching someone else’s? Pick the first. You can add the second later from More.</Text>
    </View>
    </KFIn>
  );
}
const s1 = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  choice: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: T.hairline, paddingVertical: 18, paddingHorizontal: 0,
  },
  choiceTitle: { fontSize: 17, fontFamily: F.display, color: T.ink },
  choiceBody: { fontSize: 15.5, fontFamily: F.body, color: T.sub, lineHeight: 22.5, marginTop: 3 },
  reassureText: { marginHorizontal: 24, marginTop: 22, fontSize: 15.5, fontFamily: F.body, color: T.sub, lineHeight: 23 },
  lead: { marginTop: 10, fontSize: 17, fontFamily: F.body, color: T.sub, lineHeight: 26 },
});

// ---------------- Ob2: who is this phone for? (caregiver) ----------------
export function Ob2({ ctx }: { ctx: Ctx }) {
  const [name, setName] = useState(ctx.settings.careName);
  const [rel, setRel] = useState(ctx.settings.careRel || 'Mother');
  const [whose, setWhose] = useState<'mine' | 'theirs'>(ctx.settings.careName ? 'theirs' : 'mine');
  return (
    <KFIn duration={300} style={{ flex: 1 }} playKey="ob2">
    <View style={s1.root}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 18 }}>
        <Kicker text="Setting up" step={2} of={4} />
        <Title text="Whose phone is it?" />
      </View>
      <View style={s2.card}>
        <View style={{ flexDirection: 'row', gap: 7 }}>
          {([['mine', 'Mine'], ['theirs', 'Someone I look after']] as const).map(([v, label]) => (
            <Pressable key={v} style={[s2.rel, whose === v && s2.relOn]} onPress={() => setWhose(v)} accessibilityRole="button">
              <Text style={[s2.relText, whose === v && { color: T.green }]} allowFontScaling>{label}</Text>
            </Pressable>
          ))}
        </View>
        {whose === 'theirs' && (
          <View>
            <Text style={s2.fieldLabel} allowFontScaling>Their first name</Text>
            <TextInput style={s2.input} value={name} onChangeText={setName} placeholder="First name" placeholderTextColor={T.muted} accessibilityLabel="Their first name" />
          </View>
        )}
        {whose === 'theirs' && (
          <View>
            <Text style={s2.fieldLabel} allowFontScaling>They are your</Text>
            <View style={{ flexDirection: 'row', gap: 7 }}>
              {['Mother', 'Father', 'Other'].map(r => (
                <Pressable key={r} style={[s2.rel, rel === r && s2.relOn]} onPress={() => setRel(r)} accessibilityRole="button">
                  <Text style={[s2.relText, rel === r && { color: T.green }]} allowFontScaling>{r}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
      <Text style={s2.note} allowFontScaling>{whose === 'theirs' ? 'You are setting it up on their phone. They keep every setting.' : 'Two more steps.'}</Text>
      <View style={{ marginTop: 'auto', paddingHorizontal: 24, paddingBottom: 30 }}>
        <CTA label="Continue" onPress={() => {
          if (whose === 'mine') { ctx.update({ ...ctx.settings, careName: '' }); ctx.go('ob3'); return; }
          if (!name.trim()) { ctx.flash('Add their first name so alerts and notes can use it.'); return; }
          ctx.update({ ...ctx.settings, careName: name.trim(), careRel: rel }); ctx.go('ob3');
        }} />
      </View>
    </View>
    </KFIn>
  );
}
const s2 = StyleSheet.create({
  card: { marginHorizontal: 24, gap: 22 },
  fieldLabel: { fontSize: 15.5, fontFamily: F.body, color: T.sub, marginBottom: 8 },
  input: { height: 48, borderWidth: 1, borderColor: '#c9c9c4', backgroundColor: T.ground, paddingHorizontal: 14, fontSize: 17, fontFamily: F.body, color: T.ink },
  rel: { flex: 1, height: 44, borderWidth: 1, borderColor: T.fieldBorder, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  relOn: { backgroundColor: T.greenTint, borderColor: T.green },
  relText: { fontSize: 15.5, fontFamily: F.bold, color: T.sub },
  note: { marginHorizontal: 24, marginTop: 18, fontSize: 15.5, fontFamily: F.body, color: T.sub, lineHeight: 24 },
});

// ---------------- Ob3: nothing leaves this phone ----------------
export function Ob3({ ctx }: { ctx: Ctx }) {
  const care = !!ctx.settings.careName;
  const rows = [
    'Messages are checked right here, with no internet needed.',
    'No account. Your history stays on this phone.',
    'A message is shared only if you choose to loop someone in.',
  ];
  return (
    <KFIn duration={300} style={{ flex: 1 }} playKey="ob3">
    <View style={s1.root}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 18 }}>
        <Kicker text="Setting up" step={care ? 3 : 2} of={care ? 4 : 3} />
        <Title text="Nothing leaves this phone." />
      </View>
      <View style={s3.card}>
        {rows.map((r, i) => (
          <View key={i} style={[s3.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={s3.num} allowFontScaling>{i + 1}</Text>
            <Text style={s3.text} allowFontScaling>{r}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 'auto', paddingHorizontal: 24, paddingBottom: 30 }}>
        <CTA label="Continue" onPress={() => ctx.go('ob4')} />
      </View>
    </View>
    </KFIn>
  );
}
const s3 = StyleSheet.create({
  card: {
    marginHorizontal: 24, borderTopWidth: 1, borderTopColor: T.hairline,
  },
  row: { flexDirection: 'row', gap: 13, paddingHorizontal: 17, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.hairline },
  num: { color: T.green, fontSize: 15, fontFamily: F.bold, width: 14 },
  text: { flex: 1, fontSize: 17, fontFamily: F.body, color: T.ink, lineHeight: 25.5 },
});

// ---------------- Ob4: who should we loop in? ----------------
export function Ob4({ ctx }: { ctx: Ctx }) {
  const care = !!ctx.settings.careName;
  const first = ctx.settings.trusted[0];
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(ctx.settings.familyInvited);
  // The link, sent from the last step of setup: the one thing that makes the
  // app worth keeping. Quiet failure when iCloud is off; the person can do it
  // later from More.
  const sendLink = async () => {
    if (!first) return;
    setSending(true);
    try {
      const url = await Family.invite(ctx.settings.myName || ctx.settings.careName);
      if (!url) { ctx.flash('iCloud is not signed in on this phone. You can send the link later from More.'); return; }
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
    } catch { ctx.flash('Your contacts could not be opened. You can try again in a moment.'); }
  };
  return (
    <KFIn duration={300} style={{ flex: 1 }} playKey="ob4">
    <View style={s1.root}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 18 }}>
        <Kicker text="Last step" step={care ? 4 : 3} of={care ? 4 : 3} />
        <Title text="Who should hear when a scam lands?" />
        <Text style={s4.sub} allowFontScaling>They get one text with a link. Tapping it joins their phone to this one. No Loop Me yet on their side? The link takes them to the App Store first.</Text>
      </View>
      <Pressable style={s4.addRow} onPress={addFromContacts} accessibilityRole="button">
        <View style={s4.addIcon}><Plus size={18} color={T.green} strokeWidth={2} /></View>
        <Text style={s4.addText} allowFontScaling>Choose from contacts</Text>
      </Pressable>
      {first && (
        <View style={s4.picked}>
          <View style={s4.pickedAvatar}><Text style={s4.pickedInitials} allowFontScaling>{first.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s4.pickedName} allowFontScaling>{first.name.split(' ')[0]}</Text>
            <Text style={s4.pickedMeta} allowFontScaling>{first.phone}</Text>
          </View>
          <Check size={19} color={T.green} strokeWidth={2.4} />
        </View>
      )}
      {first && (
        <Pressable style={[s4.linkBtn, (sending || sent) && { opacity: sent ? 0.7 : 0.6 }]} onPress={sendLink} disabled={sending} accessibilityRole="button">
          <View style={{ flex: 1 }}>
            <Text style={s4.linkTitle} allowFontScaling>{sent ? 'Invite sent to ' + first.name.split(' ')[0] : 'Send ' + first.name.split(' ')[0] + ' the invite'}</Text>
            <Text style={s4.linkSub} allowFontScaling>{sent ? 'Done the moment they tap it.' : 'The only text Loop Me ever sends.'}</Text>
          </View>
          {sent ? <Check size={20} color="#fff" strokeWidth={2.4} /> : <Send size={20} color="#fff" strokeWidth={2.2} />}
        </Pressable>
      )}
      <View style={{ marginTop: 'auto', paddingHorizontal: 24, paddingBottom: 30 }}>
        <CTA label="Done, start checking" onPress={() => { ctx.update({ ...ctx.settings, introSeen: true, role: 'elder' }); ctx.go('home'); }} />
      </View>
    </View>
    </KFIn>
  );
}
const s4 = StyleSheet.create({
  sub: { fontSize: 17, fontFamily: F.body, color: T.sub, lineHeight: 26.4, marginTop: 10 },
  addRow: {
    marginHorizontal: 24, borderTopWidth: 1, borderTopColor: T.hairline,
    paddingHorizontal: 17, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 13,
  },
  addIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.greenTint, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 17, fontFamily: F.bold, color: T.ink },
  picked: { marginHorizontal: 24, marginTop: 10, backgroundColor: T.greenTint, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pickedAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  pickedInitials: { color: '#fff', fontSize: 15, fontFamily: F.bold },
  pickedName: { fontSize: 17, fontFamily: F.bold, color: T.ink },
  linkBtn: { marginHorizontal: 24, marginTop: 10, backgroundColor: T.green, borderRadius: 14, paddingHorizontal: 17, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkTitle: { fontSize: 17, fontFamily: F.bold, color: '#fff' },
  linkSub: { fontSize: 14.5, fontFamily: F.body, color: '#fff', lineHeight: 20, marginTop: 2 },
  pickedMeta: { fontSize: 15, fontFamily: F.body, color: T.sub },
});
