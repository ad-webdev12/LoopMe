// Scam · Show me more. Red summary card, why we think so, the message with
// highlights and read-aloud, was this right, report and block, who saw it.
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { Flag, Ban, Volume2 } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, SectionHeader, Row, Avatar } from '../ui/base';
import { Highlighted, loopPerson, firstName, whenLabel } from '../ui/pieces';
import { reportRoute } from '../lib/region';
import type { Ctx } from '../App';

export default function DetailScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const v = ctx.verdict;
  const rec = ctx.hist.find(h => h.id === ctx.recordId);
  const level = v?.level || 'red';
  const color = level === 'amber' ? T.amber : level === 'green' ? T.green : T.red;
  const person = loopPerson(s);
  const who = firstName(person?.name);
  const route = reportRoute();
  const digits = (rec?.sender || '').replace(/\D/g, '');
  const canBlock = digits.length >= 7 && !s.blocked.includes(digits);
  const back = () => ctx.go(level === 'amber' ? 'amber' : level === 'green' ? 'green' : 'scam');
  const seenNote = rec?.notes?.find(n => !n.mine);
  const read = () => Speech.speak(ctx.msg, { rate: 0.9 });
  const report = () => {
    if (route.site) Linking.openURL(route.site).catch(() => {});
    else ctx.flash('Tell your bank and the police. Your history has the details.');
  };

  return (
    <Screen C={C} playKey="detail">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <BackLink onPress={back} />
        <View style={[st.summary, { backgroundColor: color }]}>
          <View style={st.pill}><Text style={[font(14, '600'), { color: '#fff' }]} allowFontScaling>{level === 'red' ? 'Scam' : level === 'amber' ? 'Be careful' : 'Looks okay'}</Text></View>
          <Text style={[font(30, '800', 1.05, -0.5), { color: '#fff', marginTop: 10 }]} allowFontScaling>{level === 'red' ? 'Stop. Don’t reply.' : level === 'amber' ? 'Be careful.' : 'Looks okay.'}</Text>
          <Text style={[font(16, '400', 1.4), { color: '#fff', marginTop: 8 }]} allowFontScaling>{v?.safeStep || v?.reason}</Text>
        </View>

        {(v?.signals || []).length > 0 && (
          <>
            <SectionHeader C={C}>Why we think so</SectionHeader>
            <View style={[st.group, { backgroundColor: C.card }]}>
              {(v?.signals || []).map((sig, i, arr) => (
                <View key={i} style={[{ flexDirection: 'row', gap: 12, paddingVertical: 13 }, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep }]}>
                  <Text style={[font(16, '700'), { color }]} allowFontScaling>{i + 1}</Text>
                  <Text style={[font(17, '600', 1.3), { color: C.ink, flex: 1 }]} allowFontScaling>{sig}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <SectionHeader C={C}>The message</SectionHeader>
        <View style={[st.group, { backgroundColor: C.card, paddingVertical: 14 }]}>
          <Highlighted text={ctx.msg} matches={level === 'green' ? [] : (v?.matches || [])} color={C.ink} size={16.5} lh={1.42}
            mark={level === 'amber' ? C.amberText : T.redInk} underline={level === 'amber' ? T.amber : T.red} />
          <Pressable onPress={read} style={({ pressed }) => [st.readBtn, { backgroundColor: C.greenTint }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <Volume2 size={18} color={C.accent} strokeWidth={2} />
            <Text style={[font(15, '600'), { color: C.accent }]} allowFontScaling>Read it to me</Text>
          </Pressable>
        </View>

        {!!rec && (
          <>
            <SectionHeader C={C}>Was this right?</SectionHeader>
            <View style={{ marginHorizontal: 16, flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => { ctx.correct(rec.id, level === 'green' ? 'fine' : 'scam').then(() => ctx.flash('Thanks. Loop Me will remember.')); }} style={({ pressed }) => [st.yn, { backgroundColor: C.card }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                <Text style={[font(16, '600'), { color: C.ink }]} allowFontScaling>{level === 'green' ? 'Yes, it’s fine' : 'Yes, a scam'}</Text>
              </Pressable>
              <Pressable onPress={() => { ctx.correct(rec.id, level === 'green' ? 'scam' : 'fine').then(() => ctx.flash('Noted. It won’t be flagged again.')); }} style={({ pressed }) => [st.yn, { backgroundColor: C.card }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                <Text style={[font(16, '600'), { color: C.ink }]} allowFontScaling>{level === 'green' ? 'No, it’s a scam' : 'No, it’s really them'}</Text>
              </Pressable>
            </View>
          </>
        )}

        <View style={[st.group, { backgroundColor: C.card, marginTop: 22 }]}>
          <Row C={C} title={route.site ? 'Report it to ' + route.siteName : 'Report it'} chevron onPress={report}
            right={undefined} chip={undefined} />
          {canBlock && <Row C={C} title="Block this number" chevron last onPress={async () => { await ctx.blockNumber(rec!.sender!); ctx.go('home'); ctx.flash('Blocked. That number can’t call or text you now.'); }} />}
          {!canBlock && <View style={{ marginTop: -StyleSheet.hairlineWidth }} />}
        </View>

        {person?.linked && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 18, paddingHorizontal: 22 }}>
            <Avatar name={person.name} photo={person.photo} size={28} />
            <Text style={[font(15, '500'), { color: C.ink2 }]} allowFontScaling>
              {who} has been looped in.{seenNote ? ' ' + who + ' replied at ' + whenLabel(seenNote.at || rec!.at).replace('Today ', '') + '.' : ''}
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  summary: { marginHorizontal: 16, marginTop: 6, borderRadius: 20, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 20 },
  pill: { alignSelf: 'flex-start', height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: 'rgba(0,0,0,.16)', alignItems: 'center', justifyContent: 'center' },
  group: { marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 16 },
  readBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, height: 38, paddingHorizontal: 16, borderRadius: 19 },
  yn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
