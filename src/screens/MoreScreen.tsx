// More. The things that run on their own (text filter, scam callers, the
// family link) with their real on/off state, then learning and setup, then
// the red-edged row for when something has already happened.
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Phone, HandHeart, UserPlus, BookOpen, Settings as Cog, ChevronRight, LifeBuoy, MessageSquareOff, PhoneOff, Share2 } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import { callDirectoryStatus } from '../../modules/scam-ai';
import type { Ctx } from '../App';

export default function MoreScreen({ ctx }: { ctx: Ctx }) {
  const s = ctx.settings;
  const careMode = s.role === 'caretaker';
  const watchName = s.watching?.name?.split(' ')[0] || 'them';
  const watchedBy = s.familyLinked && s.familyRole === 'owner' ? (s.watchedBy?.split(' ')[0] || null) : null;
  const [calls, setCalls] = useState<'enabled' | 'disabled' | 'unknown'>('unknown');
  useEffect(() => { callDirectoryStatus().then(setCalls); }, []);
  const version = Constants.expoConfig?.version || '1.0';

  const Row = ({ Icon, color, title, sub, last, onPress, state }: { Icon: any; color: string; title: string; sub: string; last?: boolean; onPress: () => void; state?: 'on' | 'off' }) => (
    <Pressable style={[st.row, last && { borderBottomWidth: 0 }]} onPress={onPress} accessibilityRole="button">
      <Icon size={18} color={color} strokeWidth={2} />
      <View style={{ flex: 1 }}>
        <Text style={st.rowTitle} allowFontScaling>{title}</Text>
        <Text style={st.rowSub} allowFontScaling>{sub}</Text>
      </View>
      {state && (
        <View style={[st.pill, state === 'on' ? st.pillOn : st.pillOff]}>
          <Text style={[st.pillText, state === 'on' ? { color: T.greenInk } : { color: T.sub }]} allowFontScaling>{state === 'on' ? 'On' : 'Off'}</Text>
        </View>
      )}
      <ChevronRight size={17} color={color} strokeWidth={2.2} />
    </Pressable>
  );

  const openMessagesSettings = () => Linking.openURL('App-prefs:MESSAGES').catch(() => Linking.openSettings());
  const openPhoneSettings = () => Linking.openURL('App-prefs:Phone').catch(() => Linking.openSettings());

  return (
    <KFIn duration={260} style={{ flex: 1 }} playKey="more">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 14 }}>
        <Text style={st.title} allowFontScaling>More</Text>
      </View>

      <Text style={st.section} allowFontScaling>Running on its own</Text>
      <View style={st.card}>
        <Row Icon={MessageSquareOff} color={T.green} title="Texts from numbers you do not know"
          sub={ctx.tallies.junk > 0 ? ctx.tallies.junk + ' scam texts stopped before they reached you' : 'Checked before they reach you. Turn on under Messages › Unknown & Junk.'}
          state={ctx.tallies.filtered > 0 ? 'on' : 'off'}
          onPress={openMessagesSettings} />
        <Row Icon={PhoneOff} color={T.green} title="Scam callers"
          sub={calls === 'enabled' ? 'Numbers that sent a scam show “Flagged by Loop Me” when they ring' : 'Turn on under Phone › Call Blocking & Identification.'}
          state={calls === 'enabled' ? 'on' : 'off'}
          onPress={openPhoneSettings} />
        <Row Icon={Share2} color={T.green} title="Check from any app"
          sub="Select a text or a screenshot, tap Share, then Loop Me. The answer appears right there."
          onPress={() => ctx.flash('In Messages, WhatsApp or Mail: select the text, tap Share, then Loop Me.')} />
        <Row Icon={HandHeart} color={T.green}
          title={careMode ? 'Looking after ' + watchName : 'Look after someone else'}
          sub={careMode ? (s.familyLinked ? 'Their scam alerts appear here the moment they happen.' : 'Waiting for their invite link.') : 'Their scam alerts appear on your phone, full screen.'}
          last={careMode}
          onPress={() => careMode ? ctx.go(s.familyLinked ? 'ward' : 'watch') : ctx.go('watch')} />
        {!careMode && (
          <Row Icon={UserPlus} color={T.green}
            title={watchedBy ? 'Watched over by ' + watchedBy : s.familyInvited ? 'Invite sent, waiting for a tap' : 'Watched over by no one yet'}
            sub={watchedBy ? 'They hear about anything flagged here, the moment it happens.' : 'Send one link to someone you trust. No texts after that.'}
            state={watchedBy ? 'on' : undefined}
            last
            onPress={() => ctx.go('watchedBy')} />
        )}
      </View>

      <Text style={st.section} allowFontScaling>Learn and set up</Text>
      <View style={st.card}>
        <Row Icon={BookOpen} color={T.amber} title="Learn the tricks" sub="Five worth knowing, in plain words." onPress={() => ctx.go('learn')} />
        <Row Icon={Phone} color={T.amber} title="Practice a scam call" sub="A rehearsal of the call that catches the most people. Nobody really calls." onPress={() => ctx.go('call')} />
        <Row Icon={HandHeart} color={T.amber} title="Set up for someone else" sub="Caregiver mode, four things to check." onPress={() => ctx.go('care')} />
        <Row Icon={Cog} color={T.sub} title="Settings" sub="Alerts, read aloud, safe senders, blocked numbers." last onPress={() => ctx.go('settings')} />
      </View>

      <Text style={[st.section, { paddingTop: 16 }]} allowFontScaling>
        {careMode ? 'If something has already happened' : 'If it already happened'}
      </Text>
      <Pressable style={st.panicRow} onPress={() => ctx.go('panic')} accessibilityRole="button">
        <LifeBuoy size={18} color={T.red} strokeWidth={2} />
        <View style={{ flex: 1 }}>
          <Text style={st.panicTitle} allowFontScaling>{careMode ? 'Help ' + watchName + ' report fraud' : 'I think I’ve been scammed'}</Text>
          <Text style={st.rowSub} allowFontScaling>{careMode ? 'Five steps to work through together, bank first.' : 'Five calm steps, starting with your bank.'}</Text>
        </View>
        <ChevronRight size={17} color={T.red} strokeWidth={2.2} />
      </Pressable>

      <Text style={st.version} allowFontScaling>Loop Me {version} · checks happen on this phone · no account · the family link runs on your own iCloud</Text>
      <View style={{ height: 104 }} />
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  title: { fontSize: 27, fontFamily: F.display, letterSpacing: -0.54, color: T.ink, lineHeight: 30 },
  section: { paddingHorizontal: 22, paddingBottom: 7, fontSize: 14.5, fontFamily: F.bold, color: T.sub },
  card: {
    marginHorizontal: 22, marginBottom: 16, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderBottomWidth: 1, borderBottomColor: T.divider },
  rowTitle: { fontSize: 16.5, fontFamily: F.bold, color: T.ink },
  rowSub: { fontSize: 14.5, fontFamily: F.body, color: T.sub, marginTop: 2, lineHeight: 20 },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  pillOn: { backgroundColor: T.greenTint },
  pillOff: { backgroundColor: T.rowHover },
  pillText: { fontSize: 13, fontFamily: F.semibold },
  panicRow: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.redEdge,
    padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  panicTitle: { fontSize: 16.5, fontFamily: F.bold, color: T.red },
  version: { paddingHorizontal: 22, paddingTop: 20, fontSize: 13.5, fontFamily: F.body, color: T.sub, lineHeight: 19 },
});
