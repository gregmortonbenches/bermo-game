/* GTA Bermondsey: Minimap, big map, sprites, light and weather.
   Classic script sharing one global scope with the other js/ files; load order is set in index.html. */
/* ---------- rendering: tiles, sprites, light ---------- */
const Z=2,TS=512;let ZF=1,SZ=2,IW=400,IH=300,SCL=2,camX=0,camY=0,cam={x:0,y:0,ok:0},vig=null;
const LC=document.createElement('canvas'),lx=LC.getContext('2d');
function resize(){const dpr=Math.min(3,devicePixelRatio||1),w=innerWidth,h=innerHeight;SCL=Math.max(2,Math.round(Math.min(w,h)*dpr/440));IW=Math.max(160,Math.round(w*dpr/SCL));IH=Math.max(120,Math.round(h*dpr/SCL));
  cv.width=IW;cv.height=IH;LC.width=IW;LC.height=IH;ctx.imageSmoothingEnabled=false;
  vig=ctx.createRadialGradient(IW/2,IH/2,Math.min(IW,IH)*.42,IW/2,IH/2,Math.max(IW,IH)*.78);vig.addColorStop(0,'rgba(10,8,30,0)');vig.addColorStop(1,'rgba(10,8,30,.42)')}
addEventListener('resize',resize);resize();
const TILES=new Map();
function tile(tx,ty){const k=tx+'_'+ty;let t=TILES.get(k);if(!t){t={img:new Image(),ok:false,used:fr};t.img.onload=()=>{t.ok=true};t.img.src='t/'+k+'.png';TILES.set(k,t);
    if(TILES.size>56){let o=null;for(const [kk,v] of TILES)if(kk!==k&&(!o||v.used<o[1].used))o=[kk,v];if(o)TILES.delete(o[0])}}t.used=fr;return t}
function drawMap(ax,ay){const ts=TS*ZF,tx0=Math.max(0,Math.floor(ax/ts)),ty0=Math.max(0,Math.floor(ay/ts)),tx1=Math.min(TCOLS-1,Math.floor((ax+IW)/ts)),ty1=Math.min(TROWS-1,Math.floor((ay+IH)/ts));
  for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){const t=tile(tx,ty),dx=Math.round(tx*ts-ax),dy=Math.round(ty*ts-ay);
    if(t.ok)ctx.drawImage(t.img,dx,dy,Math.ceil(t.img.width*ZF),Math.ceil(t.img.height*ZF));else{const sx=tx*TS/Z,sy=ty*TS/Z,sw=Math.min(TS/Z,W-sx),sh=Math.min(TS/Z,H-sy);if(sw>0&&sh>0)ctx.drawImage(MAP,sx,sy,sw,sh,dx,dy,Math.ceil(sw*SZ),Math.ceil(sh*SZ))}}
  if(fr%20==0)for(let ty=ty0-1;ty<=ty1+1;ty++)for(let tx=tx0-1;tx<=tx1+1;tx++)if(tx>=0&&ty>=0&&tx<TCOLS&&ty<TROWS)tile(tx,ty)}
let dest=null,route=null,routeKey='',BIG=null;
function nearestNode(x,y){let b=-1,bd=1e12;for(let i=0;i<D.nodes.length;i++){if(!ADJ[i].length)continue;const n=D.nodes[i],d=(n[0]-x)**2+(n[1]-y)**2;if(d<bd){bd=d;b=i}}return b}
function planRoute(x0,y0,x1,y1){const s=nearestNode(x0,y0),t=nearestNode(x1,y1);if(s<0||t<0)return null;const N=D.nodes.length,dist=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1),pe=new Int32Array(N).fill(-1);dist[s]=0;
  const h=[[0,s]],push=v=>{h.push(v);let i=h.length-1;while(i){const p=(i-1)>>1;if(h[p][0]<=h[i][0])break;[h[p],h[i]]=[h[i],h[p]];i=p}},pop=()=>{const top=h[0],l=h.pop();if(h.length){h[0]=l;let i=0;for(;;){const a=2*i+1,b=a+1;let m=i;if(a<h.length&&h[a][0]<h[m][0])m=a;if(b<h.length&&h[b][0]<h[m][0])m=b;if(m===i)break;[h[m],h[i]]=[h[i],h[m]];i=m}}return top};
  while(h.length){const [d,u]=pop();if(d>dist[u])continue;if(u===t)break;for(const ei of ADJ[u]){const e=EDGES[ei],v=e.a===u?e.b:e.a,nd=d+e.len;if(nd<dist[v]){dist[v]=nd;prev[v]=u;pe[v]=ei;push([nd,v])}}}
  if(!isFinite(dist[t]))return null;const pts=[[x1,y1]];let v=t,g=0;while(v!==s&&g++<5000){const e=EDGES[pe[v]],p=e.b===v?e.p.slice().reverse():e.p.slice();for(const q of p)pts.push(q);v=prev[v]}pts.push([x0,y0]);return pts.reverse()}
