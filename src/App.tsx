// Loop Me. The state machine: screens intro/ob1..ob4/watch/watchWait/watchedBy/
// home/verdict/alert/history/people/panic/settings/learn/care/more/call/ward/
// wardItem/familyAlert/note, a role-swapped tab bar, and 2200ms toasts.
// Underneath, everything is real: the detector + the on-device AI fusion,
// saved history, the text filter and share sheet feeding history through the
// app group, and the family link over the family's own iCloud.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking as RNLinking, LogBox, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as Clipboard from 'expo-clipboard';
import { endCallActivity, watchPush } from '../modules/scam-ai';
import * as Haptics from 'expo-haptics';
import { useFonts } from 'expo-font';
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_500Medium } from '@expo-google-fonts/archivo/500Medium';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { T, Palette } from './theme';
import { palette } from './ui/base';
import { instant, upgrade, FusedVerdict } from './engine/ai';
import { loadSettings, saveSettings, isPostPanic, Settings } from './lib/storage';
import { addCheck, listChecks, newRecord, updateCheck, CheckRecord } from './lib/history';
import * as Family from './lib/family';
import * as Feedback from './lib/feedback';
import { registerFamilyCategories, ensureNotificationPermission, cancelReminders, scheduleWeekly } from './lib/notify';
import { callDirectoryReload, sharedTallies } from '../modules/scam-ai';
import TabBar, { TabId } from './ui/TabBar';
import Toast from './ui/Toast';
import IntroScreen from './screens/IntroScreen';
import { Ob1, Ob2, Ob3, Ob4 } from './screens/SetupScreens';
import { WatchSetup, WatchWait, WatchedBy } from './screens/PairScreens';
import HomeScreen from './screens/HomeScreen';
import CheckingScreen from './screens/CheckingScreen';
import TakeoverScreen from './screens/TakeoverScreen';
import DetailScreen from './screens/DetailScreen';
import CallCheckScreen from './screens/CallCheckScreen';
import HistoryScreen from './screens/HistoryScreen';
import FamilyScreen from './screens/FamilyScreen';
import AskScreen from './screens/AskScreen';
import MariaScreen from './screens/MariaScreen';
import SettingsScreen from './screens/SettingsScreen';
import SetupScreen from './screens/SetupScreen';
import LearnScreen from './screens/LearnScreen';
import PracticeScreen from './screens/PracticeScreen';
import CaregiverScreen from './screens/CaregiverScreen';
import ScammedScreen from './screens/ScammedScreen';
import ListsScreen from './screens/ListsScreen';
import DrawerInfoScreen from './screens/DrawerInfoScreen';
import WardScreen from './screens/WardScreen';
import FamilyAlertScreen from './screens/FamilyAlertScreen';
import NoteScreen from './screens/NoteScreen';
import ListenScreen from './screens/ListenScreen';

export type ScreenId =
  | 'intro' | 'ob1' | 'ob2' | 'ob3' | 'ob4'
  | 'watch' | 'watchWait' | 'watchedBy'
  | 'home' | 'checking' | 'scam' | 'amber' | 'green' | 'detail' | 'callcheck'
  | 'history' | 'family' | 'ask' | 'maria'
  | 'settings' | 'setup' | 'learn' | 'practice' | 'caregiver' | 'scammed' | 'blocked' | 'safe' | 'drawerInfo'
  | 'ward' | 'wardItem' | 'familyAlert' | 'note' | 'listen';

