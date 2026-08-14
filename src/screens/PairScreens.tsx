// The pairing handshake — source lines 132-182, made real over the family's
// own text messages: the caretaker types the six-digit code read from the
// elder's phone; "Ask them to accept" sends a real SMS deep link carrying the
// code; the elder's phone raises the consent screen only if the code matches;
// accept/decline travel back the same way.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, ArrowRight, Check, X } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn, KFPop, bez } from '../ui/kf';
import { pairRequestText, pairOkText, pairNoText, sendSms } from '../lib/familyLink';
import type { Ctx } from '../App';

// ---------------- Setup, caretaker mode (code entry / done) ----------------
export function WatchSetup({ ctx }: { ctx: Ctx }) {
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState('');
  const paired = !!ctx.settings.watching && ctx.settings.role === 'caretaker';
  const watchName = ctx.settings.watching?.name?.split(' ')[0] || ctx.settings.careName.split(' ')[0] || 'They';

  const ask = async () => {
    if (code.length !== 6) { setCodeMsg('Type the six digits shown on their phone.'); return; }
    await sendSms(null, pairRequestText(ctx.settings.myName, '', code));
    ctx.go('watchWait');
  };

  return (
    <KFIn duration={300} style={{ flex: 1 }} playKey={paired ? 'done' : 'open'}>
    <ScrollView style={sw.root} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={sw.topRow}>
        <Pressable style={sw.back} onPress={() => ctx.go(ctx.settings.role === 'caretaker' ? 'more' : 'ob1')} accessibilityRole="button">
          <ChevronLeft size={17} color={T.ink} strokeWidth={2} />
          <Text style={sw.backText} allowFontScaling>Back</Text>
        </Pressable>
      </View>

      {!paired ? (
        <View>
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
            <Text style={sw.kicker} allowFontScaling>Caretaker mode</Text>
            <Text style={sw.title} allowFontScaling>Who do you look after?</Text>
            <Text style={sw.sub} allowFontScaling>On their phone, open Loop Me, tap More, then Watched over by. They read you a six digit code.</Text>
          </View>
          <View style={sw.card}>
            <Text style={sw.cardLabel} allowFontScaling>Their code</Text>
            <TextInput
              style={[sw.codeInput, { borderColor: codeMsg ? T.red : T.fieldBorder }]}
              value={code}
              onChangeText={(v) => { setCode(v.replace(/[^0-9]/g, '').slice(0, 6)); setCodeMsg(''); }}
              placeholder="000000" placeholderTextColor={T.muted}
              keyboardType="number-pad" maxLength={6}
              accessibilityLabel="Their six digit code"
            />
            {!!codeMsg && <Text style={sw.codeMsg} allowFontScaling>{codeMsg}</Text>}
            <Pressable style={sw.inviteLink} onPress={() => sendSms(null, pairRequestText(ctx.settings.myName, '', code || ctx.settings.pairCode))} accessibilityRole="button">
              <Text style={sw.inviteText} allowFontScaling>Text them the invite instead</Text>
              <ArrowRight size={15} color={T.green} strokeWidth={2.2} />
            </Pressable>
          </View>
          <Text style={sw.section} allowFontScaling>What you will and will not see</Text>
          <View style={sw.listCard}>
            {[
              { yes: true, text: 'Scam alerts, and what they were told to do' },
              { yes: true, text: 'A way to send them a short note straight away' },
              { yes: false, text: 'Never their ordinary messages, photos or location' },
            ].map((r, i) => (
              <View key={i} style={[sw.listRow, i === 2 && { borderBottomWidth: 0 }]}>
                {r.yes ? <Check size={17} color={T.green} strokeWidth={2.4} style={{ marginTop: 2 }} /> : <X size={17} color={T.red} strokeWidth={2.4} style={{ marginTop: 2 }} />}
                <Text style={sw.listText} allowFontScaling>{r.text}</Text>
              </View>
            ))}
          </View>
          <Text style={sw.note} allowFontScaling>They agree on their own phone before anything reaches you, and either of you can end it in one tap.</Text>
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
            <Pressable style={sw.cta} onPress={ask} accessibilityRole="button">
              <Text style={sw.ctaText} allowFontScaling>Ask them to accept</Text>
              <ArrowRight size={19} color="#fff" strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View>
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <KFPop duration={500} playKey="donebadge" easing={bez(0.2, 1.3, 0.3, 1)} style={sw.doneBadge}>
              <Check size={23} color="#fff" strokeWidth={2.6} />
            </KFPop>
            <Text style={[sw.title, { marginTop: 16 }]} allowFontScaling>You are looking after {watchName}</Text>
            <Text style={sw.sub} allowFontScaling>{watchName} accepted on their phone. They keep using Loop Me exactly as before, and you hear from us only when something looks wrong.</Text>
          </View>
          <View style={sw.nextCard}>
            <Text style={sw.nextLabel} allowFontScaling>What happens next</Text>
            <Text style={sw.nextText} allowFontScaling>The next time a text or call is flagged on their phone, it appears here within a second, and you can send them a note before they tap anything.</Text>
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 40, gap: 9 }}>
            <Pressable style={sw.cta} onPress={() => ctx.go('ward')} accessibilityRole="button">
              <Text style={sw.ctaText} allowFontScaling>Open {watchName}’s activity</Text>
              <ArrowRight size={19} color="#fff" strokeWidth={2.2} />
            </Pressable>
            <Pressable style={sw.ghostBtn} onPress={() => ctx.go('home')} accessibilityRole="button">
              <Text style={sw.ghostText} allowFontScaling>Set up my own phone too</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
    </KFIn>
  );
}

