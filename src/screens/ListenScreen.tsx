// Listen mode. Hold the phone near a landline, a speakerphone, a voicemail
// playing back, or a person at the door. Speech is turned into words on the
// phone, every sentence is scored as it lands, and the top of the screen says
// where the conversation stands. Nothing is recorded and nothing leaves the
// phone. (iOS lets no app hear a call on this same phone.)
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { T, font } from '../theme';
import { Takeover, BackLink, Pill } from '../ui/base';
import { detect, Verdict } from '../engine/ScamDetector';
import { instant } from '../engine/ai';
import { startListening, stopListeningLive, addSpeechListener } from '../../modules/scam-ai';
import { loopPerson, firstName } from '../ui/pieces';
import type { Ctx } from '../App';

type Line = { text: string; level: Verdict['level']; reason: string };
const split = (text: string) => text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 3);

export default function ListenScreen({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const [on, setOn] = useState(false);
  const [denied, setDenied] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [partial, setPartial] = useState('');
  const [overall, setOverall] = useState<Verdict | null>(null);
  const done = useRef<string[]>([]);
  const scroll = useRef<ScrollView>(null);
  const worst = useRef<Verdict['level']>('green');
  const who = firstName(loopPerson(ctx.settings)?.name);

  const score = (all: string) => {
    const v = instant(all, { allowlist: ctx.settings.allowlist });
    setOverall(v);
    const rank = { green: 0, amber: 1, red: 2 } as const;
    if (rank[v.level] > rank[worst.current]) {
      worst.current = v.level;
      Haptics.notificationAsync(v.level === 'red' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  };
  useEffect(() => {
    const sub = addSpeechListener(e => {
      const sentences = split(e.text);
      const finished = e.final ? sentences : sentences.slice(0, -1);
      const tail = e.final ? '' : (sentences[sentences.length - 1] || '');
      const toLine = (s: string): Line => { const v = detect(s); return { text: s, level: v.level, reason: v.level === 'green' ? '' : v.reason }; };
      setLines([...done.current.map(toLine), ...finished.map(toLine)]);
      setPartial(tail);
      if (e.final) done.current = [...done.current, ...sentences];
      const all = [...done.current, ...(e.final ? [] : finished), tail].join(' ');
      if (all.trim()) score(all);
      requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
    });
    return () => { sub.remove(); stopListeningLive(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => { const ok = await startListening(); if (!ok) { setDenied(true); return; } setDenied(false); setOn(true); };
  const stop = () => { stopListeningLive(); setOn(false); };
  const field = overall?.level === 'red' ? T.red : overall?.level === 'amber' ? T.amber : T.green;
  const headline = !on && !overall ? 'Hold the phone near the voice.'
    : overall?.level === 'red' ? 'This is a scam. Hang up.'
    : overall?.level === 'amber' ? 'Be careful. Don’t agree to anything.'
    : on ? 'Listening. Nothing wrong so far.' : 'Nothing wrong was heard.';
  const whole = [...done.current, partial].join(' ').trim();

  return (
    <Takeover color={field} haptic={null} playKey={field}>
      <View style={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 22 }}>
        <BackLink onPress={() => { stop(); ctx.go('home'); }} color="#fff" />
        <Text style={[font(13, '600'), { color: '#fff', marginTop: 6 }]} allowFontScaling>{on ? 'Listening' : 'Listen mode'}</Text>
        <Text style={[font(32, '800', 1.05, -0.5), { color: '#fff', marginTop: 8 }]} allowFontScaling>{headline}</Text>
        {!!overall && overall.level !== 'green' && <Text style={[font(16, '400', 1.4), { color: '#fff', marginTop: 10 }]} allowFontScaling>{overall.reason}</Text>}
      </View>
      <View style={{ flex: 1, backgroundColor: C.ground, borderTopLeftRadius: 22, borderTopRightRadius: 22 }}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 20, paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
          {lines.length === 0 && !partial && (
            <Text style={[font(17, '400', 1.45), { color: C.ink2 }]} allowFontScaling>
              {denied ? 'Loop Me needs the microphone and speech permission for this. Allow both in Settings.'
                : 'A landline on speaker, a voicemail playing, someone at the door. The words appear here as they are said, and each line turns red when it sounds like a con. Nothing is recorded.'}
            </Text>
          )}
          {lines.map((l, i) => (
            <View key={i} style={[st.line, { backgroundColor: C.card }]}>
              <View style={[st.dot, { backgroundColor: l.level === 'red' ? T.red : l.level === 'amber' ? T.amber : C.sep2 }]} />
              <View style={{ flex: 1 }}>
                <Text style={[font(17, l.level === 'red' ? '600' : '400', 1.4), { color: l.level === 'red' ? T.redInk : C.ink }]} allowFontScaling>{l.text}</Text>
                {!!l.reason && <Text style={[font(14, '400', 1.35), { color: C.ink2, marginTop: 3 }]} allowFontScaling>{l.reason}</Text>}
              </View>
            </View>
          ))}
          {!!partial && <Text style={[font(17, '400', 1.4), { color: C.meta, paddingHorizontal: 14 }]} allowFontScaling>{partial}</Text>}
        </ScrollView>
        <View style={[st.bottom, { backgroundColor: C.ground }]}>
          {on ? <Pill label="Stop listening" bg={C.dark ? '#2c2c2e' : '#000'} onPress={stop} /> : <Pill label={overall ? 'Listen again' : 'Start listening'} onPress={start} />}
          {!!overall && overall.level !== 'green' && whole.length > 0 && (
            <Pill label={who ? 'Save it and tell ' + who : 'Save it as a check'} height={52} bg={C.card} color={C.ink} onPress={() => { stop(); ctx.check(whole); }} />
          )}
        </View>
      </View>
    </Takeover>
  );
}

const st = StyleSheet.create({
  line: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 7 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 40, gap: 10 },
});
