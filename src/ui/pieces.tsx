// Pieces shared by the check screens: the message card, highlighted phrases,
// who is in the loop. Real data only.
import React from 'react';
import { Text, View, StyleProp, ViewStyle } from 'react-native';
import { T, font, Palette } from '../theme';
import type { Settings, TrustedPerson } from '../lib/storage';
import type { CheckRecord } from '../lib/history';

/** The person who hears about scams: the linked caretaker, with their photo when we have it. */
export function loopPerson(s: Settings): (TrustedPerson & { linked: boolean }) | null {
  const main = s.trusted[0];
  if (!main) {
    // Linked over iCloud but not saved as a person here (older installs).
    const linkedName = s.familyLinked && s.familyRole === 'owner' ? s.watchedBy : null;
    return linkedName ? { name: linkedName, phone: '', linked: true } : null;
  }
  const names = s.familyLinked && s.familyRole === 'owner' ? (s.linkedNames.length ? s.linkedNames : (s.watchedBy ? [s.watchedBy] : [])) : [];
  const first = main.name.split(' ')[0].toLowerCase();
  const linked = names.some(n => n.toLowerCase().startsWith(first) || first.startsWith(n.split(' ')[0].toLowerCase()));
  return { ...main, linked };
}

export const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || '';

/** "Today 9:41", "Sunday 10:11", "Nov 3 9:41". */
export function whenLabel(at: number): string {
  const d = new Date(at), now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return 'Today ' + time;
  const days = (now.getTime() - d.getTime()) / 86400000;
  if (days < 6) return d.toLocaleDateString(undefined, { weekday: 'long' }) + ' ' + time;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + time;
}

export function senderLabel(rec?: Pick<CheckRecord, 'sender' | 'source'> | null): string {
  if (!rec) return 'Unknown number';
  if (rec.sender) return rec.sender;
  if (rec.source === 'filter') return 'Unknown number';
  return 'Pasted message';
}

/** Message text with the flagged phrases in red-ink, 600, red underline. */
export function Highlighted({ text, matches, color, mark = T.redInk, underline = T.red, size = 16.5, lh = 1.4, style, numberOfLines, lit }: {
  text: string; matches: string[]; color: string; mark?: string; underline?: string; size?: number; lh?: number; style?: StyleProp<ViewStyle>; numberOfLines?: number;
  /** Which matches are lit (index); undefined lights all. */
  lit?: number;
}) {
  const parts: { t: string; hit: number }[] = [];
  // Short phrases only: a whole sentence underlined says nothing.
  const clean = matches.map(m => m.trim()).filter(m => m.length > 1 && m.length <= 40).slice(0, 6);
  let rest = text;
  while (rest.length) {
    let best: { i: number; m: string; k: number } | null = null;
    clean.forEach((m, k) => {
      const i = rest.toLowerCase().indexOf(m.toLowerCase());
      if (i >= 0 && (!best || i < best.i)) best = { i, m, k };
    });
    if (!best) { parts.push({ t: rest, hit: -1 }); break; }
    const b = best as { i: number; m: string; k: number };
    if (b.i > 0) parts.push({ t: rest.slice(0, b.i), hit: -1 });
    parts.push({ t: rest.slice(b.i, b.i + b.m.length), hit: b.k });
    rest = rest.slice(b.i + b.m.length);
  }
  return (
    <Text style={[font(size, '400', lh), { color }, style as object]} allowFontScaling numberOfLines={numberOfLines}>
      {parts.map((p, i) => p.hit < 0 || (lit != null && p.hit > lit)
        ? <Text key={i}>{p.t}</Text>
        : <Text key={i} style={{ color: mark, fontWeight: '600', textDecorationLine: 'underline', textDecorationColor: underline }}>{p.t}</Text>)}
    </Text>
  );
}

/** White message card: sender + time meta, then the text. */
export function MessageCard({ C, sender, when, text, matches = [], mark, underline, shadow, style }: {
  C: Palette; sender: string; when: string; text: string; matches?: string[]; mark?: string; underline?: string; shadow?: string; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: 20, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16 }, shadow ? { shadowColor: shadow, shadowOpacity: 1, shadowRadius: 30, shadowOffset: { width: 0, height: 12 } } : null, style]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[font(13, '400'), { color: C.meta }]} allowFontScaling numberOfLines={1}>{sender}</Text>
        <Text style={[font(13, '400'), { color: C.meta }]} allowFontScaling>{when}</Text>
      </View>
      <View style={{ marginTop: 8 }}>
        <Highlighted text={text} matches={matches} color={C.ink} mark={mark} underline={underline} />
      </View>
    </View>
  );
}

/** The incoming grey iMessage bubble. */
export function Bubble({ C, children, style, radius = 19 }: { C: Palette; children: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number }) {
  return (
    <View style={[{ backgroundColor: C.bubble, borderTopLeftRadius: radius, borderTopRightRadius: radius, borderBottomRightRadius: radius, borderBottomLeftRadius: 6, paddingTop: 9, paddingHorizontal: 13, paddingBottom: 10 }, style]}>
      {children}
    </View>
  );
}
