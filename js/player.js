/* GTA Bermondsey: On foot, bikes, driving controls, getting in and out, and the lost dog.
   Classic script sharing one global scope with the other js/ files; load order is set in index.html. */
/* ---------- player ---------- */
const K={up:0,down:0,left:0,right:0,run:0,brake:0,hup:0};let joy={x:0,y:0,m:0},btnB=false,btnU=false,btnJ=false;
function inVec(){let mx=0,my=0,mag=0;if(joy.m>.15){mx=joy.x/joy.m;my=joy.y/joy.m;mag=Math.min(1,joy.m*1.15)}else{mx=K.right-K.left;my=K.down-K.up;const l=hyp(mx,my);if(l){mx/=l;my/=l;mag=1}}
  if(!mag)return{x:0,y:0,m:0};const fw=-my,rt=mx,c=Math.cos(CAM.yaw),sn=Math.sin(CAM.yaw);return{x:c*fw-sn*rt,y:sn*fw+c*rt,m:mag}}
function footStep(f){const v=inVec(),run=K.run||btnB,sp=(run?.175:.1)*v.m*f;
  if(v.m){pl.a+=angDiff(Math.atan2(v.y,v.x),pl.a)*Math.min(1,.3*f);pl.walk+=f}
  const nx=pl.x+v.x*sp,ny=pl.y+v.y*sp;if(pl.z>0){const ok=(x,y)=>Math.abs(R3.roofAt(x,y)-pl.z)<.6||(heli&&hyp(x-heli.x,y-heli.y)<12);if(ok(nx,pl.y))pl.x=nx;if(ok(pl.x,ny))pl.y=ny;return}if(!hitW(nx,pl.y))pl.x=nx;if(!hitW(pl.x,ny))pl.y=ny}
const TWO={bike:1,ebike:1,scooter:1};
function twoStep(c,f){const v=inVec(),mag=v.m,T=TYPES[c.type],hb=K.brake||btnB;
  if(mag>0){c.a+=angDiff(Math.atan2(v.y,v.x),c.a)*Math.min(1,.12*f)}
  const tv=hb?0:T.max*mag;c.v+=(tv-c.v)*Math.min(1,(tv>c.v?.03:.08)*f);
  const vx=Math.cos(c.a)*c.v*f,vy=Math.sin(c.a)*c.v*f;
  if(!hit(c.x+vx,c.y+vy,1.2)){c.x+=vx;c.y+=vy}else if(!hit(c.x+vx,c.y,1.2)){c.x+=vx;c.v*=.97}else if(!hit(c.x,c.y+vy,1.2)){c.y+=vy;c.v*=.97}else{if(c===pl.car&&c.v>T.max*.45)crash(c,c.v/T.max*.6);c.v*=.5}
  for(const o of cars){if(o===c||o.ai)continue;const dx=o.x-c.x,dy=o.y-c.y,d=hyp(dx,dy),md=(T.w+TYPES[o.type].w)*.3;if(d<md&&d>0){const ps=(md-d),ux=dx/d,uy=dy/d;if(!hit(c.x-ux*ps,c.y-uy*ps,1.2)){c.x-=ux*ps;c.y-=uy*ps}}}}
function carStep(f){const c=pl.car;if(TWO[c.type]){twoStep(c,f);return}let thr=0,steer=0;const hb=K.brake||btnB;
  if(joy.m>.2){const v=inVec(),df=angDiff(Math.atan2(v.y,v.x),c.a);if(Math.abs(df)>2.3&&c.v<.1)thr=-v.m;else{thr=v.m;steer=clamp(df*2.2,-1,1)}}
  else{thr=K.up-K.down;steer=K.right-K.left}
  if(c.type!='heli'&&(thr>0||joy.m>.2)){const ca=Math.cos(c.a),sa=Math.sin(c.a);for(const o of cars){if(!o.ai)continue;const dx=o.x-c.x,dy=o.y-c.y,ah=dx*ca+dy*sa;if(ah>0&&ah<22&&Math.abs(-dx*sa+dy*ca)<5&&Math.cos(o.a-c.a)>.3)o.ghost=Math.max(o.ghost||0,40)}}
  if(c.type!='heli'&&!steer&&joy.m<=.2&&c.v>.15){const h=roadHeading(c.x,c.y,c.a);if(h!=null)c.a+=angDiff(h,c.a)*Math.min(1,.06*f)}
  drive(c,thr,steer,hb,f);if(c.type!='heli')bump(c)}
