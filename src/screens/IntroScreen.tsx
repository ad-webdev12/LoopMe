// First open. The launch screen shows the app icon in the middle of the
// screen; this screen picks it up at that exact spot, glides it to the top
// left corner, then fades the words and buttons in under it.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StatusBar, Text, View, useWindowDimensions } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { T, font } from '../theme';
import { Pill, TextBtn, APP_ICON, motionOff } from '../ui/base';
import type { Ctx } from '../App';

const BIG = 96, SMALL = 72, LEFT = 24, TOP = 110;

export default function IntroScreen({ ctx }: { ctx: Ctx }) {
  const { width: W, height: H } = useWindowDimensions();
  const skip = () => {
    ctx.update({ ...ctx.settings, introSeen: true, role: ctx.settings.role || 'elder' });
    ctx.go('home');
  };
  const move = useRef(new Animated.Value(motionOff() ? 1 : 0)).current;
  const fade = useRef(new Animated.Value(motionOff() ? 1 : 0)).current;
  useEffect(() => {
    if (motionOff()) return;
    Animated.sequence([
      Animated.delay(350),
      Animated.timing(move, { toValue: 1, duration: 640, easing: Easing.bezier(0.2, 0.9, 0.2, 1), useNativeDriver: true }),
    ]).start();
    Animated.timing(fade, { toValue: 1, duration: 420, delay: 760, useNativeDriver: true }).start();
  }, [move, fade]);
  // The icon is laid out at the centre at BIG, then translated and scaled to
  // the corner at SMALL. Scaling happens about the centre, so the corner
  // target is offset by half the size difference.
  const dx = move.interpolate({ inputRange: [0, 1], outputRange: [0, LEFT + SMALL / 2 - W / 2] });
  const dy = move.interpolate({ inputRange: [0, 1], outputRange: [0, TOP + SMALL / 2 - H / 2] });
  const sc = move.interpolate({ inputRange: [0, 1], outputRange: [1, SMALL / BIG] });

  return (
    <View style={{ flex: 1, backgroundColor: T.green }}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={{ position: 'absolute', left: (W - BIG) / 2, top: (H - BIG) / 2, width: BIG, height: BIG, transform: [{ translateX: dx }, { translateY: dy }, { scale: sc }] }}>
        <Image source={APP_ICON} style={{ width: BIG, height: BIG, borderRadius: BIG * 0.2237 }} />
      </Animated.View>
      <Animated.View style={{ flex: 1, opacity: fade, paddingHorizontal: LEFT, paddingTop: TOP + SMALL, paddingBottom: 44 }}>
        <Text style={[font(38, '800', 1.05, -0.5), { color: '#fff', marginTop: 28 }]} allowFontScaling>Not sure about a text?{'\n'}Check it here.</Text>
        <Text style={[font(17, '400', 1.45), { color: '#fff', marginTop: 16 }]} allowFontScaling>Loop Me reads a message on this phone and tells you if it’s a scam. If you like, one person you trust hears about it too.</Text>
        <View style={{ marginTop: 'auto', gap: 8 }}>
          <Pill label="Get started" bg="#fff" color={T.greenDeep} onPress={() => ctx.go('ob1')} trailing={<ArrowRight size={20} color={T.greenDeep} strokeWidth={2.2} />} />
          <TextBtn label="I’ve used this before" onPress={skip} />
        </View>
      </Animated.View>
    </View>
  );
}
