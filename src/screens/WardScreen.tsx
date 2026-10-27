// Caretaker, activity. Header with avatar/status/call, three stats, the one
// that needs a word, the activity list, privacy limits, stop row. Fed from
// the checks that arrived over the family link (history records with source
// 'family'), with the notes under each one.
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Shield, Phone, OctagonX, Info, ArrowRight } from 'lucide-react-native';
import { T, F, LEVEL_META } from '../theme';
import { KFIn } from '../ui/kf';
import { timeLabel } from '../lib/clock';
import type { Ctx } from '../App';

function ago(at: number): string {
  const d = new Date(at), now = new Date();
  if (d.toDateString() === now.toDateString()) return timeLabel(d);
  if (d.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long' });
}

export default function WardScreen({ ctx }: { ctx: Ctx }) {
  const watch = ctx.settings.watching;
  const watchName = watch?.name?.split(' ')[0] || 'Family';
  const full = watch?.name || 'Family';
  const initials = full.split(' ').map(w => w[0]).join('').slice(0, 2);
  const ward = ctx.hist.filter(h => h.source === 'family');
  const checked = ward.length;
  const stopped = ward.filter(w => w.level === 'red').length;
  const notes = ward.reduce((n, w) => n + (w.notes || []).filter(x => x.mine).length, 0);
  const needsYou = ward.find(w => !(w.notes || []).some(n => n.mine) && Date.now() - w.at < 48 * 3600 * 1000);
  const status = ward.length ? 'Linked, last alert ' + ago(ward[0].at) : 'Linked and quiet';

  const call = () => {
    if (watch?.phone) Linking.openURL('tel:' + watch.phone.replace(/[^\d+]/g, '')).catch(() => {});
    else ctx.go('watch');
  };

  return (
    <KFIn duration={240} style={{ flex: 1 }} playKey="ward">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={st.brandRow}>
        <View style={st.brand}>
          <Shield size={17} color={T.green} strokeWidth={2} />
          <Text style={st.brandText} allowFontScaling>LOOP ME</Text>
        </View>
        <Text style={st.roleTag} allowFontScaling>LOOKING AFTER</Text>
      </View>

      <View style={st.head}>
        <View style={st.avatar}><Text style={st.avatarText} allowFontScaling>{initials}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={st.name} allowFontScaling>{full}</Text>
          <View style={st.statusRow}>
            <View style={st.dot} />
            <Text style={st.status} allowFontScaling>{status}</Text>
          </View>
        </View>
        <Pressable style={st.callBtn} onPress={call} accessibilityRole="button" accessibilityLabel={'Call ' + watchName}>
          <Phone size={19} color="#fff" strokeWidth={1.9} />
        </Pressable>
      </View>

      <View style={st.stats}>
        <View style={[st.stat, st.statB]}><Text style={st.statNum} allowFontScaling>{checked}</Text><Text style={st.statLabel} allowFontScaling>Flagged</Text></View>
        <View style={[st.stat, st.statB]}><Text style={[st.statNum, { color: T.red }]} allowFontScaling>{stopped}</Text><Text style={st.statLabel} allowFontScaling>Scams</Text></View>
        <View style={st.stat}><Text style={[st.statNum, { color: T.green }]} allowFontScaling>{notes}</Text><Text style={st.statLabel} allowFontScaling>Your replies</Text></View>
      </View>

      {needsYou && (
        <View>
          <Text style={st.section} allowFontScaling>Worth a word</Text>
          <Pressable style={[st.needCard, needsYou.level === 'amber' && { backgroundColor: T.amberTint }]} onPress={() => ctx.openFamilyAlert(needsYou.id)} accessibilityRole="button">
            <View style={[st.needIcon, needsYou.level === 'amber' && { backgroundColor: T.amber }]}>
              {needsYou.level === 'amber' ? <Info size={16} color="#fff" strokeWidth={2.4} /> : <OctagonX size={16} color="#fff" strokeWidth={2.4} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.needTitle, needsYou.level === 'amber' && { color: T.amberInk }]} allowFontScaling>{needsYou.level === 'red' ? 'Scam text stopped' : 'Text worth a second look'}</Text>
              <Text style={[st.needMeta, needsYou.level === 'amber' && { color: T.amberInk }]} allowFontScaling>{ago(needsYou.at)}, from {needsYou.sender || 'an unknown number'}. {watchName} has been told what to do.</Text>
              <View style={st.needLink}>
                <Text style={[st.needLinkText, needsYou.level === 'amber' && { color: T.amberInk }]} allowFontScaling>Reply in one tap</Text>
                <ArrowRight size={14} color={needsYou.level === 'amber' ? T.amberInk : T.redInk} strokeWidth={2.4} />
              </View>
            </View>
          </Pressable>
        </View>
      )}

      <Text style={st.section} allowFontScaling>Activity</Text>
      {ward.length === 0 ? (
        <View style={st.quietCard}>
          <Text style={st.quietTitle} allowFontScaling>Quiet so far</Text>
          <Text style={st.quietBody} allowFontScaling>You only hear from this phone when something on {watchName}’s looks wrong. When it does, it takes over this screen.</Text>
        </View>
      ) : (
        <View style={st.listCard}>
          {ward.map((w, i) => {
            const red = w.level === 'red';
            const M = LEVEL_META[w.level];
            const Icon = red ? OctagonX : Info;
            const mine = (w.notes || []).filter(n => n.mine);
            return (
              <Pressable key={w.id} style={[st.eventRow, i === ward.length - 1 && { borderBottomWidth: 0 }]} onPress={() => ctx.openWard(w.id)} accessibilityRole="button">
                <View style={[st.eventIcon, { backgroundColor: M.soft }]}>
                  <Icon size={15} color={M.color} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={st.eventTop}>
                    <Text style={st.eventTitle} allowFontScaling>{w.askedFamily ? watchName + ' asked you' : red ? 'Scam text stopped' : 'Text worth a second look'}</Text>
                    <Text style={st.eventWhen} allowFontScaling>{ago(w.at)}</Text>
                  </View>
                  <Text style={st.eventSnippet} allowFontScaling numberOfLines={2}>{w.excerpt}</Text>
                  <Text style={[st.eventStatus, { color: mine.length ? T.green : red ? T.red : T.amber }]} allowFontScaling>
                    {mine.length ? 'You replied: ' + mine[mine.length - 1].text.slice(0, 40) + (mine[mine.length - 1].text.length > 40 ? '…' : '') : 'No reply from you yet'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={st.privacy} allowFontScaling>You see flagged texts and the notes between you. Never {watchName}’s ordinary messages. It runs on {watchName}’s own iCloud, and either of you can end it.</Text>
      <Pressable style={{ paddingHorizontal: 20, paddingTop: 14 }} onPress={ctx.unlinkFamily} accessibilityRole="button">
        <Text style={st.stop} allowFontScaling>Stop looking after {watchName}</Text>
      </Pressable>
      <View style={{ height: 110 }} />
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 2 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandText: { fontSize: 13, fontFamily: F.bold, letterSpacing: 0.65, color: T.green },
  roleTag: { fontSize: 12, fontFamily: F.semibold, letterSpacing: 0.9, color: T.sub },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingHorizontal: 20, paddingTop: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 17, fontFamily: F.semibold },
  name: { fontSize: 23, fontFamily: F.display, letterSpacing: -0.4, color: T.ink, lineHeight: 26 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.green },
  status: { fontSize: 15, fontFamily: F.body, color: T.sub },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  stats: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 18, backgroundColor: T.surface,
    borderWidth: 1, borderColor: T.hairline, borderRadius: 14,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  stat: { flex: 1, paddingHorizontal: 15, paddingVertical: 14 },
  statB: { borderRightWidth: 1, borderRightColor: T.divider },
  statNum: { fontSize: 26, fontFamily: F.display, color: T.ink, lineHeight: 26 },
  statLabel: { fontSize: 13, fontFamily: F.semibold, color: T.sub, marginTop: 5 },
  section: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, fontSize: 14, fontFamily: F.semibold, color: T.sub },
  needCard: { marginHorizontal: 20, flexDirection: 'row', gap: 12, backgroundColor: T.redTint, borderRadius: 14, padding: 15 },
  needIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center' },
  needTitle: { fontSize: 17, fontFamily: F.bold, color: T.redInk },
  needMeta: { fontSize: 15, fontFamily: F.body, color: T.redInk, opacity: 0.85, lineHeight: 21, marginTop: 3 },
  needLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  needLinkText: { fontSize: 15, fontFamily: F.semibold, color: T.redInk },
  quietCard: {
    marginHorizontal: 20, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, padding: 17,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  quietTitle: { fontSize: 17, fontFamily: F.bold, color: T.ink },
  quietBody: { fontSize: 15.5, fontFamily: F.body, color: T.sub, lineHeight: 23, marginTop: 6 },
  listCard: {
    marginHorizontal: 20, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  eventRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 15, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.divider },
  eventIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  eventTitle: { flex: 1, fontSize: 16, fontFamily: F.semibold, color: T.ink },
  eventWhen: { fontSize: 13, fontFamily: F.body, color: T.sub },
  eventSnippet: { fontSize: 15, fontFamily: F.body, color: T.sub, lineHeight: 21, marginTop: 3 },
  eventStatus: { fontSize: 14, fontFamily: F.semibold, marginTop: 6 },
  privacy: { paddingHorizontal: 20, paddingTop: 16, fontSize: 14.5, fontFamily: F.body, color: T.sub, lineHeight: 21.5 },
  stop: { fontSize: 15.5, fontFamily: F.semibold, color: T.red },
});
