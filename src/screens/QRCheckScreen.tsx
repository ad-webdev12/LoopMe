// QR check with URL preview — the camera resolves a QR before a person can see
// where it goes ("quishing" is up ~587%). We decode, show the REAL destination
// in plain text, run it through the engine, and NEVER auto-open anything.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { T } from '../theme';
import Button from '../ui/Button';
import Screen from '../ui/Screen';
import type { Route } from '../App';

export default function QRCheckScreen(props: { go: (r: Route) => void; check: (m: string) => void }) {
  const [Camera, setCamera] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState('');

  const start = async () => {
    try {
      const mod = await import('expo-camera');
      const { granted } = await mod.Camera.requestCameraPermissionsAsync();
      if (!granted) { setErr('Camera permission is needed to read a QR code. You can also type the web address into the home screen box.'); return; }
      setCamera(() => mod.CameraView ?? mod.Camera); setScanning(true);
    } catch {
      setErr('QR scanning needs the expo-camera module. Run UPGRADE.command once more, or type the web address into the home screen box.');
    }
  };

  const onScan = ({ data }: { data: string }) => {
    if (!data) return;
    setScanning(false);
    props.check(`QR code destination: ${data}`); // engine + verdict screen show the real URL before anything opens
  };

  return (
    <Screen onBack={() => props.go({ name: 'home' })} title="Check a QR code">
      <Text style={s.sub} allowFontScaling>
        A QR code hides where it really goes. You’ll see the real address in plain words — nothing opens unless you choose.
      </Text>
      {scanning && Camera ? (
        <View style={s.camBox}>
          <Camera style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />
        </View>
      ) : (
        <Button label="Open the camera" onPress={start} />
      )}
      {!!err && <Text style={s.err} allowFontScaling>{err}</Text>}
    </Screen>
  );
}
const s = StyleSheet.create({
  sub: { fontSize: T.body, color: T.inkSoft, textAlign: 'center', marginVertical: 12, lineHeight: 27 },
  camBox: { height: 340, borderRadius: T.radius, overflow: 'hidden', marginVertical: 12 },
  err: { fontSize: T.small, color: T.ink, backgroundColor: T.amberSoft, borderRadius: T.radiusSm, padding: 14, lineHeight: 24, marginTop: 8 },
});
