import React, { useEffect, useState, useCallback, useRef } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { T } from './theme';
import { detect, Verdict } from './engine/ScamDetector';
import { loadSettings, saveSettings, isPostPanic, Settings } from './lib/storage';
import HomeScreen from './screens/HomeScreen';
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
import ScanScreen from './screens/ScanScreen';
import AnimatedBG from './components/AnimatedBG';
import { play } from './lib/sound';

export type Route =
  | { name: 'home' }
  | { name: 'verdict'; message: string; verdict: Verdict }
  | { name: 'alert'; message: string; verdict: Verdict }
  | { name: 'circle' } | { name: 'panic' } | { name: 'settings' } | { name: 'learn' }
  | { name: 'qr' } | { name: 'codeword' } | { name: 'callhelp' } | { name: 'money' } | { name: 'trust' }
  | { name: 'scan'; next: Route; level: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [settings, setSettings] = useState<Settings | null>(null);
  const recentTags = useRef<string[]>([]); // conversation state → two-stage scam detection

  useEffect(() => { loadSettings().then(setSettings); }, []);
  const updateSettings = useCallback((s: Settings) => { setSettings(s); saveSettings(s); }, []);

  const check = useCallback((message: string, opts?: { fromAlert?: boolean; sender?: string }) => {
    const v = detect(message, {
      allowlist: settings?.allowlist,
      sender: opts?.sender,
      recentTags: recentTags.current,
      postPanic: settings ? isPostPanic(settings) : false,
    });
    recentTags.current = v.tags;
    const target: Route = opts?.fromAlert && v.level !== 'green'
      ? { name: 'alert', message, verdict: v } : { name: 'verdict', message, verdict: v };
    setRoute({ name: 'scan', next: target, level: v.level } as any);
  }, [settings]);

  useEffect(() => {
    const handle = (url: string | null) => {
      if (!url) return;
      const { hostname, path, queryParams } = Linking.parse(url);
      const where = hostname || path || '';
      const text = typeof queryParams?.text === 'string' ? queryParams.text : '';
      if ((where === 'check' || where === 'alert') && text) check(text, { fromAlert: where === 'alert' });
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', e => handle(e.url));
    return () => sub.remove();
  }, [check]);

  if (!settings) return <View style={s.root} />;
  const common = { settings, update: updateSettings, go: setRoute } as const;

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.cream} />
      {route.name !== 'scan' && <AnimatedBG />}
      {route.name === 'scan' && <ScanScreen onDone={() => { play(route.level as any); setRoute(route.next); }} />}
      {route.name === 'home' && <HomeScreen onCheck={check} go={setRoute} settings={settings} />}
      {route.name === 'verdict' && <VerdictScreen message={route.message} verdict={route.verdict} {...common} />}
      {route.name === 'alert' && <AlertScreen message={route.message} verdict={route.verdict} settings={settings} go={setRoute} />}
      {route.name === 'circle' && <TrustedCircleScreen {...common} />}
      {route.name === 'panic' && <PanicScreen {...common} />}
      {route.name === 'settings' && <SettingsScreen {...common} />}
      {route.name === 'learn' && <LearnScreen go={setRoute} />}
      {route.name === 'qr' && <QRCheckScreen go={setRoute} check={check} />}
      {route.name === 'codeword' && <CodeWordScreen {...common} />}
      {route.name === 'callhelp' && <CallHelpScreen settings={settings} go={setRoute} />}
      {route.name === 'money' && <MoneyCheckScreen go={setRoute} />}
      {route.name === 'trust' && <TrustScreen go={setRoute} />}
    </SafeAreaView>
  );
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: T.cream } });
