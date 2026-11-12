// History. Large title + Export, Week / Month / All, a summary card with the
// big count and a bar chart, then every check as a message bubble with its
// verdict pill and what happened next. Tap a bubble for its verdict screen.
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { T, font } from '../theme';
import { Screen, LargeTitle, Segmented, Tag } from '../ui/base';
import { exportHistoryPdf } from '../lib/pdf';
import { firstName, loopPerson } from '../ui/pieces';
import type { CheckRecord } from '../lib/history';
import type { Ctx } from '../App';

function dayLabel(at: number): string {
  const d = new Date(at), now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  const days = (now.getTime() - d.getTime()) / 86400000;
  if (days < 7) return 'Earlier this week';
  if (days < 31) return 'Earlier this month';
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
function timeShort(at: number): string {
  const d = new Date(at), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if ((now.getTime() - d.getTime()) / 86400000 < 6) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function HistoryScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const careMode = s.role === 'caretaker';
  const [range, setRange] = useState('Month');
  const who = firstName(loopPerson(s)?.name);

  const all = ctx.hist.filter(h => careMode || h.source !== 'family');
  const since = range === 'Week' ? Date.now() - 7 * 86400000 : range === 'Month' ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() : 0;
  const hist = all.filter(h => h.at >= since);
  const scams = hist.filter(h => h.level === 'red').length;
  const fine = hist.filter(h => h.level === 'green').length;
  const monthName = new Date().toLocaleDateString(undefined, { month: 'long' });

  // One bar per day of the range (up to 14), the worst verdict that day.
  const bars = useMemo(() => {
    const days = range === 'Week' ? 7 : range === 'Month' ? Math.min(14, new Date().getDate()) : 14;
    const out: { level: 'red' | 'amber' | 'green' | 'none'; n: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const items = all.filter(h => new Date(h.at).toDateString() === d.toDateString());
      const level = items.some(h => h.level === 'red') ? 'red' : items.some(h => h.level === 'amber') ? 'amber' : items.length ? 'green' : 'none';
      out.push({ level, n: items.length });
    }
    return out;
  }, [all, range]);
  const maxN = Math.max(1, ...bars.map(b => b.n));
  const firstLabel = (() => { const d = new Date(); d.setDate(d.getDate() - (bars.length - 1)); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); })();

  const groups = useMemo(() => {
    const out: { label: string; items: CheckRecord[] }[] = [];
    for (const h of hist) {
      const label = dayLabel(h.at);
      let g = out.find(x => x.label === label);
      if (!g) { g = { label, items: [] }; out.push(g); }
      g.items.push(h);
    }
    return out;
  }, [hist]);

  const outcome = (h: CheckRecord): string => {
    const reply = (h.notes || []).find(n => !n.mine);
    if (h.source === 'filter') return reply ? 'Went to Junk. ' + who + ' replied.' : 'Went to Junk.';
    if (h.userLabel === 'fine') return 'You said it was fine';
    if (h.userLabel === 'scam') return 'You said it was a scam';
    if (reply) return who + ' replied.';
    if (h.askedFamily) return who ? 'You asked ' + who : 'You asked for help';
    if (h.level === 'red') return h.sender && s.blocked.includes(h.sender.replace(/\D/g, '')) ? 'You blocked the number' : 'You didn’t reply';
    return '';
  };

  const exportPdf = async () => {
    const r = await exportHistoryPdf(all, careMode ? (s.watching?.name || '') : s.myName);
    ctx.flash(r === 'failed' ? 'Could not make the PDF just now.' : r === 'saved' ? 'The PDF is saved on this phone.' : 'Your history is ready to share.');
  };

  return (
    <Screen C={C} playKey="history">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <LargeTitle C={C} right={<Pressable onPress={exportPdf} accessibilityRole="button" style={{ marginBottom: 5 }}><Text style={[font(17, '400'), { color: T.green }]} allowFontScaling>Export</Text></Pressable>}>History</LargeTitle>
        <Segmented C={C} options={['Week', 'Month', 'All']} value={range} onChange={setRange} />

        <View style={[st.summary, { backgroundColor: C.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
            <Text style={[font(76, '800', 1.0, -3, true), { color: scams ? T.red : T.green, marginBottom: -10 }]} allowFontScaling={false}>{scams}</Text>
            <Text style={[font(17, '600', 1.25), { color: C.ink, flex: 1 }]} allowFontScaling>
              {scams === 1 ? 'scam stopped' : 'scams stopped'}{'\n'}{range === 'Week' ? 'this week' : range === 'Month' ? 'in ' + monthName : 'so far'}{'\n'}
              <Text style={{ fontWeight: '400', color: C.ink2 }}>{fine} other {fine === 1 ? 'text was' : 'texts were'} fine</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 58, marginTop: 18 }}>
            {bars.map((b, i) => (
              <View key={i} style={{ flex: 1, height: b.n ? Math.max(12, Math.round(58 * b.n / maxN)) : 7, borderRadius: 4, backgroundColor: b.level === 'red' ? T.red : b.level === 'amber' ? T.amber : b.level === 'green' ? T.green : C.sep2 }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={[font(13, '500'), { color: C.meta }]} allowFontScaling>{firstLabel}</Text>
            <Text style={[font(13, '500'), { color: C.meta }]} allowFontScaling>Today</Text>
          </View>
        </View>

        {groups.length === 0 && (
          <Text style={[font(16, '400', 1.45), { color: C.ink2, textAlign: 'center', paddingHorizontal: 32, paddingTop: 30 }]} allowFontScaling>
            Nothing checked {range === 'Week' ? 'this week' : range === 'Month' ? 'this month' : 'yet'}. Every message you check lands here.
          </Text>
        )}
        {groups.map(g => (
          <View key={g.label}>
            <Text style={[font(15, '600'), { color: C.ink2, textAlign: 'center', paddingTop: 18, paddingBottom: 10 }]} allowFontScaling>{g.label}</Text>
            {g.items.map((h, i) => {
              const sender = h.sender || (h.source === 'filter' ? 'Unknown number' : h.source === 'family' ? firstName(h.from) + '’s phone' : 'Pasted');
              const out = outcome(h);
              return (
                <Pressable key={h.id} onPress={() => careMode && h.source === 'family' ? ctx.openWard(h.id) : ctx.openRecord(h.id)} style={({ pressed }) => [{ paddingHorizontal: 16, paddingTop: i ? 14 : 0, alignItems: 'flex-start', gap: 6 }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                  <View style={[st.bubble, { backgroundColor: C.card }]}>
                    <Text style={[font(14, '500'), { color: C.meta }]} allowFontScaling numberOfLines={1}>{sender} · {timeShort(h.at)}</Text>
                    <Text style={[font(16, '400', 1.36), { color: C.ink, marginTop: 3 }]} allowFontScaling numberOfLines={3}>{h.excerpt}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 6 }}>
                    {h.level === 'red' ? <Tag label="Scam" bg={T.red} color="#fff" /> : h.level === 'amber' ? <Tag label="Be careful" bg={T.amber} color="#fff" /> : <Tag label="Fine" bg={C.greenFine} color={T.greenDeep} />}
                    {!!out && <Text style={[font(15, '500'), { color: C.ink2, flexShrink: 1 }]} allowFontScaling numberOfLines={1}>{out}</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  summary: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 14 },
  bubble: { maxWidth: 300, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomRightRadius: 22, borderBottomLeftRadius: 8, paddingTop: 11, paddingHorizontal: 15, paddingBottom: 12 },
});
