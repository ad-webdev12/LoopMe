// Family. Up to three people. The first one is the main person: a hero card
// with Call, Message and Ask. Everyone can be called in one tap. Anyone who
// has tapped the invite also hears about scams on their own phone. Tap a
// person for everything else: invite, make them the main person, update the
// photo from Contacts, change the relationship, remove.
import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Phone, MessageCircle, Send, Plus, Smartphone, ChevronRight, ArrowRight, Star, RefreshCw, Trash2 } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, LargeTitle, Avatar, Note, Pill } from '../ui/base';
import { loopPerson, firstName } from '../ui/pieces';
import { pickTrustedPerson, samePhone, refreshPhotos, photoFor } from '../lib/contacts';
import { sendInviteTo, markInvited, isLinked } from '../lib/invite';
import type { TrustedPerson } from '../lib/storage';
import type { Ctx } from '../App';

const RELATIONS = ['Daughter', 'Son', 'Partner', 'Sister', 'Brother', 'Friend', 'Carer', 'Other'];

export default function FamilyScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const person = loopPerson(s);
  const who = firstName(person?.name);
  const others = s.trusted.filter(t => t.phone !== person?.phone);
  const [pending, setPending] = useState<TrustedPerson | null>(null);
  const [open, setOpen] = useState<TrustedPerson | null>(null);
  const [busy, setBusy] = useState(false);
  const tel = (p: string) => Linking.openURL('tel:' + p.replace(/[^\d+]/g, '')).catch(() => {});
  const sms = (p: string) => Linking.openURL('sms:' + p.replace(/[^\d+]/g, '')).catch(() => {});

  // Photos follow Contacts. Re-read them whenever this screen opens.
  useEffect(() => {
    let alive = true;
    refreshPhotos(s.trusted).then(list => { if (alive && list) ctx.update({ ...ctx.settings, trusted: list }); });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (s.trusted.length >= 3) { ctx.flash('Up to three people. Remove one to add another.'); return; }
    const res = await pickTrustedPerson();
    if (!res.ok) { if (res.reason) ctx.flash(res.reason); return; }
    if (s.trusted.some(t => samePhone(t.phone, res.person.phone))) { ctx.flash(firstName(res.person.name) + ' is already here.'); return; }
    setPending(res.person);
  };
  const saveWithRelation = (relation: string) => {
    if (!pending) return;
    ctx.update({ ...s, trusted: [...s.trusted, { ...pending, relation }] });
    setPending(null);
  };
  const patch = (p: TrustedPerson, change: Partial<TrustedPerson>) => {
    const trusted = s.trusted.map(t => t.phone === p.phone ? { ...t, ...change } : t);
    ctx.update({ ...s, trusted });
    setOpen(o => o && o.phone === p.phone ? { ...o, ...change } : o);
  };
  const remove = (p: TrustedPerson) => { ctx.update({ ...s, trusted: s.trusted.filter(t => t.phone !== p.phone) }); setOpen(null); ctx.flash(firstName(p.name) + ' removed.'); };
  const makeMain = (p: TrustedPerson) => { ctx.update({ ...s, trusted: [p, ...s.trusted.filter(t => t.phone !== p.phone)] }); setOpen(null); ctx.flash(firstName(p.name) + ' is now the main person.'); };
  const updatePhoto = async (p: TrustedPerson) => {
    if (!p.contactId) { ctx.flash('Remove ' + firstName(p.name) + ' and add them again from Contacts to get a photo.'); return; }
    const photo = await photoFor(p.contactId);
    if (photo) { patch(p, { photo }); ctx.flash('Photo updated.'); } else ctx.flash('No photo on that contact yet. Add one in Contacts, then try again.');
  };
  const invite = async (p: TrustedPerson) => {
    setBusy(true);
    try {
      const r = await sendInviteTo(s, p);
      if (!r.ok) { ctx.flash(r.error); return; }
      ctx.update(markInvited(s, p));
      setOpen(null);
    } finally { setBusy(false); }
  };
  const linkedOf = (p: TrustedPerson) => isLinked(s, p);
  const statusOf = (p: TrustedPerson) => linkedOf(p) ? 'Hears about every scam' : p.invited ? 'Invite sent. Waiting for a tap.' : 'Can be called. Not linked yet.';
  const pronoun = (p?: TrustedPerson | null) => p?.relation === 'Daughter' || p?.relation === 'Sister' ? 'her' : p?.relation === 'Son' || p?.relation === 'Brother' ? 'him' : 'them';

  return (
    <Screen C={C} playKey="family">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <LargeTitle C={C}>Family</LargeTitle>

        {person ? (
          <Pressable onPress={() => setOpen(person)} style={[st.hero, { backgroundColor: C.card }]} accessibilityRole="button" accessibilityLabel={'Options for ' + person.name}>
            <Avatar name={person.name} photo={person.photo} size={104} />
            <Text style={[font(24, '700'), { color: C.ink, marginTop: 12 }]} allowFontScaling>{person.name}</Text>
            {!!person.relation && <Text style={[font(16, '400'), { color: C.ink2, marginTop: 3 }]} allowFontScaling>{person.relation}</Text>}
            <View style={[st.chip, { backgroundColor: person.linked ? C.greenTint : C.amberTint }]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: person.linked ? T.green : T.amber }} />
              <Text style={[font(15, '500'), { color: person.linked ? T.greenDeep : C.amberText }]} allowFontScaling>{statusOf(person)}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 16 }}>
              <Action C={C} Icon={Phone} label="Call" onPress={() => person.phone ? tel(person.phone) : ctx.flash('No number saved for ' + who + '.')} />
              <Action C={C} Icon={MessageCircle} label="Message" onPress={() => person.phone ? sms(person.phone) : ctx.flash('No number saved for ' + who + '.')} />
              <Action C={C} Icon={Send} label={'Ask ' + pronoun(person)} onPress={() => person.linked ? ctx.go('ask') : setOpen(person)} />
            </View>
            {!person.linked && (
              <Pill label={person.invited ? 'Send the invite again' : 'Send ' + who + ' the invite'} height={50} style={{ alignSelf: 'stretch', marginTop: 12 }} disabled={busy} onPress={() => invite(person)} trailing={<ArrowRight size={18} color="#fff" strokeWidth={2.2} />} />
            )}
          </Pressable>
        ) : (
          <View style={[st.hero, { backgroundColor: C.card, alignItems: 'flex-start' }]}>
            <Text style={[font(22, '700', 1.15), { color: C.ink }]} allowFontScaling>Nobody hears about scams yet</Text>
            <Text style={[font(16, '400', 1.45), { color: C.ink2, marginTop: 8 }]} allowFontScaling>Choose one person from Contacts. They can be called in one tap, and once they accept the invite they see every scam the moment it lands.</Text>
            <Pill label="Choose someone" height={52} style={{ alignSelf: 'stretch', marginTop: 16 }} onPress={add} />
          </View>
        )}

        <View style={[st.list, { backgroundColor: C.card }]}>
          {others.map(p => (
            <Pressable key={p.phone} onPress={() => setOpen(p)} style={({ pressed }) => [st.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep }, pressed && { opacity: 0.6 }]} accessibilityRole="button">
              <Avatar name={p.name} photo={p.photo} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>{p.name}</Text>
                <Text style={[font(15, '400'), { color: C.ink2, marginTop: 2 }]} allowFontScaling>{(p.relation ? p.relation + ' · ' : '') + (linkedOf(p) ? 'Linked' : p.invited ? 'Invite sent' : 'Not linked')}</Text>
              </View>
              <Pressable onPress={() => tel(p.phone)} style={({ pressed }) => [st.callBtn, { backgroundColor: C.greenTint }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={'Call ' + p.name}>
                <Phone size={18} color={C.accent} strokeWidth={2} />
              </Pressable>
              <ChevronRight size={16} color={C.chevron} strokeWidth={2.2} />
            </Pressable>
          ))}
          {s.trusted.length < 3 && (
            <Pressable onPress={add} style={({ pressed }) => [st.row, pressed && { opacity: 0.6 }]} accessibilityRole="button">
              <View style={[st.dashed]}><Plus size={18} color={C.accent} strokeWidth={2} /></View>
              <Text style={[font(17, '600'), { color: C.accent }]} allowFontScaling>Add a person</Text>
            </Pressable>
          )}
        </View>
        <Note C={C}>Everyone here can be called in one tap from a scam warning. Send someone the invite and they also hear about each scam on their own phone, and can answer with one tap.</Note>

        {person && (
          <View style={[st.list, { backgroundColor: C.card, marginTop: 18, paddingVertical: 0 }]}>
            <Pressable onPress={() => ctx.go('maria')} style={({ pressed }) => [st.linkRow, pressed && { opacity: 0.6 }]} accessibilityRole="button">
              <Smartphone size={22} color={C.accent} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>See what {who} sees</Text>
                <Text style={[font(15, '400'), { color: C.ink2, marginTop: 2 }]} allowFontScaling>{who}’s phone, when a scam reaches you</Text>
              </View>
              <ChevronRight size={18} color={C.chevron} strokeWidth={2.2} />
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <Pressable style={st.dim} onPress={() => setPending(null)}>
          <Pressable style={[st.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
            <Text style={[font(20, '700'), { color: C.ink }]} allowFontScaling>{pending ? firstName(pending.name) + ' is your' : ''}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {RELATIONS.map(r => (
                <Pressable key={r} onPress={() => saveWithRelation(r)} style={({ pressed }) => [st.rel, { backgroundColor: C.greenTint }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                  <Text style={[font(15, '600'), { color: C.dark ? C.accent : T.greenDeep }]} allowFontScaling>{r}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={st.dim} onPress={() => setOpen(null)}>
          <Pressable style={[st.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
            {open && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar name={open.name} photo={open.photo} size={52} />
                  <View style={{ flex: 1 }}>
                    <Text style={[font(20, '700'), { color: C.ink }]} allowFontScaling>{open.name}</Text>
                    <Text style={[font(15, '400'), { color: C.ink2, marginTop: 2 }]} allowFontScaling>{statusOf(open)}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                  {RELATIONS.map(r => (
                    <Pressable key={r} onPress={() => patch(open, { relation: r })} style={({ pressed }) => [st.rel, { backgroundColor: open.relation === r ? T.green : C.greenTint }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityState={{ selected: open.relation === r }}>
                      <Text style={[font(15, '600'), { color: open.relation === r ? '#fff' : T.greenDeep }]} allowFontScaling>{r}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ marginTop: 16, gap: 8 }}>
                  {!linkedOf(open) && <Pill label={open.invited ? 'Send the invite again' : 'Send ' + firstName(open.name) + ' the invite'} height={52} disabled={busy} onPress={() => invite(open)} icon={<Send size={18} color="#fff" strokeWidth={2.2} />} />}
                  <Pill label={'Call ' + firstName(open.name)} height={52} bg={C.greenTint} color={T.greenDeep} onPress={() => tel(open.phone)} icon={<Phone size={18} color={T.greenDeep} strokeWidth={2.2} />} />
                  {person && open.phone !== person.phone && <Pill label="Make the main person" height={52} bg={C.greenTint} color={T.greenDeep} onPress={() => makeMain(open)} icon={<Star size={18} color={T.greenDeep} strokeWidth={2.2} />} />}
                  <Pill label="Update photo from Contacts" height={52} bg={C.greenTint} color={T.greenDeep} onPress={() => updatePhoto(open)} icon={<RefreshCw size={18} color={T.greenDeep} strokeWidth={2.2} />} />
                  <Pill label={'Remove ' + firstName(open.name)} height={52} bg={C.redTint} color={C.redText} onPress={() => remove(open)} icon={<Trash2 size={18} color={C.redText} strokeWidth={2.2} />} />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function Action({ C, Icon, label, onPress }: { C: Ctx['C']; Icon: typeof Phone; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, height: 62, borderRadius: 12, backgroundColor: C.greenTint, alignItems: 'center', justifyContent: 'center', gap: 4 }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={label}>
      <Icon size={20} color={C.accent} strokeWidth={2} />
      <Text style={[font(13, '600'), { color: C.accent }]} allowFontScaling>{label}</Text>
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
  rel: { height: 40, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
});
