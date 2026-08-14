// Caretaker, alert detail — source lines 411-429. Tinted header, what arrived,
// what she was told, three one-tap notes + free text, send (a real SMS with a
// deep link that lands the note on her phone), call instead, notes thread.
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, ArrowRight, OctagonX, Info } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import type { Ctx } from '../App';

const QUICK = [
  'It is fake. Please delete it and do not reply.',
  'Do not tap anything, I will call you now.',
  'That one is genuine, you are fine to open it.',
];

export default function WardItemScreen({ ctx }: { ctx: Ctx }) {
  const [draft, setDraft] = useState('');
  const rec = ctx.hist.find(h => h.id === ctx.wardOpen) || ctx.hist.find(h => h.source === 'family');
  const watchName = ctx.settings.watching?.name?.split(' ')[0] || 'Ruth';
  if (!rec) return null;
  const red = rec.level !== 'amber';
  const tint = red ? T.redTint : T.amberTint;
  const ink = red ? T.redInk : T.amberInk;
  const color = red ? T.red : T.amber;
  const Icon = red ? OctagonX : Info;
  const when = new Date(rec.at);
  const isToday = when.toDateString() === new Date().toDateString();
  const whenLabel = (isToday ? 'Today at ' : '') + when.getHours() + ':' + String(when.getMinutes()).padStart(2, '0');
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
        <Text style={[st.title, { color: ink }]} allowFontScaling>{red ? 'Scam text stopped' : 'Text worth a second look'}</Text>
        <Text style={[st.from, { color: ink }]} allowFontScaling>From {rec.sender || rec.from}</Text>
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

      <Text style={[st.sectionLabel, { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8 }]} allowFontScaling>Send a note to her phone</Text>
      <View style={{ paddingHorizontal: 20, gap: 7 }}>
        {QUICK.map((q) => (
          <Pressable key={q} style={st.quick} onPress={() => ctx.sendNoteTo(rec.id, q)} accessibilityRole="button">
            <Text style={st.quickText} allowFontScaling>{q}</Text>
            <ArrowRight size={16} color={T.green} strokeWidth={2.2} />
          </Pressable>
        ))}
        <TextInput
          style={st.draft} multiline placeholder="Or write your own" placeholderTextColor={T.muted}
          value={draft} onChangeText={setDraft} accessibilityLabel="Write your own note"
        />
        <Pressable style={st.send} onPress={() => { ctx.sendNoteTo(rec.id, draft); setDraft(''); }} accessibilityRole="button">
          <Text style={st.sendText} allowFontScaling>Send to {watchName}’s phone</Text>
          <ArrowRight size={19} color="#fff" strokeWidth={2.2} />
        </Pressable>
        <Pressable style={st.call} onPress={() => {
          const p = ctx.settings.watching?.phone;
          if (p) Linking.openURL('tel:' + p.replace(/[^\d+]/g, '')); else ctx.flash('Calling ' + watchName + '…');
        }} accessibilityRole="button">
          <Text style={st.callText} allowFontScaling>Call {watchName} instead</Text>
        </Pressable>
      </View>

      {notes.length > 0 && (
        <View>
          <Text style={[st.sectionLabel, { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8 }]} allowFontScaling>Notes you have sent</Text>
          <View style={{ paddingHorizontal: 20 }}>
            {notes.map((n, i) => (
              <View key={i} style={st.note}>
                <Text style={st.noteText} allowFontScaling>{n.text}</Text>
                <Text style={st.noteMeta} allowFontScaling>{n.meta}</Text>
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
  backText: { fontSize: 15, fontFamily: F.medium, color: T.ink },
  banner: { marginHorizontal: 20, borderRadius: 14, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  chip: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  when: { fontSize: 12.5, fontFamily: F.semibold },
  title: { fontSize: 26, fontFamily: F.display, letterSpacing: -0.57, marginTop: 12, lineHeight: 27.6 },
  from: { fontSize: 15, fontFamily: F.medium, marginTop: 8, lineHeight: 21 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: { fontSize: 12.5, fontFamily: F.semibold, color: T.sub },
  msgRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  msgRule: { width: 3, borderRadius: 2, backgroundColor: T.fieldBorder },
  msgText: { flex: 1, fontSize: 15, fontFamily: F.body, color: T.ink2, lineHeight: 23.25 },
  told: { fontSize: 16, fontFamily: F.semibold, color: T.ink, marginTop: 7, lineHeight: 23.2 },
  quick: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
  },
  quickText: { flex: 1, fontSize: 14.5, fontFamily: F.medium, color: T.ink, lineHeight: 20.3 },
  draft: {
    minHeight: 76, borderWidth: 1, borderColor: T.hairline, borderRadius: 12, backgroundColor: T.surface,
    padding: 12, fontSize: 15, fontFamily: F.body, color: T.ink, lineHeight: 21.75, textAlignVertical: 'top',
  },
  send: { height: 54, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  sendText: { fontSize: 16, fontFamily: F.bold, color: '#fff' },
  call: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: T.hairline, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  callText: { fontSize: 15, fontFamily: F.semibold, color: T.ink },
  note: { backgroundColor: T.greenTint, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 7 },
  noteText: { fontSize: 14.5, fontFamily: F.body, color: T.greenInk2, lineHeight: 21.75 },
  noteMeta: { fontSize: 11.5, fontFamily: F.body, color: T.green, marginTop: 5 },
});
