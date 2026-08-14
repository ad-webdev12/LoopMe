// Onboarding — source lines 122-209. Ob1 whose phone · Ob2 caregiver name/rel ·
// Ob3 privacy · Ob4 trusted person. Copy verbatim; contacts picker is real.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Contacts from 'expo-contacts';
import { ChevronRight, ArrowRight, Shield, Check, Plus } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import type { Ctx } from '../App';

function Kicker({ text, amber }: { text: string; amber?: boolean }) {
  return <Text style={[k.kicker, amber && { color: T.amber }]} allowFontScaling>{text}</Text>;
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
  kicker: { fontSize: 10, fontFamily: F.semibold, letterSpacing: 1.8, textTransform: 'uppercase', color: T.green, marginBottom: 12, lineHeight: 10 },
  title: { fontSize: 27, fontFamily: F.display, letterSpacing: -0.54, color: T.ink, lineHeight: 29.16 },
  cta: { height: 56, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  ctaText: { fontSize: 16.5, fontFamily: F.bold, color: '#fff' },
});

// ---------------- Ob1 — Whose phone is this? ----------------
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
      <View style={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 18 }}>
        <Kicker text="Setting up · 1 of 3" />
        <Title text="Whose phone is this?" />
      </View>
      <View style={{ paddingHorizontal: 22, gap: 10 }}>
        <Choice title="It’s mine" bold body="Set it up the way I want it."
          onPress={() => { ctx.update({ ...ctx.settings, role: 'elder', careName: '' }); ctx.go('ob3'); }} />
        <Choice title="I’m setting it up for someone" bold amber body="A parent or grandparent. Two minutes."
          onPress={() => { ctx.update({ ...ctx.settings, role: 'elder' }); ctx.go('ob2'); }} />
        <Choice title="I look after someone" body="They keep their own phone. I get told when something looks wrong."
          onPress={() => ctx.go('watch')} />
      </View>
      <View style={s1.reassure}>
        <Shield size={18} color={T.green} strokeWidth={1.9} style={{ marginTop: 1 }} />
        <Text style={s1.reassureText} allowFontScaling>No account, no password. Nothing you enter leaves this phone.</Text>
      </View>
    </View>
    </KFIn>
  );
}
const s1 = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  choice: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface,
    borderWidth: 1, borderColor: T.hairline, borderRadius: 14, padding: 18,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  choiceTitle: { fontSize: 17, fontFamily: F.display, color: T.ink },
  choiceBody: { fontSize: 13.5, fontFamily: F.body, color: T.sub, lineHeight: 19.6, marginTop: 3 },
  reassure: { marginHorizontal: 22, marginTop: 22, backgroundColor: T.greenTint, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', gap: 11 },
  reassureText: { flex: 1, fontSize: 13, fontFamily: F.body, color: T.green, lineHeight: 19.5 },
});

