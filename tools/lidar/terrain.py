# Visual terrain heights from EA LiDAR DTM -> terrain.png (8 bit, 8 m cells, relative to the Thames bank).
import numpy as np
from PIL import Image
from pyproj import Transformer
from scipy.ndimage import median_filter,gaussian_filter,map_coordinates,distance_transform_edt
T=Transformer.from_crs(4326,27700,always_xy=True)
E0,N0=532800,178200
dtm=np.load('/tmp/lidar/dtm.npy').astype(float)
bad=~np.isfinite(dtm)|(dtm<-1)|(dtm>30)
idx=distance_transform_edt(bad,return_distances=False,return_indices=True)
dtm=dtm[tuple(idx)]
grid=np.array(Image.open('/home/claude/bermo-game/grid.png').convert('L'))//30   # 3 px per cell
GW,GH=3243,2803;K=1/1.3;CELL=8.0
MW,MH=GW*K,GH*K
nx,ny=int(MW/CELL)+2,int(MH/CELL)+2
xs=(np.arange(nx)*CELL)/K;ys=(np.arange(ny)*CELL)/K   # game px
X,Y=np.meshgrid(xs,ys)
la=51.5055-(Y-285)*0.7692/111195;lo=-0.0754+(X-958)*0.7692/69330
e,n=T.transform(lo,la);r=n-N0
col=e-E0+1.0;row=r+0.0055*r-9.4
h=map_coordinates(dtm,[row,col],order=1,mode='nearest')
gi=np.clip((Y/3).astype(int),0,grid.shape[0]-1);gj=np.clip((X/3).astype(int),0,grid.shape[1]-1)
water=grid[gi,gj]==3
print('raw',np.percentile(h,[1,50,99]).round(2),'water frac',water.mean().round(3))
# water cells take the nearest land value so the river bank does not slump
from scipy.ndimage import label
land=~water
ii=distance_transform_edt(~land,return_distances=False,return_indices=True)
h2=h[tuple(ii)]   # water cells take the nearest land value
hs=gaussian_filter(median_filter(h2,size=9,mode='nearest'),sigma=5,mode='nearest')   # median drops building/new-build artefacts, then ~40 m blur
BASE=np.percentile(hs[land],5)
rel=np.maximum(hs-BASE,0.15)   # land never drops below the river surface (world y 0)
lab,nl=label(water)
for k in range(1,nl+1):
    m=lab==k
    if Y[m].min()<300:rel[m]=-0.35            # the Thames: ground sinks below the (undisplaced, level) river surface
    else:rel[m]=rel[m]-0.25                   # docks and ponds: water follows the local ground, a little below it
print('base',BASE.round(2),'range',rel.min().round(2),rel.max().round(2),np.percentile(rel,[50,95,99]).round(2),'water comps',nl)
TMIN,TS=-1.5,8.0
q=np.clip(np.round((rel-TMIN)/TS*255),0,255).astype(np.uint8)
import json,base64
p='/home/claude/bermo-game/world3d.json'
w=json.load(open(p))
w['terrain']={'n':[int(nx),int(ny)],'cell':CELL,'tmin':TMIN,'ts':TS,'b64':base64.b64encode(q.tobytes()).decode()}
json.dump(w,open(p,'w'),separators=(',',':'),ensure_ascii=False)
Image.fromarray(q).resize((nx*3,ny*3)).save('/tmp/terrain_view.png')
print(nx,ny,len(w['terrain']['b64']))
