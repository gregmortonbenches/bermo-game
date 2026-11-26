/* GTA Bermondsey: Online crew link-up (claude.ai version only).
   Classic script sharing one global scope with the other js/ files; load order is set in index.html. */
/* ---------- online crew link-up ---------- */
let db=null,user=null,room=null,uid=null,crew=null,members={},peersL=[],names={},crewRoom=null,saving=false,lastBody='',lastPres='',memBusy=false,lastMem='';
const savePath=()=>'data/users/'+uid+'/save3';
const nameOf=id=>id===uid?'You':(names[id]||'Crew mate');
function fetchNames(ids){const need=[...new Set(ids)].filter(i=>i&&!(i in names));if(!need.length||!user)return;for(const i of need)names[i]='Crew mate';
  user.profiles(need).then(ps=>{for(const i of need)names[i]=(ps&&ps[i]&&ps[i].name)||'Crew mate';if(dlgMode=='crew')crewDlg()}).catch(()=>{})}
function memberBody(){const p=pos();return{zone:ready?zoneAt(p.x,p.y):'',hearts:S.hearts,fund:S.fund,at:Math.round(Date.now()/6e4)*6e4}}
function leaveCrewLocal(){if(crew){crew.u1&&crew.u1();crew.u2&&crew.u2()}if(crewRoom)crewRoom.leave().catch(()=>{});crewRoom=null;crew=null;members={};peersL=[]}
async function joinCrew(code,quiet){code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);if(code.length!=6){toast('Crew codes are 6 letters or numbers');return}
  if(!db||!uid){toast('Link-up needs the game open on claude.ai');return}
  try{const col=db.collection('crews/'+code+'/members'),ex=await col.get();if(!ex.docs.some(d=>d.id===uid)&&ex.size>=8){toast("That crew's full (8 max)");return}await col.doc(uid).set(memberBody())}
  catch(e){toast("Couldn't link up. You may need Contributor access.");return}
  leaveCrewLocal();S.crew=code;crew={code};
  crew.u1=db.collection('crews/'+code+'/members').onSnapshot(sn=>{members={};for(const d of sn.docs)members[d.id]=d.data();fetchNames(Object.keys(members));if(dlgMode=='crew')crewDlg()},()=>{});
  crew.u2=db.collection('crews/'+code+'/gifts').where('to','==',uid).onSnapshot(sn=>{for(const d of sn.docs)recvGift(d)},()=>{});
  if(room){try{crewRoom=await room.join('crew-'+code.toLowerCase());crewRoom.onPeers(ch=>{peersL=ch.peers.filter(p=>!p.sameTab&&p.kind=='viewer');fetchNames(peersL.map(p=>p.by||p.presence.uid).filter(x=>typeof x=='string'));if(dlgMode=='crew')crewDlg()},()=>{})}catch(e){crewRoom=null}}
  if(!quiet)toast('Linked up with crew '+code);if(dlgMode=='crew')crewDlg()}
function leaveCrew(){if(crew&&db&&uid)db.doc('crews/'+crew.code+'/members/'+uid).delete().catch(()=>{});leaveCrewLocal();S.crew=null}
function recvGift(d){const g=d.data();if(!g||!crew||S.applied.includes(d.id))return;S.applied.push(d.id);S.applied=S.applied.slice(-40);
  if(g.kind=='cash'){const a=clamp(Number(g.amt)||0,0,100);S.cash+=a;toast(nameOf(g.from)+' sent you £'+a+' ♥')}
  else if(g.kind=='wave'){toast(nameOf(g.from)+' waved at you ♥')}
  db.doc('crews/'+crew.code+'/gifts/'+d.id).delete().catch(()=>{})}
function sendGift(to,kind){if(!crew)return;const cost=kind=='cash'?20:0;if(S.cash<cost){toast("You can't afford that");return}S.cash-=cost;
  db.collection('crews/'+crew.code+'/gifts').add({to,from:uid,kind,amt:kind=='cash'?20:35,at:Date.now()}).then(()=>toast('Sent to '+nameOf(to))).catch(()=>{S.cash+=cost;toast("Couldn't send that")})}
