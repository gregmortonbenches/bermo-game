/* GTA Bermondsey: Shared helpers, map loading and the save file.
   Classic script sharing one global scope with the other js/ files; load order is set in index.html. */
const $=q=>document.querySelector(q);
const cv=$('#g'),ctx=cv.getContext('2d');
const clamp=(v,a,b)=>v<a?a:v>b?b:v,hyp=Math.hypot,R=Math.random,PI=Math.PI;
const angDiff=(a,b)=>{let d=a-b;while(d>PI)d-=2*PI;while(d<-PI)d+=2*PI;return d};
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let D,MAP,G,TCOLS=13,TROWS=11,W=1,H=1,C=3,GW=1,GH=1,EDGES=[],ADJ=[],MAIN=[],SEGB={},ready=false;
const GOAL=2000;
const tAt=(x,y)=>{const cx=Math.floor(x/C),cy=Math.floor(y/C);return cx<0||cy<0||cx>=GW||cy>=GH?3:G[cy*GW+cx]};
const sol=t=>t==2||t==3||t==4;
let FB=null,FLOW=null,WD=null;const CAM={yaw:0,pitch:.3,manual:0,rx:0,ry:0};
const solP=(x,y)=>{const t=tAt(x,y);if(t==3||(t==4&&!(window.UP&&window.UP[(y|0)*W+(x|0)])))return true;if(FB){const X=x|0,Y=y|0;return X<0||Y<0||X>=W||Y>=H||FB[Y*W+X]===1}return t==2};
const hit=(x,y,r)=>solP(x-r,y-r)||solP(x+r,y-r)||solP(x-r,y+r)||solP(x+r,y+r);
const hitW=(x,y)=>hit(x,y,1)||solP(x,y)||solP(x-1,y)||solP(x+1,y)||solP(x,y-1)||solP(x,y+1);/* on foot: also test centre and edge midpoints so 1px fences/corners can't be slipped through */
/* low fences (garden walls and railings, up to about 1.3 m) can be jumped; FLOW marks the cells that are only a low fence */
const solPJ=(x,y)=>{if(FLOW&&FLOW[(y|0)*W+(x|0)]===1){const t=tAt(x,y);if(t!=2&&t!=3&&t!=4)return false}return solP(x,y)};
const hitJ=(x,y)=>solPJ(x-1,y-1)||solPJ(x+1,y-1)||solPJ(x-1,y+1)||solPJ(x+1,y+1)||solPJ(x,y)||solPJ(x-1,y)||solPJ(x+1,y)||solPJ(x,y-1)||solPJ(x,y+1);
const TYPES={hatch:{w:15,h:8,max:.45,acc:.012,n:'hatchback'},cab:{w:16,h:8,max:.44,acc:.012,n:'black cab'},van:{w:18,h:9,max:.38,acc:.01,n:'van'},bike:{w:10,h:5,max:.24,acc:.016,n:'e-cargo bike'},bus:{w:26,h:10,max:.3,acc:.007,n:'bus'},scooter:{w:7,h:3,max:.235,acc:.015,n:'e-scooter'},ebike:{w:8,h:4,max:.27,acc:.016,n:'e-bike'},courier:{w:9,h:5,max:.22,acc:.013,n:'delivery rider'},heli:{w:22,h:9,max:1.3,acc:.014,n:'helicopter'}};
const SHIRTS=['#e04848','#3a6fd8','#2fa86a','#e0a030','#8a4ad0','#e07a3a','#2a2a34','#d8d8dc','#c04888','#3aa0b0'],HAIRS=['#2a1a12','#4a2c1a','#8a5a2a','#d8b060','#151515','#6a6a70','#a0402a'];
const COLS=['#7c8188','#f4f4f2','#2a2c30','#2e4a7a','#9aa0a6','#7a1e22','#5e6e5a','#c9ccd0','#1e2a4a','#3a4048','#e85a2a','#2a7a8a'];
let P={};
const ICON={C:'111100100100111',M:'101111111101101',H:'101101111101101',F:'111100110100100',B:'110101110101110',L:'100100100100111'};

