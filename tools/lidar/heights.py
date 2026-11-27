import json,numpy as np
from PIL import Image,ImageDraw
from pyproj import Transformer
from scipy.ndimage import binary_erosion
T=Transformer.from_crs(4326,27700,always_xy=True)
E0,N0=532800,178200
d=np.load('/tmp/lidar/dsm.npy');t=np.load('/tmp/lidar/dtm.npy');nd=d-t
H,W=nd.shape
def ll(x,y):return (51.5055-(y-285)*0.7692/111195, -0.0754+(x-958)*0.7692/69330)
w=json.load(open('/home/claude/bermo-game/world3d.json'));B=w['b']
out=[]
for i,b in enumerate(B):
    f=b[0];xs=f[0::2];ys=f[1::2]
    E=[];N=[]
    for x,y in zip(xs,ys):
        la,lo=ll(x,y);e,n=T.transform(lo,la);E.append(e-E0);N.append(n-N0)
    if min(E)<2 or max(E)>W-2 or min(N)<2 or max(N)>H-2:out.append((i,None,'edge'));continue
    x0,x1,y0,y1=int(min(E))-1,int(max(E))+2,int(min(N))-1,int(max(N))+2
    m=Image.new('L',(x1-x0,y1-y0),0);ImageDraw.Draw(m).polygon([(e-x0,n-y0) for e,n in zip(E,N)],fill=1);m=np.array(m,bool)
    area=m.sum()
    if area<10:out.append((i,None,'small'));continue
    inner=binary_erosion(m,iterations=1) if area>40 else m
    if inner.sum()<6:inner=m
    v=nd[y0:y1,x0:x1][inner];v=v[np.isfinite(v)]
    if len(v)<5:out.append((i,None,'novalid'));continue
    out.append((i,dict(p50=float(np.percentile(v,50)),p85=float(np.percentile(v,85)),p95=float(np.percentile(v,95)),mx=float(v.max()),area=int(area),cat=b[2],osm=b[1],nm=b[4]),'ok'))
import pickle;pickle.dump(out,open('/tmp/lidar/res.pkl','wb'))
ok=[o for o in out if o[2]=='ok'];print('ok',len(ok),'of',len(out),{k:sum(1 for o in out if o[2]==k) for k in('edge','small','novalid')})
osm=np.array([o[1]['osm'] for o in ok]);p85=np.array([o[1]['p85'] for o in ok]);p50=np.array([o[1]['p50'] for o in ok])
print('corr osm vs p85',np.corrcoef(osm,p85)[0,1],'median ratio',np.median(p85/np.maximum(osm,1)))
for lo,hi in((0,4),(4,8),(8,12),(12,20),(20,60),(60,200)):
    s=(osm>=lo)&(osm<hi);print(f'osm {lo}-{hi}: n={s.sum()} lidar p85 median={np.median(p85[s]) if s.any() else 0:.1f} p50 median={np.median(p50[s]) if s.any() else 0:.1f}')