function newCode(){const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=a[R()*a.length|0];return s}
function crewDlg(){
  if(!db||!uid){dlg('crew',{who:'CREW LINK',title:'NOT LINKED',text:"Link-up works when the game is open on claude.ai and you're signed in. Progress is saved on this device for now.",opts:[['OK',()=>{}]]});return}
  if(!crew){dlg('crew',{who:'CREW LINK',title:'LINK UP',text:"Link up with mates over the internet. Start a crew and share the code, or type a mate's code. Up to 8.",extra:'<input id="codeI" maxlength="6" placeholder="CODE" aria-label="Crew code">',
    opts:[['Join with code',()=>{joinCrew($('#codeI').value)}],['Start a new crew',()=>joinCrew(newCode())],['Close',()=>{}]]});return}
  const on=new Set(peersL.map(p=>p.by||p.presence.uid));const ids=Object.keys(members).sort((a,b)=>a===uid?-1:b===uid?1:0);const o=[];
  const rows=ids.map(id=>{const mb=members[id]||{},fn=nameOf(id).split(' ')[0];if(id!==uid){o.push(['Wave at '+fn,()=>sendGift(id,'wave')],['£20 to '+fn,()=>sendGift(id,'cash')])}
    return`<div class="mem"><span class="dot ${id===uid||on.has(id)?'on':''}">●</span><span>${esc(nameOf(id))}<br><span style="opacity:.7">${esc(String(mb.zone||'?'))} · ${'♥'.repeat(clamp(Math.round(Number(mb.hearts)||0),0,5))} · tin £${Math.round(Number(mb.fund)||0)}</span></span></div>`}).join('');
  o.push(['Copy code',()=>{try{navigator.clipboard.writeText(crew.code).then(()=>toast('Code copied'),()=>toast('Code: '+crew.code))}catch(e){toast('Code: '+crew.code)}}],['Leave crew',leaveCrew],['Close',()=>{}]);
  dlg('crew',{who:'YOUR CREW',text:`<div class="code">${esc(crew.code)}</div>Green dot = online. Online mates show up on your streets in blue.${rows}`,opts:o})}
async function initOnline(){const CL=window.claude;if(!CL||!CL.use)return;
  try{[user,db,room]=await Promise.all([CL.use('user'),CL.use('db'),CL.use('room')])}catch(e){}
  if(user)try{uid=await user.id()}catch(e){uid=null}
  if(db&&uid){try{const sn=await db.doc(savePath()).get();if(sn.exists){const r=JSON.parse(JSON.stringify(sn.data()));if(r&&r.v==3&&r.last>S.last&&!started){S=Object.assign(fresh(),r);hadSave=true;pl.x=S.x;pl.y=S.y;if(ready)$('#startB').textContent='Continue'}}}catch(e){}
    if(S.crew)joinCrew(S.crew,true)}}
function writeSave(){const p=pos();S.x=Math.round(p.x);S.y=Math.round(p.y);if(bike){S.bx=Math.round(bike.x);S.by=Math.round(bike.y)}const body=JSON.stringify(S);if(body===lastBody)return;lastBody=body;
  try{localStorage.setItem('dockhead-save3',body)}catch(e){}
  if(db&&uid&&!saving){saving=true;db.doc(savePath()).set(JSON.parse(body)).catch(()=>{}).finally(()=>{saving=false})}}
function syncCrew(){if(!crewRoom)return;const p=pos(),b={x:Math.round(p.x),y:Math.round(p.y),a:Math.round(p.a*100)/100,car:pl.car?pl.car.type:null,col:pl.car?pl.car.col:null,uid};const j=JSON.stringify(b);if(j===lastPres)return;lastPres=j;crewRoom.presence(b).catch(()=>{})}
function syncMember(){if(!crew||!db||memBusy)return;const b=memberBody(),j=JSON.stringify(b);if(j===lastMem)return;lastMem=j;memBusy=true;db.doc('crews/'+crew.code+'/members/'+uid).set(b).catch(()=>{}).finally(()=>{memBusy=false})}

