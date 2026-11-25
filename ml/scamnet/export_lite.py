# Writes ScamNet Lite (a trained BertForSequenceClassification) into the
# ScamNetLite.bin format read by modules/scam-ai/ios/ScamNetLite.swift.
# The word table is stored as int8 with one scale per row; everything else
# is float32. Also prints the file size.
#   python ml/scamnet/export_lite.py <model dir> modules/scam-ai/ios/Resources/ScamNetLite.bin
import sys, json, struct, numpy as np, torch
from transformers import AutoModelForSequenceClassification
src, dst = sys.argv[1], sys.argv[2]
m = AutoModelForSequenceClassification.from_pretrained(src).eval()
sd = {k: v.detach().float().numpy() for k, v in m.state_dict().items()}
c = m.config
T = {}
W = sd['bert.embeddings.word_embeddings.weight']
scale = np.maximum(np.abs(W).max(1), 1e-8) / 127.0
T['emb.word.q'] = np.clip(np.round(W / scale[:, None]), -127, 127).astype(np.int8)
T['emb.word.scale'] = scale.astype(np.float32)
T['emb.pos'] = sd['bert.embeddings.position_embeddings.weight']
T['emb.type'] = sd['bert.embeddings.token_type_embeddings.weight']
T['emb.ln.g'] = sd['bert.embeddings.LayerNorm.weight']; T['emb.ln.b'] = sd['bert.embeddings.LayerNorm.bias']
for i in range(c.num_hidden_layers):
    p = f'bert.encoder.layer.{i}.'
    for short, name in [('q', 'attention.self.query'), ('k', 'attention.self.key'), ('v', 'attention.self.value'),
                        ('ao', 'attention.output.dense'), ('fi', 'intermediate.dense'), ('fo', 'output.dense')]:
        T[f'l{i}.{short}.w'] = sd[p + name + '.weight']; T[f'l{i}.{short}.b'] = sd[p + name + '.bias']
    T[f'l{i}.ln1.g'] = sd[p + 'attention.output.LayerNorm.weight']; T[f'l{i}.ln1.b'] = sd[p + 'attention.output.LayerNorm.bias']
    T[f'l{i}.ln2.g'] = sd[p + 'output.LayerNorm.weight']; T[f'l{i}.ln2.b'] = sd[p + 'output.LayerNorm.bias']
T['pool.w'] = sd['bert.pooler.dense.weight']; T['pool.b'] = sd['bert.pooler.dense.bias']
T['cls.w'] = sd['classifier.weight']; T['cls.b'] = sd['classifier.bias']
assert c.hidden_act == 'gelu', c.hidden_act
cfg = dict(hidden=c.hidden_size, layers=c.num_hidden_layers, heads=c.num_attention_heads, inter=c.intermediate_size, eps=c.layer_norm_eps, vocab=c.vocab_size)
# Lay out with 16-byte alignment. The header size depends on offsets, so fix the header room first.
names = list(T.keys()); meta = {}
room = 8192
off = 8 + room
blobs = []
for n in names:
    a = np.ascontiguousarray(T[n]); off = (off + 15) // 16 * 16
    meta[n] = dict(offset=off, count=int(a.size), dtype=('i8' if a.dtype == np.int8 else 'f32'))
    blobs.append((off, a.astype(np.int8) if a.dtype == np.int8 else a.astype('<f4'))); off += a.nbytes
header = json.dumps(dict(config=cfg, tensors=meta)).encode()
assert len(header) <= room, len(header)
with open(dst, 'wb') as f:
    f.write(b'SNL1'); f.write(struct.pack('<I', len(header))); f.write(header); f.write(b'\0' * (room - len(header)))
    for o, a in blobs:
        f.write(b'\0' * (o - f.tell())); f.write(a.tobytes())
print(cfg, f'{off / 1e6:.2f} MB')
