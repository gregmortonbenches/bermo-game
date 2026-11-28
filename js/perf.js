/* GTA Bermondsey: Quality setting (Auto, High, Low) and the on-screen speed readout.
   Classic script sharing one global scope with the other js/ files; load order is set in index.html. */
const QT=[{name:'full',px:9,shadow:2048,fog:1,crowd:1,cull:0},{name:'medium',px:1.2,shadow:1024,fog:.85,crowd:.75,cull:0},{name:'low',px:1,shadow:0,fog:.65,crowd:.55,cull:1}];
const pGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},pSet=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}};
const PERF={mode:'auto',tier:0,show:false,q:QT[0],load:0,last:0,n:0,sum:0,slow:0,fps:0,worst:0,win:[],warm:0,closed:null,el:null,t0:Date.now()};
{const m=pGet('gtab-quality');if(m=='high'||m=='low')PERF.mode=m}
/* Auto starts one level above where it ended last time, so one bad session doesn't leave a phone on low for good */
PERF.tier=PERF.mode=='high'?0:PERF.mode=='low'?2:Math.max(0,Math.min(2,(+pGet('gtab-autotier')||0)-1));PERF.q=QT[PERF.tier];
PERF.show=/[?&]perf/.test(location.search)||pGet('gtab-readout')=='on';
/* a marker that is cleared when the page is closed or hidden properly: if it is still there at the next start, the tab was probably killed (phones do this when memory runs out) */
try{PERF.closed=JSON.parse(pGet('gtab-run')||'null')}catch(e){}
function perfMark(){pSet('gtab-run',document.hidden?null:JSON.stringify({s:Math.round((Date.now()-PERF.t0)/1000),load:!PERF.load}))}
perfMark();setInterval(perfMark,5000);document.addEventListener('visibilitychange',()=>{perfMark();PERF.last=0});addEventListener('pagehide',()=>pSet('gtab-run',null));addEventListener('pageshow',perfMark);
function perfTier(t){const down=t>PERF.tier;PERF.tier=t;PERF.q=QT[t];if(window.R3&&R3.quality)R3.quality();if(down&&started)perfTrim()}
/* on stepping down, thin out the people and traffic that are well away, instead of waiting for them to wander off */
function perfTrim(){const p=pos();let n=peds.length-crowdTarget();peds=peds.filter(q=>!(n>0&&!q.postie&&!q.rt&&hyp(q.x-p.x,q.y-p.y)>110&&n--));
  let m=cars.filter(c=>c.ai).length-trafficTarget();for(let i=cars.length-1;i>=0&&m>0;i--){const c=cars[i];if(c.ai&&c!==pl.car&&hyp(c.x-p.x,c.y-p.y)>260){cars.splice(i,1);m--}}}
function qualityLabel(){return'Quality: '+(PERF.mode=='auto'?`auto (${PERF.q.name})`:PERF.mode)}
function qualityNext(){PERF.mode={auto:'high',high:'low',low:'auto'}[PERF.mode];pSet('gtab-quality',PERF.mode);PERF.warm=0;PERF.sum=PERF.n=PERF.slow=0;if(PERF.mode=='auto')pSet('gtab-autotier',null);perfTier(PERF.mode=='low'?2:0)}
function readoutToggle(){PERF.show=!PERF.show;pSet('gtab-readout',PERF.show?'on':'off');perfDraw()}
function perfTick(t){if(ready&&!PERF.load)PERF.load=performance.now()/1000;
  const ms=PERF.last?t-PERF.last:0;PERF.last=t;if(!ms||ms>1000||document.hidden)return;
  PERF.n++;PERF.sum+=ms;PERF.worst=Math.max(PERF.worst,ms);if(PERF.sum<1000)return;
  PERF.fps=1000*PERF.n/PERF.sum;PERF.win.push(PERF.worst);if(PERF.win.length>5)PERF.win.shift();
  /* Auto: after 6 s of play, step down a level after 5 slow seconds in a row (under 24 frames a second) */
  if(PERF.mode=='auto'&&started&&!paused){if(++PERF.warm>6){PERF.slow=PERF.fps<24?PERF.slow+1:0;if(PERF.slow>=5&&PERF.tier<2){perfTier(PERF.tier+1);pSet('gtab-autotier',PERF.tier);PERF.slow=0;PERF.warm=3}else if(PERF.warm==40)pSet('gtab-autotier',PERF.tier)}}
  PERF.n=PERF.sum=PERF.worst=0;perfDraw()}
function perfDraw(){if(!PERF.show){if(PERF.el)PERF.el.hidden=true;return}
  if(!PERF.el){const e=PERF.el=document.createElement('div');e.id='perf';e.className='card';e.style.cssText='position:fixed;left:calc(10px + env(safe-area-inset-left));top:calc(76px + env(safe-area-inset-top));padding:6px 10px;font:600 12px/1.45 ui-monospace,Menlo,monospace;white-space:pre;pointer-events:none;max-width:80vw';document.getElementById('ui').insertBefore(e,document.getElementById('dlg'))/* under the dialogue sheet */}
  const i=window.R3&&R3.info?R3.info():null,c=PERF.closed;PERF.el.hidden=false;
  PERF.el.textContent=[`${Math.round(PERF.fps)} fps · slowest ${Math.round(Math.max(0,...PERF.win))} ms`,`${qualityLabel()}`,`loaded in ${PERF.load?PERF.load.toFixed(1)+' s':'…'}`,i?`${i.calls} draws · ${(i.triangles/1e6).toFixed(2)}M tris`:'',i&&i.w?`screen ${i.w}×${i.h}`:'',c?`last visit ended suddenly\n${c.load?'while loading':'after '+(c.s<90?c.s+' s':Math.round(c.s/60)+' min')}`:''].filter(Boolean).join('\n')}
