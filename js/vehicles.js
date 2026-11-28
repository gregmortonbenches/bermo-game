/* GTA Bermondsey: Traffic, your own vehicles, crashes, haptics and jumping.
   Classic script sharing one global scope with the other js/ files; load order is set in index.html. */
/* ---------- entities ---------- */
const pl={x:0,y:0,a:0,car:null,walk:0};
let cars=[],act=null,started=false,paused=false,bigMap=false,shake=0,bumpCD=0,fr=0,att=0,tint=0,lastZone='',lastStreet='',bike=null,van=null,dog=null;
const pos=()=>pl.car||pl;
function edgePos(e,s,fw){const L=e.len;const d=clamp(fw?s:L-s,0,L);let i=1;while(i<e.cum.length-1&&e.cum[i]<d)i++;const p0=e.p[i-1],p1=e.p[i],sl=(e.cum[i]-e.cum[i-1])||1,t=(d-e.cum[i-1])/sl;let hx=(p1[0]-p0[0])/sl,hy=(p1[1]-p0[1])/sl;if(!fw){hx=-hx;hy=-hy}return[p0[0]+(p1[0]-p0[0])*t,p0[1]+(p1[1]-p0[1])*t,hx,hy]}
function spot(minD,maxD,ox,oy){const p=pos();ox=ox??p.x;oy=oy??p.y;for(let i=0;i<150;i++){const ei=MAIN[R()*MAIN.length|0],e=EDGES[ei],s=R()*e.len,fw=R()<.5,[x,y]=edgePos(e,s,fw);const d=hyp(x-ox,y-oy);if(d<minD||d>maxD)continue;if(tAt(x,y)==7||e.off)continue;return{e:ei,s,fw,x,y}}return null}
function mkCar(type,sp){const e=EDGES[sp.e];if(!okDir(e,sp.fw))sp.fw=!sp.fw;const [x,y,hx,hy]=edgePos(e,sp.s,sp.fw),off=laneOff(e);
  return{type,col:type=='cab'?'#16161c':type=='van'?'#ecebe6':type=='bus'?'#d42a1e':type=='scooter'||type=='ebike'?'#2bd17e':type=='courier'?'#16b8a6':COLS[R()*COLS.length|0],rc:SHIRTS[R()*SHIRTS.length|0],hc:HAIRS[R()*HAIRS.length|0],ev:R()<.55,hp:100,v:0,ai:true,wait:0,ghost:0,e:sp.e,s:sp.s,fw:sp.fw,x:x+hy*off,y:y-hx*off,a:Math.atan2(hy,hx)}}
function mkParked(type,x,y,a,col){return{type,col:col||COLS[R()*COLS.length|0],hp:100,v:0,ai:false,x,y,a,wait:0,ghost:0}}
// move a car that's overlapping a bollard, parked car or kerb furniture to the nearest clear spot (keeps its heading)
function unstick(c){const ca=Math.cos(c.a),sa=Math.sin(c.a),fc=(x,y)=>[7,10,13].every(d=>[0,1.3,-1.3].every(k=>!solP(x+ca*d-sa*k,y+sa*d+ca*k)));if(!hit(c.x,c.y,1.1)&&fc(c.x,c.y))return true;/* also nudge a car whose nose is boxed in by a lamp post or signal just ahead */
  for(const strict of hit(c.x,c.y,1.1)?[true,false]:[true])for(let r=1;r<=14;r++)for(const [u,v] of [[r,0],[-r,0],[0,r],[0,-r],[r,r],[-r,r],[r,-r],[-r,-r]]){const x=c.x+ca*u-sa*v,y=c.y+sa*u+ca*v;if(!hit(x,y,1.4)&&(strict?fc(x,y):!solP(x+ca*7,y+sa*7))&&!solP(x-ca*7,y-sa*7)){c.x=x;c.y=y;return true}}return !hit(c.x,c.y,1.1)}
