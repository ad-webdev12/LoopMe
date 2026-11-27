// Scam · Show me more. The verdict tag, why, the message with its flagged
// phrases and read-aloud, the numbered reasons, block and report, was this
// right, and who has been looped in.
import { explain, highlights } from '../engine/explain';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { Volume2 } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, SectionHeader, Avatar, Pill } from '../ui/base';
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
  const points = explain(ctx.msg, level, v?.tags || []);
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
        <View style={{ paddingTop: 6, paddingHorizontal: 20, flexDirection: 'row' }}>
          <View style={[st.tag, { backgroundColor: color }]}><Text style={[font(14, '700'), { color: '#fff' }]} allowFontScaling>{level === 'red' ? 'Scam' : level === 'amber' ? 'Be careful' : 'Looks okay'}</Text></View>
        </View>
        <Text style={[font(32, '700', 1.08, -0.5), { color: C.ink, paddingTop: 10, paddingHorizontal: 20 }]} allowFontScaling>
          {level === 'red' ? 'Why it’s a scam' : level === 'amber' ? 'Why to be careful' : 'Why it looks okay'}
        </Text>
        <View style={[st.card, { backgroundColor: C.card, marginTop: 18, paddingVertical: 14 }]}>
          <Highlighted text={ctx.msg} matches={highlights(ctx.msg, level, v?.tags || [])} color={C.ink} size={16.5} lh={1.42}
            mark={level === 'amber' ? C.amberText : C.dark ? '#ff8a73' : T.redInk} underline={level === 'amber' ? T.amber : T.red} />
          <Pressable onPress={read} style={({ pressed }) => [st.readBtn, { backgroundColor: C.greenTint }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <Volume2 size={18} color={C.accent} strokeWidth={2} />
            <Text style={[font(15, '600'), { color: C.accent }]} allowFontScaling>Read it to me</Text>
          </Pressable>
        </View>

        {points.length > 0 && (
          <View style={[st.card, { backgroundColor: C.card, marginTop: 12 }]}>
            {points.map((pt, i, arr) => (
              <View key={i} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep2 }]}>
                <View style={[st.num, { backgroundColor: color }]}><Text style={[font(13, '700'), { color: '#fff' }]} allowFontScaling={false}>{i + 1}</Text></View>
                <Text style={[font(17, '500', 1.3), { color: C.ink, flex: 1 }]} allowFontScaling>{pt.short}</Text>
              </View>
            ))}
          </View>
        )}

        {level !== 'green' && canBlock && (
          <Pill label="Block this number" bg={T.red} style={{ marginTop: 22, marginHorizontal: 16 }}
            onPress={async () => { await ctx.blockNumber(rec!.sender!); ctx.back(); }} />
        )}
        {level !== 'green' && (
          <Pressable onPress={report} style={({ pressed }) => [st.link, { marginTop: canBlock ? 4 : 18 }, pressed && { opacity: 0.6 }]} accessibilityRole="link">
            <Text style={[font(17, '500'), { color: C.accent }]} allowFontScaling>{route.siteLabel || 'Report it'}</Text>
          </Pressable>
        )}

        {!!rec && (
          <>
            <SectionHeader C={C}>Was this right?</SectionHeader>
            <View style={{ marginHorizontal: 16, flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => { ctx.correct(rec.id, level === 'green' ? 'fine' : 'scam').then(() => ctx.flash('Thanks. Loop Me will remember.')); }} style={({ pressed }) => [st.yn, { backgroundColor: C.card }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                <Text style={[font(16, '600'), { color: C.ink }]} allowFontScaling>{level === 'green' ? 'Yes, it’s fine' : 'Yes, a scam'}</Text>
              </Pressable>
              <Pressable onPress={() => { if (level === 'green') void ctx.markScam(rec.id); else ctx.correct(rec.id, 'fine').then(() => ctx.flash('Noted. It won’t be flagged again.')); }} style={({ pressed }) => [st.yn, { backgroundColor: C.card }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                <Text style={[font(16, '600'), { color: C.ink }]} allowFontScaling>{level === 'green' ? 'No, it’s a scam' : 'No, it’s really them'}</Text>
              </Pressable>
            </View>
          </>
        )}

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
  tag: { height: 28, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  card: { marginHorizontal: 16, borderRadius: 18, paddingHorizontal: 16 },
  num: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  link: { height: 50, alignItems: 'center', justifyContent: 'center' },
  readBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, height: 38, paddingHorizontal: 16, borderRadius: 19 },
  yn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
