// Design tokens, taken literally from design_handoff_loop_me_app/README.md.
// Red means danger only. Amber means be careful. Green carries every safe and
// primary action. SF Pro (the system font) everywhere; the weights below are
// the only ones used.
import type { TextStyle } from 'react-native';
import { OctagonX, TriangleAlert, CircleCheck } from 'lucide-react-native';

// Legacy font map. The intro and onboarding (kept as they were) still use
// Archivo through these names; every redesigned screen uses `font()` below.
export const F = {
  display: 'Archivo_800ExtraBold',
  displayBold: 'Archivo_800ExtraBold',
  bold: 'Archivo_700Bold',
  bodyBold: 'Archivo_700Bold',
  semibold: 'Archivo_600SemiBold',
  medium: 'Archivo_500Medium',
  body: 'Archivo_400Regular',
} as const;

export type Weight = '400' | '500' | '600' | '700' | '800';

/** System font at an exact size, weight, line-height (ratio) and letter-spacing. */
export function font(size: number, weight: Weight = '400', lh?: number, ls?: number): TextStyle {
  const s: TextStyle = { fontSize: size, fontWeight: weight };
  if (lh != null) s.lineHeight = Math.round(size * lh * 10) / 10;
  if (ls != null) s.letterSpacing = ls;
  return s;
}

export interface Palette {
  ground: string; card: string; ink: string; ink2: string; meta: string;
  sep: string; sep2: string; segTrack: string; chevron: string; pressed: string;
  greenTint: string; greenFine: string; redTint: string; amberTint: string;
  bubble: string; switchOff: string; dark: boolean;
}

export const LIGHT: Palette = {
  ground: '#f2f2f7', card: '#ffffff', ink: '#000000', ink2: '#3c3c43', meta: '#6c6c70',
  sep: '#c6c6c8', sep2: '#e5e5ea', segTrack: 'rgba(118,118,128,.12)', chevron: '#c4c4c7', pressed: '#e5e5ea',
  greenTint: '#eef4f1', greenFine: '#d7e8e0', redTint: '#fdeeea', amberTint: '#fbf0dd',
  bubble: '#e9e9eb', switchOff: '#e9e9ea', dark: false,
};

// Dark mode with real tokens (never a colour inversion). Takeovers and the
// Home green header never change; photos and the app icon are never altered.
export const DARK: Palette = {
  ground: '#000000', card: '#1c1c1e', ink: '#ffffff', ink2: 'rgba(235,235,245,.6)', meta: 'rgba(235,235,245,.5)',
  sep: '#38383a', sep2: '#2c2c2e', segTrack: 'rgba(118,118,128,.24)', chevron: '#48484a', pressed: '#2c2c2e',
  greenTint: 'rgba(13,107,87,.18)', greenFine: 'rgba(13,107,87,.28)', redTint: 'rgba(236,48,19,.18)', amberTint: 'rgba(184,120,26,.18)',
  bubble: '#2c2c2e', switchOff: '#39393d', dark: true,
};

export const T = {
  // fixed colours (same in both modes)
  green: '#0d6b57',
  greenDeep: '#0d4a3b',
  greenPressed: '#095242',
  red: '#ec3013',
  redText: '#c4260f',
  redInk: '#8c1f0c',
  redPulse: '#fadbd3',
  amber: '#b8781a',
  amberInk: '#7a4e0d',
  practice: '#171717',
  practiceCard: '#262626',
  toast: 'rgba(28,28,30,.94)',
  imsgLink: '#007aff',
  iosGrey: '#8e8e93',
  iosGrey2: '#d1d1d6',
  dashed: '#c7c7cc',
  ringTrack: '#dfe9e5',

  // light palette aliases (screens that are not theme-aware, and the kept intro/onboarding)
  ground: '#f2f2f7',
  surface: '#ffffff',
  card: '#ffffff',
  ink: '#000000',
  ink2: '#3c3c43',
  sub: '#3c3c43',
  meta: '#6c6c70',
  muted: '#6c6c70',
  hairline: '#e5e5ea',
  divider: '#c6c6c8',
  fieldBorder: '#d1d1d6',
  greenTint: '#eef4f1',
  greenInk: '#0d4a3b',
  greenInk2: '#0d4a3b',
  greenFine: '#d7e8e0',
  redTint: '#fdeeea',
  redEdge: 'rgba(236,48,19,.4)',
  amberTint: '#fbf0dd',
  imsgBubble: '#e9e9eb',
  iosSecondary: '#8e8e93',
  tabBg: '#ffffff',
  callDark: '#171717',
  rowHover: '#f1f1ee',

  // legacy aliases kept for the intro and onboarding
  cream: '#f2f2f7', accent: '#0d6b57', accentDeep: '#095242', accentSoft: '#eef4f1',
  inkSoft: '#3c3c43', inkFaint: '#6c6c70', redSoft: '#fdeeea', greenSoft: '#eef4f1',
  greenText: '#0d4a3b', amberSoft: '#fbf0dd', amberText: '#7a4e0d', greenDark: '#095242',
  greenSoft2: '#d7e8e0', hairline2: '#e5e5ea', page: '#e7e3dc',

  radius: 14, radiusSm: 12, gutter: 20, gutterWide: 22, btnPrimary: 56, btnSecondary: 50,
  caption: 12.5, small: 13.5, label: 15, body: 14.5, bodyLg: 16, title: 19,
} as const;

export const LEVEL_META = {
  red: { bg: '#ec3013', soft: '#fdeeea', color: '#8c1f0c', Icon: OctagonX, word: 'Stop', sub: 'This looks like a scam.' },
  amber: { bg: '#b8781a', soft: '#fbf0dd', color: '#7a4e0d', Icon: TriangleAlert, word: 'Be careful', sub: 'Something about this is not right.' },
  green: { bg: '#0d6b57', soft: '#eef4f1', color: '#0d4a3b', Icon: CircleCheck, word: 'Looks okay', sub: 'Nothing here matches a scam we know.' },
} as const;

/** Motion, exact per the handoff. */
export const MOTION = {
  screen: { ms: 340, bez: [0.2, 0.8, 0.2, 1] as const },
  takeover: { ms: 320, bez: [0.2, 0.8, 0.2, 1] as const },
  tab: { ms: 450, bez: [0.3, 0.9, 0.25, 1] as const },
  swap: { ms: 250 },
  toastIn: 200, toastStay: 2400,
} as const;
