// Verdict — source lines 234-266. Tinted answer banner, one step, expandable
// numbered signals, the caretaker note card, the quoted message, loop-in, and
// "Read this to me, slowly": each word lights as it is spoken, flagged words go
// red and bold and dwell 620ms (250ms otherwise), ×1.6 in slow mode.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import {
  ChevronLeft, ChevronDown, ChevronUp, ChevronRight, ArrowRight,
  OctagonX, Info, Check, UserCheck,
} from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn, KFFade, KFSlide } from '../ui/kf';
import { askText, sendSms } from '../lib/familyLink';
import { listChecks, updateCheck } from '../lib/history';
import type { Ctx } from '../App';

const META = {
  red:   { word: 'Stop', line: 'This looks like a scam.', bg: T.red, tint: T.redTint, ink: T.redInk, Icon: OctagonX },
  amber: { word: 'Be careful', line: 'Something about this is not right.', bg: T.amber, tint: T.amberTint, ink: T.amberInk, Icon: Info },
  green: { word: 'Looks okay', line: 'Nothing here matches a known scam.', bg: T.green, tint: T.greenTint, ink: T.greenInk, Icon: Check },
} as const;

const FLAGS: RegExp[] = [
  /^(code|passcode|otp|codes)[.,!?]?$/i,
  /^(fee|fees|\$1\.95|payment|pay)[.,!?]?$/i,
  /(usps-redeliver|bit\.ly|\.co\/|http)/i,
  /^(urgent|urgently|immediately|now|today)[.,!?]?$/i,
  /^(secret|anyone|nobody)[.,!?]?$/i,
  /^(hold|held|suspended|locked)[.,!?]?$/i,
];

