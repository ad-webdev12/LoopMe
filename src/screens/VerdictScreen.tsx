// Verdict — Design 4. One tinted answer, one thing to do, a plain "show me why",
// and one green tap to loop in family. The AI tier that answered is named
// honestly. Never makes checking feel foolish.
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  OctagonX, TriangleAlert, CircleCheck, ChevronDown, ChevronUp,
  Volume2, UserPlus, Sparkles, Cpu,
} from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { T, F } from '../theme';
import Screen from '../ui/Screen';
import Entrance from '../ui/Entrance';
import { readAloud, stopReading } from '../lib/speech';
import { askText, sendSms } from '../lib/familyLink';
import { listChecks, updateCheck } from '../lib/history';
import type { FusedVerdict } from '../engine/ai';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

const CONF: Record<string, string> = {
  very: 'We are very sure about this.',
  fairly: 'We are fairly sure about this.',
  unsure: 'We are not certain — this one is worth a second opinion.',
};

const TONE = {
  red:   { tint: T.redSoft,   chip: T.red,   ink: T.redText,   Icon: OctagonX,      word: 'Stop',       line: 'This looks like a scam.' },
  amber: { tint: T.amberSoft, chip: T.amber, ink: T.amberText, Icon: TriangleAlert, word: 'Be careful', line: 'This might not be safe.' },
  green: { tint: T.greenSoft, chip: T.green, ink: T.greenText, Icon: CircleCheck,   word: 'Looks okay', line: 'This looks okay.' },
} as const;

