/* GTA Bermondsey: Sound effects and the gentle jazz trio, all made live with Web Audio (no audio files).
   Classic script sharing one global scope with the other js/ files; load order is set in index.html. */
function sfxCtx(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}catch(e){return null}}
function sfxCrunch(k){const a=sfxCtx();if(!a)return;try{const t=a.currentTime,n=a.createBufferSource(),L=a.sampleRate*.4|0,b=a.createBuffer(1,L,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,2.5);n.buffer=b;
  const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=700+k*1800;const g=a.createGain();g.gain.value=.06+k*.2;n.connect(f);f.connect(g);g.connect(sndBus(a).sfx);n.start(t);
  const o=a.createOscillator(),og=a.createGain();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(40,t+.2);og.gain.setValueAtTime(.05+.22*k,t);og.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(og);og.connect(sndBus(a).sfx);o.start(t);o.stop(t+.3)}catch(e){}}
function sfxHorn(dist,len){const a=sfxCtx();if(!a)return;try{const t=a.currentTime+.05+Math.random()*.15,v=clamp(.07*(1-dist/90),0,.07);if(v<=.004)return;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=1500;const g=a.createGain();
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.02);g.gain.setValueAtTime(v,t+len);g.gain.linearRampToValueAtTime(0,t+len+.05);f.connect(g);g.connect(sndBus(a).sfx);for(const hz of[392,494]){const o=a.createOscillator();o.type='square';o.frequency.value=hz;o.connect(f);o.start(t);o.stop(t+len+.1)}}catch(e){}}
/* ---------- gentle jazz: a small trio generated live with Web Audio (no audio files) ----------
   swing ride + brushes, walking upright bass, soft electric-piano comping and the odd vibraphone phrase over a 16-bar tune in F */
const MUS={on:true,run:false,beat:0,next:0,timer:null,out:null,rev:null,nz:null,lastMel:-99};
try{MUS.on=localStorage.getItem('gtab-music')!=='off'}catch(e){}
const JZ_FORM=['F^','F^','D-','D-','G-','G-','C7','C7','A-','D7','G-','C7','F^','D-','G-','C7','F^','F^','F7','F7','B^','B^','B-','E7','A-','D7','G-','C7','F6','F6','G-','C7'];
const JZ_ROOT={F:5,D:2,G:7,C:0,A:9,B:10,E:3},JZ_Q={'^':[0,4,7,11,14],'-':[0,3,7,10,14],'7':[0,4,7,10,14],'6':[0,4,7,9,14]};
const jzChord=i=>{const c=JZ_FORM[(i%JZ_FORM.length+JZ_FORM.length)%JZ_FORM.length];return{r:JZ_ROOT[c[0]],q:JZ_Q[c.slice(1)]}};
const mHz=m=>440*Math.pow(2,(m-69)/12);
function musInit(){if(MUS.out)return;
  const comp=AC.createDynamicsCompressor();comp.threshold.value=-20;comp.ratio.value=3;comp.connect(sndBus(AC).mus);
  MUS.out=AC.createGain();MUS.out.gain.value=0;const tone=AC.createBiquadFilter();tone.type='lowpass';tone.frequency.value=3200;tone.Q.value=.5;MUS.out.connect(tone);tone.connect(comp);
  // small room reverb from a decaying noise impulse
  const L=AC.sampleRate*1.6|0,ir=AC.createBuffer(2,L,AC.sampleRate);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,3)}
  MUS.rev=AC.createConvolver();MUS.rev.buffer=ir;const wet=AC.createGain();wet.gain.value=.34;MUS.rev.connect(wet);wet.connect(MUS.out);
  const nb=AC.createBuffer(1,AC.sampleRate|0,AC.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;MUS.nz=nb}
