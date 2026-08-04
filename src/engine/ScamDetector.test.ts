// 120-message labeled test suite. Prints precision/recall/FP-rate. FAILS if FP-rate > 5%.
import { detect } from './ScamDetector';

type Case = [string, string]; // [message, category]
const SCAMS: Case[] = [
  ['Your account is locked. Buy a $200 iTunes gift card immediately and send the code.','giftcard'],
  ['This is Walmart support, settle your balance with Google Play cards today or account closes.','giftcard'],
  ['Pay the fine with Steam cards within 24 hours to avoid arrest.','giftcard'],
  ['Grandma its me, I got in an accident and im in jail, I need bail money, dont tell mom','family'],
  ['This is your grandson, I\u2019m in the hospital and need money wired now, please hurry','family'],
  ['Your granddaughter is in trouble with the police, send $2000 bail immediately','family'],
  ['USPS: your package is held pending a $1.99 redelivery fee: http://bit.ly/x8s2','package'],
  ['FedEx: address issue on parcel, pay customs fee here www.fedex-parcel.top','package'],
  ['UPS shipment unable to deliver, confirm address and pay fee http://ups.delivery-fix.xyz','package'],
  ['E-ZPass: unpaid toll balance of $6.99, settle now to avoid violation ezpass-pay.icu','toll'],
  ['FasTrak final notice: toll due, pay immediately at fastrak-billing.click','toll'],
  ['This is Chase. Please read me the 6-digit code we sent to verify your identity.','otp'],
  ['Bank of America security: share the one-time passcode to cancel the transfer','otp'],
  ['To unlock your account, send us the verification code you just received','otp'],
  ['Did you authorize a $899 Zelle to M. Rivera? Reply NO to dispute.','bank2stage'],
  ['Chase Fraud Alert: unauthorized charge of $451. Reply YES or NO.','bank2stage'],
  ['This is the fraud department, we need to move your funds to a safe account right away','safeaccount'],
  ['Your money is at risk, transfer your balance to this secure account we opened for you','safeaccount'],
  ['IRS notice: you owe back taxes, pay immediately or a warrant will be issued','gov'],
  ['Social Security Administration: your SSN is suspended, call immediately to avoid arrest','gov'],
  ['FBI: you are under investigation, do not tell your family or your attorney, stay on the line','arrest'],
  ['An arrest warrant has been issued. Do not contact anyone. Pay the bond now via bitcoin.','arrest'],
  ['You have won the Publishers Clearing House lottery! Claim your prize with a small fee','prize'],
  ['Congratulations you have been selected for a $1000 Walmart reward, click to claim','prize'],
  ['Your tax refund of $1,432 is pending, verify your bank details to claim it','refund'],
  ['Netflix: payment failed, update your payment information at netflix-billing.top','subscription'],
  ['Your Apple subscription expired, renew now at apple.account-verify.xyz','subscription'],
  ['We noticed an unusual sign-in on your Amazon account, verify at http://arnazon-secure.com','lookalike'],
  ['Suspicious login attempt. Confirm your identity: http://chase.secure-login.xyz','lookalike'],
  ['Verify your PayPal account now: http://paypa1-support.com/login','lookalike'],
  ['Security alert, click http://192.168.4.22/verify to restore access','ipurl'],
  ['Wells Fargo: account on hold, restore here http://tinyurl.com/wf-restore','shortener'],
  ['Hi is this Jessica? Oh sorry wrong number! But you seem nice, where are you from?','wrongnumber'],
  ['Sorry, wrong number! Anyway, I\u2019m Amy, nice to meet a new friend :)','wrongnumber'],
  ['I\u2019ve fallen for you my darling, soon we\u2019ll be together, but first help me with a small transfer','romance'],
  ['My dearest, destiny brought us together. My crypto portfolio doubled, let me teach you','pig'],
  ['I made $8,400 last month on a trading platform with guaranteed returns in USDT, want in?','pig'],
  ['Add me on WhatsApp to continue, my agent will set up your investment account','platformhop'],
  ['Chat with me on Telegram for the part time job, earn $500 a day no experience','jobscam'],
  ['Work from home, easy money, $300/day, apply now on WhatsApp','jobscam'],
  ['We can recover your money from the scam, our law firm needs a $500 retainer first','recovery'],
  ['Refund department: we retrieved your lost funds, pay the release fee to claim them','recovery'],
  ['Install AnyDesk so our technician can fix your computer and refund you','remoteaccess'],
  ['Microsoft support: your PC is infected, download TeamViewer immediately','remoteaccess'],
  ['Act now! Your Medicare benefits expire today, call this number immediately','urgencygov'],
  ['Final notice: your Costco membership reward expires tonight, claim at costco-rewards.vip','prize'],
  ['Your Venmo is limited. Verify your card at venmo.help-center.icu within 24 hours','verify'],
  ['Dear customer, your ATT bill is overdue, pay at att-billing.sbs to avoid disconnection','verify'],
  ['Buy bitcoin at the crypto ATM and deposit it to clear your name, keep this confidential','cryptosecrecy'],
  ['Your computer sent viruses to the government. Pay in crypto, do not discuss with anyone','cryptosecrecy'],
  ['Hello dear, I am a widowed engineer on an oil rig, I feel a connection, message me on WhatsApp','romance'],
  ['Your Spotify payment was declined, update billing at spotify-renew.top','subscription'],
  ['DHL parcel held at customs, pay 2.30 fee: rb.gy/dhl22','package'],
  ['You are eligible for a stimulus rebate, click here to verify your identity and claim','refund'],
  ['Your Wells Fargo account was compromised. A specialist will call to help secure your money.','bank2stage'],
  ['Amazon refund pending: we overcharged you $300, install this app so we can return it','remoteaccess'],
  ['This is urgent, wire $900 via Western Union today or lose the apartment deposit','payment'],
  ['Send the money by Zelle now, my phone is broken, this is your son','familypay'],
  ['Sweepstakes winner! To receive your car, pay taxes upfront via MoneyGram','prize'],
  ['Verify your Medicare card number now or your benefits will be suspended immediately','gov'],
  // — v3 additions: evasion, look-alikes, and newer scam families
  ['Yоur Аpple ID has been lоcked. Verify nоw at apple-id-verify.top','homoglyph'],
  ['Send me the gi​ft ca​rd codes right away please','zerowidth'],
  ['Update your billing information here: netfl1x-billing.com','lookalike-noname'],
  ['Your wallmart reward of $500 expires tonight: wallmart-rewards.com','lookalike-noname'],
  ['You are the beneficiary of an unclaimed estate of $2.4 million. Pay the transfer fee to claim your inheritance','advancefee'],
  ['We accidentally overpaid you $500. Deposit the check and send back the difference via Zelle','overpayment'],
  ['I have a video of you from your webcam. Pay $800 in bitcoin within 48 hours or I send it to every contact','sextortion'],
  ['Help hurricane victims today — donate with Apple gift cards, any amount helps','charity'],
  ['Your account will be frozen today. Call 888-402-1187 immediately to keep access','callback'],
  ['Scan this QR code to receive your $100 Zelle refund instantly','qrbait'],
  ['Coinbase support: to restore access, confirm your seed phrase with our agent','walletphrase'],
  ['Adorable teacup puppies ready today, just send the $200 shipping deposit via Zelle','petdeposit'],
  ['Microsoft alert: viruses were detected on your PC. Call now to avoid data loss','techsupport'],
  ['chase.com278282: your account needs verification, sign in here','gluedtld'],
];
const LEGIT: Case[] = [
  ['Hi Dad, running 10 min late for lunch, order me the soup please!','family'],
  ['Reminder: your appointment with Dr. Patel is Tuesday at 2pm. Reply C to confirm.','appointment'],
  ['Your dentist visit is tomorrow at 9am. Reply C to confirm or R to reschedule.','appointment'],
  ['Amazon: your order #114-2837465-991 has shipped. Arriving Thursday.','order'],
  ['Your order number 8823-AA71 was delivered to your front door.','order'],
  ['Thanks for your payment of $84.12 to PSE&G. Payment received.','receipt'],
  ['Your Chase verification code is 493022. Do not share this code with anyone.','otp-arriving'],
  ['Your one-time code is 88231. It expires in 10 minutes.','otp-arriving'],
  ['Google: your verification code is 552901','otp-arriving'],
  ['Mom, I\u2019ll pick you up at 4 for the doctor, love you','family'],
  ['Hey it\u2019s Sarah, are we still on for bridge Thursday?','social'],
  ['Your prescription is ready for pickup at CVS pharmacy #442.','pharmacy'],
  ['Wegmans: your grocery order is ready for pickup at 5pm.','order'],
  ['Your library books are due Friday. Renew online or return by 6pm.','civic'],
  ['PSEG: scheduled maintenance in your area Tuesday 1-3pm. No action needed.','utility'],
  ['Flight DL2231 is on time, departing gate B12 at 3:45pm.','travel'],
  ['Your table for 2 at Olive Garden is confirmed for 6:30 tonight.','reservation'],
  ['Verizon: your bill of $92.40 was paid. Thank you!','receipt'],
  ['Your package has been delivered. Photo available in the app.','order'],
  ['Church potluck moved to Saturday 5pm, bring your famous casserole!','social'],
  ['This is Dr. Kim\u2019s office confirming your annual physical on 3/14 at 10am.','appointment'],
  ['Uber: your driver Miguel is arriving in a white Camry, plate XJK-2214.','travel'],
  ['Netflix: a new device signed in. If this was you, no action is needed.','account'],
  ['Your Social Security statement is available. Sign in at ssa.gov to view it.','gov-real'],
  ['Costco: your photo order is ready at the membership desk.','order'],
  ['Hi Grandma! Can\u2019t wait to see you Sunday, I\u2019m bringing the kids','family'],
  ['Your electric bill is $118.22, due March 15. Pay in the PSEG app or by mail.','utility'],
  ['School closed tomorrow due to snow. All after-school activities canceled.','civic'],
  ['Hair appointment with Donna confirmed for Friday 11am. Reply C to confirm.','appointment'],
  ['Your car is ready for pickup at Honda service. Total: $212.50.','service'],
  ['Bridge club is at Helen\u2019s this week, 1pm. Bring cards!','social'],
  ['Reminder: HOA meeting Tuesday 7pm in the clubhouse.','civic'],
  ['AAA: your membership renews next month. No action needed today.','account'],
  ['Walgreens: flu shots now available, walk-ins welcome.','pharmacy'],
  ['Your Medicare card was mailed and should arrive in 7-10 days.','gov-real'],
  ['Bank of America: your statement is ready. Log in to your app to view.','bank-real'],
  ['Chase: you spent $43.12 at Shell. Not you? Check your app.','bank-real'],
  ['Your rent payment of $1,450 was received. Thank you!','receipt'],
  ['Aarav: landed safely, will call tonight!','family'],
  ['Book club picks: The Covenant of Water. See you Thursday at 2.','social'],
  ['Your Instacart order was delivered. Rate your shopper in the app.','order'],
  ['Jury duty reminder: report Monday 8:30am, County Courthouse room 210.','civic'],
  ['Comcast: technician arriving between 10-12 tomorrow as scheduled.','service'],
  ['Your photos from Walgreens are ready! Order #P-99213.','order'],
  ['Dinner at our place Sunday? Dad\u2019s making lasagna','family'],
  ['Your YMCA class is confirmed: Water Aerobics, Mon/Wed 9am.','social'],
  ['Prescription refill approved. Ready after 3pm today at CVS.','pharmacy'],
  ['Your Southwest flight check-in opens at 10:15am tomorrow.','travel'],
  ['Property tax payment received. Receipt #2024-8871.','receipt'],
  ['Hi it\u2019s Mike next door, your package was left with us, come by anytime','social'],
  ['Target: your pickup order is ready at Guest Services until 8pm.','order'],
  ['The pharmacy called: your new dose starts tomorrow, take with food.','pharmacy'],
  ['Your appointment with the eye doctor is confirmed for April 2 at 1:30.','appointment'],
  ['Zelle: you received $50.00 from Sarah Miller. It\u2019s in your account.','bank-real'],
  ['Your водоmeter reading is due — submit in the utility app this week.','utility'],
  ['Grandpa, beat my chess record! Rematch this weekend?','family'],
  ['Reminder from Trinity Church: choir practice Wednesday 7pm.','social'],
  ['DMV: your registration renewal was processed. New sticker mails in 2 weeks.','gov-real'],
  ['Your gym membership payment of $29 posted. Thanks!','receipt'],
  ['Lunch Thursday? My treat this time. — Carol','social'],
  // — v3 additions: messages that LOOK scam-adjacent but are the real thing
  ['Chase: We will never ask for your password or PIN. If you get such a call, hang up and call us directly.','bank-disclaimer'],
  ['Your Apple ID was used to sign in to iCloud on a new Mac. If this was you, no action is needed.','account-real'],
  ['Donate to the Red Cross at redcross.org or by calling 1-800-RED-CROSS.','charity-real'],
  ['Your Netflix plan price is changing next month. See details in your account settings.','subscription-real'],
  ['USPS: Your package was delivered at 2:14pm. Track more at usps.com.','delivery-real'],
  ['Grandpa, my recital is Friday at 6! Can you and grandma come?','family'],
  ['Reminder: flu clinic at the senior center Tuesday, walk-ins welcome, bring your Medicare card.','civic'],
  ['Wells Fargo: your requested statement is attached. Questions? Call the number on your card.','bank-real'],
];