function routeTarget(){return dest||(act&&act.tg)||null}
function updateRoute(){const t=routeTarget(),p=pos();if(!t){route=null;return}if(dest&&hyp(p.x-dest.x,p.y-dest.y)<22){toast('You\'ve arrived: '+dest.l);dest=null;route=null;return}
  if(pl.car&&pl.car.type=='heli'){route=[[p.x,p.y],[t.x,t.y]];return}route=planRoute(p.x,p.y,t.x,t.y)}
function drawRoute(lw){if(!route||route.length<2)return;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();ctx.moveTo(route[0][0],route[0][1]);for(const q of route)ctx.lineTo(q[0],q[1]);ctx.strokeStyle='rgba(60,10,60,.45)';ctx.lineWidth=lw*1.7;ctx.stroke();ctx.strokeStyle=dest?'rgba(255,111,165,.95)':'rgba(255,184,92,.95)';ctx.lineWidth=lw;ctx.stroke()}
function setDest(x,y,l){dest={x,y,l};routeKey='';updateRoute();toast('Destination set: '+l+'. Follow the '+'pink line.')}
function destDlg(){const L=[["Your flat",P.flat],["Your e-cargo bike",bike],["The police helicopter",heli],["M. Manze",P.manze],["Bell's Cafe",P.bells],["Pozie's",P.pozies],["Southwark Cycles",P.cycles],["Blue Anchor Library",P.library],["Maltby Street Market",MALTBY],["The Blue Market",{x:D.real.bluemkt[2],y:D.real.bluemkt[3]}],["Southwark Park lake",{x:D.lake[0],y:D.lake[1]}],["Harris Academy Bermondsey",{x:1213,y:2109}],["Kagyu Samye Dzong",{x:1026,y:1690}]].filter(a=>a[1]);
  const o=L.map(([n,q])=>[n,()=>setDest(q.x,q.y,n)]);o.push(['Pick a spot on the map',()=>{closeDlg();bigMap=true;paused=true;toast('Tap the map to drop a pin.')}]);if(dest)o.push(['Clear route',()=>{dest=null;route=null;toast('Route cleared.')}]);o.push(['Close',()=>{}]);
  dlg('dest',{who:'ROUTE PLANNER',title:'Where to?',text:'Pick a place and follow the pink line along real streets.',opts:o})}
