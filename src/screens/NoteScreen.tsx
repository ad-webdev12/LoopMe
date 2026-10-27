// Owner, the moment a note arrives from the person who looks after them.
// Green field, their name, their words large, and a call button. It appears
// on its own when the push lands, and again when the notification is tapped.
import React, { useEffect } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Phone, Check, X, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { T, F } from '../theme';
import { KFFade, KFRise } from '../ui/kf';
import { speak } from '../lib/speech';
import type { Ctx } from '../App';

export default function NoteScreen({ ctx }: { ctx: Ctx }) {
  const n = ctx.noteOpen;
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (n && ctx.settings.readAloud) void speak(n.from + ' says: ' + n.text, { rate: 0.88 });
  }, [n?.text]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!n) ctx.closeNote(); }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!n) return null;

  const first = n.from.split(' ')[0] || 'Family';
  const rec = ctx.hist.find(h => h.id === n.checkId);
  const Icon = n.verdict === 'scam' ? X : n.verdict === 'safe' ? Check : n.verdict === 'call' ? Phone : MessageCircle;
  const trusted = ctx.settings.trusted.find(t => t.name.split(' ')[0].toLowerCase() === first.toLowerCase()) || ctx.settings.trusted[0];
  const headline = n.verdict === 'scam' ? first + ' says: it is a scam.'
    : n.verdict === 'safe' ? first + ' says: that one is fine.'
    : n.verdict === 'call' ? first + ' is going to call you.'
    : first + ' sent you a note.';

  return (
    <KFFade duration={200} style={{ flex: 1 }} playKey={n.text}>
    <ScrollView style={st.root} bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={st.top}>
        <KFFade duration={400} playKey={n.text} style={st.eyebrowRow}>
          <View style={st.eyeIcon}><Icon size={20} color="#fff" strokeWidth={2.4} /></View>
          <Text style={st.eyebrow} allowFontScaling>From {first}, just now</Text>
        </KFFade>
        <KFRise duration={550} delay={100} playKey={n.text}>
          <Text style={st.display} allowFontScaling>{headline}</Text>
        </KFRise>
        <View style={st.rule} />
        <KFRise duration={550} delay={200} playKey={n.text}>
          <Text style={st.noteText} allowFontScaling>“{n.text}”</Text>
        </KFRise>
        {!!rec && (
          <View style={st.aboutBox}>
            <Text style={st.aboutLabel} allowFontScaling>About the message you checked</Text>
            <Text style={st.aboutText} allowFontScaling numberOfLines={3}>{rec.excerpt}</Text>
          </View>
        )}
      </View>

      <View style={st.bottom}>
        {!!trusted && (
          <Pressable style={st.callBtn} onPress={() => Linking.openURL('tel:' + trusted.phone.replace(/[^\d+]/g, '')).catch(() => {})} accessibilityRole="button">
            <Phone size={21} color="#fff" strokeWidth={2.2} />
            <Text style={st.callText} allowFontScaling>Call {trusted.name.split(' ')[0]}</Text>
          </Pressable>
        )}
        <Pressable style={st.okBtn} onPress={ctx.closeNote} accessibilityRole="button">
          <Text style={st.okText} allowFontScaling>Okay, got it</Text>
        </Pressable>
        <Text style={st.foot} allowFontScaling>This came straight from {first}’s phone to yours. Nobody else can see it.</Text>
      </View>
    </ScrollView>
    </KFFade>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.green },
  top: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 24 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  eyeIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 13, fontFamily: F.bold, letterSpacing: 1.2, textTransform: 'uppercase', color: '#fff' },
  display: { fontSize: 34, fontFamily: F.display, letterSpacing: -1, color: '#fff', lineHeight: 36 },
  rule: { height: 1, backgroundColor: 'rgba(255,255,255,.45)', marginVertical: 18 },
  noteText: { fontSize: 22, fontFamily: F.medium, color: '#fff', lineHeight: 31 },
  aboutBox: { marginTop: 18, backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  aboutLabel: { fontSize: 13, fontFamily: F.semibold, color: 'rgba(255,255,255,.8)', marginBottom: 4 },
  aboutText: { fontSize: 15, fontFamily: F.body, color: '#fff', lineHeight: 22 },

  bottom: { flexGrow: 1, backgroundColor: T.ground, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28, gap: 9 },
  callBtn: { height: 62, borderRadius: 14, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 },
  callText: { fontSize: 18, fontFamily: F.bold, color: '#fff' },
  okBtn: { height: 56, borderRadius: 14, backgroundColor: T.ink, alignItems: 'center', justifyContent: 'center' },
  okText: { fontSize: 17, fontFamily: F.bold, color: '#fff' },
  foot: { marginTop: 'auto', fontSize: 14, fontFamily: F.body, color: T.sub, lineHeight: 20 },
});
