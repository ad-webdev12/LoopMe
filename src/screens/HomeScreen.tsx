// Check a message (home). Screenshot/Photo run real on-device OCR (Vision);
// Speak it runs real on-device speech recognition. Nothing leaves the phone.
// The strip under the title is the running tally: what the app, the text
// filter and the share sheet have caught, so the person can see it working
// even on the days nothing happens.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import {
  Shield, Settings as Cog, ChevronRight, ArrowRight, Image as Img, Mic,
} from 'lucide-react-native';
import { T, F } from '../theme';
import { recognizeText, listenOnce, stopListening, callDirectoryStatus } from '../../modules/scam-ai';
import { timeLabel } from '../lib/clock';
import type { Ctx } from '../App';

export default function HomeScreen({ ctx }: { ctx: Ctx }) {
  const [text, setText] = useState('');
  const [clip, setClip] = useState(false);
  const [listening, setListening] = useState(false);

  const fromImage = async (camera: boolean) => {
    try {
      const perm = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { ctx.flash(camera ? 'Camera access is needed to photograph a message.' : 'Photo access is needed to read a screenshot.'); return; }
      const res = camera
        ? await ImagePicker.launchCameraAsync({ quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;
      ctx.flash('Reading the words, on this phone…');
      const found = (await recognizeText(uri)).trim();
      if (found) { setText(found); ctx.check(found); }
      else ctx.flash('We could not find any words in that picture. Try a clearer one.');
    } catch {
      ctx.flash('Could not read that picture. Paste the text instead.');
    }
  };

  const speakIt = async () => {
    if (listening) { stopListening(); return; }
    setListening(true);
    ctx.flash('Listening. Say the message, then pause.');
    const heard = (await listenOnce()).trim();
    setListening(false);
    if (heard) { setText(heard); ctx.check(heard); }
    else ctx.flash('We could not hear that. You can also paste or type the message.');
  };
  const s = ctx.settings;
  const careMode = s.role === 'caretaker';
  const first = (s.myName || '').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening') + (first ? ', ' + first : '');
  const watchName = s.watching?.name?.split(' ')[0] || 'them';
  const today = new Date().toDateString();
  const flaggedToday = ctx.hist.filter(h => h.source === 'family' && h.level !== 'green' && new Date(h.at).toDateString() === today).length;
  const p = ctx.pulse;
  const seenLabel = p ? (new Date(p.at).toDateString() === today ? 'seen today' : 'last seen ' + new Date(p.at).toLocaleDateString(undefined, { weekday: 'long' })) : '';
  const careSub = !s.familyLinked ? 'Not linked yet. Tap to see how.'
    : flaggedToday === 0 ? (p && p.checked7 === 0 ? 'A quiet week so far' : 'Nothing flagged on their phone today') + (seenLabel ? ', ' + seenLabel : '')
    : flaggedToday === 1 ? '1 text flagged on their phone today'
    : flaggedToday + ' texts flagged on their phone today';
  const recent = ctx.hist.find(h => h.source !== 'family');
  const recentMeta = recent
    ? ({ red: 'Scam stopped', amber: 'Needed a second look', green: 'Came back clear' }[recent.level] || '') + ' · ' + when(recent.at)
    : '';

  // The month so far: everything checked here, plus what the text filter and
  // the share sheet did on their own. Real counts, nothing padded.
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const mine = ctx.hist.filter(h => h.source !== 'family' && h.at >= monthStart.getTime());
  const stopped = mine.filter(h => h.level === 'red').length;
  const beforeYou = mine.filter(h => h.source === 'filter' && h.level === 'red').length;
  const since = s.installedAt ? new Date(s.installedAt) : null;
  const sinceLabel = since ? since.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : '';

  useEffect(() => {
    Clipboard.hasStringAsync().then(setClip).catch(() => {});
    callDirectoryStatus().then(setCalls).catch(() => {});
  }, []);
  const [calls, setCalls] = useState<'enabled' | 'disabled' | 'unknown'>('unknown');

  // What is running right now, in real state. A quiet day should read as
  // protection, not as an empty screen.
  const filterOn = Date.now() - (ctx.tallies.lastFilteredAt || 0) < 7 * 86400000;
  const callsOn = calls === 'enabled';
  const watchedBy = s.familyLinked && s.familyRole === 'owner' ? (s.watchedBy || '').split(' ')[0] : '';
  const flaggedForMeToday = ctx.hist.filter(h => h.source !== 'family' && h.level !== 'green' && new Date(h.at).toDateString() === today).length;
  const nowLine = !filterOn && !callsOn && !watchedBy
    ? 'Nothing is running on its own yet. Tap to switch it on.'
    : flaggedForMeToday > 0
      ? (flaggedForMeToday === 1 ? 'One text today needed a look. ' : flaggedForMeToday + ' texts today needed a look. ') + ''
      : filterOn ? 'Unknown texts are checked before they reach you.' : 'Nothing today needed a look.';
  const pills: { label: string; on: boolean }[] = careMode ? [] : [
    { label: 'Unknown texts', on: filterOn },
    { label: 'Scam callers', on: callsOn },
    { label: watchedBy ? 'Watched by ' + watchedBy : 'Watched by no one', on: !!watchedBy },
  ];

  const recents = ctx.hist.filter(h => h.source !== 'family').slice(0, 3);
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const anyOn = filterOn || callsOn || !!watchedBy;
  const onBits = [filterOn ? 'Watching unknown texts' : '', callsOn ? 'Blocking scam callers' : '', watchedBy ? 'Watched by ' + watchedBy : ''].filter(Boolean);
  const statusLine = careMode ? '' : !anyOn ? 'Nothing is running on its own yet. Tap to switch it on.' : onBits.join('  ·  ') + (onBits.length < 3 ? '  ·  Tap for the rest' : '');
  const monthLine = mine.length === 0 ? ''
    : mine.length + (mine.length === 1 ? ' text checked' : ' texts checked') + ' this month'
      + (stopped ? ', ' + stopped + (stopped === 1 ? ' scam stopped' : ' scams stopped') : '')
      + (beforeYou ? ', ' + beforeYou + ' before you saw ' + (beforeYou === 1 ? 'it' : 'them') : '') + '.';

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={st.root} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={st.brandRow}>
        <View style={st.brand}>
          <Shield size={16} color={T.green} strokeWidth={2} />
          <Text style={st.brandText} allowFontScaling>LOOP ME</Text>
        </View>
        <Pressable style={st.gear} onPress={() => ctx.go('settings')} accessibilityRole="button" accessibilityLabel="Settings">
          <Cog size={20} color={T.sub} strokeWidth={1.9} />
        </Pressable>
      </View>

      <View style={st.head}>
        <Text style={st.title} allowFontScaling>{greeting}.</Text>
        <Text style={st.date} allowFontScaling>{dateLine}</Text>
      </View>

      {careMode && (
        <Pressable style={st.careRow} onPress={() => ctx.go(s.familyLinked ? 'ward' : 'watch')} accessibilityRole="button">
          <View style={st.careAvatar}><Text style={st.careAvatarText} allowFontScaling>{watchName[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={st.careTitle} allowFontScaling>{watchName}</Text>
            <Text style={st.careSub} allowFontScaling>{careSub}</Text>
          </View>
          <ChevronRight size={18} color={T.muted} strokeWidth={2} />
        </Pressable>
      )}

      <View style={st.hero}>
        <TextInput
          style={st.box} multiline
          placeholder="Paste the text here"
          placeholderTextColor={T.muted}
          value={text} onChangeText={setText}
          accessibilityLabel="Message to check"
        />
        {clip && !text.trim() && (
          <Pressable style={st.pasteRow} onPress={async () => { try { const c = (await Clipboard.getStringAsync())?.trim(); if (c) setText(c); } catch {} }} accessibilityRole="button">
            <Text style={st.pasteText} allowFontScaling>Paste what I copied</Text>
          </Pressable>
        )}
        <Pressable style={[st.checkBtn, ctx.checking && { opacity: 0.75 }]} onPress={() => { if (!ctx.checking) ctx.check(text); }} accessibilityRole="button" accessibilityLabel="Check it">
          <Text style={st.checkText} allowFontScaling>{ctx.checking ? 'Checking' : 'Check it'}</Text>
          {ctx.checking ? <ActivityIndicator color="#fff" /> : <ArrowRight size={20} color="#fff" strokeWidth={2.2} />}
        </Pressable>
      </View>

      <View style={st.altRow}>
        <Pressable style={st.alt} onPress={speakIt} accessibilityRole="button" accessibilityLabel="Say it instead">
          <Mic size={17} color={listening ? T.red : T.green} strokeWidth={2} />
          <Text style={[st.altText, listening && { color: T.red }]} allowFontScaling>{listening ? 'Listening' : 'Say it instead'}</Text>
        </Pressable>
        <View style={st.altDot} />
        <Pressable style={st.alt} onPress={() => fromImage(false)} accessibilityRole="button" accessibilityLabel="From a screenshot">
          <Img size={17} color={T.green} strokeWidth={2} />
          <Text style={st.altText} allowFontScaling>From a screenshot</Text>
        </Pressable>
      </View>

      {!careMode && (
        <Pressable style={st.status} onPress={() => ctx.go('switches')} accessibilityRole="button" accessibilityLabel="What is running right now">
          <View style={[st.statusDot, { backgroundColor: anyOn ? T.green : T.amber }]} />
          <Text style={st.statusText} allowFontScaling numberOfLines={2}>{statusLine}</Text>
          <ChevronRight size={16} color={T.muted} strokeWidth={2} />
        </Pressable>
      )}

      {!careMode && ctx.hist.length === 0 && (
        <Pressable style={st.tryRow} onPress={() => ctx.check('Your parcel is held at the depot. A redelivery fee of 1.99 is due. Pay within 24 hours at bit.ly/x8s2 or it will be returned.')} accessibilityRole="button">
          <Text style={st.tryText} allowFontScaling>See what a scam text looks like</Text>
          <ArrowRight size={17} color={T.green} strokeWidth={2.2} />
        </Pressable>
      )}

      {recents.length > 0 && (
        <View style={st.recentWrap}>
          <View style={st.recentHead}>
            <Text style={st.sectionLabel} allowFontScaling>Recent</Text>
            <Pressable onPress={() => ctx.go('history')} accessibilityRole="button"><Text style={st.seeAll} allowFontScaling>All</Text></Pressable>
          </View>
          {recents.map((r, i) => (
            <Pressable key={r.id} style={[st.recentRow, i === recents.length - 1 && { borderBottomWidth: 0 }]} onPress={() => ctx.go('history')} accessibilityRole="button">
              <View style={[st.levelDot, { backgroundColor: r.level === 'red' ? T.red : r.level === 'amber' ? T.amber : T.green }]} />
              <Text style={st.recentText} allowFontScaling numberOfLines={1}>{r.excerpt}</Text>
              <Text style={st.recentWhen} allowFontScaling>{when(r.at)}</Text>
            </Pressable>
          ))}
          {!!monthLine && <Text style={st.month} allowFontScaling>{monthLine}{sinceLabel ? ' Looking out for you since ' + sinceLabel + '.' : ''}</Text>}
        </View>
      )}
      <View style={{ height: 110 }} />
    </ScrollView>
    </View>
  );
}

function when(at: number): string {
  const d = new Date(at), now = new Date();
  const hm = timeLabel(d);
  if (d.toDateString() === now.toDateString()) return hm;
  if (now.getTime() - at < 6 * 86400000) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingHorizontal: 24, paddingBottom: 2 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandText: { fontSize: 12.5, fontFamily: F.bold, letterSpacing: 1.1, color: T.green },
  gear: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  head: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 18 },
  title: { fontSize: 34, fontFamily: F.display, letterSpacing: -0.9, color: T.ink, lineHeight: 38 },
  date: { fontSize: 16, fontFamily: F.body, color: T.sub, marginTop: 6 },

  careRow: { marginHorizontal: 24, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.hairline },
  careAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  careAvatarText: { color: '#fff', fontSize: 15, fontFamily: F.bold },
  careTitle: { fontSize: 17, fontFamily: F.bold, color: T.ink },
  careSub: { fontSize: 14.5, fontFamily: F.body, color: T.sub, marginTop: 1 },

  hero: { marginHorizontal: 24, backgroundColor: T.surface, borderRadius: 18, borderWidth: 1, borderColor: T.hairline, overflow: 'hidden' },
  box: { minHeight: 168, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, fontSize: 19, fontFamily: F.body, color: T.ink, lineHeight: 28, textAlignVertical: 'top' },
  pasteRow: { paddingHorizontal: 20, paddingBottom: 14 },
  pasteText: { fontSize: 16.5, fontFamily: F.semibold, color: T.green },
  checkBtn: { height: 62, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 },
  checkText: { fontSize: 19, fontFamily: F.bold, color: '#fff' },

  altRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 16, paddingHorizontal: 24 },
  alt: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 40 },
  altText: { fontSize: 16, fontFamily: F.semibold, color: T.green },
  altDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: T.muted },

  status: { marginHorizontal: 24, marginTop: 26, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.hairline },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { flex: 1, fontSize: 15, fontFamily: F.medium, color: T.ink2, lineHeight: 21 },

  tryRow: { marginHorizontal: 24, marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tryText: { fontSize: 17, fontFamily: F.semibold, color: T.green },

  recentWrap: { marginHorizontal: 24, marginTop: 26 },
  recentHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  sectionLabel: { fontSize: 13, fontFamily: F.semibold, color: T.sub, letterSpacing: 0.4, textTransform: 'uppercase' },
  seeAll: { fontSize: 15, fontFamily: F.semibold, color: T.green },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.hairline },
  levelDot: { width: 9, height: 9, borderRadius: 5 },
  recentText: { flex: 1, fontSize: 16.5, fontFamily: F.body, color: T.ink },
  recentWhen: { fontSize: 14, fontFamily: F.body, color: T.sub },
  month: { marginTop: 14, fontSize: 15, fontFamily: F.body, color: T.sub, lineHeight: 22 },
});
