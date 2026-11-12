// Use Loop Me in Messages: how the drawer works, with the three steps and a
// picture of the strip. Nothing here is fake; it is a guide to the real
// extension that ships in the Messages app.
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Lock, ClipboardPaste, ImageIcon } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, ScreenTitle, Lead, Note, APP_ICON } from '../ui/base';
import type { Ctx } from '../App';

export default function DrawerInfoScreen({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  return (
    <Screen C={C} playKey="drawerInfo">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <BackLink label="Settings" onPress={() => ctx.go('settings')} />
        <ScreenTitle C={C}>Use Loop Me in Messages</ScreenTitle>
        <Lead C={C}>Check a text without leaving Messages. Loop Me sits in the + list under the keyboard, next to Photos.</Lead>

        <View style={st.drawer}>
          <View style={st.grabber} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <Image source={APP_ICON} style={{ width: 24, height: 24, borderRadius: 6 }} />
            <Text style={[font(15, '600'), { color: '#3c3c43' }]} allowFontScaling>Loop Me</Text>
            <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Lock size={13} color="#000" strokeWidth={2} />
              <Text style={[font(13.5, '500'), { color: '#000' }]} allowFontScaling>Stays on this phone</Text>
            </View>
          </View>
          <Text style={[font(26, '800', 1.1, -0.5), { color: '#000', marginTop: 12 }]} allowFontScaling>Not sure about a message?{'\n'}Copy it, then tap Paste.</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 16 }}>
            {['Press and hold the text', 'Tap Copy', 'Tap Paste below'].map((t, i) => (
              <View key={t} style={st.step}>
                <Text style={[font(13, '700'), { color: T.green, marginBottom: 3 }]} allowFontScaling>{i + 1}</Text>
                <Text style={[font(14, '500', 1.25), { color: '#3c3c43' }]} allowFontScaling>{t}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <View style={[st.btn, { flex: 1, backgroundColor: T.green, flexDirection: 'row', gap: 9 }]}>
              <ClipboardPaste size={20} color="#fff" strokeWidth={2} />
              <Text style={[font(17, '600'), { color: '#fff' }]} allowFontScaling>Paste</Text>
            </View>
            <View style={[st.btn, { width: 54, backgroundColor: '#eef4f1' }]}><ImageIcon size={22} color={T.green} strokeWidth={2} /></View>
          </View>
        </View>

        <Note C={C} top={18}>
          In Messages, press and hold the text, tap Copy. Tap the + next to the message box, then Loop Me, then the green Paste button. The answer appears right there, in red, amber or green, with the same buttons as the app. Nothing is sent into the chat.
        </Note>
        <Note C={C}>
          Don’t see Loop Me in the + list? Scroll the list down; it sits with the other apps.
        </Note>
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  drawer: { marginHorizontal: 16, marginTop: 18, backgroundColor: '#f9f9f7', borderRadius: 28, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e5ea' },
  grabber: { width: 36, height: 5, borderRadius: 3, backgroundColor: '#c7c7cc', alignSelf: 'center' },
  step: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingTop: 9, paddingHorizontal: 10, paddingBottom: 10 },
  btn: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