// ---------------- Caretaker, waiting ----------------
export function WatchWait({ ctx }: { ctx: Ctx }) {
  return (
    <KFIn duration={280} style={{ flex: 1 }} playKey="wait">
    <View style={sw.root}>
      <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <View style={sw.bars}>{[9, 14, 6, 12].map((h, i) => <View key={i} style={[sw.bar, { height: h }]} />)}</View>
          <Text style={sw.waitKicker} allowFontScaling>WAITING</Text>
        </View>
        <Text style={[sw.title, { marginTop: 16 }]} allowFontScaling>Asking them to agree</Text>
        <Text style={sw.sub} allowFontScaling>The request is on their phone now. They tap it there to finish, exactly as they would in real life.</Text>
      </View>
      <View style={{ marginTop: 'auto', paddingHorizontal: 20, paddingBottom: 34 }}>
        <Pressable style={sw.ghostBtn} onPress={() => ctx.go('watch')} accessibilityRole="button">
          <Text style={[sw.ghostText]} allowFontScaling>Cancel the request</Text>
        </Pressable>
      </View>
    </View>
    </KFIn>
  );
}

// ---------------- Pairing request (elder consent) ----------------
export function PairAsk({ ctx }: { ctx: Ctx }) {
  const ask = ctx.pairAsk;
  if (!ask) return null;
  const first = ask.name.split(' ')[0];
  const initials = ask.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  const accept = async () => {
    ctx.update({ ...ctx.settings, watchedBy: first, trusted: ctx.settings.trusted.some(t => t.phone === ask.phone) ? ctx.settings.trusted : [{ name: ask.name, phone: ask.phone }, ...ctx.settings.trusted].slice(0, 3) });
    ctx.setPairAsk(null);
    await sendSms(ask.phone || null, pairOkText(ctx.settings.myName, ''));
    ctx.go('home');
    ctx.flash(first + ' is looped in now.');
  };
  const decline = async () => {
    ctx.setPairAsk(null);
    await sendSms(ask.phone || null, pairNoText(ctx.settings.myName));
    ctx.go('home');
  };
  return (
    <KFIn duration={280} style={{ flex: 1 }} playKey={ask.name}>
    <View style={sw.root}>
      <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
        <KFPop duration={500} playKey={ask.name} easing={bez(0.2, 1.3, 0.3, 1)} style={sw.askAvatar}>
          <Text style={sw.askInitials} allowFontScaling>{initials}</Text>
        </KFPop>
        <Text style={[sw.title, { marginTop: 16 }]} allowFontScaling>{ask.name} would like to be looped in</Text>
        <Text style={sw.sub} allowFontScaling>They used the code from this phone. Nothing reaches them until you say yes, and you can stop it whenever you like.</Text>
      </View>
      <View style={sw.listCard}>
        <View style={sw.listRow}>
          <Check size={16} color={T.green} strokeWidth={2.4} style={{ marginTop: 2 }} />
          <Text style={sw.listText} allowFontScaling>Scam alerts, and a way to send you a short note</Text>
        </View>
        <View style={[sw.listRow, { borderBottomWidth: 0 }]}>
          <X size={16} color={T.red} strokeWidth={2.4} style={{ marginTop: 2 }} />
          <Text style={sw.listText} allowFontScaling>Never your ordinary messages, photos or location</Text>
        </View>
      </View>
      <View style={{ marginTop: 'auto', paddingHorizontal: 20, paddingBottom: 34, gap: 9 }}>
        <Pressable style={sw.cta} onPress={accept} accessibilityRole="button">
          <Text style={sw.ctaText} allowFontScaling>Yes, loop {first} in</Text>
          <ArrowRight size={19} color="#fff" strokeWidth={2.2} />
        </Pressable>
        <Pressable style={sw.ghostBtn} onPress={decline} accessibilityRole="button">
          <Text style={sw.ghostText} allowFontScaling>Not now</Text>
        </Pressable>
      </View>
    </View>
    </KFIn>
  );
}

