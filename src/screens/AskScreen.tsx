// Ask {name}. The message goes to their phone over the family link (iCloud,
// asked=true) as an outgoing bubble: Sending, Delivered or a retry, typing
// dots while we wait, then their real reply (a family note folded into this
// check) as an incoming bubble. Not linked yet: say so and offer to link.
// Only this message is shared.
import React, { useEffect, useRef, useState } from 'react';
import { objectOf, possessiveOf, willOf } from '../lib/relations';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Send, Link2, RotateCw } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, Avatar, Pill, Swap, motionOff } from '../ui/base';
import { loopPerson, firstName } from '../ui/pieces';
import * as Family from '../lib/family';
import { updateCheck } from '../lib/history';
import type { Ctx } from '../App';

export default function AskScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const person = loopPerson(s);
  const who = firstName(person?.name) || 'them';
  const rec = ctx.hist.find(h => h.id === ctx.recordId);
  // idle → sending → sent, or failed with a retry. A check already asked about
  // opens as sent, so the reply (or the wait for it) is what shows.
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>(rec?.askedFamily ? 'sent' : 'idle');
  const reply = (rec?.notes || []).filter(n => !n.mine).slice(-1)[0];
  const her = possessiveOf(person?.relation);
  const quote = (rec?.excerpt || ctx.msg || '').trim();
  const linked = s.familyLinked && s.familyRole === 'owner';
  const sent = state === 'sent';

  // Pull any reply that came in while we were away.
  useEffect(() => { if (sent && !reply && linked) void ctx.refreshFamily(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    if (!rec || !linked || state === 'sending') return;
    setState('sending');
    let ok = false;
    try { ok = await Family.publish(rec, s, true); } catch { ok = false; }
    if (!ok) { setState('failed'); return; }
    await updateCheck(rec.id, { askedFamily: true });
    ctx.refreshHist();
    setState('sent');
  };

  const sub = !linked ? who + ' isn’t linked yet'
    : sent ? (reply ? who + ' answered' : 'Sent to ' + her + ' phone')
    : willOf(person?.relation) + ' get it on ' + her + ' phone right away';

  return (
    <Screen C={C} playKey="ask" scroll>
      <BackLink color={C.accent} onPress={() => ctx.go(rec && ctx.recordId ? (rec.level === 'red' ? 'scam' : rec.level === 'amber' ? 'amber' : 'green') : 'family')} />
      <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={person?.name || '?'} photo={person?.photo} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={[font(26, '700'), { color: C.ink }]} allowFontScaling>Ask {who}</Text>
          <Text style={[font(15, '400'), { color: C.ink2, marginTop: 2 }]} allowFontScaling>{sub}</Text>
        </View>
      </View>

      <View style={{ flex: 1, paddingTop: 22, paddingHorizontal: 16, gap: 4 }}>
        {rec ? (
          <View style={st.out}>
            <Text style={[font(16, '600'), { color: '#fff', marginBottom: 6 }]} allowFontScaling>Is this real?</Text>
            <View style={st.quoteBox}><Text style={[font(15, '400', 1.38), { color: '#fff' }]} allowFontScaling numberOfLines={6}>“{quote}”</Text></View>
          </View>
        ) : (
          <View style={[st.empty, { backgroundColor: C.card }]}>
            <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>Check a message first</Text>
            <Text style={[font(15, '400', 1.4), { color: C.ink2, marginTop: 4 }]} allowFontScaling>Paste or share a text on the Check tab. Then you can send it to {who} and ask if it’s real.</Text>
          </View>
        )}
        {state === 'sending' && <Text style={[font(13, '400'), st.status, { color: C.meta }]} allowFontScaling>Sending…</Text>}
        {sent && <Text style={[font(13, '400'), st.status, { color: C.meta }]} allowFontScaling>Delivered</Text>}
        {state === 'failed' && <Text style={[font(13, '500'), st.status, { color: C.redText }]} allowFontScaling>Not sent. Check your internet and iCloud, then try again.</Text>}
        {sent && !reply && <Typing C={C} />}
        {!!reply && (
          <Swap playKey={reply.text} style={[st.inBubble, { backgroundColor: C.card }]}>
            <Text style={[font(16, '400', 1.38), { color: C.ink }]} allowFontScaling>{reply.text}</Text>
          </Swap>
        )}
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {!rec ? (
          <Pill label="Go to Check" onPress={() => ctx.go('home')} />
        ) : !linked && !sent ? (
          <>
            <Pill label={'Link with ' + who} onPress={() => ctx.go('family')} icon={<Link2 size={19} color="#fff" strokeWidth={2} />} />
            <Text style={[font(15, '400', 1.35), { color: C.ink2, textAlign: 'center', paddingTop: 10 }]} allowFontScaling>Once {who} accepts your invite, you can ask {objectOf(person?.relation)} about any message.</Text>
          </>
        ) : !sent ? (
          <>
            <Pill label={state === 'failed' ? 'Try again' : state === 'sending' ? 'Sending…' : 'Send to ' + who} disabled={state === 'sending'} onPress={send} icon={state === 'failed' ? <RotateCw size={19} color="#fff" strokeWidth={2} /> : <Send size={19} color="#fff" strokeWidth={2} />} />
            <Text style={[font(15, '400', 1.35), { color: C.ink2, textAlign: 'center', paddingTop: 10 }]} allowFontScaling>Only this message is shared. Nothing else on your phone.</Text>
          </>
        ) : (
          <Pill label="Back to Check" bg={C.card} color={C.accent} onPress={() => ctx.go('home')} />
        )}
      </View>
    </Screen>
  );
}

function Typing({ C }: { C: Ctx['C'] }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    if (motionOff()) return;
    const loops = dots.map((d, i) => Animated.loop(Animated.sequence([Animated.delay(i * 200), Animated.timing(d, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), Animated.timing(d, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })])));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={[st.typing, { backgroundColor: C.sep2 }]}>
      {dots.map((d, i) => <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.iosGrey, opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }), transform: [{ scale: d.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }} />)}
    </View>
  );
}

const st = StyleSheet.create({
  out: { alignSelf: 'flex-end', maxWidth: 290, backgroundColor: T.green, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 6, borderBottomLeftRadius: 20, paddingTop: 10, paddingHorizontal: 14, paddingBottom: 11 },
  quoteBox: { backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  typing: { alignSelf: 'flex-start', marginTop: 12, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', gap: 5 },
  status: { alignSelf: 'flex-end', marginTop: 2, marginRight: 4, textAlign: 'right' },
  empty: { borderRadius: 20, padding: 16 },
  inBubble: { alignSelf: 'flex-start', maxWidth: 280, marginTop: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderBottomLeftRadius: 6, paddingTop: 10, paddingHorizontal: 14, paddingBottom: 11 },
});
