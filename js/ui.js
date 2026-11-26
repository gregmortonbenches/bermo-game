/* GTA Bermondsey: Dialogue sheet and toasts.
   Classic script sharing one global scope with the other js/ files; load order is set in index.html. */
/* ---------- dialogue sheet and toasts ---------- */
let dlgMode=null,DL=null,tq=[],tOn=false;
function dlg(mode,o){dlgMode=mode;DL={opts:o.opts||[['OK',()=>{}]],sel:0};const el=$('#dlg');
  el.innerHTML=`${o.who?`<div class="who">${esc(o.who)}</div>`:''}${o.title?`<div class="ttl">${esc(o.title)}</div>`:''}<div class="txt">${o.text||''}</div>${o.extra||''}<div class="opts">${DL.opts.map((q,i)=>`<button data-i="${i}" class="${i?'':'sel'}">${esc(q[0])}</button>`).join('')}</div>`;
  el.hidden=false;el.scrollTop=0;paused=true;$('#tag').hidden=true}
function closeDlg(){dlgMode=null;DL=null;$('#dlg').hidden=true;paused=bigMap}
function pick(i){if(!DL||!DL.opts[i])return;const before=DL;DL.opts[i][1]();if(DL===before)closeDlg()}
function moveSel(d){if(!DL)return;DL.sel=(DL.sel+d+DL.opts.length)%DL.opts.length;$('#dlg').querySelectorAll('.opts button').forEach((b,i)=>b.classList.toggle('sel',i==DL.sel));const b=$('#dlg').querySelector('.opts button.sel');b&&b.scrollIntoView({block:'nearest'})}
$('#dlg').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b)pick(+b.dataset.i)});
$('#dlg').addEventListener('pointerover',e=>{const b=e.target.closest('button[data-i]');if(b&&DL){DL.sel=+b.dataset.i;moveSel(0)}});
function toast(t){tq.push(t);if(!tOn)nextT()}
function nextT(){const el=$('#toast');if(!tq.length){tOn=false;el.classList.remove('on');return}tOn=true;el.textContent=tq.shift();el.classList.add('on');setTimeout(()=>{el.classList.remove('on');setTimeout(nextT,260)},2400)}
let lastCash=-1,lastH=-1,lastF=-1;
function hud(){if(S.cash!==lastCash){lastCash=S.cash;$('#cash').textContent='£'+Math.floor(S.cash).toLocaleString('en-GB')}
  if(S.hearts!==lastH){lastH=S.hearts;$('#hearts').innerHTML='♥'.repeat(S.hearts)+`<span class="off">${'♥'.repeat(5-S.hearts)}</span>`}
  if(S.fund!==lastF){lastF=S.fund;$('#tinBar').style.width=(S.fund/GOAL*100)+'%';$('#tinPct').textContent='£'+S.fund}
  const o=$('#obj');if(act&&started){o.hidden=false;const t=Math.max(0,Math.ceil(act.t));o.innerHTML=`<b>${esc(act.title)}</b> · ${esc(act.tg.l)} · ${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`}else o.hidden=true;
  if(!ready||!started)return;const p=pos(),z=zoneAt(p.x,p.y);
  if(z!==lastZone){lastZone=z;const el=$('#banner');el.textContent=z;el.classList.add('on');clearTimeout(hud.t);hud.t=setTimeout(()=>el.classList.remove('on'),1900)}
  if(fr%24==0){const s=streetAt(p.x,p.y);if(s!==lastStreet){lastStreet=s;$('#street').textContent=s}}
  drawMini(p)}

