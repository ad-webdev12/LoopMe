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
  pairCode: string;              // kept for people upgrading; no longer shown
  watchedBy: string | null;      // elder side: caretaker's name once the family link is up
  careName: string;              // caregiver setup: who the phone is for
  careRel: string;               // Mother / Father / Other
  autoCheck: boolean;            // "Check unknown texts for me"
  introSeen: boolean;
  // The family link over iCloud. Mirrored from the native side at launch so
  // screens can read it synchronously.
  familyLinked: boolean;
  familyRole: 'owner' | 'caretaker' | null;
  familyInvited: boolean;        // owner sent an invite nobody has tapped yet
  blocked: string[];             // numbers the person chose to block (call directory)
  installedAt: number;           // for "looking out for you since"
}

const KEY = 'loopmein.settings.v3';
const OLD_KEY = 'loopmein.settings.v2';
const DEFAULTS: Settings = {
  role: null, myName: '',
  alerts: true, readAloud: false,
  allowlist: [], trusted: [], watching: null,
  codeWordSet: false, codeWord: '', panicCompletedAt: null,
  pairCode: '', watchedBy: null, careName: '', careRel: 'Mother', autoCheck: true, introSeen: false,
  familyLinked: false, familyRole: null, familyInvited: false, blocked: [], installedAt: 0,
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return stamp({ ...DEFAULTS, ...JSON.parse(raw) });
    const old = await AsyncStorage.getItem(OLD_KEY);
    if (old) {
      const migrated = stamp({ ...DEFAULTS, ...JSON.parse(old) });
      await AsyncStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
    return stamp({ ...DEFAULTS });
  } catch { return stamp({ ...DEFAULTS }); }
}

function stamp(s: Settings): Settings {
  return s.installedAt ? s : { ...s, installedAt: Date.now() };
}

export async function saveSettings(s: Settings) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function isPostPanic(s: Settings): boolean {
  return !!s.panicCompletedAt && Date.now() - s.panicCompletedAt < 90 * 24 * 3600 * 1000;
}
