// "A caller is asking me for something" — live help while the phone is in their hand.
// Plus the "hang up permission" screen: telling an older person, unambiguously,
// that hanging up is allowed. This psychological barrier costs people their savings.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Volume2 } from 'lucide-react-native';
import { T, F } from '../theme';
import Button from '../ui/Button';
import { readAloud } from '../lib/speech';
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
    <View style={s.wrap}>
      <Text style={s.count} allowFontScaling>Question {i + 1} of {QUESTIONS.length}</Text>
      <Text style={s.big} allowFontScaling>{QUESTIONS[i]}</Text>
      <Button label="Yes" kind="danger" onPress={() => setFlagged(true)} />
      <Button label="No" kind="secondary" onPress={() => {
        if (i + 1 < QUESTIONS.length) setI(i + 1);
        else props.go({ name: 'home' });
      }} />
      <Button label="Never mind" kind="ghost" onPress={() => props.go({ name: 'home' })} />
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, padding: 28, justifyContent: 'center', backgroundColor: T.cream },
  count: { fontSize: T.caption, fontFamily: F.bodyBold, color: T.inkSoft, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.8 },
  big: { fontSize: T.headline, fontFamily: F.displayBold, color: T.ink, textAlign: 'center', marginVertical: 18, lineHeight: 40, letterSpacing: -0.4 },
  sub: { fontSize: T.bodyLg, fontFamily: F.body, color: T.ink, textAlign: 'center', lineHeight: 31, marginBottom: 18 },
});