function setZoom(z){ZF=clamp(z,.55,1.9);SZ=Z*ZF}
const shade=(h,a)=>{const n=parseInt(h.slice(1),16),f=v=>clamp(Math.round(a<0?v*(1+a):v+(255-v)*a),0,255);return`rgb(${f(n>>16)},${f(n>>8&255)},${f(n&255)})`};
const SPR={};
function cnv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return[c,c.getContext('2d')]}
function rbox(q,x,y,w,h,col){q.fillStyle=col;q.fillRect(x+1,y,w-2,h);q.fillRect(x,y+1,w,h-2)}
function rider(q,x,cy,shirt,hair,helmet){q.fillStyle=shade(shirt,-.35);q.fillRect(x-2,cy-4,6,8);q.fillStyle=shirt;q.fillRect(x-1,cy-3,4,6);q.fillStyle='#e0b090';q.fillRect(x+3,cy-4,2,1);q.fillRect(x+3,cy+3,2,1);q.fillStyle=helmet||hair;q.fillRect(x,cy-2,4,4);q.fillStyle=shade(helmet||hair,.35);q.fillRect(x+1,cy-2,2,1)}
function carSpr(c,mounted){const t=c.type,key=t+(c.ai?'a':'p')+c.col+(c.rc||'')+(c.ev?1:0)+(mounted?1:0)+(c.dead?1:0);if(SPR[key])return SPR[key];const T=TYPES[t],w=T.w*Z,h=T.h*Z,[cv2,q]=cnv(w+2,h+2);q.translate(1,1);
  const col=c.col,dk=shade(col,-.42),lt=shade(col,.28);
  if(t=='bike'){q.fillStyle='#1a1c22';q.fillRect(0,h/2-2,4,4);q.fillRect(w-4,h/2-2,4,4);q.fillStyle=dk;q.fillRect(2,h/2-1,w-4,2);rbox(q,w-11,1,8,h-2,'#c88a4a');q.fillStyle='#a86a30';q.fillRect(w-10,2,6,1);q.fillStyle=col;q.fillRect(4,h/2-2,7,4);q.fillStyle='#fff6c0';q.fillRect(w-1,h/2-1,1,2);
    if(mounted)rider(q,3,h/2,'#d6a93a','#3a2418');return SPR[key]=cv2}
  if(t=='scooter'||t=='ebike'||t=='courier'){q.fillStyle='#1a1c22';q.fillRect(0,h/2-1,3,2);q.fillRect(w-3,h/2-1,3,2);q.fillStyle=col;q.fillRect(2,h/2-1,w-4,2);q.fillStyle='#c8ccd4';q.fillRect(w-4,h/2-3,1,6);
    if(t=='courier'){rbox(q,0,h/2-5,7,10,col);q.fillStyle=shade(col,.3);q.fillRect(1,h/2-4,5,1);rider(q,6,h/2,'#2a2a34','#151515',shade(col,-.2))}else if(mounted)rider(q,t=='scooter'?3:4,h/2,'#d6a93a','#3a2418');else if(c.ai)rider(q,t=='scooter'?3:4,h/2,c.rc||'#3a6fd8',c.hc||'#2a1a12',t=='ebike'?'#f0f0f0':null);else{q.fillStyle='#f4f4f0';q.fillRect(Math.round(w/2)-2,h/2-1,4,2)}
    q.fillStyle='#fff6c0';q.fillRect(w-1,h/2,1,1);return SPR[key]=cv2}
  // four wheels
  q.fillStyle='#14151a';for(const [x,y] of [[w*.18,-1],[w*.18,h-1],[w*.72,-1],[w*.72,h-1]])q.fillRect(Math.round(x)-2,y,5,2);
  rbox(q,0,1,w,h-2,c.dead?'#2a2a2e':dk);rbox(q,1,1,w-2,h-3,c.dead?'#333':col);q.fillStyle=lt;q.fillRect(2,2,w-4,1);
  if(t=='bus'){q.fillStyle='#e8e8ee';q.fillRect(4,3,w-9,h-7);q.fillStyle='#c8c8d0';for(let x=8;x<w-10;x+=10)q.fillRect(x,5,6,h-11);q.fillStyle='#262a3a';q.fillRect(w-4,2,2,h-5);q.fillStyle='#3ad07a';q.fillRect(1,h-4,3,1)}
  else{const ws=Math.round(w*.62),rr=Math.round(w*.2);q.fillStyle='#232a3e';q.fillRect(ws,2,Math.round(w*.13),h-5);q.fillStyle='#6a86b0';q.fillRect(ws+1,3,1,h-8);q.fillStyle='#232a3e';q.fillRect(rr,2,Math.round(w*.08)+1,h-5);
    q.fillStyle=shade(col,.12);q.fillRect(rr+Math.round(w*.08)+1,3,ws-rr-Math.round(w*.08)-1,h-7);
    q.fillStyle=dk;q.fillRect(ws,0,2,1);q.fillRect(ws,h-2,2,1);
    if(t=='cab'){q.fillStyle='#ffd23a';q.fillRect(Math.round(w*.45),Math.round(h/2)-2,3,3)}
    if(t=='van'){q.fillStyle=shade(col,-.12);for(let x=3;x<w*.58;x+=4)q.fillRect(x,3,1,h-7)}}
  if(!c.dead){q.fillStyle='#fff4c8';q.fillRect(w-1,2,1,3);q.fillRect(w-1,h-6,1,3);q.fillStyle='#e02626';q.fillRect(0,2,1,2);q.fillRect(0,h-5,1,2);if(c.ev&&t!='bus'){q.fillStyle='#2ed16e';q.fillRect(0,Math.round(h/2)-1,1,2)}}
  return SPR[key]=cv2}
