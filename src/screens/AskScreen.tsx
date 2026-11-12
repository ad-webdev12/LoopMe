// Ask {name}. The message goes to their phone over the family link as an
// outgoing bubble; "Delivered", typing dots while we wait, then their real
// reply as an incoming bubble. Only this message is shared.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Send } from 'lucide-react-native';
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
  const [sent, setSent] = useState(!!rec?.askedFamily);
  const reply = (rec?.notes || []).filter(n => !n.mine).slice(-1)[0];
  const her = person?.relation === 'Daughter' || person?.relation === 'Sister' ? 'her' : person?.relation === 'Son' || person?.relation === 'Brother' ? 'him' : 'them';
  const quote = (ctx.msg || rec?.excerpt || '').trim();

  const send = async () => {
    if (!rec) { ctx.flash('Check a message first, then ask.'); return; }
    if (!s.familyLinked || s.familyRole !== 'owner') { ctx.go('watchedBy'); return; }
    setSent(true);
    const ok = await Family.publish(rec, s, true);
    await updateCheck(rec.id, { askedFamily: true });
    ctx.refreshHist();
    if (!ok) ctx.flash('Could not reach iCloud just now. It will go when the phone is back online.');
  };

  return (
    <Screen C={C} playKey="ask">
      <BackLink onPress={() => ctx.go(rec ? (rec.level === 'red' ? 'scam' : rec.level === 'amber' ? 'amber' : 'green') : 'family')} />
      <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={person?.name || '?'} photo={person?.photo} size={48} />
        <View>
          <Text style={[font(26, '700'), { color: C.ink }]} allowFontScaling>Ask {who}</Text>
          <Text style={[font(15, '400'), { color: C.ink2, marginTop: 2 }]} allowFontScaling>{sent ? 'Sent to ' + her + ' phone' : (person?.relation === 'Daughter' ? 'She’ll' : person?.relation === 'Son' ? 'He’ll' : 'They’ll') + ' get it on their phone right away'}</Text>
        </View>
      </View>

      <View style={{ flex: 1, paddingTop: 22, paddingHorizontal: 16, gap: 4 }}>
        <View style={st.out}>
          <Text style={[font(16, '600'), { color: '#fff', marginBottom: 6 }]} allowFontScaling>Is this real?</Text>
          <View style={st.quoteBox}><Text style={[font(15, '400', 1.38), { color: '#fff' }]} allowFontScaling numberOfLines={6}>“{quote}”</Text></View>
        </View>
        {sent && <Text style={[font(13, '400'), { color: C.meta, alignSelf: 'flex-end', marginTop: 2, marginRight: 4 }]} allowFontScaling>Delivered</Text>}
        {sent && !reply && <Typing C={C} />}
        {!!reply && (
          <Swap playKey={reply.text} style={[st.inBubble, { backgroundColor: C.card }]}>
            <Text style={[font(16, '400', 1.38), { color: C.ink }]} allowFontScaling>{reply.text}</Text>
          </Swap>
        )}
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {!sent ? (
          <>
            <Pill label={'Send to ' + who} onPress={send} icon={<Send size={19} color="#fff" strokeWidth={2} />} />
            <Text style={[font(15, '400'), { color: C.ink2, textAlign: 'center', paddingTop: 10 }]} allowFontScaling>Only this message is shared. Nothing else on your phone.</Text>
          </>
        ) : (
          <Pill label="Back to Check" bg={C.card} color={T.green} onPress={() => ctx.go('home')} />
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
  inBubble: { alignSelf: 'flex-start', maxWidth: 280, marginTop: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderBottomLeftRadius: 6, paddingTop: 10, paddingHorizontal: 14, paddingBottom: 11 },
});
