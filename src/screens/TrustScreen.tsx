// The privacy promise + "what this app can't do" — in plain words, not a policy.
// Nobody else in this market ships the honesty screen. That's exactly why it builds trust.
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { T, F } from '../theme';
import Card from '../ui/Card';
import Screen from '../ui/Screen';
import type { Route } from '../App';

export default function TrustScreen(props: { go: (r: Route) => void }) {
  return (
    <Screen onBack={() => props.go({ name: 'home' })} title="Our promise, in plain words">
      <Card>
        <Text style={s.h} allowFontScaling>Your messages stay on your phone.</Text>
        <Text style={s.b} allowFontScaling>Every check happens right here on this device — even in airplane mode. We can’t read your messages. We don’t want to. Nothing is stored, nothing is sent, unless YOU tap to send it to someone you trust.</Text>
      </Card>
      <Card>
        <Text style={s.h} allowFontScaling>Family answers travel in your own texts.</Text>
        <Text style={s.b} allowFontScaling>When you ask family to look at a message, it goes as a normal text from your phone to theirs. There is no company server in the middle — nothing to hack, nothing to sell.</Text>
      </Card>
      <Card>
        <Text style={s.h} allowFontScaling>No account. No ads. No charge.</Text>
        <Text style={s.b} allowFontScaling>You will never be asked to sign up, pay, or watch an ad. Protection shouldn’t have a paywall.</Text>
      </Card>
      <Text style={s.title2} allowFontScaling>What this app can’t do</Text>
      <Card>
        <Text style={s.b} allowFontScaling>
          {'•'} No app on Earth can read your iMessages or WhatsApp — Apple and WhatsApp seal them off from everyone. Anyone who claims otherwise is lying. The Share button is the honest way in.{'\n\n'}
          {'•'} It can’t tell you whether a voice or a video is real. Nobody reliably can anymore. Your family code word can — a copied voice can’t know a secret.{'\n\n'}
          {'•'} It’s very good at spotting known tricks, but no checker is perfect. When it’s not sure, it says so and suggests a second opinion from someone you trust.
        </Text>
      </Card>
    </Screen>
  );
}
const s = StyleSheet.create({
  title2: { fontSize: T.title, fontFamily: F.displayBold, color: T.ink, textAlign: 'center', marginVertical: 12, letterSpacing: -0.3 },
  h: { fontSize: T.bodyLg, fontFamily: F.bodyBold, color: T.ink, marginBottom: 8 },
  b: { fontSize: T.body, fontFamily: F.body, color: T.ink, lineHeight: 28 },
});
