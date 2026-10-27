// Caretaker, alert detail. Tinted header, what arrived, what they were told,
// the three one-tap replies plus free text (all of which land full-screen on
// the other phone), call instead, and the thread of notes both ways.
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, ArrowRight, OctagonX, Info } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import { timeLabel } from '../lib/clock';
import { QUICK_NOTES } from '../lib/family';
import type { Ctx } from '../App';

const QUICK: { v: 'scam' | 'call' | 'safe'; text: string }[] = [
  { v: 'scam', text: QUICK_NOTES.scam },
  { v: 'call', text: QUICK_NOTES.call },
  { v: 'safe', text: QUICK_NOTES.safe },
];

export default function WardItemScreen({ ctx }: { ctx: Ctx }) {
  const [draft, setDraft] = useState('');
  const rec = ctx.hist.find(h => h.id === ctx.wardOpen) || ctx.hist.find(h => h.source === 'family');
  const watchName = ctx.settings.watching?.name?.split(' ')[0] || rec?.from?.split(' ')[0] || 'them';
  if (!rec) return null;
  const red = rec.level !== 'amber';
  const tint = red ? T.redTint : T.amberTint;
  const ink = red ? T.redInk : T.amberInk;
  const color = red ? T.red : T.amber;
  const Icon = red ? OctagonX : Info;
  const when = new Date(rec.at);
  const isToday = when.toDateString() === new Date().toDateString();
  const whenLabel = (isToday ? 'Today at ' : '') + timeLabel(when);
  const notes = (rec.notes || []).slice().reverse();

  return (
    <KFIn duration={240} style={{ flex: 1 }} playKey={rec.id}>
    <ScrollView style={st.root} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={st.topRow}>
        <Pressable style={st.back} onPress={() => ctx.go('ward')} accessibilityRole="button">
          <ChevronLeft size={17} color={T.ink} strokeWidth={2} />
          <Text style={st.backText} allowFontScaling>{watchName}’s activity</Text>
        </Pressable>
      </View>

      <View style={[st.banner, { backgroundColor: tint }]}>
        <View style={st.bannerTop}>
          <View style={[st.chip, { backgroundColor: color }]}><Icon size={15} color="#fff" strokeWidth={2.6} /></View>
          <Text style={[st.when, { color: ink }]} allowFontScaling>{whenLabel}</Text>
        </View>
        <Text style={[st.title, { color: ink }]} allowFontScaling>{rec.askedFamily ? watchName + ' asked for your opinion' : red ? 'Scam text stopped' : 'Text worth a second look'}</Text>
        <Text style={[st.from, { color: ink }]} allowFontScaling>From {rec.sender || 'an unknown number'}</Text>
      </View>

      <View style={st.section}>
        <Text style={st.sectionLabel} allowFontScaling>What arrived</Text>
        <View style={st.msgRow}>
          <View style={st.msgRule} />
          <Text style={st.msgText} allowFontScaling>{rec.excerpt}</Text>
        </View>
      </View>

      <View style={st.section}>
        <Text style={st.sectionLabel} allowFontScaling>{watchName} has been told</Text>
        <Text style={st.told} allowFontScaling>{rec.reason}</Text>
      </View>

      <Text style={[st.sectionLabel, { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8 }]} allowFontScaling>Lands on {watchName}’s screen in one tap</Text>
      <View style={{ paddingHorizontal: 20, gap: 7 }}>
        {QUICK.map((q) => (
          <Pressable key={q.v} style={st.quick} onPress={() => ctx.sendNoteTo(rec.id, q.text, q.v)} accessibilityRole="button">
            <Text style={st.quickText} allowFontScaling>{q.text}</Text>
            <ArrowRight size={16} color={T.green} strokeWidth={2.2} />
          </Pressable>
        ))}
        <TextInput
          style={st.draft} multiline placeholder="Or write your own" placeholderTextColor={T.muted}
          value={draft} onChangeText={setDraft} accessibilityLabel="Write your own note"
        />
        <Pressable style={st.send} onPress={() => { ctx.sendNoteTo(rec.id, draft, ''); setDraft(''); }} accessibilityRole="button">
          <Text style={st.sendText} allowFontScaling>Send to {watchName}’s phone</Text>
          <ArrowRight size={19} color="#fff" strokeWidth={2.2} />
        </Pressable>
        <Pressable style={st.call} onPress={() => {
          const p = ctx.settings.watching?.phone;
          if (p) Linking.openURL('tel:' + p.replace(/[^\d+]/g, '')).catch(() => {}); else ctx.go('watch');
        }} accessibilityRole="button">
          <Text style={st.callText} allowFontScaling>Call {watchName} instead</Text>
        </Pressable>
      </View>

      {notes.length > 0 && (
        <View>
          <Text style={[st.sectionLabel, { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8 }]} allowFontScaling>Notes</Text>
          <View style={{ paddingHorizontal: 20 }}>
            {notes.map((n, i) => (
              <View key={i} style={[st.note, !n.mine && { backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline }]}>
                <Text style={[st.noteText, !n.mine && { color: T.ink }]} allowFontScaling>{n.text}</Text>
                <Text style={[st.noteMeta, !n.mine && { color: T.sub }]} allowFontScaling>{n.meta}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  topRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  back: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { fontSize: 17, fontFamily: F.medium, color: T.ink },
  banner: { marginHorizontal: 20, borderRadius: 14, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  chip: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  when: { fontSize: 14, fontFamily: F.semibold },
  title: { fontSize: 26, fontFamily: F.display, letterSpacing: -0.57, marginTop: 12, lineHeight: 28 },
  from: { fontSize: 16, fontFamily: F.medium, marginTop: 8, lineHeight: 22 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: { fontSize: 14, fontFamily: F.semibold, color: T.sub },
  msgRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  msgRule: { width: 3, borderRadius: 2, backgroundColor: T.fieldBorder },
  msgText: { flex: 1, fontSize: 17, fontFamily: F.body, color: T.ink2, lineHeight: 25 },
  told: { fontSize: 17, fontFamily: F.semibold, color: T.ink, marginTop: 7, lineHeight: 24 },
  quick: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
  },
  quickText: { flex: 1, fontSize: 16, fontFamily: F.medium, color: T.ink, lineHeight: 22 },
  draft: {
    minHeight: 76, borderWidth: 1, borderColor: T.hairline, borderRadius: 12, backgroundColor: T.surface,
    padding: 12, fontSize: 17, fontFamily: F.body, color: T.ink, lineHeight: 24, textAlignVertical: 'top',
  },
  send: { height: 56, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  sendText: { fontSize: 17, fontFamily: F.bold, color: '#fff' },
  call: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: T.hairline, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  callText: { fontSize: 16, fontFamily: F.semibold, color: T.ink },
  note: { backgroundColor: T.greenTint, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 7 },
  noteText: { fontSize: 16, fontFamily: F.body, color: T.greenInk2, lineHeight: 23 },
  noteMeta: { fontSize: 13, fontFamily: F.body, color: T.green, marginTop: 5 },
});
