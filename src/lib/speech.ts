// Every spoken line in the app goes through here.
//
// On iOS the speech synthesiser obeys the ring/silent switch unless the audio
// session is in playback, so read-aloud was silent for anyone with that switch
// on — which is most of the people this app is for. prepareAudioForSpeech()
// sets that up, and is cheap enough to call before each utterance.
import * as Speech from 'expo-speech';
import { prepareAudioForSpeech } from '../../modules/scam-ai';

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onDone?: () => void;
}

export async function speak(text: string, opts: SpeakOptions = {}) {
  const { rate = 0.88, pitch = 1.0, onDone } = opts;
  Speech.stop();
  await prepareAudioForSpeech();
  Speech.speak(text, { rate, pitch, onDone, onStopped: onDone });
}

/** Backwards-compatible alias. */
export function readAloud(text: string, onDone?: () => void) {
  void speak(text, { onDone });
}

export function stopReading() { Speech.stop(); }
export function isSpeechSupported() { return true; }
