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

## Results on the held-out test set (threshold 0.8, as shipped)

| | caught | false alarms |
|---|---|---|
| all 4,563 held-out rows | 94.3% | 1.24% |
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
