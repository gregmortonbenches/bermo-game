/* The map in pieces. After the world is built, its big static meshes are packed into small per-area buffers (squeezed in the background);
   only the pieces near the camera are on the graphics card, and they are dropped again once you are well away.
   Visual only: nothing here is read by the game, collision uses its own grids. `?nostream` turns it off. */
import * as THREE from 'three';
const TILE=360,MINV=600,SPLITV=6000,SPLITW=600,IN=40,OUT=240,SMALL=49152;/* pieces under 48 KB are not worth squeezing */
const EMPTY=new THREE.BufferGeometry();EMPTY.setAttribute('position',new THREE.BufferAttribute(new Float32Array(0),3));
const L=[],S={n:0,hot:0,busy:0,raw:0,z:0,off:/[?&]nostream/.test(location.search),err:null};
const ZIP=typeof CompressionStream=='function'&&typeof DecompressionStream=='function';
const pipe=(buf,s)=>new Response(new Blob([buf]).stream().pipeThrough(s)).arrayBuffer();
/* the squeezing and unsqueezing run on a helper thread, so they do not wait on the game's frames; the main thread does it if a helper cannot start */
let WK=null,wid=0;const WAIT=new Map();
try{if(ZIP&&typeof Worker=='function'){const src="const p=(b,s)=>new Response(new Blob([b]).stream().pipeThrough(s)).arrayBuffer();onmessage=async e=>{const {id,z,b}=e.data;try{const r=await p(b,z?new CompressionStream('deflate-raw'):new DecompressionStream('deflate-raw'));postMessage({id,r},[r])}catch(x){postMessage({id,err:String(x)})}}";
  WK=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));WK.onmessage=e=>{const w=WAIT.get(e.data.id);WAIT.delete(e.data.id);if(w)e.data.err?w[1](e.data.err):w[0](e.data.r)};WK.onerror=()=>{WK=null;for(const w of WAIT.values())w[1]('helper stopped');WAIT.clear()}}}catch(e){WK=null}
/* the helper gets a copy, so the original stays usable while it works */
/* if the page is not allowed a helper (it then fails when it starts), the same work falls back to the main thread */
const own=(buf,z)=>pipe(buf,z?new CompressionStream('deflate-raw'):new DecompressionStream('deflate-raw'));
const zip=(buf,z)=>WK?new Promise((ok,no)=>{const id=++wid,b=buf.slice(0);WAIT.set(id,[ok,no]);WK.postMessage({id,z,b},[b])}).catch(e=>{if(WK)throw e;return own(buf,z)}):own(buf,z);

/* one buffer per piece: positions and uvs as they were, normals in 4 bytes, colours in 8 (16-bit, so dark colours keep their shade) */
function pack(g,idx){const n=idx?idx.length*3:g.attributes.position.count,fmt=[];let off=0;
  for(const name in g.attributes){const a=g.attributes[name],it=a.itemSize;let kind='f',stride=it;
    if(name=='normal'&&it==3){kind='b';stride=4}
    else if(name=='color'&&it==3){let ok=true;for(let i=0;i<a.array.length;i++){const v=a.array[i];if(v<0||v>1){ok=false;break}}if(ok){kind='s';stride=4}}
    fmt.push({name,it,kind,stride,off});off+=n*stride*(kind=='f'?4:kind=='s'?2:1)}
  const buf=new ArrayBuffer(off);
  for(const f of fmt){const src=g.attributes[f.name].array,it=f.it,s=f.stride,
      d=f.kind=='f'?new Float32Array(buf,f.off,n*s):f.kind=='s'?new Uint16Array(buf,f.off,n*s):new Int8Array(buf,f.off,n*s),m=f.kind=='f'?0:f.kind=='s'?65535:127;
    for(let v=0;v<n;v++){const from=(idx?idx[v/3|0]*3+v%3:v)*it,to=v*s;for(let k=0;k<it;k++)d[to+k]=m?Math.round(Math.max(-1,Math.min(1,src[from+k]))*m):src[from+k]}}
  const p=g.attributes.position.array,box=new THREE.Box3(),v=new THREE.Vector3();
  for(let i=0;i<n;i++){const from=(idx?idx[i/3|0]*3+i%3:i)*3;box.expandByPoint(v.set(p[from],p[from+1],p[from+2]))}
  return{n,fmt,raw:buf,z:null,box}}

function geometry(P,buf){const g=new THREE.BufferGeometry(),drop=function(){this.array=null};
  for(const f of P.fmt){if(f.kind=='f'){const a=new THREE.BufferAttribute(new Float32Array(buf,f.off,P.n*f.it),f.it);a.onUpload(drop);g.setAttribute(f.name,a)}
    else{const T=f.kind=='s'?Uint16Array:Int8Array,ib=new THREE.InterleavedBuffer(new T(buf,f.off,P.n*f.stride),f.stride);ib.onUpload(drop);g.setAttribute(f.name,new THREE.InterleavedBufferAttribute(ib,f.it,0,true))}}
  g.boundingBox=P.box.clone();g.boundingSphere=P.box.getBoundingSphere(new THREE.Sphere());return g}

