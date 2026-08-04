// NEON test theme — deep space + electric accents. (The calm cream theme lives in app-src.)
export const T = {
  cream: '#070B14',        // deep space background (kept the key name so all screens restyle at once)
  ink: '#EAF6FF',          // near-white cyan text
  inkSoft: '#7FA3C0',      // dimmed steel
  card: '#0E1626',         // panel
  cardEdge: '#1E3A5C',
  red: '#FF3B5C',          // laser red
  amber: '#FFB020',        // plasma amber
  green: '#22F0A6',        // matrix green
  cyan: '#38D9FF',
  violet: '#8A6CFF',
  redSoft: '#2A0B14',
  amberSoft: '#291D06',
  greenSoft: '#06251B',
  radius: 24,
  body: 20, button: 22, headline: 30, giant: 40,
  tap: 64,
};
export const LEVEL_META = {
  red:   { word: 'THREAT',   icon: '\u26A0', color: T.red,   soft: T.redSoft,   line: 'Scam signature detected.' },
  amber: { word: 'CAUTION',  icon: '\u25C8', color: T.amber, soft: T.amberSoft, line: 'Anomaly detected.' },
  green: { word: 'CLEAR',    icon: '\u2726', color: T.green, soft: T.greenSoft, line: 'No threat signatures found.' },
} as const;
