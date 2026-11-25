# Training and test rows for ScamNet Lite, the model the text filter runs.
# Base: build_corpus.py sources. Plus public text-message sets, each split in
# half by an md5 of the text: odd hashes are the test half and never trained on.
#   python ml/scamnet/build_corpus.py && python ml/scamnet/build_lite_corpus.py
import pandas as pd, json, hashlib, re, os
R='ml/scamnet/raw/sms'
def latin(t):
    L=[c for c in str(t) if c.isalpha()]; return (sum(c.isascii() for c in L)/len(L)) if L else 1.0
rows=[]
def add(name,texts,labels,cap=None):
    pairs=[(str(t).strip()[:1200],'scam' if l else 'safe') for t,l in zip(texts,labels) if isinstance(t,str) and len(str(t).strip())>=4]
    if cap and len(pairs)>cap:
        import random; pairs=random.Random(7).sample(pairs,cap)
    rows.extend((name,t,l) for t,l in pairs); print(f'{name:22s}{len(pairs):7d}')
d=pd.read_csv(f'{R}/notd5a.csv'); d=d[d.ai_generated==0]; add('notd5a',d.message,d.label.eq(1),20000)
d=pd.concat([pd.read_csv(f'{R}/mshenoda_train.csv'),pd.read_csv(f'{R}/mshenoda_test.csv')]); add('mshenoda',d.text,d.label.eq('spam'),15000)
d=pd.read_csv(f'{R}/india.csv'); add('india',d.text,d.label.eq('spam'))
s=[json.loads(l) for f in ('sidz_train.jsonl','sidz_test.jsonl') for l in open(f'{R}/{f}')]; s=[r for r in s if r.get('language')=='English']
add('sidz',[r['text'] for r in s],[r['is_scam']==1 for r in s],20000)
d=pd.concat([pd.read_parquet(f'{R}/tanu_train.parquet'),pd.read_parquet(f'{R}/tanu_test.parquet')]); add('tanu',d.text,d.label.astype(str).eq('1'),15000)
d=pd.concat([pd.read_csv(f'{R}/phonescam_train.csv'),pd.read_csv(f'{R}/phonescam_test.csv')]); add('phonescam',d.dialogue,d.label.eq(1))
d=pd.read_parquet(f'{R}/africa.parquet'); d=d[d.lang_english.astype(str)=='1']; add('africa',d.sms_text,d.label.astype(str).eq('1'))
d=pd.concat([pd.read_csv(f'{R}/sift_train.csv'),pd.read_csv(f'{R}/sift_test.csv')]); add('sift',d.text,d.label.astype(str).isin(['1','scam']))
ext=pd.DataFrame(rows,columns=['source','text','label'])
ext=ext[ext.text.map(latin)>=0.95]
ext['split']=ext.text.map(lambda t:'test' if int(hashlib.md5(t.encode()).hexdigest(),16)%2 else 'train')
base=pd.read_csv('corpus.csv') if os.path.exists('corpus.csv') else pd.read_csv('ml/scamnet/corpus.csv')
df=pd.concat([base[['text','label','source','split']],ext[['text','label','source','split']]],ignore_index=True)
norm=lambda t: re.sub(r'\s+',' ',re.sub(r'\d+','0',str(t).lower())).strip()
df['key']=df.text.map(norm); df=df.sort_values('split').drop_duplicates('key')  # 'test' sorts before 'train', so a text in both keeps its test copy and never trains
df=df.drop(columns='key')
df.to_csv('ml/scamnet/lite_corpus.csv',index=False)
print(df.groupby(['split','label']).size().to_string())
