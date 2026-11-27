// The family secret word, on the Family tab. Hidden until Face ID says it's
// you; hides again when you leave. Set or change it from here.
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { KeyRound, ScanFace } from 'lucide-react-native';
import { T, font } from '../theme';
import { Pill, SmallBtn, Swap } from './base';
import type { Ctx } from '../App';

export function SecretWordCard({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const [word, setWord] = useState<'locked' | 'scanning' | 'shown'>('locked');
  const [editing, setEditing] = useState(false);
  const [draft, setDraftState] = useState('');
  // The live text, so Save reads exactly what is in the box this instant.
  const draftRef = useRef('');
  const setDraft = (t: string) => { draftRef.current = t; setDraftState(t); };
  useEffect(() => () => setWord('locked'), []);

  const reveal = async () => {
    if (!s.codeWordSet || !s.codeWord) { setEditing(true); return; }
    setWord('scanning');
    try {
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Reveal the family secret word', cancelLabel: 'Cancel' });
      setWord(r.success ? 'shown' : 'locked');
    } catch { setWord('locked'); }
  };
  const save = () => {
    const w = draftRef.current.trim();
    if (w.length < 3) { ctx.flash('Pick a word of three letters or more.'); return; }
    ctx.update({ ...ctx.settings, codeWord: w, codeWordSet: true });
    setEditing(false); setDraft(''); setWord('locked');
    ctx.flash('Saved. Only this phone has it.');
  };
  const change = async () => {
    // Changing it needs Face ID too, so nobody else can swap it.
    if (s.codeWordSet && word !== 'shown') {
      try {
        const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Change the family secret word', cancelLabel: 'Cancel' });
        if (!r.success) return;
      } catch { return; }
    }
    setEditing(true);
  };

  return (
    <View style={st.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <KeyRound size={18} color="#fff" strokeWidth={2} />
        <Text style={[font(17, '700'), { color: '#fff' }]} allowFontScaling>Family secret word</Text>
      </View>
      {word === 'locked' && (
        <Swap playKey="locked">
          <Text style={[font(24, '800', 1.0, s.codeWordSet ? 6 : 0), { color: '#fff', marginTop: 10 }]} allowFontScaling={false}>{s.codeWordSet ? '● ● ● ● ● ●' : 'Not set yet'}</Text>
        </Swap>
      )}
      {word === 'scanning' && (
        <Swap playKey="scan" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <ScanFace size={30} color="#fff" strokeWidth={1.6} />
          <Text style={[font(16, '600'), { color: '#fff' }]} allowFontScaling>Face ID</Text>
        </Swap>
      )}
      {word === 'shown' && (
        <Swap playKey="shown">
          <Text style={[font(30, '800', 1.0), { color: '#fff', marginTop: 10 }]} allowFontScaling>{s.codeWord}</Text>
          <Text style={[font(14, '400', 1.4), { color: '#fff', marginTop: 4 }]} allowFontScaling>Hides again when you leave this screen.</Text>
        </Swap>
      )}
      <Text style={[font(16, '400', 1.4), { color: '#fff', marginTop: 10 }]} allowFontScaling>If someone calls claiming to be family and asks for money, hang up and call them on their usual number. You can also ask for your family’s secret word.</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {s.codeWordSet ? (<>
          {word === 'shown'
            ? <SmallBtn label="Hide" bg="rgba(255,255,255,.16)" color="#fff" onPress={() => setWord('locked')} />
            : <SmallBtn label="Reveal secret word" bg="#fff" color={T.greenDeep} icon={<ScanFace size={18} color={T.greenDeep} strokeWidth={2} />} onPress={reveal} />}
          <SmallBtn label="Change" bg="rgba(255,255,255,.16)" color="#fff" onPress={change} />
        </>) : (
          <SmallBtn label="Set a secret word" bg="#fff" color={T.greenDeep} icon={<KeyRound size={18} color={T.greenDeep} strokeWidth={2} />} onPress={() => setEditing(true)} />
        )}
      </View>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={st.dim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(false)} accessibilityLabel="Close" />
          <KeyboardAvoidingView behavior="padding">
            <ScrollView keyboardShouldPersistTaps="always" bounces={false} style={{ flexGrow: 0 }}>
            <View style={[st.sheet, { backgroundColor: C.card }]}>
              <Text style={[font(20, '700'), { color: C.ink }]} allowFontScaling>The family secret word</Text>
              <Text style={[font(15, '400', 1.4), { color: C.ink2, marginTop: 6 }]} allowFontScaling>Something only your family knows. It stays on this phone, behind Face ID.</Text>
              <TextInput value={draft} onChangeText={setDraft} onEndEditing={e => setDraft(e.nativeEvent.text)} onSubmitEditing={save} returnKeyType="done" autoFocus autoCapitalize="words" autoCorrect={false} placeholder="One word" placeholderTextColor={C.dark ? '#636366' : '#a1a1a6'}
                style={[font(22, '600'), { color: C.ink, backgroundColor: C.ground, borderRadius: 12, padding: 14, marginTop: 14 }]} />
              <Pill label="Save it" style={{ marginTop: 14 }} onPress={save} />
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 18, backgroundColor: T.greenDeep, borderRadius: 20, padding: 18 },
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
});
