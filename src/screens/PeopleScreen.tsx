// People you trust. Source lines 303-310. Up to three; call + remove per row;
// add from contacts (real picker).
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Phone, Plus, X } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import { pickTrustedPerson, samePhone } from '../lib/contacts';
import type { Ctx } from '../App';

export default function PeopleScreen({ ctx }: { ctx: Ctx }) {
  const careMode = ctx.settings.role === 'caretaker';
  const watchName = ctx.settings.watching?.name?.split(' ')[0] || ctx.settings.careName.split(' ')[0] || 'them';
  const people = careMode && ctx.settings.watching
    ? [{ name: ctx.settings.watching.name, phone: ctx.settings.watching.phone, meta: ctx.settings.watching.phone || 'Tap the phone to add their number' }]
    : ctx.settings.trusted.map(p => ({ ...p, meta: p.phone }));

  const add = async () => {
    if (ctx.settings.trusted.length >= 3) {
      ctx.flash('Up to three people is plenty. Remove one to add another.');
      return;
    }
    const res = await pickTrustedPerson();
    if (!res.ok) { if (res.reason) ctx.flash(res.reason); return; }
    if (ctx.settings.trusted.some(x => samePhone(x.phone, res.person.phone))) {
      ctx.flash(res.person.name.split(' ')[0] + ' is already on your list.');
      return;
    }
    ctx.update({ ...ctx.settings, trusted: [...ctx.settings.trusted, res.person] });
    ctx.flash(res.person.name.split(' ')[0] + ' is saved. One tap now tells them.');
  };

    return (
    <KFIn duration={260} style={{ flex: 1 }} playKey="people">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={{ height: 14 }} />
      <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
        <Text style={st.title} allowFontScaling>People you trust</Text>
        <Text style={st.sub} allowFontScaling>Up to three. One tap calls them.</Text>
      </View>
      <View style={st.card}>
        {people.map((p, i) => (
          <View key={i} style={st.personRow}>
            <View style={st.avatar}><Text style={st.avatarText} allowFontScaling>{p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.pName} allowFontScaling>{p.name}</Text>
              <Text style={st.pMeta} allowFontScaling>{p.meta}</Text>
            </View>
            <Pressable style={st.callBtn} onPress={() => p.phone ? Linking.openURL('tel:' + p.phone.replace(/[^\d+]/g, '')) : ctx.go('watch')} accessibilityRole="button" accessibilityLabel={'Call ' + p.name}>
              <Phone size={17} color="#fff" strokeWidth={1.9} />
            </Pressable>
            <Pressable style={st.removeBtn} accessibilityRole="button" accessibilityLabel={'Remove ' + p.name}
              onPress={() => careMode
                ? ctx.go('watch')
                : ctx.update({ ...ctx.settings, trusted: ctx.settings.trusted.filter((_, j) => j !== i) })}>
              <X size={15} color={T.sub} strokeWidth={2} />
            </Pressable>
          </View>
        ))}
        <Pressable style={st.addRow} onPress={add} accessibilityRole="button">
          <View style={st.addIcon}><Plus size={18} color={T.green} strokeWidth={2} /></View>
          <Text style={st.addText} allowFontScaling>Add someone from contacts</Text>
        </Pressable>
      </View>
      <View style={{ height: 104 }} />
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  title: { fontSize: 27, fontFamily: F.display, letterSpacing: -0.54, color: T.ink, lineHeight: 30 },
  sub: { fontSize: 15.5, fontFamily: F.body, color: T.sub, lineHeight: 22.5, marginTop: 6 },
  card: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.divider },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.greenTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: F.bold, color: T.green },
  pName: { fontSize: 17, fontFamily: F.bold, color: T.ink },
  pMeta: { fontSize: 14.5, fontFamily: F.body, color: T.sub, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  addIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.greenTint, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 16.5, fontFamily: F.bold, color: T.ink },
});
