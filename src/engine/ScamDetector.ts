// ScamDetector v3 — deterministic, on-device, offline, <50ms.
// THE COMPETITIVE MOAT IS NOT THE MODEL. It is speed + commitment + a human on the other end.
// (Norton: 29.8s + restart per check. Scamio: never commits. McAfee: no screenshots. We: instant, committed, looped-in.)
//
// v3 over v2: unicode de-obfuscation (homoglyphs, zero-width), full link forensics
// (blocklist, levenshtein look-alikes, brand-subdomain disguises), 9 new scam
// families (advance-fee, overpayment, sextortion, charity, callback, QR-bait,
// crypto-wallet, tech-support, pet/rental deposit), and safety-disclaimer
// negative signals so real bank warnings stop looking like threats.

import { normalizeText } from './normalize';
import { analyzeLinks } from './linkForensics';

export type Level = 'red' | 'amber' | 'green';
export type Confidence = 'very' | 'fairly' | 'unsure';

export interface Verdict {
  level: Level;
  reason: string;          // one plain sentence, committed — never hedged
  safeStep: string;        // exactly one action
  signals: string[];       // plain-language reasons for "Show me why"
  matches: string[];       // exact phrases from the message, for highlighting
  tags: string[];          // machine tags (also feeds two-stage detection)
  confidence: Confidence;
  codeWordMoment: boolean; // surface the family code word banner
  score: number;
  disguised: boolean;      // message used hidden/look-alike characters to dodge filters
}

export interface DetectorOptions {
  allowlist?: string[];
  sender?: string;
  recentTags?: string[];   // tags from the previous check — enables two-stage detection
  postPanic?: boolean;     // person completed the Panic flow in the last 90 days
}

interface Rule { re: RegExp; w: number; tag: string; plain: string; }

