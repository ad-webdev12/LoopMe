// Futuristic UI sounds via expo-av. Guarded: if the module or asset is missing, stay silent.
let Audio: any = null;
const cache: Record<string, any> = {};
const FILES: Record<string, any> = {
  tap: require('../assets/sfx/tap.wav'),
  scan: require('../assets/sfx/scan.wav'),
  red: require('../assets/sfx/red.wav'),
  amber: require('../assets/sfx/amber.wav'),
  green: require('../assets/sfx/green.wav'),
};
export async function play(name: keyof typeof FILES) {
  try {
    if (!Audio) Audio = (await import('expo-av')).Audio;
    if (!cache[name]) {
      const { sound } = await Audio.Sound.createAsync(FILES[name], { volume: 0.6 });
      cache[name] = sound;
    }
    await cache[name].replayAsync();
  } catch {}
}
