import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible';
import { T } from './theme';
import { detect, Verdict } from './engine/ScamDetector';
import { loadSettings, saveSettings, isPostPanic, Settings } from './lib/storage';
import { addCheck, newRecord, updateCheck, upsertCheck, CheckRecord } from './lib/history';
import { parseFamilyUrl } from './lib/familyLink';
import WelcomeScreen from './screens/WelcomeScreen';
import HomeScreen from './screens/HomeScreen';
import CareHomeScreen from './screens/CareHomeScreen';
import CheckDetailScreen from './screens/CheckDetailScreen';
import CareGuideScreen from './screens/CareGuideScreen';
import VerdictScreen from './screens/VerdictScreen';
import TrustedCircleScreen from './screens/TrustedCircleScreen';
import PanicScreen from './screens/PanicScreen';
import SettingsScreen from './screens/SettingsScreen';
import LearnScreen from './screens/LearnScreen';
import AlertScreen from './screens/AlertScreen';
import QRCheckScreen from './screens/QRCheckScreen';
import CodeWordScreen from './screens/CodeWordScreen';
import CallHelpScreen from './screens/CallHelpScreen';
import MoneyCheckScreen from './screens/MoneyCheckScreen';
import TrustScreen from './screens/TrustScreen';

export type Route =
  | { name: 'home' }
  | { name: 'verdict'; message: string; verdict: Verdict; recordId: string }
  | { name: 'alert'; message: string; verdict: Verdict; recordId: string }
  | { name: 'detail'; record: CheckRecord }
  | { name: 'careguide' }
  | { name: 'circle' } | { name: 'panic' } | { name: 'settings' } | { name: 'learn' }
  | { name: 'qr' } | { name: 'codeword' } | { name: 'callhelp' } | { name: 'money' } | { name: 'trust' };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
  }),
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold, Fraunces_700Bold,
    AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold,
  });
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [clipOffer, setClipOffer] = useState<string | null>(null);
  const recentTags = useRef<string[]>([]);      // conversation state → two-stage scam detection
  const clipDismissed = useRef<string | null>(null);

  useEffect(() => { loadSettings().then(setSettings); }, []);
  const updateSettings = useCallback((s: Settings) => { setSettings(s); saveSettings(s); }, []);

  const check = useCallback((message: string, opts?: { fromAlert?: boolean; sender?: string; source?: CheckRecord['source'] }) => {
    const v = detect(message, {
      allowlist: settings?.allowlist,
      sender: opts?.sender,
      recentTags: recentTags.current,
      postPanic: settings ? isPostPanic(settings) : false,
    });
    recentTags.current = v.tags; // remember for the next check (fake alert → "fraud agent" pattern)
    const rec = newRecord({ message, level: v.level, score: v.score, tags: v.tags, reason: v.reason, source: opts?.source });
    addCheck(rec);
    if (opts?.fromAlert && v.level !== 'green') setRoute({ name: 'alert', message, verdict: v, recordId: rec.id });
    else setRoute({ name: 'verdict', message, verdict: v, recordId: rec.id });
  }, [settings]);

  // ---- Deep links: check/alert (monitor & Shortcuts), family (ask/reply/pair) ----
  const handleUrl = useCallback((url: string | null) => {
    if (!url) return;
    const fam = parseFamilyUrl(url);
    if (fam) {
      if (fam.k === 'ask') {
        const rec: CheckRecord = {
          id: fam.id, at: Date.now(), level: fam.l, score: fam.s, tags: fam.t,
          reason: fam.r, excerpt: fam.e, source: 'family', from: fam.n, askedFamily: false,
        };
        upsertCheck(rec).then(() => setRoute({ name: 'detail', record: rec }));
      } else if (fam.k === 'reply') {
        updateCheck(fam.id, { reply: { by: fam.n, verdict: fam.v, at: Date.now() } }).then((rec) => {
          for (const id of rec?.reminderIds || []) Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
          Notifications.scheduleNotificationAsync({
            content: {
              title: `${fam.n} answered`,
              body: fam.v === 'scam' ? 'This is a scam — don’t reply to it.' : fam.v === 'safe' ? 'It looks okay.' : 'Call me before you do anything.',
            },
            trigger: null,
          }).catch(() => {});
          if (rec) setRoute({ name: 'detail', record: rec });
        });
      } else if (fam.k === 'pair') {
        setSettings((prev) => {
          if (!prev) return prev;
          const person = { name: fam.n, phone: fam.p };
          const next = prev.role === 'caretaker'
            ? { ...prev, watching: person }
            : { ...prev, trusted: prev.trusted.some(t => t.phone === fam.p) ? prev.trusted : [...prev.trusted, person].slice(0, 3) };
          saveSettings(next);
          return next;
        });
        setRoute({ name: 'circle' });
      }
      return;
    }
    const { hostname, path, queryParams } = Linking.parse(url);
    const where = hostname || path || '';
    const text = typeof queryParams?.text === 'string' ? queryParams.text : '';
    if ((where === 'check' || where === 'alert') && text) check(text, { fromAlert: where === 'alert', source: 'link' });
  }, [check]);

  useEffect(() => {
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', e => handleUrl(e.url));
    return () => sub.remove();
  }, [handleUrl]);

  // ---- Zero-friction entry: offer to check whatever was just copied ----
  useEffect(() => {
    const peek = async () => {
      try {
        if (settings?.role !== 'elder') return;
        const text = (await Clipboard.getStringAsync())?.trim();
        if (!text || text.length < 30 || text.length > 2000) return;
        if (text === clipDismissed.current) return;
        setClipOffer(text);
      } catch {}
    };
    peek();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') peek(); });
    return () => sub.remove();
  }, [settings?.role]);

  if (!settings || !fontsLoaded) return <View style={s.root} />;

  if (!settings.role) {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={T.cream} />
        <WelcomeScreen update={updateSettings} settings={settings} />
      </SafeAreaView>
    );
  }

  const common = { settings, update: updateSettings, go: setRoute } as const;
  const isCare = settings.role === 'caretaker';

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.cream} />
      {route.name === 'home' && (isCare
        ? <CareHomeScreen {...common} onCheck={check} />
        : <HomeScreen onCheck={check} go={setRoute} settings={settings}
            clipOffer={clipOffer}
            onClipUse={(t) => { setClipOffer(null); clipDismissed.current = t; check(t); }}
            onClipDismiss={(t) => { setClipOffer(null); clipDismissed.current = t; }} />)}
      {route.name === 'verdict' && <VerdictScreen message={route.message} verdict={route.verdict} recordId={route.recordId} {...common} />}
      {route.name === 'alert' && <AlertScreen message={route.message} verdict={route.verdict} recordId={route.recordId} settings={settings} go={setRoute} />}
      {route.name === 'detail' && <CheckDetailScreen record={route.record} {...common} />}
      {route.name === 'careguide' && <CareGuideScreen go={setRoute} />}
      {route.name === 'circle' && <TrustedCircleScreen {...common} />}
      {route.name === 'panic' && <PanicScreen {...common} />}
      {route.name === 'settings' && <SettingsScreen {...common} />}
      {route.name === 'learn' && <LearnScreen go={setRoute} />}
      {route.name === 'qr' && <QRCheckScreen go={setRoute} check={(m) => check(m, { source: 'qr' })} />}
      {route.name === 'codeword' && <CodeWordScreen {...common} />}
      {route.name === 'callhelp' && <CallHelpScreen settings={settings} go={setRoute} />}
      {route.name === 'money' && <MoneyCheckScreen go={setRoute} />}
      {route.name === 'trust' && <TrustScreen go={setRoute} />}
    </SafeAreaView>
  );
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: T.cream } });
