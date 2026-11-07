// Owner, the moment a note arrives from the person who looks after them. One
// green field, their name, their words, one button.
import React, { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const trusted = ctx.settings.trusted.find(t => t.name.split(' ')[0].toLowerCase() === first.toLowerCase()) || ctx.settings.trusted[0];
  const headline = n.verdict === 'scam' ? first + ' says it is a scam.'
    : n.verdict === 'safe' ? first + ' says it is fine.'
    : n.verdict === 'call' ? first + ' is calling you.'
    : n.verdict === 'block' ? first + ' blocked that number.'
    : 'A note from ' + first + '.';

  return (
    <KFFade duration={200} style={st.root} playKey={n.text}>
      <View style={st.field}>
        <KFRise duration={550} delay={100} playKey={n.text}>
          <Text style={st.eyebrow} allowFontScaling>FROM {first.toUpperCase()}, JUST NOW</Text>
          <Text style={st.display} allowFontScaling>{headline}</Text>
        </KFRise>
        <KFRise duration={550} delay={260} playKey={n.text}>
          <Text style={st.quote} allowFontScaling>“{n.text}”</Text>
        </KFRise>
      </View>
      <View style={st.bottom}>
        <Pressable style={st.primary} onPress={ctx.closeNote} accessibilityRole="button">
          <Text style={st.primaryText} allowFontScaling>Okay</Text>
        </Pressable>
        {!!trusted && (
          <Pressable style={st.secondary} onPress={() => Linking.openURL('tel:' + trusted.phone.replace(/[^\d+]/g, '')).catch(() => {})} accessibilityRole="button">
            <Text style={st.secondaryText} allowFontScaling>Call {trusted.name.split(' ')[0]}</Text>
          </Pressable>
        )}
      </View>
    </KFFade>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.green },
  field: { flex: 1, justifyContent: 'center', paddingHorizontal: 26, paddingBottom: 16 },
  eyebrow: { fontSize: 13, fontFamily: F.bold, letterSpacing: 1.6, color: 'rgba(255,255,255,.8)', marginBottom: 14 },
  display: { fontSize: 38, fontFamily: F.display, letterSpacing: -1.1, color: '#fff', lineHeight: 41 },
  quote: { fontSize: 22, fontFamily: F.medium, color: '#fff', lineHeight: 31, marginTop: 22 },
  bottom: { paddingHorizontal: 26, paddingBottom: 36, gap: 10 },
  primary: { height: 64, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 19, fontFamily: F.bold, color: T.green },
  secondary: { height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.6)', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 17, fontFamily: F.semibold, color: '#fff' },
});
