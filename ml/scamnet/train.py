import pandas as pd, numpy as np, torch, time, json, sys
from torch.utils.data import DataLoader, Dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, get_linear_schedule_with_warmup
from sklearn.metrics import precision_recall_fscore_support
MODEL=sys.argv[1] if len(sys.argv)>1 else 'microsoft/MiniLM-L12-H384-uncased'
OUT=sys.argv[2] if len(sys.argv)>2 else 'out_minilm'
EPOCHS=int(sys.argv[3]) if len(sys.argv)>3 else 3
MAXLEN=128; BS=32; LR=4e-5
dev=torch.device('mps' if torch.backends.mps.is_available() else 'cpu')
df=pd.read_csv('corpus.csv'); df['y']=(df.label=='scam').astype(int)
tr=df[df.split=='train'].sample(frac=1,random_state=0); te=df[df.split=='test']
tok=AutoTokenizer.from_pretrained(MODEL)
class DS(Dataset):
    def __init__(s,d): s.t=d.text.tolist(); s.y=d.y.tolist()
    def __len__(s): return len(s.t)
    def __getitem__(s,i): return s.t[i], s.y[i]
def collate(b):
    t,y=zip(*b); e=tok(list(t),padding=True,truncation=True,max_length=MAXLEN,return_tensors='pt'); e['labels']=torch.tensor(y); return e
dl=DataLoader(DS(tr),batch_size=BS,shuffle=True,collate_fn=collate); dlt=DataLoader(DS(te),batch_size=128,collate_fn=collate)
model=AutoModelForSequenceClassification.from_pretrained(MODEL,num_labels=2).to(dev)
opt=torch.optim.AdamW(model.parameters(),lr=LR,weight_decay=0.01)
steps=EPOCHS*len(dl); sch=get_linear_schedule_with_warmup(opt,int(0.06*steps),steps)
# weight the safe class a little: a false alarm costs more than a miss for this app
w=torch.tensor([1.3,1.0]).to(dev)
def evaluate():
    model.eval(); P=[]
    with torch.no_grad():
        for b in dlt:
            b={k:v.to(dev) for k,v in b.items()}; b.pop('labels')
            P.append(torch.softmax(model(**b).logits,-1)[:,1].cpu().numpy())
    model.train(); return np.concatenate(P)
t0=time.time()
for ep in range(EPOCHS):
    tot=0
    for i,b in enumerate(dl):
        b={k:v.to(dev) for k,v in b.items()}; y=b.pop('labels')
        loss=torch.nn.functional.cross_entropy(model(**b).logits,y,weight=w)
        loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(),1.0); opt.step(); sch.step(); opt.zero_grad(); tot+=loss.item()
        if i%200==0: print(f'ep{ep} step{i}/{len(dl)} loss {tot/(i+1):.4f} {time.time()-t0:.0f}s',flush=True)
    p=evaluate(); pred=(p>=0.5).astype(int)
    pr,rc,f1,_=precision_recall_fscore_support(te.y,pred,average='binary')
    print(f'== epoch {ep}: test P {pr:.3f} R {rc:.3f} F1 {f1:.3f}',flush=True)
model.save_pretrained(OUT); tok.save_pretrained(OUT)
p=evaluate(); te=te.copy(); te['p']=p; te.to_csv(OUT+'/test_scores.csv',index=False)
print('\nPer-source at threshold 0.5 / 0.8 / 0.9')
for src,g in te.groupby('source'):
    line=f'{src:20s} n={len(g):5d}'
    for t in (0.5,0.8,0.9):
        pred=(g.p>=t); scam=g.y==1
        caught=(pred&scam).sum(); fp=(pred&~scam).sum()
        line+=f' | t{t}: caught {caught}/{scam.sum()} fp {fp}/{(~scam).sum()}'
    print(line)
for t in (0.5,0.7,0.8,0.9,0.95):
    pred=(te.p>=t).astype(int); pr,rc,f1,_=precision_recall_fscore_support(te.y,pred,average='binary'); fpr=((pred==1)&(te.y==0)).sum()/(te.y==0).sum()
    print(f'ALL t={t}: precision {pr:.3f} recall {rc:.3f} F1 {f1:.3f} false-alarm {fpr*100:.2f}%')
