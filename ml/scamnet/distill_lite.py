# ScamNet Lite: a small BERT taught by ScamNet itself, for the text filter,
# which runs under a memory cap the full model does not fit in.
# Targets: ScamNet's own probability for every training text (score.swift)
# blended with the true label.
#   python ml/scamnet/distill_lite.py <teacher_p.txt> <out dir> [student] [epochs]
import sys, time, numpy as np, pandas as pd, torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, get_linear_schedule_with_warmup
from sklearn.metrics import precision_recall_fscore_support
TP, OUT = sys.argv[1], sys.argv[2]
STUDENT = sys.argv[3] if len(sys.argv) > 3 else 'google/bert_uncased_L-2_H-128_A-2'
EPOCHS = int(sys.argv[4]) if len(sys.argv) > 4 else 6
L, T, ALPHA, BS = 128, 2.0, 0.7, 64
dev = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')
df = pd.read_csv('ml/scamnet/lite_corpus.csv'); df['y'] = (df.label == 'scam').astype(int)
tp = np.loadtxt(TP); assert len(tp) == len(df), (len(tp), len(df)); df['tp'] = tp
df = df[df.text.notna()].copy(); df['text'] = df.text.astype(str)
tr = df[df.split == 'train'].sample(frac=1, random_state=0).reset_index(drop=True)
te = df[df.split == 'test'].reset_index(drop=True)
tok = AutoTokenizer.from_pretrained(STUDENT)
vocab = open('modules/scam-ai/ios/Resources/ScamNet.vocab.txt').read().split('\n')
assert [k for k, _ in sorted(tok.get_vocab().items(), key=lambda kv: kv[1])] == vocab[:len(tok.get_vocab())], 'student vocab differs from ScamNet vocab'
model = AutoModelForSequenceClassification.from_pretrained(STUDENT, num_labels=2).to(dev)
opt = torch.optim.AdamW(model.parameters(), lr=2e-4, weight_decay=0.01)
steps = EPOCHS * ((len(tr) + BS - 1) // BS); sch = get_linear_schedule_with_warmup(opt, int(0.06 * steps), steps)
w = torch.tensor([1.3, 1.0]).to(dev)
def enc(t): return tok(list(t), padding=True, truncation=True, max_length=L, return_tensors='pt')
def evaluate():
    model.eval(); P = []
    with torch.no_grad():
        for i in range(0, len(te), 512):
            e = {k: v.to(dev) for k, v in enc(te.text[i:i + 512]).items()}
            P.append(torch.softmax(model(**e).logits, -1)[:, 1].cpu().numpy())
    model.train(); return np.concatenate(P)
p = np.clip(tr.tp.values, 1e-4, 1 - 1e-4); tlog = np.stack([np.zeros_like(p), np.log(p / (1 - p))], 1).astype(np.float32)
t0 = time.time()
for ep in range(EPOCHS):
    perm = np.random.RandomState(ep).permutation(len(tr)); tot = 0
    for bi, i in enumerate(range(0, len(tr), BS)):
        idx = perm[i:i + BS]; e = {k: v.to(dev) for k, v in enc(tr.text.iloc[idx]).items()}
        y = torch.tensor(tr.y.values[idx]).to(dev); st = torch.tensor(tlog[idx]).to(dev)
        out = model(**e).logits
        soft = torch.nn.functional.kl_div(torch.log_softmax(out / T, -1), torch.softmax(st / T, -1), reduction='batchmean') * T * T
        loss = ALPHA * soft + (1 - ALPHA) * torch.nn.functional.cross_entropy(out, y, weight=w)
        loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0); opt.step(); sch.step(); opt.zero_grad(); tot += loss.item()
    pr = evaluate(); pred = (pr >= 0.5).astype(int); P, R, F, _ = precision_recall_fscore_support(te.y, pred, average='binary')
    print(f'== epoch {ep}: loss {tot / (bi + 1):.4f} test P {P:.3f} R {R:.3f} F1 {F:.3f} {time.time() - t0:.0f}s', flush=True)
model.save_pretrained(OUT); tok.save_pretrained(OUT)
pr = evaluate(); te['p'] = pr; te[['text', 'label', 'source', 'tp', 'p']].to_csv(OUT + '/test_scores.csv', index=False)
for t in (0.5, 0.7, 0.8, 0.9):
    pred = (pr >= t).astype(int); P, R, F, _ = precision_recall_fscore_support(te.y, pred, average='binary'); fp = ((pred == 1) & (te.y == 0)).sum() / (te.y == 0).sum()
    tpred = (te.tp >= t).astype(int); tP, tR, tF, _ = precision_recall_fscore_support(te.y, tpred, average='binary'); tfp = ((tpred == 1) & (te.y == 0)).sum() / (te.y == 0).sum()
    print(f't={t}: lite P {P:.3f} R {R:.3f} false-alarm {fp * 100:.2f}% | full ScamNet P {tP:.3f} R {tR:.3f} false-alarm {tfp * 100:.2f}%')
