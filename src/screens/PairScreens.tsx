// The family link, both ends.
//
// The person being looked after (the owner) sends one invite: a link that
// joins the caretaker's phone to a share in the owner's own iCloud. The
// caretaker taps it once. From then on, every flagged text on the owner's
// phone appears full-screen on the caretaker's, and the caretaker's replies
// appear full-screen on the owner's. No texts travel after the invite.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ArrowRight, Check, X, Send, Phone, UserPlus } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn, KFPop, bez } from '../ui/kf';
import { sendSms, inviteText } from '../lib/familyLink';
import * as Family from '../lib/family';
import { cloudAccountState } from '../../modules/scam-ai';
import { pickTrustedPerson } from '../lib/contacts';
import { ensureNotificationPermission } from '../lib/notify';
import type { Ctx } from '../App';

// ---------------- Owner side: "Watched over by" ----------------
export function WatchedBy({ ctx }: { ctx: Ctx }) {
  const s = ctx.settings;
  const [account, setAccount] = useState<'available' | 'noAccount' | 'restricted' | 'unknown' | null>(null);
  const [busy, setBusy] = useState(false);
  const linked = s.familyLinked && s.familyRole === 'owner';
  const name = s.watchedBy?.split(' ')[0] || null;

  useEffect(() => { cloudAccountState().then(setAccount); }, []);

  // After an invite goes out, keep asking iCloud until the link is accepted.
  useEffect(() => {
    if (!s.familyInvited || linked) return;
    const iv = setInterval(() => { void ctx.refreshFamily(); }, 4000);
    return () => clearInterval(iv);
  }, [s.familyInvited, linked, ctx]);

  const sendInvite = async () => {
    setBusy(true);
    try {
      const url = await Family.invite(s.myName || s.careName);
      if (!url) { ctx.flash('iCloud is not available on this phone right now. Sign in under Settings › your name.'); return; }
      await ensureNotificationPermission();
      const res = await pickTrustedPerson();
      const to = res.ok ? res.person : null;
      if (to && !s.trusted.some(t => t.phone === to.phone)) {
        ctx.update({ ...s, familyInvited: true, trusted: [to, ...s.trusted].slice(0, 3) });
      } else {
        ctx.update({ ...s, familyInvited: true });
      }
      await sendSms(to?.phone || null, inviteText(s.myName || s.careName, url));
    } finally { setBusy(false); }
  };

  return (
    <KFIn duration={300} style={{ flex: 1 }} playKey={linked ? 'linked' : 'open'}>
    <ScrollView style={sw.root} showsVerticalScrollIndicator={false}>
      <View style={sw.topRow}>
        <Pressable style={sw.back} onPress={() => ctx.go('more')} accessibilityRole="button">
          <ChevronLeft size={17} color={T.ink} strokeWidth={2} />
          <Text style={sw.backText} allowFontScaling>Back</Text>
        </Pressable>
      </View>

      {linked ? (
        <View>
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <KFPop duration={500} playKey="linked" easing={bez(0.2, 1.3, 0.3, 1)} style={sw.doneBadge}>
              <Check size={23} color="#fff" strokeWidth={2.6} />
            </KFPop>
            <Text style={[sw.title, { marginTop: 16 }]} allowFontScaling>{name} is looking out for you</Text>
            <Text style={sw.sub} allowFontScaling>When a text on this phone looks like a scam, it appears on {name}’s phone straight away, and what {name} says appears here. You do not have to do anything.</Text>
          </View>
          <Text style={sw.section} allowFontScaling>What {name} sees</Text>
          <View style={sw.listCard}>
            <Row yes text="Texts that were flagged, and what you were told to do" />
            <Row yes text="Anything you choose to send with Loop in" />
            <Row yes={false} text="Never your ordinary messages, photos, calls or where you are" last />
          </View>
          <Text style={sw.note} allowFontScaling>It runs on your own iCloud account. There is no company in the middle, and nothing is kept anywhere but your two phones.</Text>
          <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 40, gap: 9 }}>
            <Pressable style={sw.ghostBtn} onPress={ctx.unlinkFamily} accessibilityRole="button">
              <Text style={[sw.ghostText, { color: T.red }]} allowFontScaling>Stop {name} hearing from this phone</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View>
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
            <Text style={sw.kicker} allowFontScaling>Family link</Text>
            <Text style={sw.title} allowFontScaling>Who should hear about it?</Text>
            <Text style={sw.sub} allowFontScaling>Pick someone you trust. They get one text from you with a link. They tap it once, and from then on anything flagged here appears on their phone the moment it happens.</Text>
          </View>

          {s.familyInvited && (
            <View style={sw.waitCard}>
              <ActivityIndicator color={T.green} />
              <View style={{ flex: 1 }}>
                <Text style={sw.waitTitle} allowFontScaling>Waiting for them to tap the link</Text>
                <Text style={sw.waitBody} allowFontScaling>This fills in on its own the moment they do. If the text did not go, send it again below.</Text>
              </View>
            </View>
          )}

          <Text style={sw.section} allowFontScaling>What they will and will not see</Text>
          <View style={sw.listCard}>
            <Row yes text="Texts that were flagged, and what you were told to do" />
            <Row yes text="A way to send you a short note that shows up on this screen" />
            <Row yes={false} text="Never your ordinary messages, photos, calls or where you are" last />
          </View>

          {account === 'noAccount' || account === 'restricted' ? (
            <View style={sw.warnCard}>
              <Text style={sw.warnTitle} allowFontScaling>This phone is not signed in to iCloud</Text>
              <Text style={sw.warnBody} allowFontScaling>The family link runs on your own iCloud account, so nothing passes through anyone else. Sign in under Settings › your name at the top, then come back here.</Text>
              <Pressable onPress={() => Linking.openURL('App-prefs:').catch(() => Linking.openSettings())} accessibilityRole="button">
                <Text style={sw.warnLink} allowFontScaling>Open iPhone Settings ›</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={sw.note} allowFontScaling>It runs on your own iCloud account. There is no company in the middle. You can stop it from this screen any time.</Text>
          )}

          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
            <Pressable style={[sw.cta, busy && { opacity: 0.6 }]} onPress={sendInvite} disabled={busy} accessibilityRole="button">
              <Text style={sw.ctaText} allowFontScaling>{s.familyInvited ? 'Send the invite again' : 'Choose someone and send the invite'}</Text>
              {busy ? <ActivityIndicator color="#fff" /> : <Send size={19} color="#fff" strokeWidth={2.2} />}
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
    </KFIn>
  );
}

