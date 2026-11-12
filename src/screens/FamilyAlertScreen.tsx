// Caretaker, the moment something is flagged on the other phone. One red
// field: whose phone, what happened, the text. Two answers. Everything else
// is a text link.
import React, { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { T, F } from '../theme';
import { KFFade, KFRise } from '../ui/kf';
import { timeLabel } from '../lib/clock';
import { quickNote } from '../lib/family';
import { startCallActivity } from '../../modules/scam-ai';
import type { Ctx } from '../App';

export default function FamilyAlertScreen({ ctx }: { ctx: Ctx }) {
  const rec = ctx.hist.find(h => h.id === ctx.alertId);
  useEffect(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); }, [ctx.alertId]);
  useEffect(() => { if (!rec) ctx.closeFamilyAlert(); }, [rec]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rec) return null;

  const name = ctx.settings.watching?.name?.split(' ')[0] || rec.from?.split(' ')[0] || 'They';
  const red = rec.level !== 'amber';
  const field = red ? T.red : T.amber;
  const when = new Date(rec.at);
  const whenLabel = (when.toDateString() === new Date().toDateString() ? 'today, ' : '') + timeLabel(when);
  const phone = ctx.settings.watching?.phone;
  const headline = rec.askedFamily ? name + ' asked you about a text.' : red ? 'A scam text reached ' + name + '.' : 'A text on ' + name + '’s phone looks off.';

  const reply = async (verdict: 'scam' | 'safe' | 'call') => {
    await ctx.sendNoteTo(rec.id, quickNote(verdict), verdict);
    if (verdict === 'call' && phone) {
      // The text stays on the lock screen and in the Dynamic Island for the
      // length of the call, so both of them can read it together.
      startCallActivity(name, rec.excerpt, red ? 'red' : 'amber', red ? 'Tell them: do not reply, do not tap, delete it.' : 'Read it together. If they were asked for money or a code, it is a scam.');
      Linking.openURL('tel:' + phone.replace(/[^\d+]/g, '')).catch(() => {});
    }
    ctx.closeFamilyAlert();
  };

  return (
    <KFFade duration={200} style={[st.root, { backgroundColor: field }]} playKey={rec.id}>
      <View style={st.field}>
        <KFRise duration={550} delay={100} playKey={rec.id}>
          <Text style={st.eyebrow} allowFontScaling>{name.toUpperCase()}’S PHONE  ·  {whenLabel}</Text>
          <Text style={st.display} allowFontScaling>{headline}</Text>
        </KFRise>
        <KFRise duration={550} delay={260} playKey={rec.id}>
          <Text style={st.quote} allowFontScaling numberOfLines={4}>“{rec.excerpt}”</Text>
          <Text style={st.sub} allowFontScaling>{rec.sender ? 'From ' + rec.sender + '. ' : ''}{name} has been told: {rec.reason}</Text>
        </KFRise>
      </View>

      <View style={st.bottom}>
        <Pressable style={st.primary} onPress={() => reply('scam')} accessibilityRole="button">
          <Text style={[st.primaryText, { color: field }]} allowFontScaling>Tell {name} it is a scam</Text>
        </Pressable>
        <Pressable style={st.secondary} onPress={() => reply('safe')} accessibilityRole="button">
          <Text style={st.secondaryText} allowFontScaling>That one is fine</Text>
        </Pressable>
        <View style={st.links}>
          <Pressable onPress={() => reply('call')} accessibilityRole="button"><Text style={st.link} allowFontScaling>{phone ? 'Call ' + name + ', read it together' : 'Say you will call'}</Text></Pressable>
          <Text style={st.linkDot}>·</Text>
          <Pressable onPress={() => ctx.openWard(rec.id)} accessibilityRole="button"><Text style={st.link} allowFontScaling>Write a note</Text></Pressable>
          <Text style={st.linkDot}>·</Text>
          <Pressable onPress={ctx.closeFamilyAlert} accessibilityRole="button"><Text style={st.link} allowFontScaling>Later</Text></Pressable>
        </View>
      </View>
    </KFFade>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  field: { flex: 1, justifyContent: 'center', paddingHorizontal: 26, paddingBottom: 16 },
  eyebrow: { fontSize: 13, fontFamily: F.bold, letterSpacing: 1.6, color: 'rgba(255,255,255,.8)', marginBottom: 14 },
  display: { fontSize: 38, fontFamily: F.display, letterSpacing: -1.1, color: '#fff', lineHeight: 41 },
  quote: { fontSize: 20, fontFamily: F.medium, color: '#fff', lineHeight: 29, marginTop: 22 },
  sub: { fontSize: 15.5, fontFamily: F.body, color: 'rgba(255,255,255,.85)', lineHeight: 22, marginTop: 14 },
  bottom: { paddingHorizontal: 26, paddingBottom: 36, gap: 10 },
  primary: { height: 64, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 19, fontFamily: F.bold },
  secondary: { height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.6)', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 17, fontFamily: F.semibold, color: '#fff' },
  links: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 10 },
  link: { fontSize: 16, fontFamily: F.semibold, color: '#fff' },
  linkDot: { color: 'rgba(255,255,255,.6)', fontSize: 16 },
});