function kerbSpot(sp,type){const e=EDGES[sp.e],[x,y,hx,hy]=edgePos(e,e.len>48?clamp(sp.s,24,e.len-24):e.len/2,sp.fw),off=e.w/2+2;/* keep kerb-parked cars out of junction mouths, where they'd sit across the crossing road's lane */return mkParked(type||['hatch','hatch','cab','van'][R()*4|0],x+hy*off,y-hx*off,Math.atan2(hy,hx))}
function nearKerb(x,y,type,col){let best=null;for(const ei of MAIN){const e=EDGES[ei];if(hyp(e.p[0][0]-x,e.p[0][1]-y)>260)continue;for(let s=0;s<e.len;s+=4){const q=edgePos(e,s,true),d=hyp(q[0]-x,q[1]-y);if(!best||d<best[0])best=[d,q,e]}}
  if(!best)return mkParked(type,x,y,0,col);const [,q,e]=best,off=e.w/2+2,A=Math.atan2(q[3],q[2]);for(const [sd,al] of [[1,10],[-1,10],[1,-10],[-1,-10],[1,0],[-1,0]]){const X=q[0]+q[3]*off*sd+q[2]*al,Y=q[1]-q[2]*off*sd+q[3]*al;if(!hit(X,Y,3))return mkParked(type,X,Y,A,col)}return mkParked(type,q[0]+q[2]*14,q[1]+q[3]*14,A,col)}
const TT=['hatch','hatch','cab','van','bus','scooter','ebike','courier','hatch','hatch','cab','bus','ebike'];
function seedTraffic(){cars=cars.filter(c=>c.own);for(let i=0;i<22;i++){const c=trafficCar(i,30,420);if(c)cars.push(c)}for(let i=0;i<6;i++){const sp=spot(15,160);if(sp){const k=kerbSpot(sp);if(unstick(k))cars.push(k)}}}
function ensureBike(){if(bike&&cars.includes(bike))return;const p=S.bx?{x:S.bx,y:S.by}:P.flat;bike=S.bx?mkParked('bike',S.bx,S.by,0,'#1fb5a8'):nearKerb(P.flat.x,P.flat.y,'bike','#1fb5a8');bike.own=1;cars.push(bike)}

/* ---------- friendly traffic: drives on the left along the real street graph ---------- */
const okDir=(e,fw)=>!e.ow||(e.ow==1)==fw;const laneOff=e=>e.ow?e.w*.1:e.w<=15?.6:Math.max(2.6,e.w/4);
function aiStep(c,f){const e=EDGES[c.e],[x,y,hx,hy]=edgePos(e,c.s,c.fw),off=laneOff(e),tx=x+hy*off,ty=y-hx*off;
  const fx=c.x+Math.cos(c.a)*(TYPES[c.type].w*.7),fy=c.y+Math.sin(c.a)*(TYPES[c.type].w*.7);let blkP=!pl.car&&(hyp(pl.x-fx,pl.y-fy)<5||(c.rt!=null?busBeside(c,pl.x,pl.y):hyp(pl.x-c.x,pl.y-c.y)<TYPES[c.type].w*.6)),blk=blkP||(pl.car&&pl.car.type!='heli'&&hyp(pl.car.x-fx,pl.car.y-fy)<9);const blkC=!blkP&&blk;
  if(!blk)for(const q of peds)if(hyp(q.x-fx,q.y-fy)<4){blkP=blk=true;break}
  if(!blk)for(const q of specials)if(hyp(q.x-fx,q.y-fy)<4){blkP=blk=true;break}
  if(!blk)for(const o of cars)if(o!==c&&Math.abs(o.x-fx)<6&&Math.abs(o.y-fy)<6){blk=true;break}
  if(dog&&hyp(dog.x-fx,dog.y-fy)<6)blk=true;
  if(blk&&(c.ghost<=0||blkP)){c.wait+=f;c.v=0;if(blkP){c.ghost=0;if(c.wait>90&&c.wait-f<=90&&hyp(pl.x-c.x,pl.y-c.y)<20)toast(['*Beep beep*','"After you, mate!"','The driver waits patiently.'][R()*3|0])}else if(blkC&&c.rt==null&&c.wait>30&&Math.cos(pl.car.a-c.a)<-.5&&okDir(e,!c.fw)){/* nose to nose with the player on a narrow street: the other driver politely turns round */c.fw=!c.fw;c.s=e.len-c.s;c.wait=0;if(hyp(pl.car.x-c.x,pl.car.y-c.y)<30)toast('The other driver gives you a wave and turns round.')}else if(c.wait>180){c.ghost=50;c.wait=0}}
  else if(c.rt!=null&&busWait(c,f))c.wait=0;
  else{c.ghost-=f;c.wait=0;const sp=(c.type=='bus'?.75:c.type=='scooter'||c.type=='ebike'||c.type=='courier'?.8:.9)*f*.3;c.v=sp/f;c.s+=sp;
    if(c.s>=e.len&&c.rt!=null)busTurn(c);else if(c.s>=e.len){const n=c.fw?e.b:e.a;let o=ADJ[n].filter(i=>i!==c.e&&!EDGES[i].off&&okDir(EDGES[i],EDGES[i].a===n));if(!o.length)o=ADJ[n].filter(i=>i!==c.e&&!EDGES[i].off);if(!o.length)o=[c.e];/* never drive onto roads that leave the map: turn round instead */const ne=o[R()*o.length|0];c.s=Math.min(c.s-e.len,EDGES[ne].len);c.fw=EDGES[ne].a===n;c.e=ne}}
  const k=c.rt!=null&&hyp(tx-c.x,ty-c.y)>60?1:Math.min(1,.3*f);/* a bus coming back onto the map arrives at once, it doesn't slide there */c.x+=(tx-c.x)*k;c.y+=(ty-c.y)*k;c.a+=angDiff(Math.atan2(hy,hx),c.a)*Math.min(1,.25*f)}

