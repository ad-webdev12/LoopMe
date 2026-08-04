// First run: who is this phone for? One question, huge targets, no jargon.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShieldCheck, HeartHandshake } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { T, SHADOW, F } from '../theme';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Card from '../ui/Card';
import Entrance from '../ui/Entrance';
import type { Settings, Role } from '../lib/storage';

export default function WelcomeScreen(props: { settings: Settings; update: (s: Settings) => void }) {
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');

  const finish = () => {
    props.update({ ...props.settings, role: role!, myName: name.trim() });
    Notifications.requestPermissionsAsync().catch(() => {});
  };

  if (!role) {
    return (
      <View style={s.wrap}>
        <Entrance index={0}><Text style={s.brand} allowFontScaling>Loop Me In</Text></Entrance>
        <Text style={s.tagline} allowFontScaling>
          Check any message before you trust it — and keep your family in the loop.
        </Text>

        <Entrance index={1}>
        <Card style={s.choice}>
          <ShieldCheck size={34} color={T.accent} strokeWidth={2} />
          <Text style={s.choiceTitle} allowFontScaling>I want to check my messages</Text>
          <Text style={s.choiceBody} allowFontScaling>
            Paste anything that feels off. You get a clear answer in plain words, and one tap reaches your family.
          </Text>
          <Button label="This phone is mine" onPress={() => setRole('elder')} />
        </Card>
        </Entrance>

        <Entrance index={2}>
        <Card style={s.choice}>
          <HeartHandshake size={34} color={T.accent} strokeWidth={2} />
          <Text style={s.choiceTitle} allowFontScaling>I look out for someone</Text>
          <Text style={s.choiceBody} allowFontScaling>
            See the checks they send you, answer with one tap, and learn how each trick works so you can talk it through.
          </Text>
          <Button label="I’m a family member or caregiver" kind="secondary" onPress={() => setRole('caretaker')} />
        </Card>
        </Entrance>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <Text style={s.title} allowFontScaling>What’s your first name?</Text>
      <Text style={s.sub} allowFontScaling>
        It signs the messages you send your family — nothing more. You can skip it.
      </Text>
      <Field placeholder="First name" value={name} onChangeText={setName} autoFocus returnKeyType="done" onSubmitEditing={finish} />
      <Button label="Start" onPress={finish} />
      <Button label="Skip for now" kind="ghost" onPress={finish} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: T.pad, justifyContent: 'center' },
  brand: { fontSize: T.giant, fontFamily: F.displayBold, color: T.ink, textAlign: 'center', letterSpacing: -0.8 },
  tagline: { fontSize: T.body, fontFamily: F.body, color: T.inkSoft, textAlign: 'center', lineHeight: 28, marginTop: 10, marginBottom: 18 },
  choice: { padding: 20 },
  choiceTitle: { fontSize: T.bodyLg, fontFamily: F.bodyBold, color: T.ink, marginTop: 10 },
  choiceBody: { fontSize: T.small, fontFamily: F.body, color: T.inkSoft, lineHeight: 25, marginTop: 6, marginBottom: 8 },
  title: { fontSize: T.headline, fontFamily: F.displayBold, color: T.ink, textAlign: 'center', letterSpacing: -0.4 },
  sub: { fontSize: T.body, fontFamily: F.body, color: T.inkSoft, textAlign: 'center', lineHeight: 28, marginVertical: 14 },
});
