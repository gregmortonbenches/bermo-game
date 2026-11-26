/* GTA Bermondsey: Game loop, start-up and controls. Loaded last: it starts the game.
   Classic script sharing one global scope with the other js/ files; load order is set in index.html. */
/* ---------- loop ---------- */
let lt=performance.now();
function maintain(){const p=pos();cars=cars.filter(c=>c.own||c===pl.car||!(!c.ai&&hyp(c.x-p.x,c.y-p.y)>600));
  let n=0;for(const c of cars)if(c.ai){n++;if(hyp(c.x-p.x,c.y-p.y)>500){const sp=spot(180,420);if(sp)Object.assign(c,{e:sp.e,s:sp.s,fw:sp.fw,x:sp.x,y:sp.y})}}
  for(;n<trafficTarget();n++){const sp=spot(180,420);if(sp)cars.push(mkCar(TT[n%TT.length],sp))}
  if(cars.filter(c=>!c.ai&&!c.own&&!c.rental).length<4){const sp=spot(120,260);if(sp)cars.push(kerbSpot(sp))}
  if(cars.filter(c=>c.rental&&hyp(c.x-p.x,c.y-p.y)<300).length<6){const sp=spot(40,260);if(sp){const r=kerbSpot(sp,R()<.5?'ebike':'scooter');r.rental=1;r.col='#2bd17e';cars.push(r)}}}
function heliFloor(c){let m=0;for(const [dx,dy] of [[0,0],[6,0],[-6,0],[0,6],[0,-6]])m=Math.max(m,R3.roofAt(c.x+dx,c.y+dy));return m/55}
/* helicopter flight: the rotor spools up before it lifts, climb and descent ease in and out, it hovers with a gentle bob, touches down softly, keeps its momentum, eases into turns, dips its nose at speed and banks into turns */
function heliStep(f){if(!heli)return;const h=heli,on=pl.car===h,fl=heliFloor(h);let a=h.alt||0;
  h.spool=clamp((h.spool||0)+(on?.012:h.landed?-.006:0)*f,0,1);
  const u=on&&(K.hup||btnU),d=on&&(K.brake||btnB),lift=h.spool>.8;
  let tv=u&&lift?.0075:d?-.008:0;if(d&&a-fl<.06)tv=-.0028;/* soft touchdown */
  h.vs=(h.vs||0)+(tv-(h.vs||0))*Math.min(1,.07*f);if(!on&&h.landed)h.vs=0;a+=h.vs*f;
  if(!h.landed&&!u&&!d&&on){h.bob=(h.bob||0)+f*.05;a+=Math.sin(h.bob)*.00018*f}
  h.alt=clamp(Math.max(a,fl),0,1.4);if(h.alt<=fl&&h.vs<0)h.vs=0;h.landed=h.alt-fl<.012;if(h.landed&&!on)h.alt=fl;
  h.rot=(h.rot||0)+.6*h.spool*f}
function heliFly(c,thr,steer,f){const T=TYPES.heli;c.vx=c.vx||0;c.vy=c.vy||0;c.yawv=c.yawv||0;
  if(c.landed){c.vx*=Math.pow(.8,f);c.vy*=Math.pow(.8,f);c.yawv=0;thr=0;steer=0}
  c.yawv+=(steer*.042-c.yawv)*Math.min(1,.1*f);c.a+=c.yawv*f;
  const acc=thr*.026*f;c.vx+=Math.cos(c.a)*acc;c.vy+=Math.sin(c.a)*acc;
  const dr=Math.pow(.978,f);c.vx*=dr;c.vy*=dr;const sp=hyp(c.vx,c.vy);if(sp>T.max){c.vx*=T.max/sp;c.vy*=T.max/sp}
  c.x=clamp(c.x+c.vx*f,10,W-10);c.y=clamp(c.y+c.vy*f,10,H-10);
  const fwd=c.vx*Math.cos(c.a)+c.vy*Math.sin(c.a);c.v=fwd;
  c.tilt=(c.tilt||0)+(-clamp(fwd*.16+thr*.08,-.12,.3)-(c.tilt||0))*Math.min(1,.08*f);/* nose down when flying forward */
  c.bank=(c.bank||0)+(clamp(c.yawv*5+(fwd>.2?steer*.08:0),-.35,.35)-(c.bank||0))*Math.min(1,.08*f)}
