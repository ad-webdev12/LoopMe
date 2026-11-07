// Caretaker, the whole picture. Built from two things the other phone sends:
// the flagged checks (history records with source 'family', with the notes
// under each) and the weekly pulse (counts only, never message text). A quiet
// week is shown as a quiet week, with the numbers that prove it, and the
// protection checklist says plainly what is and is not switched on over there.
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Shield, Phone, OctagonX, Info, ArrowRight, Check, Minus, ChevronDown, ChevronUp, Ban } from 'lucide-react-native';
import { T, F, LEVEL_META } from '../theme';
import { KFIn } from '../ui/kf';
import { timeLabel } from '../lib/clock';
import { repeatSenders } from '../lib/family';
import type { Ctx } from '../App';

function ago(at: number): string {
  const d = new Date(at), now = new Date();
  if (d.toDateString() === now.toDateString()) return timeLabel(d);
  if (d.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return 'Yesterday';
  if (now.getTime() - at < 6 * 86400000) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function WardScreen({ ctx }: { ctx: Ctx }) {
  const [openStep, setOpenStep] = useState<string | null>(null);
  const watch = ctx.settings.watching;
  const watchName = watch?.name?.split(' ')[0] || 'Family';
  const full = watch?.name || 'Family';
  const initials = full.split(' ').map(w => w[0]).join('').slice(0, 2);
  const ward = ctx.hist.filter(h => h.source === 'family');
  const p = ctx.pulse;
  const needsYou = ward.find(w => !(w.notes || []).some(n => n.mine) && Date.now() - w.at < 48 * 3600 * 1000);
  const repeats = repeatSenders(ctx.hist);
  const weekWard = ward.filter(w => Date.now() - w.at < 7 * 86400000);

  const seen = p ? 'Last seen on Loop Me ' + ago(p.at).replace(/^(\d)/, 'at $1') : ward.length ? 'Linked, last alert ' + ago(ward[0].at) : 'Linked, waiting for the first update';
  const headline = !p ? 'Linked. The weekly picture arrives once ' + watchName + ' opens the app.'
    : p.checked7 === 0 ? 'A quiet week. No unknown texts reached ' + watchName + '.'
    : p.stopped7 === 0 && p.flagged7 === 0 ? p.checked7 + (p.checked7 === 1 ? ' text was checked' : ' texts were checked') + ' this week. All of them were fine.'
    : (p.stopped7 ? p.stopped7 + (p.stopped7 === 1 ? ' scam stopped' : ' scams stopped') : '') + (p.stopped7 && p.flagged7 ? ', ' : '') + (p.flagged7 ? p.flagged7 + ' worth a look' : '') + ' this week.';

  const call = () => {
    if (watch?.phone) Linking.openURL('tel:' + watch.phone.replace(/[^\d+]/g, '')).catch(() => {});
    else ctx.go('watch');
  };

  // What is switched on over there, and the words to say down the phone when it is not.
  const steps: { id: string; label: string; on: boolean | null; say: string }[] = [
    { id: 'filter', label: 'Text filter', on: p ? p.filterOn : null,
      say: 'Settings › Apps › Messages › Unknown & Junk › tap Loop Me.' },
    { id: 'calls', label: 'Call blocking', on: p ? p.callsOn : null,
      say: 'Settings › Apps › Phone › Call Blocking › switch Loop Me on.' },
    { id: 'notif', label: 'Notifications', on: p ? p.notifOn : null,
      say: 'Settings › Notifications › Loop Me › Allow.' },
  ];

  return (
    <KFIn duration={240} style={{ flex: 1 }} playKey="ward">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={st.brandRow}>
        <View style={st.brand}>
          <Shield size={17} color={T.green} strokeWidth={2} />
          <Text style={st.brandText} allowFontScaling>LOOP ME</Text>
        </View>
        <Text style={st.roleTag} allowFontScaling>Looking after</Text>
      </View>

      <View style={st.head}>
        <View style={st.avatar}><Text style={st.avatarText} allowFontScaling>{initials}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={st.name} allowFontScaling>{full}</Text>
          <View style={st.statusRow}>
            <View style={[st.dot, !p && { backgroundColor: T.amber }]} />
            <Text style={st.status} allowFontScaling>{seen}</Text>
          </View>
        </View>
        <Pressable style={st.callBtn} onPress={call} accessibilityRole="button" accessibilityLabel={'Call ' + watchName}>
          <Phone size={19} color="#fff" strokeWidth={1.9} />
        </Pressable>
      </View>

      <View style={st.week}>
        <Text style={st.weekLabel} allowFontScaling>This week on {watchName}’s phone</Text>
        <Text style={st.weekHead} allowFontScaling>{headline}</Text>
        {!!p && (
          <View style={st.stats}>
            <View style={[st.stat, st.statB]}><Text style={st.statNum} allowFontScaling>{p.checked7}</Text><Text style={st.statLabel} allowFontScaling>checked</Text></View>
            <View style={[st.stat, st.statB]}><Text style={[st.statNum, { color: T.red }]} allowFontScaling>{p.stopped7}</Text><Text style={st.statLabel} allowFontScaling>stopped</Text></View>
            <View style={st.stat}><Text style={[st.statNum, { color: T.amber }]} allowFontScaling>{p.flagged7}</Text><Text style={st.statLabel} allowFontScaling>worth a look</Text></View>
          </View>
        )}
        {!!p && p.checked30 > p.checked7 && (
          <Text style={st.weekFoot} allowFontScaling>{p.checked30} checked and {p.stopped30} stopped in the last 30 days.{p.since ? ' Protected since ' + new Date(p.since).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) + '.' : ''}</Text>
        )}
      </View>

      {needsYou && (
        <View>
          <Text style={st.section} allowFontScaling>Worth a word</Text>
          <Pressable style={st.needCard} onPress={() => ctx.openFamilyAlert(needsYou.id)} accessibilityRole="button">
            <View style={[st.needDot, { backgroundColor: needsYou.level === 'amber' ? T.amber : T.red }]} />
            <View style={{ flex: 1 }}>
              <Text style={st.needTitle} allowFontScaling>{needsYou.level === 'red' ? 'Scam text stopped' : 'Text worth a second look'}</Text>
              <Text style={st.needMeta} allowFontScaling>{ago(needsYou.at)}, from {needsYou.sender || 'an unknown number'}. {watchName} has been told what to do.</Text>
              <View style={st.needLink}>
                <Text style={st.needLinkText} allowFontScaling>Reply in one tap</Text>
                <ArrowRight size={14} color={T.green} strokeWidth={2.4} />
              </View>
            </View>
          </Pressable>
        </View>
      )}

      {repeats.length > 0 && (
        <View>
          <Text style={st.section} allowFontScaling>Numbers that keep trying</Text>
          <View style={st.listCard}>
            {repeats.slice(0, 3).map((r, i) => (
              <View key={r.sender} style={[st.repeatRow, i === Math.min(repeats.length, 3) - 1 && { borderBottomWidth: 0 }]}>
                <View style={st.repeatTop}>
                  <Text style={st.repeatNum} allowFontScaling numberOfLines={1}>{r.sender}</Text>
                  <Text style={st.repeatMeta} allowFontScaling>{r.count} flagged texts, last {ago(r.last).toLowerCase()}</Text>
                </View>
                {r.blocked ? (
                  <View style={st.blockedPill}><Check size={14} color={T.green} strokeWidth={2.6} /><Text style={st.blockedText} allowFontScaling>Blocked</Text></View>
                ) : (
                  <Pressable style={st.blockBtn} accessibilityRole="button" onPress={() => {
                    const rec = ctx.hist.find(h => h.source === 'family' && h.sender === r.sender);
                    if (rec) void ctx.sendNoteTo(rec.id, 'I blocked that number for you.', 'block');
                  }}>
                    <Ban size={14} color="#fff" strokeWidth={2.4} />
                    <Text style={st.blockBtnText} allowFontScaling>Block on {watchName}’s phone</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={st.section} allowFontScaling>Switched on over there</Text>
      <View style={st.listCard}>
        {steps.map((row, i) => {
          const open = openStep === row.id;
          return (
            <View key={row.id} style={[i === steps.length - 1 && !open && { borderBottomWidth: 0 }, st.stepWrap]}>
              <Pressable style={st.stepRow} onPress={() => setOpenStep(open ? null : row.id)} accessibilityRole="button">
                <View style={[st.stepDot, row.on === true ? { backgroundColor: T.green } : row.on === false ? { backgroundColor: T.amber } : { backgroundColor: T.hairline }]}>
                  {row.on === true ? <Check size={13} color="#fff" strokeWidth={3} /> : <Minus size={13} color={row.on === false ? '#fff' : T.sub} strokeWidth={3} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.stepLabel} allowFontScaling>{row.label}</Text>
                  <Text style={st.stepState} allowFontScaling>{row.on === true ? 'On' : row.on === false ? 'Not switched on yet. Tap for what to say.' : 'Unknown until ' + watchName + ' opens the app'}</Text>
                </View>
                {open ? <ChevronUp size={16} color={T.sub} strokeWidth={2.2} /> : <ChevronDown size={16} color={T.sub} strokeWidth={2.2} />}
              </Pressable>
              {open && (
                <View style={st.stepSay}>
                  <Text style={st.stepSayLabel} allowFontScaling>Read this to {watchName} over the phone</Text>
                  <Text style={st.stepSayText} allowFontScaling>{row.say}</Text>
                  {!!watch?.phone && (
                    <Pressable style={st.stepCall} onPress={call} accessibilityRole="button">
                      <Phone size={15} color={T.green} strokeWidth={2.2} />
                      <Text style={st.stepCallText} allowFontScaling>Call {watchName} now</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Text style={st.section} allowFontScaling>{weekWard.length ? 'This week' : 'Activity'}</Text>
      {ward.length === 0 ? (
        <View style={st.quietCard}>
          <Text style={st.quietTitle} allowFontScaling>Nothing flagged yet</Text>
          <Text style={st.quietBody} allowFontScaling>You hear from this phone the moment something on {watchName}’s looks wrong.</Text>
        </View>
      ) : (
        <View style={st.listCard}>
          {ward.slice(0, 20).map((w, i, arr) => {
            const red = w.level === 'red';
            const M = LEVEL_META[w.level];
            const Icon = red ? OctagonX : Info;
            const mine = (w.notes || []).filter(n => n.mine);
            return (
              <Pressable key={w.id} style={[st.eventRow, i === arr.length - 1 && { borderBottomWidth: 0 }]} onPress={() => ctx.openWard(w.id)} accessibilityRole="button">
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

      <Pressable style={{ paddingHorizontal: 24, paddingTop: 14 }} onPress={ctx.unlinkFamily} accessibilityRole="button">
        <Text style={st.stop} allowFontScaling>Stop looking after {watchName}</Text>
      </Pressable>
      <View style={{ height: 110 }} />
    </ScrollView>
    </KFIn>
  );
}

const card = {
  marginHorizontal: 24, borderTopWidth: 1, borderTopColor: T.hairline,
} as const;

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 2 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandText: { fontSize: 13, fontFamily: F.bold, letterSpacing: 0.65, color: T.green },
  roleTag: { fontSize: 13, fontFamily: F.semibold, color: T.sub },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingHorizontal: 24, paddingTop: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 17, fontFamily: F.semibold },
  name: { fontSize: 23, fontFamily: F.display, letterSpacing: -0.4, color: T.ink, lineHeight: 26 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.green },
  status: { fontSize: 15, fontFamily: F.body, color: T.sub, flex: 1 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },

  week: { marginHorizontal: 24, marginTop: 18, paddingTop: 16, paddingBottom: 8, borderTopWidth: 1, borderTopColor: T.hairline },
  weekLabel: { fontSize: 13, fontFamily: F.semibold, color: T.sub, letterSpacing: 0.3 },
  weekHead: { fontSize: 20, fontFamily: F.display, letterSpacing: -0.3, color: T.ink, lineHeight: 26, marginTop: 6 },
  weekFoot: { fontSize: 14, fontFamily: F.body, color: T.sub, lineHeight: 20, marginTop: 12 },
  stats: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderTopColor: T.divider, paddingTop: 12 },
  stat: { flex: 1, paddingRight: 10 },
  statB: { borderRightWidth: 1, borderRightColor: T.divider, marginRight: 12 },
  statNum: { fontSize: 26, fontFamily: F.display, color: T.ink, lineHeight: 28 },
  statLabel: { fontSize: 13, fontFamily: F.semibold, color: T.sub, marginTop: 3 },

  section: { paddingHorizontal: 24, paddingTop: 26, paddingBottom: 8, fontSize: 13, fontFamily: F.semibold, color: T.sub, letterSpacing: 0.4, textTransform: 'uppercase' },
  needCard: { marginHorizontal: 24, flexDirection: 'row', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.hairline },
  needDot: { width: 10, height: 10, borderRadius: 5, marginTop: 7 },
  needTitle: { fontSize: 17, fontFamily: F.bold, color: T.ink },
  needMeta: { fontSize: 15, fontFamily: F.body, color: T.sub, lineHeight: 21, marginTop: 3 },
  needLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  needLinkText: { fontSize: 15, fontFamily: F.semibold, color: T.green },

  listCard: { ...card, overflow: 'hidden' },
  repeatRow: { paddingHorizontal: 0, paddingVertical: 13, gap: 10, borderBottomWidth: 1, borderBottomColor: T.hairline },
  repeatTop: { },
  repeatNum: { fontSize: 16, fontFamily: F.semibold, color: T.ink },
  repeatMeta: { fontSize: 14, fontFamily: F.body, color: T.sub, marginTop: 2 },
  blockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: T.ink, borderRadius: 10, paddingHorizontal: 12, height: 44 },
  blockBtnText: { fontSize: 15, fontFamily: F.bold, color: '#fff' },
  blockedPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.greenTint, borderRadius: 10, paddingHorizontal: 10, height: 40 },
  blockedText: { fontSize: 13, fontFamily: F.semibold, color: T.green },

  stepWrap: { borderBottomWidth: 1, borderBottomColor: T.divider },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 0, paddingVertical: 13 },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 16, fontFamily: F.semibold, color: T.ink },
  stepState: { fontSize: 14, fontFamily: F.body, color: T.sub, marginTop: 2 },
  stepSay: { marginHorizontal: 15, marginBottom: 14, backgroundColor: T.ground, borderRadius: 12, padding: 13 },
  stepSayLabel: { fontSize: 13, fontFamily: F.semibold, color: T.sub, marginBottom: 5 },
  stepSayText: { fontSize: 16, fontFamily: F.body, color: T.ink, lineHeight: 24 },
  stepCall: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  stepCallText: { fontSize: 15, fontFamily: F.semibold, color: T.green },

  quietCard: { ...card, padding: 17 },
  quietTitle: { fontSize: 17, fontFamily: F.bold, color: T.ink },
  quietBody: { fontSize: 15.5, fontFamily: F.body, color: T.sub, lineHeight: 23, marginTop: 6 },
  eventRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 0, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.hairline },
  eventIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  eventTitle: { flex: 1, fontSize: 16, fontFamily: F.semibold, color: T.ink },
  eventWhen: { fontSize: 13, fontFamily: F.body, color: T.sub },
  eventSnippet: { fontSize: 15, fontFamily: F.body, color: T.sub, lineHeight: 21, marginTop: 3 },
  eventStatus: { fontSize: 14, fontFamily: F.semibold, marginTop: 6 },
  privacy: { paddingHorizontal: 24, paddingTop: 16, fontSize: 14.5, fontFamily: F.body, color: T.sub, lineHeight: 21.5 },
  stop: { fontSize: 15.5, fontFamily: F.semibold, color: T.red },
});
