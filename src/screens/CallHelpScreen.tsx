// "A caller is asking me for something" — live help while the phone is in their hand.
// Optional number lookup first (local call screening without a reputation DB),
// then the 3-question triage, ending in the "hang up permission" screen — telling an
// older person, unambiguously, that hanging up is allowed.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PhoneIncoming, Volume2 } from 'lucide-react-native';
import { T, F, LEVEL_META } from '../theme';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Field from '../ui/Field';
import Screen from '../ui/Screen';
import { readAloud } from '../lib/speech';
import { checkNumber, NumberVerdict } from '../engine/numberCheck';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

const QUESTIONS = [
  'Is the call about money, gift cards, codes, or your account?',
  'Are they rushing you, or saying it must happen right now?',
  'Did they say to keep it secret, or not to hang up?',
];

export default function CallHelpScreen(props: { settings: Settings; go: (r: Route) => void }) {
  const [i, setI] = useState(0);
  const [flagged, setFlagged] = useState(false);
  const [num, setNum] = useState('');
  const [numResult, setNumResult] = useState<NumberVerdict | null>(null);

  if (flagged) {
    const msg = 'Hang up. You are allowed to hang up on anyone — it is not rude, and you owe a stranger nothing. Real banks, real police, and real family will never be angry that you checked. Then call back on a number you already trust.' + (props.settings.codeWordSet ? ' If they claimed to be family, ask for your code word first.' : '');
    return (
      <View style={[s.wrap, { backgroundColor: T.redSoft }]}>
        <Text style={s.big} allowFontScaling>Hang up.</Text>
        <Text style={s.sub} allowFontScaling>{msg}</Text>
        <Button label="Read it to me" kind="secondary" icon={Volume2} onPress={() => readAloud(msg)} />
        {props.settings.trusted[0] && <Button label={`Call ${props.settings.trusted[0].name}`} kind="success" onPress={() => import('../lib/loopIn').then(m => m.callPerson(props.settings.trusted[0]))} />}
        <Button label="Back home" kind="ghost" onPress={() => props.go({ name: 'home' })} />
      </View>
    );
  }

  return (
    <Screen onBack={() => props.go({ name: 'home' })} title="Someone’s calling me" centered>
      <Card>
        <View style={s.numHead}>
          <PhoneIncoming size={20} color={T.accent} strokeWidth={2.2} />
          <Text style={s.numTitle} allowFontScaling>Check the number (optional)</Text>
        </View>
        <Field placeholder="Type the number on your screen" value={num}
          onChangeText={(v) => { setNum(v); setNumResult(null); }} keyboardType="phone-pad" />
        <Button label="Look it up" kind="secondary" size="compact" onPress={() => num.trim() && setNumResult(checkNumber(num))} />
        {numResult && (
          <View style={[s.numResult, { backgroundColor: LEVEL_META[numResult.level].soft }]}>
            <Text style={[s.numVerdict, { color: LEVEL_META[numResult.level].text }]} allowFontScaling>{numResult.title}</Text>
            <Text style={s.numBody} allowFontScaling>{numResult.body}</Text>
          </View>
        )}
      </Card>

      <Text style={s.count} allowFontScaling>Question {i + 1} of {QUESTIONS.length}</Text>
      <Text style={s.big} allowFontScaling>{QUESTIONS[i]}</Text>
      <Button label="Yes" kind="danger" onPress={() => setFlagged(true)} />
      <Button label="No" kind="secondary" onPress={() => {
        if (i + 1 < QUESTIONS.length) setI(i + 1);
        else props.go({ name: 'home' });
      }} />
      <Button label="Never mind" kind="ghost" onPress={() => props.go({ name: 'home' })} />
    </Screen>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, padding: 28, justifyContent: 'center', backgroundColor: T.cream },
  count: { fontSize: T.caption, fontFamily: F.bodyBold, color: T.inkSoft, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 14 },
  big: { fontSize: T.headline, fontFamily: F.displayBold, color: T.ink, textAlign: 'center', marginVertical: 16, lineHeight: 40, letterSpacing: -0.4 },
  sub: { fontSize: T.bodyLg, fontFamily: F.body, color: T.ink, textAlign: 'center', lineHeight: 31, marginBottom: 18 },
  numHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  numTitle: { fontSize: T.body, fontFamily: F.bodyBold, color: T.ink },
  numResult: { borderRadius: T.radiusSm, padding: 14, marginTop: 8 },
  numVerdict: { fontSize: T.body, fontFamily: F.bodyBold, marginBottom: 6 },
  numBody: { fontSize: T.small, fontFamily: F.body, color: T.ink, lineHeight: 24 },
});