const RULES: Rule[] = [
  // — SECRECY: the single highest-weight signal. Every real institution is fine with you calling your daughter.
  { re: /(?:don'?t|do not|advise you not to|asked (?:that|me) .{0,20}not (?:to|be)|rather you did ?n'?t|without) (?:tell|telling|contact|contacting|call|calling|inform|informing|discuss|discussing|say|saying|mention|mentioning|alarm|alarming)[^.]{0,40}(?:anyone|anybody|your (?:family|wife|husband|son|daughter|kids|children|lawyer|attorney|bank|parents)|mom|mum|dad|his (?:parents|mother|father)|her (?:parents|mother|father)|the police|the (?:bank|staff|branch|cashier)|them)/i, w: 55, tag: 'secrecy', plain: 'It asks you to keep it secret. Honest people never need secrecy.' },
  { re: /keep (?:this|it) (?:a )?(?:secret|between us|confidential|private|quiet)/i, w: 55, tag: 'secrecy', plain: 'It asks you to keep it secret. Honest people never need secrecy.' },
  // — Digital arrest / government threats
  { re: /(?:arrest warrant|warrant (?:for|has been issued)|court order|legal action|federal (?:agent|officer|case)|you (?:will|may) be arrested|under investigation)/i, w: 45, tag: 'digital-arrest', plain: 'It threatens arrest or legal action. Real police and courts never call, text, or video-chat threats — ever.' },
  { re: /\b(?:irs|social security(?: administration)?|ssa|medicare|dea|fbi|homeland security)\b[\s\S]{0,90}(?:suspend|arrest|owe|fine|immediately|final|blocked|frozen)/i, w: 45, tag: 'gov-impersonation', plain: 'It pretends to be the government and threatens you. The government does not text threats.' },
  // — Bank impersonation (stage 1 of the two-stage con)
  { re: /(?:did you (?:authorize|approve|make)|unauthorized|suspicious) (?:a |an |this )?(?:\$[\d,.]+ )?(?:charge|payment|transaction|transfer|purchase|zelle)/i, w: 30, tag: 'bank-alert', plain: 'It looks like a bank fraud alert. Scammers send fake ones, then call pretending to be the fraud department.' },
  { re: /reply (?:no|yes|stop|1|y|n) (?:to|if)/i, w: 12, tag: 'bank-alert', plain: 'It asks you to reply — that tells the scammer a real person is here.' },
  // — Stage 2: the "safe account" move. Firing this is the app's highest duty.
  { re: /(?:move|transfer) (?:your |the )?(?:money|funds|balance)[\s\S]{0,50}(?:safe|secure|protected|new) account/i, w: 90, tag: 'safe-account', plain: 'They want you to move money to a “safe account.” There is no such thing. Your bank will NEVER ask this. This is the trick itself.' },
  { re: /fraud (?:department|team|agent|specialist)[\s\S]{0,80}(?:verify|secure|move|transfer|protect)/i, w: 45, tag: 'safe-account', plain: 'A “fraud department” asking you to act is the second half of a two-part con.' },
  // — Family emergency / voice-clone territory
  { re: /(?:grandm[ao]|grandpa|grandson|granddaughter|your (?:son|daughter|child|grandchild|nephew|niece))[\s\S]{0,100}(?:trouble|jail|arrest|accident|incident|bail|hospital|hurt|injured|money|help|solicitor|lawyer|represent)|(?:trouble|jail|arrest|accident|incident|bail|hospital|hurt|injured)[^.]{0,60}(?:involving |with |to )?(?:your |his |her )?(?:son|daughter|child|grandchild|grandson|granddaughter|nephew|niece)\b/i, w: 50, tag: 'family-emergency', plain: 'It pretends a family member is in trouble and needs money fast.' },
  { re: /(?:it'?s me|this is your grandson|this is your granddaughter)[\s\S]{0,80}(?:jail|accident|bail|trouble|hospital|money)/i, w: 50, tag: 'family-emergency', plain: 'A voice or message claiming to be family in an emergency. A cloned voice can sound exactly like them — your code word cannot be cloned.' },
  // — Gift cards, crypto, payments
  { re: /gift\s*card|itunes\s*card|google\s*play\s*card|steam\s*card|vanilla\s*card/i, w: 50, tag: 'giftcard', plain: 'It asks about gift cards. Real companies and the government never ask for gift cards.' },
  { re: /bitcoin|crypto(?:currency)?|\bbtc\b|\busdt\b|coinbase|binance|crypto ?atm/i, w: 15, tag: 'crypto', plain: 'It involves cryptocurrency, which scammers use because payments cannot be undone.' },
  { re: /(?:western union|moneygram)|wire (?:transfer|\$?\d)/i, w: 35, tag: 'payment', plain: 'It asks for a wire transfer, which can’t be reversed once sent.' },
  { re: /(?:zelle|cash ?app|venmo|apple ?pay)[\s\S]{0,60}(?:send|pay|transfer|owe)|(?:send|pay|transfer)[\s\S]{0,50}(?:by |via |through )?(?:zelle|cash ?app|venmo)/i, w: 28, tag: 'payment', plain: 'It asks you to send money by wire or app, which cannot be reversed.' },
  { re: /(?:this is your (?:son|daughter|grandson|granddaughter|mom|dad))[\s\S]{0,90}(?:money|send|broke|broken|new number)|(?:phone(?:'?s)? (?:is |got |has )?(?:broke|broken|smashed|died|playing up|in for repair)|lost my phone|new (?:phone )?number|different (?:phone|number)|using this one)[\s\S]{0,90}(?:send|money|zelle|venmo|cash|pay|bill|transfer|help)/i, w: 45, tag: 'family-emergency', plain: 'A “family member” with a broken phone asking for money is a classic con. Call their real number — the one you already have.' },
  // The bare "Hi Mum" opener: no name, a new number, and a reason the old one
  // is gone. A real child texting this will not mind you ringing to check.
  { re: /\b(?:hi|hello|hey)[, ]+(?:mum|mom|mummy|mommy|dad|daddy|grandma|grandpa|nan|nana|papa)\b[\s\S]{0,140}(?:new (?:phone )?number|different number|phone (?:is |got |has )?(?:broke|broken|smashed|died)|lost my phone|this is my new)/i, w: 30, tag: 'family-emergency', plain: 'Someone messaging as family from a number you do not know. This is the commonest scam of all — ring the number you already have for them before doing anything.' },
  // — Account/verify pressure
  { re: /account (?:has been |is |was |will be )?(?:locked|suspended|closed|compromised|on hold|restricted|deactivat|frozen)/i, w: 30, tag: 'account-locked', plain: 'It claims your account is locked or suspended to scare you into clicking.' },
  { re: /(?:verify|confirm|update|validate) your (?:account|identity|information|payment|card|billing|details)/i, w: 26, tag: 'verify', plain: 'It pushes you to \u201cverify\u201d information through a link.' },
  { re: /(?:unusual|suspicious) (?:sign[- ]?in|login|activity|attempt)/i, w: 25, tag: 'unusual-signin', plain: 'It claims suspicious sign-in activity to make you panic and click.' },
  // — OTP theft
  { re: /(?:send|share|read|give|tell|forward|confirm|enter|provide|re-?enter)(?: me| us)? (?:the |that |your )?(?:one[- ]?time |verification |security |6[- ]digit |four[- ]digit )?(?:code|otp|passcode|pin|password|log ?in details|sign[- ]?in details)\b/i, w: 55, tag: 'otp-request', plain: 'It asks for a security code. Never share codes. That is how accounts get stolen.' },
  // — Crypto wallet / seed phrase theft
  { re: /(?:seed phrase|recovery phrase|secret phrase|private key|wallet (?:key|password))/i, w: 50, tag: 'wallet-phrase', plain: 'It mentions your wallet’s secret phrase. Anyone who asks for it is stealing — no support team ever needs it.' },
  // — Delivery / toll / subscription workhorses
  { re: /(?:re-?deliver|redelivery|package|parcel|shipment)[\s\S]{0,70}(?:fee|charge|surcharge|held|pending|customs|unable|address (?:issue|problem|incomplete))/i, w: 35, tag: 'package-fee', plain: 'It says a package needs a fee or a new address, a very common trick.' },
  { re: /(?:toll|e-?z ?pass|fastrak|sunpass)[\s\S]{0,70}(?:unpaid|due|fee|balance|violation|invoice)/i, w: 40, tag: 'toll', plain: 'Fake unpaid-toll texts are everywhere right now. Toll agencies send bills by mail, not text.' },
  { re: /(?:netflix|apple|amazon prime|hulu|spotify|disney)[\s\S]{0,70}(?:payment (?:failed|declined|problem)|suspend|expired|renew|update your payment)/i, w: 32, tag: 'subscription', plain: 'It claims a streaming payment failed. Check inside the app itself, never through a link in a message.' },
  // — Prizes, refunds, jobs
  { re: /(?:you(?:'ve| have)? (?:won|been selected)|winner|prize|lottery|sweepstake|claim your (?:reward|prize)|congratulations[\s\S]{0,40}(?:won|selected))/i, w: 42, tag: 'prize', plain: 'It says you won a prize you never entered for.' },
  { re: /(?:tax refund|stimulus|rebate|reimbursement)[\s\S]{0,60}(?:claim|click|pending|verify)/i, w: 32, tag: 'refund', plain: 'It dangles a refund you must “claim” through a link. The IRS mails checks; it doesn’t text links.' },
  { re: /(?:work from home|easy money|earn \$\d+|make \$\d+ (?:a |per )?(?:day|week)|part[- ]time job[\s\S]{0,50}(?:no experience|apply now|telegram|whatsapp))/i, w: 34, tag: 'job-scam', plain: 'Too-easy job offers are usually after your identity, your face and voice, or an upfront fee.' },
  // — Advance-fee / inheritance
  { re: /(?:inheritance|unclaimed (?:funds|estate)|beneficiary|next of kin|barrister|late client|(?:i am|i'?m) a (?:widow|widower|orphan)|late (?:husband|wife|father)|dying of|terminally ill)[\s\S]{0,90}(?:fee|claim|transfer|million|\$)/i, w: 45, tag: 'advance-fee', plain: 'A stranger promising a fortune once you pay a small fee first — the oldest con on the internet.' },
  // — Overpayment / fake check
  { re: /(?:overpaid|paid (?:you )?too much|sent (?:you )?too much)[\s\S]{0,80}(?:send|return|refund|difference)|deposit (?:the|this) check[\s\S]{0,60}(?:send|wire|return)/i, w: 48, tag: 'overpayment', plain: 'It “overpays” you and asks you to send the difference back. The check will bounce after your real money is gone.' },
  // — Sextortion
  { re: /(?:i (?:have|recorded|made) (?:a )?(?:video|videos|photos|footage) of you|your (?:webcam|camera) was (?:hacked|accessed)|intimate (?:video|photo))/i, w: 55, tag: 'sextortion', plain: 'It claims to have embarrassing video of you and demands payment. It’s a mass-sent bluff — do not pay, do not reply.' },
  // — Charity pressure
  { re: /(?:donate|donation|disaster relief|hurricane|earthquake)[\s\S]{0,70}(?:gift card|wire|bitcoin|crypto|zelle|cash ?app|western union|moneygram)/i, w: 42, tag: 'charity', plain: 'Real charities never take gift cards, wire transfers, or crypto. This uses generosity as the hook.' },
  // — Tech support
  { re: /(?:your (?:computer|pc|iphone|phone|device) (?:has been|is|was) (?:infected|hacked|compromised)|virus(?:es)? (?:was |were |has been )?(?:detected|found|sent))/i, w: 40, tag: 'tech-support', plain: 'It claims your device is infected to scare you into calling or installing something. Real companies don’t monitor your computer.' },
  // — Callback bait
  { re: /call (?:us|now|back|this number|immediately|\+?1?[-.\s(]*\d{3})[\s\S]{0,60}(?:suspend|arrest|frozen|blocked|final|expire|avoid|cancel)|(?:suspend|arrest|frozen|blocked|final notice|expire)[\s\S]{0,60}call (?:us|now|back|this number|immediately|\+?1?[-.\s(]*\d{3})/i, w: 30, tag: 'callback', plain: 'It pressures you to call a number from the message itself. Never call a number a message gives you — find the real one yourself.' },
  { re: /if (?:this|that) was(?:n'?t| not) you[\s\S]{0,60}(?:call|phone|contact us|dial)[\s\S]{0,30}(?:\+?1?[-.\s(]*\d{3}|us|now|immediately|this number)/i, w: 35, tag: 'callback', plain: 'It tells you to ring a number printed in the message itself. A real company points you to the app or the number on your card — never one they supply.' },
  // Keeping someone on the line is how a phone con is run: it stops them
  // ringing their bank, or their daughter, to check.
  { re: /(?:do not|don'?t|please don'?t)\s+(?:hang up|put the phone down|end the call)|stay on the line/i, w: 45, tag: 'stay-on-line', plain: 'It tells you not to hang up. That is to stop you ringing anyone to check. Hang up — you can always call back on a number you trust.' },
  // Manufactured debt with a vague threat and no detail of what is owed.
  { re: /(?:outstanding|unpaid|overdue|monies|money|sums?)\s+(?:balance|amount|invoice|debt|sum|owed|owing)[\s\S]{0,90}(?:further action|legal|court|recovery|enforcement|bailiff|today|immediately|failure to|contact us)|failure to (?:respond|pay|act)[\s\S]{0,60}(?:further action|legal|court|enforcement|consequences)|(?:debt recovery|enforcement) (?:team|agent|department)|(?:must be |to be )?(?:repaid|paid back|settled)[^.]{0,50}(?:this week|today|immediately|or it will)|passed to (?:enforcement|bailiffs|debt recovery|our legal)/i, w: 38, tag: 'fake-debt', plain: 'It claims you owe money and hints at trouble if you ignore it, without ever saying what for. Real creditors tell you exactly what the debt is.' },
  // "I'm on someone else's phone" — the same con as the broken-phone opener.
  { re: /(?:on|using|borrowing)\s+(?:a|my)?\s*(?:mate'?s|friend'?s|colleague'?s|someone else'?s|a different)\s+phone|dropped my phone[\s\S]{0,40}(?:toilet|water|down|broke)/i, w: 30, tag: 'family-emergency', plain: 'Someone messaging from a phone that is not theirs. If they say they are family, ring the number you already have for them.' },
  // Extended-warranty and similar cold-call bait.
  { re: /(?:warranty|cover(?:age)?|policy|protection plan)[^.]{0,50}(?:expir|laps|about to end|running out)[^.]{0,60}(?:press \d|call|renew|transfer)|press (?:\d|one|two) (?:now |immediately )?to (?:speak|be (?:connected|transferred))/i, w: 32, tag: 'warranty', plain: 'A warranty or cover expiring, with a number to press — a cold-call script, not a company you have dealt with.' },
  { re: /(?:delivery attempted|attempted delivery|reschedul\w+ required|item (?:held|detained|retained))[^.]{0,80}(?:fee|charge|amount|payment|duty|outstanding|settle)|(?:handling|storage|release|import|customs) (?:fee|charge|amount|duty)[^.]{0,40}(?:outstanding|due|required|settle|before)/i, w: 38, tag: 'package-fee', plain: 'It says something is waiting on a small payment. Carriers do not collect fees by text — check the sender directly on their own website.' },
  // Harvesting the answers to the questions a bank asks to identify you.
  { re: /(?:confirm|provide|verify|read me|give me|need|last)[^.]{0,50}(?:date of birth|national insurance|sort code|account number|card number|three digits|(?:last )?four digits|long number on your card|security number|mother'?s maiden|bank details|banking details)/i, w: 45, tag: 'detail-harvest', plain: 'It asks for the details a bank uses to prove who you are. A real caller already has them and will never ask you to read them out.' },
  // "Don't hang up", in the other languages the detector already covers.
  { re: /no cuelgue|nao desligue|ne raccrochez pas|permanezca en la l[i\u00ed]nea/i, w: 45, tag: 'stay-on-line', plain: 'It tells you not to hang up. That is to stop you ringing anyone to check. Hang up — you can always call back on a number you trust.' },
  // Borrow-and-repay: an unsolicited request for money, softened by a promise to
  // return it. A real friend asking is harmless and the advice still fits — ring
  // them on the number you already have — so this sits at amber weight.
  { re: /(?:i'?m|i am|bit) (?:a bit )?(?:short|stuck|strapped)(?: (?:this|for) \w+)?|tide me over|(?:until|till) (?:friday|payday|monday|next week)|(?:could|can) you (?:lend|spot)\b|send (?:me )?something/i, w: 25, tag: 'borrow-ask', plain: 'It asks you for money.' },
  { re: /(?:i'?(?:ll|d)|will) (?:pay|drop|give|get) (?:you|it) (?:back|straight back)|(?:pay you back|give it (?:back|you back))/i, w: 22, tag: 'borrow-repay', plain: 'It promises to pay you back. Anyone asking for money out of the blue is worth a phone call first — ring them on the number you already have, not this one.' },
  { re: /press (?:\d|one|two|#) (?:now |immediately )?to (?:lock|secure|protect|verify|report|cancel|stop)/i, w: 35, tag: 'callback', plain: 'An automated voice telling you to press a button puts you straight through to the person running the scam. Hang up and ring the company yourself.' },
  // Dormant/closure pressure that funnels you to a supplied link.
  { re: /(?:dormant|inactiv\w+|unused)[^.]{0,60}(?:account|savings)[^.]{0,80}(?:link|sign in|log ?in|portal|verify)|(?:account|savings)[^.]{0,40}(?:will be |permanent )?clos\w+[^.]{0,60}(?:link provided|sign in via|log ?in via|portal|unless you)/i, w: 38, tag: 'account-locked', plain: 'It threatens to close your account unless you use a link it supplies. Open the app or type the address yourself instead.' },
  // Courier overpayment: the extra is added, then passed to the "agent".
  { re: /(?:add|include|send)[^.]{0,40}(?:his|her|their|the (?:courier|agent|shipper)'?s?) (?:fee|charge|cost)|(?:pass|forward|send) (?:that|the extra|the difference|it) (?:part )?(?:on )?to (?:him|her|them|the (?:courier|agent|shipper))|(?:my|the) (?:shipping |collection )?(?:agent|courier) will collect/i, w: 45, tag: 'overpayment', plain: 'A buyer who overpays and asks you to forward the extra to their “courier” is running a fake-payment con. The original payment will be reversed.' },
  // Someone messaging from an unfamiliar phone, before any money is mentioned.
  { re: /(?:it'?s me|hi(?:ya)?[, ]+it'?s me)[^.]{0,60}(?:different|new|another|not my|someone else'?s|borrowed) phone|(?:different|new|another) phone[^.]{0,40}(?:mine|my (?:one|phone))[^.]{0,30}(?:in for repair|broken|broke|being fixed|playing up)/i, w: 30, tag: 'family-emergency', plain: 'Someone saying it is them, from a phone you do not recognise. Ring the number you already have for them before doing anything else.' },
  { re: /(?:without|forgot|left)[^.]{0,20}my (?:purse|wallet|card|bank card)|(?:any chance|is there any way) (?:you )?could (?:you )?help/i, w: 25, tag: 'borrow-ask', plain: 'It works round to asking you for money.' },
  // — German. The detector already covers Spanish, French and Portuguese; a
  //   German-speaking user was getting no multilingual cover at all.
  { re: /(?:ihr|dein) konto (?:wird|ist|wurde)[^.]{0,30}(?:gesperrt|geschlossen|eingeschr[a\u00e4]nkt)|best[a\u00e4]tigen sie[^.]{0,40}(?:ihre daten|ihr konto|sofort)|klicken sie hier/i, w: 40, tag: 'bank-alert', plain: 'It claims an account will be blocked unless you act — the classic pressure move, written in German.' },
  { re: /(?:paket|sendung) (?:wird |ist )?(?:zur[u\u00fc]ckgehalten|einbehalten|wartet)[^.]{0,70}(?:geb[u\u00fc]hr|zoll|zahlung)|(?:geben|teilen) sie[^.]{0,40}(?:code|pin|passwort)/i, w: 42, tag: 'delivery-fee', plain: 'A held parcel with a fee, or a request for a security code (written in German).' },
  // Upfront fee to release money you are owed — loan, compensation, refund,
  // prize. Money never has to be paid to receive money.
  { re: /(?:release|process|transfer|receive|claim)[^.]{0,50}(?:the )?funds?[^.]{0,40}(?:fee|charge|payment|deposit|retainer)|(?:arrangement|processing|administration|release|handling|legal|transfer) fee[^.]{0,50}(?:up ?front|in advance|first|before|required|payable)|(?:small|nominal|one[- ]off) (?:fee|charge|payment)[^.]{0,50}(?:release|process|claim|receive|unlock)/i, w: 48, tag: 'advance-fee', plain: 'It wants a fee before money can reach you. Nobody who genuinely owes you money needs paying first — this is the oldest con there is.' },
  // Data or account deleted / closed unless you act through a supplied link.
  { re: /(?:storage|mailbox|account|photos?|files?|data)[^.]{0,60}(?:full|expired?|will be deleted|deleted in|removed in)[^.]{0,60}(?:unless|upgrade|renew|verify|secure form|link)|(?:re-?register|re-?enter|re-?confirm|update)[^.]{0,40}(?:your )?(?:card|payment|bank|billing) details[^.]{0,50}(?:link|below|form|portal|keep your account)/i, w: 40, tag: 'verify', plain: 'It threatens to delete or close something unless you enter card or account details through its link. Go to the app or website yourself instead.' },
  // Cold-call claims/compensation bait.
  { re: /(?:accident|injury) (?:you had|that was ?n'?t your fault|claim)|(?:mis-?sold|missold)[^.]{0,40}(?:insurance|policy|pension|ppi)|compensation (?:owed|due|you are entitled)/i, w: 32, tag: 'claims-bait', plain: 'A cold call about an accident, a mis-sold policy, or compensation you never asked about is a script. Real claims do not start with someone ringing you.' },
  // Reserve-a-deposit pressure.
  { re: /(?:reserved|holding|held) (?:for you|it|the item)[^.]{0,60}(?:deposit|payment)[^.]{0,50}(?:today|now|otherwise|before)|deposit[^.]{0,30}(?:today|now)[^.]{0,40}(?:hold|reserve|secure)(?: it| the item)?/i, w: 35, tag: 'pet-deposit', plain: 'It presses you to pay a deposit today or lose the item. That urgency is the con — a real seller can wait a day.' },
  // Licence/subscription expiry funnelling you to a phone number.
  { re: /(?:licence|license|subscription|activation) (?:key |code )?(?:has )?expired[^.]{0,60}(?:ring|call|phone|contact)[^.]{0,40}(?:number|us|this)|(?:technician|engineer|advisor) will[^.]{0,40}(?:renew|fix|sort)[^.]{0,20}(?:remotely|for you)/i, w: 40, tag: 'tech-support', plain: 'It says something expired and gives you a number to ring. That number reaches the scammer, not the company.' },
  // Card-not-recognised bait with a supplied number.
  { re: /(?:payment|transaction|charge) of [^.]{0,30}(?:pending|attempted|to a foreign|overseas)[^.]{0,60}(?:call|ring|contact)[^.]{0,40}(?:number below|us on|this number)|if you did ?n'?t (?:make|authorise|authorize) this[^.]{0,40}(?:call|ring|contact)/i, w: 42, tag: 'callback', plain: 'A scary payment plus a number to ring is the standard opening. Use the number on your own card instead — never one from the message.' },
  // Doorstep and cold-trade pressure: someone conveniently nearby, a discount
  // that dies tonight, and cash preferred.
  { re: /(?:(?:we(?:'?re| are|'?ve been| were)|our (?:surveyor|operative|engineer|team|man))[^.]{0,60}(?:in (?:your|the) area|nearby|just (?:round|down) the road|next door)|(?:did|doing|working on)[^.]{0,30}next door)[^.]{0,80}(?:notice\w*|spotted|saw)[^.]{0,40}(?:yours|your (?:roof|drains|tiles|gutters|driveway|chimney))|(?:sort|do|fix|excavate|start) (?:it |them )?(?:now|today)[^.]{0,30}(?:for )?cash|cash price|(?:discount|offer|price)[^.]{0,40}(?:ends|expires) (?:tonight|today)/i, w: 38, tag: 'doorstep', plain: 'Someone who happens to be in your area, with a price that expires today. Never agree on the doorstep or over the phone — get a second quote from a firm you found yourself.' },
  // A deposit to "hold" or "secure" something you have not seen.
  { re: /(?:holding|security|reservation) deposit|(?:transfer|send|pay)[^.]{0,40}deposit[^.]{0,40}(?:today|now|to secure|to hold|before)|(?:hold|reserve|secure) (?:it|the (?:flat|car|vehicle|room|item|property))[^.]{0,40}(?:for you )?with (?:a )?[£$€]?\d/i, w: 42, tag: 'deposit-hold', plain: 'It wants a deposit to hold something you have not seen, transferred today. Never send a deposit before viewing, and never by bank transfer.' },
  // Fees for a dependant, payable today or something bad happens to them.
  { re: /(?:care home|nursing home|school|hospital|residential) (?:fees|payment|bill|costs)[^.]{0,60}(?:overdue|outstanding|arrears|at risk|today|immediately)|(?:place|room|bed) (?:is )?at risk[^.]{0,50}(?:payment|pay|today)/i, w: 45, tag: 'dependant-fee', plain: 'It uses a relative’s care to rush you into paying. Ring the home or the school directly on a number you already have — never the one in the message.' },
  // Donations taken by card over the phone, or by transfer, on an inbound call.
  { re: /(?:collecting|raising|appeal) for[^.]{0,60}(?:card payment over the phone|bank transfer|card details)|(?:donat\w+|give)[^.]{0,50}(?:card payment over the phone|over the phone is easiest)/i, w: 40, tag: 'charity', plain: 'A real charity will not take your card over the phone on a call you did not make. Give through their own website or a shop instead.' },
  // Utility or official wanting access to the house.
  { re: /(?:we (?:need|require)|need) access[^.]{0,60}(?:check|inspect|test|survey)|(?:our )?(?:operative|engineer|inspector) will call (?:round|at your|to your)/i, w: 35, tag: 'doorstep', plain: 'Someone claiming they need to come in. Do not let them: ring the company on the number from your own bill first, and use the chain on the door.' },
  // COURIER FRAUD. Among the most damaging scams there is: a caller posing as
  // police or the bank persuades someone to withdraw cash, buy gold, or hand
  // over a card "as evidence" or "for safekeeping". No real institution has
  // ever done this, so the pattern is unambiguous and weighted accordingly.
  { re: /(?:withdraw|take out|draw out)[^.]{0,40}(?:cash|money|funds)[^.]{0,60}(?:collect|courier|hand (?:it )?over|evidence|safekeeping|officer|we(?:'?ll| will) (?:send|come))|(?:courier|officer|colleague|someone) will (?:come|call round|attend|collect)[^.]{0,50}(?:card|cash|money|it)|(?:hand|give) (?:your |the )?(?:card|cash|money) (?:over )?to[^.]{0,40}(?:courier|officer|driver|colleague)|(?:cut (?:it|your card) in half)/i, w: 90, tag: 'courier-fraud', plain: 'It wants your cash or your card handed to someone. The police and your bank NEVER do this — not for evidence, not for safekeeping, not ever. This is the scam itself. Hang up and ring 159 or the number on your card.' },
  // Fake app/security update pushed through a supplied link.
  { re: /(?:app|application|software|security)[^.]{0,40}must be updated[^.]{0,60}(?:link|install)|install the (?:update|app|certificate)[^.]{0,40}(?:from the link|below|we sent)|update (?:your )?(?:banking )?app[^.]{0,40}(?:from|via|using) (?:the |this )?link/i, w: 45, tag: 'remote-access', plain: 'It tells you to install something from a link it supplied. Update apps only from the App Store, never from a message.' },
  // Money asked for as a "reimbursement" to a third party.
  { re: /(?:reimburse|pay back|repay)[^.]{0,40}(?:them|him|her|your neighbour|the driver)[^.]{0,40}(?:link|transfer|below)|(?:neighbour|driver|colleague) (?:has )?paid[^.]{0,50}(?:reimburse|pay (?:them|him|her) back)/i, w: 42, tag: 'package-fee', plain: 'It says someone else paid a charge for you and wants reimbursing through its link. Check with the person directly — this is a way of harvesting a payment.' },
  // Paying to start work.
  { re: /(?:training|certification|induction|onboarding|dbs|uniform|equipment) (?:module |course |fee |cost )?(?:costs?|fee of|payment of)[^.]{0,40}(?:refunded|reimbursed|first pay|deducted)|(?:pay|payment) (?:for|of)[^.]{0,30}(?:training|certification|uniform|equipment)[^.]{0,40}(?:before (?:you )?start|refunded)/i, w: 45, tag: 'job-scam', plain: 'A real employer never charges you to start work. Paying for training, a uniform or a check, however it is dressed up, is the con.' },
  // Refund or rebate that needs your account details supplied to them.
  { re: /(?:rebate|refund|credit|compensation) (?:has been )?(?:approved|due|owed)[^.]{0,60}(?:provide|confirm|send|give)[^.]{0,40}(?:account|bank|card|payment) details/i, w: 45, tag: 'detail-harvest', plain: 'It offers money back, then asks for your account details. A real refund goes to the card or account you already paid from.' },
  // Doorstep collection that also wants cash.
  { re: /(?:collect\w*|collecting)[^.]{0,50}(?:charity|hospice|appeal)[^.]{0,80}(?:cash|envelope|donation)[^.]{0,40}(?:provided|left out|with the bag)|cash donations?[^.]{0,40}(?:envelope|bag) provided/i, w: 38, tag: 'charity', plain: 'Doorstep collections asking for cash in an envelope are frequently bogus. Give through the charity’s own website or a shop instead.' },
  // Syndicate/tipster buy-in.
  { re: /(?:syndicate|tipster|group|scheme)[^.]{0,60}(?:won|winning|success)[^.]{0,60}(?:buy-?in|stake|share|join)|(?:one-?off |single )?buy-?in[^.]{0,50}(?:secures?|guarantees?)[^.]{0,40}(?:share|jackpot|place)/i, w: 40, tag: 'investment', plain: 'A winning syndicate you must pay to join is a con — the winnings are invented and the buy-in is the point.' },
  // — QR bait
  { re: /scan (?:the|this) qr[\s\S]{0,60}(?:refund|payment|verify|claim|unlock|receive)/i, w: 35, tag: 'qr-bait', plain: 'It wants you to scan a QR code — a link you can’t read before opening. Scammers use them to hide where you’re really going.' },
  // — Pet / rental deposit
  { re: /(?:puppy|puppies|kitten|teacup)[\s\S]{0,80}(?:deposit|shipping|delivery fee|hold (?:him|her|it))/i, w: 38, tag: 'pet-deposit', plain: 'A pet you can’t see first, held for a deposit or shipping fee, is almost always a photo stolen from someone else’s listing.' },
  // — Romance / pig butchering / wrong number / platform hop
  // Two very different things were sharing one rule. A term of endearment is
  // what a husband calls his wife; declarations of love from someone you have
  // never met are the opening of a long con. Separated, so "My darling, the
  // parcel arrived safely" stays green while the con still fires.
  { re: /(?:my (?:love|darling|dear|dearest))\b/i, w: 10, tag: 'romance', plain: 'It opens with an endearment.' },
  { re: /(?:i(?:'ve| have) (?:fallen for|feelings for) you)|soul\s*mate|destiny brought us|(?:soon )?we(?:'ll| will) be together|you are the only one who understands me|i think about you (?:all the time|constantly)/i, w: 32, tag: 'romance', plain: 'Strong declarations of love from someone you have not met in person — the opening of a long con.' },
  { re: /(?:invest|investment|trading platform|guaranteed (?:return|profit)|double your money|portfolio)[\s\S]{0,60}(?:crypto|bitcoin|usdt|forex|opportunity)/i, w: 40, tag: 'investment', plain: 'A stranger with an investment opportunity is the “pig butchering” con: weeks of friendliness, then a fake trading site.' },
  { re: /(?:wrong number|sorry,? who is this|is this (?!my)[A-Z][a-z]+\?)[\s\S]{0,120}(?:nice|friendly|chat|anyway|by the way|new friend|where are you from)/i, w: 28, tag: 'wrong-number', plain: 'A friendly stranger from a “wrong number” who keeps chatting — this is exactly how a long con starts. It’s fine to just not reply.' },
  { re: /(?:message|text|chat with|add|contact|reach) me on (?:whatsapp|telegram|signal|wechat|viber)/i, w: 26, tag: 'platform-hop', plain: 'It pushes you to move to another app. Scammers hop platforms so no one can trace the whole story.' },
  // — Recovery scams (weighted up further when postPanic is on)
  { re: /(?:recover|get back|retrieve|reclaim|claw back)[\s\S]{0,40}(?:money|funds|losses|what you lost)|(?:funds? |asset |money )?recovery (?:firm|service|agent|department|specialist)|refund department/i, w: 30, tag: 'recovery', plain: 'It offers to recover money you lost. People who report a scam get targeted again by fake “recovery services.” This is one.' },
  // — Remote access / urgency
  { re: /(?:anydesk|teamviewer|ultraviewer|remote access|screen shar\w+|install (?:this|the) (?:app|software)|(?:fix|sort|repair|secure)[^.]{0,20}remotely|(?:let|allow) me (?:on|in|connect)|walk you through (?:securing|installing|fixing)|get to (?:a|your) computer)/i, w: 45, tag: 'remote-access', plain: 'It asks you to install remote-access software so someone can control your phone.' },
  { re: /(?:act now|urgent|immediately|right away|within (?:24|48) hours|expires? (?:today|soon|tonight)|final notice|last (?:chance|warning)|asap|don'?t delay)/i, w: 15, tag: 'urgency', plain: 'It uses pressure words to rush you. Rushing is a scammer\u2019s favourite tool.' },

  // \u2014 The same cons in Spanish, French, and Portuguese. Scammers pick the
  //   victim's language; the detector must not be English-only.
  { re: /(?:su )?cuenta (?:ser[a\u00e1]|est[a\u00e1]|fue) (?:suspendida?|bloqueada?|cerrada?|limitada?)|verifi(?:que|car) (?:su )?(?:cuenta|informaci[o\u00f3]n|identidad)/i, w: 40, tag: 'bank-alert', plain: 'It claims an account will be suspended unless you act \u2014 the classic pressure move, written in Spanish.' },
  { re: /(?:haga clic|pulse|presione) aqu[i\u00ed]|ingrese (?:sus? )?(?:datos|clave|contrase[n\u00f1]a)/i, w: 30, tag: 'urgency', plain: 'It pushes you to tap a link or enter private details (written in Spanish).' },
  { re: /(?:inmediatamente|urgente|hoy mismo|[u\u00fa]ltimo aviso|aviso final)[\s\S]{0,60}(?:cuenta|pago|multa|paquete)|(?:cuenta|pago|multa|paquete)[\s\S]{0,60}(?:inmediatamente|urgente|hoy mismo|[u\u00fa]ltimo aviso|aviso final)/i, w: 30, tag: 'urgency', plain: 'It pairs pressure words with money or an account (written in Spanish). Rushing is a scammer\u2019s favourite tool.' },
  { re: /(?:ha )?ganado (?:un |el )?(?:premio|loter[i\u00ed]a|sorteo)|reclam(?:e|ar) su premio/i, w: 42, tag: 'prize', plain: 'It says you won a prize you never entered for (written in Spanish).' },
  { re: /(?:comparta|env[i\u00ed]e|d[i\u00ed]game)[\s\S]{0,40}c[o\u00f3]digo (?:de )?(?:verificaci[o\u00f3]n|seguridad)|c[o\u00f3]digo (?:de )?(?:verificaci[o\u00f3]n|seguridad)[\s\S]{0,40}(?:comparta|env[i\u00ed]e|responda)/i, w: 55, tag: 'otp-request', plain: 'It asks you to hand over a security code (written in Spanish). No real company ever asks for the code.' },
  { re: /paquete (?:retenido|detenido|en espera)[\s\S]{0,80}(?:tarifa|pago|arancel|impuesto)|aduana[\s\S]{0,60}(?:tarifa|pago)/i, w: 40, tag: 'delivery-fee', plain: 'A held package with a small fee to release it (written in Spanish) \u2014 a card-harvesting trick.' },
  { re: /(?:votre )?compte (?:sera|est|a [e\u00e9]t[e\u00e9]) (?:suspendu|bloqu[e\u00e9]|ferm[e\u00e9]|limit[e\u00e9])|v[e\u00e9]rifiez votre (?:compte|identit[e\u00e9])|cliquez ici/i, w: 40, tag: 'bank-alert', plain: 'It claims an account will be suspended unless you act \u2014 the classic pressure move, written in French.' },
  { re: /colis (?:retenu|en attente|bloqu[e\u00e9])[\s\S]{0,70}(?:frais|paiement|douane)|code de v[e\u00e9]rification[\s\S]{0,50}(?:partagez|envoyez|donnez)/i, w: 42, tag: 'delivery-fee', plain: 'A held package with a fee, or a request for a security code (written in French).' },
  { re: /(?:sua )?conta (?:ser[a\u00e1]|est[a\u00e1]|foi) (?:suspensa|bloqueada|encerrada|limitada)|verifique sua (?:conta|identidade)|clique aqui/i, w: 40, tag: 'bank-alert', plain: 'It claims an account will be suspended unless you act \u2014 the classic pressure move, written in Portuguese.' },
];

// PRECISION GUARD — the false-positive killer. Trend Micro flagged a real Amazon receipt; we will not.
// These patterns SUBTRACT from the score. A first-class feature, measured in the test suite.
const KNOWN_GOOD: Rule[] = [
  { re: /order (?:number|#|no\.?)[: ]*[\w-]{5,}/i, w: -30, tag: 'good-order', plain: '' },
  { re: /(?:has (?:been )?shipped|out for delivery|was delivered|arriving (?:today|tomorrow))(?![\s\S]{0,60}(?:fee|\$|pay|click))/i, w: -22, tag: 'good-delivery', plain: '' },
  { re: /(?:your|the) (?:appointment|visit|reservation) (?:with|is|on|at)[\s\S]{0,80}(?:reply c|confirm|reschedule|cancel)/i, w: -28, tag: 'good-appointment', plain: '' },
  { re: /(?:your|the) (?:verification |security |one[- ]?time |login )?code is[: ]*\d{4,8}/i, w: -25, tag: 'good-otp-arriving', plain: '' },
  { re: /(?:do not|don'?t|never) share (?:this|the|your) code/i, w: -15, tag: 'good-otp-arriving', plain: '' },
  { re: /(?:thanks|thank you) for your payment|payment (?:of \$[\d,.]+ )?(?:received|posted|confirmed)/i, w: -20, tag: 'good-receipt', plain: '' },
  // Real institutions warning you about scams — the opposite of a threat.
  { re: /(?:we|our (?:staff|team|employees)|your bank) will never (?:ask|call|text|request)[\s\S]{0,60}(?:password|pin|code|card|social security)/i, w: -20, tag: 'good-disclaimer', plain: '' },
  { re: /if this was(?:n'?t)? you[\s\S]{0,40}(?:no action|ignore|nothing|you can ignore)/i, w: -20, tag: 'good-noaction', plain: '' },
  // Explicit statements that nothing is owed. The fee rules match on the noun
  // ("charge", "customs") and cannot see the negation in front of it, so a
  // parcel that cleared customs WITH NO CHARGES was scoring as a fee demand.
  { re: /(?:no|without any|nothing) (?:charges?|fees?|payment|duty|cost)s? (?:outstanding|to pay|due|required|apply|applies)?|nothing (?:further )?to pay|no (?:action|payment) (?:is )?(?:needed|required)|free of charge/i, w: -28, tag: 'good-nofee', plain: '' },
  { re: /(?:cleared|through|released from) customs/i, w: -18, tag: 'good-customs', plain: '' },
  // Genuine draws and workplace syndicates. The prize rule matches the noun
  // ("prize", "lottery") and cannot tell a real raffle from a fake win.
  { re: /free to enter|no purchase (?:necessary|needed|required)|no (?:extra )?buy-?in|syndicate at work|(?:members'?|staff|club|office|village|school) (?:prize )?(?:draw|raffle|lottery)/i, w: -40, tag: 'good-draw', plain: '' },
  // Someone returning YOUR call, or confirming a thing you already did.
  { re: /returning your call|as (?:you |we )?(?:requested|discussed|arranged)|following (?:up on )?your (?:call|enquiry|complaint|request)|thanks? for (?:your )?(?:call|visit|donation|patience)/i, w: -24, tag: 'good-inbound', plain: '' },
  // Already handled, nothing asked of you — the opposite shape to a scam, which
  // always needs you to do something.
  { re: /(?:we(?:'?ve| have)) (?:already )?(?:blocked|stopped|cancelled|declined|refunded|credited|written off)[^.]{0,60}(?:no action|nothing|still works|as normal|automatically)?|(?:your card|it) still works as normal|has already been (?:written off|refunded|credited)/i, w: -26, tag: 'good-handled', plain: '' },
  // Explicitly NOT asking for money. The deposit and fee rules match the noun
  // and cannot see "no ... needed" in front of it.
  { re: /no (?:deposit|payment|fee|charge|card details?)[^.]{0,20}(?:needed|required|necessary|to pay)|(?:without|no need for) (?:a )?deposit|no obligation/i, w: -30, tag: 'good-nodeposit', plain: '' },
  { re: /(?:no|zero) fee for this|at no (?:cost|charge) to you|we (?:will|'?ll) not charge/i, w: -22, tag: 'good-nofee', plain: '' },
];

const PAY_TAGS = new Set(['giftcard','crypto','payment','package-fee','toll','refund','investment','recovery','advance-fee','overpayment','charity','pet-deposit','wallet-phrase']);
const URG_TAGS = new Set(['urgency','account-locked','gov-impersonation','family-emergency','digital-arrest','bank-alert','safe-account','subscription','sextortion','tech-support','callback']);
const CODE_WORD_TAGS = new Set(['family-emergency']);

export function detect(message: string, opts: DetectorOptions = {}): Verdict {
  const norm = normalizeText((message || '').trim());
  const text = norm.text;
  const base: Omit<Verdict, 'level' | 'reason' | 'safeStep'> = { signals: [], matches: [], tags: [], confidence: 'very', codeWordMoment: false, score: 0, disguised: norm.disguised };
  if (!text) return { ...base, level: 'green', reason: 'There’s nothing to check yet.', safeStep: 'Paste or share a message and tap “Check it”.' };

  // Person-editable allowlist ("this really is my bank's number")
  const allow = (opts.allowlist || []).map(a => a.toLowerCase().trim()).filter(Boolean);
  const hay = (text + ' ' + (opts.sender || '')).toLowerCase();
  if (allow.some(a => hay.includes(a)))
    return { ...base, level: 'green', reason: 'This matches a sender you told me is safe.', safeStep: 'If anything still feels off, loop in someone you trust.', tags: ['allowlist'], confidence: 'fairly' };

  let score = 0;
  const signals: string[] = [], matches: string[] = [], tags: string[] = [];
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) { score += r.w; signals.push(r.plain); matches.push(m[0]); if (!tags.includes(r.tag)) tags.push(r.tag); }
  }
  // Recovery-scam guard: post-panic, recovery patterns hit much harder
  if (opts.postPanic && tags.includes('recovery')) score += 35;

  // Disguised characters: hiding "apple" or "gift card" behind look-alike letters
  // is itself proof of bad intent — no honest sender does this.
  if (norm.disguised) {
    score += 25;
    signals.push('The message hides its words behind look-alike or invisible characters so filters can’t read them. Honest senders never do this.');
    if (!tags.includes('disguise')) tags.push('disguise');
  }

  // URL forensics
  const links = analyzeLinks(text);
  for (const h of links.hits) { score += h.w; signals.push(h.plain); matches.push(h.match); if (!tags.includes(h.tag)) tags.push(h.tag); }
  if (links.urlCount >= 3) { score += 15; signals.push('It contains several links. Real banks send one link at most; scammers scatter many.'); tags.push('url-many'); }

  // Precision guard — subtract for known-good patterns, but never when the scam
  // half of the pattern is present (OTP being *requested*, "safe account" move).
  for (const g of KNOWN_GOOD) {
    if (g.tag === 'good-otp-arriving' && tags.includes('otp-request')) continue;
    if (g.tag === 'good-disclaimer' && (tags.includes('otp-request') || tags.includes('safe-account'))) continue;
    if (g.re.test(text)) score += g.w;
  }
  score = Math.max(0, score);

  // The scam triangle: urgency × payment × secrecy. Any two = at least amber. All three = red, always.
  const hasPay = tags.some(t => PAY_TAGS.has(t));
  const hasUrg = tags.some(t => URG_TAGS.has(t));
  const hasSec = tags.includes('secrecy');
  const triangle = (hasPay ? 1 : 0) + (hasUrg ? 1 : 0) + (hasSec ? 1 : 0);
  if (triangle >= 2) score = Math.max(score, 30) + 20;
  let forceRed = triangle === 3;

  // Two-stage bank con: prior bank-alert + now a "fraud department"/"safe account" follow-up → highest alert
  const twoStage = (opts.recentTags || []).includes('bank-alert') && (tags.includes('safe-account') || tags.includes('bank-alert'));
  if (tags.includes('safe-account')) forceRed = true;
  if (twoStage) { forceRed = true; if (!tags.includes('two-stage')) tags.push('two-stage'); }

  const codeWordMoment = tags.some(t => CODE_WORD_TAGS.has(t));

  // Verdict — COMMITTED. Red means red. (Scamio's hedging is the most-criticized thing in this market.)
  let level: Level = score >= 50 || forceRed ? 'red' : score >= 20 ? 'amber' : 'green';
  const confidence: Confidence = forceRed || score >= 75 ? 'very' : level === 'red' ? 'very' : level === 'amber' ? (score >= 35 ? 'fairly' : 'unsure') : (signals.length ? 'fairly' : 'very');

  let reason: string, safeStep: string;
  const hasBadLink = links.hits.some(h => h.w > 0);
  if (level === 'red') {
    reason = twoStage
      ? 'This is the trick: a fake alert, then a “fraud agent.” Your bank will never move your money to a “safe account.”'
      : (signals[0] || 'This is a scam.');
    safeStep = twoStage || tags.includes('safe-account')
      ? 'Hang up. Call the number on the back of your bank card — no other number.'
      : hasBadLink ? 'Do not tap the link. Delete the message.'
      : tags.includes('otp-request') ? 'Don’t share the code with anyone. Delete the message.'
      : tags.includes('sextortion') ? 'Don’t pay and don’t reply — it’s a mass-sent bluff. Delete it, and tell someone you trust.'
      : codeWordMoment ? 'Before anything else, ask them for your family code word.'
      : 'Do not reply and do not send anything. Delete the message.';
  } else if (level === 'amber') {
    reason = signals[0] || 'Something’s off here.';
    safeStep = 'Do not tap anything yet. Contact the company yourself on a number you already trust.';
  } else {
    reason = 'Nothing in this message matches a known scam trick.';
    safeStep = 'You do not need to do anything. If it still feels off, loop someone in.';
  }

  return { level, reason, safeStep, signals, matches, tags, confidence, codeWordMoment, score, disguised: norm.disguised };
}
