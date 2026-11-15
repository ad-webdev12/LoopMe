// Loop Me's own contact picker. The system one (CNContactPickerViewController)
// put its search field at the bottom on iOS 26 where it did nothing, and on
// some phones the row that was tapped was not the row that came back. This
// list is plain: big rows, a search box that works, one tap returns the person.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Contacts from 'expo-contacts';
import { X } from 'lucide-react-native';
import { T, font } from '../theme';
import type { Palette } from '../theme';
import { Avatar } from './base';

type Opener = (resolve: (c: Contacts.Contact | null) => void) => void;
let opener: Opener | null = null;

/** Opens the picker. Resolves with the contact, or null when dismissed. */
export function openContactPicker(): Promise<Contacts.Contact | null> {
  return new Promise(resolve => {
    if (!opener) { resolve(null); return; }
    opener(resolve);
  });
}

function nameOf(c: Contacts.Contact): string {
  const joined = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  return (c.name || '').trim() || joined || (c.nickname || '').trim() || (c.company || '').trim();
}
function phoneOf(c: Contacts.Contact): string {
  const n = c.phoneNumbers || [];
  const best = n.find(x => /mobile|iphone|cell/i.test(x.label || '')) || n[0];
  return (best?.number || '').trim();
}

/** Mount once, near the root. Owns the modal and hands results back to openContactPicker. */
export function ContactPickerHost({ C }: { C: Palette }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<Contacts.Contact[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const resolver = useRef<((c: Contacts.Contact | null) => void) | null>(null);

  useEffect(() => {
    opener = resolve => {
      resolver.current = resolve;
      setQ('');
      setOpen(true);
      setLoading(true);
      Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.FirstName, Contacts.Fields.LastName, Contacts.Fields.PhoneNumbers], sort: Contacts.SortTypes.FirstName })
        .then(r => {
          // iCloud and local copies of the same person show up twice; keep one.
          const seen = new Set<string>();
          setAll((r.data || []).filter(c => {
            if (!nameOf(c) || !phoneOf(c)) return false;
            // Same number and same first name is the same person, however the card is spelled.
            const k = nameOf(c).toLowerCase().replace(/\s+/g, ' ').split(' ')[0] + '|' + phoneOf(c).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
            if (seen.has(k)) return false;
            seen.add(k); return true;
          }));
        })
        .catch(() => setAll([]))
        .finally(() => setLoading(false));
    };
    return () => { opener = null; };
  }, []);

  const finish = (c: Contacts.Contact | null) => {
    setOpen(false);
    const r = resolver.current; resolver.current = null;
    r?.(c);
  };

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;
    const digits = s.replace(/\D/g, '');
    // Match the start of any word in the name ("ha" finds Hank and Sarah Hall, not Bhamre).
    return all.filter(c => nameOf(c).toLowerCase().split(/\s+/).some(w => w.startsWith(s)) || nameOf(c).toLowerCase().startsWith(s) || (digits.length >= 3 && phoneOf(c).replace(/\D/g, '').includes(digits)));
  }, [all, q]);

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => finish(null)}>
      <View style={{ flex: 1, backgroundColor: C.ground }}>
        <View style={st.top}>
          <Text style={[font(20, '700'), { color: C.ink, flex: 1 }]} allowFontScaling>Choose a person</Text>
          <Pressable onPress={() => finish(null)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={[st.close, { backgroundColor: C.card }]}>
            <X size={20} color={C.ink} strokeWidth={2.2} />
          </Pressable>
        </View>
        <TextInput value={q} onChangeText={setQ} placeholder="Search by name or number" placeholderTextColor={C.ink2} autoCorrect={false} clearButtonMode="while-editing" returnKeyType="search" autoFocus
          style={[font(17, '400'), st.search, { color: C.ink, backgroundColor: C.card }]} accessibilityLabel="Search contacts" />
        <FlatList
          data={rows}
          keyExtractor={(c, i) => (c as { id?: string }).id || String(i)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={<Text style={[font(15, '400'), { color: C.ink2, textAlign: 'center', marginTop: 40 }]} allowFontScaling>{loading ? 'Loading your contacts' : all.length ? 'Nobody matches that.' : 'No contacts with a phone number.'}</Text>}
          renderItem={({ item }) => {
            const name = nameOf(item);
            return (
              <Pressable onPress={() => finish(item)} accessibilityRole="button" accessibilityLabel={name} style={({ pressed }) => [st.row, { backgroundColor: pressed ? C.card : 'transparent' }]}>
                <Avatar name={name} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling numberOfLines={1}>{name}</Text>
                  <Text style={[font(15, '400'), { color: C.ink2, marginTop: 1 }]} allowFontScaling numberOfLines={1}>{phoneOf(item)}</Text>
                </View>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.sep, marginLeft: 76 }} />}
        />
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: 16, marginBottom: 8, height: 48, borderRadius: 12, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12, minHeight: 64 },
});
void T;
