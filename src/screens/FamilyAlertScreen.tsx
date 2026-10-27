// Caretaker, the moment something is flagged on the other phone. This takes
// the whole screen the instant the push lands (or the notification is
// tapped): a colored field with what arrived and what they were told, then
// three big replies that land on the other phone as a note, and a call
// button. Nothing to type unless they want to.
import React, { useEffect } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OctagonX, Info, Phone, Check, X, PenLine } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { T, F } from '../theme';
import { KFFade, KFRise } from '../ui/kf';
import { timeLabel } from '../lib/clock';
import { quickNote } from '../lib/family';
import type { Ctx } from '../App';

export default function FamilyAlertScreen({ ctx }: { ctx: Ctx }) {
  const rec = ctx.hist.find(h => h.id === ctx.alertId);
  useEffect(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); }, [ctx.alertId]);
  // The record can vanish (history cleared, link ended): leave quietly.
  useEffect(() => { if (!rec) ctx.closeFamilyAlert(); }, [rec]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rec) return null;

  const name = ctx.settings.watching?.name?.split(' ')[0] || rec.from?.split(' ')[0] || 'They';
  const red = rec.level !== 'amber';
  const field = red ? T.red : T.amber;
  const when = new Date(rec.at);
  const whenLabel = (when.toDateString() === new Date().toDateString() ? 'Today at ' : '') + timeLabel(when);
  const replied = (rec.notes || []).some(n => n.mine);
  const phone = ctx.settings.watching?.phone;

  const reply = async (verdict: 'scam' | 'safe' | 'call') => {
    await ctx.sendNoteTo(rec.id, quickNote(verdict), verdict);
    if (verdict === 'call' && phone) Linking.openURL('tel:' + phone.replace(/[^\d+]/g, '')).catch(() => {});
    ctx.closeFamilyAlert();
  };

  return (
    <KFFade duration={200} style={{ flex: 1 }} playKey={rec.id}>
    <ScrollView style={[st.root, { backgroundColor: field }]} bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={st.top}>
        <KFFade duration={400} playKey={rec.id} style={st.eyebrowRow}>
          <View style={st.eyeIcon}>{red ? <OctagonX size={20} color="#fff" strokeWidth={2.2} /> : <Info size={20} color="#fff" strokeWidth={2.2} />}</View>
          <Text style={st.eyebrow} allowFontScaling>{name}’s phone · {whenLabel}</Text>
        </KFFade>
        <KFRise duration={550} delay={100} playKey={rec.id}>
          <Text style={st.display} allowFontScaling>
            {rec.askedFamily
              ? name + ' wants your\nopinion on a text.'
              : red ? 'A scam text just\nreached ' + name + '.' : 'A text on ' + name + '’s\nphone looks off.'}
          </Text>
        </KFRise>
        <View style={st.rule} />
        <KFRise duration={550} delay={200} playKey={rec.id}>
          <Text style={st.fromLine} allowFontScaling>From {rec.sender || 'an unknown number'}</Text>
          <Text style={st.excerpt} allowFontScaling>“{rec.excerpt}”</Text>
        </KFRise>
        <View style={st.toldBox}>
          <Text style={st.toldLabel} allowFontScaling>{name} has been told</Text>
          <Text style={st.toldText} allowFontScaling>{rec.reason}</Text>
        </View>
      </View>

      <View style={st.bottom}>
        <Text style={st.bottomLabel} allowFontScaling>{replied ? 'You already answered. Send another if you like.' : 'One tap lands on ' + name + '’s screen'}</Text>
        <Pressable style={[st.big, { backgroundColor: T.red }]} onPress={() => reply('scam')} accessibilityRole="button">
          <X size={22} color="#fff" strokeWidth={2.6} />
          <Text style={st.bigText} allowFontScaling>It is a scam, delete it</Text>
        </Pressable>
        <Pressable style={[st.big, { backgroundColor: T.green }]} onPress={() => reply('safe')} accessibilityRole="button">
          <Check size={22} color="#fff" strokeWidth={2.6} />
          <Text style={st.bigText} allowFontScaling>That one is fine</Text>
        </Pressable>
        <Pressable style={[st.big, { backgroundColor: T.ink }]} onPress={() => reply('call')} accessibilityRole="button">
          <Phone size={21} color="#fff" strokeWidth={2.2} />
          <Text style={st.bigText} allowFontScaling>{phone ? 'Call ' + name + ' now' : 'Tell ' + name + ' you will call'}</Text>
        </Pressable>
        <View style={st.row}>
          <Pressable style={st.small} onPress={() => { ctx.openWard(rec.id); }} accessibilityRole="button">
            <PenLine size={16} color={T.ink} strokeWidth={2.2} />
            <Text style={st.smallText} allowFontScaling>Write your own note</Text>
          </Pressable>
          <Pressable style={st.small} onPress={ctx.closeFamilyAlert} accessibilityRole="button">
            <Text style={st.smallText} allowFontScaling>Later</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
    </KFFade>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  top: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 24 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  eyeIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { flex: 1, fontSize: 13, fontFamily: F.bold, letterSpacing: 1.2, textTransform: 'uppercase', color: '#fff' },
  display: { fontSize: 34, fontFamily: F.display, letterSpacing: -1, color: '#fff', lineHeight: 36 },
  rule: { height: 1, backgroundColor: 'rgba(255,255,255,.45)', marginVertical: 18 },
  fromLine: { fontSize: 15, fontFamily: F.semibold, color: 'rgba(255,255,255,.85)' },
  excerpt: { fontSize: 19, fontFamily: F.medium, color: '#fff', lineHeight: 27, marginTop: 8 },
  toldBox: { marginTop: 18, backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  toldLabel: { fontSize: 13, fontFamily: F.semibold, color: 'rgba(255,255,255,.8)', marginBottom: 4 },
  toldText: { fontSize: 16, fontFamily: F.medium, color: '#fff', lineHeight: 23 },

  bottom: { flexGrow: 1, backgroundColor: T.ground, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28, gap: 9 },
  bottomLabel: { fontSize: 14, fontFamily: F.semibold, color: T.sub, marginBottom: 2 },
  big: { height: 62, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 },
  bigText: { fontSize: 18, fontFamily: F.bold, color: '#fff' },
  row: { flexDirection: 'row', gap: 9, marginTop: 4 },
  small: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, borderColor: T.hairline, backgroundColor: T.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  smallText: { fontSize: 15, fontFamily: F.semibold, color: T.ink },
});
