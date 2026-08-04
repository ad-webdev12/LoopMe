// The family code word — the FBI's top defense against AI voice cloning.
// A cloned voice can only say what a scammer types. It cannot know a secret
// that was never posted online. Stored on this device only.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { T } from '../theme';
import BigButton from '../components/BigButton';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

export default function CodeWordScreen(props: { settings: Settings; update: (s: Settings) => void; go: (r: Route) => void }) {
  const [word, setWord] = useState('');
  const st = props.settings;
  return (
    <View style={s.wrap}>
      <Text style={s.title} allowFontScaling>Your family code word</Text>
      <Text style={s.sub} allowFontScaling>
        A computer can copy a loved one\u2019s voice from three seconds of audio. It can\u2019t copy a secret.{'\n\n'}
        Pick a word only your family knows — a pet\u2019s nickname, an old inside joke. If a call ever says a family member is in trouble, ask for the word first.
      </Text>
      {st.codeWordSet ? (
        <>
          <View style={s.card}><Text style={s.word} allowFontScaling>{st.codeWord}</Text></View>
          <Text style={s.note} allowFontScaling>Stored only on this phone. Tell your family in person or on a call you started.</Text>
          <BigButton label="Remove the code word" kind="quiet" onPress={() => props.update({ ...st, codeWord: '', codeWordSet: false })} />
        </>
      ) : (
        <>
          <TextInput style={s.input} placeholder="Type your code word" placeholderTextColor={T.inkSoft} value={word} onChangeText={setWord} accessibilityLabel="Family code word" />
          <BigButton label="Save it on this phone" color={T.green} onPress={() => { if (word.trim()) props.update({ ...st, codeWord: word.trim(), codeWordSet: true }); }} />
        </>
      )}
      <BigButton label="Done" kind="quiet" onPress={() => props.go({ name: 'home' })} />
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, padding: 24, paddingTop: 32 },
  title: { fontSize: T.headline, fontWeight: '800', color: T.ink, textAlign: 'center' },
  sub: { fontSize: T.body, color: T.inkSoft, textAlign: 'center', marginVertical: 14, lineHeight: 30 },
  card: { backgroundColor: T.greenSoft, borderRadius: T.radius, padding: 24, alignItems: 'center', marginVertical: 10 },
  word: { fontSize: 34, fontWeight: '800', color: T.green },
  note: { fontSize: 17, color: T.inkSoft, textAlign: 'center', lineHeight: 25, marginVertical: 8 },
  input: { backgroundColor: T.card, borderRadius: 18, padding: 18, fontSize: T.body + 2, color: T.ink, marginVertical: 10, textAlign: 'center' },
});