function drawCar(c,ghost){const T=TYPES[c.type];ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);if(ghost)ctx.globalAlpha=.85;
  ctx.fillStyle='rgba(16,12,40,.32)';ctx.fillRect(-T.w/2+1,-T.h/2+1.5,T.w,T.h);
  ctx.drawImage(carSpr(c,c===pl.car),-T.w/2-.5,-T.h/2-.5,T.w+1,T.h+1);ctx.restore();
  if(ghost){ctx.fillStyle='#5ad1ff';ctx.fillRect(c.x-1.5,c.y-T.h-3,3,2)}
  if(c.own&&!pl.car)pin(c.x,c.y-9,'#ff6fa5','♥')}
function drawHeli(c){const al=c.alt||0,sx=c.x+al*14,sy=c.y+al*9;
  ctx.fillStyle=`rgba(16,12,40,${.35-al*.12})`;ctx.save();ctx.translate(sx,sy);ctx.rotate(c.a);ctx.beginPath();ctx.ellipse(0,0,8,4,0,0,7);ctx.fill();ctx.fillRect(-16,-1,10,2);ctx.restore();
  if(al<.05){ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(c.x,c.y,13,0,7);ctx.stroke();ctx.fillStyle='rgba(255,255,255,.8)';ctx.fillRect(c.x-4,c.y-.5,8,1);ctx.fillRect(c.x-4,c.y-4,1,8);ctx.fillRect(c.x+3,c.y-4,1,8)}
  const k=1+al*.18;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);ctx.scale(k,k);
  ctx.fillStyle='#1c2440';ctx.fillRect(-16,-.8,11,1.6);ctx.fillStyle='#e8e8ee';ctx.fillRect(-17,-3,1.2,6);
  ctx.fillStyle='#16203a';ctx.beginPath();ctx.ellipse(0,0,7.5,4.2,0,0,7);ctx.fill();ctx.fillStyle=c.col;ctx.beginPath();ctx.ellipse(-.3,0,7,3.7,0,0,7);ctx.fill();
  ctx.fillStyle='#f4f4f8';ctx.fillRect(-6,-.6,9,1.2);ctx.fillStyle='#8ac8f0';ctx.beginPath();ctx.ellipse(4,0,2.8,2.6,0,-1.4,1.4);ctx.fill();ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(4.4,-1.5,1,1);
  ctx.fillStyle='#2a2a30';ctx.fillRect(-4,-5,7,.8);ctx.fillRect(-4,4.2,7,.8);
  ctx.save();ctx.rotate(c.rot||0);ctx.fillStyle=al>.02||pl.car===c?'rgba(30,30,40,.35)':'#2a2a34';for(let i=0;i<4;i++){ctx.rotate(PI/2);ctx.fillRect(0,-.7,13,1.4)}ctx.restore();ctx.fillStyle='#333';ctx.beginPath();ctx.arc(0,0,1.3,0,7);ctx.fill();
  ctx.fillStyle=fr%30<15?'#ff3030':'#ffffff';ctx.fillRect(-17,-.5,1,1);ctx.restore();
  if(c.own&&!pl.car)pin(c.x,c.y-13,'#ff6fa5','♥')}
