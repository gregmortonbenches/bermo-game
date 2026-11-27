import json,numpy as np,math
from PIL import Image,ImageDraw
from pyproj import Transformer
T=Transformer.from_crs(4326,27700,always_xy=True);E0,N0=532800,178200
d=np.load('/tmp/lidar/dsm.npy');t=np.load('/tmp/lidar/dtm.npy');nd=d-t;H,W=nd.shape
def ll(x,y):return (51.5055-(y-285)*0.7692/111195, -0.0754+(x-958)*0.7692/69330)
B=json.load(open('/tmp/lidar/world3d_orig.json'))['b']
m=Image.new('L',(W,H),0);dr=ImageDraw.Draw(m)
for b in B:
    if b[9]=='via':continue
    f=b[0];pts=[]
    for x,y in zip(f[0::2],f[1::2]):
        la,lo=ll(x,y);e,n=T.transform(lo,la);pts.append((e-E0,n-N0))
    dr.polygon(pts,fill=1)
m=np.array(m,bool)
bh=np.where(np.isfinite(nd),nd,0)>2.5  # "is a building-height thing" mask
best=[];
for dy in range(-12,13,2):
    for dx in range(-12,13,2):
        a=np.roll(np.roll(m,dy,0),dx,1)[20:-20,20:-20];b=bh[20:-20,20:-20]
        inter=(a&b).sum();iou=inter/((a|b).sum());best.append((iou,dx,dy))
best.sort(reverse=True);print('best',best[:4]);print('at 0,0',[x for x in best if x[1]==0 and x[2]==0])

print('--- per region, 1 m steps')
regs={'NW':(0,0,1400,1250),'NE':(1400,0,2800,1250),'SW':(0,1250,1400,2500),'SE':(1400,1250,2800,2500),'centre':(700,600,2100,1900)}
for nm,(a0,b0,a1,b1) in regs.items():
    res=[]
    for dy in range(-10,5):
        for dx in range(-8,9):
            a=np.roll(np.roll(m,dy,0),dx,1)[b0+15:b1-15,a0+15:a1-15];b=bh[b0+15:b1-15,a0+15:a1-15]
            res.append(((a&b).sum()/((a|b).sum()),dx,dy))
    res.sort(reverse=True);print(nm,[(round(float(r[0]),3),r[1],r[2]) for r in res[:2]])