function Row({ yes, text, last }: { yes: boolean; text: string; last?: boolean }) {
  return (
    <View style={[sw.listRow, last && { borderBottomWidth: 0 }]}>
      {yes ? <Check size={17} color={T.green} strokeWidth={2.4} style={{ marginTop: 2 }} /> : <X size={17} color={T.red} strokeWidth={2.4} style={{ marginTop: 2 }} />}
      <Text style={sw.listText} allowFontScaling>{text}</Text>
    </View>
  );
}

// ---------------- Caretaker side ----------------
export function WatchSetup({ ctx }: { ctx: Ctx }) {
  const s = ctx.settings;
  const paired = s.familyLinked && s.familyRole === 'caretaker';
  const watchName = s.watching?.name?.split(' ')[0] || 'them';
  const hasPhone = !!s.watching?.phone;

  const addPhone = async () => {
    const res = await pickTrustedPerson();
    if (!res.ok) { if (res.reason) ctx.flash(res.reason); return; }
    ctx.update({ ...s, watching: { name: s.watching?.name || res.person.name, phone: res.person.phone } });
    ctx.flash('Saved. One tap now calls ' + watchName + '.');
  };

  return (
    <KFIn duration={300} style={{ flex: 1 }} playKey={paired ? 'done' : 'open'}>
    <ScrollView style={sw.root} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={sw.topRow}>
        <Pressable style={sw.back} onPress={() => ctx.go(s.role === 'caretaker' && s.introSeen ? 'more' : 'ob1')} accessibilityRole="button">
          <ChevronLeft size={17} color={T.ink} strokeWidth={2} />
          <Text style={sw.backText} allowFontScaling>Back</Text>
        </Pressable>
      </View>

      {!paired ? (
        <View>
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
            <Text style={sw.kicker} allowFontScaling>Looking after someone</Text>
            <Text style={sw.title} allowFontScaling>They send you one link</Text>
            <Text style={sw.sub} allowFontScaling>On their phone, open Loop Me, tap More, then Watched over by, and choose you. A text arrives here with a link. Tap it once and this phone is linked.</Text>
          </View>
          <View style={sw.stepsCard}>
            {[
              'On their phone: More › Watched over by',
              'They pick you from their contacts',
              'You tap the link in the text they send',
            ].map((t, i) => (
              <View key={i} style={[sw.stepRow, i === 2 && { borderBottomWidth: 0 }]}>
                <View style={sw.stepNum}><Text style={sw.stepNumText} allowFontScaling>{i + 1}</Text></View>
                <Text style={sw.stepText} allowFontScaling>{t}</Text>
              </View>
            ))}
          </View>
          <Text style={sw.section} allowFontScaling>What you will and will not see</Text>
          <View style={sw.listCard}>
            <Row yes text="Scam alerts, full screen, the moment they happen" />
            <Row yes text="Three one-tap replies that appear on their screen" />
            <Row yes={false} text="Never their ordinary messages, photos or location" last />
          </View>
          <Text style={sw.note} allowFontScaling>Setting up their phone yourself? Do it from their phone: the invite can be sent to your own number.</Text>
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
            <Pressable style={sw.ghostBtn} onPress={() => ctx.go('home')} accessibilityRole="button">
              <Text style={sw.ghostText} allowFontScaling>I will tap the link when it arrives</Text>
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
            <Text style={sw.sub} allowFontScaling>The next time a text is flagged on their phone, it takes over this screen, and your reply lands on theirs. If this phone is in your pocket, it rings through like a message from family.</Text>
          </View>
          {!hasPhone && (
            <Pressable style={sw.phoneCard} onPress={addPhone} accessibilityRole="button">
              <View style={sw.phoneIcon}><UserPlus size={18} color={T.green} strokeWidth={2.2} /></View>
              <View style={{ flex: 1 }}>
                <Text style={sw.phoneTitle} allowFontScaling>Add {watchName}’s number</Text>
                <Text style={sw.phoneBody} allowFontScaling>So the call button on an alert dials them in one tap.</Text>
              </View>
              <ArrowRight size={17} color={T.green} strokeWidth={2.2} />
            </Pressable>
          )}
          {hasPhone && (
            <View style={sw.phoneCard}>
              <View style={sw.phoneIcon}><Phone size={18} color={T.green} strokeWidth={2.2} /></View>
              <View style={{ flex: 1 }}>
                <Text style={sw.phoneTitle} allowFontScaling>{s.watching?.name}</Text>
                <Text style={sw.phoneBody} allowFontScaling>{s.watching?.phone}</Text>
              </View>
            </View>
          )}
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

// Kept for the moment between tapping an invite link and iCloud confirming it.
export function WatchWait({ ctx }: { ctx: Ctx }) {
  return (
    <KFIn duration={280} style={{ flex: 1 }} playKey="wait">
    <View style={sw.root}>
      <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <ActivityIndicator color={T.green} />
          <Text style={sw.waitKicker} allowFontScaling>LINKING</Text>
        </View>
        <Text style={[sw.title, { marginTop: 16 }]} allowFontScaling>Joining their phone</Text>
        <Text style={sw.sub} allowFontScaling>iCloud is confirming the link. This takes a few seconds.</Text>
      </View>
      <View style={{ marginTop: 'auto', paddingHorizontal: 20, paddingBottom: 34 }}>
        <Pressable style={sw.ghostBtn} onPress={() => ctx.go('home')} accessibilityRole="button">
          <Text style={[sw.ghostText]} allowFontScaling>Back</Text>
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
  backText: { fontSize: 17, fontFamily: F.medium, color: T.ink },
  kicker: { fontSize: 14, fontFamily: F.semibold, color: T.green, marginBottom: 10 },
  title: { fontSize: 27, fontFamily: F.display, letterSpacing: -0.52, color: T.ink, lineHeight: 30 },
  sub: { fontSize: 17, fontFamily: F.body, color: T.sub, lineHeight: 25, marginTop: 9 },
  section: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, fontSize: 14, fontFamily: F.semibold, color: T.sub },
  listCard: {
    marginHorizontal: 20, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  listRow: { flexDirection: 'row', gap: 11, paddingHorizontal: 15, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.divider },
  listText: { flex: 1, fontSize: 16, fontFamily: F.body, color: T.ink, lineHeight: 23 },
  stepsCard: {
    marginHorizontal: 20, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.divider },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: T.greenTint, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 14, fontFamily: F.bold, color: T.green },
  stepText: { flex: 1, fontSize: 16, fontFamily: F.semibold, color: T.ink, lineHeight: 22 },
  note: { paddingHorizontal: 20, paddingTop: 16, fontSize: 15, fontFamily: F.body, color: T.sub, lineHeight: 22 },
  cta: { height: 58, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  ctaText: { flex: 1, fontSize: 17, fontFamily: F.bold, color: '#fff' },
  ghostBtn: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: T.hairline, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontSize: 16, fontFamily: F.semibold, color: T.ink },
  doneBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },
  waitCard: { marginHorizontal: 20, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.greenTint, borderRadius: 12, padding: 15 },
  waitTitle: { fontSize: 16, fontFamily: F.bold, color: T.greenInk },
  waitBody: { fontSize: 15, fontFamily: F.body, color: T.greenInk2, lineHeight: 21, marginTop: 3 },
  warnCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: T.amberTint, borderRadius: 12, padding: 15 },
  warnTitle: { fontSize: 16, fontFamily: F.bold, color: T.amberInk },
  warnBody: { fontSize: 15, fontFamily: F.body, color: T.amberInk, lineHeight: 22, marginTop: 5 },
  warnLink: { fontSize: 15, fontFamily: F.bold, color: T.amberInk, marginTop: 10 },
  waitKicker: { fontSize: 13, fontFamily: F.semibold, letterSpacing: 1.6, color: T.green },
  phoneCard: { marginHorizontal: 20, marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, padding: 15 },
  phoneIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.greenTint, alignItems: 'center', justifyContent: 'center' },
  phoneTitle: { fontSize: 16, fontFamily: F.bold, color: T.ink },
  phoneBody: { fontSize: 15, fontFamily: F.body, color: T.sub, marginTop: 2, lineHeight: 21 },
});
