// Loop Me — Design 4. This is the design's state machine, verbatim in shape:
// screens intro/ob1..ob4/watch/watchWait/pairAsk/home/verdict/alert/history/
// people/panic/settings/learn/care/more/call/ward/wardItem, a role-swapped tab
// bar, and 2200ms toasts. Underneath, everything is real: the detector + the
// on-device AI fusion, saved history, and the pairing/notes that travel inside
// the family's own text messages as deep links.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LogBox, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_500Medium } from '@expo-google-fonts/archivo/500Medium';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { T } from './theme';
import { instant, upgrade, FusedVerdict } from './engine/ai';
import { loadSettings, saveSettings, isPostPanic, Settings } from './lib/storage';
import { addCheck, listChecks, newRecord, updateCheck, upsertCheck, CheckRecord } from './lib/history';
import { parseFamilyUrl, sendSms, noteText, pairOkText, pairNoText } from './lib/familyLink';
import TabBar, { TabId } from './ui/TabBar';
import Toast from './ui/Toast';
import IntroScreen from './screens/IntroScreen';
import { Ob1, Ob2, Ob3, Ob4 } from './screens/SetupScreens';
import { WatchSetup, WatchWait, PairAsk } from './screens/PairScreens';
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

export type ScreenId =
  | 'intro' | 'ob1' | 'ob2' | 'ob3' | 'ob4'
  | 'watch' | 'watchWait' | 'pairAsk'
  | 'home' | 'verdict' | 'alert'
  | 'history' | 'people' | 'panic' | 'settings' | 'learn' | 'care' | 'more'
  | 'call' | 'ward' | 'wardItem';

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
  pairAsk: { name: string; phone: string } | null;
  setPairAsk: (p: { name: string; phone: string } | null) => void;
  sendNoteTo: (recId: string, text: string) => Promise<void>;
}

