// Is this phone really protected? Read from the iPhone itself, never from the
// app's own switches: the text filter counts as on once it has checked a text
// (the shared tallies the filter extension writes), and the call blocker
// counts as on when iOS reports the call directory enabled. Same signals the
// setup walkthrough uses. Re-read whenever the app comes back to the front,
// so coming back from iPhone Settings updates the card.
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { callDirectoryStatus } from '../../modules/scam-ai';

/** The toast after blocking a number, honest about what is actually on. */
export function blockedMessage(callsOn: boolean, textsOn: boolean): string {
  if (callsOn && textsOn) return 'Blocked. Calls from that number are stopped, and its texts go to Junk.';
  if (callsOn) return 'Blocked. Calls from that number are stopped.';
  return 'Saved as blocked. Turn on protection so calls from it are stopped.';
}

export interface Protection { textsOn: boolean; callsOn: boolean; done: boolean; left: number; known: boolean }

export function useProtection(tallies: { filtered: number }): Protection {
  const [calls, setCalls] = useState<'enabled' | 'disabled' | 'unknown' | null>(null);
  useEffect(() => {
    const read = () => { callDirectoryStatus().then(setCalls).catch(() => setCalls('unknown')); };
    read();
    const sub = AppState.addEventListener('change', st => { if (st === 'active') read(); });
    return () => sub.remove();
  }, []);
  const textsOn = tallies.filtered > 0;
  const callsOn = calls === 'enabled';
  const left = (textsOn ? 0 : 1) + (callsOn ? 0 : 1);
  return { textsOn, callsOn, done: left === 0, left, known: calls !== null };
}
