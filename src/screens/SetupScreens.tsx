// Setup, three or four short screens on the app's own primitives.
// Ob1 which phone · Ob2 whose phone (caregiver) · Ob3 what stays here ·
// Ob4 the one person to tell. The contacts picker and the invite are real.
import { nameProblem, tidyName } from '../lib/names';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowRight, Check, Lock, Send, Smartphone, Users, WifiOff } from 'lucide-react-native';
import { sendInviteTo, markInvited } from '../lib/invite';
import { ensureNotificationPermission } from '../lib/notify';
import { T, font } from '../theme';
import { Screen, BackLink, ScreenTitle, Lead, Card, Row, Group, Pill, Segmented, Note, TextBtn, Avatar, APP_ICON, motionOff } from '../ui/base';
import { PermCard, TEXT_STEPS, CALL_STEPS, TEXT_FRAMES, TEXT_CAPTIONS, CALL_FRAMES, CALL_CAPTIONS } from './SetupScreen';
import { callDirectoryStatus } from '../../modules/scam-ai';
import { AppState, Linking } from 'react-native';
import { MessageCircle, Phone } from 'lucide-react-native';
import { pickTrustedPerson, samePhone } from '../lib/contacts';
import { RelationSheet } from '../ui/RelationSheet';
import type { TrustedPerson } from '../lib/storage';
import type { Ctx } from '../App';

/** Page dots from the design: 7px grey dots, the current one a 22px green bar. */
function Steps({ ctx, i, of }: { ctx: Ctx; i: number; of: number }) {
  const { C } = ctx;
  return (
    <View style={{ alignItems: 'center', paddingTop: 22 }} accessible accessibilityLabel={'Step ' + i + ' of ' + of}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: of }).map((_, k) => <View key={k} style={{ width: k === i - 1 ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: k === i - 1 ? T.green : (C.dark ? '#3a3a3c' : '#d1d1d6') }} />)}
      </View>
    </View>
  );
}
/** Back to the previous onboarding step. */
function ObBack({ ctx, to, inPage }: { ctx: Ctx; to: 'ob1' | 'ob2' | 'ob3' | 'ob4' | 'ob5'; inPage?: boolean }) {
  return <View style={{ marginTop: 6, alignSelf: 'stretch', marginHorizontal: inPage ? -28 : 0 }}><BackLink color={ctx.C.accent} onPress={() => ctx.go(to)} /></View>;
}
function Bottom({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <View style={{ marginTop: 'auto', paddingHorizontal: 28, paddingBottom: 42, paddingTop: 16 }}>
      <Primary label={label} onPress={onPress} disabled={disabled} />
    </View>
  );
}
/** The design's main button: 56 tall, fully round, 18/600 white on green. */
function Primary({ label, onPress, disabled, icon }: { label: string; onPress: () => void; disabled?: boolean; icon?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [st.primary, pressed && { opacity: 0.8 }, disabled && { opacity: 0.6 }]}>
      {icon}
      <Text style={[font(18, '600'), { color: '#fff' }]} allowFontScaling>{label}</Text>
    </Pressable>
  );
}
/** The quiet green link under it ("Not now"). */
function Quiet({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ minHeight: 48, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', paddingHorizontal: 16, marginTop: 6 }, pressed && { opacity: 0.6 }]}>
      <Text style={[font(17, '500'), { color: T.green, textAlign: 'center' }]} allowFontScaling>{label}</Text>
    </Pressable>
  );
}
/** Centered title + body, as on the design's setup screens. */
function Words({ C, title, body }: { C: Ctx['C']; title: string; body: string }) {
  return (
    <>
      <Text style={[font(32, '700', 1.08), { color: C.ink, letterSpacing: -0.6, textAlign: 'center', marginTop: 34 }]} allowFontScaling accessibilityRole="header">{title}</Text>
      <Text style={[font(17, '400', 1.45), { color: C.ink2, textAlign: 'center', marginTop: 14 }]} allowFontScaling>{body}</Text>
    </>
  );
}
// Same as the strip behind the status bar, so the page has no seam at the top.
const pageBg = (C: Ctx['C']) => C.ground;

