# The learned models

Two Create ML text classifiers ship inside the app. Both are trained here,
from the same data, and both run fully on the phone.

| model | where it runs | algorithm | size | cost per message | threshold |
|---|---|---|---|---|---|
| `ScamText` | the app, the share sheet | BERT transfer learning | 1.4 MB, about 70 MB RAM at inference | 15 to 30 ms | 0.8 |
| `ScamFilter` | the text filter extension | maximum entropy bag of words | 0.1 MB | under 1 ms | 0.6 |

The filter gets the small one because iOS runs message filter extensions
under a tight memory cap.

Either model may only **raise** a verdict: green to amber, amber to red when
it is above 0.9. Neither can lower a rule hit. That policy is in
`src/engine/ai.ts` (`upgrade`) and `ios/Shared/Engine/CoreModel.swift`
(`Engine.fuse`), and it is the same in both places.

## Data

- `scam-train.csv`, `scam-test.csv`: the original hand-written set.
- `extra/templates.csv`: a capped sample of `scripts/train/corpus.mjs`, at
  most 12 rows per template so no phrasing dominates.
- `extra/legit-hard.csv`: benign messages on scam-adjacent topics (refund
  credited, payment blocked, dormant account, prescription ready). This file
  is what took false alarms from 32 percent to under 3.
- `extra/scam-hard.csv`, `extra/round2.csv`, `extra/round3.csv`: long-tail
  cons and their benign cousins, written in later rounds.

Any training row whose text also appears in `bench.csv` is dropped before
training, so the scores below are not memorisation.

## Benchmarks

`bench.csv` is written by `node --experimental-strip-types scripts/export-bench.mjs`
from every set in `scripts/bench/` plus the unit suite, with the rule engine's
own verdict in a fourth column. Nothing in it is trained on.

`blind.mjs` and `blind2.mjs` were written after the model was trained and were
not looked at while tuning. `blind2` was never touched at all. Quote those.

## Commands

```bash
node --experimental-strip-types scripts/export-bench.mjs   # refresh bench.csv
swift ml/train.swift bert                                   # train, save to ml/out, score
swift ml/train.swift maxent
swift ml/eval.swift ml/out/ScamText-bert.mlmodel --verbose  # score a saved model
cp ml/out/ScamText-bert.mlmodel modules/scam-ai/ios/Resources/ScamText.mlmodel
cp ml/out/ScamText-maxent.mlmodel ios/Shared/Engine/ScamFilter.mlmodel
scripts/ios/add-extensions.sh                               # keeps the Xcode targets in step
```

Training the BERT model takes about five minutes on an M-series Mac.
