import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { T, F } from '../theme';

/** Screen scaffold — flat warm ground, a quiet inline header (back + title),
 *  scrollable body. No chrome, no gradients: Design 4 keeps surfaces calm. */
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
      {hasBar && (
        <View style={s.bar}>
          {props.onBack ? (
            <Pressable onPress={props.onBack} style={s.back} accessibilityRole="button" accessibilityLabel="Back">
              <ChevronLeft size={22} color={T.ink} strokeWidth={2.2} />
              <Text style={s.backText} allowFontScaling>Back</Text>
            </Pressable>
          ) : <View style={s.backSpacer} />}
          {props.title ? <Text style={s.title} allowFontScaling numberOfLines={1}>{props.title}</Text> : <View style={{ flex: 1 }} />}
          <View style={s.right}>{props.right}</View>
        </View>
      )}
      <ScrollView
        contentContainerStyle={[s.body, props.centered && s.centered]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {props.children}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ground },
  bar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    paddingTop: 4, paddingBottom: 6, minHeight: 48,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 3, minWidth: 78, minHeight: 44, paddingRight: 8 },
  backSpacer: { minWidth: 78 },
  backText: { fontSize: T.label, color: T.ink, fontFamily: F.medium },
  title: { flex: 1, textAlign: 'center', fontSize: T.label, fontFamily: F.semibold, color: T.ink },
  right: { minWidth: 78, alignItems: 'flex-end' },
  body: { paddingHorizontal: T.pad, paddingBottom: 40 },
  centered: { flexGrow: 1, justifyContent: 'center' },
});
