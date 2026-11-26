/* Jumping from the helicopter or off a rooftop: a short freefall, then the parachute opens by itself and brings you down gently.
   You can steer a little while it is open. Nothing here can hurt you. */
const CHT={g:22,term:24,openAfter:.6,minOpenH:12,sink:4.2,drift:.055};
function startChute(h,vx,vy){const c=pl.car;
  if(c){if(c.type=='heli'){c.vs=-.003;c.vx=0;c.vy=0}c.v=0;pl.x=c.x;pl.y=c.y}
  pl.car=null;pl.z=0;pl.jz=0;pl.jv=0;pl.chute={fromRoof:!c&&h>0,h,vz:c?-1:2,open:0,t:0,vx:vx||0,vy:vy||0,deployed:false,land:0};
  sfxJump();buzz(14,.2);toast(c?'Jumping! Parachute opens by itself.':'Leap! The parachute will open by itself.')}
/* a roof edge within a few px, in the direction closest to where you are facing */
function roofEdgeDir(){if(!(pl.z>0)||!window.R3)return null;let best=null,bd=9;for(let k=0;k<8;k++){const a=k*PI/4,d=Math.abs(angDiff(a,pl.a));if(d>1.3)continue;const x=pl.x+Math.cos(a)*4.5,y=pl.y+Math.sin(a)*4.5;if(pl.z-R3.roofAt(x,y)>1.5&&d<bd){bd=d;best=a}}return best}
function chuteStep(f){const c=pl.chute;if(!c)return;const dt=f/60;c.t+=dt;
  const v=inVec();
  if(!c.deployed&&(c.t>=CHT.openAfter&&c.h>=CHT.minOpenH||c.h<CHT.minOpenH+10)){c.deployed=true;sfxThud();buzz(20,.3);toast('Parachute open!')}
  if(c.deployed){c.open=Math.min(1,c.open+dt*3.2);const target=-CHT.sink;c.vz+=(target-c.vz)*Math.min(1,1.9*dt);c.vx*=Math.pow(.97,f);c.vy*=Math.pow(.97,f)}
  else{c.vz=Math.max(-CHT.term,c.vz-CHT.g*dt)}
  /* push-off momentum fades; steering drifts you a little under the canopy */
  const st=c.deployed?CHT.drift:.02;c.vx+=v.x*st*f*.2;c.vy+=v.y*st*f*.2;c.vx=clamp(c.vx,-.12,.12);c.vy=clamp(c.vy,-.12,.12);
  pl.x+=c.vx*f;pl.y+=c.vy*f;if(v.m)pl.a+=angDiff(Math.atan2(c.vy,c.vx),pl.a)*Math.min(1,.1*f);
  c.h+=c.vz*dt;
  const roof=window.R3&&(c.t>.4||!c.fromRoof)?R3.roofAt(pl.x,pl.y):0,ground=roof||0;
  pl.jz=Math.max(0,c.h-0);pl.z=0;
  if(c.h<=ground+.05){const soft=c.deployed;pl.chute=null;pl.jz=0;pl.jv=0;pl.z=ground;fx(pl.x,pl.y,'dust',soft?4:8,ground);sfxLand(!soft);buzz(12,.2);
    if(!ground){if(tAt(pl.x,pl.y)==3){const w=nearWalk(pl.x,pl.y);toast('Splash! You paddle to the bank.');pl.x=w.x;pl.y=w.y}else if(hitW(pl.x,pl.y)){const w=nearWalk(pl.x,pl.y);pl.x=w.x;pl.y=w.y}}
    else toast('Landed on a roof. Gently does it.');return}
}
