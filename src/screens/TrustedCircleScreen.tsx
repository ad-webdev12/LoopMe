// The trusted circle — up to three people, one tap away. The "link by text"
// button pairs a family member's phone so answers flow back automatically.
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Link2, Phone, X } from 'lucide-react-native';
import { T, SHADOW, F } from '../theme';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Screen from '../ui/Screen';
import Card from '../ui/Card';
import { callPerson } from '../lib/loopIn';
import { pairText, sendSms } from '../lib/familyLink';
import type { Route } from '../App';
import type { Settings, TrustedPerson } from '../lib/storage';

export default function TrustedCircleScreen(props: {
  settings: Settings; update: (s: Settings) => void; go: (r: Route) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const st = props.settings;

  const add = (p: TrustedPerson) => {
    if (st.trusted.length >= 3) { Alert.alert('Three people is plenty', 'You can remove someone to add another.'); return; }
    props.update({ ...st, trusted: [...st.trusted, p] });
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
    <Screen onBack={() => props.go({ name: 'home' })} title="People you trust">
      <Text style={s.sub} allowFontScaling>
        When a message worries you, one tap sends it to them — and their answer comes back to this phone.
      </Text>

      {st.trusted.map((p, i) => (
        <View key={i} style={s.person}>
          <View style={{ flex: 1 }}>
            <Text style={s.pName} allowFontScaling>{p.name}</Text>
            <Text style={s.pPhone} allowFontScaling>{p.phone}</Text>
          </View>
          <Pressable onPress={() => callPerson(p)} style={s.callBtn} accessibilityRole="button" accessibilityLabel={`Call ${p.name}`}>
            <Phone size={17} color={T.greenText} strokeWidth={2.2} />
            <Text style={s.callText} allowFontScaling>Call</Text>
          </Pressable>
          <Pressable
            onPress={() => props.update({ ...st, trusted: st.trusted.filter((_, j) => j !== i) })}
            accessibilityRole="button" accessibilityLabel={`Remove ${p.name}`} style={s.remove}>
            <X size={20} color={T.inkSoft} />
          </Pressable>
        </View>
      ))}

      {st.role === 'elder' && (
        <Card tone="accent">
          <Text style={s.linkTitle} allowFontScaling>Put Loop Me In on their phone too</Text>
          <Text style={s.linkBody} allowFontScaling>
            Text them a link. Once they have the app, your checks reach them with one tap and their answers appear right here.
          </Text>
          <Button label="Send them the link" icon={Link2} size="compact"
            onPress={() => sendSms(st.trusted[0]?.phone || null, pairText(st.myName, ''))} />
        </Card>
      )}

      {st.trusted.length < 3 && (
        <>
          <Button label="Pick from my contacts" kind="secondary" onPress={fromContacts} />
          <Text style={s.or} allowFontScaling>or type them in</Text>
          <Field placeholder="Name" value={name} onChangeText={setName} />
          <Field placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Button label="Add this person" kind="success" onPress={() => name.trim() && phone.trim() && add({ name: name.trim(), phone: phone.trim() })} />
        </>
      )}
      <Button label="Done" kind="ghost" onPress={() => props.go({ name: 'home' })} />
    </Screen>
  );
}

const s = StyleSheet.create({
  sub: { fontSize: T.body, fontFamily: F.body, color: T.inkSoft, textAlign: 'center', marginVertical: 10, lineHeight: 27 },
  person: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: T.card,
    borderRadius: T.radius, borderWidth: 1, borderColor: T.hairline, padding: 16, marginVertical: 5, ...SHADOW,
  },
  pName: { fontSize: T.bodyLg, fontFamily: F.bodyBold, color: T.ink },
  pPhone: { fontSize: T.small, fontFamily: F.body, color: T.inkSoft, marginTop: 2 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.greenSoft,
    borderRadius: T.radiusSm, paddingHorizontal: 13, paddingVertical: 10, marginRight: 8,
  },
  callText: { fontSize: T.small, fontFamily: F.bodyBold, color: T.greenText },
  remove: { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  or: { fontSize: T.small, fontFamily: F.body, color: T.inkSoft, textAlign: 'center', marginVertical: 6 },
  linkTitle: { fontSize: T.body, fontFamily: F.bodyBold, color: T.accentDeep },
  linkBody: { fontSize: T.small, fontFamily: F.body, color: T.inkSoft, lineHeight: 24, marginVertical: 8 },
});
