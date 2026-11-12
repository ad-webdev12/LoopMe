// Listen mode. Hold the phone near a landline, a speakerphone, a voicemail
// playing back, or a person at the door. Speech is turned into words on the
// phone, every sentence is scored as it lands, and the top of the screen says
// where the conversation stands. Nothing is recorded and nothing leaves the
// phone. (iOS lets no app hear a call on this same phone; that is why this
// listens through the microphone.)
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronLeft } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import { detect, Verdict } from '../engine/ScamDetector';
import { instant } from '../engine/ai';
import { startListening, stopListeningLive, addSpeechListener } from '../../modules/scam-ai';
import type { Ctx } from '../App';

type Line = { text: string; level: Verdict['level']; reason: string };

function split(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 3);
}

export default function ListenScreen({ ctx }: { ctx: Ctx }) {
  const [on, setOn] = useState(false);
  const [denied, setDenied] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [partial, setPartial] = useState('');
  const [overall, setOverall] = useState<Verdict | null>(null);
  const done = useRef<string[]>([]);       // finished segments
  const scroll = useRef<ScrollView>(null);
  const worst = useRef<Verdict['level']>('green');
  const watchedBy = ctx.settings.watchedBy?.split(' ')[0] || null;

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
      const scored: Line[] = finished.map(s => { const v = detect(s); return { text: s, level: v.level, reason: v.level === 'green' ? '' : v.reason }; });
      setLines([...done.current.map(s => { const v = detect(s); return { text: s, level: v.level, reason: v.level === 'green' ? '' : v.reason }; }), ...scored]);
      setPartial(tail);
      if (e.final) done.current = [...done.current, ...sentences];
      const all = [...done.current, ...(e.final ? [] : finished), tail].join(' ');
      if (all.trim()) score(all);
      requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
    });
    return () => { sub.remove(); stopListeningLive(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    const ok = await startListening();
    if (!ok) { setDenied(true); return; }
    setDenied(false); setOn(true);
  };
  const stop = () => { stopListeningLive(); setOn(false); };
  const leave = () => { stop(); ctx.go('home'); };

  const field = overall?.level === 'red' ? T.red : overall?.level === 'amber' ? T.amber : T.green;
  const headline = !on && !overall ? 'Hold the phone near the voice.'
    : overall?.level === 'red' ? 'This is a scam. Hang up.'
    : overall?.level === 'amber' ? 'Be careful. Do not agree to anything.'
    : on ? 'Listening. Nothing wrong so far.' : 'Nothing wrong was heard.';
  const whole = [...done.current, partial].join(' ').trim();

  return (
    <KFIn duration={260} style={{ flex: 1 }} playKey="listen">
    <View style={st.root}>
      <View style={[st.top, { backgroundColor: on || overall ? field : T.green }]}>
        <Pressable style={st.back} onPress={leave} accessibilityRole="button">
          <ChevronLeft size={18} color="#fff" strokeWidth={2.2} />
          <Text style={st.backText} allowFontScaling>Back</Text>
        </Pressable>
        <Text style={st.eyebrow} allowFontScaling>{on ? 'LISTENING' : 'LISTEN MODE'}</Text>
        <Text style={st.headline} allowFontScaling>{headline}</Text>
        {!!overall && overall.level !== 'green' && <Text style={st.why} allowFontScaling>{overall.reason}</Text>}
      </View>

      <ScrollView ref={scroll} style={st.body} contentContainerStyle={{ padding: 24, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {lines.length === 0 && !partial && (
          <Text style={st.hint} allowFontScaling>
            {denied ? 'Loop Me needs the microphone and speech permission for this. Allow both in Settings.'
              : 'A landline on speaker, a voicemail playing, someone at the door. The words appear here as they are said, and each line turns red when it sounds like a con. Nothing is recorded.'}
          </Text>
        )}
        {lines.map((l, i) => (
          <View key={i} style={st.line}>
            <View style={[st.dot, { backgroundColor: l.level === 'red' ? T.red : l.level === 'amber' ? T.amber : T.hairline }]} />
            <View style={{ flex: 1 }}>
              <Text style={[st.lineText, l.level === 'red' && { color: T.redInk, fontFamily: F.semibold }]} allowFontScaling>{l.text}</Text>
              {!!l.reason && <Text style={st.lineWhy} allowFontScaling>{l.reason}</Text>}
            </View>
          </View>
        ))}
        {!!partial && (
          <View style={st.line}>
            <View style={[st.dot, { backgroundColor: 'transparent' }]} />
            <Text style={[st.lineText, { color: T.sub }]} allowFontScaling>{partial}</Text>
          </View>
        )}
      </ScrollView>

      <View style={st.bottom}>
        {on ? (
          <Pressable style={[st.primary, { backgroundColor: T.ink }]} onPress={stop} accessibilityRole="button">
            <Text style={st.primaryText} allowFontScaling>Stop listening</Text>
          </Pressable>
        ) : (
          <Pressable style={st.primary} onPress={start} accessibilityRole="button">
            <Text style={st.primaryText} allowFontScaling>{overall ? 'Listen again' : 'Start listening'}</Text>
          </Pressable>
        )}
        {!!overall && overall.level !== 'green' && whole.length > 0 && (
          <Pressable style={st.secondary} onPress={() => { stop(); ctx.check(whole); }} accessibilityRole="button">
            <Text style={st.secondaryText} allowFontScaling>{watchedBy ? 'Save it and tell ' + watchedBy : 'Save it as a check'}</Text>
          </Pressable>
        )}
      </View>
    </View>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  top: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 22 },
  back: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginLeft: -8 },
  backText: { fontSize: 17, fontFamily: F.medium, color: '#fff' },
  eyebrow: { fontSize: 13, fontFamily: F.bold, letterSpacing: 1.6, color: 'rgba(255,255,255,.8)', marginTop: 6 },
  headline: { fontSize: 30, fontFamily: F.display, letterSpacing: -0.8, color: '#fff', lineHeight: 34, marginTop: 8 },
  why: { fontSize: 15.5, fontFamily: F.body, color: 'rgba(255,255,255,.9)', lineHeight: 22, marginTop: 10 },
  body: { flex: 1 },
  hint: { fontSize: 17, fontFamily: F.body, color: T.sub, lineHeight: 26 },
  line: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.hairline },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 8 },
  lineText: { fontSize: 18, fontFamily: F.body, color: T.ink, lineHeight: 26 },
  lineWhy: { fontSize: 14, fontFamily: F.body, color: T.sub, lineHeight: 20, marginTop: 3 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 24, paddingBottom: 36, gap: 10, backgroundColor: T.ground },
  primary: { height: 60, borderRadius: 14, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 18, fontFamily: F.bold, color: '#fff' },
  secondary: { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: T.hairline, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 17, fontFamily: F.semibold, color: T.ink },
});
