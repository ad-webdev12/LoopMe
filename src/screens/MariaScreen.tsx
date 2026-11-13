// "What {name} sees": the caretaker's phone when a scam reaches you. On the
// protected phone it is a preview of the last flagged check, labelled as the
// other phone. On the caretaker's phone it is the real screen for an alert
// (opened from History or the Family tab) with one-tap replies that land
// full screen on the protected phone.
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, Avatar, Pill, Note, SectionHeader } from '../ui/base';
import { loopPerson, firstName, whenLabel } from '../ui/pieces';
import { quickNote } from '../lib/family';
import type { Ctx } from '../App';

export default function MariaScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const careMode = s.role === 'caretaker';
  // Caretaker: the check being looked at. Owner: the last flagged check, as a preview.
  const rec = careMode
    ? ctx.hist.find(h => h.id === ctx.wardOpen) || ctx.hist.find(h => h.source === 'family' && h.level !== 'green')
    : ctx.hist.find(h => h.source !== 'family' && h.level !== 'green');
  const person = loopPerson(s);
  const who = firstName(person?.name) || 'they';
  const ownerName = careMode ? (s.watching?.name || firstName(rec?.from) || '') : (s.myName || '');
  const ownerFirst = firstName(ownerName) || (careMode ? 'They' : 'Your phone');
  const callName = firstName(ownerName) || 'them';
  const red = (rec?.level || 'red') === 'red';
  const phone = careMode ? s.watching?.phone : '';

  const reply = async (verdict: 'scam' | 'call' | 'safe') => {
    if (!careMode || !rec) { ctx.flash('This is what ' + who + ' sees. The buttons work on ' + (person?.relation === 'Daughter' ? 'her' : person?.relation === 'Son' ? 'his' : 'their') + ' phone.'); return; }
    await ctx.sendNoteTo(rec.id, quickNote(verdict), verdict);
    ctx.flash('Sent. It shows full screen on ' + callName + '’s phone.');
    if (verdict === 'call' && phone) Linking.openURL('tel:' + phone.replace(/[^\d+]/g, '')).catch(() => {});
  };
  const block = async () => {
    if (!careMode || !rec) { ctx.flash('This is what ' + who + ' sees.'); return; }
    if (!rec.sender) { ctx.flash('No number came with this one.'); return; }
    await ctx.sendNoteTo(rec.id, 'Blocked ' + rec.sender + ' on your phone.', 'block');
    ctx.flash('Blocked on ' + callName + '’s phone.');
  };

  return (
    <Screen C={C} playKey={'maria' + (rec?.id || '')}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 14 }}>
          <BackLink onPress={() => ctx.go(careMode ? 'ward' : 'family')} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={ownerName || '?'} photo={s.watching?.photo} size={52} />
          <View>
            <Text style={[font(26, '700'), { color: C.ink }]} allowFontScaling>{careMode ? ownerFirst : (firstName(ownerName) || 'Your phone')}</Text>
            <Text style={[font(15, '400'), { color: C.ink2, marginTop: 2 }]} allowFontScaling>{careMode ? (ownerName || 'The phone you look after') : 'What ' + who + ' sees on ' + (person?.relation === 'Daughter' ? 'her' : person?.relation === 'Son' ? 'his' : 'their') + ' phone'}</Text>
          </View>
        </View>

        {rec ? (
          <View style={[st.alert, { backgroundColor: red ? T.red : T.amber }]}>
            <Text style={[font(14, '600'), { color: '#fff' }]} allowFontScaling>{whenLabel(rec.at)}</Text>
            <Text style={[font(26, '800', 1.12), { color: '#fff', marginTop: 6 }]} allowFontScaling>
              {firstName(ownerName) ? firstName(ownerName) + ' got a ' : 'A '}{red ? 'scam text' : 'text worth a look'}{firstName(ownerName) ? '' : ' arrived'}.{'\n'}{rec.askedFamily ? 'They asked you about it.' : 'No reply yet.'}
            </Text>
            <View style={st.quote}><Text style={[font(15, '400', 1.4), { color: '#fff' }]} allowFontScaling numberOfLines={6}>“{rec.excerpt}”</Text></View>
            <Text style={[font(15, '400', 1.4), { color: '#fff', marginTop: 10 }]} allowFontScaling>{rec.reason}</Text>
          </View>
        ) : (
          <View style={[st.alert, { backgroundColor: C.card }]}>
            <Text style={[font(20, '700', 1.2), { color: C.ink }]} allowFontScaling>Nothing to show yet</Text>
            <Text style={[font(16, '400', 1.45), { color: C.ink2, marginTop: 8 }]} allowFontScaling>The moment a scam reaches {careMode ? callName + '’s' : 'this'} phone, {careMode ? 'it appears here' : who + ' sees it like this'}: the text, why it was flagged, and three one-tap replies.</Text>
          </View>
        )}

        <SectionHeader C={C}>Reply with one tap</SectionHeader>
        <View style={{ marginHorizontal: 16, gap: 8 }}>
          {([['scam', '“That’s a scam. Leave it.”'], ['call', '“I’m calling you now.”'], ['safe', '“That one’s fine.”']] as const).map(([v, label]) => (
            <Pressable key={v} onPress={() => reply(v)} style={({ pressed }) => [st.replyRow, { backgroundColor: pressed ? C.pressed : C.card }]} accessibilityRole="button">
              <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>{label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ marginHorizontal: 16, marginTop: 14, flexDirection: 'row', gap: 8 }}>
          <Pill label={'Call ' + callName} height={52} style={{ flex: 1 }} icon={<Phone size={18} color="#fff" strokeWidth={2} />}
            onPress={() => phone ? Linking.openURL('tel:' + phone.replace(/[^\d+]/g, '')).catch(() => {}) : ctx.flash(careMode ? 'Add their number under Family first.' : 'This is what ' + who + ' sees.')} />
          <Pill label="Block on their phone" height={52} bg={C.card} color={T.red} style={{ flex: 1 }} onPress={block} />
        </View>
        <Note C={C} top={14}>{careMode ? 'You only see texts that Loop Me flags. Everything else on ' + callName + '’s phone stays private.' : who + ' only sees texts that Loop Me flags. Your other messages stay private.'}</Note>
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  badge: { height: 28, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  alert: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 18 },
  quote: { backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, marginTop: 12 },
  replyRow: { height: 54, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center' },
});
