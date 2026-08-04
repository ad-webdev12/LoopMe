import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TrustedPerson { name: string; phone: string; }
export interface Settings {
  alerts: boolean; readAloud: boolean;
  allowlist: string[]; trusted: TrustedPerson[];
  codeWordSet: boolean;          // never store the word itself in plain settings exports
  codeWord: string;              // on-device only, never leaves the phone
  panicCompletedAt: number | null; // enables the 90-day recovery-scam guard
}
const KEY = 'loopmein.settings.v2';
const DEFAULTS: Settings = { alerts: true, readAloud: false, allowlist: [], trusted: [], codeWordSet: false, codeWord: '', panicCompletedAt: null };

export async function loadSettings(): Promise<Settings> {
  try { const raw = await AsyncStorage.getItem(KEY); return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }; }
  catch { return { ...DEFAULTS }; }
}
export async function saveSettings(s: Settings) { try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
export function isPostPanic(s: Settings): boolean {
  return !!s.panicCompletedAt && Date.now() - s.panicCompletedAt < 90 * 24 * 3600 * 1000;
}
