/* GTA Bermondsey: Jobs, places and the A button.
   Classic script sharing one global scope with the other js/ files; load order is set in index.html. */
/* ---------- jobs ---------- */
const MIS=[
 {t:'Pie Run',g:'manze',who:'M. MANZE · TOWER BRIDGE ROAD',pay:120,time:300,brief:"Morning! Three regulars can't make it in today. Run their pie and mash round to them? Your cargo bike will keep it hot."},
 {t:'Biscuit',g:'pozies',who:"POZIE'S · THE BLUE",pay:200,time:360,brief:"A customer's little brown dog, Biscuit, slipped her lead in Southwark Park. Her owner's waiting here with us. Could you find her and bring her back?"},
 {t:'The Cart',g:'cycles',who:'SOUTHWARK CYCLES · JAMAICA ROAD',pay:300,time:360,brief:"Heard you're after a coffee cart. There's an old one going spare at Maltby Street Market. Tow it back here on your bike and we'll sort the wheels out."}];
function startMis(i){if(act){toast("Finish the job you're on first");return}
  const mi=MIS[i];act={k:i,st:0,t:mi.time,pay:mi.pay,n:0,title:mi.t};
  if(i==0){act.stops=[];for(let j=0;j<3;j++){const s=spot(80,380,P.manze.x,P.manze.y);if(s)act.stops.push({x:s.x,y:s.y,l:'Pie to '+(streetAt(s.x,s.y)||'a regular')})}act.tg=act.stops[0];ensureBike()}
  if(i==1){const b=D.places.m1b;dog={x:b[0],y:b[1],hx:b[0],hy:b[1],a:0,t:0,mv:0,walk:0,follow:0};act.tg={x:dog.x,y:dog.y,l:'Find Biscuit'}}
  if(i==2){ensureBike();act.tg={...MALTBY,l:'Maltby Street Market'}}
  toast('JOB ON: '+mi.t.toUpperCase())}
function startFavour(){if(act){toast("Finish the job you're on first");return}const p=pos();
  let pool=D.pool.filter(q=>{const d=hyp(q[2]-p.x,q[3]-p.y);return d>60&&d<420&&shopOpen(q)});if(!pool.length)pool=D.pool.filter(q=>{const d=hyp(q[2]-p.x,q[3]-p.y);return d>60&&d<420});if(!pool.length){toast('No favours right now');return}
  const a=pool[R()*pool.length|0],b=spot(220,520,a[2],a[3]);if(!b){toast('No favours right now');return}
  const what={cafe:'a coffee order',bakery:'a bag of bread',florist:'a bunch of flowers',greengrocer:'a veg box',butcher:'a Sunday joint',deli:'a deli order',post_office:'a parcel',books:'a book order',marketplace:'a market box',pet:'a bag of dog food',library:'a stack of library books'}[a[4]]||'a parcel';
  const st=streetAt(b.x,b.y)||'a neighbour',d=hyp(a[2]-b.x,a[3]-b.y);
  act={k:'f',st:0,t:Math.round(60+d/6+hyp(a[2]-p.x,a[3]-p.y)/8),pay:Math.min(80,20+Math.round(d/10)),title:'Favour',what,tg:{x:a[2],y:a[3],l:a[0]},b:{x:b.x,y:b.y,l:st}};
  toast(`FAVOUR: ${what} from ${a[0]} to ${st}. £${act.pay}`)}
function addHeart(){if(S.hearts<5){S.hearts++;return true}return false}
function winMis(){burst(pos().x,pos().y-6,'coin',10);const a=act,bonus=Math.round(a.pay*S.hearts*.05),gotH=addHeart();S.cash+=a.pay+bonus;if(typeof a.k=='number')S.mission=Math.max(S.mission,a.k+1);
  if(a.k===1)dog=null;act=null;const next=MIS[S.mission];
  const line={0:'"Smashing. They\'ll be back in on Friday."',1:"Biscuit's owner cries a bit. Biscuit licks your face.",2:'"Lovely old thing, this. Leave it with us."',f:'"Thanks ever so much, love."'}[a.k];
  dlg('win',{who:'JOB DONE',title:`${a.title.toUpperCase()}  +£${a.pay+bonus}`,text:esc(line)+`${gotH?'<br>The neighbourhood loves you a bit more ♥':''}${bonus?`<br>(£${bonus} tip from neighbourhood hearts)`:''}${next?`<br><br>Try ${esc(next.who.split(' ·')[0])} next.`:''}`,opts:[['Lovely',()=>{}]]})}
