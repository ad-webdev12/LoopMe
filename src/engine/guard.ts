// Whether the on-device models get a say at all. A bare email address, a name,
// "ok see you at 5": nothing in there for a scam to be made of, and the
// classifiers were never trained on fragments. Mirrored in CoreModel.swift.
export function modelMayJudge(message: string): boolean {
  const words = message.trim().split(/\s+/).filter(Boolean).length;
  return words >= 6 || /https?:\/\/|www\.|\$\s?\d|\d{3}[-.\s]\d{4}/i.test(message);
}
