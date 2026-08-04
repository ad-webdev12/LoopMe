// Verdict v3 — commit, explain with highlights, one action, ask family with one
// tap, and never make checking feel foolish.
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Volume2, MessageCircleQuestion } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { T, LEVEL_META, F } from '../theme';
import VerdictMark from '../ui/VerdictMark';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Screen from '../ui/Screen';
import { readAloud } from '../lib/speech';
import { askText, sendSms } from '../lib/familyLink';
import { listChecks, updateCheck } from '../lib/history';
import type { Verdict } from '../engine/ScamDetector';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

const CONF: Record<string, string> = {
  very: 'I’m very sure about this.',
  fairly: 'I’m fairly sure about this.',
  unsure: 'I’m not certain — this one’s worth a second opinion.',
};
const TAP_CONSEQ = 'If you tapped that link, you’d land on a page built to look real — a bank login, a delivery form. Anything you type there (password, card number) goes straight to the scammer, who can use it within minutes.';

// Highlight the exact trick phrases inside the original message.
function Highlighted({ text, matches }: { text: string; matches: string[] }) {
  let parts: { t: string; hit: boolean }[] = [{ t: text, hit: false }];
  for (const m of matches.filter(Boolean)) {
    const next: typeof parts = [];
    for (const p of parts) {
      if (p.hit) { next.push(p); continue; }
      const idx = p.t.toLowerCase().indexOf(m.toLowerCase());
      if (idx === -1) { next.push(p); continue; }
      if (idx > 0) next.push({ t: p.t.slice(0, idx), hit: false });
      next.push({ t: p.t.slice(idx, idx + m.length), hit: true });
      if (idx + m.length < p.t.length) next.push({ t: p.t.slice(idx + m.length), hit: false });
    }
    parts = next;
  }
  return (
    <Text style={s.msg} allowFontScaling>
      {parts.map((p, i) => <Text key={i} style={p.hit ? s.hit : undefined}>{p.t}</Text>)}
    </Text>
  );
}

