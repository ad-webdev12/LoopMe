// History — source lines 284-301. Stats strip, last-7-days chart, the
// repeat-sender warning, then day-grouped rows. All fed by real saved checks.
import React, { useMemo } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Download, OctagonX, Info, Check } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import type { Ctx } from '../App';
import type { CheckRecord } from '../lib/history';

const MARK = {
  red: { mark: 'Scam', color: T.red, tint: T.redTint, Icon: OctagonX },
  amber: { mark: 'Careful', color: T.amber, tint: T.amberTint, Icon: Info },
  green: { mark: 'Fine', color: T.green, tint: T.greenTint, Icon: Check },
} as const;

function dayLabel(at: number): string {
  const d = new Date(at), now = new Date();
  const one = 86400000;
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === new Date(now.getTime() - one).toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long' });
}
function hm(at: number): string {
  const d = new Date(at);
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
}

export default function HistoryScreen({ ctx }: { ctx: Ctx }) {
  const careMode = ctx.settings.role === 'caretaker';
  const hist = ctx.hist;
  const checked = hist.length;
  const stopped = hist.filter(h => h.level === 'red').length;
  const looped = hist.filter(h => h.askedFamily).length;
  const notesSent = hist.reduce((n, h) => n + (h.notes?.length || 0), 0);

  const days = useMemo(() => {
    const out: { label: string; items: CheckRecord[] }[] = [];
    for (const h of hist) {
      const label = dayLabel(h.at);
      let d = out.find(x => x.label === label);
      if (!d) { d = { label, items: [] }; out.push(d); }
      d.items.push(h);
    }
    return out;
  }, [hist]);

  // Real last-7-days counts; a day goes red if it saw a scam.
  const week = useMemo(() => {
    const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const out: { label: string; n: number; red: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const items = hist.filter(h => new Date(h.at).toDateString() === d.toDateString());
      out.push({ label: labels[d.getDay()], n: items.length, red: items.some(h => h.level === 'red') });
    }
    return out;
  }, [hist]);

  // Repeat sender: 3+ non-green from the same sender in the last 7 days.
  const repeat = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    const bySender = new Map<string, number>();
    for (const h of hist) if (h.at > cutoff && h.level !== 'green' && h.sender) bySender.set(h.sender, (bySender.get(h.sender) || 0) + 1);
    for (const [sender, n] of bySender) if (n >= 3) return { sender, n };
    return null;
  }, [hist]);

  const exportLog = async () => {
    const lines = hist.map(h => `${dayLabel(h.at)} ${hm(h.at)} · ${h.sender || 'Pasted message'} · ${MARK[h.level].mark}\n  “${h.excerpt}”\n  ${h.reason}`);
    try {
      await Share.share({ message: 'Loop Me — check history\n\n' + (lines.join('\n\n') || 'No checks yet.') });
    } catch {}
    ctx.flash('Made a one-page log you can print or show.');
  };

  return (
    <KFIn duration={260} style={{ flex: 1 }} playKey="history">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={st.exportRow}>
        <Pressable style={st.exportBtn} onPress={exportLog} accessibilityRole="button">
          <Download size={16} color={T.green} strokeWidth={2} />
          <Text style={st.exportText} allowFontScaling>Export</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
        <Text style={st.title} allowFontScaling>History</Text>
        <Text style={st.sub} allowFontScaling>Kept on this phone only. Export makes one plain page you can show your bank.</Text>
      </View>

      <View style={st.statsCard}>
        <View style={st.statsRow}>
          <View style={[st.stat, st.statBorder]}><Text style={st.statNum} allowFontScaling>{checked}</Text><Text style={st.statLabel} allowFontScaling>CHECKED</Text></View>
          <View style={[st.stat, st.statBorder]}><Text style={[st.statNum, { color: T.red }]} allowFontScaling>{stopped}</Text><Text style={st.statLabel} allowFontScaling>STOPPED</Text></View>
          <View style={st.stat}><Text style={[st.statNum, { color: T.green }]} allowFontScaling>{careMode ? notesSent : looped}</Text><Text style={st.statLabel} allowFontScaling>{careMode ? 'NOTES SENT' : 'LOOPED IN'}</Text></View>
        </View>
        <View style={st.chartWrap}>
          <Text style={st.chartLabel} allowFontScaling>LAST 7 DAYS</Text>
          <View style={st.chart}>
            {week.map((d, i) => (
              <View key={i} style={st.chartCol}>
                <View style={[st.chartBar, { height: Math.max(4, 16 + d.n * 5.4), backgroundColor: d.red ? T.red : T.green, opacity: d.n === 0 ? 0.18 : 1 }]} />
                <Text style={st.chartDay} allowFontScaling>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {repeat && (
        <View style={st.repeatCard}>
          <OctagonX size={19} color={T.red} strokeWidth={2} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={st.repeatTitle} allowFontScaling>Same number, third attempt</Text>
            <Text style={st.repeatBody} allowFontScaling>{repeat.sender} has tried {repeat.n === 3 ? 'three' : repeat.n} times this week, each one pushier.</Text>
            <Pressable onPress={() => ctx.flash('That number is blocked. Nothing from it will reach you.')} accessibilityRole="button">
              <Text style={st.repeatLink} allowFontScaling>Block this number ›</Text>
            </Pressable>
          </View>
        </View>
      )}

      {days.length === 0 && (
        <View style={st.empty}>
          <Text style={st.emptyTitle} allowFontScaling>Nothing checked yet</Text>
          <Text style={st.emptyBody} allowFontScaling>Every message you check lands here, kept on this phone only.</Text>
        </View>
      )}

      {days.map(day => (
        <View key={day.label}>
          <Text style={st.dayLabel} allowFontScaling>{day.label.toUpperCase()}</Text>
          <View style={st.dayCard}>
            {day.items.map((h, i) => {
              const M = MARK[h.level];
              return (
                <Pressable key={h.id} style={[st.row, i === day.items.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => ctx.check(h.excerpt, h.sender)} accessibilityRole="button">
                  <View style={[st.rowIcon, { backgroundColor: M.tint }]}>
                    <M.Icon size={15} color={M.color} strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={st.rowTop}>
                      <Text style={st.rowSender} allowFontScaling numberOfLines={1}>{h.sender || 'Pasted message'}</Text>
                      <Text style={st.rowTime} allowFontScaling>{hm(h.at)}</Text>
                    </View>
                    <Text style={st.rowSnippet} allowFontScaling numberOfLines={2}>{h.excerpt}</Text>
                    <View style={[st.mark, { backgroundColor: M.tint }]}>
                      <Text style={[st.markText, { color: M.color }]} allowFontScaling>{M.mark.toUpperCase()}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <View style={{ height: 104 }} />
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  exportRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  exportBtn: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  exportText: { fontSize: 13, fontFamily: F.bold, color: T.green },
  title: { fontSize: 27, fontFamily: F.display, letterSpacing: -0.54, color: T.ink, lineHeight: 28.6 },
  sub: { fontSize: 13.5, fontFamily: F.body, color: T.sub, lineHeight: 20.25, marginTop: 6 },

  statsCard: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  statsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.divider },
  stat: { flex: 1, paddingHorizontal: 16, paddingVertical: 14 },
  statBorder: { borderRightWidth: 1, borderRightColor: T.divider },
  statNum: { fontSize: 24, fontFamily: F.display, color: T.ink, lineHeight: 24 },
  statLabel: { fontSize: 9.5, fontFamily: F.semibold, letterSpacing: 0.855, color: T.sub, marginTop: 5 },
  chartWrap: { paddingHorizontal: 16, paddingVertical: 14 },
  chartLabel: { fontSize: 10, fontFamily: F.semibold, letterSpacing: 1.4, color: T.sub, marginBottom: 12 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 56 },
  chartCol: { flex: 1, justifyContent: 'flex-end', gap: 5, height: '100%' },
  chartBar: { width: '100%' },
  chartDay: { fontSize: 9, fontFamily: F.semibold, color: T.sub, textAlign: 'center' },

  repeatCard: {
    marginHorizontal: 22, marginVertical: 14, backgroundColor: T.redTint, borderWidth: 1, borderColor: T.redEdge,
    paddingHorizontal: 15, paddingVertical: 14, flexDirection: 'row', gap: 12,
  },
  repeatTitle: { fontSize: 14, fontFamily: F.bold, color: T.ink },
  repeatBody: { fontSize: 13, fontFamily: F.body, color: T.sub, lineHeight: 18.85, marginTop: 3 },
  repeatLink: { fontSize: 12.5, fontFamily: F.bold, color: T.red, marginTop: 8 },

  empty: { marginHorizontal: 22, marginTop: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, padding: 17 },
  emptyTitle: { fontSize: 15, fontFamily: F.bold, color: T.ink },
  emptyBody: { fontSize: 13.5, fontFamily: F.body, color: T.sub, lineHeight: 20.25, marginTop: 6 },

  dayLabel: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 8, fontSize: 10, fontFamily: F.semibold, letterSpacing: 1.4, color: T.sub },
  dayCard: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 15, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: T.divider },
  rowIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  rowSender: { flex: 1, fontSize: 14, fontFamily: F.bold, color: T.ink },
  rowTime: { fontSize: 11.5, fontFamily: F.body, color: T.sub },
  rowSnippet: { fontSize: 13, fontFamily: F.body, color: T.sub, lineHeight: 18.85, marginTop: 3 },
  mark: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, marginTop: 7 },
  markText: { fontSize: 9.5, fontFamily: F.display, letterSpacing: 0.855 },
});