function nearOwn(){let b=null,bd=9;for(const c of cars){if(!c.own)continue;if(Math.abs((c.type=='heli'?(c.alt||0)*55:0)-(pl.z||0))>1.5)continue;const d=hyp(c.x-pl.x,c.y-pl.y);if(d<bd){bd=d;b=c}}return b}
let keyItem=null,keyHeld=null;window.keyItem=null;window.keyHeld=null;
const CNAME={'#2a2c30':'charcoal','#7c8188':'grey','#9aa0a6':'silver','#c9ccd0':'light silver','#f4f4f2':'white','#1e2a4a':'navy','#2e4a7a':'blue','#7a1e22':'dark red','#5e6e5a':'green','#3a4048':'dark grey','#b8b2a6':'beige','#1a1a1e':'black'};
function nearParked(){if(!window.R3||!R3.parked)return null;let b=null,bd=5.5;for(const p of R3.parked()){if(p.gone)continue;const dx=p.x-pl.x;if(dx>bd||dx<-bd)continue;const d=hyp(dx,p.y-pl.y);if(d<bd){bd=d;b=p}}return b}
function takeParked(q,why){R3.take(q.n);const c=mkParked('hatch',q.x,q.y,q.a,q.col);c.own=1;cars.push(c);enterCar(c);if(why)toast(why)}
function keyStep(){if(pl.car||!window.R3)return;
  if(!keyItem&&!keyHeld&&fr%240==0&&R()<.5){const L=R3.parked().filter(p=>!p.gone&&hyp(p.x-pl.x,p.y-pl.y)>90&&hyp(p.x-pl.x,p.y-pl.y)<320);if(L.length){const q=L[R()*L.length|0],w=nearWalk(q.x+Math.cos(q.a+1.57)*10,q.y+Math.sin(q.a+1.57)*10);keyItem={x:w.x,y:w.y,i:q.n};window.keyItem=keyItem}}
  if(keyItem&&hyp(keyItem.x-pl.x,keyItem.y-pl.y)<2.5){const q=R3.parked()[keyItem.i];keyHeld={i:keyItem.i,pin:null};keyItem=null;window.keyItem=null;window.keyHeld=keyHeld;toast('Car keys on the pavement! The tag says: "'+(q?CNAME[q.col]||'':'')+' hatchback, parked round here". There\'s a green key marker over the car. Go and reunite them!')}}
function nearTraffic(){for(const c of cars)if(!c.own&&!c.lent&&hyp(c.x-pl.x,c.y-pl.y)<5)return c;return null}
const zoneAt=(x,y)=>{let b=null,bd=1e12;for(const a of D.anchors){const d=(a[1]-x)**2+(a[2]-y)**2;if(d<bd){bd=d;b=a[0]}}return b};
// gentle lane-assist: the direction of the nearest street segment, flipped to the side closest to the car's heading
function roadHeading(x,y,a){let best=null,bd=400;for(let gx=(x>>6)-1;gx<=(x>>6)+1;gx++)for(let gy=(y>>6)-1;gy<=(y>>6)+1;gy++)for(const s of SEGB[gx+','+gy]||[]){const vx=s[2]-s[0],vy=s[3]-s[1],l=vx*vx+vy*vy||1,t=clamp(((x-s[0])*vx+(y-s[1])*vy)/l,0,1),d=(s[0]+vx*t-x)**2+(s[1]+vy*t-y)**2;if(d<bd){bd=d;best=Math.atan2(vy,vx)}}
  if(best==null)return null;if(Math.abs(angDiff(best,a))>PI/2)best+=PI;return Math.abs(angDiff(best,a))<.6?best:null}
