import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import Glass from './Glass';
import { T, F } from '../theme';

/** Standard screen scaffold: warm gradient atmosphere, a floating Liquid-Glass
 *  navigation bar (a functional surface — where glass belongs), scrollable body. */
export default function Screen(props: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  centered?: boolean;
}) {
  const hasBar = !!(props.title || props.onBack);
  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#FFFDF6', T.cream, '#F3ECDE']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* soft radial bloom for depth behind the content */}
      <LinearGradient
        colors={['rgba(46,95,163,0.06)', 'rgba(46,95,163,0)']}
        style={s.bloom}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={[s.body, hasBar && s.bodyWithBar, props.centered && s.centered]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {props.children}
      </ScrollView>
      {hasBar && (
        <View style={s.barWrap} pointerEvents="box-none">
          <Glass radius={22} intensity={50} style={s.bar}>
            {props.onBack ? (
              <Pressable onPress={props.onBack} style={s.back} accessibilityRole="button" accessibilityLabel="Back">
                <ChevronLeft size={24} color={T.ink} strokeWidth={2.4} />
                <Text style={s.backText} allowFontScaling>Back</Text>
              </Pressable>
            ) : <View style={s.backSpacer} />}
            {props.title ? <Text style={s.title} allowFontScaling numberOfLines={1}>{props.title}</Text> : <View style={{ flex: 1 }} />}
            <View style={s.right}>{props.right}</View>
          </Glass>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.cream },
  bloom: { position: 'absolute', top: -120, left: -80, right: -80, height: 360, borderRadius: 360 },
  barWrap: { position: 'absolute', top: 8, left: 14, right: 14 },
  bar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    minHeight: 50,
    shadowColor: '#2A2116', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  back: { flexDirection: 'row', alignItems: 'center', minWidth: 82, minHeight: 44, paddingRight: 8 },
  backSpacer: { minWidth: 82 },
  backText: { fontSize: T.small, color: T.ink, fontFamily: F.bodyBold },
  title: { flex: 1, textAlign: 'center', fontSize: T.small, fontFamily: F.bodyBold, color: T.ink },
  right: { minWidth: 82, alignItems: 'flex-end' },
  body: { paddingHorizontal: T.pad, paddingBottom: 40 },
  bodyWithBar: { paddingTop: 70 },
  centered: { flexGrow: 1, justifyContent: 'center' },
});
