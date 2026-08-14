// Design 4 tokens — taken literally from the handoff README's token table.
// Red means danger only. Green carries every safe and primary action.
// One weight scale: 400 body, 500/600 emphasis, 700 buttons/row titles, 800 display.
import { OctagonX, TriangleAlert, CircleCheck } from 'lucide-react-native';

export const F = {
  display: 'Archivo_800ExtraBold',
  displayBold: 'Archivo_800ExtraBold',
  bold: 'Archivo_700Bold',
  bodyBold: 'Archivo_700Bold',
  semibold: 'Archivo_600SemiBold',
  medium: 'Archivo_500Medium',
  body: 'Archivo_400Regular',
} as const;

export const T = {
  // colour — exact
  red: '#ec3013',
  redTint: '#fdeeea',
  redInk: '#8c1f0c',
  redEdge: 'rgba(236,48,19,.4)',
  green: '#0d6b57',
  greenPressed: '#095242',
  greenTint: '#eef4f1',
  greenInk: '#0d4a3b',
  greenInk2: '#1f4f43',
  amber: '#b8781a',
  amberTint: '#fbf0dd',
  amberInk: '#7a4e0d',
  ink: '#171717',
  ink2: '#3d3d3a',
  sub: '#707070',
  muted: '#b8b8b3',
  ground: '#f8f8f6',
  surface: '#ffffff',
  hairline: '#e5e5e2',
  divider: '#edece9',
  fieldBorder: '#d6d6d1',
  rowHover: '#f1f1ee',
  imsgBubble: '#e9e9eb',
  imsgLink: '#0076ff',
  iosSecondary: '#8e8e93',
  tabBg: 'rgba(247,245,241,.95)',
  callDark: '#171717',

  // legacy aliases (older screens reference these; keep them mapped)
  cream: '#f8f8f6',
  card: '#ffffff',
  accent: '#0d6b57',
  accentDeep: '#095242',
  accentSoft: '#eef4f1',
  inkSoft: '#707070',
  inkFaint: '#b8b8b3',
  redSoft: '#fdeeea',
  redText: '#8c1f0c',
  greenSoft: '#eef4f1',
  greenText: '#0d4a3b',
  amberSoft: '#fbf0dd',
  amberText: '#7a4e0d',
  greenDark: '#095242',
  greenDeep: '#0d4a3b',
  greenSoft2: '#c9e3da',
  hairline2: '#edece9',
  page: '#e7e3dc',

  // geometry — exact
  radius: 14,      // cards
  radiusSm: 12,    // buttons + inputs
  gutter: 20,
  gutterWide: 22,
  btnPrimary: 56,
  btnSecondary: 50,

  // type sizes used across screens
  caption: 12.5,
  small: 13.5,
  label: 15,
  body: 14.5,
  bodyLg: 16,
  title: 19,
  screenTitle: 27,
  verdictWord: 32,
  introDisplay: 38,
  statNum: 24,
  button: 16,

  tap: 44,
  pad: 20,
} as const;

export const SHADOW = {
  shadowColor: '#171717',
  shadowOpacity: 0.05,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const;

export const LEVEL_META = {
  red:   { word: 'Stop',       Icon: OctagonX,      color: T.red,   soft: T.redTint,   text: T.redInk,   edge: 'rgba(236,48,19,.4)',  line: 'This looks like a scam.' },
  amber: { word: 'Be careful', Icon: TriangleAlert, color: T.amber, soft: T.amberTint, text: T.amberInk, edge: 'rgba(184,120,26,.4)', line: 'Something about this is not right.' },
  green: { word: 'Looks okay', Icon: CircleCheck,   color: T.green, soft: T.greenTint, text: T.greenInk, edge: 'rgba(20,112,90,.35)', line: 'Nothing here matches a known scam.' },
} as const;
