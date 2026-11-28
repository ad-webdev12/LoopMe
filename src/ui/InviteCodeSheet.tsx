// The second way to link: a code to type and a QR code to scan. Shown on the
// protected phone. The QR holds the iCloud link, so a phone that already has
// Loop Me joins straight from the Camera. The code is for a phone that has to
// install Loop Me first: iOS loses the link across an App Store install.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { T, font } from '../theme';
import type { Palette } from '../theme';
import { Pill } from './base';
import { inviteLink } from '../lib/invite';
import { qrPng, formatCode, cloudSync } from '../../modules/scam-ai';
import type { Settings } from '../lib/storage';

/**
 * `joining` goes true the moment someone uses the code (the yes/no question
 * is waiting): the sheet closes itself so that question is what the person sees.
 */
export function InviteCodeSheet({ C, settings, visible, onClose, onReady, joining }: { C: Palette; settings: Settings; visible: boolean; onClose: () => void; onReady?: () => void; joining?: boolean }) {
  useEffect(() => { if (visible && joining) onClose(); }, [visible, joining]); // eslint-disable-line react-hooks/exhaustive-deps
  // While the code is on screen, look for someone joining every few seconds.
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => { void cloudSync(); }, 5000);
    return () => clearInterval(t);
  }, [visible]);
  const linked = settings.familyLinked ? settings.linkedNames : [];
  const [state, setState] = useState<{ code?: string; qr?: string | null; error?: string } | null>(null);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setState(null);
    inviteLink(settings).then(r => {
      if (!alive) return;
      if (!r.ok) { setState({ error: r.error }); return; }
      setState({ code: r.code, qr: qrPng(r.url) });
      onReady?.();
    });
    return () => { alive = false; };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = state?.code ? formatCode(state.code) : '';
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.ground, paddingHorizontal: 20, paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[font(20, '700'), { color: C.ink, flex: 1 }]} allowFontScaling>Link with a code</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={[st.close, { backgroundColor: C.card }]}><X size={20} color={C.ink} strokeWidth={2.2} /></Pressable>
        </View>
        {!state ? (
          <View style={{ alignItems: 'center', marginTop: 80 }}><ActivityIndicator color={T.green} /><Text style={[font(15, '400'), { color: C.ink2, marginTop: 12 }]} allowFontScaling>Making the code</Text></View>
        ) : state.error ? (
          <Text style={[font(16, '400', 1.45), { color: C.redText, marginTop: 24 }]} allowFontScaling>{state.error}</Text>
        ) : (
          <>
            {linked.length > 0 && (
              <Text style={[font(15, '500', 1.4), { color: T.greenDeep, marginTop: 14 }]} allowFontScaling>Already linked: {linked.map(n => n.split(' ')[0]).join(', ')}. This code adds one more person.</Text>
            )}
            <Text style={[font(16, '400', 1.45), { color: C.ink2, marginTop: 14 }]} allowFontScaling>On the other phone, open Loop Me, go to Family, tap “Look after someone’s phone” and type this code. New to Loop Me? Choose “The phone that hears about it” during setup.</Text>
            {shown ? (
              <View style={[st.codeBox, { backgroundColor: C.card }]}>
                <Text style={[font(44, '700'), { color: C.ink, letterSpacing: 4 }]} allowFontScaling={false} selectable accessibilityLabel={'Code ' + shown.split('').join(' ')}>{shown}</Text>
                <Text style={[font(14, '400'), { color: C.ink2, marginTop: 6 }]} allowFontScaling>Works once, for 1 hour. You’ll be asked before anyone is linked.</Text>
              </View>
            ) : (
              <Text style={[font(15, '400', 1.45), { color: C.ink2, marginTop: 18 }]} allowFontScaling>The code could not be made right now. The QR code below still works.</Text>
            )}
            {!!state.qr && (
              <>
                <Text style={[font(16, '400', 1.45), { color: C.ink2, marginTop: 22 }]} allowFontScaling>Already have Loop Me on that phone? Point its Camera at this and tap the link.</Text>
                <Image source={{ uri: 'data:image/png;base64,' + state.qr }} style={{ width: 220, height: 220, alignSelf: 'center', marginTop: 12, borderRadius: 12 }} accessibilityLabel="QR code for the invite" />
              </>
            )}
            {!!shown && <View style={{ marginTop: 'auto', marginBottom: 34 }}><Pill label="Send the code" onPress={() => { Share.share({ message: 'My Loop Me code: ' + shown + '. In Loop Me, go to Family, tap “Look after someone’s phone” and type it in. New to Loop Me? Choose “The phone that hears about it” during setup.' }).catch(() => {}); }} /></View>}
          </>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  codeBox: { marginTop: 18, borderRadius: 20, paddingVertical: 22, alignItems: 'center' },
});
