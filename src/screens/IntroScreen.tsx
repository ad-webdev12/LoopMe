// First open. One green screen, the app icon, what the app does in two
// lines, and a way in. Nothing fake on it.
import React from 'react';
import { Image, StatusBar, Text, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { T, font } from '../theme';
import { Pill, TextBtn, APP_ICON } from '../ui/base';
import type { Ctx } from '../App';

export default function IntroScreen({ ctx }: { ctx: Ctx }) {
  const skip = () => {
    ctx.update({ ...ctx.settings, introSeen: true, role: ctx.settings.role || 'elder' });
    ctx.go('home');
  };
  return (
    <View style={{ flex: 1, backgroundColor: T.green, paddingHorizontal: 24, paddingTop: 110, paddingBottom: 44 }}>
      <StatusBar barStyle="light-content" />
      <Image source={APP_ICON} style={{ width: 72, height: 72, borderRadius: 18 }} />
      <Text style={[font(38, '800', 1.05, -0.5), { color: '#fff', marginTop: 28 }]} allowFontScaling>Not sure about a text?{'\n'}Check it here.</Text>
      <Text style={[font(17, '400', 1.45), { color: '#fff', marginTop: 16 }]} allowFontScaling>Loop Me reads a message on this phone and tells you if it’s a scam. If you like, one person you trust hears about it too.</Text>
      <View style={{ marginTop: 'auto', gap: 8 }}>
        <Pill label="Get started" bg="#fff" color={T.greenDeep} onPress={() => ctx.go('ob1')} trailing={<ArrowRight size={20} color={T.greenDeep} strokeWidth={2.2} />} />
        <TextBtn label="I’ve used this before" onPress={skip} />
      </View>
    </View>
  );
}
