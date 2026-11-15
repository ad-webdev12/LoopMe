# torch checkpoint -> Core ML (neural network format so Xcode treats it like the old .mlmodel files)
import sys, torch, numpy as np, coremltools as ct, shutil, os
from transformers import AutoTokenizer, AutoModelForSequenceClassification
SRC=sys.argv[1]; OUT=sys.argv[2]; L=128
tok=AutoTokenizer.from_pretrained(SRC); m=AutoModelForSequenceClassification.from_pretrained(SRC,attn_implementation='eager').eval()
class W(torch.nn.Module):
    def __init__(s,m): super().__init__(); s.m=m
    def forward(s,ids,mask): return torch.softmax(s.m(input_ids=ids,attention_mask=mask).logits,-1)[:,1]
w=W(m)
ids=torch.ones(1,L,dtype=torch.int32); mask=torch.ones(1,L,dtype=torch.int32)
tr=torch.jit.trace(w,(ids,mask))
ml=ct.convert(tr,inputs=[ct.TensorType(name='input_ids',shape=(1,L),dtype=np.int32),ct.TensorType(name='attention_mask',shape=(1,L),dtype=np.int32)],
              outputs=[ct.TensorType(name='scamProbability')],convert_to='neuralnetwork',minimum_deployment_target=ct.target.iOS14)
ml=ct.models.neural_network.quantization_utils.quantize_weights(ml,nbits=8)
ml.short_description='Loop Me ScamNet: fine-tuned MiniLM scam/spam classifier'
ml.save(OUT+'/ScamNet.mlmodel')
tok.save_vocabulary(OUT,'scamnet'); os.replace(os.path.join(OUT,'scamnet-vocab.txt'),OUT+'/ScamNet.vocab.txt')
# parity check against torch on a few strings
import json
tests=["Advithrao6@gmail.com","Your account is locked. Buy a $200 iTunes gift card and send the code.","ok see you at 5","Grandma its me, I'm in jail and need bail money, dont tell mom","Sorry, I'll call later in meeting."]
e=tok(tests,padding='max_length',truncation=True,max_length=L,return_tensors='pt')
with torch.no_grad(): pt=w(e['input_ids'].int(),e['attention_mask'].int()).numpy()
out=[]
for i,t in enumerate(tests):
    r=ml.predict({'input_ids':e['input_ids'][i:i+1].numpy().astype(np.int32),'attention_mask':e['attention_mask'][i:i+1].numpy().astype(np.int32)})
    out.append((t,float(pt[i]),float(np.array(r['scamProbability']).ravel()[0])))
for t,a,b in out: print(f'torch {a:.3f} coreml {b:.3f}  {t}')
json.dump([{'text':t,'p':b} for t,a,b in out],open(OUT+'/parity.json','w'))
print('size MB', os.path.getsize(OUT+'/ScamNet.mlmodel')/1e6)