export interface Ctx {
  settings: Settings;
  /** Colour tokens for the current mode (light or dark). */
  C: Palette;
  update: (s: Settings) => void;
  screen: ScreenId;
  go: (s: ScreenId) => void;
  flash: (t: string) => void;
  check: (text: string, sender?: string) => void;
  /** True while a check waits for the on-device model. */
  checking: boolean;
  /** Open an earlier check on its own verdict screen. */
  openRecord: (id: string) => void;
  /** The Messages drawer asked for the photo picker; Home opens it once. */
  pendingPhoto: boolean;
  clearPendingPhoto: () => void;
  msg: string;
  verdict: FusedVerdict | null;
  recordId: string;
  note: { from: string; text: string } | null;
  hist: CheckRecord[];
  refreshHist: () => void;
  wardOpen: string | null;
  openWard: (id: string | null) => void;
  /** Caretaker: the check the full-screen alert is showing. */
  alertId: string | null;
  openFamilyAlert: (id: string) => void;
  closeFamilyAlert: () => void;
  /** Owner: the note the full-screen note is showing. */
  noteOpen: { from: string; text: string; checkId: string; verdict: string } | null;
  closeNote: () => void;
  /** Elder: tell the caretaker (family link) or a trusted contact (plain text). */
  loopIn: (recId: string) => Promise<void>;
  /** Caretaker: a note to the other phone. Lands as a full-screen note there. */
  sendNoteTo: (recId: string, text: string, verdict?: 'scam' | 'safe' | 'call' | 'block' | '') => Promise<void>;
  /** Caretaker: the other phone's weekly picture, counts only. Null until the first one lands. */
  pulse: Family.FamilyPulse | null;
  refreshFamily: () => Promise<void>;
  unlinkFamily: () => void;
  blockNumber: (phone: string) => Promise<void>;
  /** "Was this right?" The person's answer is remembered on this phone. */
  correct: (recId: string, label: 'scam' | 'fine') => Promise<void>;
  tallies: { filtered: number; junk: number; shared: number; lastFilteredAt: number };
}

const TAB_SCREENS: ScreenId[] = ['home', 'history', 'family', 'settings', 'learn', 'setup', 'caregiver', 'blocked', 'safe', 'drawerInfo', 'ward', 'callcheck'];

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

// Family alerts take over the screen when the app is open, so the banner
// would be noise. Everything else shows as a normal banner.
Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const kind = (n.request.content.data as { kind?: string } | undefined)?.kind;
    const family = kind === 'check' || kind === 'note';
    return { shouldShowBanner: !family, shouldShowList: true, shouldPlaySound: !family, shouldSetBadge: false };
  },
});

