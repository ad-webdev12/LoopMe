// OCR (reading a screenshot/photo) needs a native module that Expo Go can't load.
// So in the Expo Go build we do NOT import ML Kit — Metro would fail to bundle it.
// The Home screen shows a plain, honest note instead of a dead button.
// The native build (npx expo prebuild) re-adds @react-native-ml-kit/text-recognition
// and this file switches to real on-device OCR.
export const OCR_AVAILABLE = false;

export async function pickAndReadImage(_fromCamera: boolean): Promise<string | null> {
  return null;
}
