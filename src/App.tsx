// Loop Me. The state machine: screens intro/ob1..ob4/watch/watchWait/watchedBy/
// home/verdict/alert/history/people/panic/settings/learn/care/more/call/ward/
// wardItem/familyAlert/note, a role-swapped tab bar, and 2200ms toasts.
// Underneath, everything is real: the detector + the on-device AI fusion,
// saved history, the text filter and share sheet feeding history through the
// app group, and the family link over the family's own iCloud.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking as RNLinking, LogBox, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useFonts } from 'expo-font';
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_500Medium } from '@expo-google-fonts/archivo/500Medium';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { T } from './theme';
import { instant, upgrade, FusedVerdict } from './engine/ai';
import { loadSettings, saveSettings, isPostPanic, Settings } from './lib/storage';
import { addCheck, listChecks, newRecord, updateCheck, CheckRecord } from './lib/history';
import { sendSms, loopInText } from './lib/familyLink';
import * as Family from './lib/family';
import { registerFamilyCategories, ensureNotificationPermission, cancelReminders } from './lib/notify';
import { callDirectoryReload, sharedTallies } from '../modules/scam-ai';
import TabBar, { TabId } from './ui/TabBar';
import Toast from './ui/Toast';
import IntroScreen from './screens/IntroScreen';
import { Ob1, Ob2, Ob3, Ob4 } from './screens/SetupScreens';
import { WatchSetup, WatchWait, WatchedBy } from './screens/PairScreens';
import HomeScreen from './screens/HomeScreen';
import VerdictScreen from './screens/VerdictScreen';
import AlertScreen from './screens/AlertScreen';
import HistoryScreen from './screens/HistoryScreen';
import PeopleScreen from './screens/PeopleScreen';
import PanicScreen from './screens/PanicScreen';
import SettingsScreen from './screens/SettingsScreen';
import LearnScreen from './screens/LearnScreen';
import CareScreen from './screens/CareScreen';
import CallScreen from './screens/CallScreen';
import WardScreen from './screens/WardScreen';
import WardItemScreen from './screens/WardItemScreen';
import MoreScreen from './screens/MoreScreen';
import FamilyAlertScreen from './screens/FamilyAlertScreen';
import NoteScreen from './screens/NoteScreen';

export type ScreenId =
  | 'intro' | 'ob1' | 'ob2' | 'ob3' | 'ob4'
  | 'watch' | 'watchWait' | 'watchedBy'
  | 'home' | 'verdict' | 'alert'
  | 'history' | 'people' | 'panic' | 'settings' | 'learn' | 'care' | 'more'
  | 'call' | 'ward' | 'wardItem' | 'familyAlert' | 'note';

export interface Ctx {
  settings: Settings;
  update: (s: Settings) => void;
  screen: ScreenId;
  go: (s: ScreenId) => void;
  flash: (t: string) => void;
  check: (text: string, sender?: string) => void;
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
  sendNoteTo: (recId: string, text: string, verdict?: 'scam' | 'safe' | 'call' | '') => Promise<void>;
  refreshFamily: () => Promise<void>;
  unlinkFamily: () => void;
  blockNumber: (phone: string) => Promise<void>;
  tallies: { filtered: number; junk: number; shared: number };
}

