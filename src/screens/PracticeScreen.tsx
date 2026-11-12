// Practice a scam call. Dark takeover that looks like an incoming call. One
// screen, three states: intro, the call (timer, the caller's line, three
// answers), the result.
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Phone, PhoneOff, TriangleAlert } from 'lucide-react-native';
import { T, font } from '../theme';
import { Takeover, Pill, Swap } from '../ui/base';
import type { Ctx } from '../App';

export default function PracticeScreen({ ctx }: { ctx: Ctx }) {
  const [state, setState] = useState<'intro' | 'call' | 'good' | 'bad'>('intro');
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (state !== 'call') return;
    setSecs(0);
    const t = setInterval(() => setSecs(x => x + 1), 1000);
    return () => clearInterval(t);
  }, [state]);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
  const white = '#fff';

  return (
    <Takeover color={T.practice} haptic={null} playKey="practice">
      <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 24 }}>
        <Text style={[font(17, '400'), { color: '#fff', textAlign: 'center' }]} allowFontScaling>Practice call</Text>
        <Text style={[font(32, '500'), { color: white, textAlign: 'center', marginTop: 6 }]} allowFontScaling>Unknown caller</Text>
        <View style={st.badge}>
          <TriangleAlert size={16} color="#ff8a75" strokeWidth={2.2} />
          <Text style={[font(14, '600'), { color: '#ff8a75' }]} allowFontScaling>Pretend caller. Nobody is really calling.</Text>
        </View>

        {state === 'intro' && (
          <>
            <View style={st.bottom}>
              <Pill label="Start the practice call" height={58} onPress={() => setState('call')} icon={<Phone size={20} color="#fff" strokeWidth={2} />} />
              <Pill label="Not now" height={54} bg="transparent" border="rgba(255,255,255,.3)" onPress={() => ctx.go('settings')} />
            </View>
          </>
        )}

        {state === 'call' && (
          <>
            <Text style={[font(15, '400'), { color: '#fff', textAlign: 'center', marginTop: 12 }]} allowFontScaling>{mm}</Text>
            <Swap playKey="line" ms={300} style={st.bubble}>
              <Text style={[font(17, '400', 1.45), { color: white }]} allowFontScaling>“This is Officer Daniels with the IRS. There’s a warrant out for your arrest. You can settle it today with Apple gift cards. Don’t hang up.”</Text>
            </Swap>
            <Text style={[font(20, '700'), { color: white, marginTop: 22 }]} allowFontScaling>What would you do?</Text>
            <View style={st.bottom}>
              <Pill label="Ask how to buy the gift cards" height={56} bg={T.practiceCard} onPress={() => setState('bad')} style={{ borderRadius: 16, justifyContent: 'flex-start', paddingLeft: 18 }} />
              <Pill label="Give them my Social Security number" height={56} bg={T.practiceCard} onPress={() => setState('bad')} style={{ borderRadius: 16, justifyContent: 'flex-start', paddingLeft: 18 }} />
              <Pill label="Hang up" height={56} bg={T.red} onPress={() => setState('good')} style={{ borderRadius: 16 }} icon={<PhoneOff size={20} color="#fff" strokeWidth={2} />} />
            </View>
          </>
        )}

        {state === 'good' && (
          <>
            <Swap playKey="good" style={[st.card, { backgroundColor: T.green, borderRadius: 20, padding: 20 }]}>
              <Text style={[font(28, '800'), { color: white }]} allowFontScaling>Right. Hang up.</Text>
              <Text style={[font(16, '400', 1.45), { color: white, marginTop: 8 }]} allowFontScaling>The IRS never calls about warrants, and nobody real takes gift cards. Hanging up is always allowed.</Text>
            </Swap>
            <View style={st.bottom}>
              <Pill label="Done" bg="#fff" color={T.greenDeep} onPress={() => ctx.go('learn')} />
              <Pill label="Practice again" height={54} bg="transparent" border="rgba(255,255,255,.3)" onPress={() => setState('call')} />
            </View>
          </>
        )}

        {state === 'bad' && (
          <>
            <Swap playKey="bad" style={[st.card, { backgroundColor: T.red, borderRadius: 20, padding: 20 }]}>
              <Text style={[font(28, '800'), { color: white }]} allowFontScaling>That’s what they want.</Text>
              <Text style={[font(16, '400', 1.45), { color: white, marginTop: 8 }]} allowFontScaling>It’s easy to do when someone sounds official. The safe move is always to hang up and call back on a number you trust.</Text>
            </Swap>
            <View style={st.bottom}>
              <Pill label="Try it again" bg="#fff" color={T.practice} onPress={() => setState('call')} />
              <Pill label="Read the five tricks" height={54} bg="transparent" border="rgba(255,255,255,.3)" onPress={() => ctx.go('learn')} />
            </View>
          </>
        )}
      </View>
    </Takeover>
  );
}

const st = StyleSheet.create({
  badge: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(236,48,19,.18)' },
  card: { marginTop: 28, backgroundColor: T.practiceCard, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18 },
  bubble: { marginTop: 20, backgroundColor: T.practiceCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderBottomLeftRadius: 6, paddingVertical: 14, paddingHorizontal: 16 },
  bottom: { marginTop: 'auto', paddingBottom: 40, gap: 10 },
});