const TAB_SCREENS: ScreenId[] = ['home', 'history', 'people', 'more', 'learn', 'settings', 'care', 'ward'];

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
  }),
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
  const [pairAsk, setPairAsk] = useState<{ name: string; phone: string } | null>(null);
  const recentTags = useRef<string[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refreshHist = useCallback(() => { listChecks().then(setHist); }, []);

  useEffect(() => {
    loadSettings().then((s) => {
      // The elder phone carries a standing six-digit code for the pairing handshake.
      if (!s.pairCode) { s = { ...s, pairCode: sixDigits() }; saveSettings(s); }
      setSettings(s);
      setScreen(s.introSeen && s.role ? 'home' : 'intro');
    });
    refreshHist();
  }, [refreshHist]);

  const update = useCallback((s: Settings) => { setSettings(s); saveSettings(s); }, []);

  const flash = useCallback((t: string) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }, []);

  const go = useCallback((s: ScreenId) => { setScreen(s); }, []);

  const check = useCallback((text: string, sender?: string) => {
    const raw = (text || '').trim();
    if (!raw) { flash('Paste a message first, then tap Check.'); return; }
    const detOpts = {
      allowlist: settings?.allowlist,
      sender,
      recentTags: recentTags.current,
      postPanic: settings ? isPostPanic(settings) : false,
    };
    const v = instant(raw, detOpts);
    recentTags.current = v.tags;
    const rec = newRecord({ message: raw, level: v.level, score: v.score, tags: v.tags, reason: v.reason, source: sender ? 'link' : 'typed' });
    rec.sender = sender || 'Pasted message';
    addCheck(rec).then(refreshHist);
    setMsg(raw); setVerdict(v); setRecordId(rec.id); setNote(null);
    setScreen(v.level === 'red' && sender ? 'alert' : 'verdict');
    // Real on-device AI second opinion fuses in when it resolves.
    upgrade(raw, v, detOpts).then((fused) => {
      if (!fused.fused) return;
      recentTags.current = fused.tags;
      updateCheck(rec.id, { level: fused.level, reason: fused.reason }).then(refreshHist);
      setVerdict((cur) => (cur && rec.id === recId(cur, rec.id) ? fused : cur));
      function recId(_c: FusedVerdict, id: string) { return id; }
    }).catch(() => {});
  }, [settings, flash, refreshHist]);

  const sendNoteTo = useCallback(async (recId: string, text: string) => {
    if (!settings) return;
    const t = text.trim();
    if (!t) { flash('Write a note first, or tap one of the three above.'); return; }
    const rec = hist.find(r => r.id === recId);
    const meta = 'Sent just now';
    await updateCheck(recId, { notes: [ ...(rec?.notes || []), { text: t, meta } ] });
    refreshHist();
    await sendSms(settings.watching?.phone || null, noteText(settings.myName, recId, t));
    flash('Sent. It is on ' + (settings.watching?.name?.split(' ')[0] || 'their') + '’s screen now.');
  }, [settings, hist, flash, refreshHist]);

  // ---- Deep links: check/alert (Shortcuts + monitor) and the family protocol ----
  const handleUrl = useCallback((url: string | null) => {
    if (!url || !settings) return;
    const fam = parseFamilyUrl(url);
    if (fam) {
      if (fam.k === 'ask') {
        const rec: CheckRecord = {
          id: fam.id, at: Date.now(), level: fam.l, score: fam.s, tags: fam.t,
          reason: fam.r, excerpt: fam.e, source: 'family', from: fam.n, askedFamily: false,
          sender: fam.n, notes: [],
        };
        upsertCheck(rec).then(() => { refreshHist(); setWardOpen(fam.id); setScreen('wardItem'); });
        flash('Something was flagged on ' + (settings.watching?.name?.split(' ')[0] || fam.n) + '’s phone.');
      } else if (fam.k === 'reply') {
        updateCheck(fam.id, { reply: { by: fam.n, verdict: fam.v, at: Date.now() } }).then((rec) => {
          for (const id of rec?.reminderIds || []) Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
          refreshHist();
          setNote({ from: fam.n, text: fam.v === 'scam' ? 'It is fake, please delete it and do not reply.' : fam.v === 'safe' ? 'That one is genuine, you are fine to open it.' : 'Do not tap anything, I will call you now.' });
          flash(fam.n + ' sent you a note.');
        });
      } else if (fam.k === 'note') {
        setNote({ from: fam.n, text: fam.x });
        if (verdict) setScreen('verdict');
        flash(fam.n + ' sent you a note.');
      } else if (fam.k === 'pairreq') {
        // Elder side: only a request carrying THIS phone's code raises consent.
        if (fam.c === settings.pairCode) { setPairAsk({ name: fam.n, phone: fam.p }); setScreen('pairAsk'); }
        else flash('Someone tried to pair with the wrong code. Nothing was shared.');
      } else if (fam.k === 'pairok') {
        update({ ...settings, role: 'caretaker', watching: { name: fam.n, phone: fam.p } });
        setScreen('ward');
        flash(fam.n.split(' ')[0] + ' said yes. You are looped in now.');
      } else if (fam.k === 'pairno') {
        setScreen('watch');
        flash('They tapped Not now. Nothing was shared.');
      } else if (fam.k === 'pair') {
        const person = { name: fam.n, phone: fam.p };
        update(settings.role === 'caretaker'
          ? { ...settings, watching: person }
          : { ...settings, trusted: settings.trusted.some(t => t.phone === fam.p) ? settings.trusted : [...settings.trusted, person].slice(0, 3) });
        flash(fam.n.split(' ')[0] + ' is looped in now.');
      }
      return;
    }
    const { hostname, path, queryParams } = Linking.parse(url);
    const where = hostname || path || '';
    const text = typeof queryParams?.text === 'string' ? queryParams.text : '';
    if ((where === 'check' || where === 'alert') && text) check(text, where === 'alert' ? 'an unknown number' : undefined);
  }, [settings, check, flash, refreshHist, update, verdict]);

  useEffect(() => {
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', e => handleUrl(e.url));
    return () => sub.remove();
  }, [handleUrl]);

  if (!settings || !fontsLoaded) return <View style={st.root} />;

  const careMode = settings.role === 'caretaker';
  const watchName = settings.watching?.name?.split(' ')[0] || 'Ruth';
  const darkBar = screen === 'alert' || screen === 'call';

  const ctx: Ctx = {
    settings, update, screen, go, flash, check,
    msg, verdict, recordId, note, hist, refreshHist,
    wardOpen, openWard: (id) => { setWardOpen(id); setScreen('wardItem'); },
    pairAsk, setPairAsk, sendNoteTo,
  };

  const goTab = (t: TabId) => go(t as ScreenId);

  // The intro owns its own chrome: the status-bar field follows the beat
  // (red on beat 0, white after), exactly like the design's barTint.
  if (screen === 'intro') return <IntroScreen ctx={ctx} />;

  return (
    <SafeAreaView style={[st.root, darkBar && { backgroundColor: screen === 'alert' ? T.red : T.callDark }]}>
      <StatusBar barStyle={darkBar ? 'light-content' : 'dark-content'} />
      <View style={st.body}>
        {screen === 'ob1' && <Ob1 ctx={ctx} />}
        {screen === 'ob2' && <Ob2 ctx={ctx} />}
        {screen === 'ob3' && <Ob3 ctx={ctx} />}
        {screen === 'ob4' && <Ob4 ctx={ctx} />}
        {screen === 'watch' && <WatchSetup ctx={ctx} />}
        {screen === 'watchWait' && <WatchWait ctx={ctx} />}
        {screen === 'pairAsk' && <PairAsk ctx={ctx} />}
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
