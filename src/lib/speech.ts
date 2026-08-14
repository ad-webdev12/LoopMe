import * as Speech from 'expo-speech';
export function readAloud(text: string, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, { rate: 0.88, pitch: 1.0, onDone, onStopped: onDone });
}
export function stopReading() { Speech.stop(); }
export function isSpeechSupported() { return true; }
