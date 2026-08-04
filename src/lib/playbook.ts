// The caretaker playbook: for each scam family the engine can flag, what it is,
// why it works on the person you love, and what to actually say — words that
// protect dignity. Shame is the scammer's best friend; these scripts starve it.

export interface PlaybookEntry {
  tag: string;
  title: string;
  what: string;      // what this scam is, for the caretaker
  why: string;       // why it works, psychologically
  say: string;       // a suggested script that avoids blame
}

export const PLAYBOOK: PlaybookEntry[] = [
  {
    tag: 'safe-account',
    title: 'The “safe account” move',
    what: 'A fake fraud alert arrives first; then a “fraud specialist” calls and urges moving money to a “protected account.” The transfer IS the theft.',
    why: 'It borrows the bank’s own voice and offers rescue from a crisis it invented. Acting fast feels responsible.',
    say: '“Banks never move money to keep it safe — that call was the scam itself. You did nothing wrong by answering. Let’s call the number on your card together.”',
  },
  {
    tag: 'family-emergency',
    title: 'The family emergency',
    what: '“Grandma, I’m in jail, don’t tell mom.” Voice cloning makes the caller sound exactly like a grandchild. Requests bail, hospital, or travel money — fast and secret.',
    why: 'Love plus panic. The secrecy request is engineered to cut the family safety net before it can activate.',
    say: '“That fear was real even though the call wasn’t. Anyone would want to help their grandchild. Our code word will catch this cold next time.”',
  },
  {
    tag: 'giftcard',
    title: 'Gift-card payment',
    what: 'Any demand paid in gift cards — IRS, utility, tech support, even “your boss.” Cards are read out over the phone and drained in minutes.',
    why: 'Gift cards feel official and harmless, and the person stays on the phone the whole time, isolated from advice.',
    say: '“No real company takes gift cards — that one detail gives away every scam like this. If a card was bought, the store may freeze it; let’s call now.”',
  },
  {
    tag: 'otp-request',
    title: 'The code thief',
    what: 'Someone asks them to read back a 6-digit code that was texted “to verify you.” The code approves a login or a money transfer.',
    why: 'The code genuinely arrives from the real bank, which makes the caller feel real too.',
    say: '“Those codes are keys, and the bank sent it so only YOU could use it. Never sharing it — even with ‘the bank’ — is the rule. Let’s change that password together.”',
  },
  {
    tag: 'digital-arrest',
    title: 'Digital arrest / government threat',
    what: 'Fake police, FBI, or court officials threaten arrest unless a fine is paid or the person “stays on the line.” Sometimes runs for hours.',
    why: 'Authority plus fear shuts down deliberation. Staying on the line blocks the victim from talking to anyone.',
    say: '“Real police don’t call ahead — threats by phone are always fake. You’re safe, nothing is coming. Let’s block that number.”',
  },
  {
    tag: 'romance',
    title: 'Romance / long-con opening',
    what: 'A warm stranger builds a relationship over weeks before any mention of money, investments, or emergencies.',
    why: 'Loneliness is real, and the attention is genuinely enjoyable. The investment ask comes only after trust is built.',
    say: '“The feelings were real on your side, and that’s nothing to be ashamed of. Can we look at the messages together — no judgment, I promise?”',
  },
  {
    tag: 'investment',
    title: 'Pig butchering (fake investing)',
    what: 'A friendly contact shows off crypto or forex gains and offers to teach. The “trading platform” is a fake site showing fake profits until a big deposit lands.',
    why: 'Small early “withdrawals” actually work, proving the platform is real. The big loss comes after confidence peaks.',
    say: '“These sites fake the numbers — the money never was invested. Stopping now protects what’s left. You spotted it, and that took courage.”',
  },
  {
    tag: 'package-fee',
    title: 'Package / toll fee',
    what: 'A tiny fee ($1–3) to release a package or pay a toll. The real target is the card number typed into the fake site.',
    why: 'Everyone has a package coming. The amount is too small to feel risky.',
    say: '“The fee was bait for the card number. Let’s call the card company for a replacement — it’s a five-minute call and it fully fixes this.”',
  },
  {
    tag: 'recovery',
    title: 'The recovery re-scam',
    what: '“We can get your money back — small retainer up front.” Targets people already scammed, often from “law firms” or “refund departments.”',
    why: 'Hope. Scam victims are put on lists and re-targeted precisely because they want to undo the loss.',
    say: '“Anyone who calls YOU about recovering money is the second wave. Only the bank and law enforcement can claw funds back — let’s work with them.”',
  },
  {
    tag: 'remote-access',
    title: 'Remote access / tech support',
    what: 'A popup or caller claims the computer is infected and installs AnyDesk/TeamViewer to “fix” it — then reads the screen, including bank logins.',
    why: 'Computers really do feel mysterious and fragile. The caller sounds patient and technical.',
    say: '“If that app is still installed, let’s remove it right now, then change the email password from a different device. Fifteen minutes and the door is closed.”',
  },
  {
    tag: 'sextortion',
    title: 'Sextortion bluff',
    what: 'A message claims to have embarrassing webcam footage and demands crypto. There is no video — it’s sent to millions.',
    why: 'Shame prevents the victim from telling anyone — which is the entire mechanism.',
    say: '“There is no video; this exact message goes to millions of people. Deleting it costs nothing. Telling me was the strongest thing you could do.”',
  },
  {
    tag: 'crypto',
    title: 'Crypto payment demand',
    what: 'Any pressure to pay via Bitcoin ATM, USDT, or an exchange. Crypto transfers cannot be reversed by anyone.',
    why: 'The machinery is unfamiliar, so the victim follows the scammer’s step-by-step guidance — the guidance IS the scam.',
    say: '“Nobody legitimate is paid at a Bitcoin ATM. If cash hasn’t gone in yet, we’re fine. If it has, we file with IC3 today — some of it may freeze.”',
  },
];

export function entriesFor(tags: string[]): PlaybookEntry[] {
  const hit = PLAYBOOK.filter(p => tags.includes(p.tag));
  return hit;
}
