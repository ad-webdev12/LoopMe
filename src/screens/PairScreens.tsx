// The family link, both ends, in the redesign's grouped-card style.
//   WatchedBy  the protected phone: choose someone, send the invite (text,
//              QR code or AirDrop), see who is linked, stop the link.
//   WatchSetup the phone that hears about it: what to do until the invite
//              arrives, and the linked state afterwards.
//   WatchWait  the moment between tapping the invite and the link confirming.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, X, Send, QrCode, Share2, Phone, UserPlus } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, ScreenTitle, Lead, Note, Pill, Avatar, Card, SectionHeader, CheckCircle } from '../ui/base';
import { loopPerson, firstName } from '../ui/pieces';
import { sendSms, inviteText } from '../lib/familyLink';
import { inviteLink } from '../lib/invite';
import { cloudAccountState, cloudJoinWithCode } from '../../modules/scam-ai';
import { InviteCodeSheet } from '../ui/InviteCodeSheet';
import { pickTrustedPerson } from '../lib/contacts';
import type { Ctx } from '../App';

// ---------------- Protected phone: who hears about it ----------------
export function WatchedBy({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const [account, setAccount] = useState<'available' | 'noAccount' | 'restricted' | 'unknown' | null>(null);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const linked = s.familyLinked && s.familyRole === 'owner';
  const person = loopPerson(s);
  const who = firstName(person?.name);

  useEffect(() => { cloudAccountState().then(setAccount); }, []);
  useEffect(() => {
    if (!s.familyInvited || linked) return;
    const iv = setInterval(() => { void ctx.refreshFamily(); }, 4000);
    return () => clearInterval(iv);
  }, [s.familyInvited, linked, ctx]);

  const inviteUrl = async (): Promise<string | null> => {
    const r = await inviteLink(s);
    if (!r.ok) { ctx.flash(r.error); if (r.noAccount) setAccount('noAccount'); return null; }
    ctx.update({ ...s, familyInvited: true });
    return r.url;
  };
  const sendInvite = async () => {
    setBusy(true);
    try {
      const url = await inviteUrl();
      if (!url) return;
      const res = await pickTrustedPerson();
      const to = res.ok ? res.person : null;
      if (to) ctx.update({ ...s, familyInvited: true, trusted: s.trusted.some(t => t.phone === to.phone) ? s.trusted.map(t => t.phone === to.phone ? { ...t, invited: true } : t) : [{ ...to, invited: true }, ...s.trusted].slice(0, 3) });
      const r = await inviteLink(s);
      await sendSms(to?.phone || null, inviteText(s.myName || s.careName, url, r.ok ? r.code : undefined));
    } finally { setBusy(false); }
  };
  const showCode = () => setQr('open');
  const airdrop = async () => { setBusy(true); try { const url = await inviteUrl(); if (url) await Share.share({ url, message: 'Loop Me invite' }); } finally { setBusy(false); } };

  return (
    <Screen C={C} playKey={linked ? 'linked' : 'open'}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <BackLink onPress={() => ctx.go('family')} />
        {linked ? (
          <>
            <View style={{ alignItems: 'center', paddingTop: 10, paddingHorizontal: 20 }}>
              <Avatar name={person?.name || who} photo={person?.photo} size={104} />
              <Text style={[font(24, '700'), { color: C.ink, marginTop: 12, textAlign: 'center' }]} allowFontScaling>{who} is looking out for you</Text>
              <Text style={[font(16, '400', 1.45), { color: C.ink2, marginTop: 8, textAlign: 'center' }]} allowFontScaling>When a text on this phone looks like a scam, it appears on {who}’s phone straight away, and what {who} says appears here.</Text>
            </View>
            <SectionHeader C={C}>What {who} sees</SectionHeader>
            <Card C={C} style={{ marginHorizontal: 16, paddingVertical: 4 }} radius={16}>
              <Row C={C} yes text="Texts that were flagged, and what you were told to do" />
              <Row C={C} yes text="Anything you choose to send with Ask" />
              <Row C={C} yes={false} text="Never your ordinary messages, photos, calls or where you are" last />
            </Card>
            <Note C={C}>Runs on your own iCloud. Nobody in the middle.</Note>
            <View style={{ paddingHorizontal: 16, paddingTop: 22 }}>
              <Pill label={'Stop ' + who + ' hearing from this phone'} height={54} bg={C.card} color={C.redText} onPress={() => ctx.unlinkFamily('share')} />
            </View>
          </>
        ) : (
          <>
            <ScreenTitle C={C}>Who should hear when a scam lands?</ScreenTitle>
            <Lead C={C}>They get one text with a link. Tapping it joins their phone to this one. After that, nothing is ever texted.</Lead>
            {s.familyInvited && (
              <Card C={C} style={{ marginHorizontal: 16, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }} radius={16}>
                <ActivityIndicator color={C.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>Waiting for them to tap the link</Text>
                  <Text style={[font(15, '400'), { color: C.ink2, marginTop: 2 }]} allowFontScaling>This fills in on its own when they do.</Text>
                </View>
              </Card>
            )}
            <SectionHeader C={C}>What they will and will not see</SectionHeader>
            <Card C={C} style={{ marginHorizontal: 16, paddingVertical: 4 }} radius={16}>
              <Row C={C} yes text="Texts that were flagged, and what you were told to do" />
              <Row C={C} yes text="A way to send you a short note that shows up full screen" />
              <Row C={C} yes={false} text="Never your ordinary messages, photos, calls or where you are" last />
            </Card>
            {account === 'noAccount' || account === 'restricted' ? (
              <Card C={C} style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: C.redTint }} radius={16}>
                <Text style={[font(17, '600'), { color: T.redInk }]} allowFontScaling>This phone is not signed in to iCloud</Text>
                <Text style={[font(15, '400', 1.4), { color: T.redInk, marginTop: 4 }]} allowFontScaling>Sign in to iCloud under Settings › your name, then come back.</Text>
                <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button"><Text style={[font(15, '600'), { color: C.redText, marginTop: 10 }]} allowFontScaling>Open iPhone Settings ›</Text></Pressable>
              </Card>
            ) : (
              <Note C={C}>Runs on your own iCloud. Stop it here any time.</Note>
            )}
            <InviteCodeSheet C={C} settings={s} visible={qr === 'open'} onClose={() => setQr(null)} onReady={() => { if (!s.familyInvited) ctx.update({ ...ctx.settings, familyInvited: true }); }} joining={!!ctx.request} />
            <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 10 }}>
              <Pill label={s.familyInvited ? 'Send the invite again' : 'Choose someone and send the invite'} disabled={busy} onPress={sendInvite} icon={busy ? <ActivityIndicator color="#fff" /> : <Send size={19} color="#fff" strokeWidth={2.2} />} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pill label="Show a code" height={50} bg={C.card} color={C.accent} style={{ flex: 1 }} disabled={busy} onPress={showCode} icon={<QrCode size={18} color={C.accent} strokeWidth={2} />} />
                <Pill label="AirDrop it" height={50} bg={C.card} color={C.accent} style={{ flex: 1 }} disabled={busy} onPress={airdrop} icon={<Share2 size={18} color={C.accent} strokeWidth={2} />} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({ C, yes, text, last }: { C: Ctx['C']; yes: boolean; text: string; last?: boolean }) {
  return (
    <View style={[{ flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'flex-start' }, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep }]}>
      {yes ? <Check size={18} color={C.accent} strokeWidth={2.4} style={{ marginTop: 2 }} /> : <X size={18} color={T.red} strokeWidth={2.4} style={{ marginTop: 2 }} />}
      <Text style={[font(16, '400', 1.4), { color: C.ink, flex: 1 }]} allowFontScaling>{text}</Text>
    </View>
  );
}

// ---------------- The phone that hears about it ----------------
export function WatchSetup({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const paired = !!s.watching?.name;
  const setUp = s.introSeen && !!s.role;
  const watchName = firstName(s.watching?.name) || 'them';
  const hasPhone = !!s.watching?.phone;
  const addPhone = async () => {
    const res = await pickTrustedPerson();
    if (!res.ok) { if (res.reason) ctx.flash(res.reason); return; }
    ctx.update({ ...s, watching: { name: s.watching?.name || res.person.name, phone: res.person.phone, photo: res.person.photo } });
  };
  // The code box sits mid-page: when the keyboard comes up, scroll it into view.
  const scroll = useRef<ScrollView>(null);
  const codeY = useRef(0);
  const codeFocused = useRef(false);
  const toCodeBox = () => scroll.current?.scrollTo({ y: Math.max(0, codeY.current - 12), animated: true });
  const showCodeBox = () => { codeFocused.current = true; setTimeout(toCodeBox, 300); };
  // Scroll again once the keyboard is fully up, so the field, its note and the button all sit above it.
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => { if (codeFocused.current) toCodeBox(); });
    const b = Keyboard.addListener('keyboardDidHide', () => { codeFocused.current = false; });
    return () => { a.remove(); b.remove(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen C={C} playKey={paired ? 'done' : 'open'}>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <BackLink onPress={() => ctx.go(!setUp ? 'ob1' : s.role === 'caretaker' ? 'ward' : 'family')} />
        {!paired ? (
          <>
            <ScreenTitle C={C}>Type their code</ScreenTitle>
            <Lead C={C}>The 5 numbers from Loop Me on the phone you look after. They tap Yes on their phone, and you’re linked.</Lead>
            <View style={{ height: 14 }} onLayout={e => { codeY.current = e.nativeEvent.layout.y; }} />
            <JoinWithCode ctx={ctx} onFocus={showCodeBox} />
            <SectionHeader C={C}>Where they find the code</SectionHeader>
            <Card C={C} style={{ marginHorizontal: 16, paddingVertical: 4 }} radius={16}>
              {['On their phone, open Loop Me and go to Family', 'Tap “Link with a code instead”. The code and a QR code show up', 'Type the code here, or point this phone’s Camera at the QR code'].map((t, i) => (
                <View key={t} style={[{ flexDirection: 'row', gap: 14, paddingVertical: 12, alignItems: 'center' }, i < 2 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep }]}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.greenTint, alignItems: 'center', justifyContent: 'center' }}><Text style={[font(14, '700'), { color: C.accent }]} allowFontScaling>{i + 1}</Text></View>
                  <Text style={[font(16, '400', 1.4), { color: C.ink, flex: 1 }]} allowFontScaling>{t}</Text>
                </View>
              ))}
            </Card>
            <Note C={C}>Got a text with a link from them instead? Just tap the link.</Note>
            <SectionHeader C={C}>What you will and will not see</SectionHeader>
            <Card C={C} style={{ marginHorizontal: 16, paddingVertical: 4 }} radius={16}>
              <Row C={C} yes text="Scam alerts, full screen, the moment they happen" />
              <Row C={C} yes text="Three one-tap replies that appear on their screen" />
              <Row C={C} yes={false} text="Never their ordinary messages, photos or location" last />
            </Card>
            <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
              <Pill label="I will tap the link when it arrives" height={54} bg={C.card} color={C.ink} onPress={() => {
                // Waiting is a real state: this phone becomes the one that hears,
                // and its home (the Family tab) shows it is waiting for the invite.
                if (!setUp) ctx.update({ ...ctx.settings, role: 'caretaker', introSeen: true });
                ctx.go(setUp && s.role !== 'caretaker' ? 'family' : 'ward');
              }} />
            </View>
          </>
        ) : (
          <>
            <View style={{ alignItems: 'center', paddingTop: 10, paddingHorizontal: 20 }}>
              <Avatar name={s.watching?.name || '?'} photo={s.watching?.photo} size={104} />
              <Text style={[font(24, '700'), { color: C.ink, marginTop: 12 }]} allowFontScaling>You are looking after {watchName}</Text>
              <Text style={[font(16, '400', 1.45), { color: C.ink2, marginTop: 8, textAlign: 'center' }]} allowFontScaling>{s.watchApproved ? 'A flagged text takes over this screen. Your reply lands on theirs.' : 'Waiting for ' + watchName + ' to tap Yes on their phone.'}</Text>
            </View>
            <Card C={C} style={{ marginHorizontal: 16, marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }} radius={16} onPress={hasPhone ? undefined : addPhone}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.greenTint, alignItems: 'center', justifyContent: 'center' }}>
                {hasPhone ? <Phone size={18} color={C.accent} strokeWidth={2.2} /> : <UserPlus size={18} color={C.accent} strokeWidth={2.2} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>{hasPhone ? s.watching?.name : (s.watching?.name ? 'Add ' + watchName + '’s number' : 'Add their number')}</Text>
                <Text style={[font(15, '400'), { color: C.ink2, marginTop: 2 }]} allowFontScaling>{hasPhone ? s.watching?.phone : 'So the call button dials them.'}</Text>
              </View>
            </Card>
            <View style={{ paddingHorizontal: 16, paddingTop: 22, gap: 10 }}>
              <Pill label={s.watching?.name ? 'Open ' + watchName + '’s screen' : 'Open their screen'} onPress={() => ctx.go('ward')} />
              <Pill label={'Stop looking after ' + watchName} height={54} bg={C.card} color={C.redText} onPress={() => ctx.unlinkFamily('watch')} />
              <Text style={[font(15, '400', 1.4), { color: C.ink2, textAlign: 'center', marginTop: 4 }]} allowFontScaling>To look after someone else instead, stop this first. Then you can type their code.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

export function WatchWait({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  return (
    <Screen C={C} playKey="wait">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <ActivityIndicator color={C.accent} size="large" />
        <Text style={[font(24, '700'), { color: C.ink, marginTop: 20 }]} allowFontScaling>Joining their phone</Text>
        <Text style={[font(16, '400', 1.45), { color: C.ink2, marginTop: 8, textAlign: 'center' }]} allowFontScaling>Confirming the link. This takes a moment.</Text>
        <Pill label="Back" height={50} bg={C.card} color={C.ink} style={{ marginTop: 28, alignSelf: 'stretch' }} onPress={() => ctx.go('home')} />
      </View>
    </Screen>
  );
}

export { CheckCircle };

/** The code path: for a phone that installed Loop Me after the invite arrived. */
function JoinWithCode({ ctx, onFocus }: { ctx: Ctx; onFocus?: () => void }) {
  const { C } = ctx;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const clean = code;
  const onType = (t: string) => setCode(t.replace(/\D/g, '').slice(0, CODE_LEN));
  const join = async () => {
    setBusy(true);
    try {
      const r = await cloudJoinWithCode(clean);
      if ('error' in r) Alert.alert('Not linked', r.error);
      // Success: the native side announces "joined" and the app takes over from there.
    } finally { setBusy(false); }
  };
  return (
    <View>
      <Card C={C} style={{ marginHorizontal: 16 }} radius={16}>
        <TextInput value={code} onChangeText={onType} onFocus={onFocus} placeholder="5 numbers" keyboardType="number-pad" textContentType="oneTimeCode" maxLength={CODE_LEN} placeholderTextColor={C.dark ? "#636366" : "#a1a1a6"}
          autoCorrect={false} spellCheck={false}
          style={[font(28, code ? '700' : '400'), { color: C.ink, backgroundColor: C.ground, borderRadius: 12, height: 60, textAlign: 'center', letterSpacing: 8 }]} accessibilityLabel="Invite code" />
        <Pill label={busy ? 'Linking' : 'Link this phone'} height={52} style={{ marginTop: 12 }} disabled={busy || clean.length !== CODE_LEN} onPress={join} icon={busy ? <ActivityIndicator color="#fff" /> : undefined} />
      </Card>
    </View>
  );
}

/** Invite codes are five digits. */
const CODE_LEN = 5;
