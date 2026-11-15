# ScamNet

One fine-tuned transformer (Microsoft MiniLM-L12-H384, 33 M parameters, int8 in
Core ML, 33.6 MB) that scores a text message 0 to 1 for scam or spam. It replaced
the Create ML BERT and maxent classifiers and the hashed word model on 14 Nov 2026,
after those flagged 39% of the real normal texts in the UCI SMS Spam Collection.

Runs on device in the app, the share sheet, the Messages drawer and the text
filter through `modules/scam-ai/ios/ScamNetRunner.swift` (WordPiece tokenizer plus
Core ML). Rules decide first; ScamNet may only raise a verdict, never lower one,
and it is only asked when the text could hold a pitch (`src/engine/guard.ts`).

## Data (real messages, deduplicated, label conflicts dropped)

| source | what it is | rows used |
|---|---|---|
| UCI SMS Spam Collection (same file as the Kaggle copy) | 5,574 real UK/Singapore texts | 4,737 |
| rasheq/scam-shield-sms: IMC 2025 scam corpus | 10,325 real scam texts | 10,325 |
| rasheq/scam-shield-sms: Mishra-Soni smishing set | real ham + smishing | 1,427 |
| rasheq/scam-shield-sms: synthetic safe | transactional notices | 4,955 |
| CloveAI/india-spam-sms | Indian bank and telecom texts | 5,586 |
| alusci/sms-otp-spam-dataset | OTP codes (normal) | 300 |
| Indian scam sets (karanverma19, Ridham115, English rows) | | 291 |
| Loop Me `ml/` hand-written elder-scam data | gift card, grandparent, bank | 4,120 |

Train 27,177 rows. Test 4,563 rows that were never trained on: the scam-shield
test split, a random 15% of UCI and Mishra-Soni, and every Loop Me bench set.

`fetch.sh` downloads the public files, `build_corpus.py` makes `corpus.csv`,
`train.py` fine-tunes (3 epochs, lr 4e-5, safe class weighted 1.3), `convert.py`
writes `ScamNet.mlmodel` + `ScamNet.vocab.txt` and checks Core ML against PyTorch.
Python 3.11, torch 2.5.1, transformers 4.46.3, coremltools 8.3 for the conversion.

## Third training run (15 Nov 2026, ships in build 17)

Half of the English rows from the twenty sets below joined training (23,027
rows, gandharvbakshi left out for its contradictory labels). The other halves,
24,236 English rows, were never trained on. Rules now raise their amber and red
lines on long text (from 40 words, up to 4x).

| group (held-out English halves) | rows | caught | false alarms |
|---|---|---|---|
| text messages and calls, 8 sets | 9,813 | 96.1% | 5.8% (model alone 1.5%) |
| real SMS and MMS (notd5a) | 2,817 | 91.1% | 2.4% |
| scam alert SMS and calls (tanu011235) | 1,872 | 97.7% | 1.4% |
| phone scam transcripts (menaattia) | 1,965 | 99.5% | 1.2% |
| UK confusables (sift) | 402 | 97.6% | 34.2% (rules on real prize and bank texts) |
| emails, 6 sets | 9,787 | 95.6% | 3.5% |
| job ads, 3 sets | 2,337 | 50.0% | 3.0% |
| comments, 2 sets | 3,168 | 79.5% | 1.8% |
| all 19 English sets | 24,236 | 93.5% | 4.9% |

These halves come from the same sources as the new training rows, so they are
easier than the fully unseen run below. Both are kept.

## Twenty unseen public sets (15 Nov 2026, nothing here was ever trained or tested on before)

50,280 rows after removing every text that appeared in training or earlier tests.
Scored with rules + ScamNet as shipped in build 16 (Latin-script guard on).

| type | dataset (Hugging Face) | rows | caught | false alarms |
|---|---|---|---|---|
| SMS | notd5a/malicious-benign-sms-mms-dataset (real rows) | 5,703 | 90.4% | 3.6% |
| SMS | gandharvbakshi/SMS-dataset-sample-10k | 3,476 | 63.7% | 14.8% |
| SMS (synthetic) | electricsheepafrica/africa-smishing-sms-phishing (English) | 1,687 | 96.7% | 8.0% |
| SMS (synthetic) | alissonpadua/ham-spam-scam-toxic | 137 | 100% | 0/3 |
| SMS + call transcripts | tanu011235/scam-alert-dataset | 3,814 | 85.0% | 18.4% |
| SMS (UK, confusables) | Gwen1220/sift-sms-dataset | 815 | 93.0% | 43.1% |
| SMS (benchmark) | dokster/adaption-scam-dataset-ru-en-v1 (English) | 515 | 83.4% | 4.5% |
| call transcripts | menaattia/phone-scam-dataset | 4,000 | 90.0% | 2.1% |
| Hinglish calls | ysangam/Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset | 654 | 39.4% | 0.0% |
| emails | SetFit/enron_spam (test) | 1,786 | 94.2% | 6.3% |
| emails | zefang-liu/phishing-email-dataset | 3,068 | 93.9% | 20.1% |
| emails | bvk/SpamAssassin-spam | 3,916 | 83.4% | 39.7% |
| emails | seuun/spam-ham-phish-emails-latest | 3,936 | 92.5% | 43.2% |
| emails + texts | David-Egea/phishing-texts | 2,747 | 92.9% | 22.0% |
| fraud emails | kudzaiprichard/aura-phishing-email-corpus (Nigerian + Nazario) | 2,953 | 96.2% | no normal rows |
| job ads | agnialf/Internship-Job-Scam-Dataset | 847 | 70.2% | 84.6% |
| job postings | victor/real-or-fake-fake-jobposting-prediction | 3,741 | 66.3% | 67.2% |
| job scams | sohaibdevv/Tech-Job-Scams-and-Predatory-Recruitment | 75 | 96.0% | no normal rows |
| comments | valurank/spam_ham_comments | 4,677 | 91.1% | 13.4% |
| comments | jason1966/ahsenwaheed_youtube-comments-spam-dataset | 1,733 | 46.9% | 12.8% |
| **text messages and calls, 8 sets** | | **20,147** | **85.7%** | **8.7%** |
| emails, 6 sets | | 18,406 | 93.0% | 31.6% |
| job ads, 3 sets | | 4,663 | 71.8% | 68.4% |
| comments, 2 sets | | 6,410 | 52.6% | 13.3% |
| all 20 | | 50,280 | 85.1% | 24.5% |

