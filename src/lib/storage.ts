import AsyncStorage from '@react-native-async-storage/async-storage';

export type Role = 'elder' | 'caretaker';

export interface TrustedPerson { name: string; phone: string; }

export interface Settings {
  role: Role | null;             // null → first-run welcome
  myName: string;                // how family messages sign this person
  alerts: boolean; readAloud: boolean;
  allowlist: string[]; trusted: TrustedPerson[];
  watching: TrustedPerson | null; // caretaker side: the person they look out for
  codeWordSet: boolean;          // never store the word itself in plain settings exports
  codeWord: string;              // on-device only, never leaves the phone
  panicCompletedAt: number | null; // enables the 90-day recovery-scam guard
  // Design 4 additions
  pairCode: string;              // six digits shown on the elder's phone
  watchedBy: string | null;      // elder side: caretaker's first name once paired
  careName: string;              // caregiver setup: who the phone is for
  careRel: string;               // Mother / Father / Other
  autoCheck: boolean;            // "Check unknown texts for me"
  introSeen: boolean;
}

const KEY = 'loopmein.settings.v3';
const OLD_KEY = 'loopmein.settings.v2';
const DEFAULTS: Settings = {
  role: null, myName: '',
  alerts: true, readAloud: false,
  allowlist: [], trusted: [], watching: null,
  codeWordSet: false, codeWord: '', panicCompletedAt: null,
  pairCode: '', watchedBy: null, careName: '', careRel: 'Mother', autoCheck: true, introSeen: false,
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    const old = await AsyncStorage.getItem(OLD_KEY);
    if (old) {
      const migrated = { ...DEFAULTS, ...JSON.parse(old) };
      await AsyncStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
    return { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

export async function saveSettings(s: Settings) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function isPostPanic(s: Settings): boolean {
  return !!s.panicCompletedAt && Date.now() - s.panicCompletedAt < 90 * 24 * 3600 * 1000;
}