// ---------------- Ob2 — Who is this phone for? (caregiver) ----------------
export function Ob2({ ctx }: { ctx: Ctx }) {
  const [name, setName] = useState(ctx.settings.careName || 'Ruth');
  const [rel, setRel] = useState(ctx.settings.careRel || 'Mother');
  return (
    <KFIn duration={300} style={{ flex: 1 }} playKey="ob2">
    <View style={s1.root}>
      <View style={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 18 }}>
        <Kicker text="Setting up for someone · 2 of 3" amber />
        <Title text="Who is this phone for?" />
      </View>
      <View style={s2.card}>
        <View>
          <Text style={s2.fieldLabel} allowFontScaling>Their first name</Text>
          <TextInput style={s2.input} value={name} onChangeText={setName} accessibilityLabel="Their first name" />
        </View>
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
      </View>
      <Text style={s2.note} allowFontScaling>Nothing here is hidden from them. They see every setting you choose and can switch anything off.</Text>
      <View style={{ marginTop: 'auto', paddingHorizontal: 22, paddingBottom: 30 }}>
        <CTA label="Continue" onPress={() => { ctx.update({ ...ctx.settings, careName: name.trim() || 'Ruth', careRel: rel }); ctx.go('ob3'); }} />
      </View>
    </View>
    </KFIn>
  );
}
const s2 = StyleSheet.create({
  card: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
    borderRadius: 14, padding: 18, gap: 18,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  fieldLabel: { fontSize: 10, fontFamily: F.semibold, letterSpacing: 1.4, textTransform: 'uppercase', color: T.sub, marginBottom: 7 },
  input: { height: 48, borderWidth: 1, borderColor: '#c9c9c4', backgroundColor: T.ground, paddingHorizontal: 14, fontSize: 16, fontFamily: F.body, color: T.ink },
  rel: { flex: 1, height: 44, borderWidth: 1, borderColor: T.fieldBorder, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  relOn: { backgroundColor: T.greenTint, borderColor: T.green },
  relText: { fontSize: 13.5, fontFamily: F.bold, color: T.sub },
  note: { marginHorizontal: 22, marginTop: 18, fontSize: 13.5, fontFamily: F.body, color: T.sub, lineHeight: 20.9 },
});

// ---------------- Ob3 — Nothing leaves this phone ----------------
export function Ob3({ ctx }: { ctx: Ctx }) {
  const care = !!ctx.settings.careName;
  const rows = [
    'Messages are checked right here, with no internet needed.',
    'No account, no password, nothing kept once you close a check.',
    'A message is shared only if you choose to loop someone in.',
  ];
  return (
    <KFIn duration={300} style={{ flex: 1 }} playKey="ob3">
    <View style={s1.root}>
      <View style={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 18 }}>
        <Kicker text={care ? 'Setting up · 3 of 3' : 'Setting up · 2 of 3'} />
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
      <View style={{ marginTop: 'auto', paddingHorizontal: 22, paddingBottom: 30 }}>
        <CTA label="Continue" onPress={() => ctx.go('ob4')} />
      </View>
    </View>
    </KFIn>
  );
}
const s3 = StyleSheet.create({
  card: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  row: { flexDirection: 'row', gap: 13, paddingHorizontal: 17, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  num: { color: T.green, fontSize: 13, fontFamily: F.bold, width: 14 },
  text: { flex: 1, fontSize: 14.5, fontFamily: F.body, color: T.ink, lineHeight: 21.75 },
});

// ---------------- Ob4 — Who should we loop in? ----------------
export function Ob4({ ctx }: { ctx: Ctx }) {
  const care = !!ctx.settings.careName;
  const first = ctx.settings.trusted[0];
  const addFromContacts = async () => {
    try {
      const { granted } = await Contacts.requestPermissionsAsync();
      if (!granted) { ctx.flash('Opens your contacts to pick one person.'); return; }
      const picked = await Contacts.presentContactPickerAsync();
      const num = picked?.phoneNumbers?.[0]?.number;
      if (picked?.name && num) {
        ctx.update({ ...ctx.settings, trusted: [{ name: picked.name, phone: num }, ...ctx.settings.trusted].slice(0, 3) });
      }
    } catch { ctx.flash('Opens your contacts to pick one person.'); }
  };
  return (
    <KFIn duration={300} style={{ flex: 1 }} playKey="ob4">
    <View style={s1.root}>
      <View style={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 18 }}>
        <Kicker text={care ? 'Last step' : 'Setting up · 3 of 3'} />
        <Title text="Who should we loop in?" />
        <Text style={s4.sub} allowFontScaling>One person is plenty. When something worries you, one tap tells them.</Text>
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
      <View style={{ marginTop: 'auto', paddingHorizontal: 22, paddingBottom: 30 }}>
        <CTA label="Done, start checking" onPress={() => { ctx.update({ ...ctx.settings, introSeen: true, role: 'elder' }); ctx.go('home'); }} />
      </View>
    </View>
    </KFIn>
  );
}
const s4 = StyleSheet.create({
  sub: { fontSize: 14.5, fontFamily: F.body, color: T.sub, lineHeight: 22.5, marginTop: 10 },
  addRow: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14,
    paddingHorizontal: 17, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 13,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  addIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.greenTint, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 15.5, fontFamily: F.bold, color: T.ink },
  picked: { marginHorizontal: 22, marginTop: 10, backgroundColor: T.greenTint, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pickedAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  pickedInitials: { color: '#fff', fontSize: 13, fontFamily: F.bold },
  pickedName: { fontSize: 15, fontFamily: F.bold, color: T.ink },
  pickedMeta: { fontSize: 13, fontFamily: F.body, color: T.sub },
});
