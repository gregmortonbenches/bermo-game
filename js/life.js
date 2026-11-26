/* The neighbourhood's daily rhythm: shop opening hours, market days, how busy the streets are.
   Real clock and real calendar (DBGH / DBGDOW override them for tests). Hours are decimal (17.5 = 5.30pm).
   Market times from Southwark Council and the markets themselves: Maltby Street Fri 5.30-9pm, Sat 10-5, Sun 11-4;
   Bermondsey Square antiques Fri 6am-2pm; the Blue Market Mon-Sat 9-5; Spa Terminus traders mostly Saturdays. */
function lifeNow(){const d=new Date(),h=window.DBGH!=null?DBGH:d.getHours()+d.getMinutes()/60,dow=window.DBGDOW!=null?DBGDOW:d.getDay();return{h,dow,wk:dow==0?2:dow==6?1:0}}
/* [weekday, saturday, sunday] as [open,close] or null for shut */
const HRS={cafe:[[7,17],[8,17.5],[8.5,17]],bakery:[[7,17],[7,16],[8,15]],florist:[[8,17.5],[8,17],[9,15]],greengrocer:[[8,18],[8,18],[9,14]],butcher:[[7,17],[7,16],null],deli:[[9,18],[9,18],[10,16]],
 pub:[[11,23],[11,24],[12,22.5]],bar:[[16,24],[12,24],[13,22]],restaurant:[[12,22.5],[12,23],[12,21.5]],fast_food:[[10,23],[10,23.5],[11,22.5]],ice_cream:[[11,20],[11,21],[11,20]],
 convenience:[[6,23],[6,23],[7,22.5]],newsagent:[[6,19],[6.5,18],[7,17]],supermarket:[[7,22],[7,22],[10,16]],post_office:[[9,17.5],[9,12.5],null],pharmacy:[[9,18],[9,17.5],[11,16]],chemist:[[9,18],[9,17.5],[11,16]],
 hairdresser:[[9,18],[9,17],null],beauty:[[9.5,19],[9.5,18],null],books:[[10,18],[10,18],[11,17]],gift:[[10,18],[10,18],[11,17]],clothes:[[10,18],[10,18],[11,17]],toys:[[10,18],[10,18],[11,17]],pet:[[9,18],[9,17.5],[10,16]],
 bicycle:[[9,18],[9,17],[10,16]],laundry:[[7,21],[7,21],[8,20]],dry_cleaning:[[8,18],[8,16],null],library:[[9,17],[9,16],null],community_centre:[[9,21],[9,17],[10,16]],charity:[[10,17],[10,17],null],
 veterinary:[[8,19],[9,16],null],gallery:[[10,18],[10,18],[12,18]],museum:[[10,17.5],[10,17.5],[10,17.5]],art:[[10,18],[10,18],[12,18]],arts_centre:[[10,22],[10,22],[12,20]],cinema:[[11,23],[10,23.5],[10,22.5]],theatre:[[18,23],[14,23],[14,20]]};