function failMis(r){if(act&&act.k===1)dog=null;act=null;toast('Ran out of time. '+r)}
function misUpdate(dt){if(!act)return;act.t-=dt;if(act.t<=0)return failMis(act.k===1?'Biscuit found her own way back.':'Never mind, there\'s always tomorrow.');const p=pos();
  if(act.k===0){if(hyp(p.x-act.tg.x,p.y-act.tg.y)<16){act.n++;if(act.n>=act.stops.length)return winMis();act.tg=act.stops[act.n];toast(['"Ooh, lovely, ta!"','"Still hot! Lovely."','"Tell them I said thanks."'][R()*3|0])}}
  else if(act.k===1){if(!dog.follow){act.tg={x:dog.x,y:dog.y,l:'Find Biscuit'};if(hyp(pl.x-dog.x,pl.y-dog.y)<10&&!pl.car){dog.follow=1;toast('Biscuit wags and follows you! Back to Pozie\'s.')}}else{act.tg={x:P.pozies.x,y:P.pozies.y,l:"Back to Pozie's"};if(hyp(p.x-P.pozies.x,p.y-P.pozies.y)<18)return winMis()}}
  else if(act.k===2){if(act.st==0){if(pl.car===bike&&hyp(p.x-MALTBY.x,p.y-MALTBY.y)<22){act.st=1;act.tg={x:P.cycles.x,y:P.cycles.y,l:'Southwark Cycles'};toast('Cart hitched to your bike. Off to Southwark Cycles.')}else if(!pl.car&&hyp(p.x-MALTBY.x,p.y-MALTBY.y)<22&&fr%120==0)toast("You'll need your bike to tow it.")}
    else if(pl.car===bike&&hyp(p.x-P.cycles.x,p.y-P.cycles.y)<24)return winMis()}
  else if(act.k==='f'){if(act.st==0&&hyp(p.x-act.tg.x,p.y-act.tg.y)<16){act.st=1;act.tg=act.b;toast('Got '+act.what+'. Now the drop.')}else if(act.st==1&&hyp(p.x-act.tg.x,p.y-act.tg.y)<18)return winMis()}}

