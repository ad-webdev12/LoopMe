// The protected phone, when the person who looks out for them answers: a
// green takeover with their words, exactly as they tapped them.
import React, { useEffect } from 'react';
import { Linking, Text, View, ScrollView } from 'react-native';
import { T, font } from '../theme';
import { Takeover, Pill, Avatar } from '../ui/base';
import { loopPerson, firstName } from '../ui/pieces';
import type { Ctx } from '../App';

export default function NoteScreen({ ctx }: { ctx: Ctx }) {
  const n = ctx.noteOpen;
  useEffect(() => { if (!n) ctx.closeNote(); }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!n) return null;
  const first = firstName(n.from) || 'Family';
  const person = loopPerson(ctx.settings);
  const headline = n.verdict === 'scam' ? first + ' says it’s a scam.'
    : n.verdict === 'safe' ? first + ' says it’s fine.'
    : n.verdict === 'call' ? first + ' is calling you.'
    : n.verdict === 'block' ? first + ' blocked that number.'
    : first + ' sent a note.';
  const color = n.verdict === 'safe' ? T.green : n.verdict === 'scam' ? T.red : T.green;
  const phone = person?.phone;

  return (
    <Takeover color={color} haptic="success" playKey={n.checkId + n.text}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingTop: 70, paddingHorizontal: 22, paddingBottom: 30 }} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {person && <Avatar name={person.name} photo={person.photo} size={30} onPhoto />}
          <Text style={[font(15, '600'), { color: '#fff' }]} allowFontScaling>From {first}, just now</Text>
        </View>
        <Text style={[font(44, '800', 1.02, -1), { color: '#fff', marginTop: 18 }]} allowFontScaling>{headline}</Text>
        <View style={{ marginTop: 20, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 }}>
          <Text style={[font(18, '400', 1.4), { color: '#000' }]} allowFontScaling>“{n.text}”</Text>
        </View>
        <View style={{ marginTop: 'auto', gap: 10 }}>
          <Pill label="Okay" bg="#fff" color={color === T.red ? T.red : T.greenDeep} onPress={ctx.closeNote} />
          {!!phone && <Pill label={'Call ' + first} bg="rgba(255,255,255,.2)" onPress={() => Linking.openURL('tel:' + phone.replace(/[^\d+]/g, '')).catch(() => {})} />}
        </View>
      </ScrollView>
    </Takeover>
  );
}