What the run found and what changed because of it:
- ScamNet said "scam" on 92% of Tamil, Hindi, Bengali and Chinese texts whatever they said (859 rows). Fixed in `guard.ts` and `Engine.swift`: the model abstains unless most letters are ASCII. Rules still run on those texts.
- On emails the model alone is at 0.8 to 1.8% false alarms; the rule layer is what pushes emails to 20 to 40%. Rules were written for text messages and fire on "verify", links and money words that are normal in email. Not changed yet.
- Job postings and comments are outside what the app is for; the numbers are listed so nobody mistakes them for text-message performance.
- gandharvbakshi labels OTP and bank debit alerts as phishing and investment ads as legitimate, so its numbers mostly measure label disagreement.
- sift-sms "normal" rows are legitimate prize-draw and bank fraud texts built to look like scams; the rules call most of them amber, which is the intended behavior for that app.

## Second training run (15 Nov 2026, the model that ships)

The first model only ever saw text messages as "normal" and flagged more than
half of ordinary emails, forum posts and call transcripts. Ten further public
sets were split in half by text hash; one half joined training, the other half
is the test below. Training rows: 47,479. Nothing in the test halves was trained on.

| held-out set (Hugging Face) | rows | caught | false alarms |
|---|---|---|---|
| sidzzz07/scamshield-dataset (English SMS) | 7,178 | 95.1% | 4.6% |
| Shade63/scam-classification-multiclass (Indian bank/telecom) | 3,918 | 100% | 6.1% (rules; model alone 0.07%) |
| mshenoda/spam-messages (SMS, email, forum mix) | 2,577 | 89.7% | 4.4% |
| anmolshrivastav/scam-ham-india | 1,091 | 96.3% | 2.6% |
| bolewara/hinglish-scam-text-dataset | 461 | 94.2% | 1.1% |
| flowxai/scamguardbench (built to confuse) | 184 | 97.5% | 25.2% (rules) |
| Deysi/spam-detection-dataset (forum posts) | 1,374 | 99.1% | 3.5% |
| ealvaradob/phishing-dataset (emails) | 1,825 | 94.8% | 20.4% (rules; model alone 0.9%) |
| BothBosu/scam-dialogue (call transcripts) | 154 | 100% | 29.7% (rules; model alone 0%) |
| thehamkercat/telegram-spam-ham (emails) | 1,504 | 93.4% | 4.6% |
| **all ten, 20,266 rows, rules + ScamNet as shipped** | 20,266 | **96.1%** | **6.4%** |
| all ten, ScamNet alone | 20,266 | 95.9% | 2.4% |
| UCI held-out (never trained) | 744 | 97.3% | 0.6% |
| Loop Me benches, rules + ScamNet | 772 | 93.5% | 1.8% |

Where the combined false-alarm rate is well above the model's own, the rules
are firing on long emails and transcripts ("verify", links, money words). Letting
ScamNet clear a rule amber when under 0.1 was measured and rejected: it cut
false alarms to 3.2% but cleared 31 of 432 bench scams, almost all non-English
or quiet elder cons. Rules stay in charge of those.

## First training run (14 Nov 2026), kept for the record

 (threshold 0.8, as shipped)

| | caught | false alarms |
|---|---|---|
| all 4,563 held-out rows (first run) | 94.3% | 1.24% |
| UCI (real texts, never trained on) | 106/110 = 96.4% | 12/634 = 1.9% |
| Mishra-Soni smishing | 72/72 | 5/569 = 0.9% |
| IMC 2025 scams | 2,318/2,418 = 95.9% | n/a (no ham) |
| Loop Me benches, model alone | 83.8% | 2/340 = 0.6% |
| Loop Me benches, rules + model (what the app does) | 93.8% | 3/340 = 0.9% |

Swift tokenizer + Core ML on the same rows: 94.3% caught, 1.30% false alarms,
3 to 4 ms per message on an M1. `scripts/check-scamnet.sh` (part of `npm test`)
fails the build if rules + model drop under 92% caught or over 1.5% false alarms
on the benches.

For comparison, the stack this replaced scored 86.9% caught and 38.9% false
alarms on the full UCI set; rules alone score 25% caught and 0.6% false alarms.

## Known limits

- English only. The `lang` bench (six other languages) is caught by rules, not the model.
- Still 1 to 2 false alarms per 100 odd, short, real texts ("Hey now am free you can call me."). More real ham would help most.
- The text filter extension loads the 33 MB model under its memory cap; confirmed in the simulator only. If iOS kills it on a phone, the filter falls back to rules.
