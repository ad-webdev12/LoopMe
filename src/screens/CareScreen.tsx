// Caregiver mode: amber badge, four steps that read their real state from
// the settings on this phone, done counter, hand the phone back.
import React from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ArrowRight, Check, User } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import type { Ctx } from '../App';

export default function CareScreen({ ctx }: { ctx: Ctx }) {
  const s = ctx.settings;
  const name = s.careName || s.myName || 'them';
  const steps = [
    { title: 'Add a trusted person', body: 'The person one tap reaches when something looks wrong.', done: s.trusted.length > 0, go: 'people' as const },
    { title: 'Link your own phone', body: 'Send yourself the invite, so flagged texts appear on your phone the moment they happen.', done: s.familyLinked && s.familyRole === 'owner', go: 'watchedBy' as const },
    { title: 'Turn on checking for unknown texts', body: 'Settings › Apps › Messages › Unknown & Junk › Loop Me. Scam texts then go straight to Junk.', done: s.autoCheck && ctx.tallies.filtered > 0, go: 'settings' as const },
    { title: 'Set the family code word', body: 'One word only your family knows. The surest answer to a cloned voice.', done: s.codeWordSet, go: 'settings' as const },
  ];
  const count = steps.filter(x => x.done).length;

  const copy = async () => {
    const lines = [
      'Loop Me, set up for ' + name,
      'Trusted: ' + (s.trusted.map(t => t.name).join(', ') || 'nobody yet'),
      'Family link: ' + (s.familyLinked ? 'on, with ' + (s.watchedBy || 'a caretaker') : 'not yet'),
      'Unknown texts checked: ' + (s.autoCheck ? 'on' : 'off'),
      'Code word: ' + (s.codeWordSet ? 'set' : 'not set'),
      'Safe senders: ' + (s.allowlist.join(', ') || 'none'),
    ];
    try { await Share.share({ message: lines.join('\n') }); } catch {}
  };

  return (
    <KFIn duration={260} style={{ flex: 1 }} playKey="care">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={st.topRow}>
        <Pressable style={st.back} onPress={() => ctx.go('more')} accessibilityRole="button">
          <ChevronLeft size={18} color={T.ink} strokeWidth={2.2} />
          <Text style={st.backText} allowFontScaling>Back</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
        <View style={st.badge}>
          <User size={14} color={T.amber} strokeWidth={2.2} />
          <Text style={st.badgeText} allowFontScaling>CAREGIVER MODE</Text>
        </View>
        <Text style={st.title} allowFontScaling>Set up for {name}</Text>
        <Text style={st.sub} allowFontScaling>Four things to check, then hand the phone back. Each one opens the screen where it is done. Nothing here is hidden from them.</Text>
      </View>
      <View style={st.card}>
        {steps.map((c, i) => (
          <Pressable key={i} style={[st.row, i === steps.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => ctx.go(c.go)} accessibilityRole="button" accessibilityState={{ checked: c.done }}>
            <View style={[st.tick, { borderColor: c.done ? T.green : T.fieldBorder, backgroundColor: c.done ? T.green : T.surface }]}>
              {c.done && <Check size={13} color="#fff" strokeWidth={3} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.rowTitle} allowFontScaling>{c.title}</Text>
              <Text style={st.rowBody} allowFontScaling>{c.body}</Text>
            </View>
            <ArrowRight size={16} color={T.sub} strokeWidth={2} />
          </Pressable>
        ))}
      </View>
      <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 104, gap: 9 }}>
        <Text style={st.doneLabel} allowFontScaling>{count} OF 4 DONE</Text>
        <Pressable style={st.cta} onPress={() => ctx.go('home')} accessibilityRole="button">
          <Text style={st.ctaText} allowFontScaling>Hand the phone back</Text>
          <ArrowRight size={19} color="#fff" strokeWidth={2.2} />
        </Pressable>
        <Pressable style={st.ghost} onPress={copy} accessibilityRole="button">
          <Text style={st.ghostText} allowFontScaling>Send myself a copy of these settings</Text>
        </Pressable>
      </View>
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  topRow: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  back: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontFamily: F.semibold, color: T.ink },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: T.amberTint, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, marginBottom: 11 },
  badgeText: { fontSize: 11.5, fontFamily: F.display, letterSpacing: 1.4, color: T.amber },
  title: { fontSize: 27, fontFamily: F.display, letterSpacing: -0.54, color: T.ink, lineHeight: 30 },
  sub: { fontSize: 15.5, fontFamily: F.body, color: T.sub, lineHeight: 22.5, marginTop: 6 },
  card: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderBottomWidth: 1, borderBottomColor: T.divider },
  tick: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16.5, fontFamily: F.bold, color: T.ink },
  rowBody: { fontSize: 15, fontFamily: F.body, color: T.sub, lineHeight: 21, marginTop: 3 },
  doneLabel: { fontSize: 11.5, fontFamily: F.semibold, letterSpacing: 1.4, color: T.sub },
  cta: { height: 58, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17, marginTop: 4 },
  ctaText: { fontSize: 17, fontFamily: F.bold, color: '#fff' },
  ghost: { height: 50, borderWidth: 1, borderColor: T.fieldBorder, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  ghostText: { fontSize: 16, fontFamily: F.bold, color: T.ink },
});
