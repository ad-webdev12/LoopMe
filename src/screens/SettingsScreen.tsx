import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TextInput, Platform, Linking } from 'react-native';
import { T } from '../theme';
import BigButton from '../components/BigButton';
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
        trackColor={{ true: T.green, false: '#D8D2C6' }} thumbColor="#FFF"
        style={{ transform: [{ scale: 1.2 }] }} />
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
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.title} allowFontScaling>Settings</Text>

      <Row title="Alerts" why="Warn me right away when a text looks like a scam." value={st.alerts} onChange={v => set({ alerts: v })} />
      {ios ? (
        <View style={s.note}>
          <Text style={s.rowTitle} allowFontScaling>Auto-check unknown texts</Text>
          <Text style={s.rowWhy} allowFontScaling>
            On iPhone this is switched on in the Settings app: Settings {'\u203A'} Apps {'\u203A'} Messages {'\u203A'} Unknown & Junk {'\u203A'} turn on Loop Me In. iPhone checks texts from unknown senders only \u2014 that\u2019s Apple\u2019s rule for every app, and it can\u2019t see iMessage or WhatsApp (no app can). For those, use the Share button.
          </Text>
          <BigButton label="Open iPhone Settings" kind="secondary" onPress={() => Linking.openSettings()} />
        </View>
      ) : (
        <>
          <Row title="Auto-check incoming texts" why="Check every new text on this phone, privately, right here." value={st.autoScan} onChange={v => set({ autoScan: v })} />
          <Row title="Watch other apps\u2019 notifications" why="Catch scams in WhatsApp and Messenger too. Off unless you turn it on." value={false} onChange={() => Linking.sendIntent?.('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS').catch(() => {})} />
          <Row title="Read the screen for scams" why="Spot scams apps try to hide. Off unless you turn it on, and one tap to stop." value={false} onChange={() => Linking.sendIntent?.('android.settings.ACCESSIBILITY_SETTINGS').catch(() => {})} />
        </>
      )}
      <Row title="Read results out loud" why="Speak every answer so you don\u2019t have to read small print." value={st.readAloud} onChange={v => set({ readAloud: v })} />

      <Text style={s.section} allowFontScaling>Senders I know are safe</Text>
      <Text style={s.rowWhy} allowFontScaling>Add a name or number (like your bank\u2019s real alert number) and we\u2019ll always mark it okay.</Text>
      {st.allowlist.map((a, i) => (
        <View key={i} style={s.safeRow}>
          <Text style={s.rowTitle} allowFontScaling>{a}</Text>
          <BigButton label="Remove" kind="quiet" onPress={() => set({ allowlist: st.allowlist.filter((_, j) => j !== i) })} />
        </View>
      ))}
      <TextInput style={s.input} placeholder="e.g. Chase 24273" placeholderTextColor={T.inkSoft} value={safe} onChangeText={setSafe} accessibilityLabel="Safe sender" />
      <BigButton label="Add safe sender" kind="secondary" onPress={() => { if (safe.trim()) { set({ allowlist: [...st.allowlist, safe.trim()] }); setSafe(''); } }} />

      <BigButton label="Done" kind="quiet" onPress={() => props.go({ name: 'home' })} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 24 },
  title: { fontSize: T.headline, fontWeight: '800', color: T.ink, textAlign: 'center', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: 20, padding: 18, marginVertical: 6 },
  note: { backgroundColor: T.card, borderRadius: 20, padding: 18, marginVertical: 6 },
  rowTitle: { fontSize: T.body, fontWeight: '700', color: T.ink },
  rowWhy: { fontSize: 17, color: T.inkSoft, lineHeight: 24, marginTop: 4 },
  section: { fontSize: T.body + 1, fontWeight: '800', color: T.ink, marginTop: 20 },
  safeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.card, borderRadius: 18, paddingLeft: 18, marginVertical: 4 },
  input: { backgroundColor: T.card, borderRadius: 18, padding: 18, fontSize: T.body, color: T.ink, marginVertical: 8 },
});
