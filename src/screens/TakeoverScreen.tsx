// The verdict, full screen: red (scam), amber (be careful), green (looks okay).
// Padding 70/22, headline 50/800, the message as a white card with the flagged
// phrases underlined, numbered reasons, who has been looped in, then the
// buttons. Exact per the handoff screens 03, 05 and 06.
import { highlights, headline as explainHeadline } from '../engine/explain';
import React, { useEffect } from 'react';
import * as Speech from 'expo-speech';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Phone, Send } from 'lucide-react-native';
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
  const sender = senderLabel(rec, ctx.howOf(ctx.recordId));
  const digits = (rec?.sender || '').replace(/\D/g, '');
  const canBlock = digits.length >= 7 && !s.blocked.includes(digits);
  // Who to call: the person in the loop first, then anyone saved with a number.
  const trusted = [person, ...s.trusted].find(p => !!p && (p.phone || '').replace(/\D/g, '').length >= 3) || null;

  const block = async () => {
    if (!rec?.sender) return;
    await ctx.blockNumber(rec.sender);
    ctx.back();
  };
  const call = (phone: string) => Linking.openURL('tel:' + phone.replace(/[^\d+]/g, '')).catch(() => {});
  const ask = () => { if (person?.linked) ctx.go('ask'); else { ctx.flash('Send someone the invite first.'); ctx.go('family'); } };

  // The engine's "nothing to check" step names a "Check it" button this app
  // doesn't have; say what to actually do.
  const safeStep = /check it/i.test(v?.safeStep || '') ? 'There were no words to check. Paste or type the message itself, then check it again.' : v?.safeStep;
  // A phone call (from "Was it a phone call?") has nothing to reply to.
  const isCall = !!rec?.tags?.includes('call');
  const headline = level === 'red' ? (isCall ? 'Hang up.\nThat’s a scam call.' : 'Stop.\nDon’t reply.') : level === 'amber' ? 'Be careful.' : 'Looks okay.';
  // Read answers aloud (Settings): the verdict is spoken as it appears.
  useEffect(() => {
    if (!s.readAloud) return;
    Speech.speak(headline.replace('\n', ' ') + ' ' + sub, { rate: 0.9 });
    return () => { Speech.stop(); };
  }, [ctx.recordId]); // eslint-disable-line react-hooks/exhaustive-deps
  // One plain line here; the reasons, one by one, live on Show me more.
  const sub = isCall && level === 'red' ? 'If they call again, hang up. Then call the person or company on a number you already have.' : explainHeadline(ctx.msg, level, v?.tags || []);

  return (
    <Takeover color={color} haptic={level === 'red' ? 'error' : level === 'amber' ? 'warning' : null} playKey={ctx.recordId + level}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 70, paddingHorizontal: 22, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <Text style={[font(50, '800', 1.0, -1), { color: '#fff' }]} allowFontScaling>{headline}</Text>
        <Text style={[font(18, '400', 1.4), { color: '#fff', marginTop: 14 }]} allowFontScaling>{sub}</Text>

        <MessageCard C={{ ...C, card: '#fff', ink: '#000', meta: '#000' }} sender={sender} when={whenLabel(rec?.at || Date.now())} text={ctx.msg}
          matches={highlights(ctx.msg, level, v?.tags || [])}
          mark={level === 'amber' ? T.amberInk : T.redInk} underline={level === 'amber' ? T.amber : T.red}
          shadow={level === 'red' ? 'rgba(80,10,0,.25)' : level === 'amber' ? 'rgba(60,30,0,.25)' : undefined}
          style={{ marginTop: 20 }} />

        {level === 'amber' && (
          <>
            <Text style={[font(17, '600', 1.4), { color: '#fff', marginTop: 18 }]} allowFontScaling>What to do</Text>
            <Text style={[font(16, '400', 1.45), { color: '#fff', marginTop: 4 }]} allowFontScaling>{safeStep || 'Don’t tap or reply yet. Check with them on a number you already have.'}</Text>
          </>
        )}
        {level === 'green' && (
          <Text style={[font(16, '400', 1.45), { color: '#fff', marginTop: 18 }]} allowFontScaling>
            {/feels off/i.test(safeStep || '') ? safeStep
              : (safeStep && safeStep !== 'Nothing to do.' ? safeStep + ' ' : '') + 'If it still feels off, ' + (who ? 'ask ' + who + '.' : 'ask someone you trust.')}
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
                  <TextBtn label="Leave it" onPress={() => ctx.back()} style={{ flex: 1 }} />
                </View>
              ) : (
                <>
                  <Pill label="Show me more" bg="#fff" color={T.red} onPress={() => ctx.go('detail')} />
                  <Pill label="Leave it" bg="rgba(255,255,255,.2)" onPress={() => ctx.back()} />
                </>
              )}
            </>
          )}
          {level === 'amber' && (
            <>
              {!!trusted && <Pill label={'Call ' + firstName(trusted.name)} bg="#fff" color={T.amberInk} onPress={() => call(trusted.phone)} icon={<Phone size={18} color={T.amberInk} strokeWidth={2.2} />} />}
              {person?.linked && <Pill label={'Ask ' + who} bg={trusted ? 'rgba(255,255,255,.22)' : '#fff'} color={trusted ? '#fff' : T.amberInk} onPress={ask} icon={<Send size={18} color={trusted ? '#fff' : T.amberInk} strokeWidth={2.2} />} />}
              {!person?.linked && !trusted ? (
                <>
                  <Pill label="Show me more" bg="#fff" color={T.amberInk} onPress={() => ctx.go('detail')} />
                  <Pill label="Close" bg="rgba(255,255,255,.22)" onPress={() => ctx.back()} />
                </>
              ) : (
                <View style={{ flexDirection: 'row', marginTop: 2 }}>
                  <TextBtn label="Show me more" onPress={() => ctx.go('detail')} style={{ flex: 1 }} />
                  <TextBtn label="Close" onPress={() => ctx.back()} style={{ flex: 1 }} />
                </View>
              )}
            </>
          )}
          {level === 'green' && (
            <>
              <Pill label="Done" bg="#fff" color={T.greenDeep} onPress={() => { Haptics.selectionAsync().catch(() => {}); ctx.back(); }} />
              <Pill label={who ? 'Ask ' + who + ' anyway' : 'Ask someone anyway'} bg="rgba(255,255,255,.2)" onPress={ask} />
              {!!rec && (
                <Pressable onPress={() => ctx.markScam(rec.id)} accessibilityRole="button" style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}>
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
