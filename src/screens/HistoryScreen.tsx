// History. Stats strip, last-7-days chart, the repeat-sender warning, then
// day-grouped rows. All fed by real saved checks, including what the text
// filter and the share sheet caught on their own. Export makes a real PDF
// with the dates, senders and verdicts a bank or the police can use.
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Download, OctagonX, Info, Check, Flag } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import { timeLabel } from '../lib/clock';
import { reportScam } from '../lib/report';
import type { Ctx } from '../App';
import type { CheckRecord } from '../lib/history';

const MARK = {
  red: { mark: 'Scam', color: T.red, tint: T.redTint, Icon: OctagonX },
  amber: { mark: 'Careful', color: T.amber, tint: T.amberTint, Icon: Info },
  green: { mark: 'Fine', color: T.green, tint: T.greenTint, Icon: Check },
} as const;

const SOURCE_LINE: Record<string, string> = {
  filter: 'Stopped before it reached you',
  share: 'Checked from the share sheet',
  messages: 'Checked in Messages',
  link: 'Checked automatically',
  family: 'On the phone you look after',
};

function dayLabel(at: number): string {
  const d = new Date(at), now = new Date();
  const one = 86400000;
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === new Date(now.getTime() - one).toDateString()) return 'Yesterday';
  if (now.getTime() - d.getTime() < 6 * one) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}
