// The two iPhone switches that make Loop Me run on its own. No app can flip
// them, so this screen walks the person there, one tap at a time, with the
// rows drawn the way iOS Settings draws them, and says plainly what is on.
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, Check, MessageSquare, Phone } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import { callDirectoryStatus } from '../../modules/scam-ai';
import type { Ctx } from '../App';

function Path({ steps }: { steps: string[] }) {
  return (
    <View style={st.path}>
      {steps.map((s, i) => (
        <View key={i} style={[st.pathRow, i === steps.length - 1 && { borderBottomWidth: 0 }]}>
          <View style={st.pathNum}><Text style={st.pathNumText} allowFontScaling>{i + 1}</Text></View>
          <Text style={st.pathText} allowFontScaling>{s}</Text>
        </View>
      ))}
    </View>
  );
}

export default function SwitchesScreen({ ctx }: { ctx: Ctx }) {
  const [calls, setCalls] = useState<'enabled' | 'disabled' | 'unknown'>('unknown');
  useEffect(() => { callDirectoryStatus().then(setCalls).catch(() => {}); }, []);
  const filterOn = Date.now() - (ctx.tallies.lastFilteredAt || 0) < 7 * 86400000;
  const callsOn = calls === 'enabled';
  const open = () => Linking.openSettings();
  const openPhone = open;

  return (
    <KFIn duration={260} style={{ flex: 1 }} playKey="switches">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={st.topRow}>
        <Pressable style={st.back} onPress={() => ctx.go('home')} accessibilityRole="button">
          <ChevronLeft size={18} color={T.ink} strokeWidth={2.2} />
          <Text style={st.backText} allowFontScaling>Back</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 22, paddingBottom: 6 }}>
        <Text style={st.title} allowFontScaling>Two switches</Text>
        <Text style={st.sub} allowFontScaling>Both live in the iPhone Settings app. One minute, once. The button opens Settings; tap Back once to reach Apps.</Text>
      </View>

      <View style={st.block}>
        <View style={st.head}>
          <View style={[st.icon, { backgroundColor: filterOn ? T.green : T.amber }]}>{filterOn ? <Check size={18} color="#fff" strokeWidth={3} /> : <MessageSquare size={18} color="#fff" strokeWidth={2.2} />}</View>
          <View style={{ flex: 1 }}>
            <Text style={st.headTitle} allowFontScaling>Unknown texts</Text>
            <Text style={st.headState} allowFontScaling>{filterOn ? 'On. Checked before they reach you.' : 'Not seen working yet.'}</Text>
          </View>
        </View>
        <Path steps={['Open Settings', 'Scroll down, tap Apps', 'Tap Messages', 'Tap Unknown & Junk', 'Under SMS Filtering, tap Loop Me']} />
        <Pressable style={st.cta} onPress={open} accessibilityRole="button">
          <Text style={st.ctaText} allowFontScaling>Open Settings</Text>
          <ChevronRight size={18} color="#fff" strokeWidth={2.4} />
        </Pressable>
        {!filterOn && <Text style={st.foot} allowFontScaling>This turns green once the first text from a stranger is checked.</Text>}
      </View>

      <View style={st.block}>
        <View style={st.head}>
          <View style={[st.icon, { backgroundColor: callsOn ? T.green : T.amber }]}>{callsOn ? <Check size={18} color="#fff" strokeWidth={3} /> : <Phone size={18} color="#fff" strokeWidth={2.2} />}</View>
          <View style={{ flex: 1 }}>
            <Text style={st.headTitle} allowFontScaling>Scam callers</Text>
            <Text style={st.headState} allowFontScaling>{callsOn ? 'On. Blocked numbers cannot ring.' : 'Off.'}</Text>
          </View>
        </View>
        <Path steps={['Open Settings', 'Scroll down, tap Apps', 'Tap Phone', 'Tap Call Blocking & Identification', 'Switch Loop Me on']} />
        <Pressable style={st.cta} onPress={openPhone} accessibilityRole="button">
          <Text style={st.ctaText} allowFontScaling>Open Settings</Text>
          <ChevronRight size={18} color="#fff" strokeWidth={2.4} />
        </Pressable>
      </View>
      <View style={{ height: 110 }} />
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  topRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  back: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { fontSize: 17, fontFamily: F.medium, color: T.ink },
  title: { fontSize: 31, fontFamily: F.display, letterSpacing: -0.7, color: T.ink, lineHeight: 34 },
  sub: { fontSize: 16, fontFamily: F.body, color: T.sub, lineHeight: 23, marginTop: 8 },
  block: { marginHorizontal: 20, marginTop: 18, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, padding: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headTitle: { fontSize: 19, fontFamily: F.bold, color: T.ink },
  headState: { fontSize: 14.5, fontFamily: F.body, color: T.sub, marginTop: 2 },
  path: { borderWidth: 1, borderColor: T.hairline, borderRadius: 12, overflow: 'hidden' },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.divider },
  pathNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: T.ground, alignItems: 'center', justifyContent: 'center' },
  pathNumText: { fontSize: 13, fontFamily: F.bold, color: T.ink },
  pathText: { flex: 1, fontSize: 17, fontFamily: F.medium, color: T.ink },
  cta: { marginTop: 12, height: 54, borderRadius: 12, backgroundColor: T.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  ctaText: { fontSize: 17, fontFamily: F.bold, color: '#fff' },
  foot: { marginTop: 10, fontSize: 14, fontFamily: F.body, color: T.sub, lineHeight: 20 },
});
