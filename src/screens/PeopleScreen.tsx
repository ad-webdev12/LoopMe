// People you trust — source lines 303-310. Up to three; call + remove per row;
// add from contacts (real picker); the quoted sample text at the bottom.
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Phone, Plus, X } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import type { Ctx } from '../App';

export default function PeopleScreen({ ctx }: { ctx: Ctx }) {
  const careMode = ctx.settings.role === 'caretaker';
  const watchName = ctx.settings.watching?.name?.split(' ')[0] || 'Ruth';
  const people = careMode && ctx.settings.watching
    ? [{ name: ctx.settings.watching.name, phone: ctx.settings.watching.phone, meta: (ctx.settings.careRel || 'Mother') + ' · ' + ctx.settings.watching.phone }]
    : ctx.settings.trusted.map(p => ({ ...p, meta: p.phone }));

  const add = async () => {
    try {
      const { granted } = await Contacts.requestPermissionsAsync();
      if (!granted) { ctx.flash('Opens your contacts to pick one person.'); return; }
      const picked = await Contacts.presentContactPickerAsync();
      const num = picked?.phoneNumbers?.[0]?.number;
      if (picked?.name && num) {
        if (ctx.settings.trusted.length >= 3) { ctx.flash('Up to three people is plenty. Remove one to add another.'); return; }
        ctx.update({ ...ctx.settings, trusted: [...ctx.settings.trusted, { name: picked.name, phone: num }] });
      }
    } catch { ctx.flash('Opens your contacts to pick one person.'); }
  };

  const quote = careMode
    ? '“' + watchName + ', a text about a parcel fee just came in on your phone. Loop Me flagged it as a scam. Do not tap it.”'
    : '“Mum checked a text about a parcel fee. Loop Me flagged it as a scam. Nothing was tapped.”';

  return (
    <KFIn duration={260} style={{ flex: 1 }} playKey="people">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={{ height: 14 }} />
      <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
        <Text style={st.title} allowFontScaling>People you trust</Text>
        <Text style={st.sub} allowFontScaling>Up to three. One tap sends them the message and what we found.</Text>
      </View>
      <View style={st.card}>
        {people.map((p, i) => (
          <View key={i} style={st.personRow}>
            <View style={st.avatar}><Text style={st.avatarText} allowFontScaling>{p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.pName} allowFontScaling>{p.name}</Text>
              <Text style={st.pMeta} allowFontScaling>{p.meta}</Text>
            </View>
            <Pressable style={st.callBtn} onPress={() => Linking.openURL('tel:' + p.phone.replace(/[^\d+]/g, ''))} accessibilityRole="button" accessibilityLabel={'Call ' + p.name}>
              <Phone size={17} color="#fff" strokeWidth={1.9} />
            </Pressable>
            <Pressable style={st.removeBtn} accessibilityRole="button" accessibilityLabel={'Remove ' + p.name}
              onPress={() => careMode
                ? ctx.flash('She stays in your trusted list while you look after her.')
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
      <Text style={st.explain} allowFontScaling>They get a plain text message. No app to install, no sign-up. This is exactly what it says:</Text>
      <View style={st.quote}><Text style={st.quoteText} allowFontScaling>{quote}</Text></View>
      <View style={{ height: 104 }} />
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  title: { fontSize: 27, fontFamily: F.display, letterSpacing: -0.54, color: T.ink, lineHeight: 28.6 },
  sub: { fontSize: 13.5, fontFamily: F.body, color: T.sub, lineHeight: 20.25, marginTop: 6 },
  card: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.divider },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.greenTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: F.bold, color: T.green },
  pName: { fontSize: 15.5, fontFamily: F.bold, color: T.ink },
  pMeta: { fontSize: 12.5, fontFamily: F.body, color: T.sub, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  addIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.greenTint, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 15, fontFamily: F.bold, color: T.ink },
  explain: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 8, fontSize: 13, fontFamily: F.body, color: T.sub, lineHeight: 20.15 },
  quote: { marginHorizontal: 22, backgroundColor: T.greenTint, borderLeftWidth: 3, borderLeftColor: T.green, paddingHorizontal: 15, paddingVertical: 14 },
  quoteText: { fontSize: 13, fontFamily: F.body, color: T.green, lineHeight: 19.5 },
});
