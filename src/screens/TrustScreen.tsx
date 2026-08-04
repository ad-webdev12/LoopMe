// The privacy promise + "what this app can't do" — in plain words, not a policy.
// Nobody else in this market ships the honesty screen. That's exactly why it builds trust.
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { T } from '../theme';
import BigButton from '../components/BigButton';
import type { Route } from '../App';

export default function TrustScreen(props: { go: (r: Route) => void }) {
  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.title} allowFontScaling>Our promise, in plain words</Text>
      <View style={s.card}>
        <Text style={s.h} allowFontScaling>Your messages stay on your phone.</Text>
        <Text style={s.b} allowFontScaling>Every check happens right here on this device — even in airplane mode. We can\u2019t read your messages. We don\u2019t want to. Nothing is stored, nothing is sent, unless YOU tap to send it to someone you trust.</Text>
      </View>
      <View style={s.card}>
        <Text style={s.h} allowFontScaling>No account. No ads. No charge.</Text>
        <Text style={s.b} allowFontScaling>You will never be asked to sign up, pay, or watch an ad. Protection shouldn\u2019t have a paywall.</Text>
      </View>
      <Text style={s.title2} allowFontScaling>What this app can\u2019t do</Text>
      <View style={s.card}>
        <Text style={s.b} allowFontScaling>
          {'\u2022'} No app on Earth can read your iMessages or WhatsApp — Apple and WhatsApp seal them off from everyone. Anyone who claims otherwise is lying. The Share button is the honest way in.{'\n\n'}
          {'\u2022'} I can\u2019t tell you whether a voice or a video is real. Nobody reliably can anymore. Your family code word can — a copied voice can\u2019t know a secret.{'\n\n'}
          {'\u2022'} I\u2019m very good at spotting known tricks, but no checker is perfect. When I\u2019m not sure, I\u2019ll say so and suggest a second opinion from someone you trust.
        </Text>
      </View>
      <BigButton label="Back home" kind="quiet" onPress={() => props.go({ name: 'home' })} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 24 },
  title: { fontSize: T.headline, fontWeight: '800', color: T.ink, textAlign: 'center', marginBottom: 12 },
  title2: { fontSize: T.headline - 4, fontWeight: '800', color: T.ink, textAlign: 'center', marginVertical: 14 },
  card: { backgroundColor: T.card, borderRadius: T.radius, padding: 22, marginVertical: 8 },
  h: { fontSize: T.body + 2, fontWeight: '800', color: T.ink, marginBottom: 8 },
  b: { fontSize: T.body - 1, color: T.ink, lineHeight: 29 },
});