// ---------------- Ob1: which phone is this? ----------------
export function Ob1({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  return (
    <Screen C={C} playKey="ob1" scroll>
      <Steps ctx={ctx} i={1} of={5} />
      <ScreenTitle C={C} top={18}>Which phone is this?</ScreenTitle>
      <Lead C={C}>Loop Me works in pairs. One phone is protected. One phone hears about it.</Lead>
      <Group C={C} style={{ marginHorizontal: 16, marginTop: 22 }}>
        <View style={{ paddingLeft: 16 }}>
          <Row C={C} chip={Smartphone} title="The phone to protect" sub="This is the phone that gets the texts." chevron titleWeight="600"
            onPress={() => { ctx.update({ ...ctx.settings, role: 'elder' }); ctx.go('ob2'); }} />
          <Row C={C} chip={Users} title="The phone that hears about it" sub="Someone else’s phone is protected. This one gets the alerts." chevron titleWeight="600" last
            onPress={() => ctx.go('watch')} />
        </View>
      </Group>
      <Note C={C} top={16}>Both? Pick the first. You can add the second later from Settings.</Note>
    </Screen>
  );
}

// ---------------- Ob2: whose phone is it? ----------------
export function Ob2({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const [name, setName] = useState(ctx.settings.careName);
  const [rel, setRel] = useState(ctx.settings.careRel || 'Mother');
  const [whose, setWhose] = useState<'mine' | 'theirs'>(ctx.settings.careName ? 'theirs' : 'mine');
  const [me, setMe] = useState(ctx.settings.myName);
  const problem = nameProblem(whose === 'mine' ? me : name);
  const [tried, setTried] = useState(false);
  const next = () => {
    setTried(true);
    if (problem) return;
    if (whose === 'mine') { ctx.update({ ...ctx.settings, careName: '', myName: tidyName(me) }); ctx.go('ob3'); return; }
    ctx.update({ ...ctx.settings, careName: tidyName(name), careRel: rel }); ctx.go('ob3');
  };
  const typed = (whose === 'mine' ? me : name).trim().length > 0;
  const hint = problem && (tried || typed) ? <Text style={[font(15, '500', 1.35), { color: C.redText, marginTop: 8 }]} allowFontScaling accessibilityLiveRegion="polite">{problem}</Text> : null;
  return (
    <Screen C={C} playKey="ob2" scroll>
      <ObBack ctx={ctx} to="ob1" />
      <Steps ctx={ctx} i={2} of={whose === 'theirs' ? 6 : 5} />
      <ScreenTitle C={C} top={18}>Whose phone is it?</ScreenTitle>
      <View style={{ marginTop: 22 }}>
        <Segmented C={C} options={['Mine', 'Someone I look after']} value={whose === 'mine' ? 'Mine' : 'Someone I look after'} onChange={v => setWhose(v === 'Mine' ? 'mine' : 'theirs')} />
      </View>
      {whose === 'mine' && (
        <Card C={C} style={{ marginHorizontal: 16, marginTop: 16 }} radius={16}>
          <Text style={[font(15, '600'), { color: C.ink, marginBottom: 8 }]} allowFontScaling>Your first name</Text>
          <TextInput style={[st.input, { backgroundColor: C.ground, color: C.ink }]} value={me} onChangeText={setMe} returnKeyType="done" onSubmitEditing={next} placeholder="First name" placeholderTextColor={C.dark ? "#636366" : "#a1a1a6"} accessibilityLabel="Your first name" autoCapitalize="words" textContentType="givenName" maxLength={30} />
          {hint}
          <Note C={C} top={10} style={{ paddingHorizontal: 0 }}>So the person you choose next knows who the alerts are about.</Note>
        </Card>
      )}
      {whose === 'theirs' && (
        <Card C={C} style={{ marginHorizontal: 16, marginTop: 16, gap: 16 }} radius={16}>
          <View>
            <Text style={[font(15, '600'), { color: C.ink, marginBottom: 8 }]} allowFontScaling>Their first name</Text>
            <TextInput style={[st.input, { backgroundColor: C.ground, color: C.ink }]} value={name} onChangeText={setName} returnKeyType="done" onSubmitEditing={next} placeholder="First name" placeholderTextColor={C.dark ? "#636366" : "#a1a1a6"} accessibilityLabel="Their first name" autoCapitalize="words" maxLength={30} />
            {hint}
          </View>
          <View>
            <Text style={[font(15, '600'), { color: C.ink, marginBottom: 8 }]} allowFontScaling>They are your</Text>
            <Segmented C={C} options={['Mother', 'Father', 'Other']} value={rel} onChange={setRel} />
          </View>
          <Note C={C} top={0} style={{ paddingHorizontal: 0 }}>You are setting it up on their phone. They keep every setting.</Note>
        </Card>
      )}
      <Bottom label="Continue" onPress={next} disabled={!!problem} />
    </Screen>
  );
}

// ---------------- Ob3: what stays on this phone ----------------
export function Ob3({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const care = !!ctx.settings.careName;
  const rows = [
    { t: 'Messages are checked right here. No internet needed.', icon: WifiOff },
    { t: 'No account. Your history stays on this phone.', icon: Lock },
    { t: 'A message leaves only when you choose to ask someone about it.', icon: Send },
  ];
  return (
    <Screen C={C} playKey="ob3" scroll>
      <ObBack ctx={ctx} to="ob2" />
      <Steps ctx={ctx} i={3} of={care ? 6 : 5} />
      <ScreenTitle C={C} top={18}>Nothing leaves this phone.</ScreenTitle>
      <Group C={C} style={{ marginHorizontal: 16, marginTop: 22 }}>
        <View style={{ paddingLeft: 16 }}>
          {rows.map((r, i) => <Row key={i} C={C} chip={r.icon} title={r.t} last={i === rows.length - 1} pad={14} />)}
        </View>
      </Group>
      <Bottom label="Continue" onPress={() => ctx.go('ob4')} />
    </Screen>
  );
}

// ---------------- Ob4: who should hear about it? ----------------
export function Ob4({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const care = !!ctx.settings.careName;
  const first = ctx.settings.trusted[0];
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState<string | null>(null);
  const sent = !!first && (first.invited === true || justSent === first.phone);
  const [pending, setPending] = useState<TrustedPerson | null>(null);
  const firstName = first ? first.name.split(' ')[0] : '';
  const sendLink = async () => {
    if (!first) return;
    setSending(true);
    try {
      const r = await sendInviteTo(ctx.settings, first);
      if (!r.ok) { Alert.alert('The invite could not be made', r.error + '\n\nYou can also send it later from Family.'); return; }
      ctx.update(markInvited(ctx.settings, first));
      setJustSent(first.phone);
    } finally { setSending(false); }
  };
  const addFromContacts = async () => {
    try {
      const res = await pickTrustedPerson();
      if (!res.ok) { if (res.reason) ctx.flash(res.reason); return; }
      setPending(res.person);
    } catch { ctx.flash('Your contacts could not be opened. Try again in a moment.'); }
  };
  const ring = pageBg(C);
  const blank = C.dark ? ['#3a3a3c', '#2c2c2e'] : ['#e3e3e8', '#d6d6db'];
  return (
    <Screen C={C} playKey="ob4" scroll style={{ backgroundColor: ring }}>
      <View style={st.page}>
        <ObBack ctx={ctx} to="ob3" inPage />
        <Steps ctx={ctx} i={4} of={care ? 6 : 5} />
        {first ? (
          <>
            <View style={{ marginTop: 72 }}>
              <Avatar name={first.name} photo={first.photo} size={120} />
              <View style={[st.badge, { width: 38, height: 38, right: -2, bottom: -2, borderColor: ring }]}><Check size={18} color="#fff" strokeWidth={3} /></View>
            </View>
            <Words C={C} title={firstName + ' is in your loop.'}
              body={sent
                ? 'Invite sent. Once ' + firstName + ' accepts, they hear about every scam that reaches you.'
                : care ? 'Send the invite to your own number. Flagged texts will show up on your phone.'
                : 'Send ' + firstName + ' an invite. Once they accept, they hear about every scam that reaches you.'} />
            <View style={st.foot}>
              {sent
                ? <Primary label="Continue" onPress={() => ctx.go('ob5')} />
                : <Primary label={sending ? 'Making the invite' : 'Send ' + firstName + ' the invite'} disabled={sending} onPress={sendLink} icon={<Send size={18} color="#fff" strokeWidth={2.2} />} />}
              <Quiet label="Choose someone else" onPress={addFromContacts} />
              {!sent && <Quiet label="Send it later" onPress={() => ctx.go('ob5')} />}
            </View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', marginTop: 72 }} importantForAccessibility="no-hide-descendants">
              <View style={[st.blank, { backgroundColor: blank[0], borderColor: ring }]} />
              <View style={[st.blank, { backgroundColor: blank[1], borderColor: ring, marginLeft: -34 }]} />
            </View>
            <Words C={C} title="Who should hear if a scam reaches you?"
              body={care ? 'Add yourself, so flagged texts on this phone show up on yours.' : 'Pick one person you trust. Loop Me tells them when it stops a scam.'} />
            <View style={st.foot}>
              <Primary label="Choose from Contacts" onPress={addFromContacts} />
              <Quiet label="Not now" onPress={() => ctx.go('ob5')} />
            </View>
          </>
        )}
      </View>
      <RelationSheet C={C} name={pending?.name || null} onClose={() => setPending(null)} onPick={relation => {
        if (!pending) return;
        const rest = ctx.settings.trusted.filter(x => !samePhone(x.phone, pending.phone));
        ctx.update({ ...ctx.settings, trusted: [{ ...pending, relation }, ...rest].slice(0, 3) });
        setPending(null);
        ctx.flash(pending.name.split(' ')[0] + ' is saved.');
      }} />
    </Screen>
  );
}

// ---------------- Ob5: turn on scam protection, with a way to come back later ----------------
export function Ob5({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const care = !!ctx.settings.careName;
  const [calls, setCalls] = useState<'enabled' | 'disabled' | 'unknown'>('unknown');
  const refresh = () => { callDirectoryStatus().then(setCalls).catch(() => {}); };
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', st => { if (st === 'active') refresh(); });
    return () => sub.remove();
  }, []);
  const textsOn = ctx.tallies.filtered > 0;
  const callsOn = calls === 'enabled';
  const done = textsOn && callsOn;
  const finish = async (later: boolean) => {
    // Full-screen warnings and the after-call nudge need this. Asked once, here.
    await ensureNotificationPermission().catch(() => {});
    if (care) { ctx.update({ ...ctx.settings, protectionLater: later }); ctx.go('ob6'); return; }
    ctx.update({ ...ctx.settings, introSeen: true, role: 'elder', protectionLater: later });
    ctx.go('home');
  };
  const [waiting, setWaiting] = useState(false);
  const [howTo, setHowTo] = useState(false);
  const openSettings = () => { setWaiting(true); Linking.openSettings().catch(() => ctx.flash('iPhone Settings could not be opened.')); };
  const ring = pageBg(C);
  return (
    <Screen C={C} playKey="ob5" scroll style={{ backgroundColor: ring }}>
      <View style={st.page}>
        <ObBack ctx={ctx} to="ob4" inPage />
        <Steps ctx={ctx} i={5} of={care ? 6 : 5} />
        <View style={{ marginTop: 72 }}>
          <Image source={APP_ICON} style={st.icon} accessibilityLabel="Loop Me" />
          {done
            ? <View style={[st.badge, { width: 42, height: 42, right: -10, bottom: -10, borderColor: ring }]}><Check size={20} color="#fff" strokeWidth={3} /></View>
            : <AlertDot ring={ring} />}
        </View>
        {done
          ? <Words C={C} title="You’re protected." body="Texts from numbers you don’t know are checked first. Scam callers are blocked." />
          : waiting
          ? <Words C={C} title="Waiting for you…" body={'Turn on both switches, then come back. Loop Me will notice.\n\nUnknown texts: ' + (textsOn ? 'on' : 'off') + '. Scam callers: ' + (callsOn ? 'on' : 'off') + '.'} />
          : <Words C={C} title="Turn on scam protection" body="Two switches in iPhone Settings. Apple asks you to flip them yourself, so we’ll take you straight there." />}
        {!done && (
          <Quiet label={howTo ? 'Hide the steps' : 'Show me where the switches are'} onPress={() => setHowTo(v => !v)} />
        )}
      </View>
      {!done && howTo && (
        <View>
          <PermCard C={C} Icon={MessageCircle} title="Unknown texts" on={textsOn} steps={TEXT_STEPS} frames={TEXT_FRAMES} captions={TEXT_CAPTIONS} onOpen={openSettings} first />
          <PermCard C={C} Icon={Phone} title="Scam callers" on={callsOn} steps={CALL_STEPS} frames={CALL_FRAMES} captions={CALL_CAPTIONS} onOpen={openSettings} />
        </View>
      )}
      <View style={[st.foot, { paddingHorizontal: 28, paddingBottom: 42 }]}>
        {done ? (
          <Primary label={care ? 'Continue' : 'Start using Loop Me'} onPress={() => finish(false)} />
        ) : (
          <>
            <Primary label="Open iPhone Settings" onPress={openSettings} />
            <Quiet label="Not now" onPress={() => finish(true)} />
          </>
        )}
      </View>
    </Screen>
  );
}

/** The red dot on the icon that pulses until both switches are on. */
function AlertDot({ ring }: { ring: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (motionOff()) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={{ position: 'absolute', right: -6, top: -6, width: 30, height: 30 }} pointerEvents="none">
      <Animated.View style={[st.dot, { borderWidth: 0, backgroundColor: 'rgba(236,48,19,.35)', opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }] }]} />
      <View style={[st.dot, { borderColor: ring }]} />
    </View>
  );
}

// ---------------- Ob6: the family secret word (setting up for someone else) ----------------
export function Ob6({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const [word, setWordState] = useState(s.codeWord || '');
  // The live text, so Save reads exactly what is in the box this instant.
  const wordRef = useRef(s.codeWord || '');
  const setWord = (t: string) => { wordRef.current = t; setWordState(t); };
  const finish = (save: boolean) => {
    const w = wordRef.current.trim();
    if (save && w.length < 3) { ctx.flash('Pick a word of three letters or more.'); return; }
    ctx.update({ ...s, introSeen: true, role: 'elder', ...(save ? { codeWord: w, codeWordSet: true, codeWordAt: Date.now() } : {}) });
    ctx.go('home');
    ctx.flash('All set. Hand the phone back.');
  };
  return (
    <Screen C={C} playKey="ob6" scroll>
      <ObBack ctx={ctx} to="ob5" />
      <Steps ctx={ctx} i={6} of={6} />
      <ScreenTitle C={C} top={18}>Pick a family secret word</ScreenTitle>
      <Lead C={C}>If a caller sounds like family and asks for money, {s.careName ? firstNameOf(s.careName) + ' asks' : 'they ask'} for the word. A cloned voice won’t know it.</Lead>
      <Card C={C} style={{ marginHorizontal: 16, marginTop: 22 }} radius={16}>
        <TextInput value={word} onChangeText={setWord} onEndEditing={e => setWord(e.nativeEvent.text)} returnKeyType="done" onSubmitEditing={() => finish(true)} autoCapitalize="words" autoCorrect={false} placeholder="One word" placeholderTextColor={C.dark ? "#636366" : "#a1a1a6"}
          style={[font(22, '600'), { color: C.ink, backgroundColor: C.ground, borderRadius: 12, padding: 14 }]} accessibilityLabel="Secret word" />
        <Note C={C} top={10} style={{ paddingHorizontal: 0 }}>Stays on this phone, behind Face ID in Settings.</Note>
      </Card>
      <View style={{ marginTop: 'auto', paddingHorizontal: 16, paddingBottom: 34, gap: 6 }}>
        <Pill label="Save and hand the phone back" onPress={() => finish(true)} trailing={<ArrowRight size={18} color="#fff" strokeWidth={2.2} />} />
        <TextBtn label="Skip for now" color={C.ink} onPress={() => finish(false)} />
      </View>
    </Screen>
  );
}
const firstNameOf = (n: string) => (n || '').split(' ')[0] || 'they';

const st = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 34, alignItems: 'center' },
  foot: { marginTop: 'auto', alignSelf: 'stretch', paddingTop: 24 },
  primary: { height: 56, borderRadius: 28, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, alignSelf: 'stretch', paddingHorizontal: 20 },
  badge: { position: 'absolute', borderRadius: 21, backgroundColor: T.green, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  blank: { width: 104, height: 104, borderRadius: 52, borderWidth: 4 },
  icon: { width: 120, height: 120, borderRadius: 28, shadowColor: '#0d4a3b', shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 18 } },
  dot: { position: 'absolute', left: 0, top: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: T.red, borderWidth: 4 },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 14, fontSize: 17 },
  plus: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
});
