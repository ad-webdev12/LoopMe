// Settings — source lines 327-338. Three toggles, the iPhone auto-check note,
// safe senders, setup rows, version line.
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import type { Ctx } from '../App';

export default function SettingsScreen({ ctx }: { ctx: Ctx }) {
  const st_ = ctx.settings;
  const [toggles, setToggles] = useState({ alerts: st_.alerts, auto: st_.autoCheck, aloud: st_.readAloud });
  const flip = (key: 'alerts' | 'auto' | 'aloud') => {
    const next = { ...toggles, [key]: !toggles[key] };
    setToggles(next);
    ctx.update({ ...st_, alerts: next.alerts, autoCheck: next.auto, readAloud: next.aloud });
  };
  const rows = [
    { key: 'alerts' as const, title: 'Warn me straight away', why: 'A full-screen warning the moment a text looks like a scam.' },
    { key: 'auto' as const, title: 'Check unknown texts for me', why: 'Every text from a number you don’t know, checked here on the phone.' },
    { key: 'aloud' as const, title: 'Read answers out loud', why: 'Speak every answer so you don’t have to read small print.' },
  ];

  return (
    <KFIn duration={260} style={{ flex: 1 }} playKey="settings">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={st.topRow}>
        <Pressable style={st.back} onPress={() => ctx.go('more')} accessibilityRole="button">
          <ChevronLeft size={18} color={T.ink} strokeWidth={2.2} />
          <Text style={st.backText} allowFontScaling>Back</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
        <Text style={st.title} allowFontScaling>Settings</Text>
      </View>

      <Text style={st.section} allowFontScaling>WATCHING FOR SCAMS</Text>
      <View style={st.card}>
        {rows.map((r, i) => (
          <View key={r.key} style={[st.toggleRow, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={st.rowTitle} allowFontScaling>{r.title}</Text>
              <Text style={st.rowWhy} allowFontScaling>{r.why}</Text>
            </View>
            <Pressable
              style={[st.track, { backgroundColor: toggles[r.key] ? T.green : T.rowHover, borderColor: toggles[r.key] ? T.green : T.fieldBorder, justifyContent: toggles[r.key] ? 'flex-end' : 'flex-start' }]}
              onPress={() => flip(r.key)} accessibilityRole="switch" accessibilityState={{ checked: toggles[r.key] }}>
              <View style={st.thumb} />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={st.autoCard}>
        <Text style={st.autoTitle} allowFontScaling>Auto-check on iPhone</Text>
        <Text style={st.autoBody} allowFontScaling>iPhone lets us check texts from unknown senders only, and you switch it on in the Settings app: Settings › Apps › Messages › Unknown & Junk. iMessage and WhatsApp are sealed off from every app, so use Share for those.</Text>
        <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button">
          <Text style={st.autoLink} allowFontScaling>Open iPhone Settings ›</Text>
        </Pressable>
      </View>

      <Text style={st.section} allowFontScaling>SENDERS YOU TRUST</Text>
      <View style={st.card}>
        {st_.allowlist.map((a, i) => (
          <View key={i} style={st.allowRow}>
            <Text style={st.allowLabel} allowFontScaling>{a}</Text>
            <Pressable onPress={() => ctx.update({ ...st_, allowlist: st_.allowlist.filter((_, j) => j !== i) })} accessibilityRole="button">
              <Text style={st.allowRemove} allowFontScaling>Remove</Text>
            </Pressable>
          </View>
        ))}
        <Pressable style={st.addRow} onPress={() => ctx.flash('Add a name or number, like your bank’s real alert number.')} accessibilityRole="button">
          <Plus size={16} color={T.green} strokeWidth={2.2} />
          <Text style={st.addText} allowFontScaling>Add a safe sender</Text>
        </Pressable>
      </View>

      <Text style={[st.section, { paddingTop: 14 }]} allowFontScaling>SETUP</Text>
      <View style={st.card}>
        <Pressable style={st.setupRow} onPress={() => ctx.go('care')} accessibilityRole="button">
          <Text style={st.setupText} allowFontScaling>Set up for someone else</Text>
          <ChevronRight size={17} color={T.green} strokeWidth={2.2} />
        </Pressable>
        <Pressable style={[st.setupRow, { borderBottomWidth: 0 }]} onPress={() => ctx.go('intro')} accessibilityRole="button">
          <Text style={st.setupText} allowFontScaling>Play the introduction again</Text>
          <ChevronRight size={17} color={T.green} strokeWidth={2.2} />
        </Pressable>
      </View>

      <Text style={st.version} allowFontScaling>Loop Me 3.0 · works offline · no account · nothing kept on any server</Text>
      <View style={{ height: 104 }} />
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  topRow: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  back: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  backText: { fontSize: 14, fontFamily: F.semibold, color: T.ink },
  title: { fontSize: 27, fontFamily: F.display, letterSpacing: -0.54, color: T.ink, lineHeight: 28.6 },
  section: { paddingHorizontal: 22, paddingBottom: 7, fontSize: 10, fontFamily: F.semibold, letterSpacing: 1.4, color: T.sub },
  card: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.divider },
  rowTitle: { fontSize: 15, fontFamily: F.bold, color: T.ink },
  rowWhy: { fontSize: 12.5, fontFamily: F.body, color: T.sub, lineHeight: 18.1, marginTop: 3 },
  track: { width: 52, height: 31, borderRadius: 16, borderWidth: 1, padding: 2 },
  thumb: { width: 25, height: 25, borderRadius: 13, backgroundColor: '#fff', shadowColor: '#d6d6d1', shadowOpacity: 1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  autoCard: { marginHorizontal: 22, marginVertical: 14, backgroundColor: T.greenTint, paddingHorizontal: 16, paddingVertical: 14 },
  autoTitle: { fontSize: 13, fontFamily: F.bold, color: T.green, marginBottom: 5 },
  autoBody: { fontSize: 12.5, fontFamily: F.body, color: T.greenInk2, lineHeight: 18.75 },
  autoLink: { fontSize: 12.5, fontFamily: F.bold, color: T.green, marginTop: 9 },
  allowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: T.divider },
  allowLabel: { fontSize: 14.5, fontFamily: F.semibold, color: T.ink },
  allowRemove: { fontSize: 12, fontFamily: F.semibold, color: T.sub },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingVertical: 14 },
  addText: { fontSize: 14.5, fontFamily: F.bold, color: T.ink },
  setupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: T.divider },
  setupText: { fontSize: 14.5, fontFamily: F.bold, color: T.ink },
  version: { paddingHorizontal: 22, paddingTop: 16, fontSize: 12, fontFamily: F.body, color: T.sub, lineHeight: 18 },
});
