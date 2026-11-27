import json,pickle,numpy as np,re,collections
p='/tmp/lidar/world3d_orig.json'
raw=open(p).read();w=json.loads(raw);B=w['b']
res=pickle.load(open('/tmp/lidar/res.pkl','rb'))
SKIP=re.compile(r'Tower Bridge|Shard|City Hall|HMS|Tower of London|London Bridge',re.I)
chg=[];log=collections.Counter()
for i,r,st in res:
    b=B[i];nm=b[4] or ''
    if st!='ok':log[st]+=1;continue
    if b[9]=='via':log['viaduct']+=1;continue
    if SKIP.search(nm):log['landmark']+=1;continue
    if r['area']<15:log['tiny']+=1;continue
    # robust roof height: high percentile, but not far above the typical roof (tree overhang / rooftop plant)
    new=min(r['p85'],r['p50']+4.0)
    if r['p85']<2.2:log['lidar_too_low']+=1;continue
    old=b[1];ratio=new/max(old,1)
    if ratio<0.45 or ratio>2.2:log['disagree_keep_osm']+=1;continue
    new=round(float(np.clip(new,2.6,120)),1)
    if abs(new-old)>=0.3:chg.append((i,old,new,b[2],nm))
    b[1]=new;log['applied']+=1
print(dict(log))
d=np.array([c[2]-c[1] for c in chg]);print('changed',len(chg),'mean diff',d.mean().round(2),'abs mean',np.abs(d).mean().round(2),'p5/p95',np.percentile(d,[5,95]).round(1))
print('distinct heights now',len(set(b[1] for b in B)))
fmt=json.dumps(w,separators=(',',':'),ensure_ascii=False)
open('/tmp/lidar/world3d_new.json','w').write(fmt);print('sizes',len(raw),len(fmt),'orig compact?',raw[:60].count(' ')<3)
import random;random.seed(2)
for c in random.sample(chg,8):print(c)
