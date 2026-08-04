import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { T, F } from '../theme';

/** Labeled text input with the standard surface treatment. */
export default function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={s.wrap}>
      {label ? <Text style={s.label} allowFontScaling>{label}</Text> : null}
      <TextInput
        placeholderTextColor={T.inkFaint}
        accessibilityLabel={label || rest.placeholder}
        style={[s.input, style]}
        {...rest}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginVertical: 6 },
  label: { fontSize: T.small, fontFamily: F.bodyBold, color: T.inkSoft, marginBottom: 6 },
  input: {
    backgroundColor: T.card, borderRadius: T.radiusSm, borderWidth: 1, borderColor: T.hairline,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: T.body, fontFamily: F.body, color: T.ink,
  },
});
