import pandas as pd, re, json, random, sys, glob, os
R=os.environ.get('SCAMNET_RAW','ml/scamnet/raw'); LM='.'
rows=[]
def add(df,text,label,source,split=None):
    for t,l in zip(df[text],df[label]):
        if not isinstance(t,str): continue
        t=t.strip()
        if len(t)<2: continue
        rows.append(dict(text=t,label=l,source=source,split=split))
# UCI (official)
u=pd.read_parquet(f'{R}/uci.parquet'); u['y']=u['label'].map({0:'safe',1:'scam'}); add(u,'sms','y','uci')
# scam-shield (mishra_soni smishing + IMC2025 scams + synthetic safe)
for part in ['train','val','test']:
    d=pd.read_csv(f'{R}/scamshield_{part}.csv'); d['src']='ss_'+d['source'].astype(str)
    for src,g in d.groupby('src'): add(g,'text','label',src, 'test' if part=='test' else None)
# OTP messages are normal
o=pd.read_csv(f'{R}/otp.csv').drop_duplicates('sms_text').sample(300,random_state=1); o['y']='safe'; add(o,'sms_text','y','otp')
# India spam (clove)
try:
    c=pd.read_parquet(f'{R}/clove.parquet'); c['y']=c['label'].map({0:'safe',1:'scam'}); add(c,'text','y','clove')
except Exception as e: print('clove',e)
# Indian scam (small, has English rows)
i=pd.read_csv(f'{R}/indian_scam.csv'); i=i[i['language'].astype(str).str.lower()=='english']; i['y']=i['label'].map({'scam':'scam','legit':'safe'}); add(i,'message','y','indian')
# Ridham synthetic audited: only english
rd=pd.read_csv(f'{R}/ridham.csv'); rd=rd[rd['language'].astype(str).str.startswith('en')]; add(rd,'text','label','ridham')
# Loop Me's own hand-written scam-focused data (elder scams)
for f in [f'{LM}/ml/scam-train.csv', f'{LM}/ml/scam-test.csv']+glob.glob(f'{LM}/ml/extra/*.csv'):
    try:
        d=pd.read_csv(f); cols={c.lower():c for c in d.columns}
        tcol=cols.get('text') or list(d.columns)[0]; lcol=cols.get('label') or list(d.columns)[1]
        d['y']=d[lcol].astype(str).str.lower().map(lambda v: 'scam' if v in('scam','spam','1') else 'safe')
        name=os.path.basename(f).replace('.csv','')
        if name in ('noisy','short') and len(d)>700: d=d.sample(700,random_state=3)
        add(d,tcol,'y','loopme_'+name)
    except Exception as e: print('skip',f,e)
# Loop Me benches (never trained on before) -> test only
b=pd.read_csv(f'{LM}/ml/bench.csv'); b['y']=b['label'].map({'scam':'scam','safe':'safe'}); 
for s,g in b.groupby('set'): add(g,'text','y','lm_bench_'+s,'test')
df=pd.DataFrame(rows); df['label']=df['label'].astype(str).str.lower().map(lambda v:'scam' if v in('scam','spam','1','smishing') else 'safe')
norm=lambda t: re.sub(r'\s+',' ',re.sub(r'\d+','0',t.lower())).strip()
df['key']=df['text'].map(norm)
print('before dedupe',len(df)); 
# conflicts: same text different label -> drop both
conf=df.groupby('key')['label'].nunique(); bad=set(conf[conf>1].index); df=df[~df['key'].isin(bad)]
print('dropped conflicting',len(bad))
# test rows keep priority so they never leak into train
df=df.sort_values('split',na_position='last').drop_duplicates('key')
# split: explicit test rows, plus 15% of each big real source held out
random.seed(7)
def assign(r):
    if r['split']=='test': return 'test'
    if r['source'] in ('uci','ss_mishra_soni','ss_imc2025') and random.random()<0.15: return 'test'
    return 'train'
df['split']=df.apply(assign,axis=1)
print(df.groupby(['split','label']).size()); print(df[df.split=='train'].groupby(['source','label']).size().to_string())
df[['text','label','source','split']].to_csv('corpus.csv',index=False)