const sw = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  topRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  back: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingRight: 8 },
  backText: { fontSize: 15, fontFamily: F.medium, color: T.ink },
  kicker: { fontSize: 12.5, fontFamily: F.semibold, color: T.green, marginBottom: 10 },
  title: { fontSize: 26, fontFamily: F.display, letterSpacing: -0.52, color: T.ink, lineHeight: 28.6 },
  sub: { fontSize: 14.5, fontFamily: F.body, color: T.sub, lineHeight: 22.5, marginTop: 9 },
  card: {
    marginHorizontal: 20, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, padding: 17,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  cardLabel: { fontSize: 12.5, fontFamily: F.semibold, color: T.sub, marginBottom: 10 },
  codeInput: {
    height: 60, borderWidth: 1, borderRadius: 10, backgroundColor: T.ground, paddingHorizontal: 14,
    fontSize: 26, fontWeight: '700', letterSpacing: 5.7, color: T.ink,
  },
  codeMsg: { fontSize: 13, fontFamily: F.semibold, color: T.red, marginTop: 9, lineHeight: 18.85 },
  inviteLink: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 7 },
  inviteText: { fontSize: 14, fontFamily: F.semibold, color: T.green },
  section: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, fontSize: 12.5, fontFamily: F.semibold, color: T.sub },
  listCard: {
    marginHorizontal: 20, marginTop: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  listRow: { flexDirection: 'row', gap: 11, paddingHorizontal: 15, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.divider },
  listText: { flex: 1, fontSize: 14, fontFamily: F.body, color: T.ink, lineHeight: 21 },
  note: { paddingHorizontal: 20, paddingTop: 16, fontSize: 13, fontFamily: F.body, color: T.sub, lineHeight: 20.15 },
  cta: { height: 56, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  ctaText: { fontSize: 16, fontFamily: F.bold, color: '#fff' },
  ghostBtn: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: T.hairline, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontSize: 15, fontFamily: F.semibold, color: T.ink },
  doneBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  nextCard: { marginHorizontal: 20, marginTop: 22, backgroundColor: T.greenTint, borderRadius: 12, padding: 15 },
  nextLabel: { fontSize: 12.5, fontFamily: F.semibold, color: T.green, marginBottom: 6 },
  nextText: { fontSize: 14, fontFamily: F.body, color: T.greenInk2, lineHeight: 21 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 16 },
  bar: { width: 3, backgroundColor: T.green },
  waitKicker: { fontSize: 11.5, fontFamily: F.semibold, letterSpacing: 1.61, color: T.green },
  askAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  askInitials: { color: '#fff', fontSize: 17, fontFamily: F.semibold },
});
