// Check a message (home) — source lines 211-232, matched value for value.
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Shield, Settings as Cog, ChevronRight, ArrowRight, Image as Img, Camera, Mic, OctagonX, TriangleAlert, CircleCheck,
} from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import type { Ctx } from '../App';

export default function HomeScreen({ ctx }: { ctx: Ctx }) {
  const [text, setText] = useState('');
  const [clip, setClip] = useState(false);
  const careMode = ctx.settings.role === 'caretaker';
  const first = (ctx.settings.myName || '').split(' ')[0] || (careMode ? 'Maria' : 'Ruth');
  const hour = new Date().getHours();
  const greeting = (hour < 12 ? 'Good morning' : 'Good afternoon') + ', ' + first;
  const watchName = ctx.settings.watching?.name?.split(' ')[0] || 'Ruth';
  const recent = ctx.hist[0];
  const recentMeta = recent
    ? ({ red: 'Scam stopped', amber: 'Needed a second look', green: 'Came back clear' }[recent.level] || '') + ' · ' + when(recent.at)
    : '';

  useEffect(() => {
    Clipboard.hasStringAsync().then(setClip).catch(() => {});
  }, []);

  const RecentIcon = recent?.level === 'red' ? OctagonX : recent?.level === 'amber' ? TriangleAlert : CircleCheck;
  const recentTint = recent?.level === 'red' ? T.redTint : recent?.level === 'amber' ? T.amberTint : T.greenTint;
  const recentColor = recent?.level === 'red' ? T.red : recent?.level === 'amber' ? T.amber : T.green;

  return (
    <KFIn duration={240} style={{ flex: 1 }} playKey="home">
    <ScrollView style={st.root} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={st.brandRow}>
        <View style={st.brand}>
          <Shield size={17} color={T.green} strokeWidth={2} />
          <Text style={st.brandText} allowFontScaling>LOOP ME</Text>
        </View>
        <Pressable style={st.gear} onPress={() => ctx.go('settings')} accessibilityRole="button" accessibilityLabel="Settings">
          <Cog size={19} color={T.ink2} strokeWidth={2} />
        </Pressable>
      </View>

      {careMode && (
        <Pressable style={st.careStripWrap} onPress={() => ctx.go('ward')} accessibilityRole="button">
          <View style={st.careStrip}>
            <View style={st.careAvatar}><Text style={st.careAvatarText} allowFontScaling>{watchName[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={st.careTitle} allowFontScaling>Looking after {watchName}</Text>
              <Text style={st.careSub} allowFontScaling>Nothing flagged on her phone today</Text>
            </View>
            <ChevronRight size={16} color={T.green} strokeWidth={2.2} />
          </View>
        </Pressable>
      )}

      <View style={st.head}>
        <Text style={st.greeting} allowFontScaling>{greeting}</Text>
        <Text style={st.title} allowFontScaling>Check a message</Text>
      </View>

      <View style={st.card}>
        <TextInput
          style={st.box} multiline
          placeholder="Paste or type the message here"
          placeholderTextColor={T.muted}
          value={text} onChangeText={setText}
          accessibilityLabel="Message to check"
        />
        {clip && !text.trim() && (
          <Pressable
            style={st.pasteRow}
            onPress={async () => { try { const c = (await Clipboard.getStringAsync())?.trim(); if (c) setText(c); } catch {} }}
            accessibilityRole="button">
            <Text style={st.pasteText} allowFontScaling>Paste what I copied</Text>
          </Pressable>
        )}
        <Pressable style={st.checkBtn} onPress={() => ctx.check(text)} accessibilityRole="button" accessibilityLabel="Check this message">
          <Text style={st.checkText} allowFontScaling>Check this message</Text>
          <ArrowRight size={19} color="#fff" strokeWidth={2.1} />
        </Pressable>
      </View>

      <Text style={st.orLabel} allowFontScaling>or add it another way</Text>
      <View style={st.addRow}>
        {[
          { Icon: Img, label: 'Screenshot', act: () => ctx.flash('Reads the words out of a screenshot, on this phone.') },
          { Icon: Camera, label: 'Photo', act: () => ctx.flash('Opens the camera to photograph a message.') },
          { Icon: Mic, label: 'Speak it', act: () => ctx.flash('Reading it aloud…') },
        ].map((a) => (
          <Pressable key={a.label} style={st.addBtn} onPress={a.act} accessibilityRole="button" accessibilityLabel={a.label}>
            <a.Icon size={21} color={T.green} strokeWidth={1.9} />
            <Text style={st.addLabel} allowFontScaling>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      {recent && (
        <View>
          <Text style={st.recentLabel} allowFontScaling>Recent check</Text>
          <Pressable style={st.recentCard} onPress={() => ctx.go('history')} accessibilityRole="button">
            <View style={[st.recentIcon, { backgroundColor: recentTint }]}>
              <RecentIcon size={17} color={recentColor} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.recentTitle} allowFontScaling numberOfLines={1}>{recent.excerpt.slice(0, 30)}{recent.excerpt.length > 30 ? '…' : ''}</Text>
              <Text style={st.recentMeta} allowFontScaling>{recentMeta}</Text>
            </View>
            <ChevronRight size={17} color={T.muted} strokeWidth={2.2} />
          </Pressable>
        </View>
      )}
      <View style={{ height: 110 }} />
    </ScrollView>
    </KFIn>
  );
}

function when(at: number): string {
  const d = new Date(at), now = new Date();
  const hm = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  return d.toDateString() === now.toDateString() ? 'today, ' + hm : hm;
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingHorizontal: 20, paddingBottom: 2 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandText: { fontSize: 13, fontFamily: F.bold, letterSpacing: 0.65, color: T.green },
  gear: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: -9 },

  careStripWrap: { paddingHorizontal: 20, paddingTop: 12 },
  careStrip: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: T.greenTint, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  careAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  careAvatarText: { color: '#fff', fontSize: 12, fontFamily: F.semibold },
  careTitle: { fontSize: 14, fontFamily: F.semibold, color: T.greenInk },
  careSub: { fontSize: 12.5, fontFamily: F.body, color: T.greenInk2, marginTop: 1 },

  head: { paddingHorizontal: 20, paddingTop: 12 },
  greeting: { fontSize: 14, fontFamily: F.body, color: T.sub },
  title: { fontSize: 23, fontFamily: F.display, letterSpacing: -0.41, color: T.ink, marginTop: 2, lineHeight: 26 },

  card: {
    marginHorizontal: 20, marginTop: 14, backgroundColor: T.surface,
    borderWidth: 1, borderColor: T.hairline, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  box: { minHeight: 124, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, lineHeight: 24, fontFamily: F.body, color: T.ink, textAlignVertical: 'top' },
  pasteRow: { paddingHorizontal: 16, paddingBottom: 10 },
  pasteText: { fontSize: 14, fontFamily: F.semibold, color: T.green },
  checkBtn: { height: 54, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  checkText: { fontSize: 16, fontFamily: F.bold, color: '#fff' },

  orLabel: { paddingHorizontal: 20, paddingTop: 18, fontSize: 13, fontFamily: F.body, color: T.sub },
  addRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 8 },
  addBtn: { flex: 1, borderRadius: 12, paddingTop: 11, paddingBottom: 12, alignItems: 'center', gap: 7 },
  addLabel: { fontSize: 12.5, fontFamily: F.semibold, color: T.ink },

  recentLabel: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8, fontSize: 12.5, fontFamily: F.semibold, color: T.sub },
  recentCard: {
    marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, padding: 15,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  recentIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  recentTitle: { fontSize: 15, fontFamily: F.semibold, color: T.ink },
  recentMeta: { fontSize: 13, fontFamily: F.body, color: T.sub, marginTop: 2 },
});
