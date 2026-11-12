// Check (Home). Green header with the loop pill, the date, the rotating
// headline, the clipboard as a bubble, one big button and three ways in.
// Below: the protection status, then two tiles. Every value from the handoff.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowRight, Camera, Mic, Keyboard, PhoneIncoming, LifeBuoy, Ear } from 'lucide-react-native';
import { T, font } from '../theme';
import { APP_ICON, Avatar, PulseDot, Screen, usePulse } from '../ui/base';
import { loopPerson, firstName } from '../ui/pieces';
import { recognizeText, listenOnce, stopListening, callDirectoryStatus, latestScreenshot } from '../../modules/scam-ai';
import type { Ctx } from '../App';

const HEADLINES = ['Not sure about a message?', 'Check if a message is a scam', 'Got a text that worries you?', 'Is this message real?'];

export default function HomeScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const [clip, setClip] = useState('');
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [listening, setListening] = useState(false);
  const [calls, setCalls] = useState<'enabled' | 'disabled' | 'unknown'>('unknown');
  const [shot, setShot] = useState<{ uri: string; at: number } | null>(null);
  const careMode = s.role === 'caretaker';

  const headline = HEADLINES[Math.floor(Date.now() / 9_000_000) % HEADLINES.length];
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  // hasStringAsync never shows the system paste alert; the text itself is
  // read only when they tap Check, so the alert comes from their own tap.
  const [hasClip, setHasClip] = useState(false);
  const readClip = async () => {
    try { setHasClip(await Clipboard.hasStringAsync()); } catch { setHasClip(false); }
  };
  const lookForScreenshot = async () => {
    try {
      const seen = Number(await AsyncStorage.getItem('loopmein.shot.seen')) || 0;
      const found = await latestScreenshot(Math.max(seen, Date.now() - 15 * 60000));
      if (found && found.at > seen) setShot(found);
    } catch {}
  };
  useEffect(() => {
    void readClip(); void lookForScreenshot();
    callDirectoryStatus().then(setCalls).catch(() => {});
    const sub = AppState.addEventListener('change', st => { if (st === 'active') { void readClip(); void lookForScreenshot(); callDirectoryStatus().then(setCalls).catch(() => {}); } });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filterOn = ctx.tallies.filtered > 0;
  const callsOn = calls === 'enabled';
  const permsDone = filterOn && callsOn;
  const weekStart = Date.now() - 7 * 86400000;
  const stoppedWeek = ctx.hist.filter(h => h.source !== 'family' && h.level === 'red' && h.at >= weekStart).length;

  const people = [loopPerson(s), ...s.trusted.filter(t => t.name !== loopPerson(s)?.name)].filter(Boolean).slice(0, 2) as { name: string; photo?: string }[];
  const pillText = people.length === 0 ? 'Nobody in your loop yet'
    : people.length === 1 ? firstName(people[0].name) + ' is in your loop'
    : firstName(people[0].name) + ' and ' + firstName(people[1].name) + ' are in your loop';

  const checkClip = async () => {
    if (clip) { ctx.check(clip); return; }
    if (hasClip) {
      try {
        const t = (await Clipboard.getStringAsync() || '').trim();
        if (t.length > 3) { setClip(t); ctx.check(t); return; }
      } catch {}
    }
    setTyping(true);
  };
  const photo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { ctx.flash('Photo access is needed to read a screenshot.'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;
      const found = (await recognizeText(uri)).trim();
      if (found) ctx.check(found); else ctx.flash('No words found in that picture. Try a clearer one.');
    } catch { ctx.flash('Could not read that picture. Paste the text instead.'); }
  };
  const sayIt = async () => {
    if (listening) { stopListening(); setListening(false); return; }
    setListening(true);
    const heard = (await listenOnce()).trim();
    setListening(false);
    if (heard) ctx.check(heard); else ctx.flash('We could not hear that. Try again, or type it.');
  };
  const checkShot = async () => {
    if (!shot) return;
    const uri = shot.uri;
    try { await AsyncStorage.setItem('loopmein.shot.seen', String(shot.at)); } catch {}
    setShot(null);
    try {
      const found = (await recognizeText(uri)).trim();
      if (found) ctx.check(found); else ctx.flash('No words found in that screenshot.');
    } catch { ctx.flash('Could not read that screenshot.'); }
  };

  const warnBg = usePulse(T.redTint, T.redPulse);
  useEffect(() => { if (ctx.pendingPhoto) { ctx.clearPendingPhoto(); void photo(); } }, [ctx.pendingPhoto]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen C={C} playKey="home">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <View style={st.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10 }}>
            <Image source={APP_ICON} style={st.appIcon} />
            <Pressable onPress={() => ctx.go(careMode ? 'ward' : 'family')} style={({ pressed }) => [st.pill, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Family">
              <View style={{ flexDirection: 'row' }}>
                {people.map((p, i) => (
                  <View key={i} style={i > 0 ? { marginLeft: p.photo ? -10 : -4 } : undefined}><Avatar name={p.name} photo={p.photo} size={30} ring="#fff" /></View>
                ))}
              </View>
              <Text style={[font(14, '600', 1.2), { color: '#3c3c43' }]} numberOfLines={1} allowFontScaling={false}>{pillText}</Text>
            </Pressable>
          </View>
          <Text style={[font(15, '600'), { color: '#fff', marginTop: 24 }]} allowFontScaling>{date}</Text>
          <Text style={[font(38, '800', 1.02, -1), { color: '#fff', marginTop: 6 }]} allowFontScaling>{headline}</Text>
          {!!clip ? (
            <>
              <Text style={[font(14, '600'), { color: '#fff', marginTop: 20, marginBottom: 6, marginLeft: 6 }]} allowFontScaling>You copied this</Text>
              <View style={st.clipBubble}>
                <Text style={[font(16, '400', 1.38), { color: '#000' }]} allowFontScaling numberOfLines={6}>{clip}</Text>
              </View>
            </>
          ) : hasClip ? (
            <Text style={[font(14, '600'), { color: '#fff', marginTop: 20, marginLeft: 6 }]} allowFontScaling>You copied something. Tap below to check it.</Text>
          ) : null}
          {!!shot && (
            <Pressable onPress={checkShot} style={({ pressed }) => [st.shotRow, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <Text style={[font(14, '600'), { color: '#fff' }]} allowFontScaling>Check the screenshot you just took</Text>
              <ArrowRight size={16} color="#fff" strokeWidth={2.2} />
            </Pressable>
          )}
          <Pressable onPress={checkClip} style={({ pressed }) => [st.primary, pressed && { transform: [{ scale: 0.98 }] }]} accessibilityRole="button">
            <Text style={[font(19, '700'), { color: T.greenDeep }]} allowFontScaling>{clip || hasClip ? 'Check this message' : 'Check a message'}</Text>
            <View style={st.arrowBox}><ArrowRight size={20} color="#fff" strokeWidth={2.4} /></View>
          </Pressable>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <Alt Icon={Camera} label="Take a photo" onPress={photo} />
            <Alt Icon={Mic} label={listening ? 'Listening' : 'Say it'} onPress={sayIt} />
            <Alt Icon={Keyboard} label="Type it" onPress={() => setTyping(true)} />
          </View>
        </View>

        <View style={{ paddingTop: 14, paddingHorizontal: 16, gap: 10 }}>
          {!careMode && (permsDone ? (
            <View style={[st.status, { backgroundColor: C.card }]}>
              <PulseDot color={T.green} still />
              <Text style={[font(16, '600', 1.3), { color: C.ink, flex: 1 }]} allowFontScaling>
                Scam texts and calls are blocked.{stoppedWeek > 0 ? ' ' + stoppedWeek + ' stopped this week.' : ''}
              </Text>
            </View>
          ) : (
            <Pressable onPress={() => ctx.go('setup')} accessibilityRole="button">
              <Animated.View style={[st.status, { backgroundColor: warnBg }]}>
                <PulseDot />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[font(16, '600', 1.3), { color: T.redInk }]} allowFontScaling>Scam texts and calls aren’t blocked yet</Text>
                  <Text style={[font(14.5, '400', 1.35), { color: T.redInk, marginTop: 2 }]} allowFontScaling>Allow {filterOn || callsOn ? '1 iPhone permission' : '2 iPhone permissions'} to block them</Text>
                </View>
                <View style={st.allow}><Text style={[font(15, '600'), { color: '#fff' }]} allowFontScaling>Allow</Text></View>
              </Animated.View>
            </Pressable>
          ))}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => ctx.go('callcheck')} style={({ pressed }) => [st.tile, { backgroundColor: C.card }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <PhoneIncoming size={22} color={T.green} strokeWidth={2} />
              <Text style={[font(16, '600', 1.25), { color: C.ink, marginTop: 10 }]} allowFontScaling>It was a phone call</Text>
            </Pressable>
            <Pressable onPress={() => ctx.go('scammed')} style={({ pressed }) => [st.tile, { backgroundColor: C.card }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <LifeBuoy size={22} color={T.red} strokeWidth={2} />
              <Text style={[font(16, '600', 1.25), { color: T.redText, marginTop: 10 }]} allowFontScaling>I think I’ve been scammed</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => ctx.go('listen')} style={({ pressed }) => [st.tile, { backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', gap: 12 }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <Ear size={22} color={T.green} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={[font(16, '600', 1.25), { color: C.ink }]} allowFontScaling>Listen to a call or a voicemail</Text>
              <Text style={[font(15, '400'), { color: C.ink2, marginTop: 2 }]} allowFontScaling>Hold the phone near the voice.</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={typing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTyping(false)}>
        <View style={{ flex: 1, backgroundColor: C.ground, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={() => setTyping(false)} accessibilityRole="button"><Text style={[font(17, '400'), { color: T.green }]} allowFontScaling>Cancel</Text></Pressable>
            <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>Type the message</Text>
            <Pressable onPress={() => { setTyping(false); if (typed.trim()) ctx.check(typed.trim()); }} accessibilityRole="button"><Text style={[font(17, '600'), { color: T.green }]} allowFontScaling>Check</Text></Pressable>
          </View>
          <TextInput value={typed} onChangeText={setTyped} multiline autoFocus placeholder="Type or paste the text here" placeholderTextColor={C.meta}
            style={[font(18, '400', 1.4), { color: C.ink, backgroundColor: C.card, borderRadius: 16, padding: 16, marginTop: 16, minHeight: 180, textAlignVertical: 'top' }]} />
        </View>
      </Modal>
    </Screen>
  );
}

function Alt({ Icon, label, onPress }: { Icon: typeof Camera; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={label}>
      <Icon size={18} color="#fff" strokeWidth={2} />
      <Text style={[font(15, '600'), { color: '#fff' }]} allowFontScaling>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: T.green, paddingTop: 0, paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  appIcon: { width: 46, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.25)' },
  pill: { marginLeft: 'auto', height: 40, borderRadius: 20, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 5, paddingRight: 12, flexShrink: 1 },
  clipBubble: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 5, paddingTop: 10, paddingHorizontal: 14, paddingBottom: 11, maxWidth: 300, alignSelf: 'flex-start' },
  shotRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: { height: 62, borderRadius: 16, backgroundColor: '#fff', marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 22, paddingRight: 8 },
  arrowBox: { width: 46, height: 46, borderRadius: 11, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  status: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  allow: { height: 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center' },
  tile: { flex: 1, borderRadius: 14, padding: 14 },
});