function jzSend(node,dry,wet){const a=AC.createGain();a.gain.value=dry;node.connect(a);a.connect(MUS.out);if(wet){const b=AC.createGain();b.gain.value=wet;node.connect(b);b.connect(MUS.rev)}}
function jzNoise(t,dur,type,freq,q,vol){const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=MUS.nz;f.type=type;f.frequency.value=freq;f.Q.value=q;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+Math.min(.01,dur*.3));g.gain.exponentialRampToValueAtTime(.0005,t+dur);s.connect(f);f.connect(g);jzSend(g,1,.4);s.start(t,Math.random()*.5);s.stop(t+dur+.02)}
function jzBass(t,m,dur,vol){const o=AC.createOscillator(),o2=AC.createOscillator(),f=AC.createBiquadFilter(),g=AC.createGain();o.type='triangle';o2.type='sine';o.frequency.setValueAtTime(mHz(m)*1.01,t);o.frequency.exponentialRampToValueAtTime(mHz(m),t+.05);o2.frequency.value=mHz(m);
  f.type='lowpass';f.frequency.setValueAtTime(600,t);f.frequency.exponentialRampToValueAtTime(260,t+.25);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.025);g.gain.exponentialRampToValueAtTime(vol*.4,t+.25);g.gain.exponentialRampToValueAtTime(.0005,t+dur);
  o.connect(f);o2.connect(f);f.connect(g);jzSend(g,1,.12);for(const x of[o,o2]){x.start(t);x.stop(t+dur+.05)}}
function jzKey(t,m,dur,vol){// electric piano: sine carrier with a decaying bell-like modulator
  const c=AC.createOscillator(),md=AC.createOscillator(),mg=AC.createGain(),g=AC.createGain(),f=AC.createBiquadFilter();c.frequency.value=mHz(m);md.frequency.value=mHz(m);
  mg.gain.setValueAtTime(mHz(m)*.7,t);mg.gain.exponentialRampToValueAtTime(mHz(m)*.08,t+.5);md.connect(mg);mg.connect(c.frequency);f.type='lowpass';f.frequency.value=1500;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(vol*.4,t+.35);g.gain.exponentialRampToValueAtTime(.0005,t+dur);c.connect(f);f.connect(g);jzSend(g,1,.5);for(const x of[c,md]){x.start(t);x.stop(t+dur+.05)}}
function jzVibe(t,m,dur,vol){const o=AC.createOscillator(),o2=AC.createOscillator(),g=AC.createGain(),tr=AC.createOscillator(),tg=AC.createGain(),g2=AC.createGain();o.frequency.value=mHz(m);o2.frequency.value=mHz(m)*4;g2.gain.value=.08;
  tr.frequency.value=5.2;tg.gain.value=vol*.25;tr.connect(tg);tg.connect(g.gain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.005);g.gain.exponentialRampToValueAtTime(.0005,t+dur);
  o.connect(g);o2.connect(g2);g2.connect(g);jzSend(g,.9,.7);for(const x of[o,o2,tr]){x.start(t);x.stop(t+dur+.05)}}
function jzBeat(b,t,bt){const sw=bt*.66,bar=b>>2,beat=b&3,ch=jzChord(b>>1),nx=jzChord((b>>1)+1),R=Math.random;
  // drums: ride "ding, ding-a ding", feathered on 2 and 4 with the hat foot, brush swish
  jzNoise(t,.45,'bandpass',4800+R()*400,1.4,.018+(beat&1)*.004);if(beat&1&&R()<.6)jzNoise(t+sw,.22,'bandpass',5000,1.4,.01);
  jzNoise(t,bt*.95,'bandpass',1900,.5,.006);
  // walking bass: root on 1, chord tones, chromatic approach into the next chord
  const root=36+ch.r-(ch.r>7?12:0);let m;if(beat==0)m=root;else if(beat==1)m=root+[ch.q[1],ch.q[2],12][R()*3|0];else if(beat==2)m=root+[ch.q[2],7,ch.q[1],0][R()*4|0];else{const nr=36+nx.r-(nx.r>7?12:0);m=nr+(R()<.5?1:-1)}
  jzBass(t,m,bt*.95,.17);
  // piano comping: rootless voicings around middle C, sparse Charleston-ish rhythm
  const voice=[ch.q[1],ch.q[3],ch.q[4],ch.q[2]].map(x=>57+(((ch.r+x)%12-57)%12+12)%12);
  const hit=(beat==0&&R()<.6)||(beat==2&&R()<.2);const anti=beat==3&&R()<.15;
  if(hit)for(const n of voice)jzKey(t+R()*.03,n,bt*2.2,.028);if(anti)for(const n of voice)jzKey(t+sw+R()*.02,n,bt*1.2,.02);
  // vibraphone: a short phrase of chord tones now and then (every few bars), with space between
  if(beat==0&&bar-MUS.lastMel>=8&&R()<.3)MUS.lastMel=bar;
  if(bar-MUS.lastMel<2){const scale=ch.q.map(x=>72+((ch.r+x)%12));if(R()<.45)jzVibe(t+(R()<.5?0:sw),scale[R()*scale.length|0],bt*1.8,.026)}}