function streetAt(x,y){let b='',bd=196;for(let gx=(x>>6)-1;gx<=(x>>6)+1;gx++)for(let gy=(y>>6)-1;gy<=(y>>6)+1;gy++)for(const s of SEGB[gx+','+gy]||[]){const vx=s[2]-s[0],vy=s[3]-s[1],l=vx*vx+vy*vy||1,t=clamp(((x-s[0])*vx+(y-s[1])*vy)/l,0,1),d=(s[0]+vx*t-x)**2+(s[1]+vy*t-y)**2;if(d<bd){bd=d;b=D.names[s[4]]}}return b}
function enterCar(c){sfxThud();c.v=0;c.ai=false;pl.car=c;pl.z=0;if(c.type!='heli')unstick(c);if(c.type=='heli')toast(['A pilot on a tea break waves: "Bring it back in one piece, love!" ','You leave a note on the pad: "Borrowed, sorry! Back soon." ','The radio crackles: "...fine, but no loop-the-loops." '][R()*3|0]+(matchMedia('(pointer:fine)').matches?'Q to climb, Space to descend.':'Hold UP to climb, DOWN to descend.'))}
function leaveCar(){const c=pl.car;if(!c)return;if(c.type!='heli')sfxThud();let roof=0;if(c.type=='heli'){if(!c.landed){toast(matchMedia('(pointer:fine)').matches?'Lower it down first: hold Space to descend, Q to climb.':'Lower it down first: hold DOWN to descend.');return}
    roof=heliFloor(c)*55;if(!roof&&tAt(c.x,c.y)==3){toast("That's the Thames. Find somewhere dry.");return}c.v=0;c.vx=0;c.vy=0;toast(roof?'Touchdown on the roof. Mind the edge!':'Touchdown.')}
  c.v=0;pl.car=null;if(c.type=='heli'){const sa=Math.sin(c.a),ca=Math.cos(c.a);let done=false;for(const s of [1,-1,1.6,-1.6,.6,-.6]){const x=c.x-sa*7*s,y=c.y+ca*7*s,r=R3.roofAt(x,y);if(Math.abs(r-roof)<.5&&(roof>0||!hit(x,y,2)&&!hitW(x,y))){pl.x=x;pl.y=y;done=true;break}}if(!done){pl.x=c.x-Math.sin(c.a)*4;pl.y=c.y+Math.cos(c.a)*4}pl.z=roof;if(c.borrowed)giveBack(c);return}
  pl.z=0;const sa=Math.sin(c.a),ca=Math.cos(c.a);let ok=false;for(const s of [1,-1,2,-2]){const o=3.5,x=c.x-sa*o*s,y=c.y+ca*o*s;if(!hit(x,y,2)&&!hitW(x,y)){pl.x=x;pl.y=y;ok=true;break}}if(!ok){const w=nearWalk(c.x,c.y);pl.x=w.x;pl.y=w.y}if(c.borrowed)giveBack(c)}

/* ---------- the lost dog ---------- */
function dogStep(f){if(!dog)return;const p=pos();
  if(dog.follow){const tx=p.x-Math.cos(p.a)*3,ty=p.y-Math.sin(p.a)*3,d=hyp(tx-dog.x,ty-dog.y);if(pl.car){dog.x=p.x;dog.y=p.y;dog.ride=1}else{dog.ride=0;if(d>1){const s=Math.min(d,(d>30?.3:.13)*f);const nx=dog.x+(tx-dog.x)/d*s,ny=dog.y+(ty-dog.y)/d*s;if(!hit(nx,ny,1)||d>40){dog.x=nx;dog.y=ny}dog.a=Math.atan2(ty-dog.y,tx-dog.x);dog.walk+=f}}}
  else{dog.t-=f;if(dog.t<=0){dog.t=40+R()*80;dog.a=R()*PI*2;dog.mv=R()<.7}if(dog.mv){const nx=dog.x+Math.cos(dog.a)*.05*f,ny=dog.y+Math.sin(dog.a)*.05*f;if(!hit(nx,ny,1)&&hyp(nx-dog.hx,ny-dog.hy)<60){dog.x=nx;dog.y=ny;dog.walk+=f}else dog.t=0}}}