let heli=null;
function ensureHeli(){if(heli&&cars.includes(heli))return;const g=nearWalk(1010,1830);heli=mkParked('heli',g.x,g.y,-.4,'#16181c');heli.own=1;heli.alt=0;cars.push(heli)}
function step(f,dt){heliStep(f);if(fr%40==0)updateRoute();if(pl.car){carStep(f);pl.jz=0;pl.jv=0}else{jumpStep(f);footStep(f)}pedFeel(f);
  for(const c of cars){if(c===pl.car)continue;if(c.spin){c.a+=c.spin*f;c.spin*=Math.pow(.88,f);if(Math.abs(c.spin)<.001)c.spin=0}if(c.ai)aiStep(c,f);else if(Math.abs(c.v)>.004){c.v*=.94;move(c,f)}}
  dogStep(f);worldStep(f);if(fr%30==0)maintain();misUpdate(dt);bumpCD-=dt;shake=Math.max(0,shake-f*.3);if(fr%9==0)syncCrew()}
function loop(t){requestAnimationFrame(loop);const ms=Math.min(50,t-lt);lt=t;const f=ms/16.67,dt=ms/1000;fr++;
  if(started&&!paused&&ready)step(f,dt);else if(!started)att+=ms;
  sndUpdate(f);draw(f);if(fr%12==0)hud()}
setInterval(()=>{if(started)writeSave()},20000);setInterval(()=>{if(started)syncMember()},60000);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started)writeSave()});addEventListener('pagehide',()=>{if(started)writeSave()});

/* ---------- start ---------- */
function startGame(){if(started||!ready)return;musStart();sfxCtx();{const w=nearWalk(BELLK.x+Math.cos(BELLK.a)*16+4,BELLK.y+Math.sin(BELLK.a)*16+6);S.x=w.x;S.y=w.y;CAM.yaw=Math.atan2(BELLK.y-w.y,BELLK.x-w.x);pl.a=CAM.yaw}pl.x=S.x;pl.y=S.y;if(hit(pl.x,pl.y,2)||!S.x){pl.x=P.flat.x;pl.y=P.flat.y}{const t=tAt(pl.x,pl.y);if(t==1||t==7){const w=nearWalk(pl.x,pl.y);pl.x=w.x;pl.y=w.y}}seedTraffic();ensureBike();ensureHeli();cam.ok=0;
  started=true;$('#title').hidden=true;document.body.classList.remove('pre');
  if(!S.intro){S.intro=1;dlg('intro',{who:'NEW MESSAGE · MUM',title:'Morning, Sam!',text:'"Saw an old coffee cart going spare down Maltby Street. You\'ve always wanted one! You\'d need about £2,000 to get it going. Bermondsey\'s full of people who need a hand."<br><br>Help out around Bermondsey, then put your earnings in the savings tin at your flat on Abbey Street. Your e-cargo bike (♥) is parked outside.<br><br><span style="opacity:.7">'+(matchMedia('(pointer:fine)').matches?'WASD or arrows to move · drag the mouse to look · E to interact · Shift to run · M map · B bag':'Left stick to move · right stick to look around · A to interact')+'</span>',opts:[["Let's go!",()=>{}]]})}
  writeSave()}
$('#startB').addEventListener('click',startGame);


