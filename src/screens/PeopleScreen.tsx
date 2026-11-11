// Your people. Two kinds, and the screen says which is which:
//   the one person who hears when a scam lands (the family link), and
//   up to three people a tap can call. They need nothing installed.
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Phone, Plus, X } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import { pickTrustedPerson, samePhone } from '../lib/contacts';
import type { Ctx } from '../App';

export default function PeopleScreen({ ctx }: { ctx: Ctx }) {
  const s = ctx.settings;
  const careMode = s.role === 'caretaker';
  const watchName = s.watching?.name?.split(' ')[0] || s.careName.split(' ')[0] || 'them';
  const linkedTo = s.familyLinked && s.familyRole === 'owner' ? (s.watchedBy?.split(' ')[0] || null) : null;
  const invitee = s.trusted[0]?.name.split(' ')[0];
  const call = (phone: string) => Linking.openURL('tel:' + phone.replace(/[^\d+]/g, ''));

  const add = async () => {
    if (s.trusted.length >= 3) { ctx.flash('Up to three people is plenty. Remove one to add another.'); return; }
    const res = await pickTrustedPerson();
    if (!res.ok) { if (res.reason) ctx.flash(res.reason); return; }
    if (s.trusted.some(x => samePhone(x.phone, res.person.phone))) { ctx.flash(res.person.name.split(' ')[0] + ' is already on your list.'); return; }
    ctx.update({ ...s, trusted: [...s.trusted, res.person] });
  };

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2);

  return (
    <KFIn duration={260} style={{ flex: 1 }} playKey="people">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={{ height: 14 }} />
      <View style={{ paddingHorizontal: 24, paddingBottom: 6 }}>
        <Text style={st.title} allowFontScaling>Your people</Text>
      </View>

      {/* ---- The link ---- */}
      <Text style={st.section} allowFontScaling>{careMode ? 'You look after' : 'Hears when a scam lands'}</Text>
      <View style={st.list}>
        {careMode ? (
          <View style={st.row}>
            <View style={st.avatar}><Text style={st.avatarText} allowFontScaling>{initials(s.watching?.name || watchName)}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.name} allowFontScaling>{s.watching?.name || watchName}</Text>
              <Text style={st.meta} allowFontScaling>{s.familyLinked ? 'Linked. Their alerts land on this phone.' : 'Waiting for the invite from their phone.'}</Text>
            </View>
            {s.watching?.phone
              ? <Pressable style={st.callBtn} onPress={() => call(s.watching!.phone)} accessibilityRole="button" accessibilityLabel={'Call ' + watchName}><Phone size={17} color="#fff" strokeWidth={1.9} /></Pressable>
              : <Pressable onPress={() => ctx.go('watch')} accessibilityRole="button"><Text style={st.link} allowFontScaling>Add number</Text></Pressable>}
          </View>
        ) : linkedTo ? (
          <View style={st.row}>
            <View style={st.avatar}><Text style={st.avatarText} allowFontScaling>{initials(s.watchedBy || linkedTo)}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.name} allowFontScaling>{s.watchedBy}</Text>
              <Text style={st.meta} allowFontScaling>Linked. Every flagged text appears on {linkedTo}’s phone.</Text>
            </View>
            <Pressable onPress={() => ctx.go('watchedBy')} accessibilityRole="button"><Text style={st.link} allowFontScaling>Change</Text></Pressable>
          </View>
        ) : s.familyInvited && invitee ? (
          <Pressable style={st.row} onPress={() => ctx.go('watchedBy')} accessibilityRole="button">
            <View style={st.avatar}><Text style={st.avatarText} allowFontScaling>{initials(s.trusted[0].name)}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.name} allowFontScaling>{invitee}</Text>
              <Text style={st.meta} allowFontScaling>Invite sent. This fills in when they tap it.</Text>
            </View>
            <Text style={st.link} allowFontScaling>Send again</Text>
          </Pressable>
        ) : (
          <Pressable style={st.row} onPress={() => ctx.go('watchedBy')} accessibilityRole="button">
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.name} allowFontScaling>Nobody yet</Text>
              <Text style={st.meta} allowFontScaling>Choose someone and send the invite. One text, one tap on their side.</Text>
            </View>
            <ArrowRight size={18} color={T.green} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>
      {!careMode && (
        <Text style={st.note} allowFontScaling>
          {linkedTo
            ? 'What ' + linkedTo + ' says comes back here, full screen. Nothing is texted.'
            : 'They get a full-screen alert the moment a scam reaches this phone, and can answer with one tap.'}
        </Text>
      )}

      {/* ---- Quick call ---- */}
      <Text style={[st.section, { marginTop: 30 }]} allowFontScaling>Quick call</Text>
      <View style={st.list}>
        {s.trusted.map((p, i) => (
          <View key={i} style={st.row}>
            <View style={st.avatar}><Text style={st.avatarText} allowFontScaling>{initials(p.name)}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.name} allowFontScaling>{p.name}</Text>
              <Text style={st.meta} allowFontScaling>{p.phone}</Text>
            </View>
            <Pressable style={st.callBtn} onPress={() => call(p.phone)} accessibilityRole="button" accessibilityLabel={'Call ' + p.name}>
              <Phone size={17} color="#fff" strokeWidth={1.9} />
            </Pressable>
            <Pressable style={st.removeBtn} accessibilityRole="button" accessibilityLabel={'Remove ' + p.name}
              onPress={() => ctx.update({ ...s, trusted: s.trusted.filter((_, j) => j !== i) })}>
              <X size={15} color={T.sub} strokeWidth={2} />
            </Pressable>
          </View>
        ))}
        <Pressable style={st.row} onPress={add} accessibilityRole="button">
          <View style={st.addIcon}><Plus size={18} color={T.green} strokeWidth={2} /></View>
          <Text style={st.name} allowFontScaling>Add someone from contacts</Text>
        </Pressable>
      </View>
      <Text style={st.note} allowFontScaling>One tap rings them. They do not need the app.</Text>
      <View style={{ height: 104 }} />
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  title: { fontSize: 34, fontFamily: F.display, letterSpacing: -0.9, color: T.ink, lineHeight: 38 },
  section: { marginHorizontal: 24, marginTop: 16, marginBottom: 6, fontSize: 13, fontFamily: F.semibold, letterSpacing: 0.4, textTransform: 'uppercase', color: T.sub },
  list: { marginHorizontal: 24, borderTopWidth: 1, borderTopColor: T.hairline },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.hairline },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.greenTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: F.bold, color: T.green },
  addIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.greenTint, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 17, fontFamily: F.bold, color: T.ink },
  meta: { fontSize: 14.5, fontFamily: F.body, color: T.sub, marginTop: 2, lineHeight: 20 },
  link: { fontSize: 15.5, fontFamily: F.bold, color: T.green },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  note: { marginHorizontal: 24, marginTop: 10, fontSize: 15, fontFamily: F.body, color: T.sub, lineHeight: 22 },
});
