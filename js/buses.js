/* GTA Bermondsey: buses on their real routes (data in busdata.js): follow the streets, wait at stops, show number and destination.
   Classic script sharing one global scope with the other js/ files; load order is set in index.html. */
const BUS_DWELL=240;/* frames a bus waits at a stop (about 4 s) */
const busLeg=(r,i)=>({e:r.legs[i]>>1,fw:!!(r.legs[i]&1)});
// a point on a bus route within range of the player, favouring routes that have no bus out yet
function busSpot(minD,maxD,self){const p=pos(),taken=new Set(cars.filter(c=>c!==self&&c.rt!=null).map(c=>c.rt));
  for(let i=0;i<240;i++){const rt=R()*BUSDATA.length|0;if(i<160&&taken.has(rt))continue;const r=BUSDATA[rt],li=R()*r.legs.length|0,{e,fw}=busLeg(r,li),E=EDGES[e],s=R()*E.len,[x,y]=edgePos(E,s,fw),d=hyp(x-p.x,y-p.y);
    if(d<minD||d>maxD||tAt(x,y)==7||E.off||cars.some(o=>o!==self&&hyp(o.x-x,o.y-y)<40))continue;return{e,s,fw,x,y,rt,li}}
  return null}
function busBlindText(c){const r=BUSDATA[c.rt];c.bn=r.n;c.bd=r.d[c.li<r.split?0:1]}
function busJoin(c,sp){const r=BUSDATA[sp.rt],off=laneOff(EDGES[sp.e]),[x,y,hx,hy]=edgePos(EDGES[sp.e],sp.s,sp.fw);
  Object.assign(c,{rt:sp.rt,li:sp.li,e:sp.e,s:sp.s,fw:sp.fw,x:x+hy*off,y:y-hx*off,a:Math.atan2(hy,hx),dwell:0,wait:0,ghost:0});
  const i=r.stops.findIndex(([l,s])=>l>sp.li||(l==sp.li&&s>sp.s));c.si=i<0?0:i;busBlindText(c);return c}
function busNextStop(c){return BUSDATA[c.rt].stops[c.si][2]}
// called as the bus drives: true while it is waiting at a stop
function busWait(c,f){if(c.dwell>0){c.dwell-=f;c.v=0;return true}
  const st=BUSDATA[c.rt].stops,q=st[c.si];if(c.li==q[0]&&c.s>=Math.min(q[1],EDGES[c.e].len)){c.si=(c.si+1)%st.length;c.dwell=BUS_DWELL;c.v=0;return true}
  return false}
// is someone up against the side of the bus? (it is long: standing on the pavement nearby shouldn't hold it up)
function busBeside(c,x,y){const dx=x-c.x,dy=y-c.y,ca=Math.cos(c.a),sa=Math.sin(c.a);return Math.abs(dx*ca+dy*sa)<TYPES.bus.w*.6&&Math.abs(dy*ca-dx*sa)<TYPES.bus.h*.7}
// end of a road: carry on along the route (a few joins hop over the bit of the real route that is off the map)
function busTurn(c){const r=BUSDATA[c.rt],over=c.s-EDGES[c.e].len;if(r.stops[c.si][0]==c.li){c.s=EDGES[c.e].len;return}/* a stop right at the end of the road: pull up there first */c.li=(c.li+1)%r.legs.length;const {e,fw}=busLeg(r,c.li);c.e=e;c.fw=fw;c.s=clamp(over,0,EDGES[e].len);busBlindText(c)}
// traffic of any kind: buses go on a route, everything else anywhere on the main roads
function trafficCar(i,minD,maxD){let type=TT[i%TT.length];if(type=='bus'){const b=busSpot(minD,maxD);if(b)return busJoin(mkCar('bus',{...b}),b);type='hatch'}const sp=spot(minD,maxD);return sp&&mkCar(type,sp)}
function trafficMove(c){if(c.rt!=null){const b=busSpot(180,420,c);if(b)busJoin(c,b);return}const sp=spot(180,420);if(sp)Object.assign(c,{e:sp.e,s:sp.s,fw:sp.fw,x:sp.x,y:sp.y})}
