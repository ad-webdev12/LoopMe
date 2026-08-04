import React, { useState } from 'react';
import { Linking, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { T, SHADOW } from '../theme';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Screen from '../ui/Screen';
import Card from '../ui/Card';
import { clearHistory } from '../lib/history';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

function Row(props: { title: string; why: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={s.rowTitle} allowFontScaling>{props.title}</Text>
        <Text style={s.rowWhy} allowFontScaling>{props.why}</Text>
      </View>
      <Switch value={props.value} onValueChange={props.onChange}
        trackColor={{ true: T.green, false: '#D8D2C6' }} thumbColor="#FFF" />
    </View>
  );
}

export default function SettingsScreen(props: {
  settings: Settings; update: (s: Settings) => void; go: (r: Route) => void;
}) {
  const [safe, setSafe] = useState('');
  const st = props.settings;
  const set = (patch: Partial<Settings>) => props.update({ ...st, ...patch });
  const ios = Platform.OS === 'ios';

  return (
    <Screen onBack={() => props.go({ name: 'home' })} title="Settings">
      <Field label="Your first name (signs your family messages)" placeholder="First name"
        value={st.myName} onChangeText={(v) => set({ myName: v })} />

      <Row title="Alerts" why="Warn me right away when a text looks like a scam." value={st.alerts} onChange={v => set({ alerts: v })} />
      {ios && (
        <Card>
          <Text style={s.rowTitle} allowFontScaling>Auto-check unknown texts</Text>
          <Text style={s.rowWhy} allowFontScaling>
            On iPhone this is switched on in the Settings app: Settings › Apps › Messages › Unknown & Junk › turn on Loop Me In.
            iPhone checks texts from unknown senders only — that’s Apple’s rule for every app, and it can’t see iMessage or
            WhatsApp (no app can). For those, use the Share button.
          </Text>
          <Button label="Open iPhone Settings" kind="secondary" size="compact" onPress={() => Linking.openSettings()} />
        </Card>
      )}
      <Row title="Read results out loud" why="Speak every answer so you don’t have to read small print." value={st.readAloud} onChange={v => set({ readAloud: v })} />

      <Text style={s.section} allowFontScaling>Senders I know are safe</Text>
      <Text style={s.rowWhy} allowFontScaling>Add a name or number (like your bank’s real alert number) and we’ll always mark it okay.</Text>
      {st.allowlist.map((a, i) => (
        <View key={i} style={s.safeRow}>
          <Text style={s.rowTitle} allowFontScaling>{a}</Text>
          <Button label="Remove" kind="ghost" size="compact" onPress={() => set({ allowlist: st.allowlist.filter((_, j) => j !== i) })} />
        </View>
      ))}
      <Field placeholder="e.g. Chase 24273" value={safe} onChangeText={setSafe} />
      <Button label="Add safe sender" kind="secondary" onPress={() => { if (safe.trim()) { set({ allowlist: [...st.allowlist, safe.trim()] }); setSafe(''); } }} />

      <Text style={s.section} allowFontScaling>This phone’s role</Text>
      <Text style={s.rowWhy} allowFontScaling>
        {st.role === 'elder'
          ? 'Right now this phone checks messages for you. Switch if this phone belongs to the family member who answers.'
          : 'Right now this phone is the family side — it receives checks and answers them.'}
      </Text>
      <Button label={st.role === 'elder' ? 'Switch to the family side' : 'Switch to the checking side'}
        kind="secondary" onPress={() => set({ role: st.role === 'elder' ? 'caretaker' : 'elder' })} />

      <Text style={s.section} allowFontScaling>Saved checks</Text>
      <Text style={s.rowWhy} allowFontScaling>
        Checks are saved only on this phone, with emails, phone numbers, and long numbers stripped out first.
      </Text>
      <Button label="Delete all saved checks" kind="ghost" onPress={() => clearHistory()} />

      <Button label="Done" kind="ghost" onPress={() => props.go({ name: 'home' })} />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: T.card,
    borderRadius: T.radius, borderWidth: 1, borderColor: T.hairline, padding: 16, marginVertical: 5, ...SHADOW,
  },
  rowTitle: { fontSize: T.body, fontWeight: '700', color: T.ink },
  rowWhy: { fontSize: T.small, color: T.inkSoft, lineHeight: 23, marginTop: 4 },
  section: {
    fontSize: T.caption, fontWeight: '800', color: T.inkSoft, textTransform: 'uppercase',
    letterSpacing: 0.8, marginTop: 20, marginBottom: 4,
  },
  safeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: T.card, borderRadius: T.radiusSm, borderWidth: 1, borderColor: T.hairline,
    paddingLeft: 14, paddingRight: 6, marginVertical: 3,
  },
});