function musTick(){if(!MUS.run||!AC)return;const bt=60/78;while(MUS.next<AC.currentTime+.35){jzBeat(MUS.beat,MUS.next,bt);MUS.beat++;MUS.next+=bt}}
function musStart(){if(!MUS.on)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();musInit();if(MUS.run)return;MUS.run=true;MUS.beat=0;MUS.next=AC.currentTime+.15;
  MUS.out.gain.cancelScheduledValues(AC.currentTime);MUS.out.gain.setValueAtTime(MUS.out.gain.value,AC.currentTime);MUS.out.gain.linearRampToValueAtTime(.4,AC.currentTime+5);MUS.timer=setInterval(musTick,90)}catch(e){}}
function musStop(){MUS.run=false;clearInterval(MUS.timer);if(AC&&MUS.out){MUS.out.gain.cancelScheduledValues(AC.currentTime);MUS.out.gain.setValueAtTime(MUS.out.gain.value,AC.currentTime);MUS.out.gain.linearRampToValueAtTime(0,AC.currentTime+.6)}}
function musBtn(){const b=document.getElementById('musB');if(!b)return;b.textContent=MUS.on?'♪ On':'♪ Off';b.classList.toggle('off',!MUS.on);b.setAttribute('aria-label',MUS.on?'Pause music':'Play music');b.setAttribute('aria-pressed',String(!MUS.on))}
function toggleMusic(){MUS.on=!MUS.on;try{localStorage.setItem('gtab-music',MUS.on?'on':'off')}catch(e){}if(MUS.on)musStart();else musStop();musBtn();toast(MUS.on?'Music on: a bit of gentle jazz.':'Music paused. Tap ♪ to bring it back.')}
document.getElementById('musB').addEventListener('click',e=>{e.preventDefault();toggleMusic()});musBtn();
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(MUS.run)musStop(),MUS.paused=1}else if(MUS.paused){MUS.paused=0;if(started)musStart()}});
function menuDlg(){dlg('menu',{who:'MENU',title:'YOUR BAG',text:`${esc(bagStr())}<br><span style="opacity:.7">${esc(wxLine())}</span><br><br>Cash £${Math.floor(S.cash)} · Tin £${S.fund}/${GOAL} · Kind acts ${S.kind||0}<br><br><span style="opacity:.5;font-size:11px">Map data © OpenStreetMap contributors · Mapillary · Building heights: Environment Agency LiDAR (Open Government Licence) · Weather: Open-Meteo · Radio: Radio Browser</span>`,opts:[['Route planner',destDlg],[`Music: ${MUS.on?'on':'off'}`,()=>{toggleMusic();menuDlg()}],[`Vibration: ${HAPT.on?'on':'off'}`,()=>{toggleHaptic();menuDlg()}],['Sound levels',mixDlg],[radioLabel(),radioDlg],['Close',()=>{}]]})}


/* ---------- soundscape: engines, footsteps, ambience, surfaces and the mixer (all Web Audio, no audio files) ----------
   Three buses (music, effects, ambience) go through one limiter. sndUpdate() runs every frame from the loop and never throws. */
const SND={mix:{mus:1,sfx:.7,amb:.7},trim:{mus:1,sfx:.5,amb:.4},bus:null,ok:false,nb:null,eng:null,rot:null,v:{},nx:{},z:{tr:0,rain:0,wat:0,mur:0},park:false,thames:false,railD:999,hr:12,foot:0,st:0,stn:0,ecat:'',err:null,cache:{}};
try{const m=JSON.parse(localStorage.getItem('gtab-mix')||'null');if(m)for(const k in SND.mix)if(typeof m[k]=='number')SND.mix[k]=clamp(m[k],0,1)}catch(e){}
const MIXL=[[1,'full'],[.7,'medium'],[.35,'low'],[0,'off']];
const mixIdx=v=>{let b=0;MIXL.forEach((m,i)=>{if(Math.abs(m[0]-v)<Math.abs(MIXL[b][0]-v))b=i});return b};
function mixCycle(k){SND.mix[k]=MIXL[(mixIdx(SND.mix[k])+1)%MIXL.length][0];try{localStorage.setItem('gtab-mix',JSON.stringify(SND.mix))}catch(e){}if(SND.bus&&k!='mus')SND.bus[k].gain.setTargetAtTime(SND.mix[k]*SND.trim[k],AC.currentTime,.05)}
function mixDlg(){const row=(k,n)=>[`${n}: ${MIXL[mixIdx(SND.mix[k])][1]}`,()=>{mixCycle(k);mixDlg()}];
  dlg('menu',{who:'SOUND',title:'LEVELS',text:'Tap a line to turn it up or down.',opts:[row('mus','Music'),row('sfx','Effects'),row('amb','Ambience'),['Back',menuDlg]]})}