function hm(at: number): string {
  return timeLabel(new Date(at));
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function HistoryScreen({ ctx }: { ctx: Ctx }) {
  const careMode = ctx.settings.role === 'caretaker';
  const hist = ctx.hist.filter(h => careMode || h.source !== 'family');
  const checked = hist.length;
  const stopped = hist.filter(h => h.level === 'red').length;
  const looped = hist.filter(h => h.askedFamily).length;
  const notesSent = hist.reduce((n, h) => n + (h.notes || []).filter(x => x.mine).length, 0);

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

  // Repeat sender: 3+ non-green from the same REAL sender in the last 7 days.
  const repeat = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    const bySender = new Map<string, number>();
    for (const h of hist) {
      if (h.at <= cutoff || h.level === 'green' || !h.sender || h.sender === 'Pasted message' || !/\d{7,}/.test(h.sender)) continue;
      bySender.set(h.sender, (bySender.get(h.sender) || 0) + 1);
    }
    for (const [sender, n] of bySender) if (n >= 3 && !ctx.settings.blocked.includes(sender.replace(/\D/g, ''))) return { sender, n };
    return null;
  }, [hist, ctx.settings.blocked]);

  // A real PDF: the kind of page a bank's fraud team asks for.
  const exportLog = async () => {
    const ref = 'LM-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(hist.length).padStart(3, '0');
    const who = ctx.settings.myName || ctx.settings.careName || '';
    const rows = hist.map(h => `
      <tr>
        <td>${esc(new Date(h.at).toLocaleDateString())}<br><span class="dim">${esc(hm(h.at))}</span></td>
        <td>${esc(h.sender || (h.source === 'share' ? 'Shared from another app' : h.source === 'messages' ? 'Checked in Messages' : 'Pasted into Loop Me'))}</td>
        <td><span class="mark ${h.level}">${MARK[h.level].mark}</span>${h.reported ? '<br><span class="dim">Reported</span>' : ''}</td>
        <td>“${esc(h.excerpt)}”<div class="why">${esc(h.reason)}</div></td>
      </tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <style>
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #171717; margin: 36px; font-size: 12px; }
        h1 { font-size: 22px; margin: 0 0 4px; } .sub { color: #707070; margin: 0 0 18px; }
        table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 11px; color: #707070; border-bottom: 1px solid #d6d6d1; padding: 6px 6px; }
        td { vertical-align: top; padding: 9px 6px; border-bottom: 1px solid #edece9; }
        .dim { color: #707070; font-size: 11px; } .why { color: #3d3d3a; margin-top: 4px; font-size: 11px; }
        .mark { font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
        .red { background: #fdeeea; color: #8c1f0c; } .amber { background: #fbf0dd; color: #7a4e0d; } .green { background: #eef4f1; color: #0d4a3b; }
        .foot { margin-top: 20px; color: #707070; font-size: 11px; }
      </style></head><body>
      <h1>Loop Me check history${who ? ' for ' + esc(who) : ''}</h1>
      <p class="sub">Reference ${ref} · made ${esc(new Date().toLocaleString())} · ${checked} checks, ${stopped} flagged as scams</p>
      <table><tr><th>When</th><th>From</th><th>Result</th><th>Message and why</th></tr>${rows || '<tr><td colspan="4">No checks yet.</td></tr>'}</table>
      <p class="foot">Checked on this phone. Numbers and emails are blanked before saving.</p>
      </body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Loop Me check history' });
      else ctx.flash('The PDF is saved on this phone.');
    } catch {
      ctx.flash('Could not make the PDF just now.');
    }
  };

  return (
    <KFIn duration={260} style={{ flex: 1 }} playKey="history">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={st.exportRow}>
        <Pressable style={st.exportBtn} onPress={exportLog} accessibilityRole="button">
          <Download size={17} color={T.green} strokeWidth={2} />
          <Text style={st.exportText} allowFontScaling>Export PDF</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 14 }}>
        <Text style={st.title} allowFontScaling>History</Text>
        <Text style={st.sub} allowFontScaling>Export makes a PDF for your bank.</Text>
      </View>

      <View style={st.summary}>
        <Text style={st.summaryText} allowFontScaling>
          {checked === 0 ? 'Nothing checked yet.' : checked + (checked === 1 ? ' text checked' : ' texts checked') + (stopped ? ', ' + stopped + (stopped === 1 ? ' scam stopped' : ' scams stopped') : '') + ((careMode ? notesSent : looped) ? ', ' + (careMode ? notesSent + (notesSent === 1 ? ' reply' : ' replies') : looped + ' looped in') : '') + '.'}
        </Text>
        <View style={st.chart}>
          {week.map((d, i) => (
            <View key={i} style={st.chartCol}>
              <View style={[st.chartBar, { height: Math.max(4, 10 + d.n * 6), backgroundColor: d.red ? T.red : T.green, opacity: d.n === 0 ? 0.16 : 1 }]} />
              <Text style={st.chartDay} allowFontScaling>{d.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {repeat && (
        <View style={st.repeatCard}>
          <OctagonX size={19} color={T.red} strokeWidth={2} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={st.repeatTitle} allowFontScaling>Same number, {repeat.n === 3 ? 'third' : repeat.n + 'th'} attempt</Text>
            <Text style={st.repeatBody} allowFontScaling>{repeat.sender} has tried {repeat.n === 3 ? 'three' : repeat.n} times this week.</Text>
            <Pressable onPress={() => ctx.blockNumber(repeat.sender)} accessibilityRole="button">
              <Text style={st.repeatLink} allowFontScaling>Block this number ›</Text>
            </Pressable>
          </View>
        </View>
      )}

      {days.length === 0 && (
        <View style={st.empty}>
          <Text style={st.emptyTitle} allowFontScaling>Nothing checked yet</Text>
          <Text style={st.emptyBody} allowFontScaling>Every check lands here.</Text>
        </View>
      )}

      {days.map(day => (
        <View key={day.label}>
          <Text style={st.dayLabel} allowFontScaling>{day.label}</Text>
          <View style={st.dayCard}>
            {day.items.map((h) => {
              const M = MARK[h.level];
              const sourceLine = SOURCE_LINE[h.source];
              return (
                <Pressable key={h.id} style={st.row}
                  onPress={() => h.source === 'family' ? ctx.openWard(h.id) : ctx.check(h.excerpt, h.sender)} accessibilityRole="button">
                  <View style={[st.dot, { backgroundColor: M.color }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.rowSnippet} allowFontScaling numberOfLines={2}>{h.excerpt}</Text>
                    <View style={st.rowFoot}>
                      <Text style={st.rowMeta} allowFontScaling numberOfLines={2}>{[M.mark, h.sender, sourceLine, hm(h.at)].filter(Boolean).join('  ·  ')}</Text>
                      {h.level !== 'green' && !careMode && (
                        <Pressable onPress={() => reportScam(ctx, h.id)} accessibilityRole="button" accessibilityLabel="Report">
                          <Text style={[st.reportText, h.reported && { color: T.sub }]} allowFontScaling>{h.reported ? 'Reported' : 'Report'}</Text>
                        </Pressable>
                      )}
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
  summary: { marginHorizontal: 24, paddingTop: 6, paddingBottom: 8 },
  summaryText: { fontSize: 17, fontFamily: F.medium, color: T.ink, lineHeight: 25 },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 9 },
  rowMeta: { flex: 1, fontSize: 14, fontFamily: F.body, color: T.sub },
  root: { flex: 1, backgroundColor: T.ground },
  exportRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  exportBtn: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  exportText: { fontSize: 15, fontFamily: F.bold, color: T.green },
  title: { fontSize: 34, fontFamily: F.display, letterSpacing: -0.9, color: T.ink, lineHeight: 38 },
  sub: { fontSize: 15.5, fontFamily: F.body, color: T.sub, lineHeight: 22.5, marginTop: 6 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 14, height: 58 },
  chartCol: { flex: 1, justifyContent: 'flex-end', gap: 5, height: '100%' },
  chartBar: { width: '100%' },
  chartDay: { fontSize: 11, fontFamily: F.semibold, color: T.sub, textAlign: 'center' },

  repeatCard: { marginHorizontal: 24, marginTop: 14, flexDirection: 'row', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.hairline },
  repeatTitle: { fontSize: 16, fontFamily: F.bold, color: T.ink },
  repeatBody: { fontSize: 15, fontFamily: F.body, color: T.sub, lineHeight: 21, marginTop: 3 },
  repeatLink: { fontSize: 15, fontFamily: F.bold, color: T.red, marginTop: 8 },

  empty: { marginHorizontal: 24, marginTop: 14, borderTopWidth: 1, borderTopColor: T.hairline, padding: 17 },
  emptyTitle: { fontSize: 17, fontFamily: F.bold, color: T.ink },
  emptyBody: { fontSize: 15.5, fontFamily: F.body, color: T.sub, lineHeight: 22.5, marginTop: 6 },

  dayLabel: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 6, fontSize: 13, fontFamily: F.semibold, color: T.sub, letterSpacing: 0.4, textTransform: 'uppercase' },
  dayCard: {
    marginHorizontal: 24, borderTopWidth: 1, borderTopColor: T.hairline,
  },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.hairline },
  rowSnippet: { fontSize: 16.5, fontFamily: F.body, color: T.ink, lineHeight: 23 },
  rowFoot: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  reportText: { fontSize: 14, fontFamily: F.semibold, color: T.red },
});
