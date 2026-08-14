// Design tokens — "Loop Me, Design 4": quieter, rounder, one hierarchy.
// Archivo carries every word (800 for display, 400–600 for the rest — one family,
// one weight scale). Deep green is the app's colour: primary UI AND every safe
// action. Red is reserved strictly for danger. Warm off-white grounds, soft
// surfaces, few boxes.
import { OctagonX, TriangleAlert, CircleCheck } from 'lucide-react-native';

// Archivo weights (from @expo-google-fonts/archivo subpaths).
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
  // surfaces
  cream: '#F8F8F6',        // app ground (kept name so existing screens inherit)
  ground: '#F8F8F6',
  page: '#E7E3DC',
  card: '#FFFFFF',
  hairline: '#E5E5E2',
  hairline2: '#EDECE9',
  // text — one ink, stepped down
  ink: '#171717',
  ink2: '#3D3D3A',
  inkSoft: '#707070',
  inkFaint: '#B8B8B3',
  // GREEN — primary UI + every safe action (the app's colour)
  accent: '#0D6B57',
  accentDeep: '#095242',
  accentSoft: '#EEF4F1',
  green: '#0D6B57',
  greenDark: '#095242',
  greenDeep: '#0D4A3B',
  greenSoft: '#EEF4F1',
  greenSoft2: '#C9E3DA',
  greenText: '#0D4A3B',
  greenInk: '#1F4F43',
  // RED — danger only
  red: '#EC3013',
  redSoft: '#FDEEEA',
  redText: '#B7280F',
  // AMBER — caution, warm to fit the palette
  amber: '#B7791F',
  amberSoft: '#FAF1DF',
  amberText: '#7A5200',

  // radii — soft, rounded
  radius: 14,
  radiusSm: 12,
  radiusLg: 16,
  radiusXl: 20,

  // type scale
  caption: 12.5,
  small: 14,
  label: 15,
  body: 16,
  bodyLg: 17,
  title: 19,
  headline: 23,
  display: 30,
  giant: 38,
  button: 16,

  // layout
  tap: 54,
  pad: 20,
} as const;

// v4 surfaces sit on a very soft 1px shadow, not a lifted card.
export const SHADOW = {
  shadowColor: '#171717',
  shadowOpacity: 0.05,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const;

// Verdict language — one tint surface, a colour-filled icon chip, the word.
export const LEVEL_META = {
  red:   { word: 'Stop',       Icon: OctagonX,      color: T.red,   soft: T.redSoft,   text: T.redText,   line: 'This looks like a scam.' },
  amber: { word: 'Be careful', Icon: TriangleAlert, color: T.amber, soft: T.amberSoft, text: T.amberText, line: 'This might not be safe.' },
  green: { word: 'Looks okay', Icon: CircleCheck,   color: T.green, soft: T.greenSoft, text: T.greenText, line: 'This looks okay.' },
} as const;
