// The caretaker's phone, the moment something is flagged on the other one.
// A red or amber takeover: whose phone, what happened, the text. Ready
// replies in one tap, or "Write your own" for a note in their own words.
// Every reply travels over the family link and lands full screen there.
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pencil, Send } from 'lucide-react-native';
import { T, font } from '../theme';
import { Takeover, TextBtn, Avatar } from '../ui/base';
import { firstName, whenLabel } from '../ui/pieces';
import { startCallActivity } from '../../modules/scam-ai';
import type { Ctx } from '../App';

type Verdict = 'scam' | 'safe' | 'call' | 'block';

export default function FamilyAlertScreen({ ctx }: { ctx: Ctx }) {
  const rec = ctx.hist.find(h => h.id === ctx.alertId);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => { if (!rec) ctx.closeFamilyAlert(); }, [rec]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rec) return null;
  const s = ctx.settings;
  const name = firstName(s.watching?.name) || firstName(rec.from) || 'They';
  const red = rec.level !== 'amber';
  const field = red ? T.red : T.amber;
  const phone = s.watching?.phone;
  const headline = rec.askedFamily ? name + ' asked you about a text.' : red ? name + (rec.tags?.includes('call') ? ' got a scam call.' : ' got a scam text.') : 'A text on ' + name + '’s phone looks off.';

  // Short and warm, in the caretaker's voice. These land on the other phone
  // exactly as written.
  const READY: { v: Verdict; text: string }[] = [
    { v: 'scam', text: 'That’s a scam. Don’t reply, just leave it.' },
    { v: 'safe', text: 'That one’s fine. You’re okay.' },
    { v: 'call', text: 'Don’t tap anything. I’m calling you now.' },
    ...(rec.sender ? [{ v: 'block' as Verdict, text: 'I blocked that number for you.' }] : []),
  ];

  const reply = async (verdict: Verdict | '', note: string) => {
    if (sending) return;
    setSending(true);
    await ctx.sendNoteTo(rec.id, note, verdict);
    if (verdict === 'call' && phone) {
      startCallActivity(name, rec.excerpt, red ? 'red' : 'amber', red ? 'Tell them: don’t reply, don’t tap, delete it.' : 'Read it together. If they were asked for money or a code, it’s a scam.');
      Linking.openURL('tel:' + phone.replace(/[^\d+]/g, '')).catch(() => {});
    }
    setSending(false);
    ctx.closeFamilyAlert();
  };
  const sendOwn = async () => {
    const t = text.trim();
    if (!t) { ctx.flash('Type a few words first.'); return; }
    await reply('', t);
  };

  return (
    <Takeover color={field} haptic={red ? 'error' : 'warning'} playKey={rec.id}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingTop: 70, paddingHorizontal: 22, paddingBottom: 30 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar name={s.watching?.name || name} photo={s.watching?.photo} size={30} onPhoto />
          <Text style={[font(15, '600'), { color: '#fff', flex: 1 }]} allowFontScaling>{name}’s phone · {whenLabel(rec.at)}</Text>
        </View>
        <Text style={[font(34, '800', 1.08, -0.8), { color: '#fff', marginTop: 16 }]} allowFontScaling>{headline}</Text>
        <View style={[st.msg, { shadowColor: red ? 'rgba(80,10,0,1)' : 'rgba(60,30,0,1)' }]}>
          <Text style={[font(13, '400'), { color: '#3c3c43' }]} allowFontScaling>{rec.sender || 'Unknown number'}</Text>
          <Text style={[font(16.5, '400', 1.4), { color: '#000', marginTop: 6 }]} allowFontScaling numberOfLines={6}>{rec.excerpt}</Text>
        </View>
        <Text style={[font(15, '400', 1.4), { color: '#fff', marginTop: 12 }]} allowFontScaling>{name} has been told: {rec.reason}</Text>

        <View style={{ marginTop: 'auto', paddingTop: 20, gap: 8 }}>
          <Text style={[font(15, '600'), { color: '#fff', marginBottom: 2 }]} allowFontScaling>Answer {name}</Text>
          {writing ? (
            <View style={st.compose}>
              <TextInput value={text} onChangeText={setText} autoFocus multiline maxLength={300} placeholder={'Write to ' + name} placeholderTextColor={ctx.C.dark ? "#636366" : "#a1a1a6"}
                style={[font(17, '400', 1.35), { color: '#000', minHeight: 80, maxHeight: 160, textAlignVertical: 'top' }]} accessibilityLabel={'Note to ' + name} allowFontScaling />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center', marginTop: 8 }}>
                <Pressable onPress={() => { setWriting(false); setText(''); }} hitSlop={8} accessibilityRole="button">
                  <Text style={[font(16, '500'), { color: '#3c3c43' }]} allowFontScaling>Cancel</Text>
                </Pressable>
                <Pressable onPress={sendOwn} disabled={sending} style={({ pressed }) => [st.send, { backgroundColor: field }, (pressed || sending) && { opacity: 0.7 }]} accessibilityRole="button">
                  <Send size={16} color="#fff" strokeWidth={2.2} />
                  <Text style={[font(16, '600'), { color: '#fff' }]} allowFontScaling>Send</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {READY.map(r => (
                <Pressable key={r.v} onPress={() => reply(r.v, r.text)} disabled={sending} style={({ pressed }) => [st.ready, pressed && { backgroundColor: '#e5e5ea' }]} accessibilityRole="button" accessibilityHint={r.v === 'call' && phone ? 'Sends this, then calls ' + name : r.v === 'block' ? 'Sends this and blocks the number on ' + name + '’s phone' : 'Sends this to ' + name}>
                  <Text style={[font(17, '600', 1.3), { color: '#000' }]} allowFontScaling>“{r.text}”</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setWriting(true)} style={({ pressed }) => [st.ready, st.own, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                <Pencil size={18} color="#fff" strokeWidth={2} />
                <Text style={[font(17, '600'), { color: '#fff' }]} allowFontScaling>Write your own</Text>
              </Pressable>
            </>
          )}
          <TextBtn label="Later" onPress={ctx.closeFamilyAlert} />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </Takeover>
  );
}

const st = StyleSheet.create({
  msg: { marginTop: 18, backgroundColor: '#fff', borderRadius: 20, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 14, shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: 12 } },
  ready: { minHeight: 54, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  own: { backgroundColor: 'rgba(255,255,255,.2)', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10 },
  compose: { backgroundColor: '#fff', borderRadius: 16, padding: 14 },
  send: { height: 40, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
