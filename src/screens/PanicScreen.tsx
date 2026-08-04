// Panic v2 — the first 24 hours, one step per screen, zero blame,
// bank fraud-line directory, real report links, DOJ hotline, and the 90-day guard.
import React, { useState } from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { Volume2 } from 'lucide-react-native';
import { T } from '../theme';
import Button from '../ui/Button';
import Screen from '../ui/Screen';
import { readAloud } from '../lib/speech';
import { sendSms } from '../lib/familyLink';
import { BANK_FRAUD_LINES, HOTLINES } from '../lib/banks';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

const STEPS = [
  { title: 'First: you are okay.', body: 'This happens to millions of careful, intelligent people. Speed matters more than shame — and you’re already moving. One slow breath, then step by step.' },
  { title: 'Stop all contact.', body: 'Don’t reply, don’t answer their calls, don’t send another cent — no matter what they threaten. Every promise they make now is part of the scam.' },
  { title: 'Call your bank’s fraud line.', body: 'Use the number on the back of your card — never a number from any message. If the card isn’t handy, tap your bank below. They handle this every single day and will not judge you.', banks: true },
  { title: 'Change your email password first.', body: 'Your email is the master key — it can reset every other password. Change it now, then your bank password. Turn on two-step verification if it offers.' },
  { title: 'Loop in someone you trust.', body: 'You don’t have to carry this alone. One tap sends them a note.', loop: true },
  { title: 'Report it.', body: 'Reporting helps stop them and can help you recover. It takes minutes, and no one will blame you.', report: true },
];

export default function PanicScreen(props: { settings: Settings; update: (s: Settings) => void; go: (r: Route) => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const finish = () => {
    props.update({ ...props.settings, panicCompletedAt: Date.now() }); // arms the 90-day recovery-scam guard
    props.go({ name: 'home' });
  };
  return (
    <Screen centered>
      <Text style={s.count} allowFontScaling>Step {i + 1} of {STEPS.length}</Text>
      <Text style={s.title} allowFontScaling>{step.title}</Text>
      <Text style={s.body} allowFontScaling>{step.body}</Text>

      {step.banks && BANK_FRAUD_LINES.slice(0, 6).map(b => (
        <Button key={b.name} label={`${b.name}  ·  ${b.phone}`} kind="secondary" onPress={() => Linking.openURL(`tel:${b.phone.replace(/[^\d]/g, '')}`)} />
      ))}
      {step.loop && props.settings.trusted[0] && (
        <Button label={`Send a note to ${props.settings.trusted[0].name}`} kind="success"
          onPress={() => sendSms(props.settings.trusted[0].phone,
            'I think I may have been caught by a scam and could use a hand. Can you call me when you have a minute?')} />
      )}
      {step.report && (
        <>
          <Button label="Report to the FTC" onPress={() => Linking.openURL('https://reportfraud.ftc.gov')} />
          <Button label="Report to the FBI (IC3)" kind="secondary" onPress={() => Linking.openURL('https://www.ic3.gov')} />
          <Button label="Identity stolen? IdentityTheft.gov" kind="secondary" onPress={() => Linking.openURL('https://www.identitytheft.gov')} />
          {HOTLINES.map(h => (
            <Button key={h.name} label={`Call the ${h.name}`} kind="secondary" onPress={() => Linking.openURL(`tel:${h.phone.replace(/[^\d]/g, '')}`)} />
          ))}
          <Text style={s.note} allowFontScaling>One more thing: in the coming weeks, anyone who calls offering to “recover your money” for a fee is a second scammer. This app watches for those messages extra carefully from now on.</Text>
        </>
      )}

      <Button label={last ? 'Done — back home' : 'Next step'} kind={last ? 'success' : 'primary'} onPress={() => (last ? finish() : setI(i + 1))} />
      <Button label="Read it to me" kind="secondary" icon={Volume2} onPress={() => readAloud(`${step.title} ${step.body}`)} />
      {i > 0 && <Button label="Back" kind="ghost" onPress={() => setI(i - 1)} />}
    </Screen>
  );
}
const s = StyleSheet.create({
  count: { fontSize: T.caption, fontWeight: '700', color: T.inkSoft, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },
  title: { fontSize: T.headline, fontWeight: '800', color: T.ink, textAlign: 'center', marginVertical: 12, letterSpacing: -0.4 },
  body: { fontSize: T.bodyLg, color: T.ink, textAlign: 'center', lineHeight: 31, marginBottom: 18 },
  note: { fontSize: T.small, color: T.inkSoft, textAlign: 'center', lineHeight: 24, marginVertical: 10 },
});
