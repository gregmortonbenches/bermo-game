import json,numpy as np,pickle,math
from PIL import Image,ImageDraw
from pyproj import Transformer
from scipy.ndimage import binary_erosion
T=Transformer.from_crs(4326,27700,always_xy=True);E0,N0=532800,178200
d=np.load('/tmp/lidar/dsm.npy');t=np.load('/tmp/lidar/dtm.npy');nd=d-t;H,W=nd.shape
def ll(x,y):return (51.5055-(y-285)*0.7692/111195, -0.0754+(x-958)*0.7692/69330)
B=json.load(open('/tmp/lidar/world3d_orig.json'))['b']  # geometry same as current
def minrect(pts):
    P=np.array(pts);best=None
    for a in np.arange(0,90,3):
        c,s=math.cos(math.radians(a)),math.sin(math.radians(a));R=np.array([[c,s],[-s,c]]);Q=P@R.T
        w=Q[:,0].max()-Q[:,0].min();h=Q[:,1].max()-Q[:,1].min()
        if best is None or w*h<best[0]:best=(w*h,a,w,h)
    return best
out={}
for i,b in enumerate(B):
    f=b[0];E=[];N=[]
    for x,y in zip(f[0::2],f[1::2]):
        la,lo=ll(x,y);e,n=T.transform(lo,la);r=n-N0;E.append(e-E0+1.0);N.append(r+0.0055*r-9.4)  # game map drift vs LiDAR grid, measured by footprint overlap
    if min(E)<2 or max(E)>W-2 or min(N)<2 or max(N)>H-2:continue
    ar,ang,wd,ht=minrect(list(zip(E,N)))
    if ar<30:continue
    x0,x1,y0,y1=int(min(E))-1,int(max(E))+2,int(min(N))-1,int(max(N))+2
    m=Image.new('L',(x1-x0,y1-y0),0);ImageDraw.Draw(m).polygon([(e-x0,n-y0) for e,n in zip(E,N)],fill=1);m=np.array(m,bool)
    inn=binary_erosion(m,iterations=1) if m.sum()>60 else m
    yy,xx=np.nonzero(inn)
    if len(yy)<20:continue
    v=nd[y0:y1,x0:x1][yy,xx];ok=np.isfinite(v)&(v>-1);yy,xx,v=yy[ok],xx[ok],v[ok]
    if len(v)<20:continue
    c,s=math.cos(math.radians(ang)),math.sin(math.radians(ang))
    px=xx+x0+.5;py=yy+y0+.5
    U=px*c+py*s;V=-px*s+py*c
    # long axis = larger extent
    if (U.max()-U.min())<(V.max()-V.min()):U,V=V,U
    short=V;vn=(short-short.min())/max(short.max()-short.min(),1e-6)*2-1;un=(U-U.min())/max(U.max()-U.min(),1e-6)
    bins=np.linspace(-1,1,8);prof=[]
    for k in range(7):
        s_=(vn>=bins[k])&(vn<bins[k+1]);prof.append(np.median(v[s_]) if s_.sum()>=3 else np.nan)
    prof=np.array(prof)
    if np.isnan(prof).sum()>2:continue
    edge=np.nanmean([prof[0],prof[1],prof[5],prof[6]]);ctr=np.nanmax(prof[2:5])
    rise=float(ctr-edge)
    iqr=float(np.percentile(v,90)-np.percentile(v,10))
    # symmetric tent: both flanks lower than the centre
    L=np.nanmean(prof[:3]);R=np.nanmean(prof[4:]);tent=bool(ctr>L+0.4 and ctr>R+0.4)
    # ridge continuity along the long axis: centre-strip medians
    cs=np.abs(vn)<.35;segs=[np.median(v[cs&(un>=a)&(un<a+.25)]) if (cs&(un>=a)&(un<a+.25)).sum()>=3 else np.nan for a in (0,.25,.5,.75)]
    out[i]=dict(rise=rise,iqr=iqr,tent=tent,wid=float(min(wd,ht)),len=float(max(wd,ht)),area=float(ar),ridgevar=float(np.nanstd(segs)),h=float(np.percentile(v,85)))
pickle.dump(out,open('/tmp/lidar/roofs.pkl','wb'))
r=np.array([o['rise'] for o in out.values()]);ti=np.array([o['tent'] for o in out.values()]);iq=np.array([o['iqr'] for o in out.values()])
print('classified',len(out),'tent',ti.sum(),'rise>1.2',(r>1.2).sum(),'iqr<0.7',(iq<0.7).sum())
for lo,hi in((-9,0.5),(0.5,1),(1,1.5),(1.5,2.5),(2.5,4),(4,9)):print(f'rise {lo}..{hi}: {((r>=lo)&(r<hi)).sum()}')
