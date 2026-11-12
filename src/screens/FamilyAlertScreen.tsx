// The caretaker's phone, the moment something is flagged on the other one.
// A red or amber takeover: whose phone, what happened, the text. Two
// answers, then call-and-read-together and a note.
import React, { useEffect } from 'react';
import { Linking, Text, View } from 'react-native';
import { T, font } from '../theme';
import { Takeover, Pill, TextBtn, Avatar } from '../ui/base';
import { firstName, whenLabel } from '../ui/pieces';
import { quickNote } from '../lib/family';
import { startCallActivity } from '../../modules/scam-ai';
import type { Ctx } from '../App';

export default function FamilyAlertScreen({ ctx }: { ctx: Ctx }) {
  const rec = ctx.hist.find(h => h.id === ctx.alertId);
  useEffect(() => { if (!rec) ctx.closeFamilyAlert(); }, [rec]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rec) return null;
  const s = ctx.settings;
  const name = firstName(s.watching?.name) || firstName(rec.from) || 'They';
  const red = rec.level !== 'amber';
  const field = red ? T.red : T.amber;
  const phone = s.watching?.phone;
  const headline = rec.askedFamily ? name + ' asked you about a text.' : red ? name + ' got a scam text.' : 'A text on ' + name + '’s phone looks off.';

  const reply = async (verdict: 'scam' | 'safe' | 'call') => {
    await ctx.sendNoteTo(rec.id, quickNote(verdict), verdict);
    if (verdict === 'call' && phone) {
      startCallActivity(name, rec.excerpt, red ? 'red' : 'amber', red ? 'Tell them: don’t reply, don’t tap, delete it.' : 'Read it together. If they were asked for money or a code, it’s a scam.');
      Linking.openURL('tel:' + phone.replace(/[^\d+]/g, '')).catch(() => {});
    }
    ctx.closeFamilyAlert();
  };

  return (
    <Takeover color={field} haptic={red ? 'error' : 'warning'} playKey={rec.id}>
      <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 22, paddingBottom: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar name={s.watching?.name || name} photo={s.watching?.photo} size={30} onPhoto />
          <Text style={[font(15, '600'), { color: '#fff' }]} allowFontScaling>{name}’s phone · {whenLabel(rec.at)}</Text>
        </View>
        <Text style={[font(44, '800', 1.02, -1), { color: '#fff', marginTop: 18 }]} allowFontScaling>{headline}</Text>
        <View style={{ marginTop: 20, backgroundColor: '#fff', borderRadius: 20, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, shadowColor: red ? 'rgba(80,10,0,1)' : 'rgba(60,30,0,1)', shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: 12 } }}>
          <Text style={[font(13, '400'), { color: '#000' }]} allowFontScaling>{rec.sender || 'Unknown number'}</Text>
          <Text style={[font(16.5, '400', 1.4), { color: '#000', marginTop: 8 }]} allowFontScaling numberOfLines={6}>{rec.excerpt}</Text>
        </View>
        <Text style={[font(16, '400', 1.4), { color: '#fff', marginTop: 14 }]} allowFontScaling>{name} has been told: {rec.reason}</Text>
        <View style={{ marginTop: 'auto', paddingTop: 20, gap: 10 }}>
          <Pill label={'Tell ' + name + ' it’s a scam'} bg="#fff" color={field} onPress={() => reply('scam')} />
          <Pill label="That one’s fine" bg="rgba(255,255,255,.2)" onPress={() => reply('safe')} />
          <View style={{ flexDirection: 'row', marginTop: 2 }}>
            <TextBtn label={phone ? 'Call ' + name + ', read it together' : 'Say you’ll call'} onPress={() => reply('call')} style={{ flex: 1 }} />
            <TextBtn label="Write a note" onPress={() => ctx.openWard(rec.id)} style={{ flex: 1 }} />
          </View>
          <TextBtn label="Later" onPress={ctx.closeFamilyAlert} />
        </View>
      </View>
    </Takeover>
  );
}
