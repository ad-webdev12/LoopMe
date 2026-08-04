import * as Speech from 'expo-speech';
export function readAloud(text: string) {
  Speech.stop();
  Speech.speak(text, { rate: 0.88, pitch: 1.0 });
}
export function stopReading() { Speech.stop(); }