/* ---------- places and the A button ---------- */
const nearP=(k,r)=>{const p=pos();return hyp(p.x-P[k].x,p.y-P[k].y)<(r||10)};
function ctxAct(){if(!ready)return null;if(!pl.car&&pl.z>0){const c=nearOwn();return c?{l:'Borrow the police helicopter',f:()=>enterCar(c)}:null}if(pl.car&&pl.car.type=='heli'&&!pl.car.landed&&(pl.car.alt||0)*55>10)return{l:'Jump out (parachute)',f:()=>startChute((pl.car.alt||0)*55,0,0)};
  if(pl.car)return{l:pl.car.type=='heli'?(pl.car.landed?'Get out':'Lower down first'):'Get off',f:leaveCar};
  {const g=nearPack();if(g)return{l:pack.follow>0?'Give the pack a fuss':'Say hello to the pack',f:()=>{for(const d of pack.dogs)burst(d.x,d.y,'heart',2);if(pack.follow>0){toast('Belly rubs all round.')}else{toast(['The whole pack wags at once. They tag along for a bit.','Six tails, one opinion: you are great. They follow you.','Sniffs, wags, a happy bark. The pack joins your walk.'][R()*3|0])}pack.follow=60*60}}}
  {const o=nearOwn();if(o&&hyp(o.x-pl.x,o.y-pl.y)<4.5)return{l:o.type=='bike'?'Ride':'Drive',f:()=>enterCar(o)}}
  if(nearP('manze'))return{l:'Manze',f:manzeDlg};if(nearP('flat'))return{l:'Home',f:flatDlg};if(nearP('pozies'))return{l:"Pozie's",f:poziesDlg};
  if(nearP('library'))return{l:'Library',f:libraryDlg};if(nearP('cycles'))return{l:'Cycles',f:cyclesDlg};
  if(nearP('bells'))return{l:"Bell's Cafe",f:bellsDlg};
  {const q=nearSpecial();if(q&&q.kind=='bell')return{l:'Chat with Bell',f:bellsDlg};if(q)return q.kind=='monk'?{l:q.walker?'Chat with the monks':'Chat with the monk',f:()=>monkDlg(q)}:{l:'The Beatboxing Boxer',f:()=>boxerDlg(q)}}
  {const q=nearPed();if(q&&q.postie)return{l:'Say hello to the postie',f:()=>pedDlg(q)};if(q)return{l:q.dog?'Chat · '+q.dog.n:'Chat',f:()=>pedDlg(q)}}
  {const sh=nearShop();if(sh)return{l:sh[0],f:()=>shopDlg(sh)}}
  if(nearLake())return{l:'Ducks',f:duckDlg};
  {const c=nearOwn();if(c)return{l:c.type=='bike'?'Ride':c.type=='heli'?'Borrow the police helicopter':'Drive',f:()=>enterCar(c)}}
  {let r=null,bd=5;for(const c of cars)if(c.rental&&c!==pl.car){const d=hyp(c.x-pl.x,c.y-pl.y);if(d<bd){bd=d;r=c}}if(r)return{l:'Hire '+TYPES[r.type].n+' · £1',f:()=>{if(S.cash<1){toast("You need £1 to unlock it.");return}S.cash-=1;toast('Unlocked! £1. Leave it anywhere when you\'re done.');enterCar(r)}}}
  {const q=nearParked();if(q){if(keyHeld&&keyHeld.i===q.n)return{l:'Try the keys',f:()=>{keyHeld=null;window.keyHeld=null;S.cash+=5;takeParked(q);kindAct('Beep-beep! The lights flash. A note under the wiper: "You found my keys?! Thank you so much. Have a fiver, and do borrow her for a spin!" (+£5)')}};
    return{l:'Get in',f:()=>{if(keyHeld){toast('You try the keys... nothing. Not this one. (Look for the green key marker.)');return}takeParked(q,['The door is unlocked and there\'s a note on the dash: "Borrow me, be kind!"','Unlocked, with a mint in the door. A note: "Mind the mirrors!"','The keys are tucked in the sun visor. Very trusting.'][R()*3|0])}}}}
  const t=nearTraffic();if(t){if(BORROW[t.type]&&Math.abs(t.v)<.12)return{l:t.type=='bus'?'Ask the bus driver':'Ask to borrow',f:()=>borrowDlg(t)};return{l:'Wave',f:()=>{toast(['The driver waves back.','"Alright, Sam!"','A friendly toot of the horn.'][R()*3|0])}}}return null}
const BORROW={hatch:1,cab:1,van:1,bus:1};
const DRV=['Maureen','Dev','Priya','Terry','Kwame','Siobhan','Marek','Joy','Femi','Lorraine','Tomasz','Rita'];
function borrowDlg(c){c.v=0;const n=c.drv||(c.drv=DRV[R()*DRV.length|0]),T=TYPES[c.type];
  if(c.type=='bus'){dlg('t',{who:'Bus driver',text:'"Morning! Sorry, love, I can\'t lend you the bus. Forty people are quite attached to it. The next one\'s along in eight minutes though."',opts:[['"Of course, sorry to bother you!"',()=>toast('"No bother at all. Mind the doors!"')]]});return}
  dlg('t',{who:n,text:`The window winds down. "Oh, hello! Everything alright?"`,opts:[
    ['"So sorry to bother you, could I possibly borrow your '+T.n+'?"',()=>{
      if(c.asked){dlg('t',{who:n,text:'"Ha, you again! Still a no, sorry. Still on my way to pick up my nan."',opts:[['"Totally understand, have a lovely day."',()=>toast(n+' gives you a cheery thumbs up.')]]});return}
      c.asked=1;
      if(R()<.2){dlg('t',{who:n,text:['"Oh, I\'m ever so sorry, I\'m on my way to pick up my nan. Another time?"','"Ah, I would, but there\'s a cake on the back seat and it\'s very fragile. Sorry!"','"Sorry, love, I\'m late for my shift at Guy\'s. Good luck though!"'][R()*3|0],opts:[['"No problem at all, thanks anyway!"',()=>kindAct('You took no for an answer, graciously.')]]});return}
      dlg('t',{who:n,text:'"Oh! Well... I suppose so. Where are you off to?"',opts:[
        ['"Just round Bermondsey. I\'ll take very good care of it."',()=>lend(c,n)],
        ['"Only a quick spin, I\'ll be ever so careful."',()=>lend(c,n)],
        ['"Actually, I\'ll walk. Thank you though!"',()=>toast(['"Fair enough! Lovely day for it."','"Ha, no worries. Enjoy your walk!"'][R()*2|0])]]})}],
    ['"Just saying hello!"',()=>toast(['"Well, hello to you too!"','"Alright! Lovely to see you."',n+' waves and toots the horn very gently.'][R()*3|0])],
    ['"Sorry, wrong car!"',()=>toast('"Ha, happens to the best of us!"')]]})}
