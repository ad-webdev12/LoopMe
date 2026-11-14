// I think I've been scammed. One screen, five steps; the content swaps in
// place. Each step's button does the real thing: dial, save the PDF, loop
// in the person who looks out for them.
import React, { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import { X, ArrowRight, Phone, FileDown, Volume2 } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, Swap, Pill, Avatar } from '../ui/base';
import { loopPerson, firstName } from '../ui/pieces';
import { exportHistoryPdf } from '../lib/pdf';
import { reportRoute } from '../lib/region';
import { newRecord } from '../lib/history';
import * as Family from '../lib/family';
import type { Ctx } from '../App';

export default function ScammedScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const [i, setI] = useState(0);
  const person = loopPerson(s);
  const who = firstName(person?.name);
  const route = reportRoute();
  const STEPS = [
    { t: 'First: you are okay.', b: 'This happens to careful people every day. It isn’t your fault. We’ll go one step at a time.' },
    { t: 'Call your bank.', b: 'Use the number on the back of your card, not one from a text or email. Ask them to freeze the card and stop any payments.' },
    { t: 'Stop them getting back in.', b: 'Change any password you gave them. If someone got onto your computer, switch it off and unplug it from the internet.' },
    { t: 'Report it.', b: (route.site ? 'Report it at ' + route.siteName + '.' : 'Report it to the police.') + ' If you lost money, tell your local police too. Your Loop Me history shows what happened and when.' },
    { t: 'Tell someone you trust.', b: 'You don’t have to sort this out alone.' + (who ? ' ' + who + ' can help with the calls.' : '') },
  ];
  const last = i === STEPS.length - 1;
  const step = STEPS[i];

  const [bankOpen, setBankOpen] = useState(false);
  const [bank, setBank] = useState(s.bankPhone || '');
  const callBank = () => { if (s.bankPhone) Linking.openURL('tel:' + s.bankPhone.replace(/[^\d+]/g, '')).catch(() => {}); else setBankOpen(true); };
  const saveBank = () => {
    const d = bank.replace(/[^\d+]/g, '');
    if (d.replace(/\D/g, '').length < 7) { ctx.flash('Type the whole number from the back of your card.'); return; }
    ctx.update({ ...s, bankPhone: d });
    setBankOpen(false);
    Linking.openURL('tel:' + d).catch(() => {});
  };
  const savePdf = async () => {
    const r = await exportHistoryPdf(ctx.hist.filter(h => h.source !== 'family'), s.myName);
    ctx.flash(r === 'failed' ? 'Could not make the PDF just now.' : 'Your history is ready to share.');
  };
  const loopIn = async () => {
    if (!s.familyLinked || s.familyRole !== 'owner') { ctx.go('family'); return; }
    const rec = newRecord({ message: 'I think I may have been caught by a scam. Please call me.', level: 'amber', score: 0, tags: ['help'], reason: 'Asked for help from the recovery steps.', source: 'typed' });
    const ok = await Family.publish(rec, s, true);
    ctx.flash(ok ? 'It is on ' + who + '’s phone now.' : 'It will go when the phone is back online.');
  };
  const finish = () => {
    ctx.update({ ...s, panicCompletedAt: Date.now() });
    ctx.go('home');
    ctx.flash(who ? 'Well done. ' + who + ' knows, and ' + (person?.relation === 'Daughter' ? 'she’s' : person?.relation === 'Son' ? 'he’s' : 'they’re') + ' here to help.' : 'Well done. One step at a time.');
  };
  const read = () => Speech.speak(step.t + ' ' + step.b, { rate: 0.9 });

  return (
    <Screen C={C} playKey="scammed" scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingLeft: 14, paddingRight: 16 }}>
        <Pressable onPress={() => ctx.go('home')} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 4 }, pressed && { opacity: 0.6 }]} accessibilityRole="button">
          <X size={20} color={T.green} strokeWidth={2} />
          <Text style={[font(17, '400'), { color: T.green }]} allowFontScaling>Close</Text>
        </Pressable>
        <Text style={[font(15, '600'), { color: C.ink2 }]} allowFontScaling>Step {i + 1} of {STEPS.length}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 5, paddingTop: 14, paddingHorizontal: 16 }}>
        {STEPS.map((_, k) => <View key={k} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: k <= i ? T.green : (C.dark ? '#3a3a3c' : '#d1d1d6') }} />)}
      </View>

      <View style={{ flex: 1, paddingTop: 30, paddingHorizontal: 20 }}>
        <Swap playKey={i}>
          <Text style={[font(32, '700', 1.1), { color: C.ink }]} allowFontScaling>{step.t}</Text>
          <Text style={[font(18, '400', 1.5), { color: C.ink2, marginTop: 12 }]} allowFontScaling>{step.b}</Text>
          {i === 1 && <Inline C={C} label="Call my bank" icon={<Phone size={18} color={T.green} strokeWidth={2} />} onPress={callBank} />}
          {i === 3 && <Inline C={C} label="Save my history as a PDF" icon={<FileDown size={18} color={T.green} strokeWidth={2} />} onPress={savePdf} />}
          {i === 4 && (
            <Pressable onPress={loopIn} style={({ pressed }) => [st.inline, { backgroundColor: C.card, height: 52, paddingLeft: 8, borderRadius: 26 }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              {person ? <Avatar name={person.name} photo={person.photo} size={38} /> : null}
              <Text style={[font(17, '600'), { color: T.green }]} allowFontScaling>{who ? 'Loop in ' + who : 'Choose someone to loop in'}</Text>
            </Pressable>
          )}
        </Swap>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}>
        {last
          ? <Pill label="I’ve done what I can" onPress={finish} />
          : <Pill label="Next step" onPress={() => setI(i + 1)} trailing={<ArrowRight size={18} color="#fff" strokeWidth={2.2} />} />}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pill label="Read it to me" height={52} bg={C.card} color={C.ink} style={{ flex: 1 }} icon={<Volume2 size={18} color={C.ink} strokeWidth={2} />} onPress={read} />
          {i > 0 && <Pill label="Previous step" height={52} bg={C.card} color={C.ink} style={{ flex: 1 }} onPress={() => setI(i - 1)} />}
        </View>
      </View>
      <Modal visible={bankOpen} transparent animationType="fade" onRequestClose={() => setBankOpen(false)}>
        <Pressable style={st.dim} onPress={() => setBankOpen(false)}>
          <Pressable style={[st.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
            <Text style={[font(20, '700'), { color: C.ink }]} allowFontScaling>Your bank’s number</Text>
            <Text style={[font(15, '400', 1.4), { color: C.ink2, marginTop: 6 }]} allowFontScaling>Turn your card over. The number is printed on the back. Loop Me keeps it so next time is one tap.</Text>
            <TextInput value={bank} onChangeText={setBank} autoFocus keyboardType="phone-pad" placeholder="Number on the back of the card" placeholderTextColor={C.meta} returnKeyType="done" onSubmitEditing={saveBank}
              style={[font(22, '600'), { color: C.ink, backgroundColor: C.ground, borderRadius: 12, padding: 14, marginTop: 14 }]} />
            <Pill label="Call now" style={{ marginTop: 14 }} onPress={saveBank} icon={<Phone size={18} color="#fff" strokeWidth={2} />} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function Inline({ C, label, icon, onPress }: { C: Ctx['C']; label: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.inline, { backgroundColor: C.card }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      {icon}
      <Text style={[font(17, '600'), { color: T.green }]} allowFontScaling>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  inline: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, height: 48, paddingHorizontal: 20, borderRadius: 24 },
});