/* ---------- loading ---------- */
const img=s=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=s});
const xy=a=>({x:a[0],y:a[1]});
async function load(){
  const [d,mi,gi,wd,mlyd]=await Promise.all([fetch('data.json').then(r=>r.json()),img('map.png'),img('grid.png'),fetch('world3d.json').then(r=>r.json()),fetch('mly.json').then(r=>r.ok?r.json():null).catch(()=>null)]);WD=wd;WD.mly=mlyd;
  D=d;W=d.W;H=d.H;C=d.C;GW=d.GW;GH=d.GH;MAP=mi;
  /* area-name banner = nearest anchor: Bermondsey Spa Gardens (address: Grange Road) had none, so half of it read as Tower Bridge Road */
  D.anchors.push(['Grange Road',880,1800]);
  const c=document.createElement('canvas');c.width=GW;c.height=GH;const q=c.getContext('2d',{willReadFrequently:true});q.drawImage(gi,0,0);const px=q.getImageData(0,0,GW,GH).data;
  G=new Uint8Array(GW*GH);for(let i=0;i<G.length;i++)G[i]=Math.round(px[i*4]/30);
  EDGES=d.edges.map(([a,b,poly,nm,w,main,ow])=>{const p=[];for(let i=0;i<poly.length;i+=2)p.push([poly[i],poly[i+1]]);const cum=[0];for(let i=1;i<p.length;i++)cum.push(cum[i-1]+hyp(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]));return{a,b,p,cum,len:cum[cum.length-1],nm,w,main,ow:ow||0,off:p.some(q=>q[0]<2||q[1]<2||q[0]>d.W-2||q[1]>d.H-2)}});/* off: edge leaves the map, where every cell is solid */
  ADJ=d.nodes.map(()=>[]);EDGES.forEach((e,i)=>{if(e.main&&e.len>2){ADJ[e.a].push(i);ADJ[e.b].push(i);MAIN.push(i)}});
  for(const s of d.segs){const k=(s[0]>>6)+','+(s[1]>>6);(SEGB[k]=SEGB[k]||[]).push(s)}
  const pl0=d.places;
  const RL=d.real,rp=k=>({x:RL[k][2],y:RL[k][3]});
  P={manze:{...rp('manze'),n:'M. Manze',ic:'M',c:'#2f8a4e'},pozies:{...rp('pozies'),n:"Pozie's",ic:'F',c:'#e0508a'},cycles:{...rp('cycles'),n:'Southwark Cycles',ic:'B',c:'#e8902c'},
     library:{...rp('library'),n:'Blue Anchor Library',ic:'L',c:'#8e5ad8'},flat:{...xy(pl0.flat),n:'Your flat',ic:'H',c:'#3f6fe0'}};
  MALTBY=rp('maltby');initDucks();
  {const ca=Math.cos(BELLK.a),sa=Math.sin(BELLK.a),b=nearWalk(BELLK.x+ca*6,BELLK.y+sa*6);P.bells={...b,n:"Bell's Cafe",ic:'C',c:'#d8503a'};D.pool.push(["Bell's Cafe",'Spa Gardens',b.x,b.y,'cafe']);{const h=nearWalk(1213,2109);D.shops.push(['Harris Academy Bermondsey','Southwark Park Road',h.x,h.y,'school'])}/* Harris Academy Bermondsey: name tag and a chat at the name board */
   specials.push({kind:'bell',x:BELLK.x+ca*3.6-sa*2.4,y:BELLK.y+sa*3.6+ca*2.4,hx:0,hy:0,a:BELLK.a,t:0,walk:0,col:'#17171b',trs:'#4a6a9a',hair:'#3a2216',skin:'#d2a27c',long:1,talkT:0});
   const m=nearWalk(1026,1700);specials.push({kind:'monk',x:m.x,y:m.y,hx:m.x,hy:m.y,a:0,t:0,walk:0,col:'#8a2230',hair:'#b4865e',skin:'#c89a70',robe:1,talkT:0});
   {/* two monks from Kagyu Samye Dzong (the old Bermondsey Library, Spa Road) who set off from the centre on a slow walk round the area and come home again */const kc=D.pool.find(p=>p[0]=='Kagyu Samye Dzong London'),hx=kc?kc[2]:1036,hy=kc?kc[3]:1678,dr=nearWalk(hx-4,hy+20);
    const m1={kind:'monk',walker:1,x:dr.x,y:dr.y,hx:dr.x,hy:dr.y,a:PI/2,t:60*(4+R()*8),walk:0,col:'#5c1a22',skin:'#c89468',robe:1,talkT:0,st:'door'},m2={kind:'monk',walker:2,lead:m1,x:dr.x+1.8,y:dr.y,hx:dr.x,hy:dr.y,a:PI/2,t:0,walk:0,col:'#a2222c',skin:'#efc8a8',robe:1,specs:1,nopin:1,talkT:0};m1.mate=m2;specials.push(m1,m2)}
   const bl=rp('bluemkt'),bx=nearWalk(bl.x,bl.y-14);specials.push({kind:'boxer',x:bx.x,y:bx.y,hx:bx.x,hy:bx.y,a:0,t:0,walk:0,col:'#c8282e',trs:'#a82024',zip:1,hair:'#1a1a1a',skin:'#a86a40',talkT:0})}
  await new Promise(ok=>{const t=()=>window.R3?ok():setTimeout(t,40);t()});$('#startB').textContent='Building Bermondsey';await new Promise(r=>setTimeout(r,30));await Promise.race([WXREADY,new Promise(r=>setTimeout(r,2200))]);R3.build(WD);
  if(!hadSave){S.x=P.flat.x;S.y=P.flat.y}pl.x=S.x;pl.y=S.y;
  TCOLS=Math.ceil(W*2/512);TROWS=Math.ceil(H*2/512);ready=true;$('#startB').disabled=false;$('#startB').textContent=hadSave?'Continue':'Start';$('#title').classList.add('ready')}
let MALTBY=null;
function namedPoint(n){const k=D.names.indexOf(n);if(k<0)return null;const ss=D.segs.filter(s=>s[4]==k);if(!ss.length)return null;const s=ss[ss.length>>1];return{x:(s[0]+s[2])>>1,y:(s[1]+s[3])>>1}}

/* ---------- save state: the pocket life ---------- */
const fresh=()=>{const n=Date.now();return{v:3,start:n,last:n,bag:{},kind:0,cash:40,fund:0,hearts:0,mission:0,x:0,y:0,bx:0,by:0,crew:null,applied:[],intro:0,won:0}};
let S=fresh(),hadSave=false;
try{const r=JSON.parse(localStorage.getItem('dockhead-save3')||'null');if(r&&r.v==3){S=Object.assign(fresh(),r);hadSave=true}}catch(e){}

