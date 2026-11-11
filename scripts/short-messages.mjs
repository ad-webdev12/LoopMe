// Short, informal messages for training: the model scored near zero on
// one-line scams ("Netflix: payment failed, update at netflix-billing.top")
// and near one on friendly money talk ("can u send me 20 for the uber"),
// because the training rows were long and formal. This writes
// ml/extra/short.csv: scam and safe lines in the same casual register, with
// the same money, link and urgency words on both sides so the model learns
// the shape of a con, not the word "money".
//
//   node scripts/short-messages.mjs
import { writeFileSync } from 'node:fs';

let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = a => a[Math.floor(rnd() * a.length)];
const maybe = (s, p = 0.5) => (rnd() < p ? s : '');

const names = ['john', 'mike', 'sarah', 'priya', 'dave', 'mum', 'dad', 'grandma', 'nan', 'auntie', 'uncle ray', 'jess', 'tom', 'kev', 'linda'];
const amounts = ['20', '50', '$200', '300', '500', '1,000', '2 bucks', '1.99', '$45', '85', '250', '4.50', '12', '£60', '99'];
const links = ['bit.ly/x8s2', 'tinyurl.com/4kd9', 'https://scam.me.com', 'netflix-billing.top', 'spotify-renew.top', 'usps-redeliver.info', 'secure-login-bank.co', 'rb.gy/2kd', 'amaz0n-help.net', 'hmrc-refund.online', 'paypa1-verify.com', 'cutt.ly/pay1', 'apple-id-unlock.xyz', 'http://192.168.3.4/login', 'dhl-track.live'];
const brands = ['Netflix', 'Spotify', 'Amazon', 'PayPal', 'Apple', 'your bank', 'Chase', 'Wells Fargo', 'USPS', 'DHL', 'FedEx', 'the IRS', 'HMRC', 'Medicare', 'Venmo', 'Cash App', 'Zelle', 'Royal Mail', 'EE', 'Verizon', 'AT&T', 'Microsoft', 'Facebook', 'Instagram', 'WhatsApp'];
const urgency = ['quick', 'now', 'asap', 'right now', 'today', 'in the next hour', 'before midnight', 'immediately', 'within 24 hrs', 'or else', 'or it gets closed', 'or you lose access', 'last chance', 'final notice', 'hurry'];
const payApps = ['venmo', 'cashapp', 'zelle', 'paypal', 'apple pay', 'gift cards', 'a steam card', 'an itunes card', 'bitcoin', 'crypto', 'western union', 'a bank transfer'];
const slangYou = ['u', 'you', 'ya'];
const slangYour = ['ur', 'your', 'yr'];

