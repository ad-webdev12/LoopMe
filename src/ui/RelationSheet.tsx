// "Advith is your ..." chips, shown once when a person is added from Contacts.
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { T, font } from '../theme';
import type { Palette } from '../theme';
import { RELATIONS } from '../lib/relations';

export function RelationSheet({ C, name, onPick, onClose }: { C: Palette; name: string | null; onPick: (relation: string) => void; onClose: () => void }) {
  return (
    <Modal visible={!!name} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.dim} onPress={onClose}>
        <Pressable style={[st.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
          <Text style={[font(20, '700'), { color: C.ink }]} allowFontScaling>{name ? name.split(' ')[0] + ' is your' : ''}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {RELATIONS.map(r => (
              <Pressable key={r} onPress={() => onPick(r)} style={({ pressed }) => [st.rel, { backgroundColor: C.greenTint }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                <Text style={[font(15, '600'), { color: C.dark ? C.accent : T.greenDeep }]} allowFontScaling>{r}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,.35)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  rel: { height: 40, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
