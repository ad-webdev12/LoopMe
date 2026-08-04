// Panic v2 — the first 24 hours, one step per screen, zero blame,
// bank fraud-line directory, real report links, DOJ hotline, and the 90-day guard.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking, ScrollView } from 'react-native';
import { T } from '../theme';
import BigButton from '../components/BigButton';
import { readAloud } from '../lib/speech';
import { loopIn } from '../lib/loopIn';
import { BANK_FRAUD_LINES, HOTLINES } from '../lib/banks';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

const STEPS = [
  { title: 'First: you are okay.', body: 'This happens to millions of careful, intelligent people. Speed matters more than shame — and you\u2019re already moving. One slow breath, then step by step.' },
  { title: 'Stop all contact.', body: 'Don\u2019t reply, don\u2019t answer their calls, don\u2019t send another cent — no matter what they threaten. Every promise they make now is part of the scam.' },
  { title: 'Call your bank\u2019s fraud line.', body: 'Use the number on the back of your card — never a number from any message. If the card isn\u2019t handy, tap your bank below. They handle this every single day and will not judge you.', banks: true },
  { title: 'Change your email password first.', body: 'Your email is the master key — it can reset every other password. Change it now, then your bank password. Turn on two-step verification if it offers.' },
  { title: 'Loop in someone you trust.', body: 'You don\u2019t have to carry this alone. One tap sends them a note.', loop: true },
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
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.count} allowFontScaling>Step {i + 1} of {STEPS.length}</Text>
      <Text style={s.title} allowFontScaling>{step.title}</Text>
      <Text style={s.body} allowFontScaling>{step.body}</Text>

      {step.banks && BANK_FRAUD_LINES.slice(0, 6).map(b => (
        <BigButton key={b.name} label={`${b.name}  \u00B7  ${b.phone}`} kind="secondary" onPress={() => Linking.openURL(`tel:${b.phone.replace(/[^\d]/g, '')}`)} />
      ))}
      {step.loop && props.settings.trusted[0] && (
        <BigButton label={`Send a note to ${props.settings.trusted[0].name}`} color={T.green}
          onPress={() => loopIn(props.settings.trusted[0], 'I think I may have been caught by a scam and could use a hand.', { level: 'red', reason: 'They asked for help.', safeStep: '', signals: [], matches: [], tags: [], confidence: 'very', codeWordMoment: false, score: 0 })} />
      )}
      {step.report && (
        <>
          <BigButton label="Report to the FTC" color={T.ink} onPress={() => Linking.openURL('https://reportfraud.ftc.gov')} />
          <BigButton label="Report to the FBI (IC3)" kind="secondary" onPress={() => Linking.openURL('https://www.ic3.gov')} />
          <BigButton label="Identity stolen? IdentityTheft.gov" kind="secondary" onPress={() => Linking.openURL('https://www.identitytheft.gov')} />
          {HOTLINES.map(h => (
            <BigButton key={h.name} label={`Call the ${h.name}`} kind="secondary" onPress={() => Linking.openURL(`tel:${h.phone.replace(/[^\d]/g, '')}`)} />
          ))}
          <Text style={s.note} allowFontScaling>One more thing: in the coming weeks, anyone who calls offering to \u201Crecover your money\u201D for a fee is a second scammer. I\u2019ll be watching for those messages extra carefully from now on.</Text>
        </>
      )}

      <BigButton label={last ? 'Done — back home' : 'Next step'} color={last ? T.green : T.ink} onPress={() => (last ? finish() : setI(i + 1))} />
      <BigButton label="\uD83D\uDD0A  Read it to me" kind="secondary" onPress={() => readAloud(`${step.title} ${step.body}`)} />
      {i > 0 && <BigButton label="Back" kind="quiet" onPress={() => setI(i - 1)} />}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 28, paddingTop: 40, flexGrow: 1, justifyContent: 'center' },
  count: { fontSize: 17, fontWeight: '700', color: T.inkSoft, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  title: { fontSize: T.headline, fontWeight: '800', color: T.ink, textAlign: 'center', marginVertical: 12 },
  body: { fontSize: T.body + 1, color: T.ink, textAlign: 'center', lineHeight: 32, marginBottom: 20 },
  note: { fontSize: 17, color: T.inkSoft, textAlign: 'center', lineHeight: 26, marginVertical: 10 },
});