export default function VerdictScreen({ ctx }: { ctx: Ctx }) {
  const v = ctx.verdict;
  const [why, setWhy] = useState(false);
  const [reading, setReading] = useState(false);
  const [readIdx, setReadIdx] = useState(-1);
  const [readSlow, setReadSlow] = useState(false);
  const [onFlag, setOnFlag] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const readingRef = useRef(false);
  const slowRef = useRef(false);
  useEffect(() => () => { clearTimeout(timer.current); Speech.stop(); }, []);
  if (!v) return null;

  const meta = META[v.level];
  const careMode = ctx.settings.role === 'caretaker';
  const first = ctx.settings.trusted[0];
  const signals = v.signals.length ? v.signals : ['Nothing in this message matches a known scam trick.'];
  const toks = ctx.msg.split(/\s+/).filter(Boolean).map(w => ({ w, flag: FLAGS.some(re => re.test(w)) }));
  const checkedAt = new Date();
  const vTime = 'Checked at ' + checkedAt.getHours() + ':' + String(checkedAt.getMinutes()).padStart(2, '0');

  const stopRead = () => {
    clearTimeout(timer.current); Speech.stop();
    readingRef.current = false;
    setReading(false); setReadIdx(-1); setOnFlag(false);
  };
  const startRead = () => {
    if (!toks.length) { ctx.flash('Nothing to read yet.'); return; }
    readingRef.current = true;
    setReading(true); setReadIdx(-1); setOnFlag(false);
    Speech.stop();
    Speech.speak(ctx.msg, { rate: slowRef.current ? 0.62 : 0.88 });
    let i = -1;
    const step = () => {
      i += 1;
      if (!readingRef.current || i >= toks.length) { stopRead(); return; }
      setReadIdx(i); setOnFlag(!!toks[i].flag);
      timer.current = setTimeout(step, (toks[i].flag ? 620 : 250) * (slowRef.current ? 1.6 : 1));
    };
    timer.current = setTimeout(step, 220);
  };

  const loopIn = async () => {
    if (careMode) { ctx.flash('Sent to ' + (ctx.settings.watching?.name?.split(' ')[0] || 'their') + '’s phone, with what to watch for.'); return; }
    if (!first) { ctx.go('people'); return; }
    const rec = (await listChecks()).find(r => r.id === ctx.recordId);
    if (!rec) return;
    const reminderIds: string[] = [];
    if (v.level !== 'green') {
      for (const [seconds, body] of [
        [1800, `No answer from ${first.name.split(' ')[0]} yet about that message. Until then: do not reply, do not pay, do not tap anything.`],
        [7200, `Still waiting on ${first.name.split(' ')[0]}. The message will keep. If it is urgent, call them directly.`],
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
    await sendSms(first.phone, askText(ctx.settings.myName, rec));
    ctx.flash('Text drafted to ' + first.name.split(' ')[0] + ' with the message and our answer.');
  };

  return (
    <KFIn duration={240} style={{ flex: 1 }} playKey={ctx.recordId}>
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={st.topRow}>
        <Pressable style={st.back} onPress={() => ctx.go('home')} accessibilityRole="button" accessibilityLabel="Back">
          <ChevronLeft size={17} color={T.ink} strokeWidth={2} />
          <Text style={st.backText} allowFontScaling>Back</Text>
        </Pressable>
        <Text style={st.time} allowFontScaling>{vTime}</Text>
      </View>

      <View style={[st.banner, { backgroundColor: meta.tint }]}>
        <View style={st.bannerTop}>
          <View style={[st.chip, { backgroundColor: meta.bg }]}>
            <meta.Icon size={15} color="#fff" strokeWidth={2.6} />
          </View>
          <Text style={[st.kicker, { color: meta.ink }]} allowFontScaling>Our answer</Text>
        </View>
        <Text style={[st.word, { color: meta.ink }]} allowFontScaling>{meta.word}</Text>
        <Text style={[st.line, { color: meta.ink }]} allowFontScaling>{meta.line}</Text>
      </View>

      <View style={st.section}>
        <Text style={st.sectionLabel} allowFontScaling>What to do</Text>
        <Text style={st.step} allowFontScaling>{v.safeStep}</Text>
      </View>

      <Pressable style={st.whyRow} onPress={() => setWhy(!why)} accessibilityRole="button">
        <Text style={st.whyLabel} allowFontScaling>{why ? 'Hide the reasons' : 'Why we say that'}</Text>
        <View style={st.whyRight}>
          <Text style={st.whyCount} allowFontScaling>{signals.length}{signals.length === 1 ? ' reason' : ' reasons'}</Text>
          {why ? <ChevronUp size={16} color={T.green} strokeWidth={2.2} /> : <ChevronDown size={16} color={T.green} strokeWidth={2.2} />}
        </View>
      </Pressable>
      {why && (
        <KFFade duration={200} style={st.signals} playKey={why}>
          {signals.map((sig, i) => (
            <KFSlide key={i} duration={300} delay={i * 40} playKey={why} style={[st.sigRow, i === 0 && { borderTopWidth: 0 }]}>
              <Text style={[st.sigNum, { color: meta.bg }]} allowFontScaling>{i + 1}</Text>
              <Text style={st.sigText} allowFontScaling>{sig}</Text>
            </KFSlide>
          ))}
        </KFFade>
      )}

      {!!ctx.note && !careMode && (
        <KFIn duration={300} style={st.noteWrap} playKey={ctx.note.text}>
          <View style={st.noteHead}>
            <View style={st.noteAvatar}><Text style={st.noteAvatarText} allowFontScaling>{ctx.note.from.slice(0, 1)}</Text></View>
            <Text style={st.noteFrom} allowFontScaling>{ctx.note.from} · trusted contact</Text>
          </View>
          <View style={st.noteCard}><Text style={st.noteText} allowFontScaling>{ctx.note.text}</Text></View>
        </KFIn>
      )}

      <View style={st.section}>
        <Text style={st.sectionLabel} allowFontScaling>Message checked</Text>
        <View style={st.msgRow}>
          <View style={st.msgRule} />
          <Text style={st.msgText} allowFontScaling>{ctx.msg}</Text>
        </View>
      </View>

      <View style={st.actions}>
        <Pressable style={st.loopBtn} onPress={loopIn} accessibilityRole="button">
          <View style={{ flex: 1 }}>
            <Text style={st.loopTitle} allowFontScaling>
              {careMode ? 'Warn ' + (ctx.settings.watching?.name?.split(' ')[0] || 'them') + ' about this' : 'Loop in ' + (first ? first.name.split(' ')[0] : 'someone')}
            </Text>
            <Text style={st.loopSub} allowFontScaling>
              {careMode ? 'Send it to their phone so they know to expect it' : 'Tell your trusted contact what arrived'}
            </Text>
          </View>
          <UserCheck size={20} color="#fff" strokeWidth={1.9} />
        </Pressable>

        {!careMode && !reading && (
          <Pressable style={st.readBtn} onPress={startRead} accessibilityRole="button">
            <Text style={st.readLabel} allowFontScaling>Read this to me, slowly</Text>
            <ChevronRight size={16} color={T.muted} strokeWidth={2.2} />
          </Pressable>
        )}
        {reading && (
          <View style={st.readPanel}>
            <View style={st.readHead}>
              <View style={st.readMeter}>
                <View style={st.bars}>
                  {[9, 14, 6, 12].map((h, i) => <View key={i} style={[st.bar, { height: h }]} />)}
                </View>
                <Text style={[st.readCaption, { color: onFlag ? T.red : T.green }]} allowFontScaling>
                  {onFlag ? 'This is the part that pushes you' : 'Reading it out'}
                </Text>
              </View>
              <Pressable style={st.speedChip} onPress={() => { slowRef.current = !slowRef.current; setReadSlow(slowRef.current); }} accessibilityRole="button">
                <Text style={st.speedText} allowFontScaling>{readSlow ? 'Slower' : 'Normal'}</Text>
              </Pressable>
            </View>
            <Text style={st.tokens} allowFontScaling>
              {toks.map((t, i) => (
                <Text key={i} style={{
                  color: i === readIdx ? (t.flag ? T.red : T.ink) : i < readIdx ? T.ink : T.muted,
                  fontFamily: t.flag && i <= readIdx ? F.display : F.body,
                  backgroundColor: i === readIdx ? (t.flag ? T.redTint : T.greenTint) : 'transparent',
                }}>{t.w} </Text>
              ))}
            </Text>
            <Pressable onPress={stopRead} accessibilityRole="button" style={{ marginTop: 10 }}>
              <Text style={st.stopText} allowFontScaling>Stop reading</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={st.footer}>
        <Pressable style={st.footBtn} onPress={() => ctx.go('home')} accessibilityRole="button">
          <Text style={st.footText} allowFontScaling>Check another message</Text>
          <ArrowRight size={16} color={T.green} strokeWidth={2.2} />
        </Pressable>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingHorizontal: 16, paddingBottom: 12 },
  back: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 },
  backText: { fontSize: 15, fontFamily: F.medium, color: T.ink },
  time: { fontSize: 12.5, fontFamily: F.body, color: T.sub, paddingRight: 4 },

  banner: { marginHorizontal: 20, borderRadius: 14, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  chip: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 12.5, fontFamily: F.semibold },
  word: { fontSize: 32, fontFamily: F.display, letterSpacing: -0.83, marginTop: 12, lineHeight: 33 },
  line: { fontSize: 16, fontFamily: F.medium, marginTop: 6, lineHeight: 22 },

  section: { paddingHorizontal: 20, paddingTop: 22 },
  sectionLabel: { fontSize: 12.5, fontFamily: F.semibold, color: T.sub },
  step: { fontSize: 19, fontFamily: F.semibold, color: T.ink, marginTop: 7, lineHeight: 26.6 },

  whyRow: {
    marginHorizontal: 20, marginTop: 16, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.hairline,
  },
  whyLabel: { fontSize: 15, fontFamily: F.semibold, color: T.green },
  whyRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whyCount: { fontSize: 13, fontFamily: F.body, color: T.sub },
  signals: { paddingHorizontal: 20, paddingTop: 6 },
  sigRow: { flexDirection: 'row', gap: 11, paddingVertical: 11, borderTopWidth: 1, borderTopColor: T.divider },
  sigNum: { fontSize: 13, fontFamily: F.semibold, width: 12, paddingTop: 1 },
  sigText: { flex: 1, fontSize: 14.5, fontFamily: F.body, color: T.ink2, lineHeight: 21.75 },

  noteWrap: { paddingHorizontal: 20, paddingTop: 22 },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  noteAvatarText: { color: '#fff', fontSize: 10, fontFamily: F.semibold },
  noteFrom: { fontSize: 12.5, fontFamily: F.semibold, color: T.green },
  noteCard: { marginTop: 8, backgroundColor: T.greenTint, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  noteText: { fontSize: 15, fontFamily: F.body, color: T.greenInk2, lineHeight: 22.5 },

  msgRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  msgRule: { width: 3, borderRadius: 2, backgroundColor: T.fieldBorder },
  msgText: { flex: 1, fontSize: 15, fontFamily: F.body, color: T.ink2, lineHeight: 23.25 },

  actions: { paddingHorizontal: 20, paddingTop: 24, gap: 9 },
  loopBtn: { height: 62, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, gap: 10 },
  loopTitle: { fontSize: 16, fontFamily: F.bold, color: '#fff' },
  loopSub: { fontSize: 12.5, fontFamily: F.body, color: 'rgba(255,255,255,.78)', marginTop: 2 },
  readBtn: {
    height: 52, borderRadius: 12, borderWidth: 1, borderColor: T.hairline, backgroundColor: T.surface,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
  },
  readLabel: { fontSize: 15, fontFamily: F.semibold, color: T.ink },
  readPanel: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 12, paddingHorizontal: 15, paddingTop: 14, paddingBottom: 16 },
  readHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 11 },
  readMeter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14 },
  bar: { width: 3, borderRadius: 2, backgroundColor: T.green },
  readCaption: { fontSize: 12.5, fontFamily: F.semibold },
  speedChip: { borderWidth: 1, borderColor: T.hairline, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  speedText: { fontSize: 11.5, fontFamily: F.semibold, color: T.sub },
  tokens: { fontSize: 16, lineHeight: 29.6, fontFamily: F.body },
  stopText: { fontSize: 13.5, fontFamily: F.semibold, color: T.sub },

  footer: { marginHorizontal: 20, marginTop: 28, borderTopWidth: 1, borderTopColor: T.hairline, paddingTop: 18, alignItems: 'center' },
  footBtn: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  footText: { fontSize: 14.5, fontFamily: F.semibold, color: T.green },
});
