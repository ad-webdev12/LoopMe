import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert, Animated, Easing } from 'react-native';
import { T } from '../theme';
import BigButton from '../components/BigButton';
import { pickAndReadImage, OCR_AVAILABLE } from '../lib/ocr';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

function GlowTitle() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(a, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ])).start();
  }, []);
  return (
    <Animated.Text allowFontScaling style={[s.title, { textShadowRadius: a.interpolate({ inputRange: [0, 1], outputRange: [6, 22] }) }]}>
      LOOP ME IN
    </Animated.Text>
  );
}

export default function HomeScreen(props: {
  onCheck: (m: string) => void; go: (r: Route) => void; settings: Settings;
}) {
  const [text, setText] = useState('');
  const fromPhoto = async (camera: boolean) => {
    if (!OCR_AVAILABLE) {
      Alert.alert('Reading photos comes with the full app',
        'For now, type or paste the message into the box and tap \u201CCheck it\u201D. It works just as well.');
      return;
    }
    const t = await pickAndReadImage(camera);
    if (t) { setText(t); props.onCheck(t); }
  };
  const Small = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable style={s.small} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={s.smallText} allowFontScaling>{label}</Text>
    </Pressable>
  );
  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      <GlowTitle />
      <Text style={s.sub} allowFontScaling>THREAT SCANNER \u00B7 ON-DEVICE \u00B7 OFFLINE</Text>

      <TextInput
        style={s.box} multiline
        placeholder="Paste or share a message here"
        placeholderTextColor={T.inkSoft}
        value={text} onChangeText={setText}
        accessibilityLabel="Message to check"
      />
      <BigButton label="Check it" color={T.ink} onPress={() => text.trim() && props.onCheck(text)} />

      <View style={s.row}>
        <Small label={'\uD83D\uDCF7  Photo'} onPress={() => fromPhoto(true)} />
        <Small label={'\uD83D\uDD32  QR code'} onPress={() => props.go({ name: 'qr' })} />
      </View>
      <View style={s.row}>
        <Small label={'\uD83D\uDCDE  Someone\u2019s calling me'} onPress={() => props.go({ name: 'callhelp' })} />
      </View>
      <View style={s.row}>
        <Small label={'\uD83D\uDCB5  Before you send money'} onPress={() => props.go({ name: 'money' })} />
      </View>

      <BigButton label="Loop someone in" kind="secondary" onPress={() => props.go({ name: 'circle' })} />
      <BigButton label="I think I\u2019ve been scammed" kind="quiet" onPress={() => props.go({ name: 'panic' })} />
      <View style={s.footer}>
        <BigButton label="Learn" kind="quiet" onPress={() => props.go({ name: 'learn' })} />
        <BigButton label="Code word" kind="quiet" onPress={() => props.go({ name: 'codeword' })} />
        <BigButton label="Our promise" kind="quiet" onPress={() => props.go({ name: 'trust' })} />
        <BigButton label="Settings" kind="quiet" onPress={() => props.go({ name: 'settings' })} />
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 32 },
  title: { fontSize: T.giant, fontWeight: '900', color: T.ink, textAlign: 'center', letterSpacing: 6, textShadowColor: '#38D9FF' },
  sub: { fontSize: 14, color: T.inkSoft, textAlign: 'center', marginTop: 8, marginBottom: 20, letterSpacing: 3, fontWeight: '700' },
  box: {
    backgroundColor: T.card, borderRadius: T.radius, minHeight: 150, padding: 20, borderWidth: 1, borderColor: '#1E3A5C',
    fontSize: T.body, color: T.ink, textAlignVertical: 'top', lineHeight: 28, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  small: { flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: '#1E3A5C', borderRadius: 18, minHeight: 60, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  smallText: { fontSize: 19, color: T.ink, fontWeight: '600', textAlign: 'center' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginTop: 8 },
});
