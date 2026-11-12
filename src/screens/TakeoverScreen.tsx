// The verdict, full screen: red (scam), amber (be careful), green (looks okay).
// Padding 70/22, headline 50/800, the message as a white card with the flagged
// phrases underlined, numbered reasons, who has been looped in, then the
// buttons. Exact per the handoff screens 03, 05 and 06.
import React, { useEffect } from 'react';
import * as Speech from 'expo-speech';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { T, font } from '../theme';
import { Takeover, Pill, TextBtn, Avatar } from '../ui/base';
import { MessageCard, loopPerson, firstName, senderLabel, whenLabel } from '../ui/pieces';
import type { Ctx } from '../App';

export default function TakeoverScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const v = ctx.verdict;
  const rec = ctx.hist.find(h => h.id === ctx.recordId);
  const level = ctx.screen === 'scam' ? 'red' : ctx.screen === 'amber' ? 'amber' : 'green';
  const color = level === 'red' ? T.red : level === 'amber' ? T.amber : T.green;
  const person = loopPerson(s);
  const who = firstName(person?.name) || '';
  const sender = senderLabel(rec);
  const digits = (rec?.sender || '').replace(/\D/g, '');
  const canBlock = digits.length >= 7 && !s.blocked.includes(digits);
  const trusted = s.trusted[0];

  const block = async () => {
    if (!rec?.sender) return;
    await ctx.blockNumber(rec.sender);
    ctx.go('home');
    ctx.flash('Blocked. That number can’t call or text you now.');
  };
  const call = (phone: string) => Linking.openURL('tel:' + phone.replace(/[^\d+]/g, '')).catch(() => {});
  const ask = () => { if (person?.linked) ctx.go('ask'); else { ctx.flash('Send someone the invite first.'); ctx.go('family'); } };

  const headline = level === 'red' ? 'Stop.\nDon’t reply.' : level === 'amber' ? 'Be careful.' : 'Looks okay.';
  // Read answers aloud (Settings): the verdict is spoken as it appears.
  useEffect(() => {
    if (!s.readAloud) return;
    Speech.speak(headline.replace('\n', ' ') + ' ' + (v?.reason || ''), { rate: 0.9 });
    return () => { Speech.stop(); };
  }, [ctx.recordId]); // eslint-disable-line react-hooks/exhaustive-deps
  const sub = v?.reason || '';
  // Short reasons here; the full sentences live on Show me more.
  const signals = (v?.signals || []).slice(0, 3).map(x => x.split(/(?<=[.!?])\s/)[0]);

  return (
    <Takeover color={color} haptic={level === 'red' ? 'error' : level === 'amber' ? 'warning' : null} playKey={ctx.recordId + level}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 70, paddingHorizontal: 22, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <Text style={[font(50, '800', 1.0, -1), { color: '#fff' }]} allowFontScaling>{headline}</Text>
        <Text style={[font(18, '400', 1.4), { color: '#fff', marginTop: 14 }]} allowFontScaling>{sub}</Text>

        <MessageCard C={{ ...C, card: '#fff', ink: '#000', meta: '#6c6c70' }} sender={sender} when={whenLabel(rec?.at || Date.now())} text={ctx.msg}
          matches={level === 'green' ? [] : (v?.matches || [])}
          mark={level === 'amber' ? T.amberInk : T.redInk} underline={level === 'amber' ? T.amber : T.red}
          shadow={level === 'red' ? 'rgba(80,10,0,.25)' : level === 'amber' ? 'rgba(60,30,0,.25)' : undefined}
          style={{ marginTop: 20 }} />

        {level === 'red' && signals.length > 0 && (
          <View style={{ marginTop: 18, gap: 9 }}>
            {signals.map((sig, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                <Text style={[font(16, '700'), { color: '#fff', opacity: 0.75 }]} allowFontScaling>{i + 1}</Text>
                <Text style={[font(16, '500', 1.35), { color: '#fff', flex: 1 }]} allowFontScaling>{sig}</Text>
              </View>
            ))}
          </View>
        )}
        {level === 'amber' && (
          <>
            <Text style={[font(17, '600', 1.4), { color: '#fff', marginTop: 18 }]} allowFontScaling>What to do</Text>
            <Text style={[font(16, '400', 1.45), { color: '#fff', marginTop: 4 }]} allowFontScaling>{v?.safeStep || 'Call the number on the back of your card. If it’s really them, they’ll tell you there.'}</Text>
          </>
        )}
        {level === 'green' && (
          <Text style={[font(16, '400', 1.45), { color: '#fff', marginTop: 18 }]} allowFontScaling>
            It doesn’t ask for money, a code or a link.{who ? ' If it still feels off, ask ' + who + '.' : ''}
          </Text>
        )}

        <View style={{ marginTop: 'auto', paddingTop: 24, gap: 10 }}>
          {level !== 'green' && person?.linked && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Avatar name={person.name} photo={person.photo} size={30} onPhoto />
              <Text style={[font(15, '600'), { color: '#fff' }]} allowFontScaling>{who} has been looped in.</Text>
            </View>
          )}
          {level === 'red' && (
            <>
              {canBlock && <Pill label="Block Number" bg="#fff" color={T.red} onPress={block} />}
              {!!trusted && <Pill label={'Call ' + firstName(trusted.name)} bg={canBlock ? 'rgba(255,255,255,.2)' : '#fff'} color={canBlock ? '#fff' : T.red} onPress={() => call(trusted.phone)} />}
              {canBlock || trusted ? (
                <View style={{ flexDirection: 'row', marginTop: 2 }}>
                  <TextBtn label="Show me more" onPress={() => ctx.go('detail')} style={{ flex: 1 }} />
                  <TextBtn label="Leave it" onPress={() => ctx.go('home')} style={{ flex: 1 }} />
                </View>
              ) : (
                <>
                  <Pill label="Show me more" bg="#fff" color={T.red} onPress={() => ctx.go('detail')} />
                  <Pill label="Leave it" bg="rgba(255,255,255,.2)" onPress={() => ctx.go('home')} />
                </>
              )}
            </>
          )}
          {level === 'amber' && (
            <>
              <Pill label="Call the number on your card" bg="#fff" color={T.amberInk} onPress={() => Linking.openURL('tel:').catch(() => ctx.flash('Turn your card over and dial the number on the back.'))} />
              <Pill label={who ? 'Ask ' + who : 'Ask someone'} bg="rgba(255,255,255,.22)" onPress={ask} />
              <TextBtn label="Close" onPress={() => ctx.go('history')} />
            </>
          )}
          {level === 'green' && (
            <>
              <Pill label="Done" bg="#fff" color={T.greenDeep} onPress={() => { Haptics.selectionAsync().catch(() => {}); ctx.go('home'); }} />
              <Pill label={who ? 'Ask ' + who + ' anyway' : 'Ask someone anyway'} bg="rgba(255,255,255,.2)" onPress={ask} />
              {!!rec && (
                <Pressable onPress={() => ctx.correct(rec.id, 'scam').then(() => ctx.flash('Noted. Loop Me will remember.'))} accessibilityRole="button" style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[font(16, '600'), { color: '#fff' }]} allowFontScaling>No, this is a scam</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </Takeover>
  );
}