function shopHrs(t){const r=HRS[t];if(!r)return null;const{h,wk,dow}=lifeNow();let x=r[wk];/* galleries and museums rest on Mondays */if(dow==1&&(t=='gallery'||t=='museum'||t=='art'))x=null;return x}
/* places with no entry (churches, markets, the lot) never shut */
function shopOpen(sh){const t=sh[4];if(!HRS[t])return true;const x=shopHrs(t);if(!x)return false;const h=lifeNow().h;return h>=x[0]&&h<(x[1]>=24?24.01:x[1])}
function fmtH(h){h=h%24;const m=Math.round((h%1)*60),hh=Math.floor(h),ap=hh>=12?'pm':'am',h12=hh%12||12;return h12+(m?':'+String(m).padStart(2,'0'):'')+ap}
function shopClosedLine(sh){const x=shopHrs(sh[4]),{wk}=lifeNow();if(!x)return wk==2?"Shut on Sundays.":"Shut today.";const h=lifeNow().h;return h<x[0]?'Opens at '+fmtH(x[0])+'.':'Shut for the day. Back at '+fmtH(x[0])+(wk==0?'':' tomorrow')+'.'}
function shopOpenLine(sh){const x=shopHrs(sh[4]);return x?'Open until '+(x[1]>=24?'midnight':fmtH(x[1]))+'.':''}
/* which markets are trading right now */
/* pad = hours either side, for stalls that go up before and come down after trading */
function marketsOn(pad=0){const{h:h0,dow}=lifeNow(),w=(d,a,b)=>dow==d&&h0>=a-pad&&h0<b+pad;return{maltby:w(5,17.5,21)||w(6,10,17)||w(0,11,16),antiques:w(5,6,14),blue:[1,2,3,4,5,6].some(d=>w(d,9,17)),spa:w(6,9,16)}}
const anyMarket=()=>{const m=marketsOn();return m.maltby||m.antiques||m.blue||m.spa};
/* how many pedestrians the streets should hold: quiet nights, commutes, busy weekend afternoons */
function crowdTarget(){const{h,wk}=lifeNow();let n=h<5?7:h<7?12:h<9.5?(wk?18:36):h<16?(wk?34:28):h<19?(wk?30:38):h<22?26:h<24?16:7;if(anyMarket())n+=4;return n}
/* and how many cars are on the move */
function trafficTarget(){const{h,wk}=lifeNow();return Math.round(h<5?7:h<7?12:h<9.5?(wk?14:30):h<16?(wk?24:22):h<19?(wk?22:32):h<22?18:h<24?12:7)}

/* ---- daily routines: the school run and the commute ----
   Real schools and stations come from the building data (type 'school' / 'train_station'). Weekdays only; schools skip the holidays. */
let LSITES=null;
/* a walkable spot near (x,y), searching wider than nearWalk because station and school buildings are big */
function nw(x,y){for(let r=0;r<260;r+=3)for(let a=0;a<20;a++){const X=x+Math.cos(a*PI/10)*r,Y=y+Math.sin(a*PI/10)*r;if(walkable(tAt(X,Y))&&!hit(X,Y,2)&&!hitW(X,Y))return{x:X,y:Y}}return{x,y}}
function lifeSites(){if(LSITES)return LSITES;const raw={school:[],station:[]};
  for(const b of WD.b){const t=b[5];if(t!='school'&&t!='train_station')continue;const P=b[0];let sx=0,sy=0,A=0;const n=P.length/2;for(let i=0;i<P.length;i+=2){sx+=P[i];sy+=P[i+1];const j=(i+2)%P.length;A+=P[i]*P[j+1]-P[j]*P[i+1]}
    (t=='school'?raw.school:raw.station).push({x:sx/n,y:sy/n,A:Math.abs(A/2),n:b[4]})}
  const merge=(L,r,minA)=>{const out=[];for(const s of L.sort((a,b)=>b.A-a.A)){if(s.A<minA)continue;if(out.some(o=>hyp(o.x-s.x,o.y-s.y)<r))continue;const g=nw(s.x,s.y);out.push({x:g.x,y:g.y})}return out};
  const stn=merge(raw.station,120,0);{const g=nw(2540,2789);stn.push({x:g.x,y:g.y})}/* South Bermondsey rail station, from the bus-stop data */
  LSITES={schools:merge(raw.school,90,700),stations:stn};return LSITES}
