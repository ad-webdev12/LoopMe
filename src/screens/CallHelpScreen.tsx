// "A caller is asking me for something" — live help while the phone is in their hand.
// Plus the "hang up permission" screen: telling an older person, unambiguously,
// that hanging up is allowed. This psychological barrier costs people their savings.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T } from '../theme';
import BigButton from '../components/BigButton';
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
        <BigButton label="\uD83D\uDD0A  Read it to me" kind="secondary" onPress={() => readAloud(msg)} />
        {props.settings.trusted[0] && <BigButton label={`Call ${props.settings.trusted[0].name}`} color={T.green} onPress={() => import('../lib/loopIn').then(m => m.callPerson(props.settings.trusted[0]))} />}
        <BigButton label="Back home" kind="quiet" onPress={() => props.go({ name: 'home' })} />
      </View>
    );
  }
  return (
    <View style={s.wrap}>
      <Text style={s.count} allowFontScaling>Question {i + 1} of {QUESTIONS.length}</Text>
      <Text style={s.big} allowFontScaling>{QUESTIONS[i]}</Text>
      <BigButton label="Yes" color={T.red} onPress={() => setFlagged(true)} />
      <BigButton label="No" kind="secondary" onPress={() => {
        if (i + 1 < QUESTIONS.length) setI(i + 1);
        else props.go({ name: 'home' });
      }} />
      <BigButton label="Never mind" kind="quiet" onPress={() => props.go({ name: 'home' })} />
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, padding: 28, justifyContent: 'center' },
  count: { fontSize: 17, fontWeight: '700', color: T.inkSoft, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  big: { fontSize: T.headline, fontWeight: '800', color: T.ink, textAlign: 'center', marginVertical: 18, lineHeight: 42 },
  sub: { fontSize: T.body + 1, color: T.ink, textAlign: 'center', lineHeight: 32, marginBottom: 20 },
});