let tp=0, fn=0, fp=0, tn=0; const misses:string[]=[], falses:string[]=[];
let maxMs = 0;
for (const [m, cat] of SCAMS) {
  const t0 = Date.now(); const v = detect(m); maxMs = Math.max(maxMs, Date.now()-t0);
  if (v.level === 'red' || v.level === 'amber') tp++; else { fn++; misses.push(`[${cat}] ${m.slice(0,60)}`); }
}
for (const [m, cat] of LEGIT) {
  const t0 = Date.now(); const v = detect(m); maxMs = Math.max(maxMs, Date.now()-t0);
  if (v.level === 'green') tn++; else { fp++; falses.push(`[${cat}→${v.level}] ${m.slice(0,60)} :: ${v.reason.slice(0,50)}`); }
}
// Feature-specific checks
const twoStage = detect('This is the Chase fraud department, we will move your money to a safe account', { recentTags: ['bank-alert'] });
const codeword = detect('Grandma its me your grandson, I\u2019m in jail and need bail money fast');
const postPanic = detect('Our recovery firm can get back your lost funds, small retainer required', { postPanic: true });
const allow = detect('Chase alert: unusual sign-in detected, verify now', { allowlist: ['chase'], sender: 'Chase 24273' });

const recall = tp/(tp+fn), fpRate = fp/(fp+tn), precisionOk = fpRate <= 0.05;
console.log(`\nSCAMS caught: ${tp}/${SCAMS.length}  (recall ${(recall*100).toFixed(1)}%)`);
console.log(`LEGIT passed: ${tn}/${LEGIT.length}  (false-positive rate ${(fpRate*100).toFixed(1)}%)`);
console.log(`Slowest verdict: ${maxMs}ms (budget 200ms)`);
console.log(`two-stage → ${twoStage.level} (${twoStage.tags.includes('two-stage')?'flagged':'MISSED'})`);
console.log(`code-word moment → ${codeword.codeWordMoment ? 'surfaced' : 'MISSED'}`);
console.log(`post-panic recovery guard → ${postPanic.level}`);
console.log(`allowlist → ${allow.level}`);
if (misses.length) { console.log('\nMISSED SCAMS:'); misses.forEach(x=>console.log('  '+x)); }
if (falses.length) { console.log('\nFALSE POSITIVES:'); falses.forEach(x=>console.log('  '+x)); }
const pass = recall >= 0.95 && precisionOk && maxMs < 200 && twoStage.level==='red' && codeword.codeWordMoment && postPanic.level==='red' && allow.level==='green';
console.log(pass ? '\nALL PASS' : '\nFAIL');
process.exit(pass ? 0 : 1);