function sndBus(a){a=a||AC;if(!a)return null;if(SND.bus&&SND.bus.ctx===a)return SND.bus;
  const sum=a.createGain(),lim=a.createDynamicsCompressor(),an=a.createAnalyser();lim.threshold.value=-8;lim.knee.value=6;lim.ratio.value=10;lim.attack.value=.003;lim.release.value=.15;an.fftSize=1024;
  sum.connect(lim);lim.connect(a.destination);lim.connect(an);const mk=k=>{const g=a.createGain();g.gain.value=SND.mix[k]*SND.trim[k];g.connect(sum);return g};
  return SND.bus={ctx:a,sum,an,sfx:mk('sfx'),amb:mk('amb'),mus:mk('mus')}}
function sndRms(){const B=SND.bus;if(!B)return 0;const d=new Float32Array(B.an.fftSize);B.an.getFloatTimeDomainData(d);let s=0,pk=0;for(const x of d){s+=x*x;pk=Math.max(pk,Math.abs(x))}return{rms:Math.sqrt(s/d.length),peak:pk}}
const sA=()=>{const a=sfxCtx();if(!a)return null;if(!SND.ok)sndInit(a);return SND.ok?a:null};
function nz(a,dur,ft,fr,q,gain,bus,t0,sweep){const s=a.createBufferSource();s.buffer=SND.nb;const f=a.createBiquadFilter();f.type=ft;f.frequency.setValueAtTime(fr,t0);if(sweep)f.frequency.exponentialRampToValueAtTime(sweep,t0+dur);f.Q.value=q||.8;
  const g=a.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(gain,t0+Math.min(.008,dur*.3));g.gain.exponentialRampToValueAtTime(.0001,t0+dur);s.connect(f);f.connect(g);g.connect(bus);s.start(t0,Math.random()*1.5,dur+.02)}
function tone(a,type,f0,f1,dur,gain,bus,t0,att){const o=a.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t0);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t0+dur);
  const g=a.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(gain,t0+(att||.01));g.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(g);g.connect(bus);o.start(t0);o.stop(t0+dur+.05)}
function sndInit(a){if(SND.ok)return;const B=sndBus(a),nb=a.createBuffer(1,a.sampleRate*2,a.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;SND.nb=nb;
  const vc=(ft,fr,q,bus)=>{const s=a.createBufferSource();s.buffer=nb;s.loop=true;s.start(0,Math.random()*1.5);const f=a.createBiquadFilter();f.type=ft;f.frequency.value=fr;f.Q.value=q;const g=a.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(bus);return{f,g}};
  const lfo=(hz,depth,param)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=hz;g.gain.value=depth;o.connect(g);g.connect(param);o.start();return o};
  /* engine: saw + sub square through a low-pass; pitch and cutoff follow speed */
  const e={o1:a.createOscillator(),o2:a.createOscillator(),f:a.createBiquadFilter(),g:a.createGain()};e.o1.type='triangle';e.o2.type='sine';e.f.type='lowpass';e.f.Q.value=.5;e.g.gain.value=0;
  e.o1.connect(e.f);e.o2.connect(e.f);e.f.connect(e.g);e.g.connect(B.sfx);e.o1.start();e.o2.start();SND.eng=e;
  /* helicopter rotor: low noise chopped by a slow oscillator whose rate follows the rotor */
  const r=vc('lowpass',380,.7,B.sfx),am=a.createGain();am.gain.value=.5;r.g.disconnect();r.g.connect(am);am.connect(B.sfx);r.am=am;r.lfo=lfo(8,.5,am.gain);SND.rot=r;
  SND.v={road:vc('lowpass',650,.5,B.sfx),skid:vc('bandpass',2300,4,B.sfx),tr:vc('lowpass',340,.6,B.amb),rain:vc('highpass',1100,.5,B.amb),wat:vc('lowpass',520,.6,B.amb),mur:vc('bandpass',700,.9,B.amb)};
  /* slow wobble goes through its own gain stage so it only shapes the sound and can never make it audible by itself */
  const wob=(v,hz,base,depth)=>{v.f.disconnect();const md=a.createGain();md.gain.value=base;v.f.connect(md);md.connect(v.g);lfo(hz,depth,md.gain)};wob(SND.v.wat,.35,.75,.25);wob(SND.v.mur,2.7,.65,.35);SND.ok=true}
