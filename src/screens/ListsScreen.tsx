// Blocked Numbers and Safe Senders. Plain grouped lists; add by typing,
// remove with one tap. Blocking goes to the call directory too.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { X, Plus } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, ScreenTitle, Lead, Note } from '../ui/base';
import { callDirectoryReload } from '../../modules/scam-ai';
import type { Ctx } from '../App';

export default function ListsScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const blocked = ctx.screen === 'blocked';
  const [value, setValue] = useState('');
  const items = blocked ? s.blocked : s.allowlist;

  const add = async () => {
    const v = value.trim();
    if (!v) return;
    if (blocked) {
      const d = v.replace(/\D/g, '');
      if (d.length < 7) { ctx.flash('Type the whole number, with the area code.'); return; }
      if (s.blocked.includes(d)) { ctx.flash('That number is already blocked.'); return; }
      await ctx.blockNumber(v);
    } else {
      if (s.allowlist.some(a => a.toLowerCase() === v.toLowerCase())) { ctx.flash('Already a safe sender.'); return; }
      ctx.update({ ...s, allowlist: [...s.allowlist, v] });
    }
    setValue('');
  };
  const remove = async (x: string) => {
    if (blocked) { ctx.update({ ...s, blocked: s.blocked.filter(b => b !== x) }); await callDirectoryReload(); }
    else ctx.update({ ...s, allowlist: s.allowlist.filter(a => a !== x) });
  };
  const pretty = (d: string) => d.length === 11 && d.startsWith('1') ? `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d;

  return (
    <Screen C={C} playKey={ctx.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }} keyboardShouldPersistTaps="handled">
        <BackLink label="Settings" onPress={() => ctx.go('settings')} />
        <ScreenTitle C={C}>{blocked ? 'Blocked Numbers' : 'Safe Senders'}</ScreenTitle>
        <Lead C={C}>{blocked ? 'These can’t call or text you. Loop Me tells your iPhone to stop them.' : 'Texts from these names or numbers are never flagged.'}</Lead>
        <View style={[st.addRow, { backgroundColor: C.card }]}>
          <TextInput value={value} onChangeText={setValue} placeholder={blocked ? 'Number to block' : 'Name or number'} placeholderTextColor={C.meta} keyboardType={blocked ? 'phone-pad' : 'default'} returnKeyType="done" onSubmitEditing={add}
            style={[font(17, '400'), { color: C.ink, flex: 1, height: 44 }]} />
          <Pressable onPress={add} style={({ pressed }) => [st.plus, { backgroundColor: C.greenTint }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Add"><Plus size={18} color={T.green} strokeWidth={2.2} /></Pressable>
        </View>
        {items.length === 0 ? (
          <Note C={C} top={18}>{blocked ? 'Nothing blocked yet. Block a number from a scam’s screen, or type one above.' : 'Nobody yet. When Loop Me gets one wrong, “No, it’s really them” adds them here.'}</Note>
        ) : (
          <View style={[st.list, { backgroundColor: C.card }]}>
            {items.map((x, i) => (
              <View key={x} style={[st.row, i < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.sep }]}>
                <Text style={[font(17, '400'), { color: C.ink, flex: 1 }]} allowFontScaling>{blocked ? pretty(x) : x}</Text>
                <Pressable onPress={() => remove(x)} hitSlop={10} accessibilityRole="button" accessibilityLabel={'Remove ' + x}><X size={18} color={C.meta} strokeWidth={2} /></Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  addRow: { marginHorizontal: 16, marginTop: 16, borderRadius: 12, paddingLeft: 16, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  plus: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { marginHorizontal: 16, marginTop: 14, borderRadius: 12, paddingLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingRight: 16 },
});
