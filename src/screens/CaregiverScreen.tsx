// Set up for someone else. Four real things: each tick reflects the phone's
// true state (a trusted person, the link, the permissions, the secret word)
// and tapping a row takes you to where it is done.
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, ScreenTitle, Lead, Pill, CheckCircle } from '../ui/base';
import { callDirectoryStatus } from '../../modules/scam-ai';
import type { Ctx } from '../App';

export default function CaregiverScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const [calls, setCalls] = useState<'enabled' | 'disabled' | 'unknown'>('unknown');
  const [wordOpen, setWordOpen] = useState(false);
  const [word, setWord] = useState('');
  useEffect(() => { callDirectoryStatus().then(setCalls).catch(() => {}); }, []);
  const perms = ctx.tallies.filtered > 0 && calls === 'enabled';
  const items = [
    { t: 'Add a person to call', b: 'Reached in one tap from any scam warning.', on: s.trusted.length > 0, go: () => ctx.go('family') },
    { t: s.careName ? 'Link your own phone' : 'Send someone the invite', b: s.careName ? 'Send yourself the invite. Flagged texts then show up on your phone.' : 'They hear about each scam on their own phone.', on: s.familyLinked, go: () => ctx.go('family') },
    { t: 'Turn on scam protection', b: 'Two switches in iPhone Settings.', on: perms, go: () => ctx.go('setup') },
    { t: 'Set the family secret word', b: 'One word only your family knows.', on: s.codeWordSet, go: () => setWordOpen(true) },
  ];
  const done = items.filter(i => i.on).length;
  const saveWord = () => {
    const w = word.trim();
    if (w.length < 3) { ctx.flash('Pick a word of three letters or more.'); return; }
    ctx.update({ ...s, codeWord: w, codeWordSet: true });
    setWordOpen(false); setWord('');
    ctx.flash('Saved. Only this phone has it.');
  };
  const copy = async () => {
    const lines = items.map(i => (i.on ? '✓ ' : '○ ') + i.t);
    await Share.share({ message: 'Loop Me on ' + (s.myName || 'their phone') + ':\n' + lines.join('\n') + (s.trusted[0] ? '\nTrusted: ' + s.trusted.map(t => t.name).join(', ') : '') });
  };

  return (
    <Screen C={C} playKey="caregiver">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <BackLink onPress={() => ctx.go('settings')} />
        <ScreenTitle C={C} top={12}>Finish setting up</ScreenTitle>
        <Lead C={C} top={8}>Each line fills in on its own once it is done.</Lead>
        <View style={[st.list, { backgroundColor: C.card }]}>
          {items.map((it, i) => (
            <Pressable key={it.t} onPress={it.go} style={({ pressed }) => [st.row, i < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep }, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityState={{ checked: it.on }}>
              <CheckCircle on={it.on} />
              <View style={{ flex: 1 }}>
                <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>{it.t}</Text>
                <Text style={[font(15, '400', 1.4), { color: C.ink2, marginTop: 2 }]} allowFontScaling>{it.b}</Text>
              </View>
            </Pressable>
          ))}
        </View>
        <Text style={[font(15, '600'), { color: T.green, paddingHorizontal: 20, paddingTop: 14 }]} allowFontScaling>{done} of 4 done</Text>
        <View style={{ marginHorizontal: 16, marginTop: 12, gap: 10 }}>
          <Pill label={s.careName ? 'Hand the phone back' : 'Done'} trailing={<ArrowRight size={18} color="#fff" strokeWidth={2.2} />} onPress={() => { ctx.go('home'); if (s.careName) ctx.flash('All set. Hand the phone back.'); }} />
          {!!s.careName && <Pill label="Send myself a copy of these settings" height={54} bg={C.card} color={C.ink} onPress={copy} />}
        </View>
      </ScrollView>

      <Modal visible={wordOpen} transparent animationType="fade" onRequestClose={() => setWordOpen(false)}>
        <Pressable style={st.dim} onPress={() => setWordOpen(false)}>
          <Pressable style={[st.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
            <Text style={[font(20, '700'), { color: C.ink }]} allowFontScaling>The family secret word</Text>
            <Text style={[font(15, '400', 1.4), { color: C.ink2, marginTop: 6 }]} allowFontScaling>Something only your family knows. It stays on this phone, behind Face ID.</Text>
            <TextInput value={word} onChangeText={setWord} autoFocus autoCapitalize="words" autoCorrect={false} placeholder="One word" placeholderTextColor={C.meta}
              style={[font(22, '600'), { color: C.ink, backgroundColor: C.ground, borderRadius: 12, padding: 14, marginTop: 14 }]} />
            <Pill label="Save it" style={{ marginTop: 14 }} onPress={saveWord} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const st = StyleSheet.create({
  badge: { alignSelf: 'flex-start', marginLeft: 20, marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 7, height: 30, paddingHorizontal: 12, borderRadius: 15 },
  list: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
});