/* where is the ground green, paved or cobbled? */
function pip(f,x,y){let ins=false;const n=f.length;for(let i=0,j=n-2;i<n;j=i,i+=2){const xi=f[i],yi=f[i+1],xj=f[j],yj=f[j+1];if((yi>y)!=(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)ins=!ins}return ins}
function inPoly(k,x,y){let L=SND.cache[k];if(!L)L=SND.cache[k]=((WD&&WD[k])||[]).map(f=>{let a=1e9,b=1e9,c=-1e9,d=-1e9;for(let i=0;i<f.length;i+=2){a=Math.min(a,f[i]);b=Math.min(b,f[i+1]);c=Math.max(c,f[i]);d=Math.max(d,f[i+1])}return{f,a,b,c,d}});
  for(const g of L){if(x<g.a||x>g.c||y<g.b||y>g.d)continue;if(pip(g.f,x,y))return true}return false}
function sndSurf(x,y){if(inPoly('green',x,y))return'grass';const sh=SND.cache.shad||(SND.cache.shad=D.anchors.find(a=>a[0]=='Shad Thames')||[0,-9e4,-9e4]);
  if((MALTBY&&hyp(x-MALTBY.x,y-MALTBY.y)<70)||hyp(x-sh[1],y-sh[2])<90)return'cobble';return inPoly('plaza',x,y)?'plaza':'path'}
/* one-shot effects */
function sfxStep(run){const a=sA();if(!a)return;const B=sndBus(a),t=a.currentTime,sf=sndSurf(pl.x,pl.y),k=.18*(run?1.2:1)*(.8+Math.random()*.4);
  if(sf=='grass'){nz(a,.11,'lowpass',650+Math.random()*200,.6,.028*k,B.sfx,t);nz(a,.09,'highpass',3200,.5,.005*k,B.sfx,t+.01)}
  else if(sf=='cobble'){nz(a,.05,'bandpass',1100+Math.random()*300,1.8,.035*k,B.sfx,t);tone(a,'triangle',230+Math.random()*60,150,.06,.01*k,B.sfx,t)}
  else if(sf=='plaza'){nz(a,.06,'bandpass',1400+Math.random()*300,1.2,.03*k,B.sfx,t);nz(a,.07,'lowpass',500,.5,.012*k,B.sfx,t)}
  else{nz(a,.055,'bandpass',1700+Math.random()*500,.9,.026*k,B.sfx,t);nz(a,.08,'lowpass',420,.5,.014*k,B.sfx,t)}}
function sfxJump(){const a=sA();if(!a)return;nz(a,.07,'bandpass',1500,.8,.02,sndBus(a).sfx,a.currentTime)}
function sfxLand(hard){const a=sA();if(!a)return;const B=sndBus(a),t=a.currentTime,k=hard?1.8:1;nz(a,.09,'bandpass',1300,.9,.035*k,B.sfx,t);nz(a,.12,'lowpass',380,.5,.03*k,B.sfx,t);if(hard)tone(a,'sine',110,60,.14,.03,B.sfx,t)}
function sfxThud(){const a=sA();if(!a)return;const B=sndBus(a),t=a.currentTime;nz(a,.12,'lowpass',260,.6,.06,B.sfx,t);tone(a,'sine',95,55,.12,.035,B.sfx,t);nz(a,.03,'bandpass',2400,1,.01,B.sfx,t+.1)}
function sfxDoor(){const a=sA();if(!a)return;const B=sndBus(a),t=a.currentTime;tone(a,'sine',1760,0,.4,.02,B.sfx,t,.004);tone(a,'sine',2349,0,.35,.015,B.sfx,t+.1,.004)}
function sfxTick(hi){const a=sA();if(!a)return;tone(a,'square',hi?1900:1500,0,.025,.006,sndBus(a).sfx,a.currentTime,.002)}
function sfxBird(){const a=sA();if(!a)return;const B=sndBus(a),t=a.currentTime,n=1+Math.random()*3|0,f0=3000+Math.random()*1800,dir=Math.random()<.5?.7:1.35;for(let i=0;i<n;i++)tone(a,'sine',f0*(1+i*.04),f0*dir,.07,.009,B.amb,t+i*.11,.012)}
function sfxQuack(){const a=sA();if(!a)return;const B=sndBus(a),t=a.currentTime;for(let i=0;i<(Math.random()<.5?1:2);i++){nz(a,.13,'bandpass',900,3,.03,B.amb,t+i*.2);tone(a,'sawtooth',330,220,.13,.007,B.amb,t+i*.2,.01)}}
function sfxGull(){const a=sA();if(!a)return;const B=sndBus(a),t=a.currentTime;tone(a,'triangle',1900,1100,.38,.016,B.amb,t,.03);tone(a,'sine',2100,1300,.3,.007,B.amb,t+.05,.03)}
function sfxTrain(d){const a=sA();if(!a)return;const B=sndBus(a),t=a.currentTime,v=clamp(1-d/230,.15,1),dur=7,s=a.createBufferSource();s.buffer=SND.nb;s.loop=true;
  const f=a.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(110,t);f.frequency.linearRampToValueAtTime(240,t+dur*.45);f.frequency.linearRampToValueAtTime(100,t+dur);
  const g=a.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09*v,t+dur*.4);g.gain.linearRampToValueAtTime(0,t+dur);s.connect(f);f.connect(g);g.connect(B.amb);s.start(t);s.stop(t+dur+.1);
  for(let i=0;i<14;i++){const tt=t+.4+i*.42,amp=v*.035*Math.sin(Math.PI*(i+1)/15);nz(a,.04,'bandpass',900,2,amp,B.amb,tt);nz(a,.04,'bandpass',1000,2,amp*.8,B.amb,tt+.09)}}