// ---- scams ----------------------------------------------------------------
const scam = [
  () => `${pick(['gimme', 'give me', 'send me', 'i need'])} ${pick(['all', 'some of', ''])} ${pick(slangYour)} money ${pick(urgency)}${maybe(', ' + pick(links), 0.6)}`,
  () => `${pick(brands)}: payment ${pick(['failed', 'declined', 'didnt go through', 'was rejected'])}${pick([', update', '. update', ' - update', '. fix it'])} ${pick(['billing', 'your card', 'payment info', 'details'])} ${pick(['at', 'here', 'now at', ':'])} ${pick(links)}`,
  () => `${pick(slangYour)} ${pick(['account', 'acct', 'card', 'apple id', 'netflix', 'paypal', 'amazon account'])} ${pick(['is locked', 'got hacked', 'will be closed', 'has been suspended', 'is frozen', 'was compromised'])} ${pick(urgency)}${pick(['. verify here', '. login here', ', fix here', '. unlock at', ' click'])} ${pick(links)}`,
  () => `hey ${pick(['its me', 'this is ' + pick(names), 'grandma its me', 'mom its me'])}${pick([', lost my phone', ', phone broke', ', new number', ', im in trouble', ', got arrested', ', im in hospital'])}${pick([', can u send', ', need', ', send me', '. i need'])} ${pick(amounts)} ${pick(['to this', 'via', 'by', 'on'])} ${pick(payApps)} ${pick(urgency)}${maybe(' dont tell ' + pick(['mom', 'dad', 'anyone', 'the family']), 0.5)}`,
  () => `${pick(slangYour)} ${pick(['package', 'parcel', 'delivery', 'order'])} ${pick(['is stuck', 'is held', 'couldnt be delivered', 'is waiting', 'needs a fee'])}${pick([' lol', '', '', ' sorry'])}${pick([', pay', '. pay', ' - pay', '. reschedule for'])} ${pick(amounts)} ${pick(['here', 'at', 'now at', ''])} ${pick(links)}`,
  () => `${pick(['send', 'read me', 'whats', 'give me', 'text me'])} the ${pick(['code', '6 digit code', 'verification code', 'otp', 'pin'])} ${pick(['they just texted u', 'u just got', 'from ur bank', 'on ur phone', 'i sent u'])} ${pick(['so i can fix it', 'to unlock it', 'to verify', 'real quick', 'now'])}`,
  () => `${pick(['congrats', 'congratulations', 'winner!', 'you won', 'u have been selected'])}${pick([' u won', '! you won', '. claim'])} ${pick(['an iphone', '$1000', 'a gift card', 'a prize', '£500', 'a free cruise'])}${pick(['. claim', ' - claim', ', get it'])} ${pick(['here', 'at', 'now'])} ${pick(links)}${maybe(' ' + pick(urgency), 0.4)}`,
  () => `${pick(['this is', 'hi this is', 'msg from'])} ${pick(brands)}${pick([' fraud team', ' security', ' support', ' billing', ''])}. ${pick(['we saw a', 'there was a', 'unusual'])} ${pick(['charge', 'login', 'payment', 'transaction'])} ${pick(['of ' + pick(amounts), 'on ur acct', 'from abroad'])}. ${pick(['call', 'reply YES or call', 'confirm at', 'cancel at'])} ${pick(['this number', links[Math.floor(rnd() * links.length)], '888-' + Math.floor(100 + rnd() * 900) + '-' + Math.floor(1000 + rnd() * 9000)])} ${pick(urgency)}`,
  () => `${pick(['hi', 'hello', 'dear customer', 'hey'])}, ${pick(['ur', 'your'])} ${pick(['tax refund', 'refund', 'rebate', 'overpayment'])} of ${pick(amounts)} is ${pick(['ready', 'waiting', 'pending'])}. ${pick(['claim', 'enter ur card', 'confirm ur details', 'get it'])} ${pick(['here', 'at'])} ${pick(links)}`,
  () => `${pick(['i', 'we'])} ${pick(['made', 'earned', 'got'])} ${pick(['$8k', '$3,400', '2k', '£900'])} ${pick(['last week', 'this month', 'in 3 days'])} ${pick(['trading', 'on crypto', 'with this app', 'from home'])}${pick(['. guaranteed returns', ', no risk', ', easy money', ', want in?'])}${maybe(' ' + pick(links), 0.5)}`,
  () => `${pick(['hey', 'hi', 'hello'])}${maybe(' ' + pick(names), 0.5)}, ${pick(['can u do me a favour', 'need a favour', 'quick favour', 'r u free'])}? ${pick(['buy', 'get', 'pick up'])} ${pick(['3', '5', 'a few', '2'])} ${pick(['gift cards', 'google play cards', 'steam cards', 'itunes cards'])} and ${pick(['send me the codes', 'text me the numbers', 'scratch and send pics'])}. ${pick(['ill pay u back', 'im in a meeting', 'urgent', 'cant talk now'])}`,
  () => `${pick(['your', 'ur'])} ${pick(['ssn', 'social security number', 'medicare', 'national insurance number'])} ${pick(['has been suspended', 'was used in a crime', 'is compromised', 'will be cancelled'])}. ${pick(['call', 'press 1 or call', 'contact'])} ${pick(['us', 'this number', 'the officer'])} ${pick(urgency)}`,
  () => `${pick(['im', 'i am'])} ${pick(['the', 'a'])} ${pick(['courier', 'driver', 'agent', 'officer', 'technician'])}. ${pick(['there is a', 'u have a', 'we found a'])} ${pick(['fine', 'warrant', 'fee', 'virus', 'problem'])} ${pick(['on ur name', 'on ur pc', 'on ur acct', 'on ur line'])}. ${pick(['pay', 'fix it', 'settle it', 'clear it'])} ${pick(urgency)} ${pick(['here', 'at', 'via'])} ${pick(links)}`,
  () => `${pick(['hello', 'hi'])}${maybe(' ' + pick(['dear', 'beautiful', 'my friend']), 0.6)}, ${pick(['we met online', 'i saw ur profile', 'destiny brought us'])}${pick(['. i need', '. can u lend', '. my card is blocked, send'])} ${pick(amounts)} for ${pick(['a flight', 'customs', 'hospital', 'my visa'])}${pick(['. ill pay u back double', '. i love u', ' please'])}`,
  () => `${pick(['reply', 'text', 'answer'])} ${pick(['STOP', 'YES', 'Y', '1'])} ${pick(['to', 'if u want to'])} ${pick(['keep ur account', 'avoid charges', 'stop the payment', 'cancel the order'])} of ${pick(amounts)}${maybe(' ' + pick(urgency), 0.5)}`,
  () => `${pick(slangYour)} ${pick(['energy', 'phone', 'water', 'internet', 'council tax', 'electric'])} bill is ${pick(['overdue', 'unpaid', 'late'])}${pick(['. pay', ' - pay', '. settle'])} ${pick(amounts)} ${pick(urgency)} ${pick(['at', 'here', 'via'])} ${pick(links)} ${pick(['or we cut u off', 'to avoid disconnection', 'or bailiffs come', ''])}`,
  () => `${pick(['someone', 'a device', 'a new phone'])} ${pick(['logged into', 'tried to access', 'signed in to'])} ${pick(slangYour)} ${pick(brands)} ${pick(['from Russia', 'from a new location', 'in Nigeria', 'from another country'])}. ${pick(['secure it', 'not u? click', 'lock it', 'verify'])} ${pick(['here', 'at'])} ${pick(links)}`,
];

