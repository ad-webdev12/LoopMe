// Verdict v2 — commit, explain with highlights, one action, and never make checking feel foolish.
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Animated, Easing } from 'react-native';
import { T, LEVEL_META } from '../theme';
import Stoplight from '../components/Stoplight';
import BigButton from '../components/BigButton';
import { readAloud } from '../lib/speech';
import { loopIn } from '../lib/loopIn';
import type { Verdict } from '../engine/ScamDetector';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

const CONF: Record<string, string> = {
  very: 'I\u2019m very sure about this.',
  fairly: 'I\u2019m fairly sure about this.',
  unsure: 'I\u2019m not certain — this one\u2019s worth a second opinion.',
};
const TAP_CONSEQ = 'If you tapped that link, you\u2019d land on a page built to look real — a bank login, a delivery form. Anything you type there (password, card number) goes straight to the scammer, who can use it within minutes.';

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
  message: string; verdict: Verdict; settings: Settings; update: (st: Settings) => void; go: (r: Route) => void;
}) {
  const { verdict: v, message } = props;
  const [why, setWhy] = useState(false);
  const [conseq, setConseq] = useState(false);
  const m = LEVEL_META[v.level];
  const hasLink = /https?:\/\/|www\.|\.[a-z]{2,4}\//i.test(message);

  const speech = `${m.word}. ${v.reason} ${CONF[v.confidence]} Here is one safe step: ${v.safeStep}`;
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if (props.settings.readAloud) readAloud(speech);
  }, []);

  const doLoopIn = async () => {
    const person = props.settings.trusted[0] || null;
    if (!person) { props.go({ name: 'circle' }); return; }
    await loopIn(person, message, v);
  };
  const askCircle = async () => {
    for (const p of props.settings.trusted) await loopIn(p, message, v);
    if (!props.settings.trusted.length) props.go({ name: 'circle' });
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
    <ScrollView contentContainerStyle={s.wrap}>
      <Animated.View style={{ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }] }}>
      <Stoplight level={v.level} />
      <Text style={s.line} allowFontScaling>{v.level === 'red' ? 'This is a scam.' : v.level === 'amber' ? 'Something\u2019s off here.' : 'This looks okay.'}</Text>
      <Text style={s.conf} allowFontScaling>{CONF[v.confidence]}</Text>

      {v.codeWordMoment && (
        <View style={[s.card, { backgroundColor: T.amberSoft }]}>
          <Text style={s.step} allowFontScaling>
            {props.settings.codeWordSet
              ? 'If someone claims to be family: ask them for your code word first. A copied voice can\u2019t know it.'
              : 'A copied voice can sound exactly like family. Set up a family code word — it takes one minute.'}
          </Text>
          {!props.settings.codeWordSet && <BigButton label="Set up our code word" color={T.ink} onPress={() => props.go({ name: 'codeword' })} />}
        </View>
      )}

      <View style={[s.card, { backgroundColor: m.soft }]}>
        <Text style={s.stepLabel} allowFontScaling>One safe step</Text>
        <Text style={s.step} allowFontScaling>{v.safeStep}</Text>
      </View>

      {v.confidence === 'unsure' && props.settings.trusted.length > 0 && (
        <BigButton label={`Ask ${props.settings.trusted.map(p => p.name.split(' ')[0]).join(' and ')}`} color={T.ink} onPress={askCircle} />
      )}

      {!why ? (
        <BigButton label="Show me why" kind="secondary" onPress={() => setWhy(true)} />
      ) : (
        <View style={s.card}>
          <Highlighted text={message} matches={v.matches} />
          {(v.signals.length ? v.signals : [v.reason]).map((r, i) => (
            <Text key={i} style={s.reason} allowFontScaling>{'\u2022'} {r}</Text>
          ))}
        </View>
      )}

      {hasLink && v.level !== 'green' && (
        !conseq
          ? <BigButton label="What would happen if I tapped it?" kind="secondary" onPress={() => setConseq(true)} />
          : <View style={s.card}><Text style={s.reason} allowFontScaling>{TAP_CONSEQ}</Text></View>
      )}

      <BigButton label="Loop someone in" color={T.ink} onPress={doLoopIn} />
      <BigButton label="\uD83D\uDD0A  Read it to me" kind="secondary" onPress={() => readAloud(speech)} />
      <Text style={s.affirm} allowFontScaling>You did the right thing by checking. Checking is never foolish.</Text>
      <View style={s.row}>
        <BigButton label="Check another" kind="quiet" onPress={() => props.go({ name: 'home' })} />
        {v.level !== 'green' && <BigButton label="I think you\u2019re wrong" kind="quiet" onPress={disagree} />}
      </View>
      </Animated.View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 20 },
  line: { fontSize: T.headline - 2, fontWeight: '800', color: T.ink, textAlign: 'center' },
  conf: { fontSize: 18, color: T.inkSoft, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  card: { backgroundColor: T.card, borderRadius: T.radius, padding: 20, marginVertical: 8, borderWidth: 1, borderColor: '#1E3A5C' },
  stepLabel: { fontSize: 16, fontWeight: '800', color: T.inkSoft, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  step: { fontSize: T.body + 2, color: T.ink, fontWeight: '600', lineHeight: 30 },
  msg: { fontSize: T.body - 1, color: T.inkSoft, lineHeight: 28, marginBottom: 12, fontStyle: 'italic' },
  hit: { backgroundColor: T.amberSoft, color: T.ink, fontWeight: '700', fontStyle: 'normal' },
  reason: { fontSize: T.body, color: T.ink, lineHeight: 28, marginBottom: 6 },
  affirm: { fontSize: 17, color: T.inkSoft, textAlign: 'center', marginTop: 10, lineHeight: 25 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
