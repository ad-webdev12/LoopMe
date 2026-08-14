// Call screening — source lines 358-386. Dark ringing state → live transcript
// (a scripted demonstration; one line every ~1800ms, red captions on flagged
// lines, the red "Hang up now." bar when a code is asked for) → ended state.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Phone, PhoneOff, Ban } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFFade, KFIn } from '../ui/kf';
import type { Ctx } from '../App';

const SCRIPT = [
  { text: 'Good morning, this is Officer Daniels from the fraud department.' },
  { text: 'Someone has been using your account this morning.', flag: 'frightens you, then asks for something' },
  { text: 'Please do not discuss this call with your family.', flag: 'asks you to keep it secret' },
  { text: 'Read me the six digit code we just sent to your phone.', flag: 'asks for a security code', alarm: true },
];

type Line = { text: string; flag?: string; alarm?: boolean };

export default function CallScreen({ ctx }: { ctx: Ctx }) {
  const [stage, setStage] = useState<'ringing' | 'live' | 'ended'>('ringing');
  const [lines, setLines] = useState<Line[]>([]);
  const [secs, setSecs] = useState(4);
  const iv = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => () => clearInterval(iv.current), []);

  const answer = () => {
    setStage('live'); setLines([]); setSecs(1);
    let n = 0, s = 1;
    clearInterval(iv.current);
    iv.current = setInterval(() => {
      s += 1; setSecs(s);
      if (s % 2 === 0 && n < SCRIPT.length) {
        const l = SCRIPT[n]; n += 1;
        setLines(prev => [...prev, l]);
      }
    }, 900);
  };
  const hangUp = () => { clearInterval(iv.current); setStage('ended'); };
  const alarm = lines.some(l => l.alarm);
  const first = ctx.settings.trusted[0];

  if (stage === 'ringing') {
    return (
      <KFFade duration={250} style={st.dark} playKey="ringing">
        <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 36, paddingBottom: 34 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={st.unknown} allowFontScaling>Unknown caller</Text>
            <Text style={st.number} allowFontScaling>+1 (628) 555-0117</Text>
            <View style={st.notContact}>
              <AlertTriangle size={14} color="#ff9783" strokeWidth={2.2} />
              <Text style={st.notContactText} allowFontScaling>Not in your contacts</Text>
            </View>
          </View>
          <View style={st.listenCard}>
            <Text style={st.listenTitle} allowFontScaling>Loop Me can listen with you</Text>
            <Text style={st.listenBody} allowFontScaling>We write down what they say and warn you the moment they ask for something a real caller never would. They cannot tell.</Text>
          </View>
          <View style={{ marginTop: 'auto', gap: 11 }}>
            <Pressable style={st.answerBtn} onPress={answer} accessibilityRole="button">
              <Text style={st.answerText} allowFontScaling>Answer with screening</Text>
              <Phone size={20} color="#fff" strokeWidth={1.9} />
            </Pressable>
            <Pressable style={st.declineBtn} onPress={hangUp} accessibilityRole="button">
              <Text style={st.declineText} allowFontScaling>Do not answer</Text>
            </Pressable>
          </View>
        </View>
      </KFFade>
    );
  }

  if (stage === 'live') {
    return (
      <View style={{ flex: 1 }}>
        <View style={st.liveHead}>
          <View>
            <Text style={st.liveNumber} allowFontScaling>+1 (628) 555-0117</Text>
            <Text style={st.liveMeta} allowFontScaling>0:{String(secs).padStart(2, '0')} · screening on</Text>
          </View>
          <View style={st.bars}>{[9, 14, 6, 12].map((h, i) => <View key={i} style={[st.bar, { height: h }]} />)}</View>
        </View>
        <ScrollView style={st.transcript} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16 }}>
          <Text style={st.transLabel} allowFontScaling>What they are saying</Text>
          {lines.map((l, i) => (
            <KFIn key={i} duration={300} playKey={i} style={{ marginBottom: 11 }}>
              <View style={st.lineCard}><Text style={st.lineText} allowFontScaling>{l.text}</Text></View>
              {!!l.flag && (
                <View style={st.flagRow}>
                  <AlertTriangle size={14} color={T.red} strokeWidth={2.3} />
                  <Text style={st.flagText} allowFontScaling>{l.flag}</Text>
                </View>
              )}
            </KFIn>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>
        {alarm && (
          <KFIn duration={250} playKey="alarm" style={st.alarm}>
            <Text style={st.alarmTitle} allowFontScaling>Hang up now.</Text>
            <Text style={st.alarmBody} allowFontScaling>No bank, police officer or company will ever ask you to read out a code.</Text>
          </KFIn>
        )}
        <View style={st.liveActions}>
          <Pressable style={st.hangBtn} onPress={hangUp} accessibilityRole="button">
            <Text style={st.hangText} allowFontScaling>Hang up</Text>
            <PhoneOff size={20} color="#fff" strokeWidth={2} />
          </Pressable>
          <Pressable style={st.loopBtn} onPress={() => ctx.flash('Text drafted to ' + (first ? first.name.split(' ')[0] : 'your contact') + '.')} accessibilityRole="button">
            <Text style={st.loopText} allowFontScaling>Loop in {first ? first.name.split(' ')[0] : 'someone'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={st.ended}>
      <View style={{ paddingHorizontal: 22, paddingTop: 26, paddingBottom: 20 }}>
        <Text style={st.endedTitle} allowFontScaling>Call ended</Text>
        <Text style={st.endedSub} allowFontScaling>You did the right thing. Nothing was given away.</Text>
      </View>
      <View style={st.savedCard}>
        <Text style={st.savedLabel} allowFontScaling>Saved to your history</Text>
        <Text style={st.savedText} allowFontScaling>A caller claiming to be the fraud department asked you to read out a code, and told you to keep it quiet. Both are scam signs.</Text>
      </View>
      <View style={{ marginTop: 'auto', paddingHorizontal: 22, paddingBottom: 30, gap: 9 }}>
        <Pressable style={st.blockBtn} onPress={() => ctx.flash('That number is blocked. Nothing from it will reach you.')} accessibilityRole="button">
          <Text style={st.blockText} allowFontScaling>Block this number</Text>
          <Ban size={19} color="#fff" strokeWidth={2} />
        </Pressable>
        <Pressable style={st.backHome} onPress={() => ctx.go('home')} accessibilityRole="button">
          <Text style={st.backHomeText} allowFontScaling>Back to Loop Me</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  dark: { flex: 1, backgroundColor: T.callDark },
  unknown: { fontSize: 15, color: 'rgba(255,255,255,.6)' },
  number: { fontSize: 30, fontWeight: '600', color: '#fff', marginTop: 8, lineHeight: 34.5 },
  notContact: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16, backgroundColor: 'rgba(255,255,255,.12)', paddingHorizontal: 11, paddingVertical: 6 },
  notContactText: { fontSize: 11.5, fontFamily: F.bold, color: '#ff9783' },
  listenCard: { marginTop: 34, backgroundColor: 'rgba(255,255,255,.08)', padding: 15 },
  listenTitle: { fontSize: 12, fontFamily: F.bold, color: '#fff', marginBottom: 6 },
  listenBody: { fontSize: 13.5, fontFamily: F.body, color: 'rgba(255,255,255,.72)', lineHeight: 20.25 },
  answerBtn: { height: 58, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  answerText: { fontSize: 16.5, fontFamily: F.bold, color: '#fff' },
  declineBtn: { height: 52, borderWidth: 1, borderColor: 'rgba(255,255,255,.35)', alignItems: 'center', justifyContent: 'center' },
  declineText: { fontSize: 15, fontFamily: F.bold, color: '#fff' },

  liveHead: { backgroundColor: T.callDark, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveNumber: { fontSize: 17, fontWeight: '600', color: '#fff' },
  liveMeta: { fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 3 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 20 },
  bar: { width: 4, backgroundColor: '#7bd6b6' },
  transcript: { flex: 1, backgroundColor: T.ground },
  transLabel: { fontSize: 12, fontFamily: F.bold, color: T.sub, marginBottom: 12 },
  lineCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11 },
  lineText: { fontSize: 15, lineHeight: 21, color: T.ink },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  flagText: { fontSize: 12, fontFamily: F.bold, color: T.red },
  alarm: { backgroundColor: T.red, paddingHorizontal: 22, paddingVertical: 15 },
  alarmTitle: { fontSize: 17, fontFamily: F.display, color: '#fff', lineHeight: 21.25 },
  alarmBody: { fontSize: 13.5, fontFamily: F.body, color: 'rgba(255,255,255,.9)', lineHeight: 19.6, marginTop: 5 },
  liveActions: { backgroundColor: T.ground, borderTopWidth: 1, borderTopColor: T.hairline, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 26, gap: 9 },
  hangBtn: { height: 56, borderRadius: 12, backgroundColor: T.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  hangText: { fontSize: 16.5, fontFamily: F.bold, color: '#fff' },
  loopBtn: { height: 48, borderWidth: 1, borderColor: T.fieldBorder, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  loopText: { fontSize: 14, fontFamily: F.bold, color: T.ink },

  ended: { flex: 1, backgroundColor: T.ground },
  endedTitle: { fontSize: 27, fontFamily: F.display, letterSpacing: -0.54, color: T.ink, lineHeight: 29.16 },
  endedSub: { fontSize: 14.5, fontFamily: F.body, color: T.sub, lineHeight: 22.5, marginTop: 8 },
  savedCard: { marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, padding: 15 },
  savedLabel: { fontSize: 12.5, fontFamily: F.bold, color: T.sub, marginBottom: 8 },
  savedText: { fontSize: 14.5, fontFamily: F.body, color: T.ink, lineHeight: 21.75 },
  blockBtn: { height: 54, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  blockText: { fontSize: 16, fontFamily: F.bold, color: '#fff' },
  backHome: { height: 44, alignItems: 'center', justifyContent: 'center' },
  backHomeText: { fontSize: 13.5, fontFamily: F.semibold, color: T.sub },
});