function drawPerson(x,y,a,o,walk){const mv=o._lw!==walk;o._lw=walk;const ph=(walk||0)*.3,st=mv?Math.sin(ph)*2.6:0,sw=-st*.8;
  ctx.fillStyle='rgba(16,12,40,.26)';ctx.beginPath();ctx.ellipse(x+.9,y+1.5,3.6,2.6,0,0,7);ctx.fill();
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(.72,.72);
  const sk=o.skin||'#d8a478',sh=o.shirt||o.col||'#3a6fd8',tr=o.trs||'#2a2e3a',hr=o.hair||'#2a1a12';
  if(o.robe){ctx.fillStyle=shade(sh,-.3);ctx.beginPath();ctx.ellipse(-.4,0,4.6,5.8,0,0,7);ctx.fill();ctx.fillStyle='#3a2a1a';ctx.fillRect(2+st*.4,-3.2,2.2,1.6);ctx.fillRect(2-st*.4,1.6,2.2,1.6)}
  else{ctx.fillStyle=tr;ctx.fillRect(-1,-3.3,2.4+st,2.2);ctx.fillRect(-1,1.1,2.4-st,2.2);ctx.fillStyle='#16161a';ctx.beginPath();ctx.ellipse(1.8+st,-2.2,1.7,1.15,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(1.8-st,2.2,1.7,1.15,0,0,7);ctx.fill();ctx.fillStyle='#ffffff30';ctx.fillRect(2.4+st,-2.6,.8,.5);ctx.fillRect(2.4-st,1.8,.8,.5)}
  if(o.acc=='backpack'){ctx.fillStyle=shade(o.accc,-.3);ctx.beginPath();ctx.ellipse(-3.4,0,2.3,3.6,0,0,7);ctx.fill();ctx.fillStyle=o.accc;ctx.beginPath();ctx.ellipse(-3.6,-.3,1.9,3.1,0,0,7);ctx.fill()}
  ctx.fillStyle=shade(sh,-.18);ctx.beginPath();ctx.ellipse(sw*.5,-4.9,2.6,1.35,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(-sw*.5,4.9,2.6,1.35,0,0,7);ctx.fill();
  ctx.fillStyle=sk;ctx.beginPath();ctx.arc(sw+2.1,-5,1,0,7);ctx.fill();ctx.beginPath();ctx.arc(-sw+2.1,5,1,0,7);ctx.fill();
  if(o.acc=='tote'){ctx.fillStyle=o.accc;ctx.fillRect(-sw-1,5.5,3.4,3.2);ctx.fillStyle=shade(o.accc,-.25);ctx.fillRect(-sw-1,5.5,3.4,.6)}
  ctx.fillStyle=shade(sh,-.32);ctx.beginPath();ctx.ellipse(0,0,3.3,5.3,0,0,7);ctx.fill();ctx.fillStyle=sh;ctx.beginPath();ctx.ellipse(-.3,-.35,2.9,4.8,0,0,7);ctx.fill();ctx.fillStyle=shade(sh,.22);ctx.beginPath();ctx.ellipse(-.9,-1.6,1.4,2.4,0,0,7);ctx.fill();
  if(o.robe){ctx.fillStyle='#e8a020';ctx.beginPath();ctx.moveTo(-2.4,-4.6);ctx.lineTo(-1,-4.6);ctx.lineTo(1.6,4.6);ctx.lineTo(.2,4.6);ctx.fill()}
  if(o.zip){ctx.fillStyle=shade(sh,.45);ctx.fillRect(2.4,-.3,.5,.6)}
  if(o.long){ctx.fillStyle=shade(hr,-.18);ctx.beginPath();ctx.ellipse(-1.8,0,2.6,3.1,0,0,7);ctx.fill()}
  ctx.fillStyle=shade(sk,-.1);ctx.beginPath();ctx.arc(1,-2.8,.85,0,7);ctx.fill();ctx.beginPath();ctx.arc(1,2.8,.85,0,7);ctx.fill();
  ctx.fillStyle=sk;ctx.beginPath();ctx.ellipse(1,0,2.9,2.65,0,0,7);ctx.fill();ctx.fillStyle=shade(sk,-.2);ctx.fillRect(3.5,-.35,.8,.7);
  if(o.hat){ctx.fillStyle=shade(o.hat,-.2);ctx.beginPath();ctx.ellipse(.3,0,3,2.95,0,0,7);ctx.fill();ctx.fillStyle=o.hat;ctx.beginPath();ctx.ellipse(.1,-.2,2.7,2.6,0,0,7);ctx.fill();if(o.cap){ctx.fillStyle=shade(o.hat,-.25);ctx.beginPath();ctx.ellipse(3,0,1.6,2.3,0,-1.6,1.6);ctx.fill()}else{ctx.fillStyle=shade(o.hat,.35);ctx.beginPath();ctx.arc(-.8,0,.8,0,7);ctx.fill()}}
  else{ctx.fillStyle=shade(hr,-.15);ctx.beginPath();ctx.ellipse(.15,0,2.85,2.75,0,0,7);ctx.fill();ctx.fillStyle=hr;ctx.beginPath();ctx.ellipse(-.05,-.15,2.55,2.45,0,0,7);ctx.fill();ctx.fillStyle=shade(hr,.32);ctx.beginPath();ctx.ellipse(-.4,-1,1.3,.75,-.3,0,7);ctx.fill()}
  ctx.restore()}
const DANNY={shirt:'#d6a93a',hair:'#3a2418',skin:'#c8946a',trs:'#2e3a5a',hat:'#c8282e',cap:1,zip:1},PEER={shirt:'#5ad1ff',hair:'#222',skin:'#c8946a',trs:'#2a2e3a'};
function pin(x,y,col,g){const b=Math.sin(fr*.08)*1.2;ctx.fillStyle='rgba(16,12,40,.3)';ctx.beginPath();ctx.ellipse(x,y+9,2.5,1.2,0,0,7);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y+b,4.5,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(x-2.5,y+b+3);ctx.lineTo(x+2.5,y+b+3);ctx.lineTo(x,y+b+6.5);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y+b,3.5,0,7);ctx.fill();
  if(g&&ICON[g]){ctx.fillStyle='#fff';const bm=ICON[g];for(let i=0;i<15;i++)if(bm[i]=='1')ctx.fillRect(x-1.5+(i%3)*1,y+b-2.5+((i/3)|0)*1,1,1)}else if(g){ctx.fillStyle='#fff';ctx.font='6px "Pixelify Sans"';ctx.textAlign='center';ctx.fillText(g,x,y+b+2)}}
function dogAt(x,y,a,col,big,walk,patch){const k=big?1.2:.85,st=Math.sin((walk||0)*.55)*1.1;
  ctx.fillStyle='rgba(16,12,40,.26)';ctx.beginPath();ctx.ellipse(x+.6,y+1,4.6*k,2.4*k,a,0,7);ctx.fill();
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(k,k);const dk=shade(col,-.38);
  ctx.fillStyle=dk;for(const [lx,ly,sg] of [[2.3,-1.8,1],[2.3,1.8,-1],[-2.3,-1.8,-1],[-2.3,1.8,1]]){ctx.beginPath();ctx.ellipse(lx+st*sg,ly,.8,.6,0,0,7);ctx.fill()}
  const tw=Math.sin(fr*.42)*.8;ctx.strokeStyle=shade(col,-.12);ctx.lineWidth=1;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-3.4,0);ctx.quadraticCurveTo(-5,tw*1.3,-6.2,tw*2.6);ctx.stroke();
  ctx.fillStyle=dk;ctx.beginPath();ctx.ellipse(0,.25,4,2.15,0,0,7);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(-.2,-.1,3.8,1.85,0,0,7);ctx.fill();
  if(patch){ctx.fillStyle=patch;ctx.beginPath();ctx.ellipse(-1.2,-.5,1.5,1.05,.3,0,7);ctx.fill()}
  ctx.fillStyle=shade(col,.28);ctx.beginPath();ctx.ellipse(-.6,-.9,2.6,.45,0,0,7);ctx.fill();
  ctx.fillStyle='#c42a36';ctx.fillRect(3,-1.35,.55,2.7);
  ctx.fillStyle=dk;ctx.beginPath();ctx.ellipse(4.5,.15,1.8,1.7,0,0,7);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(4.4,0,1.7,1.55,0,0,7);ctx.fill();
  ctx.fillStyle=shade(col,-.08);ctx.beginPath();ctx.ellipse(6,0,1.15,.85,0,0,7);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(6.95,0,.38,0,7);ctx.fill();
  ctx.fillStyle=dk;ctx.beginPath();ctx.ellipse(3.8,-1.65,1.15,.6,.55,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(3.8,1.65,1.15,.6,-.55,0,7);ctx.fill();
  ctx.fillStyle='#111';ctx.fillRect(4.9,-.95,.38,.38);ctx.fillRect(4.9,.57,.38,.38);ctx.restore()}
function drawDog(){if(!dog||dog.ride)return;dogAt(dog.x,dog.y,dog.a,'#b8783e',false,dog.walk,'#f0e6d0');if(!dog.follow&&Math.floor(fr/25)%3==0)pin(dog.x,dog.y-9,'#ff6fa5','♥')}
const parts=[];
function burst(x,y,type,n){for(let i=0;i<n;i++)parts.push({x,y,vx:(R()-.5)*1.2,vy:-.6-R()*.9,l:60+R()*30,type})}
function drawParts(f){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.x+=p.vx*f;p.y+=p.vy*f;p.vy+=p.type=='leaf'?.004*f:.02*f;if(p.type=='leaf'){p.vx=Math.sin((fr+i*20)*.03)*.3}p.l-=f;if(p.l<=0){parts.splice(i,1);continue}
  ctx.globalAlpha=Math.min(1,p.l/25);if(p.type=='heart'){ctx.fillStyle='#ff6fa5';ctx.fillRect(p.x-1,p.y,1,1);ctx.fillRect(p.x+.5,p.y,1,1);ctx.fillRect(p.x-1,p.y+.5,2.5,1);ctx.fillRect(p.x-.5,p.y+1.5,1.5,.8)}
  else if(p.type=='coin'){ctx.fillStyle='#f4c430';ctx.fillRect(p.x-1,p.y-1,2,2);ctx.fillStyle='#fff3a0';ctx.fillRect(p.x-1,p.y-1,1,1)}
  else if(p.type=='note'){ctx.fillStyle=i%2?'#ffd23a':'#ff6fa5';ctx.fillRect(p.x,p.y,1,3);ctx.fillRect(p.x-1.2,p.y+2,1.6,1.2);ctx.fillRect(p.x,p.y,1.6,.8)}
  else if(p.type=='leaf'){ctx.fillStyle=['#d8802a','#c8a030','#a84a20'][i%3];ctx.fillRect(p.x,p.y,1.5,1)}
  else if(p.type=='splash'){ctx.strokeStyle='rgba(200,220,255,.6)';ctx.lineWidth=.5;ctx.beginPath();ctx.arc(p.x,p.y,(40-p.l)*.06,0,7);ctx.stroke()}}ctx.globalAlpha=1}