/* ---------- your own vehicles ---------- */
function move(c,f){if(c.type=='heli'){c.x=clamp(c.x+Math.cos(c.a)*c.v*f,10,W-10);c.y=clamp(c.y+Math.sin(c.a)*c.v*f,10,H-10);return true}const T=TYPES[c.type],ca=Math.cos(c.a),sa=Math.sin(c.a),nx=c.x+ca*c.v*f,ny=c.y+sa*c.v*f,sg=Math.sign(c.v)||1;
  const nose=(k)=>solP(nx+ca*T.w*.45*sg-sa*k,ny+sa*T.w*.45*sg+ca*k);if(hit(nx,ny,1.1)||nose(0)||nose(1.1)||nose(-1.1)){
    /* glancing contact (e.g. a kerbside parked car's flank): the player's car slides sideways a touch instead of bouncing back */
    if(c===pl.car&&!solP(nx+ca*T.w*.45*sg,ny+sa*T.w*.45*sg))for(const k of [.35,-.35,.7,-.7]){const X=nx-sa*k,Y=ny+ca*k,ns=(j)=>solP(X+ca*T.w*.45*sg-sa*j,Y+sa*T.w*.45*sg+ca*j);if(!hit(X,Y,1.1)&&!ns(0)&&!ns(1.1)&&!ns(-1.1)){c.x=X;c.y=Y;c.v*=.97;return true}}
    const kk=Math.abs(c.v)/TYPES[c.type].max;if(c===pl.car&&Math.abs(c.v)>.12)crash(c,kk);c.v=-c.v*(c===pl.car&&kk>.35?.4:.25);return false}
  c.x=nx;c.y=ny;return true}
/* driving feel numbers in one place */
const DRV_TUNE={launch:1.3,topEase:.8,steerEase:.28,wideAtSpeed:.3,roll:-.045,pitch:2.5};
function drive(c,thr,steer,hb,f){const T=TYPES[c.type];if(c.type=='heli'){heliFly(c,thr,steer,f);return}const r=clamp(Math.abs(c.v)/T.max,0,1),v0=c.v;/* snappy launch that eases into top speed; steering eases in and gets wider as you go faster */
  c.v+=thr*T.acc*f*(thr>0&&c.v>=0?DRV_TUNE.launch-DRV_TUNE.topEase*r*r:1);if(hb)c.v*=Math.pow(.88,f);c.v*=Math.pow(.985,f);c.v=clamp(c.v,-T.max*.4,T.max);
  c.sw=(c.sw||0)+(steer-(c.sw||0))*Math.min(1,DRV_TUNE.steerEase*f);
  c.a+=c.sw*.05*(1-DRV_TUNE.wideAtSpeed*r)*f*clamp(c.v/.12,-1,1);
  c.roll=(c.roll||0)+(c.sw*r*DRV_TUNE.roll-(c.roll||0))*Math.min(1,.15*f);c.pit=(c.pit||0)+(clamp((c.v-v0)/Math.max(f,.01)*DRV_TUNE.pitch,-.05,.05)-(c.pit||0))*Math.min(1,.2*f);if(c.spin){c.a+=c.spin*f;c.spin*=Math.pow(.9,f);if(Math.abs(c.spin)<.001)c.spin=0}move(c,f)}