function add(o,P,plain){const m=new THREE.Mesh(EMPTY,o.material);m.position.copy(o.position);m.quaternion.copy(o.quaternion);m.scale.copy(o.scale);m.updateMatrix();m.matrixAutoUpdate=false;
  m.castShadow=o.castShadow;m.receiveShadow=o.receiveShadow;m.renderOrder=o.renderOrder;m.frustumCulled=o.frustumCulled;m.layers.mask=o.layers.mask;Object.assign(m.userData,o.userData,{piece:1});if(plain)m.userData.stat=1;/* the Low setting's far culling reads local boxes, so only unmoved meshes */
  P.mesh=m;P.parent=o.parent;P.hot=false;P.busy=false;P.w=P.box.clone().applyMatrix4(o.matrixWorld);P.d=1e9;L.push(P)}

/* run once, straight after build() and before anything has been drawn */
export function split(scene){if(S.off)return;try{
  scene.updateMatrixWorld(true);const uses=new Map(),cand=[];
  scene.traverse(o=>{if(!o.isMesh)return;uses.set(o.geometry,(uses.get(o.geometry)||0)+1)});
  scene.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||o.children.length||!o.visible||Array.isArray(o.material)||o.material.fog===false)return;const g=o.geometry,A=g.attributes;
    if(g.index||!A.position||A.position.count<MINV||uses.get(g)>1||Object.keys(g.morphAttributes).length)return;for(const k in A)if(A[k].isInterleavedBufferAttribute||!(A[k].array instanceof Float32Array))return;cand.push(o)});
  for(const o of cand){const g=o.geometry,n=g.attributes.position.count,p=g.attributes.position.array;g.computeBoundingBox();const b=g.boundingBox,e=o.matrixWorld.elements,
      plain=o.parent===scene&&e.every((v,i)=>Math.abs(v-(i%5?0:1))<1e-9);
    if(plain&&n>=SPLITV&&n%3==0&&Math.max(b.max.x-b.min.x,b.max.z-b.min.z)>SPLITW){/* a map-wide mesh: cut it up by area, whole triangles at a time */
      const cells=new Map();for(let t=0;t<n/3;t++){const i=t*9,k=Math.floor((p[i]+p[i+3]+p[i+6])/3/TILE)+','+Math.floor((p[i+2]+p[i+5]+p[i+8])/3/TILE);let c=cells.get(k);if(!c)cells.set(k,c=[]);c.push(t)}
      for(const idx of cells.values())add(o,pack(g,idx),plain)}
    else add(o,pack(g),plain);
    o.parent.remove(o);o.geometry=EMPTY}
  S.n=L.length;S.raw=S.left=L.reduce((a,P)=>a+P.raw.byteLength,0)}catch(e){S.err=String(e);console.warn('tiles',e)}}

function show(P,buf){P.mesh.geometry=geometry(P,buf);P.parent.add(P.mesh);P.hot=true;S.hot++}
function hide(P){P.parent.remove(P.mesh);P.mesh.geometry.dispose();P.mesh.geometry=EMPTY;P.hot=false;S.hot--}
const dist=(P,x,z)=>Math.hypot(Math.max(0,P.w.min.x-x,x-P.w.max.x),Math.max(0,P.w.min.z-z,z-P.w.max.z));

/* everything near the given spots, at once, for the first frame; the squeezing then carries on quietly */
export function prime(spots,r){for(const P of L)if(!P.hot&&P.raw&&spots.some(([x,z])=>dist(P,x,z)<r))show(P,P.raw);if(ZIP)setTimeout(squeeze,1500)}
/* several at a time (each one waits on the browser between frames), biggest first so the memory comes back soonest */
async function squeeze(){const q=L.filter(P=>P.raw&&P.raw.byteLength>=SMALL).sort((a,b)=>a.raw.byteLength-b.raw.byteLength);
  const one=async()=>{while(q.length&&!S.err){const P=q.pop();if(!P.raw)continue;try{const z=await zip(P.raw,1);P.z=z;S.z+=z.byteLength;S.left-=P.raw.byteLength;P.raw=null}catch(e){S.err=String(e);return}
      await new Promise(r=>setTimeout(r,WK?0:12))}};
  await Promise.all([one(),one(),one(),one()]);S.done=true}

let list=[],tick=0,lx=1e9,lz=1e9,burst=0;
export function update(x,z,far){if(!L.length)return;const jump=Math.hypot(x-lx,z-lz)>80;lx=x;lz=z;if(jump)burst=30;
  if(jump||(tick++)%10==0){list=[];for(const P of L){P.d=dist(P,x,z);if(P.hot){if(P.d>far+OUT)hide(P)}else if(P.d<far+IN&&!P.busy)list.push(P)}list.sort((a,b)=>b.d-a.d)/* nearest last, so pop() takes it first */}
  let budget=burst>0?(burst--,16):3;
  while(budget>0&&list.length&&S.busy<12){const P=list.pop();if(P.hot||P.busy)continue;budget--;
    if(P.raw){show(P,P.raw);continue}
    P.busy=true;S.busy++;zip(P.z,0).then(buf=>{if(!P.hot&&dist(P,lx,lz)<far+OUT)show(P,buf)}).catch(e=>{S.err=String(e);console.warn('tiles',e)}).finally(()=>{P.busy=false;S.busy--})}}
export const stats=()=>({n:S.n,hot:S.hot,busy:S.busy,rawMB:+(S.raw/1048576).toFixed(1),helper:!!WK,zMB:+(S.z/1048576).toFixed(1),leftMB:+((S.left||0)/1048576).toFixed(1),done:!!S.done,err:S.err});
