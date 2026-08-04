// The family code word — the FBI's top defense against AI voice cloning.
// A cloned voice can only say what a scammer types. It cannot know a secret
// that was never posted online. Stored on this device only.
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { T } from '../theme';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Screen from '../ui/Screen';
import Card from '../ui/Card';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

export default function CodeWordScreen(props: { settings: Settings; update: (s: Settings) => void; go: (r: Route) => void }) {
  const [word, setWord] = useState('');
  const st = props.settings;
  return (
    <Screen onBack={() => props.go({ name: 'home' })} title="Family code word" centered>
      <Text style={s.sub} allowFontScaling>
        A computer can copy a loved one’s voice from three seconds of audio. It can’t copy a secret.{'\n\n'}
        Pick a word only your family knows — a pet’s nickname, an old inside joke. If a call ever says a family member is in trouble, ask for the word first.
      </Text>
      {st.codeWordSet ? (
        <>
          <Card tone="green" style={s.wordCard}><Text style={s.word} allowFontScaling>{st.codeWord}</Text></Card>
          <Text style={s.note} allowFontScaling>Stored only on this phone. Tell your family in person or on a call you started.</Text>
          <Button label="Remove the code word" kind="ghost" onPress={() => props.update({ ...st, codeWord: '', codeWordSet: false })} />
        </>
      ) : (
        <>
          <Field placeholder="Type your code word" value={word} onChangeText={setWord} style={s.input} />
          <Button label="Save it on this phone" kind="success" onPress={() => { if (word.trim()) props.update({ ...st, codeWord: word.trim(), codeWordSet: true }); }} />
        </>
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  sub: { fontSize: T.body, color: T.inkSoft, textAlign: 'center', marginVertical: 12, lineHeight: 28 },
  wordCard: { alignItems: 'center', paddingVertical: 22 },
  word: { fontSize: 32, fontWeight: '800', color: T.greenText },
  note: { fontSize: T.small, color: T.inkSoft, textAlign: 'center', lineHeight: 24, marginVertical: 8 },
  input: { textAlign: 'center', fontSize: T.bodyLg },
});
