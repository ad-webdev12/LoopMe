// Warm, calm, elderly-first — matches the current site.
export const T = {
  cream: '#FBF6EC',
  ink: '#2A2622',
  inkSoft: '#5C554C',
  card: '#FFFFFF',
  red: '#D64B3F',
  amber: '#E7A13D',
  green: '#4E8D5B',
  redSoft: '#FBEAE8',
  amberSoft: '#FBF1DF',
  greenSoft: '#E9F2EC',
  radius: 24,
  body: 20, button: 22, headline: 30, giant: 40,
  tap: 64,
};
export const LEVEL_META = {
  red:   { word: 'Stop',       icon: '\u26D4', color: T.red,   soft: T.redSoft,   line: 'This looks like a scam.' },
  amber: { word: 'Be careful', icon: '\u26A0\uFE0F', color: T.amber, soft: T.amberSoft, line: 'This might not be safe.' },
  green: { word: 'Looks okay', icon: '\u2713', color: T.green, soft: T.greenSoft, line: 'This looks okay.' },
} as const;