const TAB_SCREENS: ScreenId[] = ['home', 'history', 'people', 'more', 'learn', 'settings', 'care', 'ward'];

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
  const [hist, setHist] = useState<CheckRecord[]>([]);
  const [wardOpen, setWardOpen] = useState<string | null>(null);
  const [alertId, setAlertId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState<Ctx['noteOpen']>(null);
  const [tallies, setTallies] = useState({ filtered: 0, junk: 0, shared: 0 });
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
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }, []);

  const go = useCallback((s: ScreenId) => {
    // Nothing may skip setup: any road "home" before onboarding is done leads
    // back into it (a share or Shortcut can arrive before first-run finishes).
    const cur = settingsRef.current;
    if (s === 'home' && cur && !(cur.introSeen && cur.role)) s = cur.introSeen ? 'ob1' : 'intro';
    setScreen(s);
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
    const { newChecks, newNotes } = await Family.sync();
    if (drained.length || newChecks.length || newNotes.length) refreshHist();
    if (next.familyRole === 'caretaker') {
      const unseen = (await listChecks()).find(r => r.source === 'family' && !r.seen && Date.now() - r.at < 12 * 3600 * 1000 && !(r.notes || []).some(n => n.mine));
      if (unseen) { setAlertId(unseen.id); setScreen('familyAlert'); }
    } else if (newNotes.length) {
      const n = newNotes[newNotes.length - 1];
      setNoteOpen({ from: n.from, text: n.text, checkId: n.checkId, verdict: n.verdict });
      setScreen('note');
    }
  }, [update, refreshHist]);

  useEffect(() => {
    loadSettings().then(async (s) => {
      if (!s.pairCode) { s = { ...s, pairCode: sixDigits() }; }
      settingsRef.current = s;
      setSettings(s);
      saveSettings(s);
      setScreen(s.introSeen && s.role ? 'home' : 'intro');
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
        Family.fold().then(() => {
          refreshHist();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setNoteOpen({ from: e.note.from, text: e.note.text, checkId: e.note.checkId, verdict: e.note.verdict });
          setNote({ from: e.note.from, text: e.note.text });
          setScreen('note');
        });
      } else if (e.kind === 'synced') {
        Family.fold().then(refreshHist);
      }
    });
    return off;
  }, [settings != null, update, flash, refreshHist]); // eslint-disable-line react-hooks/exhaustive-deps

  // Coming back to the foreground: pull what arrived while we were away.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') { void refreshFamily(); setTallies(sharedTallies()); }
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
  const check = useCallback((text: string, sender?: string) => {
    const raw = (text || '').trim();
    if (!raw) { flash('Paste a message first, then tap Check.'); return; }
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
    addCheck(rec).then(refreshHist);
    activeCheck.current = rec.id;
    setMsg(raw); setVerdict(v); setRecordId(rec.id); setNote(null);
    // 'Warn me straight away' (Settings) chooses the full-screen red alert;
    // with it off, a red verdict still lands, just on the calmer screen.
    const wantsAlert = s?.alerts !== false;
    setScreen(v.level === 'red' && sender && wantsAlert ? 'alert' : 'verdict');
    // A flagged check goes to the caretaker on its own, over the family link.
    if (v.level !== 'green' && s) void Family.publish(rec, s, false);
    // Real on-device AI second opinion fuses in when it resolves. The guard
    // keeps a slow result from an OLDER check off a newer check's screen.
    upgrade(raw, v, detOpts).then((fused) => {
      if (!fused.fused) return;
      updateCheck(rec.id, { level: fused.level, reason: fused.reason }).then(refreshHist);
      if (fused.level !== 'green' && v.level === 'green' && s) void Family.publish({ ...rec, level: fused.level, reason: fused.reason }, s, false);
      if (activeCheck.current !== rec.id) return;
      recentTags.current = fused.tags;
      setVerdict(fused);
    }).catch(() => {});
  }, [flash, refreshHist]);

  // Elder side. With the family link: the check lands on the caretaker's
  // phone as a full-screen alert. Without it: one plain text to the first
  // trusted contact, readable with no app on the other end.
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
    const first = s.trusted[0];
    if (!first) { go('people'); return; }
    await updateCheck(recId, { askedFamily: true });
    refreshHist();
    await sendSms(first.phone, loopInText(s.myName, rec));
  }, [flash, go, refreshHist]);

  // Caretaker side. A note always travels over the family link; there is no
  // text-message version of it any more.
  const sendNoteTo = useCallback(async (recId: string, text: string, verdict: 'scam' | 'safe' | 'call' | '' = '') => {
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
    if (where === 'check' && text) check(text);
  }, [check]);

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

  if (!settings || !fontsLoaded) return <View style={st.root} />;

  const careMode = settings.role === 'caretaker';
  const watchName = settings.watching?.name?.split(' ')[0] || settings.careName.split(' ')[0] || 'Family';
  const alertRec = alertId ? hist.find(r => r.id === alertId) : undefined;
  const darkBar = screen === 'alert' || screen === 'call' || screen === 'familyAlert' || screen === 'note';
  const barColor = screen === 'alert' ? T.red
    : screen === 'familyAlert' ? (alertRec?.level === 'amber' ? T.amber : T.red)
    : screen === 'note' ? T.green
    : T.callDark;

  const ctx: Ctx = {
    settings, update, screen, go, flash, check,
    msg, verdict, recordId, note, hist, refreshHist,
    wardOpen, openWard: (id) => { setWardOpen(id); setScreen('wardItem'); },
    alertId,
    openFamilyAlert: (id) => { setAlertId(id); setScreen('familyAlert'); },
    closeFamilyAlert: () => { if (alertId) updateCheck(alertId, { seen: true }).then(refreshHist); setAlertId(null); setScreen('ward'); },
    noteOpen,
    closeNote: () => { setNoteOpen(null); setScreen(verdict ? 'verdict' : 'home'); },
    loopIn, sendNoteTo, refreshFamily, unlinkFamily, blockNumber, tallies,
  };

  const goTab = (t: TabId) => go(t as ScreenId);

  // The intro owns its own chrome: the status-bar field follows the beat
  // (red on beat 0, white after), exactly like the design's barTint.
  if (screen === 'intro') return <IntroScreen ctx={ctx} />;

  return (
    <SafeAreaView style={[st.root, darkBar && { backgroundColor: barColor }]}>
      <StatusBar barStyle={darkBar ? 'light-content' : 'dark-content'} />
      <View style={st.body}>
        {screen === 'ob1' && <Ob1 ctx={ctx} />}
        {screen === 'ob2' && <Ob2 ctx={ctx} />}
        {screen === 'ob3' && <Ob3 ctx={ctx} />}
        {screen === 'ob4' && <Ob4 ctx={ctx} />}
        {screen === 'watch' && <WatchSetup ctx={ctx} />}
        {screen === 'watchWait' && <WatchWait ctx={ctx} />}
        {screen === 'watchedBy' && <WatchedBy ctx={ctx} />}
        {screen === 'home' && <HomeScreen ctx={ctx} />}
        {screen === 'verdict' && <VerdictScreen ctx={ctx} />}
        {screen === 'alert' && <AlertScreen ctx={ctx} />}
        {screen === 'history' && <HistoryScreen ctx={ctx} />}
        {screen === 'people' && <PeopleScreen ctx={ctx} />}
        {screen === 'panic' && <PanicScreen ctx={ctx} />}
        {screen === 'settings' && <SettingsScreen ctx={ctx} />}
        {screen === 'learn' && <LearnScreen ctx={ctx} />}
        {screen === 'care' && <CareScreen ctx={ctx} />}
        {screen === 'more' && <MoreScreen ctx={ctx} />}
        {screen === 'call' && <CallScreen ctx={ctx} />}
        {screen === 'ward' && <WardScreen ctx={ctx} />}
        {screen === 'wardItem' && <WardItemScreen ctx={ctx} />}
        {screen === 'familyAlert' && <FamilyAlertScreen ctx={ctx} />}
        {screen === 'note' && <NoteScreen ctx={ctx} />}
        {TAB_SCREENS.includes(screen) && (
          <TabBar careMode={careMode} watchName={watchName} screen={screen} go={goTab} />
        )}
        <Toast text={toast} />
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  body: { flex: 1, backgroundColor: T.ground },
});