function termTime(){const d=new Date(),m=d.getMonth(),dy=d.getDate();return !(m==7||(m==11&&dy>=20)||(m==0&&dy<=3)||(m==3&&dy<=12)||(m==9&&dy>=26&&dy<=30))}
let RT={t:0};
function routineStep(f){RT.t+=f;if(RT.t<30)return;RT.t=0;if(pl.car&&pl.car.type=='heli')return;
  const{h,dow}=lifeNow();if(dow<1||dow>5)return;const p=pos(),S2=lifeSites();
  const nrt=peds.filter(q=>q.rt).length;if(nrt>=9||R()>.3)return;
  const schoolIn=h>=8&&h<9&&termTime(),schoolOut=h>=15&&h<16&&termTime(),comIn=h>=7&&h<9.5,comOut=h>=17&&h<19;
  const near=L=>L.filter(s=>{const d=hyp(s.x-p.x,s.y-p.y);return d<420}).sort((a,b)=>hyp(a.x-p.x,a.y-p.y)-hyp(b.x-p.x,b.y-p.y));
  const walkTo=(x,y,tg,o)=>{const q=mkPed({x,y});q.want=null;q.dog=null;Object.assign(q,o,{rt:{tx:tg.x,ty:tg.y,vanish:!!o.vanish,stuck:0}});delete q.vanish;peds.push(q);return q};
  const ring=(c,r0,r1)=>{for(let i=0;i<30;i++){const a=R()*PI*2,d=r0+R()*(r1-r0),x=c.x+Math.cos(a)*d,y=c.y+Math.sin(a)*d;if(walkable(tAt(x,y))&&!hit(x,y,2)&&!hitW(x,y))return{x,y}}return null};
  const kid=(x,y,tg,v)=>walkTo(x,y,tg,{kid:1,col:'#2a4a8a',trs:'#25252d',acc:'backpack',accc:'#c83a3a',hat:null,vanish:v,line:v?'"Can\'t chat, we\'ll be late for school!"':'"Home time! Mum says I can have a biscuit."'});
  const pickS=(schoolIn||schoolOut)&&(!(comIn||comOut)||R()<.5);
  if(pickS){const L=near(S2.schools);if(L.length){const s=L[R()*Math.min(L.length,3)|0];
    if(schoolIn){const sp=ring(p,50,220);if(sp&&hyp(sp.x-s.x,sp.y-s.y)>40){kid(sp.x,sp.y,s,true);if(R()<.6){const a=walkTo(sp.x+3,sp.y+2,s,{vanish:true,line:'"Come on, no dawdling. Where\'s your book bag?"'});a.rt.slow=1}}}
    else if(hyp(s.x-p.x,s.y-p.y)<260){const sp=ring(s,2,8);const tg=ring(s,120,220);if(sp&&tg){kid(sp.x,sp.y,tg,false);if(R()<.5)kid(sp.x+2,sp.y+1,tg,false)}}}}
  else if(comIn||comOut){const L=near(S2.stations);if(L.length){const s=L[0];
    if(comIn){const sp=ring(p,50,220);if(sp&&hyp(sp.x-s.x,sp.y-s.y)>60)walkTo(sp.x,sp.y,s,{vanish:true,fast:1,line:['"Can\'t stop, the 8:12 is due!"','"Sorry, running late. Coffee first, then train."','"Mornin\'. London Bridge, here I come."'][R()*3|0]})}
    else if(hyp(s.x-p.x,s.y-p.y)<260){const sp=ring(s,2,10),tg=ring(s,150,300);if(sp&&tg)walkTo(sp.x,sp.y,tg,{fast:1,line:['"Home, dinner, sofa."','"Long day. Pub or sofa? Sofa."','"Evening! Is it Friday yet?"'][R()*3|0]})}}}}
/* one step of a goal-directed walker; returns true when it should be removed */
function routineMove(q,f){const r=q.rt,dx=r.tx-q.x,dy=r.ty-q.y,d=hyp(dx,dy);if(d<9){if(r.vanish)return true;delete q.rt;return false}
  const want=Math.atan2(dy,dx),sp=(q.fast?.062:r.slow?.045:.05)*f;
  for(const o of [0,.45,-.45,.9,-.9,1.5,-1.5]){const a=want+o,nx=q.x+Math.cos(a)*sp,ny=q.y+Math.sin(a)*sp;if(walkable(tAt(nx,ny))&&!hit(nx,ny,2)&&!hitW(nx,ny)){q.x=nx;q.y=ny;q.a+=Math.atan2(Math.sin(a-q.a),Math.cos(a-q.a))*Math.min(1,.25*f);q.walk+=f;r.stuck=0;return false}}
  r.stuck+=f;return r.stuck>240}
