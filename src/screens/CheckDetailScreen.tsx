// One check, in full. Both sides use this screen:
//  • caretaker, on an "ask" from family → evidence + playbook + one-tap answers
//  • elder, when a family answer arrives → the answer, big and clear
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CircleCheck, MessageCircleWarning, Phone, ShieldQuestion } from 'lucide-react-native';
import { T, LEVEL_META } from '../theme';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Screen from '../ui/Screen';
import VerdictMark from '../ui/VerdictMark';
import { entriesFor } from '../lib/playbook';
import { replyText, sendSms } from '../lib/familyLink';
import { updateCheck, CheckRecord, FamilyReply } from '../lib/history';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

export default function CheckDetailScreen(props: {
  record: CheckRecord;
  settings: Settings; update: (s: Settings) => void; go: (r: Route) => void;
}) {
  const [rec, setRec] = useState(props.record);
  const st = props.settings;
  const isCare = st.role === 'caretaker';
  const m = LEVEL_META[rec.level];
  const playbook = entriesFor(rec.tags);

  const respond = async (verdict: FamilyReply['verdict']) => {
    const reply: FamilyReply = { by: st.myName || 'Family', verdict, at: Date.now() };
    const updated = (await updateCheck(rec.id, { reply })) || { ...rec, reply };
    setRec(updated);
    const phone = st.watching?.phone || null;
    await sendSms(phone, replyText(st.myName, rec, verdict));
  };

  return (
    <Screen onBack={() => props.go({ name: 'home' })} title={rec.from ? `From ${rec.from}` : 'Saved check'}>
      <VerdictMark level={rec.level} />
      <Text style={s.line} allowFontScaling>{m.line}</Text>

      <Card>
        <Text style={s.label} allowFontScaling>The message</Text>
        <Text style={s.excerpt} allowFontScaling>“{rec.excerpt}”</Text>
        <Text style={s.reason} allowFontScaling>{rec.reason}</Text>
      </Card>

      {rec.reply ? (
        <Card tone={rec.reply.verdict === 'safe' ? 'green' : rec.reply.verdict === 'scam' ? 'red' : 'amber'}>
          <Text style={s.label} allowFontScaling>{rec.reply.by} answered</Text>
          <Text style={s.replyBig} allowFontScaling>
            {rec.reply.verdict === 'scam' ? 'This is a scam. Don’t reply to it, and don’t send anything.'
              : rec.reply.verdict === 'safe' ? 'This one looks okay.'
              : 'Let’s talk before you do anything — call when you can.'}
          </Text>
        </Card>
      ) : isCare && rec.source === 'family' ? (
        <>
          <Text style={s.section} allowFontScaling>Your answer — one tap, sent by text</Text>
          <Button label="It’s a scam — don’t touch it" kind="danger" icon={MessageCircleWarning} onPress={() => respond('scam')} />
          <Button label="It looks okay to me" kind="success" icon={CircleCheck} onPress={() => respond('safe')} />
          <Button label="Call me first" kind="secondary" icon={Phone} onPress={() => respond('call')} />
        </>
      ) : null}

      {isCare && playbook.length > 0 && (
        <>
          <Text style={s.section} allowFontScaling>What’s going on here</Text>
          {playbook.map(p => (
            <Card key={p.tag}>
              <Text style={s.pbTitle} allowFontScaling>{p.title}</Text>
              <Text style={s.pbBody} allowFontScaling>{p.what}</Text>
              <Text style={s.pbWhy} allowFontScaling>Why it works: {p.why}</Text>
              <View style={s.sayBox}>
                <Text style={s.sayLabel} allowFontScaling>Words that help</Text>
                <Text style={s.sayText} allowFontScaling>{p.say}</Text>
              </View>
            </Card>
          ))}
        </>
      )}

      {isCare && playbook.length === 0 && rec.level !== 'green' && (
        <Card>
          <View style={s.noteRow}>
            <ShieldQuestion size={20} color={T.inkSoft} />
            <Text style={s.pbBody} allowFontScaling>
              The full signal list is on their phone under “Show me why.” If in doubt, the safest answer is “Call me first.”
            </Text>
          </View>
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  line: { fontSize: T.title, fontWeight: '800', color: T.ink, textAlign: 'center', letterSpacing: -0.3, marginBottom: 8 },
  label: { fontSize: T.caption, fontWeight: '800', color: T.inkSoft, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  excerpt: { fontSize: T.small, color: T.inkSoft, fontStyle: 'italic', lineHeight: 24, marginBottom: 10 },
  reason: { fontSize: T.body, color: T.ink, lineHeight: 27 },
  replyBig: { fontSize: T.bodyLg, fontWeight: '700', color: T.ink, lineHeight: 30 },
  section: {
    fontSize: T.caption, fontWeight: '800', color: T.inkSoft, textTransform: 'uppercase',
    letterSpacing: 0.8, marginTop: 16, marginBottom: 4,
  },
  pbTitle: { fontSize: T.body, fontWeight: '800', color: T.ink, marginBottom: 6 },
  pbBody: { flex: 1, fontSize: T.small, color: T.ink, lineHeight: 25, marginBottom: 6 },
  pbWhy: { fontSize: T.small, color: T.inkSoft, lineHeight: 24, marginBottom: 10 },
  sayBox: { backgroundColor: T.accentSoft, borderRadius: T.radiusSm, padding: 12 },
  sayLabel: { fontSize: T.caption, fontWeight: '800', color: T.accentDeep, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  sayText: { fontSize: T.small, color: T.ink, lineHeight: 24 },
  noteRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
});
