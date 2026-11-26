/* GTA Bermondsey: Sound effects and the gentle jazz trio, all made live with Web Audio (no audio files).
   Classic script sharing one global scope with the other js/ files; load order is set in index.html. */
function sfxCtx(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}catch(e){return null}}
function sfxCrunch(k){const a=sfxCtx();if(!a)return;try{const t=a.currentTime,n=a.createBufferSource(),L=a.sampleRate*.4|0,b=a.createBuffer(1,L,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,2.5);n.buffer=b;
  const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=700+k*1800;const g=a.createGain();g.gain.value=.06+k*.2;n.connect(f);f.connect(g);g.connect(a.destination);n.start(t);
  const o=a.createOscillator(),og=a.createGain();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(40,t+.2);og.gain.setValueAtTime(.05+.22*k,t);og.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(og);og.connect(a.destination);o.start(t);o.stop(t+.3)}catch(e){}}
function sfxHorn(dist,len){const a=sfxCtx();if(!a)return;try{const t=a.currentTime+.05+Math.random()*.15,v=clamp(.07*(1-dist/90),0,.07);if(v<=.004)return;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=1500;const g=a.createGain();
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.02);g.gain.setValueAtTime(v,t+len);g.gain.linearRampToValueAtTime(0,t+len+.05);f.connect(g);g.connect(a.destination);for(const hz of[392,494]){const o=a.createOscillator();o.type='square';o.frequency.value=hz;o.connect(f);o.start(t);o.stop(t+len+.1)}}catch(e){}}
/* ---------- gentle jazz: a small trio generated live with Web Audio (no audio files) ----------
   swing ride + brushes, walking upright bass, soft electric-piano comping and the odd vibraphone phrase over a 16-bar tune in F */
const MUS={on:true,run:false,beat:0,next:0,timer:null,out:null,rev:null,nz:null,lastMel:-99};
try{MUS.on=localStorage.getItem('gtab-music')!=='off'}catch(e){}
const JZ_FORM=['F^','F^','D-','D-','G-','G-','C7','C7','A-','D7','G-','C7','F^','D-','G-','C7','F^','F^','F7','F7','B^','B^','B-','E7','A-','D7','G-','C7','F6','F6','G-','C7'];
const JZ_ROOT={F:5,D:2,G:7,C:0,A:9,B:10,E:3},JZ_Q={'^':[0,4,7,11,14],'-':[0,3,7,10,14],'7':[0,4,7,10,14],'6':[0,4,7,9,14]};
const jzChord=i=>{const c=JZ_FORM[(i%JZ_FORM.length+JZ_FORM.length)%JZ_FORM.length];return{r:JZ_ROOT[c[0]],q:JZ_Q[c.slice(1)]}};
const mHz=m=>440*Math.pow(2,(m-69)/12);
function musInit(){if(MUS.out)return;
  const comp=AC.createDynamicsCompressor();comp.threshold.value=-20;comp.ratio.value=3;comp.connect(AC.destination);
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
function menuDlg(){dlg('menu',{who:'MENU',title:'YOUR BAG',text:`${esc(bagStr())}<br><br>Cash £${Math.floor(S.cash)} · Tin £${S.fund}/${GOAL} · Kind acts ${S.kind||0}`,opts:[['Route planner',destDlg],['Crew link',crewDlg],[`Music: ${MUS.on?'on':'off'}`,()=>{toggleMusic();menuDlg()}],[`Vibration: ${HAPT.on?'on':'off'}`,()=>{toggleHaptic();menuDlg()}],['Close',()=>{}]]})}

