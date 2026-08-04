import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { T, F } from '../theme';

/** Standard screen scaffold: warm gradient atmosphere, optional back control +
 *  title row, scrollable body. */
export default function Screen(props: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#FFFDF6', T.cream, '#F5EFE3']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      {(props.title || props.onBack) && (
        <View style={s.bar}>
          {props.onBack ? (
            <Pressable onPress={props.onBack} style={s.back} accessibilityRole="button" accessibilityLabel="Back">
              <ChevronLeft size={26} color={T.ink} strokeWidth={2.4} />
              <Text style={s.backText} allowFontScaling>Back</Text>
            </Pressable>
          ) : <View style={s.backSpacer} />}
          {props.title ? <Text style={s.title} allowFontScaling numberOfLines={1}>{props.title}</Text> : <View style={{ flex: 1 }} />}
          <View style={s.right}>{props.right}</View>
        </View>
      )}
      <ScrollView
        contentContainerStyle={[s.body, props.centered && s.centered]}
        keyboardShouldPersistTaps="handled">
        {props.children}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.cream },
  bar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
    paddingTop: 6, paddingBottom: 8, minHeight: 52,
  },
  back: { flexDirection: 'row', alignItems: 'center', minWidth: 84, minHeight: 44, paddingRight: 8 },
  backSpacer: { minWidth: 84 },
  backText: { fontSize: T.small, color: T.ink, fontFamily: F.bodyBold },
  title: { flex: 1, textAlign: 'center', fontSize: T.small, fontFamily: F.bodyBold, color: T.inkSoft },
  right: { minWidth: 84, alignItems: 'flex-end' },
  body: { paddingHorizontal: T.pad, paddingBottom: 40 },
  centered: { flexGrow: 1, justifyContent: 'center' },
});