export default function VerdictScreen(props: {
  message: string; verdict: FusedVerdict; recordId: string;
  settings: Settings; update: (st: Settings) => void; go: (r: Route) => void;
}) {
  const { verdict: v, message } = props;
  const [why, setWhy] = useState(false);
  const [asked, setAsked] = useState(false);
  const [reading, setReading] = useState(false);
  const tone = TONE[v.level];

  const speech = `${tone.word}. ${v.reason} ${CONF[v.confidence]} Here is what to do: ${v.safeStep}`;
  useEffect(() => { if (props.settings.readAloud) { setReading(true); readAloud(speech, () => setReading(false)); } return () => stopReading(); }, []);

  const toggleRead = () => {
    if (reading) { stopReading(); setReading(false); }
    else { setReading(true); readAloud(speech, () => setReading(false)); }
  };

  const askFamily = async () => {
    const person = props.settings.trusted[0] || null;
    if (!person) { props.go({ name: 'circle' }); return; }
    const rec = (await listChecks()).find(r => r.id === props.recordId);
    if (!rec) return;
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
    Alert.alert('Thanks for telling us', 'Should we treat this sender as safe from now on?', [
      { text: 'No, just this once', style: 'cancel' },
      { text: 'Yes, always safe', onPress: () => {
        const key = message.trim().slice(0, 40);
        props.update({ ...props.settings, allowlist: [...props.settings.allowlist, key] });
      }},
    ]);
  };

  const signals = v.signals.length ? v.signals : [v.reason];
  const first = props.settings.trusted[0]?.name.split(' ')[0];
  const aiLine = v.aiTier === 'foundation' ? 'Checked with Apple Intelligence, on your phone'
    : v.aiTier === 'coreml' ? 'Checked by the on-device model'
    : null;

  return (
    <Screen onBack={() => props.go({ name: 'home' })} right={aiLine ? undefined : undefined}>
      {/* tinted answer banner */}
      <Entrance index={0}>
        <View style={[s.banner, { backgroundColor: tone.tint }]}>
          <View style={s.bannerTop}>
            <View style={[s.chip, { backgroundColor: tone.chip }]}>
              <tone.Icon size={15} color="#fff" strokeWidth={2.6} />
            </View>
            <Text style={[s.answerLabel, { color: tone.ink }]} allowFontScaling>Our answer</Text>
          </View>
          <Text style={[s.word, { color: tone.ink }]} allowFontScaling>{tone.word}</Text>
          <Text style={[s.line, { color: T.ink }]} allowFontScaling>{v.reason}</Text>
          {aiLine && (
            <View style={s.aiRow}>
              {v.aiTier === 'foundation' ? <Sparkles size={13} color={tone.ink} strokeWidth={2} /> : <Cpu size={13} color={tone.ink} strokeWidth={2} />}
              <Text style={[s.aiText, { color: tone.ink }]} allowFontScaling>{aiLine}</Text>
            </View>
          )}
        </View>
      </Entrance>

      {v.codeWordMoment && (
        <Entrance index={1}>
          <View style={s.note}>
            <Text style={s.noteText} allowFontScaling>
              {props.settings.codeWordSet
                ? 'If someone claims to be family, ask them for your code word first. A copied voice can’t know it.'
                : 'A copied voice can sound exactly like family. A family code word catches this — it takes a minute.'}
            </Text>
            {!props.settings.codeWordSet && (
              <Pressable onPress={() => props.go({ name: 'codeword' })}><Text style={s.noteLink} allowFontScaling>Set up our code word →</Text></Pressable>
            )}
          </View>
        </Entrance>
      )}

      {/* what to do */}
      <Entrance index={1}>
        <Text style={s.kicker} allowFontScaling>What to do</Text>
        <Text style={s.step} allowFontScaling>{v.safeStep}</Text>
      </Entrance>

      {/* show me why */}
      <Pressable style={s.whyToggle} onPress={() => setWhy(!why)} accessibilityRole="button">
        <Text style={s.whyLabel} allowFontScaling>{why ? 'Hide the reasons' : 'Show me why'}</Text>
        <View style={s.whyRight}>
          <Text style={s.whyCount} allowFontScaling>{signals.length} {signals.length === 1 ? 'sign' : 'signs'}</Text>
          {why ? <ChevronUp size={16} color={T.green} strokeWidth={2.2} /> : <ChevronDown size={16} color={T.green} strokeWidth={2.2} />}
        </View>
      </Pressable>
      {why && (
        <View style={s.signals}>
          {signals.map((sig, i) => (
            <View key={i} style={[s.sigRow, i === 0 && { borderTopWidth: 0 }]}>
              <Text style={[s.sigNum, { color: tone.chip }]} allowFontScaling>{i + 1}</Text>
              <Text style={s.sigText} allowFontScaling>{sig}</Text>
            </View>
          ))}
        </View>
      )}

      {/* message checked */}
      <Text style={[s.kicker, { marginTop: 22 }]} allowFontScaling>Message checked</Text>
      <View style={s.msgRow}>
        <View style={s.msgRule} />
        <Text style={s.msgText} allowFontScaling>{message}</Text>
      </View>

      {/* actions */}
      <View style={s.actions}>
        {asked ? (
          <View style={[s.banner, { backgroundColor: T.greenSoft, marginHorizontal: 0 }]}>
            <Text style={[s.noteText, { color: T.greenInk }]} allowFontScaling>
              Sent. Your check is saved here — when {first || 'your family'} answers, it appears right on this phone.
            </Text>
          </View>
        ) : (
          <Pressable style={s.loopBtn} onPress={askFamily} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={s.loopTitle} allowFontScaling>{first ? `Ask ${first} to look` : 'Ask my family to look'}</Text>
              <Text style={s.loopSub} allowFontScaling>They get an ordinary text. One tap.</Text>
            </View>
            <UserPlus size={20} color="#fff" strokeWidth={1.9} />
          </Pressable>
        )}

        <Pressable style={s.readBtn} onPress={toggleRead} accessibilityRole="button">
          <Volume2 size={18} color={T.green} strokeWidth={1.9} />
          <Text style={s.readText} allowFontScaling>{reading ? 'Stop reading' : 'Read it to me'}</Text>
        </Pressable>
      </View>

      <View style={s.footer}>
        <Pressable onPress={() => props.go({ name: 'home' })} accessibilityRole="button">
          <Text style={s.footLink} allowFontScaling>Check another message  →</Text>
        </Pressable>
        {v.level !== 'green' && (
          <Pressable onPress={disagree} accessibilityRole="button" style={{ marginTop: 12 }}>
            <Text style={s.footQuiet} allowFontScaling>I think you’re wrong about this</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  banner: { marginHorizontal: 0, backgroundColor: T.greenSoft, borderRadius: T.radius, padding: 18, marginTop: 2 },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  chip: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  answerLabel: { fontSize: T.caption, fontFamily: F.semibold },
  word: { fontSize: 32, fontFamily: F.display, letterSpacing: -0.7, marginTop: 12 },
  line: { fontSize: T.bodyLg, fontFamily: F.medium, marginTop: 6, lineHeight: 23 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  aiText: { fontSize: T.caption, fontFamily: F.medium, opacity: 0.9 },

  note: { backgroundColor: T.amberSoft, borderRadius: T.radiusSm, padding: 14, marginTop: 12 },
  noteText: { fontSize: T.body, fontFamily: F.medium, color: T.ink, lineHeight: 23 },
  noteLink: { fontSize: T.body, fontFamily: F.bold, color: T.amberText, marginTop: 8 },

  kicker: { fontSize: T.caption, fontFamily: F.semibold, color: T.inkSoft, marginTop: 22 },
  step: { fontSize: T.title, fontFamily: F.semibold, color: T.ink, marginTop: 7, lineHeight: 27 },

  whyToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.hairline,
    paddingVertical: 14, marginTop: 18,
  },
  whyLabel: { fontSize: T.label, fontFamily: F.semibold, color: T.green },
  whyRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whyCount: { fontSize: T.small, fontFamily: F.body, color: T.inkSoft },
  signals: { paddingTop: 4 },
  sigRow: { flexDirection: 'row', gap: 11, paddingVertical: 11, borderTopWidth: 1, borderTopColor: T.hairline2 },
  sigNum: { fontSize: 13, fontFamily: F.bold, width: 14, paddingTop: 1 },
  sigText: { flex: 1, fontSize: T.small, fontFamily: F.body, color: T.ink2, lineHeight: 21 },

  msgRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  msgRule: { width: 3, borderRadius: 2, backgroundColor: T.hairline },
  msgText: { flex: 1, fontSize: T.label, fontFamily: F.body, color: T.ink2, lineHeight: 24 },

  actions: { marginTop: 22, gap: 9 },
  loopBtn: {
    minHeight: 62, borderRadius: T.radiusSm, backgroundColor: T.green,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, gap: 12,
  },
  loopTitle: { fontSize: T.body, fontFamily: F.bold, color: '#fff' },
  loopSub: { fontSize: T.caption, fontFamily: F.body, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  readBtn: {
    minHeight: 52, borderRadius: T.radiusSm, borderWidth: 1, borderColor: T.hairline, backgroundColor: T.card,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  readText: { fontSize: T.label, fontFamily: F.semibold, color: T.ink },

  footer: { marginTop: 26, borderTopWidth: 1, borderTopColor: T.hairline, paddingTop: 18, alignItems: 'center', paddingBottom: 24 },
  footLink: { fontSize: T.label, fontFamily: F.semibold, color: T.green },
  footQuiet: { fontSize: T.small, fontFamily: F.body, color: T.inkSoft },
});
