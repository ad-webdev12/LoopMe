// Generates a labeled scam/ham dataset for training the on-device Core ML text
// classifier. Real messages + templated variations across every scam family the
// app must catch, plus a rich set of legitimate messages so the model learns the
// boundary (the #1 way checkers fail is flagging real receipts and reminders).
//
// Output: ml/scam-train.csv, ml/scam-test.csv  (columns: text,label)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const rows = [];
const add = (text, label) => rows.push({ text: text.replace(/\s+/g, ' ').trim(), label });

// deterministic pseudo-random so runs are reproducible (no Math.random)
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const many = (arr, tpl, label, n) => { for (let i = 0; i < n; i++) add(tpl(), label); };

const banks = ['Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'Capital One', 'US Bank', 'PNC', 'TD Bank'];
const brands = ['Netflix', 'Amazon', 'Apple', 'PayPal', 'Disney+', 'Hulu', 'Spotify', 'Costco', 'Walmart'];
const carriers = ['USPS', 'FedEx', 'UPS', 'DHL', 'the post office'];
const amounts = ['$1.95', '$2.99', '$3.20', '$0.99', '$1.50', '$4.75'];
const dollars = ['$450', '$899', '$1,299', '$2,000', '$750', '$500', '$1,450'];
const codes = ['628', '415', '917', '213', '347'];

// ---------------- SCAMS ----------------
many([], () => `${pick(banks)} Fraud: did you authorize a ${pick(dollars)} charge? Reply NO or call ${pick(codes)}-555-0${Math.floor(rnd()*900+100)} to dispute.`, 'scam', 26);
many([], () => `This is the ${pick(banks)} fraud department. To keep your money safe we need to move it to a secure account right away.`, 'scam', 24);
many([], () => `Your account is locked. Buy a ${pick(['$200','$100','$500'])} ${pick(['iTunes','Apple','Google Play','Steam','Vanilla'])} gift card and send the code to release it.`, 'scam', 24);
many([], () => `Grandma it's me, I'm in ${pick(['jail','the hospital','an accident'])} and need ${pick(dollars)} for ${pick(['bail','a lawyer','the doctor'])}. Please don't tell mom or dad.`, 'scam', 22);
many([], () => `This is your grandson. My phone broke, this is my new number. Can you send ${pick(dollars)} by ${pick(['Zelle','Venmo','Cash App'])}? I'll explain later.`, 'scam', 20);
many([], () => `${pick(carriers)}: your parcel is on hold. A ${pick(amounts)} fee is due. Confirm here: ${pick(carriers).toLowerCase().replace(/[^a-z]/g,'')}-redeliver-fee.co/${Math.floor(rnd()*9000)}`, 'scam', 24);
many([], () => `Toll notice: you have an unpaid balance of ${pick(amounts)}. Pay now to avoid a late fee: ezpass-billing.${pick(['top','xyz','icu'])}`, 'scam', 20);
many([], () => `${pick(['IRS','Social Security Administration','Medicare'])}: your ${pick(['SSN','benefits','account'])} is suspended. Call immediately or a warrant will be issued.`, 'scam', 22);
many([], () => `Send me the 6 digit code you just received to verify your identity.`, 'scam', 16);
many([], () => `${pick(brands)}: your payment failed. Update your billing at ${pick(brands).toLowerCase()}-account-verify.${pick(['xyz','top','co'])} to avoid cancellation.`, 'scam', 22);
many([], () => `You have won a ${pick(['$1000 Walmart','$500 Costco','Publishers Clearing House'])} ${pick(['reward','prize','gift'])}! Claim now with a small processing fee.`, 'scam', 18);
many([], () => `Your tax refund of ${pick(dollars)} is pending. Verify your bank details to claim it: refund-gov.${pick(['xyz','top'])}`, 'scam', 16);
many([], () => `Hi dear, I feel such a connection with you. Let me teach you about crypto trading, I made ${pick(dollars)} last week. Message me on ${pick(['WhatsApp','Telegram'])}.`, 'scam', 18);
many([], () => `Work from home, earn ${pick(['$300','$500','$800'])} a day, no experience. Apply now on ${pick(['WhatsApp','Telegram'])}.`, 'scam', 14);
many([], () => `Microsoft support: viruses were detected on your computer. Install ${pick(['AnyDesk','TeamViewer'])} so our technician can fix it.`, 'scam', 16);
many([], () => `We can recover the money you lost to a scam. Our firm needs a ${pick(['$300','$500'])} retainer first.`, 'scam', 14);
many([], () => `I have a video of you from your webcam. Pay ${pick(['$800','$1200'])} in bitcoin within 48 hours or I send it to all your contacts.`, 'scam', 14);
many([], () => `Sorry, wrong number! But you seem nice. Where are you from? I'm ${pick(['Amy','Lily','Grace'])}, nice to meet a new friend :)`, 'scam', 14);
many([], () => `Scan this QR code to receive your ${pick(['$100','$50'])} ${pick(['Zelle','PayPal'])} refund instantly.`, 'scam', 12);
many([], () => `${pick(['Coinbase','Binance'])} support: to restore access, confirm your wallet seed phrase with our agent.`, 'scam', 12);
many([], () => `Adorable ${pick(['puppies','kittens'])} ready today, just send the ${pick(['$200','$300'])} shipping deposit via ${pick(['Zelle','Cash App'])}.`, 'scam', 10);

// ---------------- LEGIT / HAM ----------------
many([], () => `${pick(brands)}: your order #${Math.floor(rnd()*900+100)}-${Math.floor(rnd()*9000000)} has shipped. Arriving ${pick(['Tuesday','Thursday','Friday'])}.`, 'safe', 24);
many([], () => `Your ${pick(banks)} verification code is ${Math.floor(rnd()*900000+100000)}. Do not share this code with anyone.`, 'safe', 22);
many([], () => `Reminder: your appointment with Dr. ${pick(['Patel','Kim','Nguyen','Ruiz'])} is ${pick(['Tuesday','Monday','Thursday'])} at ${pick(['9am','2pm','10:30am'])}. Reply C to confirm.`, 'safe', 22);
many([], () => `Your prescription is ready for pickup at ${pick(['CVS','Walgreens','Rite Aid'])} pharmacy #${Math.floor(rnd()*900+100)}.`, 'safe', 18);
many([], () => `${pick(carriers)}: your package was delivered at ${pick(['2:14pm','11:02am','4:47pm'])}. Track more at ${pick(['usps.com','fedex.com','ups.com'])}.`, 'safe', 20);
many([], () => `Hi ${pick(['Mom','Dad','Grandma','Grandpa'])}, running ${pick(['10','15'])} minutes late for ${pick(['lunch','the movie','dinner'])}, see you soon!`, 'safe', 20);
many([], () => `Thanks for your payment of ${pick(dollars)} to ${pick(['PSE&G','the electric company','Verizon','Comcast'])}. Payment received.`, 'safe', 18);
many([], () => `${pick(banks)}: you spent ${pick(['$43.12','$18.90','$62.40'])} at ${pick(['Shell','Target','Kroger'])}. Not you? Check your app.`, 'safe', 18);
many([], () => `Your table for ${pick(['2','4'])} at ${pick(['Olive Garden','the Italian place','Panera'])} is confirmed for ${pick(['6:30','7:00'])} tonight.`, 'safe', 14);
many([], () => `Church ${pick(['potluck','choir practice','bible study'])} moved to ${pick(['Saturday','Wednesday'])} ${pick(['5pm','7pm'])}, bring your famous casserole!`, 'safe', 14);
many([], () => `${pick(brands)}: a new device signed in. If this was you, no action is needed.`, 'safe', 14);
many([], () => `Your ${pick(['library books are','car is'])} ${pick(['due Friday','ready for pickup'])}. ${pick(['Renew online','Total: $212.50'])}.`, 'safe', 12);
many([], () => `${pick(['Uber','Lyft'])}: your driver ${pick(['Miguel','Sara','Tom'])} is arriving in a ${pick(['white Camry','blue Civic'])}, plate ${pick(['XJK-2214','LPR-8830'])}.`, 'safe', 12);
many([], () => `School closed tomorrow due to ${pick(['snow','ice'])}. All after-school activities canceled.`, 'safe', 12);
many([], () => `Hi it's ${pick(['Sarah','Mike','Carol'])}, are we still on for ${pick(['bridge','coffee','lunch'])} ${pick(['Thursday','Friday'])}?`, 'safe', 14);
many([], () => `Your ${pick(['electric','water','gas'])} bill is ${pick(['$118.22','$74.10','$203.55'])}, due ${pick(['March 15','April 2'])}. Pay in the app or by mail.`, 'safe', 14);
many([], () => `Zelle: you received ${pick(['$50.00','$25.00','$100.00'])} from ${pick(['Sarah Miller','John Reed','Aunt Carol'])}. It's in your account.`, 'safe', 12);
many([], () => `Reminder from ${pick(['Trinity Church','the YMCA','the senior center'])}: ${pick(['choir practice','water aerobics','the flu clinic'])} ${pick(['Wednesday 7pm','Mon/Wed 9am'])}.`, 'safe', 12);
many([], () => `Your ${pick(['Southwest','Delta','United'])} flight ${pick(['check-in opens','is on time'])} ${pick(['at 10:15am tomorrow','departing gate B12'])}.`, 'safe', 12);
many([], () => `${pick(['DMV','Jury duty'])}: ${pick(['your registration renewal was processed','report Monday 8:30am, room 210'])}.`, 'safe', 10);

// shuffle deterministically and split 85/15
for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; }
const csv = (list) => 'text,label\n' + list.map(r => `"${r.text.replace(/"/g, '""')}",${r.label}`).join('\n') + '\n';
const cut = Math.floor(rows.length * 0.85);
writeFileSync(join(dir, 'scam-train.csv'), csv(rows.slice(0, cut)));
writeFileSync(join(dir, 'scam-test.csv'), csv(rows.slice(cut)));
const scam = rows.filter(r => r.label === 'scam').length;
console.log(`Generated ${rows.length} rows (${scam} scam / ${rows.length - scam} safe) → ${cut} train, ${rows.length - cut} test`);