/* light and weather */
const GLOW={};
function glow(col){if(GLOW[col])return GLOW[col];const [c,q]=cnv(64,64),g=q.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,col);g.addColorStop(.35,col.replace(/[\d.]+\)$/,'0.45)'));g.addColorStop(1,col.replace(/[\d.]+\)$/,'0)'));q.fillStyle=g;q.fillRect(0,0,64,64);return GLOW[col]=c}
const AMB=[[0,[58,70,128]],[5,[66,76,134]],[6.5,[170,150,190]],[8,[255,250,244]],[16,[255,248,236]],[17.2,[255,206,160]],[18.3,[176,150,196]],[19.5,[74,84,142]],[24,[58,70,128]]];
function ambient(){const d=new Date(),h=d.getHours()+d.getMinutes()/60;for(let i=1;i<AMB.length;i++)if(h<=AMB[i][0]){const [h0,a]=AMB[i-1],[h1,b]=AMB[i],t=(h-h0)/(h1-h0);return a.map((v,k)=>Math.round(v+(b[k]-v)*t))}return AMB[0][1]}

const drops=[];for(let i=0;i<110;i++)drops.push({x:R(),y:R(),s:.012+R()*.01,l:4+R()*5});
function draw(dtf){document.body.classList.toggle('big',!!(bigMap&&started));if(!ready||!window.R3)return;
  if(bigMap&&started){drawBig(pos());return}
  R3.render(dtf);
  const tag=$('#tag');if(started&&!DL){const a=ctxAct(),p=pos(),sc=a&&R3.project(p.x,p.y,pl.car?2.7:2.4);if(a&&sc&&!(a.l=='Get off'&&!matchMedia('(pointer:fine)').matches)){tag.hidden=false;if(tag._l!==a.l){tag._l=a.l;tag.innerHTML=`<b>${matchMedia('(pointer:fine)').matches?'E':'A'}</b>${esc(a.l)}`}tag.style.left=sc.x+'px';tag.style.top=(sc.y-8)+'px'}else tag.hidden=true}else tag.hidden=true}