// ---- safe, same register ----------------------------------------------------
const safe = [
  () => `${pick(['yo', 'hey', 'hi'])} ${pick(['send me', 'whats', 'gimme'])} ${pick(slangYour)} ${pick(['venmo', 'paypal', 'cashapp', 'bank details', 'sort code'])}${pick([' i owe u for lunch', ', ill send the ' + pick(amounts) + ' for the tickets', ' so i can pay u back', ' for the pizza'])}`,
  () => `${pick(['hey', 'hi', 'yo'])}${maybe(' ' + pick(names), 0.6)} can ${pick(slangYou)} ${pick(['send', 'lend', 'spot'])} me ${pick(amounts)} for the ${pick(['uber', 'taxi', 'train', 'tickets', 'groceries', 'gift for mum'])}? ${pick(['ill pay u back tmrw', 'ill give it back friday', 'pay u back when i see u', 'ill transfer it back tonight'])}`,
  () => `${pick(['gimme', 'send me', 'whats', 'text me'])} ${pick(slangYour)} ${pick(['address', 'postcode', 'new number', 'email', 'eta'])} so i can ${pick(['drop off the cake', 'send the card', 'book the taxi', 'add u to the group', 'pick u up'])}`,
  () => `quick ${pick(['question', 'one', 'q'])}, what time is ${pick(['dinner', 'the match', 'church', 'the appointment', 'bingo', 'the party'])} ${pick(['tonight', 'tomorrow', 'sunday', 'today'])}?`,
  () => `${pick(['paid', 'sent', 'transferred'])} ${pick(slangYou)} the ${pick(amounts)} for ${pick(['the hotel', 'mums present', 'the plumber', 'dinner', 'the kids shoes'])}${pick([', check ur bank', '. should show by tmrw', ' x', ', let me know if it lands'])}`,
  () => `${pick(brands)} ${pick(['subscription', 'order', 'payment', 'bill'])} ${pick(['went through', 'is paid', 'renewed', 'shipped'])}${pick(['. nothing to do', '. all sorted', ', no action needed', ''])}${maybe('. details in the app', 0.4)}`,
  () => `${pick(['running late', 'stuck in traffic', 'on my way', 'leaving now'])}, ${pick(['be there in 20', 'start without me', 'save me a seat', 'put the kettle on'])}${maybe(' ' + pick(['x', 'xx', 'lol', ':)']), 0.6)}`,
  () => `${pick(['the', 'ur', 'your'])} ${pick(['parcel', 'package', 'amazon order', 'prescription'])} ${pick(['came', 'is here', 'got delivered', 'is at mine'])}, ${pick(['left it in the porch', 'ill bring it round', 'pick it up whenever', 'its by the door'])}`,
  () => `${pick(['dentist', 'doctor', 'hairdresser', 'optician', 'garage'])} ${pick(['confirmed', 'reminder', 'appt'])}: ${pick(['tue 10am', 'thurs 2:30', 'mon 9', 'fri 11:15'])}. ${pick(['reply C to confirm', 'call if u need to change it', 'see u then', 'bring ur glasses'])}`,
  () => `${pick(['can u', 'could u', 'pls'])} ${pick(['pay the window cleaner', 'pay the milkman', 'settle with the gardener', 'give the cleaner her money'])} if ${pick(['he', 'she', 'they'])} ${pick(['comes', 'come', 'turns up'])}? ${pick(['ill transfer u back', 'its ' + pick(amounts), 'cash is in the tin', 'i left the money on the side'])}`,
  () => `${pick(['won', 'we won', 'i won'])} ${pick(['12 quid', '$8', 'a tenner', '20'])} on the ${pick(['lottery', 'raffle', 'quiz', 'syndicate', 'bingo'])} ${pick(['lol', 'haha', '!!'])} ${pick(['drinks on me', 'putting it in the pot', 'next weeks ticket sorted', ''])}`,
  () => `${pick(['the', 'our'])} ${pick(['boiler', 'car', 'washing machine', 'fence', 'roof'])} ${pick(['is fixed', 'got serviced', 'is sorted', 'passed'])}. ${pick(['it was', 'cost', 'he charged'])} ${pick(amounts)}${pick([', paid him cash', ', receipt on the fridge', ', pay when ur passing', ' as quoted'])}`,
  () => `${pick(['grandma', 'nan', 'mum', 'dad'])} ${pick(['its', 'it is'])} ${pick(names)}${pick([', can u call me when ur free', ', miss u, call me sunday', ', the kids say hi', ', got ur card thank u'])}${maybe(' x', 0.6)}`,
  () => `${pick(['new number', 'changed my number', 'this is my new phone'])}, ${pick(['save it', 'its ' + pick(names), 'old one still works till friday', 'same whatsapp'])}${pick(['. no rush', '', ' x', '. see u sat'])}`,
  () => `${pick(['the', 'our'])} ${pick(['bank', 'credit union', 'building society'])} ${pick(['sorted', 'fixed', 'refunded'])} ${pick(['the double charge', 'the fee', 'the ' + pick(amounts)])}, ${pick(['nothing else to do', 'all good now', 'money is back in', 'she was lovely on the phone'])}`,
  () => `${pick(['donating', 'gave', 'sending'])} ${pick(amounts)} to ${pick(['the red cross', 'the food bank', 'the church roof', 'macmillan', 'the school fundraiser'])} ${pick(['through their website', 'at the counter', 'via the link they put in the newsletter', 'with the form'])}${maybe(', u in?', 0.5)}`,
  () => `${pick(['reminder', 'heads up', 'fyi'])}: ${pick(['bins are tomorrow', 'parking permit renews in may', 'tv licence is paid till march', 'council tax comes out on the 1st', 'phone contract ends in june'])}${pick(['. nothing to do', '. just so u know', '', '. all paid'])}`,
  () => `${pick(['got', 'received', 'picked up'])} the ${pick(['code', 'otp', 'verification text'])} for ${pick(['the gas account', 'my email', 'the netflix login', 'the doctors app'])} on my own phone, ${pick(['all logged in now', 'sorted', 'worked fine', 'thanks for the help'])}`,
  () => `${pick(['can u', 'could u', 'pls'])} ${pick(['check', 'look at', 'read'])} this ${pick(['text', 'email', 'message'])} i got? ${pick(['looks dodgy', 'not sure if its real', 'ignoring it for now', 'didnt tap anything'])}`,
  () => `${pick(['lunch', 'coffee', 'walk', 'film'])} ${pick(['sat', 'sunday', 'tmrw', 'thurs'])}? ${pick(['my treat', 'i owe u one', 'ur turn to pay lol', 'ill bring the cake'])}`,
];

const rows = [];
for (let i = 0; i < 1100; i++) rows.push([pick(scam)(), 'scam']);
for (let i = 0; i < 1100; i++) rows.push([pick(safe)(), 'safe']);
const seen = new Set();
const out = rows.filter(([t]) => { const k = t.toLowerCase().replace(/\s+/g, ' ').trim(); if (seen.has(k)) return false; seen.add(k); return true; });
const q = s => '"' + s.replace(/\s+/g, ' ').trim().replace(/"/g, '""') + '"';
writeFileSync(new URL('../ml/extra/short.csv', import.meta.url), 'text,label\n' + out.map(([t, l]) => q(t) + ',' + l).join('\n') + '\n');
console.log(out.length + ' rows (' + out.filter(r => r[1] === 'scam').length + ' scam, ' + out.filter(r => r[1] === 'safe').length + ' safe)');