/* per-frame update: engines, footsteps, indicators, ambience beds and the random wildlife */
const ENGP={hatch:[52,60,.016],cab:[46,52,.016],van:[40,48,.02],bus:[34,40,.026]};
const hourNow=()=>{if(window.DBGH!=null)return DBGH;const d=new Date();return d.getHours()+d.getMinutes()/60};
function sndScan(p,hr){const z={tr:0,rain:0,wat:0,mur:0};let s=0;for(const c of cars){if(!c.ai)continue;const d=hyp(c.x-p.x,c.y-p.y);if(d<150)s+=1-d/150}
  SND.park=inPoly('green',p.x,p.y);z.tr=Math.min(.04,(SND.park?.002:.004)+.006*s);
  let n=0;for(const r of [25,60])for(let k=0;k<8;k++)if(tAt(p.x+Math.cos(k*.785)*r,p.y+Math.sin(k*.785)*r)==3)n++;
  z.wat=.03*Math.sqrt(n/16);SND.thames=n>0&&hyp(p.x-D.lake[0],p.y-D.lake[1])>180;
  if(rainy()||window.DBGRAIN)z.rain=.035*Math.max(.35,Math.min(1,wxNow().rain*1.15));
  let m=0;{const mk=marketsOn(),d=Math.min(mk.maltby&&MALTBY?hyp(p.x-MALTBY.x,p.y-MALTBY.y):9e9,mk.blue?hyp(p.x-D.real.bluemkt[2],p.y-D.real.bluemkt[3]):9e9);if(d<120)m=.02*Math.pow(1-d/120,.8)}
  if(hr>=17||hr<1){for(const sh of D.shops){if(sh[4]!='pub'&&sh[4]!='bar')continue;const d=hyp(sh[2]-p.x,sh[3]-p.y);if(d<45)m=Math.max(m,.014*(1-d/45))}}
  z.mur=m;SND.z=z;SND.hr=hr;
  const R2=SND.cache.rail||(SND.cache.rail=(()=>{const o=[];for(const l of (WD.rail||[]))for(let i=0;i<l.length;i+=2)o.push(l[i],l[i+1]);return o})());let bd=1e9;for(let i=0;i<R2.length;i+=2){const d=Math.abs(R2[i]-p.x)+Math.abs(R2[i+1]-p.y);if(d<bd)bd=d}SND.railD=bd}