const mm=$('#mm'),mx=mm.getContext('2d');
function drawMini(p){mx.imageSmoothingEnabled=true;const s=.32,R2=52;mx.clearRect(0,0,104,104);mx.drawImage(MAP,p.x-R2/s,p.y-R2/s,104/s,104/s,0,0,104,104);mx.fillStyle='rgba(10,12,30,.15)';mx.fillRect(0,0,104,104);
  const dot=(x,y,c,r)=>{let dx=(x-p.x)*s,dy=(y-p.y)*s;const l=hyp(dx,dy);if(l>48){dx*=48/l;dy*=48/l}mx.fillStyle=c;mx.beginPath();mx.arc(52+dx,52+dy,r,0,7);mx.fill()};
  if(route){mx.strokeStyle=dest?'#ff6fa5':'#ffb85c';mx.lineWidth=2.5;mx.lineJoin='round';mx.beginPath();route.forEach((q,i)=>{const X=52+(q[0]-p.x)*s,Y=52+(q[1]-p.y)*s;i?mx.lineTo(X,Y):mx.moveTo(X,Y)});mx.stroke()}if(dest)dot(dest.x,dest.y,'#ff6fa5',4.5);
  for(const kk in P)dot(P[kk].x,P[kk].y,P[kk].c,3.5);if(bike&&!pl.car)dot(bike.x,bike.y,'#ff6fa5',3);for(const pr of peersL)if(typeof pr.presence.x=='number')dot(pr.presence.x,pr.presence.y,'#5ad1ff',3.5);if(act)dot(act.tg.x,act.tg.y,'#ffb85c',4.5);
  mx.save();mx.translate(52,52);mx.rotate(p.a||0);mx.fillStyle='#fff';mx.beginPath();mx.moveTo(6,0);mx.lineTo(-4,-4);mx.lineTo(-2,0);mx.lineTo(-4,4);mx.fill();mx.restore()}
