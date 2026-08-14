// More — source lines 431-448. Live protection rows, learn-and-set-up rows,
// the red-edged panic row, and the version line. The "Watched over by" row
// shows this phone's six-digit pairing code when tapped.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Phone, HandHeart, UserPlus, BookOpen, Settings as Cog, ChevronRight, LifeBuoy } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFIn } from '../ui/kf';
import type { Ctx } from '../App';

export default function MoreScreen({ ctx }: { ctx: Ctx }) {
  const careMode = ctx.settings.role === 'caretaker';
  const watchName = ctx.settings.watching?.name?.split(' ')[0] || 'Ruth';
  const watchedBy = ctx.settings.watchedBy;

  const Row = ({ Icon, color, title, sub, last, onPress }: { Icon: any; color: string; title: string; sub: string; last?: boolean; onPress: () => void }) => (
    <Pressable style={[st.row, last && { borderBottomWidth: 0 }]} onPress={onPress} accessibilityRole="button">
      <Icon size={16} color={color} strokeWidth={2} />
      <View style={{ flex: 1 }}>
        <Text style={st.rowTitle} allowFontScaling>{title}</Text>
        <Text style={st.rowSub} allowFontScaling>{sub}</Text>
      </View>
      <ChevronRight size={17} color={color} strokeWidth={2.2} />
    </Pressable>
  );

  return (
    <KFIn duration={260} style={{ flex: 1 }} playKey="more">
    <ScrollView style={st.root} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 14 }}>
        <Text style={st.title} allowFontScaling>More</Text>
      </View>

      <Text style={st.section} allowFontScaling>Live protection</Text>
      <View style={st.card}>
        <Row Icon={Phone} color={T.green} title="Call screening" sub="Listens to unknown callers with you. Try it now." onPress={() => ctx.go('call')} />
        <Row Icon={HandHeart} color={T.green}
          title={careMode ? 'Looking after ' + watchName : 'Look after someone else'}
          sub={careMode ? 'You get their scam alerts and can send notes.' : 'Get their scam alerts on your own phone.'}
          last={careMode}
          onPress={() => careMode ? ctx.go('ward') : ctx.go('watch')} />
        {!careMode && (
          <Row Icon={UserPlus} color={T.green}
            title={watchedBy ? 'Watched over by ' + watchedBy : 'Watched over by no one yet'}
            sub={'Your code is ' + ctx.settings.pairCode + ', read it to them'}
            last
            onPress={() => ctx.flash(watchedBy ? 'Shows what she can and cannot see, and how to stop it.' : 'Your code is ' + ctx.settings.pairCode + '. Read it to the person who looks after you.')} />
        )}
      </View>

      <Text style={st.section} allowFontScaling>Learn and set up</Text>
      <View style={st.card}>
        <Row Icon={BookOpen} color={T.amber} title="Learn the tricks" sub="Five worth knowing, in plain words." onPress={() => ctx.go('learn')} />
        <Row Icon={HandHeart} color={T.amber} title="Set up for someone else" sub="Caregiver mode, four things to check." onPress={() => ctx.go('care')} />
        <Row Icon={Cog} color={T.sub} title="Settings" sub="Alerts, auto-checking, safe senders." last onPress={() => ctx.go('settings')} />
      </View>

      <Text style={[st.section, { paddingTop: 16, fontFamily: F.bold, fontSize: 13, letterSpacing: 0, textTransform: 'none' }]} allowFontScaling>
        {careMode ? 'If something has already happened' : 'If it already happened'}
      </Text>
      <Pressable style={st.panicRow} onPress={() => ctx.go('panic')} accessibilityRole="button">
        <LifeBuoy size={16} color={T.red} strokeWidth={2} />
        <View style={{ flex: 1 }}>
          <Text style={st.panicTitle} allowFontScaling>{careMode ? 'Help ' + watchName + ' report fraud' : 'I think I’ve been scammed'}</Text>
          <Text style={st.rowSub} allowFontScaling>{careMode ? 'Five steps to work through together, bank first.' : 'Five calm steps, starting with your bank.'}</Text>
        </View>
        <ChevronRight size={17} color={T.red} strokeWidth={2.2} />
      </Pressable>

      <Text style={st.version} allowFontScaling>Loop Me 3.0 · works offline · no account · nothing kept on any server</Text>
      <View style={{ height: 104 }} />
    </ScrollView>
    </KFIn>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  title: { fontSize: 27, fontFamily: F.display, letterSpacing: -0.54, color: T.ink, lineHeight: 28.6 },
  section: { paddingHorizontal: 22, paddingBottom: 7, fontSize: 13, fontFamily: F.bold, color: T.sub },
  card: {
    marginHorizontal: 22, marginBottom: 16, backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderBottomWidth: 1, borderBottomColor: T.divider },
  rowTitle: { fontSize: 15, fontFamily: F.bold, color: T.ink },
  rowSub: { fontSize: 12.5, fontFamily: F.body, color: T.sub, marginTop: 2, lineHeight: 18.1 },
  panicRow: {
    marginHorizontal: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.redEdge,
    padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#171717', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  panicTitle: { fontSize: 15, fontFamily: F.bold, color: T.red },
  version: { paddingHorizontal: 22, paddingTop: 20, fontSize: 12, fontFamily: F.body, color: T.sub, lineHeight: 18 },
});