export default function VerdictScreen(props: {
  message: string; verdict: Verdict; recordId: string;
  settings: Settings; update: (st: Settings) => void; go: (r: Route) => void;
}) {
  const { verdict: v, message } = props;
  const [why, setWhy] = useState(false);
  const [conseq, setConseq] = useState(false);
  const [asked, setAsked] = useState(false);
  const m = LEVEL_META[v.level];
  const hasLink = /https?:\/\/|www\.|\.[a-z]{2,4}\//i.test(message);

  const speech = `${m.word}. ${v.reason} ${CONF[v.confidence]} Here is one safe step: ${v.safeStep}`;
  useEffect(() => { if (props.settings.readAloud) readAloud(speech); }, []);

  const askFamily = async () => {
    const person = props.settings.trusted[0] || null;
    if (!person) { props.go({ name: 'circle' }); return; }
    const rec = (await listChecks()).find(r => r.id === props.recordId);
    if (!rec) return;
    // The check stays "open" until family answers: gentle reminders keep the
    // person from acting on the message in the meantime (cancelled on reply).
    const reminderIds: string[] = [];
    if (v.level !== 'green') {
      const first = person.name.split(' ')[0];
      for (const [seconds, body] of [
        [1800, `No answer from ${first} yet about that message. Until then: don’t reply, don’t pay, don’t tap anything.`],
        [7200, `Still waiting on ${first}. The message will keep — real business can always wait. If it’s urgent, call ${first} directly.`],
      ] as const) {
        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: { title: 'Your check is still open', body },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
          });
          reminderIds.push(id);
        } catch {}
      }
    }
    await updateCheck(rec.id, { askedFamily: true, reminderIds });
    await sendSms(person.phone, askText(props.settings.myName, rec));
    setAsked(true);
  };

  const disagree = () => {
    Alert.alert('Thanks for telling me', 'Should I treat this sender as safe from now on?', [
      { text: 'No, just this once', style: 'cancel' },
      { text: 'Yes, always safe', onPress: () => {
        const key = message.trim().slice(0, 40);
        props.update({ ...props.settings, allowlist: [...props.settings.allowlist, key] });
      }},
    ]);
  };

  return (
    <Screen onBack={() => props.go({ name: 'home' })}>
      <VerdictMark level={v.level} />
      <Text style={s.line} allowFontScaling>{m.line}</Text>
      <Text style={s.conf} allowFontScaling>{CONF[v.confidence]}</Text>

      {v.codeWordMoment && (
        <Card tone="amber">
          <Text style={s.step} allowFontScaling>
            {props.settings.codeWordSet
              ? 'If someone claims to be family: ask them for your code word first. A copied voice can’t know it.'
              : 'A copied voice can sound exactly like family. Set up a family code word — it takes one minute.'}
          </Text>
          {!props.settings.codeWordSet && <Button label="Set up our code word" onPress={() => props.go({ name: 'codeword' })} />}
        </Card>
      )}

      <Card tone={v.level === 'red' ? 'red' : v.level === 'amber' ? 'amber' : 'green'}>
        <Text style={s.stepLabel} allowFontScaling>One safe step</Text>
        <Text style={s.step} allowFontScaling>{v.safeStep}</Text>
      </Card>

      {asked ? (
        <Card tone="accent">
          <Text style={s.step} allowFontScaling>
            Sent. Your check is saved here — when {props.settings.trusted[0]?.name || 'your family'} answers, it appears right on this phone.
          </Text>
        </Card>
      ) : (
        <Button
          label={props.settings.trusted[0] ? `Ask ${props.settings.trusted[0].name.split(' ')[0]} to look` : 'Ask my family to look'}
          icon={MessageCircleQuestion}
          onPress={askFamily}
        />
      )}

      {!why ? (
        <Button label="Show me why" kind="secondary" onPress={() => setWhy(true)} />
      ) : (
        <Card>
          <Highlighted text={message} matches={v.matches} />
          {(v.signals.length ? v.signals : [v.reason]).map((r, i) => (
            <Text key={i} style={s.reason} allowFontScaling>{'•'} {r}</Text>
          ))}
        </Card>
      )}

      {hasLink && v.level !== 'green' && (
        !conseq
          ? <Button label="What would happen if I tapped it?" kind="secondary" onPress={() => setConseq(true)} />
          : <Card><Text style={s.reason} allowFontScaling>{TAP_CONSEQ}</Text></Card>
      )}

      <Button label="Read it to me" kind="secondary" icon={Volume2} onPress={() => readAloud(speech)} />
      <Text style={s.affirm} allowFontScaling>You did the right thing by checking. Checking is never foolish.</Text>
      <View style={s.row}>
        <Button label="Check another" kind="ghost" onPress={() => props.go({ name: 'home' })} />
        {v.level !== 'green' && <Button label="I think you’re wrong" kind="ghost" onPress={disagree} />}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  line: { fontSize: T.title, fontFamily: F.displayBold, color: T.ink, textAlign: 'center', letterSpacing: -0.3 },
  conf: { fontSize: T.small, fontFamily: F.body, color: T.inkSoft, textAlign: 'center', marginTop: 6, marginBottom: 12 },
  stepLabel: { fontSize: T.caption, fontFamily: F.bodyBold, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  step: { fontSize: T.bodyLg, color: T.ink, fontFamily: F.bodyBold, lineHeight: 30 },
  msg: { fontSize: T.small, fontFamily: F.body, color: T.inkSoft, lineHeight: 26, marginBottom: 12, fontStyle: 'italic' },
  hit: { backgroundColor: T.amberSoft, color: T.ink, fontFamily: F.bodyBold, fontStyle: 'normal' },
  reason: { fontSize: T.body, fontFamily: F.body, color: T.ink, lineHeight: 27, marginBottom: 6 },
  affirm: { fontSize: T.small, fontFamily: F.body, color: T.inkSoft, textAlign: 'center', marginTop: 10, lineHeight: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