const MAPV={z:1,ox:0,oy:0};/* big map zoom and pan (offset of the view centre from the player, in map px) */
function mapZoom(f,sx,sy){if(!BIG)return;const z0=MAPV.z;MAPV.z=clamp(MAPV.z*f,.75,7);const k=MAPV.z/z0;if(sx==null){sx=IW/2;sy=IH/2}/* keep the map point under (sx,sy) fixed */const cx=BIG.bx+IW/2/BIG.s,cy=BIG.by+IH/2/BIG.s,X=BIG.bx+sx/BIG.s,Y=BIG.by+sy/BIG.s;MAPV.ox+=(X-cx)*(1-1/k);MAPV.oy+=(Y-cy)*(1-1/k)}
function drawBig(p){ctx.setTransform(1,0,0,1,0,0);if(BIG){const kx=K.right-K.left,ky=K.down-K.up;if(kx||ky){MAPV.ox+=kx*9/BIG.s*2;MAPV.oy+=ky*9/BIG.s*2}}const s=Math.max(IW/W,IH/H)*1.35*MAPV.z,vw=IW/s,vh=IH/s;MAPV.ox=clamp(MAPV.ox,-p.x,W-p.x);MAPV.oy=clamp(MAPV.oy,-p.y,H-p.y);const bx=clamp(p.x+MAPV.ox-vw/2,Math.min(0,(W-vw)/2),Math.max((W-vw)/2,W-vw)),by=clamp(p.y+MAPV.oy-vh/2,Math.min(0,(H-vh)/2),Math.max((H-vh)/2,H-vh));ctx.fillStyle='#1a1c2a';ctx.fillRect(0,0,IW,IH);ctx.imageSmoothingEnabled=true;ctx.drawImage(MAP,bx,by,vw,vh,0,0,IW,IH);ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='rgba(16,18,40,.25)';ctx.fillRect(0,0,IW,IH);BIG={s,bx,by};ctx.setTransform(s,0,0,s,-bx*s,-by*s);const k=1/s*2.2;drawRoute(3/s);if(dest){ctx.save();ctx.translate(dest.x,dest.y);ctx.scale(k,k);pin(0,-6,'#ff6fa5','♥');ctx.restore()}
  for(const kk in P){const q=P[kk];ctx.save();ctx.translate(q.x,q.y);ctx.scale(k,k);pin(0,-6,q.c,q.ic);ctx.restore()}
  if(act){ctx.fillStyle='#ffb85c';ctx.beginPath();ctx.arc(act.tg.x,act.tg.y,5*k,0,7);ctx.fill()}if(fr%30<20){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,4*k,0,7);ctx.fill()}
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='rgba(16,18,34,.8)';ctx.fillRect(0,IH-20,IW,20);ctx.fillStyle='#fff';ctx.font='10px "Pixelify Sans"';ctx.textAlign='center';ctx.fillText(matchMedia('(pointer:coarse)').matches?'Drag to move · pinch or − + to zoom · tap to set a destination · Map to close':'Drag to move · scroll or − + to zoom · click to set a destination · M to close',IW/2,IH-7)}