function lend(c,n){dlg('t',{who:n,text:'"Go on then. Keys are in. Mirrors are set for me, mind, so give them a wiggle. And there\'s a mint in the door if you want one."',opts:[
  ['"Thank you so much, that\'s really kind."',()=>{c.borrowed=n;c.ai=false;c.v=0;enterCar(c);toast(['You both say thank you about four times. '+n+' heads off for a coffee.','"No, thank YOU." "No, thank you!" '+n+' strolls off to Bermondsey Street.','A firm, friendly handshake. '+n+' says to leave it anywhere sensible.'][R()*3|0])}]]})}
function giveBack(c){const n=c.borrowed;c.borrowed=null;c.lent=1;kindAct(['You put the seat back, take one mint, and text '+n+' where it\'s parked. "Cheers! x"','Parked neatly. You text '+n+': "Thank you again!" Reply: "Any time!"','You leave a little thank-you note on the dashboard for '+n+'.'][R()*3|0])}
function bikeHome(){if(pl.car===bike)leaveCar();const k=nearKerb(P.flat.x,P.flat.y,'bike','#1fb5a8');bike.x=k.x;bike.y=k.y;bike.a=k.a;bike.v=0;toast('Your bike is parked outside.')}
function give(a){a=Math.min(a,Math.floor(S.cash),GOAL-S.fund);if(a<=0){toast(S.fund>=GOAL?'The tin is full!':'Nothing to put in yet.');return}S.cash-=a;S.fund+=a;
  if(S.fund>=GOAL&&!S.won){S.won=1;dlg('won',{who:'THE SAVINGS TIN',title:'COFFEE CART!',text:"The tin is full. The cart's wheels are fixed, the paint's dry, and you pour your first flat white near Maltby Street. Half the people you've helped turn up for one.<br><br>Thanks for playing this build! Favours keep going.",opts:[['♥ ♥ ♥',()=>{}]]})}else toast('£'+a+' in the tin. £'+(GOAL-S.fund)+' to go.')}
function jobOpt(k,o){const mi=MIS[S.mission];if(!act&&mi&&mi.g==k)o.unshift(['Job: '+mi.t,()=>jobBrief(S.mission)])}
function jobBrief(i){const mi=MIS[i];dlg('brief',{who:mi.who,title:mi.t.toUpperCase(),text:esc('"'+mi.brief+'"')+`<br>£${mi.pay} · ${Math.round(mi.time/6)/10} min`,opts:[['Happy to help',()=>startMis(i)],['Not right now',()=>{}]]})}
function manzeDlg(){const o=[['Bye',()=>{}]];jobOpt('manze',o);dlg('manze',{who:'M. MANZE · TOWER BRIDGE ROAD',text:'Pie and mash, since 1902. "Alright, love?"',opts:o})}
function flatDlg(){dlg('flat',{who:'YOUR FLAT · ABBEY STREET',text:`Coffee cart savings tin: £${S.fund} of £${GOAL}.`,opts:[['Put £50 in the tin',()=>give(50)],['Put it all in',()=>give(S.cash)],['Bring my bike home',bikeHome],['Back out',()=>{}]]})}
function cyclesDlg(){const o=[['Bye',()=>{}]];jobOpt('cycles',o);dlg('cycles',{who:'SOUTHWARK CYCLES · JAMAICA ROAD',text:o.length>1?'"Got a minute?"':'"Bike running sweet? The noticeboard at Blue Anchor Library has favours going."',opts:o})}
function poziesDlg(){const o=[['Bye',()=>{}]];jobOpt('pozies',o);dlg('pozies',{who:"POZIE'S · THE BLUE",text:o.length>1?'"Oh, glad you\'re here."':S.mission>1?'"Biscuit\'s owner keeps telling everyone about you."':'Buckets of flowers out on The Blue.',opts:o})}
function libraryDlg(){dlg('library',{who:'BLUE ANCHOR LIBRARY · SOUTHWARK PARK RD',title:'NOTICEBOARD',text:'Neighbours pin up favours on the board: collections from real shops round Bermondsey, dropped to a street nearby. £20 to £80.',opts:[['Take a favour',startFavour],['Not now',()=>{}]]})}

