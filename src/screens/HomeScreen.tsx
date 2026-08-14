// Elder home — Design 4. Wordmark + settings, one clear job (check a message),
// then quiet ways to add a message and the things you might need.
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ShieldCheck, Settings as SettingsIcon, ImageIcon, Camera, Mic,
  ArrowRight, ChevronRight, Phone, Banknote, Users, LifeBuoy, TriangleAlert,
} from 'lucide-react-native';
import { T, SHADOW, F } from '../theme';
import Screen from '../ui/Screen';
import Entrance from '../ui/Entrance';
import { pickAndReadImage, OCR_AVAILABLE } from '../lib/ocr';
import type { Route } from '../App';
import type { Settings } from '../lib/storage';

function greetingFor(): string {
  // No Date at module scope constraints here — runtime is fine in a component.
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function HomeScreen(props: {
  onCheck: (m: string) => void; go: (r: Route) => void; settings: Settings;
  clipAvailable: boolean;
  onPasteCheck: () => void;
}) {
  const [text, setText] = useState('');

  const fromPhoto = async (camera: boolean) => {
    if (!OCR_AVAILABLE) {
      Alert.alert('Reading photos comes with the full app',
        'For now, paste or type the message into the box and tap “Check this message”. It works just as well.');
      return;
    }
    const t = await pickAndReadImage(camera);
    if (t) { setText(t); props.onCheck(t); }
  };

  const AddWay = ({ Icon, label, onPress }: { Icon: any; label: string; onPress: () => void }) => (
    <Pressable style={s.addWay} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Icon size={21} color={T.green} strokeWidth={1.9} />
      <Text style={s.addWayText} allowFontScaling>{label}</Text>
    </Pressable>
  );

  const NeedRow = ({ Icon, label, danger, first, onPress }: { Icon: any; label: string; danger?: boolean; first?: boolean; onPress: () => void }) => (
    <Pressable style={[s.row, first && { borderTopWidth: 0 }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[s.rowChip, danger && { backgroundColor: T.redSoft }]}>
        <Icon size={18} color={danger ? T.red : T.green} strokeWidth={2} />
      </View>
      <Text style={s.rowLabel} allowFontScaling>{label}</Text>
      <ChevronRight size={18} color={T.inkFaint} strokeWidth={2.2} />
    </Pressable>
  );

  return (
    <Screen>
      {/* wordmark + settings */}
      <View style={s.top}>
        <View style={s.wordmark}>
          <ShieldCheck size={17} color={T.green} strokeWidth={2} />
          <Text style={s.wordmarkText} allowFontScaling>LOOP ME</Text>
        </View>
        <Pressable style={s.gear} onPress={() => props.go({ name: 'settings' })} accessibilityRole="button" accessibilityLabel="Settings">
          <SettingsIcon size={19} color={T.ink2} strokeWidth={2} />
        </Pressable>
      </View>

      <Entrance index={0}>
        <View style={s.head}>
          <Text style={s.greeting} allowFontScaling>{greetingFor()}</Text>
          <Text style={s.title} allowFontScaling>Check a message</Text>
        </View>
      </Entrance>

      <Entrance index={1}>
        <View style={s.panel}>
          <TextInput
            style={s.box} multiline
            placeholder="Paste or type the message here"
            placeholderTextColor={T.inkFaint}
            value={text} onChangeText={setText}
            accessibilityLabel="Message to check"
          />
          {props.clipAvailable && !text.trim() ? (
            <Pressable style={s.checkBtn} onPress={props.onPasteCheck} accessibilityRole="button" accessibilityLabel="Paste what I copied and check it">
              <Text style={s.checkBtnText} allowFontScaling>Paste what I copied</Text>
              <ArrowRight size={19} color="#fff" strokeWidth={2.1} />
            </Pressable>
          ) : (
            <Pressable style={s.checkBtn} onPress={() => text.trim() && props.onCheck(text)} accessibilityRole="button" accessibilityLabel="Check this message">
              <Text style={s.checkBtnText} allowFontScaling>Check this message</Text>
              <ArrowRight size={19} color="#fff" strokeWidth={2.1} />
            </Pressable>
          )}
        </View>
      </Entrance>

      <Entrance index={2}>
        <Text style={s.orLabel} allowFontScaling>or add it another way</Text>
        <View style={s.addRow}>
          <AddWay Icon={ImageIcon} label="Screenshot" onPress={() => fromPhoto(false)} />
          <AddWay Icon={Camera} label="Photo" onPress={() => fromPhoto(true)} />
          <AddWay Icon={Mic} label="Speak it" onPress={() => props.go({ name: 'qr' })} />
        </View>
      </Entrance>

      <Entrance index={3}>
        <Text style={s.sectionLabel} allowFontScaling>If you need it</Text>
        <View style={s.list}>
          <NeedRow Icon={Phone} label="Someone’s calling me" first onPress={() => props.go({ name: 'callhelp' })} />
          <NeedRow Icon={Banknote} label="Before you send money" onPress={() => props.go({ name: 'money' })} />
          <NeedRow Icon={Users} label="People you trust" onPress={() => props.go({ name: 'circle' })} />
          <NeedRow Icon={LifeBuoy} label="I think I’ve been scammed" danger onPress={() => props.go({ name: 'panic' })} />
        </View>
      </Entrance>

      <View style={{ height: 24 }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 2 },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  wordmarkText: { fontSize: 13, fontFamily: F.bold, color: T.green, letterSpacing: 1.2 },
  gear: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: -8 },

  head: { paddingTop: 12 },
  greeting: { fontSize: T.small, fontFamily: F.body, color: T.inkSoft },
  title: { fontSize: T.headline, fontFamily: F.display, color: T.ink, letterSpacing: -0.4, marginTop: 2 },

  panel: {
    marginTop: 14, backgroundColor: T.card, borderWidth: 1, borderColor: T.hairline,
    borderRadius: T.radius, overflow: 'hidden', ...SHADOW,
  },
  box: {
    minHeight: 124, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 12,
    fontSize: T.body, fontFamily: F.body, color: T.ink, lineHeight: 24, textAlignVertical: 'top',
  },
  checkBtn: {
    height: 54, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
  },
  checkBtnText: { fontSize: T.body, fontFamily: F.bold, color: '#fff' },

  orLabel: { fontSize: 13, fontFamily: F.body, color: T.inkSoft, paddingTop: 18 },
  addRow: { flexDirection: 'row', gap: 6, paddingTop: 8 },
  addWay: { flex: 1, alignItems: 'center', gap: 7, paddingVertical: 11, borderRadius: T.radiusSm },
  addWayText: { fontSize: T.caption, fontFamily: F.semibold, color: T.ink },

  sectionLabel: { fontSize: T.caption, fontFamily: F.semibold, color: T.inkSoft, paddingTop: 26, paddingBottom: 2 },
  list: {
    backgroundColor: T.card, borderWidth: 1, borderColor: T.hairline, borderRadius: T.radius,
    marginTop: 8, overflow: 'hidden', ...SHADOW,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 56,
    borderTopWidth: 1, borderTopColor: T.hairline2,
  },
  rowChip: { width: 34, height: 34, borderRadius: 17, backgroundColor: T.greenSoft, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: T.bodyLg, fontFamily: F.medium, color: T.ink },
});
