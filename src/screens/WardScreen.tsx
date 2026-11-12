// The caretaker's home: the person they look after, the week on that phone
// (counts only, never message text), what needs a word, numbers that keep
// trying, and what is switched on over there.
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Phone, ChevronRight } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, LargeTitle, Avatar, Card, SectionHeader, Note, Tag, Pill, PulseDot } from '../ui/base';
import { firstName, whenLabel } from '../ui/pieces';
import { repeatSenders } from '../lib/family';
import type { Ctx } from '../App';

export default function WardScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const name = firstName(s.watching?.name) || 'them';
  const linked = s.familyLinked;
  const p = ctx.pulse;
  const events = ctx.hist.filter(h => h.source === 'family');
  const open = events.filter(h => h.level !== 'green' && !(h.notes || []).some(n => n.mine)).slice(0, 5);
  const repeats = repeatSenders(ctx.hist);
  const tel = () => s.watching?.phone ? Linking.openURL('tel:' + s.watching.phone.replace(/[^\d+]/g, '')).catch(() => {}) : ctx.go('watch');

  return (
    <Screen C={C} playKey="ward">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <LargeTitle C={C} right={<Pressable onPress={() => ctx.go('watch')} accessibilityRole="button" style={{ marginBottom: 5 }}><Text style={[font(17, '400'), { color: T.green }]} allowFontScaling>Link</Text></Pressable>}>{name}</LargeTitle>

        <Card C={C} style={{ marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={s.watching?.name || name} photo={s.watching?.photo} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={[font(20, '700'), { color: C.ink }]} allowFontScaling>{s.watching?.name || name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <PulseDot size={8} color={linked ? T.green : T.amber} still />
              <Text style={[font(15, '400'), { color: C.ink2 }]} allowFontScaling>{linked ? 'Linked. You hear the moment something looks wrong.' : 'Waiting for the invite from their phone.'}</Text>
            </View>
          </View>
          <Pressable onPress={tel} style={({ pressed }) => [st.call, { backgroundColor: C.greenTint }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={'Call ' + name}>
            <Phone size={18} color={T.green} strokeWidth={2} />
          </Pressable>
        </Card>

        {open.length > 0 && (
          <>
            <SectionHeader C={C}>Worth a word</SectionHeader>
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {open.map(h => (
                <Pressable key={h.id} onPress={() => ctx.openWard(h.id)} style={({ pressed }) => [st.alert, { backgroundColor: h.level === 'red' ? T.red : T.amber }, pressed && { opacity: 0.85 }]} accessibilityRole="button">
                  <Text style={[font(14, '600'), { color: '#fff' }]} allowFontScaling>{whenLabel(h.at)}</Text>
                  <Text style={[font(20, '800', 1.15), { color: '#fff', marginTop: 4 }]} allowFontScaling>{name} got {h.level === 'red' ? 'a scam text.' : 'a text worth a look.'}</Text>
                  <Text style={[font(15, '400', 1.4), { color: '#fff', marginTop: 8 }]} allowFontScaling numberOfLines={3}>“{h.excerpt}”</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <SectionHeader C={C}>This week on {name}’s phone</SectionHeader>
        <Card C={C} style={{ marginHorizontal: 16 }} radius={16}>
          {p ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
                <Text style={[font(56, '800', 1.0, -2, true), { color: p.stopped7 ? T.red : T.green, marginBottom: -6 }]} allowFontScaling={false}>{p.stopped7}</Text>
                <Text style={[font(17, '600', 1.25), { color: C.ink, flex: 1 }]} allowFontScaling>{p.stopped7 === 1 ? 'scam stopped' : 'scams stopped'}{'\n'}<Text style={{ fontWeight: '400', color: C.ink2 }}>{p.checked7} {p.checked7 === 1 ? 'text' : 'texts'} checked{p.flagged7 ? ', ' + p.flagged7 + ' worth a look' : ''}</Text></Text>
              </View>
              <Text style={[font(13, '500'), { color: C.meta, marginTop: 12 }]} allowFontScaling>Last seen {whenLabel(p.at).toLowerCase()}</Text>
            </>
          ) : (
            <Text style={[font(16, '400', 1.45), { color: C.ink2 }]} allowFontScaling>{linked ? 'The first picture arrives after their phone checks something.' : 'Fills in once the phones are linked.'}</Text>
          )}
        </Card>

        {repeats.length > 0 && (
          <>
            <SectionHeader C={C}>Numbers that keep trying</SectionHeader>
            <Card C={C} style={{ marginHorizontal: 16, paddingVertical: 4 }} radius={16}>
              {repeats.map((r, i) => (
                <View key={r.sender} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, i < repeats.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>{r.sender}</Text>
                    <Text style={[font(15, '400'), { color: C.ink2, marginTop: 2 }]} allowFontScaling>{r.count} times · last {whenLabel(r.last).toLowerCase()}</Text>
                  </View>
                  {r.blocked ? <Tag label="Blocked" bg={C.greenFine} color={T.greenDeep} /> : (
                    <Pressable onPress={() => { const rec = events.find(h => h.sender === r.sender); if (rec) void ctx.sendNoteTo(rec.id, 'I blocked that number for you.', 'block'); ctx.flash('Blocked on ' + name + '’s phone.'); }} accessibilityRole="button">
                      <Text style={[font(15, '600'), { color: T.redText }]} allowFontScaling>Block on {name}’s phone</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </Card>
          </>
        )}

        {p && (
          <>
            <SectionHeader C={C}>Switched on over there</SectionHeader>
            <Card C={C} style={{ marginHorizontal: 16, paddingVertical: 4 }} radius={16}>
              {[['Unknown texts', p.filterOn], ['Scam callers', p.callsOn], ['Alerts', p.notifOn]].map(([label, on], i, arr) => (
                <View key={String(label)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep }]}>
                  <PulseDot size={10} color={on ? T.green : T.amber} still />
                  <Text style={[font(17, '400'), { color: C.ink, flex: 1 }]} allowFontScaling>{label}</Text>
                  <Text style={[font(15, '500'), { color: on ? T.green : T.amberInk }]} allowFontScaling>{on ? 'On' : 'Off'}</Text>
                </View>
              ))}
            </Card>
            <Note C={C}>Loop Me {p.version ? p.version + ' ' : ''}on {name}’s phone. Off means a switch in their iPhone Settings; Settings › Set up for someone else has the exact path.</Note>
          </>
        )}

        {events.length > 0 && (
          <>
            <SectionHeader C={C}>Recent</SectionHeader>
            <Card C={C} style={{ marginHorizontal: 16, paddingVertical: 4 }} radius={16}>
              {events.slice(0, 8).map((h, i, arr) => (
                <Pressable key={h.id} onPress={() => ctx.openWard(h.id)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep }, pressed && { opacity: 0.6 }]} accessibilityRole="button">
                  {h.level === 'red' ? <Tag label="Scam" bg={T.red} color="#fff" /> : h.level === 'amber' ? <Tag label="Careful" bg={T.amber} color="#fff" /> : <Tag label="Fine" bg={C.greenFine} color={T.greenDeep} />}
                  <Text style={[font(16, '400'), { color: C.ink, flex: 1 }]} allowFontScaling numberOfLines={1}>{h.excerpt}</Text>
                  <ChevronRight size={16} color={C.chevron} strokeWidth={2.2} />
                </Pressable>
              ))}
            </Card>
          </>
        )}
        {!linked && (
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <Pill label="How the link works" bg={C.card} color={T.green} onPress={() => ctx.go('watch')} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  call: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  alert: { borderRadius: 20, padding: 18 },
});
