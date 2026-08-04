// Design tokens — warm, calm, elderly-first, and professional.
// One quiet accent for interactive things; red/amber/green reserved for verdicts
// so color always MEANS something. Big type and tap targets are non-negotiable.
import { OctagonX, TriangleAlert, CircleCheck } from 'lucide-react-native';

export const T = {
  // surfaces
  cream: '#FAF7F0',        // page background — warm paper, not stark white
  card: '#FFFFFF',
  hairline: 'rgba(31,27,22,0.12)',
  // text
  ink: '#1F1B16',
  inkSoft: '#6B6257',
  inkFaint: '#989084',
  // interactive accent — calm trust blue, never used for verdicts
  accent: '#2E5FA3',
  accentDeep: '#24497F',
  accentSoft: '#EBF0F8',
  // verdict colors — accessible, serious, not alarming
  red: '#C03A2E',
  amber: '#B57A16',
  green: '#2E7D52',
  redSoft: '#FAECEA',
  amberSoft: '#FAF1DF',
  greenSoft: '#EAF4EE',
  redText: '#8F241B',
  amberText: '#7D5406',
  greenText: '#1E5637',

  // radii — tailored, not blobby
  radius: 16,
  radiusSm: 10,
  radiusLg: 20,

  // type scale
  caption: 15,
  small: 17,
  body: 19,
  bodyLg: 22,
  title: 25,
  headline: 31,
  giant: 40,
  button: 20,

  // layout
  tap: 60,
  pad: 22,
} as const;

export const SHADOW = {
  shadowColor: '#2A2116',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 5 },
  elevation: 2,
} as const;

export const LEVEL_META = {
  red:   { word: 'Stop',       Icon: OctagonX,      color: T.red,   soft: T.redSoft,   text: T.redText,   line: 'This looks like a scam.' },
  amber: { word: 'Be careful', Icon: TriangleAlert, color: T.amber, soft: T.amberSoft, text: T.amberText, line: 'This might not be safe.' },
  green: { word: 'Looks okay', Icon: CircleCheck,   color: T.green, soft: T.greenSoft, text: T.greenText, line: 'This looks okay.' },
} as const;
