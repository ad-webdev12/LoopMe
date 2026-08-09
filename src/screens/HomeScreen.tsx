// Elder home: one job above the fold — paste, check. Everything else is
// secondary and stays out of the way until needed.
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Camera, Phone, Banknote, QrCode, Users, LifeBuoy, BookOpen, KeyRound,
  Settings as SettingsIcon, ShieldCheck, ClipboardPaste,
} from 'lucide-react-native';
import { T, SHADOW, F } from '../theme';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Screen from '../ui/Screen';
import Entrance from '../ui/Entrance';
import { pickAndReadImage, OCR_AVAILABLE } from '../lib/ocr';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

export default function HomeScreen(props: {
  onCheck: (m: string) => void; go: (r: Route) => void; settings: Settings;
  clipAvailable: boolean;
  onPasteCheck: () => void;
}) {
  const [text, setText] = useState('');

  const fromPhoto = async (camera: boolean) => {
    if (!OCR_AVAILABLE) {
      Alert.alert('Reading photos comes with the full app',
        'For now, type or paste the message into the box and tap “Check it”. It works just as well.');
      return;
    }
    const t = await pickAndReadImage(camera);
    if (t) { setText(t); props.onCheck(t); }
  };

  const Quick = ({ Icon, label, onPress }: { Icon: any; label: string; onPress: () => void }) => (
    <Pressable style={s.quick} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Icon size={22} color={T.accent} strokeWidth={2.1} />
      <Text style={s.quickText} allowFontScaling>{label}</Text>
    </Pressable>
  );

  return (
    <Screen>
      <Entrance index={0}>
        <View style={s.head}>
          <Text style={s.brand} allowFontScaling>Loop Me In</Text>
          <Text style={s.sub} allowFontScaling>Not sure about a message? Check it here.</Text>
        </View>
      </Entrance>

      <Entrance index={1}>
      <View style={s.panel}>
        <TextInput
          style={s.box} multiline
          placeholder="Paste or type the message here"
          placeholderTextColor={T.inkFaint}
          value={text} onChangeText={setText}
          accessibilityLabel="Message to check"
        />
        {props.clipAvailable && !text.trim() && (
          <Button label="Paste what I copied" kind="secondary" icon={ClipboardPaste} onPress={props.onPasteCheck} />
        )}
        <Button label="Check it" onPress={() => text.trim() && props.onCheck(text)} />
      </View>
      </Entrance>

      <Entrance index={2}>
      <View style={s.quickRow}>
        <Quick Icon={Camera} label="Photo" onPress={() => fromPhoto(true)} />
        <Quick Icon={QrCode} label="QR code" onPress={() => props.go({ name: 'qr' })} />
      </View>
      <View style={s.quickRow}>
        <Quick Icon={Phone} label="Someone’s calling me" onPress={() => props.go({ name: 'callhelp' })} />
      </View>
      <View style={s.quickRow}>
        <Quick Icon={Banknote} label="Before you send money" onPress={() => props.go({ name: 'money' })} />
      </View>
      </Entrance>

      <Entrance index={3}>
      <Button label="People you trust" kind="secondary" icon={Users} onPress={() => props.go({ name: 'circle' })} />
      <Button label="I think I’ve been scammed" kind="secondary" icon={LifeBuoy} onPress={() => props.go({ name: 'panic' })} />
      </Entrance>

      <View style={s.footer}>
        <Pressable style={s.footBtn} onPress={() => props.go({ name: 'learn' })} accessibilityRole="button">
          <BookOpen size={18} color={T.inkSoft} /><Text style={s.footText} allowFontScaling>Learn</Text>
        </Pressable>
        <Pressable style={s.footBtn} onPress={() => props.go({ name: 'codeword' })} accessibilityRole="button">
          <KeyRound size={18} color={T.inkSoft} /><Text style={s.footText} allowFontScaling>Code word</Text>
        </Pressable>
        <Pressable style={s.footBtn} onPress={() => props.go({ name: 'trust' })} accessibilityRole="button">
          <ShieldCheck size={18} color={T.inkSoft} /><Text style={s.footText} allowFontScaling>Our promise</Text>
        </Pressable>
        <Pressable style={s.footBtn} onPress={() => props.go({ name: 'settings' })} accessibilityRole="button">
          <SettingsIcon size={18} color={T.inkSoft} /><Text style={s.footText} allowFontScaling>Settings</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { marginTop: 18, marginBottom: 14 },
  brand: { fontSize: T.giant, fontFamily: F.displayBold, color: T.ink, textAlign: 'center', letterSpacing: -0.8 },
  sub: { fontSize: T.body, fontFamily: F.body, color: T.inkSoft, textAlign: 'center', marginTop: 6, lineHeight: 27 },
  panel: {
    backgroundColor: T.card, borderRadius: T.radiusLg, borderWidth: 1, borderColor: T.hairline,
    padding: 14, marginVertical: 6, ...SHADOW,
  },
  box: {
    minHeight: 132, padding: 8, fontSize: T.body, fontFamily: F.body, color: T.ink,
    textAlignVertical: 'top', lineHeight: 27,
  },
  quickRow: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  quick: {
    flex: 1, flexDirection: 'row', gap: 10, backgroundColor: T.card,
    borderRadius: T.radius, borderWidth: 1, borderColor: T.hairline,
    minHeight: 58, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12,
  },
  quickText: { fontSize: T.small, color: T.ink, fontFamily: F.bodyBold, textAlign: 'center' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18, marginTop: 16 },
  footBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 2 },
  footText: { fontSize: T.caption, color: T.inkSoft, fontFamily: F.bodyBold },
});