function sndUpdate(f){try{const a=AC;if(!a)return;if(!SND.ok){sndInit(a);return}const B=SND.bus,now=a.currentTime,on=started&&!paused&&ready&&!document.hidden&&a.state=='running';
  const T=(p,v,tc)=>p.setTargetAtTime(v,now,tc||.08),p=pos(),c=pl.car,ty=c?c.type:'',ct=c?TYPES[ty]:null,v=c?Math.abs(c.v||0):0,r=ct?clamp(v/ct.max,0,1):0,hr=hourNow();
  T(B.mus.gain,SND.mix.mus*(typeof DL!='undefined'&&DL?.55:1)*(radPlaying()?0:1),.3);radTick();
  if(fr%24==0&&started)sndScan(p,hr);
  const light=ty=='bike'||ty=='ebike'||ty=='scooter'||ty=='courier',road=!!c&&ty!='heli'&&!light,e=SND.eng;let eg=0;
  if(on&&c&&ty!='heli'){const cat=light?'light':'road';SND.ecat=cat;
    if(light){T(e.o1.frequency,150+r*380);T(e.o2.frequency,(150+r*380)*2.01);T(e.f.frequency,1200);eg=v>.01?.004+.008*r:0}
    else{const P=ENGP[ty]||ENGP.hatch,g=Math.min(3,Math.floor(r*4)),fr2=r*4-g,hz=P[0]+g*6+P[1]*(.35*r+.65*fr2*(.5+.5*r));T(e.o1.frequency,hz);T(e.o2.frequency,hz*.5);T(e.f.frequency,200+r*380);eg=P[2]*(.5+.5*r)}}
  T(e.g.gain,eg,.06);
  const h=typeof heli!='undefined'&&heli,sp=h?h.spool||0:0;let rg=0;if(on&&h&&sp>.02){const d=c===h?0:hyp(h.x-p.x,h.y-p.y);rg=.07*sp*clamp(1-d/260,0,1)}
  T(SND.rot.g.gain,rg,.1);T(SND.rot.lfo.frequency,4+9*sp);T(SND.rot.f.frequency,260+300*sp);
  const hb=K.brake||btnB;T(SND.v.skid.g.gain,on&&road&&hb&&r>.35?.02*r:0,.05);T(SND.v.road.g.gain,on&&c&&ty!='heli'?(light?.005:.014)*r:0,.15);
  const z=SND.z,k=on?1:0;T(SND.v.tr.g.gain,(z.tr+(road?r*.006:0))*k,.4);T(SND.v.rain.g.gain,z.rain*k,.6);T(SND.v.wat.g.gain,z.wat*k,.5);T(SND.v.mur.g.gain,z.mur*k,.5);
  if(on&&!c){const run=K.run||btnB,st=run?15:23,n=Math.floor(pl.walk/st);if(n!==SND.foot){if(pl.walk>0&&!(pl.jz>0)&&(pl.z||0)<.01)sfxStep(run);SND.foot=n}}else SND.foot=Math.floor(pl.walk/23);
  if(on&&road&&ty!='heli'){const stg=K.left||K.right||(joy.m>.3&&Math.abs(joy.x)>.5);if(stg&&v>.02){SND.st+=f;const q=Math.floor(SND.st/26);if(SND.st>40&&q!==SND.stn){SND.stn=q;sfxTick(q&1)}}else{SND.st=0;SND.stn=0}}
  if(on){const N=SND.nx,R=Math.random;
    if(SND.park&&hr>=5&&hr<20&&now>(N.bird||0)){if(N.bird)sfxBird();N.bird=now+(hr<8?1.5:3.5)+R()*5}
    if(now>(N.quack||0)){const nd=ducks.reduce((m,d)=>Math.min(m,hyp(d.x-p.x,d.y-p.y)),9e9);if(N.quack&&nd<70)sfxQuack();N.quack=now+4+R()*6}
    if(SND.thames&&hr>=6&&hr<21&&now>(N.gull||0)){if(N.gull)sfxGull();N.gull=now+5+R()*9}
    if(SND.railD<230&&now>(N.train||0)){if(N.train)sfxTrain(SND.railD);N.train=now+30+R()*60}}
  }catch(e){SND.err=String(e&&e.stack||e)}}
document.addEventListener('visibilitychange',()=>{if(AC){if(document.hidden){if(AC.state=='running')AC.suspend().catch(()=>{})}else if(started)AC.resume().catch(()=>{})}});
