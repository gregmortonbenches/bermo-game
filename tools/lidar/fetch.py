import numpy as np,tifffile,urllib.request,warnings,io,sys,time
from concurrent.futures import ThreadPoolExecutor
warnings.filterwarnings('ignore')
E0,N0,W,H=532800,178200,2800,2500
SRC={'dsm':('lidar-composite-digital-surface-model-first-return-dsm-1m','df4e3ec3-315e-48aa-aaaf-b5ae74d7b2bb__Lidar_Composite_Elevation_FZ_DSM_1m'),
     'dtm':('lidar-composite-digital-terrain-model-dtm-1m','13787b9a-26a4-4775-8523-806d13af58fc__Lidar_Composite_Elevation_DTM_1m')}
arr={k:np.full((H,W),np.nan,np.float32) for k in SRC}
def get(job):
    k,x,y=job;s,c=SRC[k];e0,n0=E0+x,N0+y;e1,n1=min(e0+500,E0+W),min(n0+500,N0+H)
    u=f"https://environment.data.gov.uk/spatialdata/{s}/wcs?service=WCS&version=2.0.1&request=GetCoverage&coverageId={c}&format=image/tiff&subset=E({e0},{e1})&subset=N({n0},{n1})"
    for t in range(4):
        try:
            b=urllib.request.urlopen(u,timeout=90).read();a=tifffile.imread(io.BytesIO(b)).astype(np.float32);return k,x,y,a
        except Exception as ex:time.sleep(2+t*2);err=ex
    print('FAIL',k,x,y,err);return k,x,y,None
jobs=[(k,x,y) for k in SRC for x in range(0,W,500) for y in range(0,H,500)]
with ThreadPoolExecutor(6) as ex:
    for k,x,y,a in ex.map(get,jobs):
        if a is None:continue
        a[a<-1e30]=np.nan;a[(a<-100)|(a>400)]=np.nan
        h,w=a.shape;# tiff rows run north->south: flip so row index grows with northing
        arr[k][y:y+h,x:x+w]=a[::-1][:min(h,H-y),:min(w,W-x)]
for k in arr:np.save(f'/tmp/lidar/{k}.npy',arr[k]);print(k,'valid',float(np.isfinite(arr[k]).mean()),'min/max',float(np.nanmin(arr[k])),float(np.nanmax(arr[k])))