function bump(c){for(const o of cars){if(o===c)continue;const dx=o.x-c.x,dy=o.y-c.y,d=hyp(dx,dy),md=(TYPES[c.type].w+TYPES[o.type].w)*.33;
  if(d<md&&d>0){const push=(md-d)/2,ux=dx/d,uy=dy/d;if(!o.ai&&!hit(o.x+ux*push,o.y+uy*push,2)){o.x+=ux*push;o.y+=uy*push}if(!hit(c.x-ux*push,c.y-uy*push,2)){c.x-=ux*push;c.y-=uy*push}
    const tow=(Math.cos(c.a)*ux+Math.sin(c.a)*uy)*Math.sign(c.v||1);if(tow>.3){if(c===pl.car&&Math.abs(c.v)>.2&&!(o.crashT>fr-20)){const k=Math.abs(c.v)/TYPES[c.type].max;crash(c,k,o);const sh=Math.min(6,k*7);if(!hit(o.x+ux*sh,o.y+uy*sh,2)){o.x+=ux*sh;o.y+=uy*sh}}else if(Math.abs(c.v)>.22)oops();c.v*=.5;if(!o.ai)o.v*=.5}}}}
function oops(){if(bumpCD>0)return;bumpCD=4;toast(['Sorry! Sorry!','Oops. Careful, Sam.','"Watch it, love!"','Whoops!'][R()*4|0])}
/* ---------- feel: haptics, crash physics, jumping, startled pedestrians, sound effects (all slapstick, nobody gets hurt) ---------- */
const HAPT={on:true,last:0};try{HAPT.on=localStorage.getItem('gtab-haptic')!=='off'}catch(e){}
function buzz(p,str){if(!HAPT.on)return;const now=performance.now();if(now-HAPT.last<70)return;HAPT.last=now;try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}
  try{const ms=Array.isArray(p)?p.reduce((a,b)=>a+b,0):p;for(const g of (navigator.getGamepads?navigator.getGamepads():[])){const va=g&&g.vibrationActuator;if(va&&va.playEffect)va.playEffect('dual-rumble',{duration:ms,strongMagnitude:clamp(str,0,1),weakMagnitude:clamp(str*.7+.1,0,1)}).catch(()=>{})}}catch(e){}}
function toggleHaptic(){HAPT.on=!HAPT.on;try{localStorage.setItem('gtab-haptic',HAPT.on?'on':'off')}catch(e){}toast(HAPT.on?'Vibration on.':'Vibration off.');if(HAPT.on)buzz(40,.5)}
function fx(x,y,type,n,h){if(window.R3&&R3.fx)R3.fx(x,y,h||0,type,n)}
const YELP=['"Woah!"','"Blimey!"','"Mind out!"','"Easy, tiger!"','"Steady on!"','"Oi oi!"','"Not today, Sam!"'],
  CRASH=['CRUNCH! That\'ll buff out.','"Oof!" Bit of a bump there, Sam.','*BANG* ... the bonnet\'s fine. Probably.','Ka-DUNK! The whole street turns to look.','"Was that a wall? That was a wall."'],
  RAMMED=['"Oi! Eyes on the road, Sam!"','*HOOOONK* "Really, mate?!"','"My no-claims bonus!" They shake their head, then laugh.','*Beep beep beep!* An outraged little toot.','"I only just got it washed!"'];
