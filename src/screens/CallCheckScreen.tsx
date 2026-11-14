// Was it a phone call? Three questions, one card at a time; any Yes is a
// scam call. The answers become a real check in History so the family can
// see it and the number can be blocked.
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { T, font } from '../theme';
import { Screen, BackLink, ScreenTitle, Lead, Swap, Pill } from '../ui/base';
import { loopPerson, firstName } from '../ui/pieces';
import { newRecord, addCheck } from '../lib/history';
import * as Family from '../lib/family';
import type { Ctx } from '../App';

const QS = [
  'Did they ask for money, gift cards or crypto?',
  'Did they say it was urgent, or that you’d be in trouble?',
  'Did they tell you to keep it secret or stay on the line?',
];
const TAGS = ['asked for money or gift cards', 'said it was urgent or threatened trouble', 'asked for secrecy or to stay on the line'];

export default function CallCheckScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const [i, setI] = useState(0);
  const [yes, setYes] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const [asking, setAsking] = useState(false);
  const [num, setNum] = useState('');
  const who = firstName(loopPerson(s)?.name);
  const scam = yes.some(Boolean);

  const answer = (v: boolean) => {
    const next = [...yes, v];
    setYes(next);
    if (i < QS.length - 1) setI(i + 1); else finish(next);
  };
  const finish = async (answers: boolean[]) => {
    setDone(true);
    if (!answers.some(Boolean)) return;
    const what = TAGS.filter((_, k) => answers[k]);
    const rec = newRecord({ message: 'A phone call. The caller ' + what.join(', ') + '.', level: 'red', score: 60, tags: ['call'], reason: 'Scam calls follow this pattern.', source: 'typed' });
    rec.sender = 'A phone call';
    await addCheck(rec);
    ctx.refreshHist();
    if (s.familyLinked && s.familyRole === 'owner') void Family.publish(rec, s, false);
  };
  const blockEntered = async () => {
    const d = num.replace(/\D/g, '');
    if (d.length < 7) { ctx.flash('Type the whole number, with the area code.'); return; }
    setAsking(false);
    await ctx.blockNumber(num);
    ctx.go('home');
    ctx.flash('Blocked. That number can’t call or text you now.');
  };

  return (
    <Screen C={C} playKey="callcheck" scroll>
      <BackLink onPress={() => ctx.go('home')} />
      <ScreenTitle C={C} top={8}>Was it a phone call?</ScreenTitle>
      <Lead C={C}>No app can listen to your calls. But scam calls follow a pattern, and three questions usually give it away.</Lead>

      {!done ? (
        <Swap playKey={i} ms={200} style={[st.card, { backgroundColor: C.card }]}>
          <Text style={[font(14, '600'), { color: T.green }]} allowFontScaling>Question {i + 1} of {QS.length}</Text>
          <Text style={[font(23, '700', 1.25), { color: C.ink, marginTop: 8 }]} allowFontScaling>{QS[i]}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            {(['Yes', 'No'] as const).map(l => (
              <Pressable key={l} onPress={() => answer(l === 'Yes')} style={({ pressed }) => [st.yn, { backgroundColor: pressed ? C.pressed : C.ground }]} accessibilityRole="button">
                <Text style={[font(18, '600'), { color: C.ink }]} allowFontScaling>{l}</Text>
              </Pressable>
            ))}
          </View>
        </Swap>
      ) : scam ? (
        <Swap playKey="scam" style={[st.card, { backgroundColor: T.red, paddingVertical: 22, paddingHorizontal: 20 }]}>
          <Text style={[font(28, '800', 1.1), { color: '#fff' }]} allowFontScaling>That sounds like a scam call.</Text>
          <Text style={[font(16, '400', 1.45), { color: '#fff', marginTop: 10 }]} allowFontScaling>If they call again, hang up. Then call the person or company on a number you already have.</Text>
          <Pill label="Block the number" bg="#fff" color={T.red} height={52} style={{ marginTop: 18 }} onPress={() => setAsking(true)} />
          <Pill label={who ? 'Loop in ' + who : 'Loop in someone'} bg="rgba(255,255,255,.2)" height={52} style={{ marginTop: 10 }}
            onPress={() => { if (s.familyLinked) { ctx.flash('It is on ' + who + '’s phone now.'); ctx.go('home'); } else ctx.go('family'); }} />
        </Swap>
      ) : (
        <Swap playKey="fine" style={[st.card, { backgroundColor: T.green, paddingVertical: 22, paddingHorizontal: 20 }]}>
          <Text style={[font(28, '800', 1.1), { color: '#fff' }]} allowFontScaling>Nothing we know of.</Text>
          <Text style={[font(16, '400', 1.45), { color: '#fff', marginTop: 10 }]} allowFontScaling>None of the usual signs. If anything still feels off, {who ? 'ask ' + who : 'ask someone you trust'} before you do anything.</Text>
          <Pill label="Done" bg="#fff" color={T.greenDeep} height={52} style={{ marginTop: 18 }} onPress={() => ctx.go('home')} />
        </Swap>
      )}

      <Modal visible={asking} transparent animationType="fade" onRequestClose={() => setAsking(false)}>
        <Pressable style={st.dim} onPress={() => setAsking(false)}>
          <Pressable style={[st.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
            <Text style={[font(20, '700'), { color: C.ink }]} allowFontScaling>The number that called</Text>
            <TextInput value={num} onChangeText={setNum} keyboardType="phone-pad" autoFocus placeholder="Type the number" placeholderTextColor={C.meta}
              style={[font(22, '500'), { color: C.ink, backgroundColor: C.ground, borderRadius: 12, padding: 14, marginTop: 14 }]} />
            <Pill label="Block it" bg={T.red} style={{ marginTop: 14 }} onPress={blockEntered} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const st = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 24, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 18 },
  yn: { flex: 1, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
});
