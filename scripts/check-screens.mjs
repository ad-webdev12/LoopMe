// Every screen must be able to scroll. A <Screen> that neither passes `scroll`
// nor contains its own ScrollView/FlatList hangs the moment its content is
// taller than the phone (large text, small phones, long steps). Fails the
// test run if one slips in.
import { readdirSync, readFileSync } from 'node:fs';
const dir = new URL('../src/screens/', import.meta.url);
let bad = [];
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.tsx')) continue;
  const s = readFileSync(new URL(f, dir), 'utf8');
  const screens = [...s.matchAll(/<Screen\b[^>]*>/g)].map(m => m[0]);
  if (!screens.length) continue;
  if (/ScrollView|FlatList|SectionList/.test(s)) continue;
  for (const tag of screens) if (!/\bscroll\b/.test(tag)) bad.push(f + ': ' + tag.slice(0, 60));
}
if (bad.length) { console.error('Screens that cannot scroll:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('screens: all can scroll');
