/* Car radio: real UK stations from the Radio Browser directory (api.radio-browser.info, free, no key).
   Pick a station from the BAG menu (Radio) or press T to hop to the next one. It plays only while you are in a vehicle,
   replaces the game's jazz while it plays, and follows the Music level in Sound levels. Needs an internet connection; if the
   directory or a stream is unreachable it says so and the jazz carries on. Streams are plain <audio>, nothing is recorded. */
const RADIO={list:null,loading:false,cur:null,on:false,el:null,tries:0,page:0,err:'',cat:''};
try{const s=JSON.parse(localStorage.getItem('gtab-radio')||'null');if(s&&s.url)RADIO.cur=s}catch(e){}
const RAD_API=['https://all.api.radio-browser.info','https://de1.api.radio-browser.info'];
const RAD_CATS=[['Top UK','',''],['Pop','pop','Pop'],['Dance','dance','Dance'],['Rock','rock','Rock'],['Jazz and soul','jazz','Jazz'],['Classical','classical','Classical'],['News and talk','news','News'],['Oldies','oldies','Oldies']];
async function radFetch(path){let e;for(const b of RAD_API){try{const ac=new AbortController(),to=setTimeout(()=>ac.abort(),6000),r=await fetch(b+path,{signal:ac.signal});clearTimeout(to);if(r.ok)return await r.json()}catch(x){e=x}}throw e||new Error('no directory')}
async function radLoad(tag){RADIO.loading=true;RADIO.err='';try{
  const q='/json/stations/search?countrycode=GB&hidebroken=true&is_https=true&order=votes&reverse=true&limit=60'+(tag?'&tag='+encodeURIComponent(tag):'');
  const d=await radFetch(q),seen=new Set();RADIO.list=d.filter(s=>(s.codec=='MP3'||s.codec=='AAC'||s.codec=='AAC+')&&s.url_resolved&&/^https:/.test(s.url_resolved)&&!seen.has(s.name.toLowerCase())&&seen.add(s.name.toLowerCase())).slice(0,30).map(s=>({id:s.stationuuid,name:s.name.trim().slice(0,32),url:s.url_resolved}));RADIO.page=0;
  if(!RADIO.list.length)RADIO.err='No stations came back.'}catch(e){RADIO.list=null;RADIO.err="Couldn't reach the radio directory."}RADIO.loading=false}
function radEl(){if(!RADIO.el){const a=new Audio();a.preload='none';a.addEventListener('error',()=>radFail());a.addEventListener('playing',()=>{RADIO.tries=0});RADIO.el=a}return RADIO.el}
function radFail(){if(!RADIO.on)return;RADIO.tries++;if(RADIO.tries<3&&RADIO.list&&RADIO.cur){toast("That station isn't playing. Trying the next one.");radNext()}else{RADIO.on=false;try{RADIO.el.pause()}catch(e){}toast("Couldn't get a station. Back to the jazz.")}}
function radPlay(st){RADIO.cur=st;RADIO.on=true;try{localStorage.setItem('gtab-radio',JSON.stringify(st))}catch(e){}
  try{fetch(RAD_API[0]+'/json/url/'+st.id,{mode:'no-cors'}).catch(()=>{})}catch(e){}/* tells the directory someone listened, which is what keeps it going */
  const a=radEl();a.src=st.url;RADIO.want=false;radTick();if(!(pl.car))toast('Radio: '+st.name+'. Plays when you are in a vehicle.');else toast('Radio: '+st.name)}
function radNext(){if(!RADIO.list||!RADIO.list.length){radLoad('').then(()=>{if(RADIO.list&&RADIO.list.length)radPlay(RADIO.list[0]);else toast(RADIO.err||'No radio.')});return}
  const i=RADIO.list.findIndex(s=>RADIO.cur&&s.id==RADIO.cur.id);radPlay(RADIO.list[(i+1)%RADIO.list.length])}
function radOff(){RADIO.on=false;try{RADIO.el&&RADIO.el.pause()}catch(e){}toast('Radio off')}
/* called every frame from sndUpdate: play only while driving, not paused, not hidden */
function radTick(){if(!RADIO.el)return;const want=RADIO.on&&started&&!paused&&!document.hidden&&!!pl.car;RADIO.el.volume=Math.max(0,Math.min(1,SND.mix.mus*.6*(typeof DL!='undefined'&&DL?.5:1)));
  if(want&&RADIO.el.paused&&RADIO.el.src){RADIO.el.play().catch(()=>{})}else if(!want&&!RADIO.el.paused)RADIO.el.pause()}
const radPlaying=()=>RADIO.on&&!!pl.car;
function radioLabel(){return RADIO.on&&RADIO.cur?'Radio: '+RADIO.cur.name:'Radio: off'}
function radioDlg(){const o=[];const cat=RAD_CATS.find(c=>c[0]==RADIO.cat)||RAD_CATS[0];
  if(RADIO.loading){dlg('radio',{who:'CAR RADIO',title:'TUNING',text:'Looking for stations…',opts:[['Back',menuDlg]]});setTimeout(()=>{if(DL&&dlgMode=='radio')radioDlg()},800);return}
  if(!RADIO.list){if(RADIO.err)o.push(['Try again',()=>{radLoad(cat[1]).then(radioDlg);radioDlg()}]);else{radLoad(cat[1]).then(radioDlg);radioDlg();return}
    o.push(['Back',menuDlg]);dlg('radio',{who:'CAR RADIO',title:'NO SIGNAL',text:esc(RADIO.err||'Needs an internet connection.'),opts:o});return}
  const pg=RADIO.page,L=RADIO.list;for(const s of L.slice(pg*5,pg*5+5))o.push([(RADIO.on&&RADIO.cur&&RADIO.cur.id==s.id?'▶ ':'')+s.name,()=>{radPlay(s)}]);
  if((pg+1)*5<L.length)o.push(['More stations ›',()=>{RADIO.page++;radioDlg()}]);else if(pg>0)o.push(['‹ Back to the first stations',()=>{RADIO.page=0;radioDlg()}]);
  o.push([`Type: ${cat[0]} ›`,()=>{const n=RAD_CATS[(RAD_CATS.indexOf(cat)+1)%RAD_CATS.length];RADIO.cat=n[0];RADIO.list=null;radLoad(n[1]).then(radioDlg);radioDlg()}]);
  if(RADIO.on)o.push(['Radio off',radOff]);o.push(['Back',menuDlg]);
  dlg('radio',{who:'CAR RADIO',title:cat[0].toUpperCase(),text:'UK stations, live. Press T in a car to skip to the next one.',opts:o})}
