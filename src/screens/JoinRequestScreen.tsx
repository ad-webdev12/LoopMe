// The protected phone, the moment someone joins its family link: one plain
// question. Nothing reaches the other phone until this person says yes.
import React, { useEffect, useState } from 'react';
import { Text, View, ScrollView } from 'react-native';
import { T, font } from '../theme';
import { Takeover, Pill, Avatar } from '../ui/base';
import { firstName } from '../ui/pieces';
import type { Ctx } from '../App';

export default function JoinRequestScreen({ ctx }: { ctx: Ctx }) {
  const r = ctx.request;
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!r) ctx.go('family'); }, [r]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return null;
  const known = r.name && r.name !== 'Someone';
  const first = known ? firstName(r.name) : 'Someone';
  const answer = async (allow: boolean) => {
    if (busy) return;
    setBusy(true);
    await ctx.answerRequest(allow);
    setBusy(false);
  };

  return (
    <Takeover color={T.green} haptic={null} playKey={r.id}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingTop: 70, paddingHorizontal: 22, paddingBottom: 30 }} showsVerticalScrollIndicator={false} bounces={false}>
        <Avatar name={known ? r.name : '?'} size={72} onPhoto />
        <Text style={[font(40, '800', 1.05, -1), { color: '#fff', marginTop: 20 }]} allowFontScaling>
          {first} wants to link with this phone.
        </Text>
        <Text style={[font(20, '500', 1.35), { color: '#fff', marginTop: 14 }]} allowFontScaling>
          If you say yes, {known ? first : 'they'} will hear about scam texts that reach you, and can send you notes.
        </Text>
        <View style={{ marginTop: 22, backgroundColor: 'rgba(255,255,255,.16)', borderRadius: 18, padding: 16 }}>
          <Text style={[font(17, '400', 1.4), { color: '#fff' }]} allowFontScaling>
            Your other messages stay private. Only say yes if you know {known ? first : 'this person'} and gave them your code.
          </Text>
        </View>
        <View style={{ marginTop: 'auto', paddingTop: 24, gap: 10 }}>
          <Pill label={'Yes, link ' + (known ? first : 'them')} bg="#fff" color={T.greenDeep} disabled={busy} onPress={() => answer(true)} />
          <Pill label="No, I don’t know them" bg="rgba(255,255,255,.2)" disabled={busy} onPress={() => answer(false)} />
        </View>
      </ScrollView>
    </Takeover>
  );
}