let yelpCD=0;
function crash(c,k,o){/* k: impact 0..1 (speed against top speed); o: the other car, if any */k=clamp(k,0,1);c.spin=(c.spin||0)+(R()-.5)*.16*k;c.crashT=fr;c.crashK=k;shake=Math.max(shake,1.2+k*6);
  const sg=Math.sign(c.v||1),nx=c.x+Math.cos(c.a)*TYPES[c.type].w*.45*sg,ny=c.y+Math.sin(c.a)*TYPES[c.type].w*.45*sg;
  fx(nx,ny,'spark',3+k*14|0,.5);if(k>.35){fx(nx,ny,'debris',3+k*9|0,.6);fx(nx,ny,'dust',4+k*5|0,.1)}
  sfxCrunch(k);buzz(k>.6?[70,40,110]:k>.35?60:25,.3+k*.7);
  if(o){o.crashT=fr;o.crashK=k*.8;o.spin=(o.spin||0)+(R()-.5)*.1*k;if(bumpCD<=0){bumpCD=3;toast(RAMMED[R()*RAMMED.length|0])}}
  else if(k>.35&&bumpCD<=0){bumpCD=3;toast(CRASH[R()*CRASH.length|0])}else oops();
  if(k>.3){for(const q of peds)if(hyp(q.x-c.x,q.y-c.y)<45&&!(q.jz>0)){q.jv=1.6+R()*1.4;q.jz=.001;q.startle=50}/* everyone nearby jumps out of their skin */
    }}
function pedFeel(f){const dt=f/60,c=pl.car;yelpCD-=dt;const fast=c&&c.type!='heli'&&Math.abs(c.v)>.16,ca=c?Math.cos(c.a):0,sa=c?Math.sin(c.a):0,sg=c?Math.sign(c.v||1):1;
  for(const q of peds){if(q.jv||q.jz>0){q.jv-=15*dt;q.jz=(q.jz||0)+q.jv*dt;if(q.jz<=0){q.jz=0;q.jv=0}}if(q.startle>0)q.startle-=f;
    if(q.dodge>0){q.dodge-=f;const nx=q.x+q.dx*f,ny=q.y+q.dy*f;if(!hitW(nx,ny)){q.x=nx;q.y=ny}else q.dodge=0}
    else if(fast){const dx=q.x-c.x,dy=q.y-c.y,ah=(dx*ca+dy*sa)*sg,lat=-dx*sa+dy*ca;
      if(ah>-2&&ah<10+Math.abs(c.v)*40&&Math.abs(lat)<4.5){/* a car is coming straight at them: leap aside with a yelp */let side=Math.sign(lat)||(R()<.5?1:-1);if(hitW(q.x-sa*side*7,q.y+ca*side*7))side=-side;
        q.dodge=24;q.dx=-sa*side*.3;q.dy=ca*side*.3;q.a=Math.atan2(q.dy,q.dx);q.jv=3.2;q.jz=.001;q.startle=70;q.t=100;q.talk=0;
        if(yelpCD<=0&&hyp(dx,dy)<30){yelpCD=4;toast(YELP[R()*YELP.length|0])}buzz(14,.2)}}}}
function jumpStep(f){const k=K.brake||btnJ;if(k&&!pl.jHeld&&!(pl.jz>0)){const ed=roofEdgeDir();if(ed!=null){pl.jHeld=k;startChute(pl.z,Math.cos(ed)*.09,Math.sin(ed)*.09);pl.x+=Math.cos(ed)*4.5;pl.y+=Math.sin(ed)*4.5;return}pl.jv=5.6;pl.jz=.001;buzz(8,.12);sfxJump()}pl.jHeld=k;
  if(pl.jz>0||pl.jv>0){const dt=f/60;pl.jv-=16*dt;pl.jz+=pl.jv*dt;if(pl.jz<=0){const hard=pl.jv<-4.2;pl.jz=0;pl.jv=0;if(!(pl.z>0)&&hitW(pl.x,pl.y)){const w=nearWalk(pl.x,pl.y);pl.x=w.x;pl.y=w.y}fx(pl.x,pl.y,'dust',hard?8:5,pl.z||0);buzz(hard?22:12,hard?.35:.2);sfxLand(hard)}}}


