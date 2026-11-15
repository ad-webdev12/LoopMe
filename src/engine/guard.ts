// Whether the on-device models get a say at all. A bare email address, a name,
// "ok see you at 5": nothing in there for a scam to be made of, and the
// classifiers were never trained on fragments. Mirrored in CoreModel.swift.
export function modelMayJudge(message: string): boolean {
  // ScamNet only knows Latin script. On Tamil, Hindi, Bengali or Chinese text
  // it answered "scam" 92% of the time whatever the message said (measured on
  // 859 such texts, 15 Nov 2026). It abstains unless most letters are ASCII.
  let letters = 0, ascii = 0;
  for (const ch of message) {
    if (!/\p{L}/u.test(ch)) continue;
    letters++; if (ch.charCodeAt(0) < 128) ascii++;
  }
  if (letters > 0 && ascii / letters < 0.6) return false;
  const words = message.trim().split(/\s+/).filter(Boolean).length;
  return words >= 6 || /https?:\/\/|www\.|\$\s?\d|\d{3}[-.\s]\d{4}/i.test(message);
}
