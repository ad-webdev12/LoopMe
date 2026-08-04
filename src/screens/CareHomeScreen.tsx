// Caretaker home: the person you look out for, anything waiting for an answer,
// and the running history of checks — newest first, one glance to triage.
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  BookOpen, ChevronRight, HeartHandshake, Link2, Phone,
  Settings as SettingsIcon, ShieldCheck, Inbox,
} from 'lucide-react-native';
import { T, SHADOW } from '../theme';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Screen from '../ui/Screen';
import { listChecks, CheckRecord } from '../lib/history';
import { pairText, sendSms } from '../lib/familyLink';
import { callPerson } from '../lib/loopIn';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

function timeAgo(ts: number): string {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export default function CareHomeScreen(props: {
  settings: Settings; update: (s: Settings) => void; go: (r: Route) => void;
  onCheck: (m: string) => void;
}) {
  const [history, setHistory] = useState<CheckRecord[]>([]);
  const [text, setText] = useState('');
  const st = props.settings;

  const refresh = useCallback(() => { listChecks().then(setHistory); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const pending = history.filter(r => r.source === 'family' && !r.reply);
  const answered = history.filter(r => !(r.source === 'family' && !r.reply));

  const Row = ({ rec }: { rec: CheckRecord }) => (
    <Pressable
      style={s.row}
      onPress={() => props.go({ name: 'detail', record: rec })}
      accessibilityRole="button"
      accessibilityLabel={`Check from ${rec.from || 'this phone'}, ${rec.level}`}>
      <View style={{ flex: 1 }}>
        <View style={s.rowTop}>
          <Badge level={rec.level} />
          <Text style={s.rowWhen} allowFontScaling>{timeAgo(rec.at)}</Text>
        </View>
        <Text style={s.rowExcerpt} allowFontScaling numberOfLines={2}>“{rec.excerpt}”</Text>
        <Text style={s.rowMeta} allowFontScaling>
          {rec.source === 'family' ? `From ${rec.from || 'family'}` : 'Checked on this phone'}
          {rec.reply ? ` · answered: ${rec.reply.verdict === 'scam' ? 'scam' : rec.reply.verdict === 'safe' ? 'looks okay' : 'call me'}` : rec.source === 'family' ? ' · waiting for your answer' : ''}
        </Text>
      </View>
      <ChevronRight size={20} color={T.inkFaint} />
    </Pressable>
  );

  return (
    <Screen>
      <View style={s.head}>
        <Text style={s.brand} allowFontScaling>Loop Me In</Text>
        <Text style={s.sub} allowFontScaling>The family side. You see what they check — and they hear back from you.</Text>
      </View>

      {st.watching ? (
        <Card style={s.person}>
          <View style={s.personRow}>
            <HeartHandshake size={26} color={T.accent} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={s.personName} allowFontScaling>{st.watching.name}</Text>
              <Text style={s.personSub} allowFontScaling>You’re in their trusted circle</Text>
            </View>
            <Button label="Call" size="compact" kind="secondary" icon={Phone} onPress={() => callPerson(st.watching!)} />
          </View>
        </Card>
      ) : (
        <Card tone="accent">
          <Text style={s.linkTitle} allowFontScaling>Link with the person you look out for</Text>
          <Text style={s.linkBody} allowFontScaling>
            Send them a link by text. When they tap it, this phone joins their trusted circle — their checks reach you with one tap, and your answers come straight back.
          </Text>
          <Button label="Send the link" icon={Link2}
            onPress={() => sendSms(null, pairText(st.myName, ''))} />
        </Card>
      )}

      {pending.length > 0 && (
        <>
          <Text style={s.section} allowFontScaling>Waiting for your answer</Text>
          {pending.map(rec => <Row key={rec.id} rec={rec} />)}
        </>
      )}

      <Text style={s.section} allowFontScaling>Recent checks</Text>
      {answered.length === 0 && pending.length === 0 && (
        <Card>
          <View style={s.emptyRow}>
            <Inbox size={22} color={T.inkFaint} />
            <Text style={s.empty} allowFontScaling>
              Nothing yet. When {st.watching?.name || 'they'} check a message and ask for your opinion, it lands here.
            </Text>
          </View>
        </Card>
      )}
      {answered.slice(0, 20).map(rec => <Row key={rec.id} rec={rec} />)}

      <Text style={s.section} allowFontScaling>Check something yourself</Text>
      <View style={s.panel}>
        <TextInput
          style={s.box} multiline
          placeholder="Paste a message they forwarded you"
          placeholderTextColor={T.inkFaint}
          value={text} onChangeText={setText}
          accessibilityLabel="Message to check"
        />
        <Button label="Check it" onPress={() => text.trim() && props.onCheck(text)} />
      </View>

      <View style={s.footer}>
        <Pressable style={s.footBtn} onPress={() => props.go({ name: 'careguide' })} accessibilityRole="button">
          <BookOpen size={18} color={T.inkSoft} /><Text style={s.footText} allowFontScaling>Playbook</Text>
        </Pressable>
        <Pressable style={s.footBtn} onPress={() => props.go({ name: 'trust' })} accessibilityRole="button">
          <ShieldCheck size={18} color={T.inkSoft} /><Text style={s.footText} allowFontScaling>Our promise</Text>
        </Pressable>
        <Pressable style={s.footBtn} onPress={() => props.go({ name: 'settings' })} accessibilityRole="button">
          <SettingsIcon size={18} color={T.inkSoft} /><Text style={s.footText} allowFontScaling>Settings</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { marginTop: 18, marginBottom: 12 },
  brand: { fontSize: T.headline, fontWeight: '800', color: T.ink, textAlign: 'center', letterSpacing: -0.6 },
  sub: { fontSize: T.small, color: T.inkSoft, textAlign: 'center', marginTop: 6, lineHeight: 24 },
  person: { paddingVertical: 14 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personName: { fontSize: T.bodyLg, fontWeight: '800', color: T.ink },
  personSub: { fontSize: T.caption, color: T.inkSoft, marginTop: 2 },
  linkTitle: { fontSize: T.body, fontWeight: '800', color: T.accentDeep },
  linkBody: { fontSize: T.small, color: T.inkSoft, lineHeight: 24, marginVertical: 8 },
  section: {
    fontSize: T.caption, fontWeight: '800', color: T.inkSoft, textTransform: 'uppercase',
    letterSpacing: 0.8, marginTop: 18, marginBottom: 6,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.card, borderRadius: T.radius, borderWidth: 1, borderColor: T.hairline,
    padding: 14, marginVertical: 4, ...SHADOW,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowWhen: { fontSize: T.caption, color: T.inkFaint },
  rowExcerpt: { fontSize: T.small, color: T.ink, lineHeight: 23, marginTop: 7 },
  rowMeta: { fontSize: T.caption, color: T.inkSoft, marginTop: 6 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  empty: { flex: 1, fontSize: T.small, color: T.inkSoft, lineHeight: 24 },
  panel: {
    backgroundColor: T.card, borderRadius: T.radiusLg, borderWidth: 1, borderColor: T.hairline,
    padding: 14, marginVertical: 4, ...SHADOW,
  },
  box: { minHeight: 96, padding: 8, fontSize: T.body, color: T.ink, textAlignVertical: 'top', lineHeight: 26 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 18 },
  footBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  footText: { fontSize: T.caption, color: T.inkSoft, fontWeight: '600' },
});