/* ---------- controls ---------- */
function aBtn(){if(!ready)return;if(!started){startGame();return}if(DL){pick(DL.sel);return}if(bigMap){toggleMap();return}if(!paused){const a=ctxAct();if(a)a.f()}}
function startBtn(){if(!started){startGame();return}if(DL&&(dlgMode=='crew'||dlgMode=='menu')){closeDlg();return}if(!DL)menuDlg()}
function toggleMap(){if(!started||DL)return;bigMap=!bigMap;paused=bigMap;if(bigMap){MAPV.z=1;MAPV.ox=0;MAPV.oy=0}}
const KM={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ShiftLeft:'run',ShiftRight:'run',Space:'brake',KeyQ:'hup',PageUp:'hup',PageDown:'brake'};
addEventListener('keydown',e=>{if(e.target.tagName=='INPUT'){if(e.key=='Enter'&&DL)pick(0);if(e.key=='Escape')closeDlg();return}
  if(DL){if(e.code=='ArrowUp'||e.code=='KeyW'){moveSel(-1);e.preventDefault()}else if(e.code=='ArrowDown'||e.code=='KeyS'){moveSel(1);e.preventDefault()}else if(e.code=='KeyE'||e.code=='Enter'||e.code=='Space'){pick(DL.sel);e.preventDefault()}else if(e.code=='Escape'||e.code=='KeyQ')closeDlg();return}
  if(KM[e.code]){K[KM[e.code]]=1;e.preventDefault()}if(e.code=='KeyE'||e.code=='Enter')aBtn();if(e.code=='KeyB'||e.code=='KeyC')startBtn();if(e.code=='KeyM'||e.code=='Tab'){toggleMap();e.preventDefault()}if(e.code=='Equal'||e.code=='NumpadAdd')bigMap?mapZoom(1.25):setZoom(ZF*1.15);if(e.code=='Minus'||e.code=='NumpadSubtract')bigMap?mapZoom(1/1.25):setZoom(ZF/1.15);if(e.code=='KeyR'&&started&&!DL)destDlg();if(e.code=='KeyN'&&started)toggleMusic()});
addEventListener('keyup',e=>{if(KM[e.code])K[KM[e.code]]=0});
addEventListener('blur',()=>{for(const k in K)K[k]=0;btnB=false;btnU=false;btnJ=false;joy={x:0,y:0,m:0}});
const c3=$('#c3');
function coarse(){document.body.classList.remove('fine');document.body.classList.add('coarse')}
if(matchMedia('(pointer:coarse)').matches)coarse();
const ST={L:{id:null,o:null,el:$('#stL')},R:{id:null,o:null,el:$('#stR')}};let mouse=null;
c3.addEventListener('pointerdown',e=>{if(e.pointerType!='mouse')coarse();if(!started)return;try{c3.setPointerCapture(e.pointerId)}catch(_){}
  if(e.pointerType=='mouse'){mouse={id:e.pointerId,x:e.clientX,y:e.clientY};return}
  const s=ST[e.clientX<innerWidth*.5?'L':'R'];if(s.id!==null)return;s.id=e.pointerId;s.o={x:e.clientX,y:e.clientY};s.el.style.left=s.o.x+'px';s.el.style.top=s.o.y+'px';s.el.classList.add('on');s.el.querySelector('i').style.transform=''});
c3.addEventListener('pointermove',e=>{if(mouse&&e.pointerId===mouse.id){CAM.yaw+=(e.clientX-mouse.x)*.006;CAM.pitch=clamp(CAM.pitch+(e.clientY-mouse.y)*.004,.05,1.1);CAM.manual=2;mouse.x=e.clientX;mouse.y=e.clientY;return}
  for(const k in ST){const s=ST[k];if(s.id!==e.pointerId)continue;let dx=e.clientX-s.o.x,dy=e.clientY-s.o.y;const l=hyp(dx,dy),m=52;if(l>m){dx=dx/l*m;dy=dy/l*m}s.el.querySelector('i').style.transform=`translate(${dx}px,${dy}px)`;
    const mg=Math.min(1,l/m);if(k=='L')joy={x:dx/m,y:dy/m,m:mg};else{const dz=v=>Math.abs(v)<.12?0:(v-Math.sign(v)*.12)/.88;CAM.rx=dz(dx/m);CAM.ry=dz(dy/m)}}});
