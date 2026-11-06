// The blind2 set as phones actually deliver it: caps, no punctuation, emoji,
// typos. Never trained on (noisy.csv is built from the training files only).
import * as b from './blind2.mjs';
let seed = 11; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const E = ['🚨', '⚠️', '📦', '💳', '👉', '❗'];
const ops = [t => t.toUpperCase(), t => t.toLowerCase().replace(/[.,!?'’]/g, ''), t => E[Math.floor(rnd() * E.length)] + ' ' + t,
  t => t.split(' ').map(w => rnd() < 0.15 && w.length > 4 ? w.slice(0, 2) + w.slice(3) : w).join(' '),
  t => t.replace(/[aeio]/g, c => rnd() < 0.2 ? ({ a: '4', e: '3', i: '1', o: '0' })[c] : c)];
const noise = t => { const o = ops[Math.floor(rnd() * ops.length)]; const o2 = ops[Math.floor(rnd() * ops.length)]; return o2(o(t)); };
export const SCAM = b.SCAM.map(noise);
export const LEGIT = b.LEGIT.map(noise);
