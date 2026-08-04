import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import * as Contacts from 'expo-contacts';
import { T } from '../theme';
import BigButton from '../components/BigButton';
import { callPerson } from '../lib/loopIn';
import type { Route } from '../App';
import type { Settings, TrustedPerson } from '../lib/storage';

export default function TrustedCircleScreen(props: {
  settings: Settings; update: (s: Settings) => void; go: (r: Route) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const add = (p: TrustedPerson) => {
    if (props.settings.trusted.length >= 3) { Alert.alert('Three people is plenty', 'You can remove someone to add another.'); return; }
    props.update({ ...props.settings, trusted: [...props.settings.trusted, p] });
    setName(''); setPhone('');
  };
  const fromContacts = async () => {
    const { granted } = await Contacts.requestPermissionsAsync();
    if (!granted) return;
    const picked = await Contacts.presentContactPickerAsync();
    const num = picked?.phoneNumbers?.[0]?.number;
    if (picked?.name && num) add({ name: picked.name, phone: num });
  };
  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.title} allowFontScaling>People you trust</Text>
      <Text style={s.sub} allowFontScaling>When a message worries you, one tap sends it to them.</Text>

      {props.settings.trusted.map((p, i) => (
        <View key={i} style={s.person}>
          <View style={{ flex: 1 }}>
            <Text style={s.pName} allowFontScaling>{p.name}</Text>
            <Text style={s.pPhone} allowFontScaling>{p.phone}</Text>
          </View>
          <Pressable onPress={() => callPerson(p)} style={s.callBtn} accessibilityRole="button" accessibilityLabel={`Call ${p.name}`}>
            <Text style={s.callText}>{'\uD83D\uDCDE'} Call</Text>
          </Pressable>
          <Pressable
            onPress={() => props.update({ ...props.settings, trusted: props.settings.trusted.filter((_, j) => j !== i) })}
            accessibilityRole="button" accessibilityLabel={`Remove ${p.name}`} style={s.remove}>
            <Text style={{ fontSize: 20, color: T.inkSoft }}>{'\u2715'}</Text>
          </Pressable>
        </View>
      ))}

      {props.settings.trusted.length < 3 && (
        <>
          <BigButton label="Pick from my contacts" kind="secondary" onPress={fromContacts} />
          <Text style={s.or} allowFontScaling>or type them in</Text>
          <TextInput style={s.input} placeholder="Name" placeholderTextColor={T.inkSoft} value={name} onChangeText={setName} accessibilityLabel="Name" />
          <TextInput style={s.input} placeholder="Phone number" placeholderTextColor={T.inkSoft} value={phone} onChangeText={setPhone} keyboardType="phone-pad" accessibilityLabel="Phone number" />
          <BigButton label="Add this person" color={T.green} onPress={() => name.trim() && phone.trim() && add({ name: name.trim(), phone: phone.trim() })} />
        </>
      )}
      <BigButton label="Done" kind="quiet" onPress={() => props.go({ name: 'home' })} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 24 },
  title: { fontSize: T.headline, fontWeight: '800', color: T.ink, textAlign: 'center' },
  sub: { fontSize: T.body, color: T.inkSoft, textAlign: 'center', marginVertical: 12, lineHeight: 28 },
  person: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: 20, padding: 18, marginVertical: 6 },
  pName: { fontSize: T.body + 2, fontWeight: '700', color: T.ink },
  pPhone: { fontSize: 18, color: T.inkSoft },
  callBtn: { backgroundColor: T.greenSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginRight: 10 },
  callText: { fontSize: 18, fontWeight: '700', color: T.green },
  remove: { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  or: { fontSize: 18, color: T.inkSoft, textAlign: 'center', marginVertical: 8 },
  input: { backgroundColor: T.card, borderRadius: 18, padding: 18, fontSize: T.body, color: T.ink, marginVertical: 6 },
});
