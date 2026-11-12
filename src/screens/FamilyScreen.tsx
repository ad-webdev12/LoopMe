// Family. The person who hears about every scam as a hero card (Contacts
// photo, name, relationship, status, Call · Message · Ask), the rest of the
// loop as a list, then "See what they see" and "Set up for someone else".
import React, { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Phone, MessageCircle, Send, Plus, Smartphone, HandHeart, ChevronRight, ArrowRight } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, LargeTitle, Avatar, Note, Pill } from '../ui/base';
import { loopPerson, firstName } from '../ui/pieces';
import { pickTrustedPerson, samePhone } from '../lib/contacts';
import type { TrustedPerson } from '../lib/storage';
import type { Ctx } from '../App';

const RELATIONS = ['Daughter', 'Son', 'Partner', 'Sister', 'Brother', 'Friend', 'Carer', 'Other'];

export default function FamilyScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const person = loopPerson(s);
  const who = firstName(person?.name);
  const others = s.trusted.filter(t => t.name !== person?.name);
  const [pending, setPending] = useState<TrustedPerson | null>(null);
  const tel = (p: string) => Linking.openURL('tel:' + p.replace(/[^\d+]/g, '')).catch(() => {});
  const sms = (p: string) => Linking.openURL('sms:' + p.replace(/[^\d+]/g, '')).catch(() => {});

  const add = async () => {
    if (s.trusted.length >= 3) { ctx.flash('Up to three people is plenty. Remove one to add another.'); return; }
    const res = await pickTrustedPerson();
    if (!res.ok) { if (res.reason) ctx.flash(res.reason); return; }
    if (s.trusted.some(t => samePhone(t.phone, res.person.phone))) { ctx.flash(firstName(res.person.name) + ' is already in your loop.'); return; }
    setPending(res.person);
  };
  const saveWithRelation = (relation: string) => {
    if (!pending) return;
    ctx.update({ ...s, trusted: [...s.trusted, { ...pending, relation }] });
    setPending(null);
  };
  const remove = (p: TrustedPerson) => ctx.update({ ...s, trusted: s.trusted.filter(t => t.phone !== p.phone) });

  const status = person?.linked ? 'Hears about every scam you get' : s.familyInvited ? 'Invite sent. Waiting for a tap.' : 'Not linked yet';

  return (
    <Screen C={C} playKey="family">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <LargeTitle C={C}>Family</LargeTitle>

        {person ? (
          <View style={[st.hero, { backgroundColor: C.card }]}>
            <Avatar name={person.name} photo={person.photo} size={104} />
            <Text style={[font(24, '700'), { color: C.ink, marginTop: 12 }]} allowFontScaling>{person.name}</Text>
            {!!person.relation && <Text style={[font(16, '400'), { color: C.ink2, marginTop: 3 }]} allowFontScaling>{person.relation}</Text>}
            <Pressable onPress={() => !person.linked && ctx.go('watchedBy')} style={[st.chip, { backgroundColor: person.linked ? C.greenTint : C.amberTint }]} accessibilityRole="button">
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: person.linked ? T.green : T.amber }} />
              <Text style={[font(15, '500'), { color: person.linked ? T.greenDeep : T.amberInk }]} allowFontScaling>{status}</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 16 }}>
              <Action C={C} Icon={Phone} label="Call" onPress={() => person.phone ? tel(person.phone) : ctx.flash('No number saved for ' + who + '.')} />
              <Action C={C} Icon={MessageCircle} label="Message" onPress={() => person.phone ? sms(person.phone) : ctx.flash('No number saved for ' + who + '.')} />
              <Action C={C} Icon={Send} label={'Ask ' + (person.relation === 'Daughter' || person.relation === 'Sister' ? 'her' : person.relation === 'Son' || person.relation === 'Brother' ? 'him' : 'them')} onPress={() => person.linked ? ctx.go('ask') : ctx.go('watchedBy')} />
            </View>
            {!person.linked && (
              <Pill label={s.familyInvited ? 'Send the invite again' : 'Send ' + who + ' the invite'} height={50} style={{ alignSelf: 'stretch', marginTop: 12 }} onPress={() => ctx.go('watchedBy')} trailing={<ArrowRight size={18} color="#fff" strokeWidth={2.2} />} />
            )}
          </View>
        ) : (
          <View style={[st.hero, { backgroundColor: C.card, alignItems: 'flex-start' }]}>
            <Text style={[font(22, '700', 1.15), { color: C.ink }]} allowFontScaling>Nobody hears about scams yet</Text>
            <Text style={[font(16, '400', 1.45), { color: C.ink2, marginTop: 8 }]} allowFontScaling>Choose one person. They get a full-screen alert the moment a scam reaches this phone, and can answer with one tap.</Text>
            <Pill label="Choose someone and send the invite" height={52} style={{ alignSelf: 'stretch', marginTop: 16 }} onPress={() => ctx.go('watchedBy')} />
          </View>
        )}

        <View style={[st.list, { backgroundColor: C.card }]}>
          {others.map((p, i) => (
            <View key={p.phone} style={[st.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep }]}>
              <Avatar name={p.name} photo={p.photo} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>{p.name}</Text>
                <Text style={[font(15, '400'), { color: C.ink2, marginTop: 2 }]} allowFontScaling>{p.relation || p.phone}</Text>
              </View>
              <Pressable onPress={() => tel(p.phone)} onLongPress={() => remove(p)} style={({ pressed }) => [st.callBtn, { backgroundColor: C.greenTint }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={'Call ' + p.name}>
                <Phone size={18} color={T.green} strokeWidth={2} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={add} style={({ pressed }) => [st.row, pressed && { opacity: 0.6 }]} accessibilityRole="button">
            <View style={[st.dashed]}><Plus size={18} color={T.green} strokeWidth={2} /></View>
            <Text style={[font(17, '600'), { color: T.green }]} allowFontScaling>Add someone to your loop</Text>
          </Pressable>
        </View>

        <View style={[st.list, { backgroundColor: C.card, marginTop: 18, paddingVertical: 0 }]}>
          <Pressable onPress={() => ctx.go('maria')} style={({ pressed }) => [st.linkRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep }, pressed && { opacity: 0.6 }]} accessibilityRole="button">
            <Smartphone size={22} color={T.green} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>See what {who || 'they'} {who ? 'sees' : 'see'}</Text>
              <Text style={[font(15, '400'), { color: C.ink2, marginTop: 2 }]} allowFontScaling>{who ? who + '’s' : 'Their'} phone, when a scam reaches you</Text>
            </View>
            <ChevronRight size={18} color={C.chevron} strokeWidth={2.2} />
          </Pressable>
          <Pressable onPress={() => ctx.go('caregiver')} style={({ pressed }) => [st.linkRow, pressed && { opacity: 0.6 }]} accessibilityRole="button">
            <HandHeart size={22} color={T.green} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>Set up for someone else</Text>
              <Text style={[font(15, '400'), { color: C.ink2, marginTop: 2 }]} allowFontScaling>Four things to check on their phone</Text>
            </View>
            <ChevronRight size={18} color={C.chevron} strokeWidth={2.2} />
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <Pressable style={st.dim} onPress={() => setPending(null)}>
          <Pressable style={[st.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
            <Text style={[font(20, '700'), { color: C.ink }]} allowFontScaling>{pending ? firstName(pending.name) + ' is your' : ''}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {RELATIONS.map(r => (
                <Pressable key={r} onPress={() => saveWithRelation(r)} style={({ pressed }) => [{ height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: C.greenTint, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                  <Text style={[font(15, '600'), { color: T.greenDeep }]} allowFontScaling>{r}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function Action({ C, Icon, label, onPress }: { C: Ctx['C']; Icon: typeof Phone; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, height: 62, borderRadius: 12, backgroundColor: C.greenTint, alignItems: 'center', justifyContent: 'center', gap: 4 }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={label}>
      <Icon size={20} color={T.green} strokeWidth={2} />
      <Text style={[font(13, '600'), { color: T.green }]} allowFontScaling>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  hero: { marginHorizontal: 16, borderRadius: 20, paddingTop: 22, paddingHorizontal: 16, paddingBottom: 18, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 14 },
  list: { marginHorizontal: 16, marginTop: 14, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  callBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dashed: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderStyle: 'dashed', borderColor: T.dashed, alignItems: 'center', justifyContent: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
});