const pEnd=e=>{if(mouse&&e.pointerId===mouse.id)mouse=null;for(const k in ST){const s=ST[k];if(s.id!==e.pointerId)continue;s.id=null;s.el.style.left='';s.el.style.top='';s.el.classList.remove('on');s.el.querySelector('i').style.transform='';if(k=='L')joy={x:0,y:0,m:0};else{CAM.rx=0;CAM.ry=0}}};
c3.addEventListener('pointerup',pEnd);c3.addEventListener('pointercancel',pEnd);
const MP=new Map();let mapDrag=0,mapPinch=0;const mXY=e=>[e.clientX/innerWidth*IW,e.clientY/innerHeight*IH];
cv.addEventListener('pointerdown',e=>{if(!(bigMap&&BIG))return;try{cv.setPointerCapture(e.pointerId)}catch(_){}MP.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY});mapDrag=0;if(MP.size==2){const [a,b]=[...MP.values()];mapPinch=hyp(a.x-b.x,a.y-b.y);mapDrag=99}});
cv.addEventListener('pointermove',e=>{const q=MP.get(e.pointerId);if(!q||!BIG)return;const dx=e.clientX-q.x,dy=e.clientY-q.y;q.x=e.clientX;q.y=e.clientY;mapDrag=Math.max(mapDrag,hyp(e.clientX-q.x0,e.clientY-q.y0));
  if(MP.size>=2){const [a,b]=[...MP.values()],d=hyp(a.x-b.x,a.y-b.y);if(mapPinch>0&&d>0)mapZoom(d/mapPinch,(a.x+b.x)/2/innerWidth*IW,(a.y+b.y)/2/innerHeight*IH);mapPinch=d}else if(mapDrag>6){MAPV.ox-=dx/innerWidth*IW/BIG.s;MAPV.oy-=dy/innerHeight*IH/BIG.s}});
const mapUp=e=>{const q=MP.get(e.pointerId);if(!q)return;MP.delete(e.pointerId);if(MP.size<2)mapPinch=0;if(e.type=='pointerup'&&MP.size==0&&mapDrag<=6&&bigMap&&BIG){const [sx,sy]=mXY(e),X=BIG.bx+sx/BIG.s,Y=BIG.by+sy/BIG.s;setDest(X,Y,streetAt(X,Y)||'Map pin')}};
cv.addEventListener('pointerup',mapUp);cv.addEventListener('pointercancel',mapUp);
cv.addEventListener('wheel',e=>{if(!(bigMap&&BIG))return;e.preventDefault();const [sx,sy]=mXY(e);mapZoom(Math.exp(-e.deltaY*.0018),sx,sy)},{passive:false});
$('#bA').addEventListener('pointerdown',e=>{e.preventDefault();aBtn()});
const bB=$('#bB');bB.addEventListener('pointerdown',e=>{e.preventDefault();if(DL){closeDlg();return}btnB=true;bB.classList.add('on')});for(const ev of ['pointerup','pointercancel','pointerleave'])bB.addEventListener(ev,()=>{btnB=false;bB.classList.remove('on')});
$('#menuB').addEventListener('click',startBtn);$('#ziB').addEventListener('click',()=>bigMap?mapZoom(1.35):setZoom(ZF*1.2));$('#zoB').addEventListener('click',()=>bigMap?mapZoom(1/1.35):setZoom(ZF/1.2));
c3.addEventListener('wheel',e=>{e.preventDefault();setZoom(ZF*Math.exp(-e.deltaY*.0015))},{passive:false});
$('#mmWrap').addEventListener('click',toggleMap);$('#mmWrap').addEventListener('keydown',e=>{if(e.key=='Enter'||e.key==' '){e.preventDefault();toggleMap()}});
setInterval(()=>{const hl=pl.car&&pl.car.type=='heli';$('#bB').textContent=hl?'DOWN':pl.car?'BRAKE':'RUN';$('#bU').hidden=!hl;$('#bJ').hidden=!!pl.car},300);
{const bJ=$('#bJ');bJ.addEventListener('pointerdown',e=>{e.preventDefault();btnJ=true;bJ.classList.add('on')});for(const ev of ['pointerup','pointercancel','pointerleave'])bJ.addEventListener(ev,()=>{btnJ=false;bJ.classList.remove('on')})}
const bU=$('#bU');bU.addEventListener('pointerdown',e=>{e.preventDefault();btnU=true;bU.classList.add('on')});for(const ev of ['pointerup','pointercancel','pointerleave'])bU.addEventListener(ev,()=>{btnU=false;bU.classList.remove('on')});

load().catch(e=>{$('#startB').textContent='Map failed to load';console.error(e)});initOnline();requestAnimationFrame(loop);
