// First run — Design 4. "Whose phone is this?" Three clear paths, no account,
// no password. Warm reassurance that nothing leaves the phone.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronRight, ShieldCheck, ArrowRight } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { T, SHADOW, F } from '../theme';
import type { Settings, Role } from '../lib/storage';

export default function WelcomeScreen(props: { settings: Settings; update: (s: Settings) => void }) {
  const [step, setStep] = useState<'who' | 'name'>('who');
  const [role, setRole] = useState<Role>('elder');
  const [name, setName] = useState('');

  const chooseRole = (r: Role, needName: boolean) => {
    setRole(r);
    if (needName) setStep('name');
    else { props.update({ ...props.settings, role: r, myName: '' }); Notifications.requestPermissionsAsync().catch(() => {}); }
  };
  const finish = () => {
    props.update({ ...props.settings, role, myName: name.trim() });
    Notifications.requestPermissionsAsync().catch(() => {});
  };

  const Choice = ({ title, body, accent, onPress }: { title: string; body: string; accent: string; onPress: () => void }) => (
    <Pressable style={s.choice} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <View style={{ flex: 1 }}>
        <Text style={s.choiceTitle} allowFontScaling>{title}</Text>
        <Text style={s.choiceBody} allowFontScaling>{body}</Text>
      </View>
      <ChevronRight size={18} color={accent} strokeWidth={2.2} />
    </Pressable>
  );

  if (step === 'name') {
    return (
      <View style={s.wrap}>
        <View style={s.head}>
          <Text style={s.kicker} allowFontScaling>SETTING UP · 2 OF 3</Text>
          <Text style={s.title} allowFontScaling>What’s your first name?</Text>
          <Text style={s.sub} allowFontScaling>It signs the messages you send your family — nothing more. You can skip it.</Text>
        </View>
        <TextInput
          style={s.input} placeholder="First name" placeholderTextColor={T.inkFaint}
          value={name} onChangeText={setName} autoFocus returnKeyType="done" onSubmitEditing={finish}
        />
        <Pressable style={s.primary} onPress={finish} accessibilityRole="button">
          <Text style={s.primaryText} allowFontScaling>Start using Loop Me</Text>
          <ArrowRight size={19} color="#fff" strokeWidth={2.1} />
        </Pressable>
        <Pressable style={s.skip} onPress={finish} accessibilityRole="button"><Text style={s.skipText} allowFontScaling>Skip for now</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.kicker} allowFontScaling>SETTING UP · 1 OF 3</Text>
        <Text style={s.title} allowFontScaling>Whose phone is this?</Text>
      </View>
      <View style={s.choices}>
        <Choice title="It’s mine" body="Set it up the way I want it." accent={T.green} onPress={() => chooseRole('elder', true)} />
        <Choice title="I’m setting it up for someone" body="A parent or grandparent. Two minutes." accent={T.amber} onPress={() => chooseRole('elder', true)} />
        <Choice title="I look after someone" body="They keep their own phone. I get told when something looks wrong." accent={T.green} onPress={() => chooseRole('caretaker', true)} />
      </View>
      <View style={s.reassure}>
        <ShieldCheck size={18} color={T.green} strokeWidth={1.9} />
        <Text style={s.reassureText} allowFontScaling>No account, no password. Nothing you enter leaves this phone.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.ground, paddingHorizontal: 22, paddingTop: 64 },
  head: { paddingBottom: 18 },
  kicker: { fontSize: 10, fontFamily: F.semibold, color: T.green, letterSpacing: 1.8, marginBottom: 12 },
  title: { fontSize: 27, fontFamily: F.display, color: T.ink, letterSpacing: -0.5, lineHeight: 30 },
  sub: { fontSize: T.small, fontFamily: F.body, color: T.inkSoft, lineHeight: 22, marginTop: 10 },
  choices: { gap: 10 },
  choice: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.card,
    borderWidth: 1, borderColor: T.hairline, borderRadius: T.radius, padding: 18, ...SHADOW,
  },
  choiceTitle: { fontSize: 17, fontFamily: F.bold, color: T.ink },
  choiceBody: { fontSize: 13.5, fontFamily: F.body, color: T.inkSoft, lineHeight: 20, marginTop: 3 },
  reassure: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', backgroundColor: T.greenSoft, borderRadius: T.radiusSm, padding: 14, marginTop: 22 },
  reassureText: { flex: 1, fontSize: 13, fontFamily: F.medium, color: T.greenInk, lineHeight: 20 },

  input: {
    backgroundColor: T.card, borderWidth: 1, borderColor: T.hairline, borderRadius: T.radius,
    paddingHorizontal: 16, paddingVertical: 15, fontSize: T.bodyLg, fontFamily: F.body, color: T.ink,
  },
  primary: {
    height: 56, borderRadius: T.radiusSm, backgroundColor: T.green, marginTop: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryText: { fontSize: T.body, fontFamily: F.bold, color: '#fff' },
  skip: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  skipText: { fontSize: T.small, fontFamily: F.medium, color: T.inkSoft },
});