function sixDigits(): string {
  let out = '';
  for (let i = 0; i < 6; i++) out += Math.floor(Math.random() * 10);
  return out;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold,
    Archivo_700Bold, Archivo_800ExtraBold,
  });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [screen, setScreen] = useState<ScreenId>('intro');
  const [msg, setMsg] = useState('');
  const [verdict, setVerdict] = useState<FusedVerdict | null>(null);
  const [recordId, setRecordId] = useState('');
  const [toast, setToast] = useState('');
  const [note, setNote] = useState<{ from: string; text: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(false);
  const [hist, setHist] = useState<CheckRecord[]>([]);
  const [wardOpen, setWardOpen] = useState<string | null>(null);
  const [alertId, setAlertId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState<Ctx['noteOpen']>(null);
  const [tallies, setTallies] = useState({ filtered: 0, junk: 0, shared: 0, lastFilteredAt: 0 });
  const [pulse, setPulse] = useState<Family.FamilyPulse | null>(null);
  const recentTags = useRef<string[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refreshHist = useCallback(() => { listChecks().then(setHist); }, []);

  // Mirror of settings that updates the moment update() runs. Handlers that
  // write settings and navigate in the same tick read the truth, not the
  // previous render's state.
  const settingsRef = useRef<Settings | null>(null);
  const histRef = useRef<CheckRecord[]>([]);
  useEffect(() => { histRef.current = hist; }, [hist]);

  const update = useCallback((s: Settings) => {
    settingsRef.current = s; setSettings(s); saveSettings(s);
    Family.pushConfig(s, histRef.current);
  }, []);

  const flash = useCallback((t: string) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }, []);

  const go = useCallback((s: ScreenId) => {
    // Nothing may skip setup: any road "home" before onboarding is done leads
    // back into it (a share or Shortcut can arrive before first-run finishes).
    const cur = settingsRef.current;
    if (s === 'home' && cur && !(cur.introSeen && cur.role)) s = cur.introSeen ? 'ob1' : 'intro';
    setScreen(s);
  }, []);

  // Owner side, on the caretaker's say-so: block without a toast, the
  // full-screen note tells the person in the caretaker's own words.
  const blockQuietly = useCallback(async (phone: string) => {
    const s = settingsRef.current;
    if (!s) return;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || s.blocked.includes(digits)) return;
    update({ ...s, blocked: [...s.blocked, digits] });
    await callDirectoryReload();
  }, [update]);

  // Owner side, on the caretaker's "that one is fine": the sender becomes a
  // safe sender, so the next text from them is not flagged again.
  const allowQuietly = useCallback((sender: string) => {
    const s = settingsRef.current;
    if (!s) return;
    const key = sender.trim();
    if (!key || s.allowlist.some(a => a.toLowerCase() === key.toLowerCase())) return;
    update({ ...s, allowlist: [...s.allowlist, key] });
  }, [update]);

  // Caretaker side: one Sunday-evening line, built from real counts.
  const scheduleWeeklySummary = useCallback(async (s: Settings) => {
    const p = Family.pulse();
    const who = s.watching?.name?.split(' ')[0] || 'them';
    if (!p) return;
    const body = p.checked7 === 0
      ? 'No unknown texts reached ' + who + ' this week. Loop Me is still running on their phone.'
      : p.checked7 + (p.checked7 === 1 ? ' text was' : ' texts were') + ' checked on ' + who + '’s phone this week'
        + (p.stopped7 ? ', ' + p.stopped7 + (p.stopped7 === 1 ? ' scam stopped' : ' scams stopped') : '')
        + (p.flagged7 ? ', ' + p.flagged7 + ' worth a look' : '') + '.';
    await scheduleWeekly('This week on ' + who + '’s phone', body);
  }, []);

  // ---- The family link -------------------------------------------------
  // Ask the native side where we stand, fold anything new into history, and
  // raise the full-screen alert or note if something is waiting.
  const refreshFamily = useCallback(async () => {
    const s = settingsRef.current;
    if (!s) return;
    const status = await Family.linkStatus();
    const role = status.role === 'none' ? null : status.role;
    const next: Settings = {
      ...s,
      familyLinked: status.linked,
      familyRole: role,
      familyInvited: !!status.invited,
      role: status.role === 'caretaker' ? 'caretaker' : s.role,
      watchedBy: status.role === 'owner' && status.linked ? (status.name || s.watchedBy) : status.role === 'owner' ? null : s.watchedBy,
      watching: status.role === 'caretaker' && status.name
        ? { name: status.name, phone: s.watching?.phone || '' }
        : s.watching,
    };
    if (JSON.stringify(next) !== JSON.stringify(s)) update(next);
    const drained = await Family.drainExtensions(next);
    const { newChecks, newNotes, newBlocks, newSafes } = await Family.sync();
    if (drained.length || newChecks.length || newNotes.length) refreshHist();
    if (next.role === 'caretaker') setPulse(Family.pulse());
    if (next.familyRole === 'caretaker') {
      void Family.ping();
      void scheduleWeeklySummary(next);
      const unseen = (await listChecks()).find(r => r.source === 'family' && !r.seen && Date.now() - r.at < 12 * 3600 * 1000 && !(r.notes || []).some(n => n.mine));
      if (unseen) { setAlertId(unseen.id); setScreen('familyAlert'); }
      return;
    }
    // Owner: the caretaker may have blocked a sender from their phone.
    for (const sender of newBlocks) await blockQuietly(sender);
    for (const sender of newSafes) allowQuietly(sender);
    void Family.sendPulse(next, await listChecks());
    if (newNotes.length) {
      const n = newNotes[newNotes.length - 1];
      setNoteOpen({ from: n.from, text: n.text, checkId: n.checkId, verdict: n.verdict });
      setScreen('note');
    }
  }, [update, refreshHist, blockQuietly, allowQuietly, scheduleWeeklySummary]);

  useEffect(() => {
    loadSettings().then(async (s) => {
      if (!s.pairCode) { s = { ...s, pairCode: sixDigits() }; }
      settingsRef.current = s;
      setSettings(s);
      saveSettings(s);
      setScreen(s.introSeen && s.role ? (s.role === 'caretaker' ? 'ward' : 'home') : 'intro');
      await registerFamilyCategories();
      refreshHist();
      void refreshFamily();
      Family.subscribe().catch(() => {});
    });
  }, [refreshHist, refreshFamily]);

  // Live events from the native side: a check arriving on the caretaker's
  // phone, a note arriving on the owner's, the invite being accepted.
  useEffect(() => {
    if (!settings) return;
    const off = Family.onEvent((e) => {
      if (e.kind === 'joined') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        const s = settingsRef.current!;
        update({ ...s, role: 'caretaker', familyLinked: true, familyRole: 'caretaker', introSeen: true,
          watching: { name: e.name, phone: s.watching?.phone || '' } });
        ensureNotificationPermission().catch(() => {});
        setScreen('watch');
        flash(e.name.split(' ')[0] + ' is linked. You will hear from this phone now.');
      } else if (e.kind === 'joinFailed') {
        flash('The invite could not be opened. Ask them to send it again.');
      } else if (e.kind === 'check') {
        Family.fold().then(({ newChecks }) => {
          refreshHist();
          const c = newChecks[0] || hist.find(r => r.id === e.check.id);
          if (!c) return;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          setAlertId(e.check.id);
          setScreen('familyAlert');
        });
      } else if (e.kind === 'note') {
        Family.fold().then(({ newBlocks, newSafes }) => {
          for (const b of newBlocks) void blockQuietly(b);
          for (const a of newSafes) allowQuietly(a);
          refreshHist();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setNoteOpen({ from: e.note.from, text: e.note.text, checkId: e.note.checkId, verdict: e.note.verdict });
          setNote({ from: e.note.from, text: e.note.text });
          setScreen('note');
        });
      } else if (e.kind === 'pulse') {
        setPulse(e.pulse);
      } else if (e.kind === 'synced') {
        Family.fold().then(refreshHist);
      }
    });
    return off;
  }, [settings != null, update, flash, refreshHist, blockQuietly, allowQuietly]); // eslint-disable-line react-hooks/exhaustive-deps

  // Coming back to the foreground: pull what arrived while we were away.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') { void refreshFamily(); setTallies(sharedTallies()); endCallActivity(); }
    });
    return () => sub.remove();
  }, [refreshFamily]);
  useEffect(() => { setTallies(sharedTallies()); }, [hist.length]);

  // Taps on the family notifications, including the lock-screen buttons.
  useEffect(() => {
    if (!settings) return;
    const handle = async (r: Notifications.NotificationResponse | null) => {
      if (!r) return;
      const data = (r.notification.request.content.data || {}) as { kind?: string; id?: string; checkId?: string };
      const s = settingsRef.current!;
      if (data.kind === 'check' && data.id) {
        const action = r.actionIdentifier;
        if (action === 'scam' || action === 'safe') {
          await Family.sendNote(data.id, Family.quickNote(action), action, s.myName);
          await updateCheck(data.id, { seen: true });
          refreshHist();
          return;
        }
        if (action === 'call') {
          const p = s.watching?.phone;
          if (p) RNLinking.openURL('tel:' + p.replace(/[^\d+]/g, '')).catch(() => {});
        }
        await Family.fold();
        refreshHist();
        setAlertId(data.id);
        setScreen('familyAlert');
      } else if (data.kind === 'note') {
        await Family.fold();
        refreshHist();
        const rec = (await listChecks()).find(x => x.id === data.checkId);
        const n = rec?.notes?.slice().reverse().find(x => !x.mine);
        if (n) { setNoteOpen({ from: n.from || 'Family', text: n.text, checkId: rec!.id, verdict: n.verdict || '' }); setScreen('note'); }
        if (r.actionIdentifier === 'call' && s.trusted[0]) RNLinking.openURL('tel:' + s.trusted[0].phone.replace(/[^\d+]/g, '')).catch(() => {});
      }
    };
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((r) => { void handle(r); });
    return () => sub.remove();
  }, [settings != null, refreshHist]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCheck = useRef('');
  // The Checking screen plays for 2.8 seconds while the rules and the model
  // run underneath; the takeover that follows is the final answer.
  const CHECK_MS = 2800;
  const check = useCallback((text: string, sender?: string) => {
    const raw = (text || '').trim();
    if (!raw) { flash('Copy a message first, then tap Check.'); return; }
    const s = settingsRef.current;
    const detOpts = {
      allowlist: s?.allowlist,
      sender,
      recentTags: recentTags.current,
      postPanic: s ? isPostPanic(s) : false,
    };
    const v = instant(raw, detOpts);
    recentTags.current = v.tags;
    const rec = newRecord({ message: raw, level: v.level, score: v.score, tags: v.tags, reason: v.reason, source: sender ? 'link' : 'typed' });
    if (sender) rec.sender = sender;
    addCheck(rec).then(() => { refreshHist(); if (s) listChecks().then(h => Family.sendPulse(s, h)); });
    activeCheck.current = rec.id;
    setMsg(raw); setVerdict(v); setRecordId(rec.id); setNote(null);
    setChecking(true);
    setScreen('checking');
    const startedAt = Date.now();
    let final: FusedVerdict = v;
    let shown = false;
    const reveal = () => {
      if (shown || activeCheck.current !== rec.id) return;
      shown = true;
      setChecking(false);
      setVerdict(final);
      setScreen(final.level === 'red' ? 'scam' : final.level === 'amber' ? 'amber' : 'green');
    };
    // A text the person already corrected is never misjudged twice.
    const remembered = Feedback.remembered(raw).then((label) => {
      if (!label) return;
      final = label === 'scam'
        ? { ...final, level: 'red', reason: 'You told Loop Me this one is a scam.', safeStep: 'Don’t reply. Delete the message.', confidence: 'very', fused: true }
        : { ...final, level: 'green', reason: 'You told Loop Me this one is fine.', safeStep: 'Nothing to do.', confidence: 'very', fused: true };
      updateCheck(rec.id, { level: final.level, reason: final.reason }).then(refreshHist);
    }).catch(() => {});
    // A flagged check goes to the caretaker on its own, over the family link.
    if (v.level !== 'green' && s) void Family.publish(rec, s, false);
    // The on-device model's second opinion, capped so the screen never stalls.
    const model = Promise.race([
      upgrade(raw, v, detOpts).then((fused) => {
        if (!fused.fused) return;
        if (!final.fused) final = fused;
        updateCheck(rec.id, { level: fused.level, reason: fused.reason }).then(refreshHist);
        if (fused.level !== 'green' && v.level === 'green' && s) void Family.publish({ ...rec, level: fused.level, reason: fused.reason }, s, false);
        recentTags.current = fused.tags;
      }).catch(() => {}),
      new Promise<void>(r => setTimeout(r, 2600)),
    ]);
    Promise.all([remembered, model]).then(() => {
      const wait = Math.max(0, CHECK_MS - (Date.now() - startedAt));
      setTimeout(reveal, wait);
    });
  }, [flash, refreshHist]);

  // An earlier check, on the screen it got the first time.
  const openRecord = useCallback((id: string) => {
    const rec = histRef.current.find(r => r.id === id);
    if (!rec) return;
    activeCheck.current = rec.id;
    const v: FusedVerdict = {
      level: rec.level, reason: rec.reason, safeStep: rec.safeStep || '', signals: rec.signals || [], matches: [], tags: rec.tags,
      confidence: 'fairly', codeWordMoment: false, score: rec.score, disguised: false, aiTier: 'none', fused: false,
    };
    setMsg(rec.excerpt); setVerdict(v); setRecordId(rec.id); setNote(null);
    setScreen(rec.level === 'red' ? 'scam' : rec.level === 'amber' ? 'amber' : 'green');
  }, []);

  // Elder side. The check lands on the caretaker's phone as a full-screen
  // alert over the family link. There is no text-message version.
  const loopIn = useCallback(async (recId: string) => {
    const s = settingsRef.current;
    if (!s) return;
    const rec = (await listChecks()).find(r => r.id === recId);
    if (!rec) return;
    if (s.familyLinked && s.familyRole === 'owner') {
      const ok = await Family.publish(rec, s, true);
      await updateCheck(recId, { askedFamily: true });
      refreshHist();
      flash(ok ? 'It is on ' + (s.watchedBy?.split(' ')[0] || 'their') + '’s phone now.' : 'Could not reach iCloud just now. It will go when the phone is back online.');
      return;
    }
    // No link yet: nothing is texted. The invite is the only text Loop Me
    // ever sends, and it goes from the People screen.
    flash('Send someone the invite first. After that, nothing is ever texted.');
    go('family');
  }, [flash, go, refreshHist]);

  // Caretaker side. A note always travels over the family link; there is no
  // text-message version of it any more.
  const sendNoteTo = useCallback(async (recId: string, text: string, verdict: 'scam' | 'safe' | 'call' | 'block' | '' = '') => {
    const s = settingsRef.current;
    if (!s) return;
    const t = text.trim();
    if (!t) { flash('Write a note first, or tap one of the three above.'); return; }
    const ok = await Family.sendNote(recId, t, verdict, s.myName);
    const rec = histRef.current.find(r => r.id === recId);
    if (rec) {
      await updateCheck(recId, { seen: true, notes: [...(rec.notes || []), { text: t, meta: 'Sent just now', mine: true, verdict, at: Date.now() }] });
      refreshHist();
    }
    const who = s.watching?.name?.split(' ')[0] || 'their';
    flash(ok ? 'On ' + who + '’s screen now.' : 'Could not reach iCloud just now. It will go when the phone is back online.');
  }, [flash, refreshHist]);

  const unlinkFamily = useCallback(() => {
    const s = settingsRef.current;
    if (!s) return;
    const other = s.familyRole === 'caretaker' ? (s.watching?.name?.split(' ')[0] || 'them') : (s.watchedBy?.split(' ')[0] || 'them');
    Alert.alert(
      s.familyRole === 'caretaker' ? 'Stop looking after ' + other + '?' : 'Stop ' + other + ' hearing from this phone?',
      'Nothing new reaches the other phone after this. Either of you can set it up again any time.',
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: async () => {
          await Family.unlink();
          update({ ...s, familyLinked: false, familyRole: null, familyInvited: false, watchedBy: null,
            watching: s.familyRole === 'caretaker' ? null : s.watching, role: s.familyRole === 'caretaker' ? 'elder' : s.role });
          go('home');
          flash('Done. Nothing more will be shared.');
        } },
      ],
    );
  }, [update, go, flash]);

  const correct = useCallback(async (recId: string, label: 'scam' | 'fine') => {
    const s = settingsRef.current;
    if (!s) return;
    await Feedback.correct(recId, label, s, activeCheck.current === recId ? msg : undefined);
    refreshHist();
    const rec = histRef.current.find(r => r.id === recId);
    if (label === 'scam' && rec?.sender) Family.pushConfig(s, await listChecks());
    flash(label === 'scam' ? 'Noted. It will be treated as a scam from now on.' : 'Noted. It will not be flagged again.');
  }, [flash, refreshHist, msg]); // eslint-disable-line react-hooks/exhaustive-deps

  const blockNumber = useCallback(async (phone: string) => {
    const s = settingsRef.current;
    if (!s) return;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) { flash('That sender has no phone number to block.'); return; }
    if (s.blocked.includes(digits)) { flash('That number is already blocked.'); return; }
    update({ ...s, blocked: [...s.blocked, digits] });
    const ok = await callDirectoryReload();
    flash(ok ? 'Blocked. Calls and texts from it will not reach you.' : 'Saved. Turn on Loop Me under Settings › Phone › Call Blocking for it to take effect.');
  }, [update, flash]);

  // ---- Deep links: check/alert (Shortcuts, share sheet, monitor) ----------
  const handleUrl = useCallback((url: string | null) => {
    if (!url || !settingsRef.current) return;
    const { hostname, path, queryParams } = Linking.parse(url);
    const where = hostname || path || '';
    const text = typeof queryParams?.text === 'string' ? queryParams.text : '';
    // 'Check unknown texts for me' (Settings) gates the unknown-sender path.
    // A check the person asked for by hand always runs.
    if (where === 'alert' && text) { if (settingsRef.current.autoCheck !== false) check(text, 'an unknown number'); return; }
    if (where === 'check' && queryParams?.photo) { setPendingPhoto(true); go('home'); return; }
    if (where === 'check' && text) { check(text); return; }
    // The widget, Control Center and the Action button open the app with no
    // text: read what was copied here, where the person can see it happen.
    if (where === 'check' && queryParams?.clip) {
      Clipboard.getStringAsync().then(c => {
        const t = (c || '').trim();
        if (t) check(t); else flash('Copy a message first, then tap again.');
      }).catch(() => flash('Copy a message first, then tap again.'));
    }
  }, [check, flash, go]);

  // The URL the app was COLD-LAUNCHED with must be handled exactly once;
  // getInitialURL() keeps returning it for the life of the process.
  const initialUrlHandled = useRef(false);
  useEffect(() => {
    if (!settings) return;
    if (!initialUrlHandled.current) {
      initialUrlHandled.current = true;
      Linking.getInitialURL().then(handleUrl);
    }
    const sub = Linking.addEventListener('url', e => handleUrl(e.url));
    return () => sub.remove();
  }, [handleUrl, settings != null]); // eslint-disable-line react-hooks/exhaustive-deps

  // The watch shows the caretaker the last few alerts and a Call button.
  useEffect(() => {
    if (!settings || settings.role !== 'caretaker') return;
    const alerts = hist.filter(h => h.source === 'family' && h.level !== 'green').slice(0, 5)
      .map(h => ({ id: h.id, level: h.level, excerpt: h.excerpt, at: h.at, reason: h.reason }));
    watchPush({ name: settings.watching?.name?.split(' ')[0] || '', phone: settings.watching?.phone || '', linked: settings.familyLinked, alerts });
  }, [hist, settings?.role, settings?.watching?.name, settings?.watching?.phone, settings?.familyLinked]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!settings || !fontsLoaded) return <View style={st.root} />;

  const careMode = settings.role === 'caretaker';
  const watchName = settings.watching?.name?.split(' ')[0] || settings.careName.split(' ')[0] || 'Family';
  const alertRec = alertId ? hist.find(r => r.id === alertId) : undefined;
  // White status bar on Home (green header) and on every takeover; black elsewhere.
  const darkBar = ['home', 'scam', 'amber', 'green', 'practice', 'familyAlert', 'note', 'listen'].includes(screen);
  const barColor = screen === 'scam' ? T.red
    : screen === 'amber' ? T.amber
    : screen === 'familyAlert' ? (alertRec?.level === 'amber' ? T.amber : T.red)
    : screen === 'practice' ? T.practice
    : T.green;
  const C = palette(!!settings.darkMode);

  const ctx: Ctx = {
    settings, update, screen, go, flash, check,
    msg, verdict, recordId, note, hist, refreshHist,
    wardOpen, openWard: (id) => { setWardOpen(id); setScreen('wardItem'); },
    alertId,
    openFamilyAlert: (id) => { setAlertId(id); setScreen('familyAlert'); },
    closeFamilyAlert: () => { if (alertId) updateCheck(alertId, { seen: true }).then(refreshHist); setAlertId(null); setScreen('ward'); },
    noteOpen,
    closeNote: () => { setNoteOpen(null); setScreen('home'); },
    loopIn, sendNoteTo, refreshFamily, unlinkFamily, blockNumber, correct, tallies, pulse, checking, openRecord,
    C: palette(!!settings.darkMode),
    pendingPhoto, clearPendingPhoto: () => setPendingPhoto(false),
  };

  const goTab = (t: TabId) => go(t as ScreenId);

  // The intro owns its own chrome: the status-bar field follows the beat
  // (red on beat 0, white after), exactly like the design's barTint.
  if (screen === 'intro') return <IntroScreen ctx={ctx} />;

  return (
    <SafeAreaProvider>
    <SafeAreaView edges={['top']} style={[st.root, { backgroundColor: darkBar ? barColor : C.ground }]}>
      <StatusBar barStyle={darkBar || C.dark ? 'light-content' : 'dark-content'} />
      <View style={st.body}>
        <ScreenGuard screen={screen} onReset={() => setScreen('home')}>
        {screen === 'ob1' && <Ob1 ctx={ctx} />}
        {screen === 'ob2' && <Ob2 ctx={ctx} />}
        {screen === 'ob3' && <Ob3 ctx={ctx} />}
        {screen === 'ob4' && <Ob4 ctx={ctx} />}
        {screen === 'watch' && <WatchSetup ctx={ctx} />}
        {screen === 'listen' && <ListenScreen ctx={ctx} />}
        {screen === 'watchWait' && <WatchWait ctx={ctx} />}
        {screen === 'watchedBy' && <WatchedBy ctx={ctx} />}
        {screen === 'home' && <HomeScreen ctx={ctx} />}
        {screen === 'checking' && <CheckingScreen ctx={ctx} />}
        {(screen === 'scam' || screen === 'amber' || screen === 'green') && <TakeoverScreen ctx={ctx} />}
        {screen === 'detail' && <DetailScreen ctx={ctx} />}
        {screen === 'callcheck' && <CallCheckScreen ctx={ctx} />}
        {screen === 'history' && <HistoryScreen ctx={ctx} />}
        {screen === 'family' && <FamilyScreen ctx={ctx} />}
        {screen === 'ask' && <AskScreen ctx={ctx} />}
        {screen === 'maria' && <MariaScreen ctx={ctx} />}
        {screen === 'settings' && <SettingsScreen ctx={ctx} />}
        {screen === 'setup' && <SetupScreen ctx={ctx} />}
        {screen === 'learn' && <LearnScreen ctx={ctx} />}
        {screen === 'practice' && <PracticeScreen ctx={ctx} />}
        {screen === 'caregiver' && <CaregiverScreen ctx={ctx} />}
        {screen === 'scammed' && <ScammedScreen ctx={ctx} />}
        {(screen === 'blocked' || screen === 'safe') && <ListsScreen ctx={ctx} />}
        {screen === 'drawerInfo' && <DrawerInfoScreen ctx={ctx} />}
        {screen === 'ward' && <WardScreen ctx={ctx} />}
        {screen === 'wardItem' && <MariaScreen ctx={ctx} />}
        {screen === 'familyAlert' && <FamilyAlertScreen ctx={ctx} />}
        {screen === 'note' && <NoteScreen ctx={ctx} />}
        </ScreenGuard>
        {TAB_SCREENS.includes(screen) && (
          <TabBar C={C} careMode={careMode} watchName={watchName} screen={screen} go={goTab} />
        )}
        <Toast text={toast} />
      </View>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

// A screen that throws must never leave a blank page. It says so, in words,
// and offers a way back.
class ScreenGuard extends React.Component<{ screen: string; onReset: () => void; children: React.ReactNode }, { error: Error | null; at: string }> {
  state = { error: null as Error | null, at: '' };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { screen: string }) {
    if (prev.screen !== this.props.screen && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
        <Text style={{ fontSize: 24, fontFamily: 'Archivo_800ExtraBold', color: T.ink }} allowFontScaling>Something went wrong on this screen.</Text>
        <Text style={{ fontSize: 15, fontFamily: 'Archivo_400Regular', color: T.sub, marginTop: 10 }} allowFontScaling>{String(this.state.error.message || this.state.error)}</Text>
        <Text onPress={this.props.onReset} style={{ fontSize: 17, fontFamily: 'Archivo_700Bold', color: T.green, marginTop: 22 }} allowFontScaling>Back to the start</Text>
      </View>
    );
  }
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  body: { flex: 1, backgroundColor: T.ground },
});
