// GTA Bermondsey: three.js renderer. The game simulation (index.html) runs in map units (1.3 per metre); this draws it in 3D metres.
import * as THREE from 'three';
const K=1/1.3,PI=Math.PI,R=Math.random,hyp=Math.hypot,cl=(v,a,b)=>v<a?a:v>b?b:v;
const mob=matchMedia('(pointer:coarse)').matches;
/* Visual terrain: the Environment Agency LiDAR bare-earth heights (world3d.json "terrain", 8 m cells, smoothed) lift every mesh in the vertex shader, so cars, people, the camera and shadows follow the ground while physics stays flat. Water materials flagged userData.noTerrain keep the river level. */
const TERR={tex:null,n:new THREE.Vector2(1,1),cell:8,tmin:0,ts:1,u:{tHM:{value:null},tHN:{value:new THREE.Vector2(1,1)},tHC:{value:new THREE.Vector3(8,0,1)}},d:null};
function terrInit(T){let d,nx=1,ny=1;if(T&&T.b64){nx=T.n[0];ny=T.n[1];const s=atob(T.b64);d=new Uint8Array(s.length);for(let i=0;i<s.length;i++)d[i]=s.charCodeAt(i)}else d=new Uint8Array(1);
  const t=new THREE.DataTexture(d,nx,ny,THREE.RedFormat,THREE.UnsignedByteType);t.unpackAlignment=1;t.minFilter=t.magFilter=THREE.LinearFilter;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.needsUpdate=true;
  const on=!!(T&&T.b64)&&!/[?&]flat/.test(location.search);Object.assign(TERR,{tex:t,d,n:new THREE.Vector2(nx,ny),cell:T?T.cell:8,tmin:on?T.tmin:0,ts:on?T.ts:0,has:on});TERR.u.tHM.value=t;TERR.u.tHN.value.copy(TERR.n);TERR.u.tHC.value.set(TERR.cell,TERR.tmin,TERR.ts)}
function TH(x,z){if(!TERR.d||!TERR.has)return 0;const nx=TERR.n.x,ny=TERR.n.y,fx=cl(x/TERR.cell,0,nx-1.001),fz=cl(z/TERR.cell,0,ny-1.001),i=fx|0,j=fz|0,a=fx-i,b=fz-j,D=TERR.d,v=(jj,ii)=>D[jj*nx+ii];
  return TERR.tmin+TERR.ts/255*((v(j,i)*(1-a)+v(j,i+1)*a)*(1-b)+(v(j+1,i)*(1-a)+v(j+1,i+1)*a)*b)}
THREE.Material.prototype.customProgramCacheKey=function(){return (this.userData&&this.userData.noTerrain?'n':'t')+this.onBeforeCompile.toString()};
THREE.Material.prototype.onBeforeCompile=function(sh){if(this.userData&&this.userData.noTerrain)return;Object.assign(sh.uniforms,TERR.u);
  sh.vertexShader=sh.vertexShader.replace(/void\s+main\s*\(\s*\)/,'uniform sampler2D tHM;uniform vec2 tHN;uniform vec3 tHC;\nvoid main()').replace('#include <begin_vertex>',`#include <begin_vertex>
{vec4 tp_=vec4(transformed,1.0);float ts_=length(modelMatrix[1].xyz);
#ifdef USE_INSTANCING
tp_=instanceMatrix*tp_;ts_*=length(instanceMatrix[1].xyz);
#endif
tp_=modelMatrix*tp_;transformed.y+=(tHC.y+tHC.z*texture2D(tHM,(tp_.xz/tHC.x+.5)/tHN).r)/max(ts_,.001);}`)};
const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c3'),antialias:!mob,powerPreference:'high-performance'});
renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload());/* CPU copies of static geometry are released after upload, so a lost GPU context can only be recovered by reloading */
renderer.setPixelRatio(Math.min(devicePixelRatio,mob?1.5:1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(62,1,.3,3200);
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<innerHeight?74:60;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
const hemi=new THREE.HemisphereLight(0xa8c0e0,0x6a5a44,.9);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff2dc,1.7);sun.castShadow=true;const SM=mob?1024:2048;sun.shadow.mapSize.set(SM,SM);Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:280});sun.shadow.bias=-.0006;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
scene.fog=new THREE.Fog(0xb8c8dc,80,400);scene.background=new THREE.Color(0xb8c8dc);

/* ---------- textures ---------- */
function shadeHex(h,a){const n=parseInt(h.slice(1),16);const f=v=>cl(Math.round(a<0?v*(1+a):v+(255-v)*a),0,255);return`rgb(${f(n>>16)},${f(n>>8&255)},${f(n&255)})`}
function ctex(w,h,draw,rep=true){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);if(rep)t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t}
function bricks(g,w,h,base,mortar,vr,rows){g.fillStyle=mortar;g.fillRect(0,0,w,h);const bh=h/rows,bw=bh*2.1;for(let r=0;r<rows;r++)for(let x=-(r%2)*bw/2;x<w;x+=bw){g.fillStyle=shadeHex(base,(R()-.5)*vr);g.fillRect(x+1,r*bh+1,bw-2,bh-1.5)}}
function sash(g,x,y,w,h,frame,lit){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x-3,y-3,w+6,h+8);g.fillStyle=frame;g.fillRect(x-2,y-2,w+4,h+4);
  const gr=g.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,lit?'#ffd890':'#2a3448');gr.addColorStop(.5,lit?'#f0b860':'#46566e');gr.addColorStop(1,lit?'#d89040':'#1e2636');g.fillStyle=gr;g.fillRect(x,y,w,h);
  g.fillStyle=frame;g.fillRect(x,y+h/2-2,w,4);g.fillRect(x+w/2-1.5,y,3,h);if(!lit){g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.moveTo(x+4,y+h/2-4);g.lineTo(x+w*.45,y+4);g.lineTo(x+w*.6,y+4);g.lineTo(x+10,y+h/2-4);g.fill()}}
function wallTex(kind,lit){if(kind=='ware')return wareTex(lit);return ctex(256,256,(g,w,h)=>{
  if(kind=='stock'){bricks(g,w,h,'#b89a68','#d8ccb0',.18,26);g.fillStyle='#e8e0d0';g.fillRect(76,34,104,10);sash(g,82,48,92,150,'#f2efe6',lit);g.fillStyle='#e8e0d0';g.fillRect(72,204,112,8)}
  if(kind=='red'){bricks(g,w,h,'#9a4a34','#c8b8a0',.2,26);g.fillStyle='#d8d0c0';g.fillRect(74,40,108,8);sash(g,82,52,92,140,'#f0ece2',lit)}
  if(kind=='ware'){bricks(g,w,h,'#6a3426','#8a7a6a',.25,26);g.fillStyle='#3a1a14';g.beginPath();g.moveTo(64,200);g.lineTo(64,96);g.arc(128,96,64,PI,0);g.lineTo(192,200);g.fill();sash(g,72,96,112,100,'#2a2420',lit);g.fillStyle='#2a2420';g.fillRect(72,140,112,4)}
  if(kind=='flats'){bricks(g,w,h,'#7a5440','#a89480',.15,26);g.fillStyle='#e6e2da';g.fillRect(0,206,w,26);g.fillStyle='#c8c4bc';g.fillRect(0,228,w,4);sash(g,40,60,176,120,'#e8e8e8',lit)}
  if(kind=='modern'){g.fillStyle='#5a6a7a';g.fillRect(0,0,w,h);const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,lit?'#f0d090':'#7a9ab8');gr.addColorStop(1,lit?'#c09050':'#34465a');g.fillStyle=gr;g.fillRect(6,10,w-12,h-26);g.fillStyle='#c8d0d8';g.fillRect(0,h-16,w,16);g.fillRect(w/2-3,0,6,h);if(!lit){g.fillStyle='rgba(255,255,255,.15)';g.fillRect(20,20,60,180)}}
  if(kind=='modr'){g.fillStyle='#ecebe6';g.fillRect(0,0,w,h);g.fillStyle=lit?'#ffd890':'#3a4654';g.fillRect(20,56,150,120);g.fillStyle='#d8d8d4';g.fillRect(20,170,216,10);g.fillStyle='rgba(180,200,210,.55)';g.fillRect(20,140,216,30);g.fillStyle='#2a2e34';g.fillRect(20,140,216,3);for(let x=20;x<=236;x+=27)g.fillRect(x,140,2,30);g.fillStyle=lit?'#ffd890':'#3a4654';g.fillRect(190,56,46,84);g.fillStyle='#ffffff30';g.fillRect(26,62,40,60)}
  if(kind=='clad'){g.fillStyle='#8c9096';g.fillRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.12)';for(let x=0;x<w;x+=16)g.fillRect(x,0,2,h);g.fillStyle=lit?'#ffd890':'#2e3844';g.fillRect(28,48,92,130);g.fillRect(150,48,80,130);g.fillStyle='rgba(200,220,230,.4)';g.fillRect(140,150,104,30);g.fillStyle='#d0d4d8';g.fillRect(136,180,112,8);g.fillStyle='#ffffff28';g.fillRect(32,52,30,70)}
  if(kind=='paint'){const pc=['#ece4d2','#f2eee4','#e4dccb','#dfe6e4'][R()*4|0];g.fillStyle=pc;g.fillRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.06)';for(let y=0;y<h;y+=32)g.fillRect(0,y,w,2);g.fillStyle='#f8f6f0';g.fillRect(70,34,116,12);sash(g,82,50,92,148,'#ffffff',lit);g.fillStyle='#f8f6f0';g.fillRect(72,204,112,10)}
  if(kind=='alaska'){g.fillStyle='#f2f0ea';g.fillRect(0,0,w,h);g.fillStyle='#dcd8ce';g.fillRect(0,30,w,8);g.fillRect(0,196,w,6);
    g.fillStyle=lit?'#ffd890':'#3a4450';g.fillRect(10,44,236,148);g.fillStyle='#2a2e34';for(let x=10;x<=246;x+=19.6)g.fillRect(x-1,44,2.4,148);for(let y=44;y<=192;y+=24.6)g.fillRect(10,y-1,236,2.4);g.fillRect(10,104,236,4);
    if(!lit){g.fillStyle='rgba(255,255,255,.12)';g.fillRect(14,48,60,52)}g.fillStyle='#e6e2d8';for(let k=0;k<3;k++)g.fillRect(0,206+k*12,w,5)}
  if(kind=='jchurch'){bricks(g,w,h,'#b89a68','#d8ccb0',.16,40);g.fillStyle='#e0cf9a';g.fillRect(0,124,w,8);g.fillRect(0,0,w,6);
    for(const [y0,hh] of [[150,90],[20,92]]){g.fillStyle='#e0cf9a';g.beginPath();g.moveTo(86,y0+hh);g.lineTo(86,y0+42);g.arc(128,y0+42,42,PI,0);g.lineTo(170,y0+hh);g.fill();g.fillStyle=lit?'#ffd890':'#34404e';g.beginPath();g.moveTo(94,y0+hh-4);g.lineTo(94,y0+42);g.arc(128,y0+42,34,PI,0);g.lineTo(162,y0+hh-4);g.fill();
      g.fillStyle='#e8e4dc';for(let x=104;x<160;x+=12)g.fillRect(x,y0+12,1.5,hh-16);for(let y=y0+30;y<y0+hh;y+=14)g.fillRect(94,y,68,1.5)}}
  if(kind=='lib'){bricks(g,w,h,'#a04a34','#cdb8a0',.16,26);g.fillStyle='#e6dcc4';g.fillRect(0,0,w,14);g.fillRect(0,236,w,20);g.fillRect(20,0,22,h);g.fillRect(214,0,22,h);
    g.fillStyle='#e6dcc4';g.beginPath();g.moveTo(70,206);g.lineTo(70,92);g.arc(128,92,58,PI,0);g.lineTo(186,206);g.fill();sash(g,80,96,96,104,'#f0ece2',lit);g.fillStyle='#e6dcc4';g.fillRect(120,30,16,22);g.fillRect(64,204,128,10)}
  if(kind=='ftm'){g.fillStyle='#fbb03a';g.fillRect(0,0,w,h);g.fillStyle='rgba(120,60,0,.08)';for(let i=0;i<40;i++)g.fillRect(Math.random()*w,Math.random()*h,30,2);g.fillStyle='#e8b040';g.fillRect(104,96,48,56);g.fillStyle=lit?'#ffd890':'#3a4450';g.fillRect(110,102,36,44)}
  if(kind=='white'){g.fillStyle='#ecece6';g.fillRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.05)';for(let y=0;y<h;y+=64)g.fillRect(0,y,w,2)}
  if(kind=='church'){g.fillStyle='#b8b0a0';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=32){g.fillStyle='rgba(0,0,0,.12)';g.fillRect(0,y,w,2);for(let x=(y/32%2)*40;x<w;x+=80)g.fillRect(x,y,2,32)}g.fillStyle='#3a3a48';g.beginPath();g.moveTo(90,220);g.lineTo(90,90);g.arc(128,90,38,PI,0);g.lineTo(166,220);g.fill()}
})}
function wareTex(lit){return ctex(512,256,(g,w,h)=>{bricks(g,w,h,'#7a4430','#94826e',.22,26);
  g.fillStyle='#3a1a14';g.beginPath();g.moveTo(64,206);g.lineTo(64,100);g.arc(128,100,64,PI,0);g.lineTo(192,206);g.fill();sash(g,72,100,112,104,'#2a2420',lit);g.fillStyle='#c8bca8';g.fillRect(56,208,144,10);
  const dc=['#1f4a3a','#1e3a5a','#5a1a1a','#2a2a30'][R()*4|0];g.fillStyle='#e8e2d4';g.fillRect(318,26,132,214);g.fillStyle=dc;g.fillRect(330,38,108,202);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(382,38,4,202);for(let y=60;y<240;y+=40){g.fillRect(338,y,36,2);g.fillRect(394,y,36,2)}
  g.fillStyle='#e8e2d4';g.fillRect(306,226,156,14);g.fillStyle='#2a2a2a';g.fillRect(372,4,24,18);if(lit){g.fillStyle='#ffd890';g.fillRect(372,120,12,40)}})}
function groundTex(kind){return ctex(512,256,(g,w,h)=>{
  if(kind=='paint'){g.fillStyle='#ece6d6';g.fillRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.08)';for(let y=0;y<h;y+=22)g.fillRect(0,y,w,2);for(let i=0;i<2;i++){const x=i*256,dc=['#1a1a1a','#1e3a6a','#7a1a22','#1f5a3a','#2a2a30','#3a6a8a'][R()*6|0];
    g.fillStyle='#f8f6f0';g.fillRect(x+28,34,80,222);g.fillStyle=dc;g.fillRect(x+40,86,56,170);g.fillStyle='#d8c890';g.beginPath();g.arc(x+68,82,30,PI,0);g.fill();g.fillStyle='rgba(0,0,0,.22)';for(const [px,py,ph] of [[46,98,62],[72,98,62],[46,170,76],[72,170,76]])g.fillRect(x+px,py,18,ph);sash(g,x+144,58,88,130,'#ffffff',false)}return}
  if(kind=='ware'){bricks(g,w,h,'#5a2e22','#80705e',.22,22);g.fillStyle='#2a1a14';g.beginPath();g.moveTo(40,h);g.lineTo(40,120);g.arc(130,120,90,PI,0);g.lineTo(220,h);g.fill();g.fillStyle=['#1f4a3a','#1e3a5a','#2a2a30'][R()*3|0];g.fillRect(52,130,156,126);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(128,130,4,126);sash(g,320,70,110,120,'#2a2420',false);return}
  const stock=kind=='stock';bricks(g,w,h,stock?'#b89a68':'#9a4a34',stock?'#d8ccb0':'#c8b8a0',.18,22);
  for(let i=0;i<2;i++){const x=i*256,dc=['#1a1a1a','#1e3a6a','#7a1a22','#1f5a3a','#2a2a30','#4a2a5a','#b89020','#3a6a8a'][R()*8|0];
    g.fillStyle='#ece6d8';g.fillRect(x+28,34,80,222);g.fillStyle='#d8c890';g.beginPath();g.arc(x+68,82,30,PI,0);g.fill();g.fillStyle='#ece6d8';g.fillRect(x+38,80,60,6);
    g.fillStyle=dc;g.fillRect(x+40,86,56,170);g.fillStyle='rgba(0,0,0,.22)';for(const [px,py,ph] of [[46,98,62],[72,98,62],[46,170,76],[72,170,76]])g.fillRect(x+px,py,18,ph);g.fillStyle='#e0c060';g.fillRect(x+66,150,5,5);
    g.fillStyle='#d8d4cc';g.fillRect(x+22,244,92,12);sash(g,x+144,58,88,130,'#f2efe6',false);g.fillStyle='#e8e0d0';g.fillRect(x+136,194,104,10)}})}
const shopTexs=[0,1,2,3].map(v=>ctex(2048,128,(g,w,h)=>{const cols=['#1f5a3a','#2a2a3a','#7a2030','#1f3a6a','#c88a20','#3a6a6a','#e8e4dc','#d8202a','#2a8ab0','#5a2a6a','#f0c030','#14141a'];const R0=R,lr=(()=>{let q=v*7919+101;return()=>(q=(q*16807)%2147483647)/2147483647})();/* 8 shop units per tile; units 3-8 use a local PRNG so the global stream is unchanged */for(let i=0;i<8;i++){const R=i<2?R0:lr,x=i*256,fc=cols[(R()*cols.length)|0];
  g.fillStyle='#d8d0c0';g.fillRect(x,0,256,h);g.fillStyle=fc;g.fillRect(x+4,4,248,28);const light=['#e8e4dc','#f0c030'].includes(fc);g.fillStyle=light?'rgba(20,20,30,.85)':'rgba(255,255,255,.88)';{const nm=['CAFE','NEWS & WINE','BARBERS','LAUNDERETTE','CHEMIST','BAKERY','FISH BAR','DRY CLEANERS','FLORIST','GROCERS','DELI','KEY CUTTING','HARDWARE','PHONE REPAIRS','OFF LICENCE','CHICKEN & CHIPS'][(R()*16)|0];g.font='bold 20px Arial, Helvetica, sans-serif';g.textAlign='center';g.textBaseline='middle';const tw=g.measureText(nm).width;g.save();g.translate(x+128,18);if(tw>232)g.scale(232/tw,1);g.fillText(nm,0,1);g.restore();g.textAlign='start';g.textBaseline='alphabetic'}/* real generic shop names instead of placeholder white squares */
  if((v+i)%4==3&&R()<.7){g.fillStyle='#7a7c80';g.fillRect(x+6,34,244,94);g.fillStyle='rgba(0,0,0,.25)';for(let y=38;y<128;y+=6)g.fillRect(x+6,y,244,2);g.fillStyle=['#e0508a','#3ac0d0','#f0c030'][R()*3|0];g.globalAlpha=.6;g.fillRect(x+40+R()*80,70,70,24);g.globalAlpha=1;continue}
  const gr=g.createLinearGradient(0,34,0,128);gr.addColorStop(0,'#2a3a4a');gr.addColorStop(1,'#5a6a78');g.fillStyle=gr;g.fillRect(x+10,36,170,90);g.fillStyle=['#e8c070','#f0e0c0','#c8e0f0'][R()*3|0];g.globalAlpha=.55;g.fillRect(x+16,48,158,70);g.globalAlpha=1;
  g.fillStyle=fc;g.fillRect(x+10,36,170,4);g.fillRect(x+92,36,4,90);g.fillStyle='#1a1a20';g.fillRect(x+190,36,56,92);g.fillStyle='rgba(255,255,255,.4)';g.fillRect(x+196,44,44,30);g.fillStyle='#ffffff30';g.fillRect(x+14,40,30,80);g.fillStyle='#2a2a2a';g.fillRect(x+6,122,244,6)}}));
const shopTex=shopTexs[0];

const roofFlat=ctex(128,128,(g,w,h)=>{g.fillStyle='#7a7a80';g.fillRect(0,0,w,h);for(let i=0;i<1400;i++){g.fillStyle=`rgba(${R()<.5?0:255},${R()<.5?0:255},${R()<.5?0:255},.08)`;g.fillRect(R()*w,R()*h,2,2)}});
const roofSlate=ctex(128,128,(g,w,h)=>{g.fillStyle='#606672';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=8)for(let x=-(y/8%2)*8;x<w;x+=16){g.fillStyle=shadeHex('#626874',(R()-.5)*.25);g.fillRect(x+1,y+1,14,6)}});
const asphalt=ctex(256,256,(g,w,h)=>{g.fillStyle='#46484e';g.fillRect(0,0,w,h);for(let i=0;i<6000;i++){const v=R()*50|0;g.fillStyle=`rgba(${v},${v},${v+5},.25)`;g.fillRect(R()*w,R()*h,1.5,1.5)}for(let i=0;i<4;i++){g.strokeStyle='rgba(20,20,24,.35)';g.lineWidth=1;g.beginPath();let x=R()*w,y=R()*h;g.moveTo(x,y);for(let k=0;k<6;k++){x+=(R()-.5)*40;y+=(R()-.5)*40;g.lineTo(x,y)}g.stroke()}});
const paving=ctex(256,256,(g,w,h)=>{g.fillStyle='#a8a49c';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=32)for(let x=0;x<w;x+=32){g.fillStyle=shadeHex('#aca89f',(R()-.5)*.08);g.fillRect(x+1,y+1,30,30)}for(let i=0;i<20;i++){g.fillStyle='rgba(40,40,40,.12)';g.beginPath();g.arc(R()*w,R()*h,R()*3+1,0,7);g.fill()}});
const plazaT=ctex(256,256,(g,w,h)=>{g.fillStyle='#8e8c88';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=16)for(let x=-(y/16%2)*16;x<w;x+=32){const r=R();g.fillStyle=shadeHex(r<.08?'#8a7a6a':r<.16?'#7a7c80':'#a8a6a0',(R()-.5)*.16);g.fillRect(x+1,y+1,30,14)}for(let i=0;i<14;i++){g.fillStyle='rgba(40,40,36,.08)';g.beginPath();g.ellipse(R()*w,R()*h,8+R()*20,5+R()*12,R()*3,0,7);g.fill()}});
const grass=ctex(256,256,(g,w,h)=>{g.fillStyle='#6a8c50';g.fillRect(0,0,w,h);for(let i=0;i<9000;i++){g.fillStyle=R()<.5?'rgba(106,140,76,.5)':R()<.5?'rgba(66,92,46,.4)':'rgba(128,128,86,.3)';g.fillRect(R()*w,R()*h,1,3)}});
const waterT=ctex(256,256,(g,w,h)=>{g.fillStyle='#3a5a74';g.fillRect(0,0,w,h);for(let i=0;i<260;i++){g.fillStyle=R()<.5?'rgba(140,180,210,.25)':'rgba(20,40,60,.25)';g.fillRect(R()*w,R()*h,8+R()*24,1.5)}});
/* park ponds: soft green-grey water with sky glints (local PRNG, so the global random stream is unchanged) */
const pondT=ctex(256,256,(g,w,h)=>{let q=91;const r=()=>(q=(q*16807)%2147483647)/2147483647;g.fillStyle='#7a9690';g.fillRect(0,0,w,h);for(let i=0;i<220;i++){g.fillStyle=r()<.55?'rgba(214,230,236,.3)':'rgba(52,78,70,.2)';g.fillRect(r()*w,r()*h,6+r()*16,1.2)}});
const ballast=ctex(128,128,(g,w,h)=>{g.fillStyle='#7a726a';g.fillRect(0,0,w,h);for(let i=0;i<2500;i++){g.fillStyle=`rgba(${R()*90|0},${R()*80|0},${R()*70|0},.35)`;g.fillRect(R()*w,R()*h,2,2)}for(let y=0;y<h;y+=10){g.fillStyle='#4a3a2e';g.fillRect(20,y,88,4)}g.fillStyle='#c8c8d0';g.fillRect(36,0,4,h);g.fillRect(88,0,4,h)});
const arches=ctex(1024,256,(g,w,h)=>{bricks(g,w,h,'#7a3a2a','#9a8a78',.22,30);for(let i=0;i<4;i++){const x=i*256,ap=()=>{g.beginPath();g.moveTo(x+40,h);g.lineTo(x+40,110);g.arc(x+128,110,88,PI,0);g.lineTo(x+216,h);g.closePath()};
  g.strokeStyle='#b08a6a';g.lineWidth=8;ap();g.stroke();g.save();ap();g.clip();
  if(i==0){g.fillStyle='#7a7c80';g.fillRect(x,0,256,h);g.fillStyle='rgba(0,0,0,.25)';for(let y=60;y<h;y+=7)g.fillRect(x,y,256,2);g.strokeStyle=['#c86a8a','#5aa0b0','#c8a850'][R()*3|0];g.globalAlpha=.45;g.lineWidth=5;g.beginPath();for(let k=0;k<5;k++){const qx=x+70+k*22;g.moveTo(qx,200);g.quadraticCurveTo(qx+10,165+(k%2)*12,qx+18,196)}g.stroke();g.globalAlpha=1}
  if(i==1){g.fillStyle='#1a2430';g.fillRect(x,0,256,h);g.fillStyle='#e8b060';g.globalAlpha=.55;g.fillRect(x+50,120,156,136);g.globalAlpha=1;g.fillStyle='#2a2a30';for(let k=0;k<4;k++)g.fillRect(x+40+k*48,20,6,h);g.fillRect(x,110,256,6);g.fillStyle='#1f5a3a';g.fillRect(x+60,70,136,28)}
  if(i==2){g.fillStyle='#24503a';g.fillRect(x,0,256,h);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x+126,0,4,h);for(let y=40;y<h;y+=24)g.fillRect(x,y,256,2);g.fillStyle='#d8c070';g.fillRect(x+136,170,6,10)}
  if(i==3){g.fillStyle='#2a1a14';g.fillRect(x,0,256,h);g.fillStyle='#f0a050';g.globalAlpha=.5;g.fillRect(x+40,100,176,156);g.globalAlpha=1;for(let k=0;k<9;k++){g.fillStyle='#ffe0a0';g.beginPath();g.arc(x+56+k*18,70+Math.sin(k)*8,4,0,7);g.fill()}g.fillStyle='#5a3a24';g.fillRect(x+60,200,136,12);g.fillRect(x+70,212,8,44);g.fillRect(x+178,212,8,44)}
  g.restore()}});
const bikeT=ctex(128,128,(g)=>{g.clearRect(0,0,128,128);g.strokeStyle='#f4f2ea';g.lineWidth=7;g.beginPath();g.arc(34,84,22,0,7);g.stroke();g.beginPath();g.arc(94,84,22,0,7);g.stroke();g.beginPath();g.moveTo(34,84);g.lineTo(58,50);g.lineTo(86,50);g.lineTo(94,84);g.moveTo(58,50);g.lineTo(66,84);g.lineTo(86,50);g.moveTo(52,40);g.lineTo(66,40);g.moveTo(86,50);g.lineTo(82,36);g.lineTo(92,34);g.stroke()},false);
const busT=ctex(256,64,(g)=>{g.clearRect(0,0,256,64);g.fillStyle='#f4f2ea';g.font='900 46px Arial, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('BUS LANE',128,34)},false);
const railT=ctex(128,64,(g)=>{g.clearRect(0,0,128,64);g.fillStyle='#14161a';g.fillRect(0,2,128,4);g.fillRect(0,54,128,5);for(let x=2;x<128;x+=9){g.fillRect(x,2,3,58);g.beginPath();g.moveTo(x-2,4);g.lineTo(x+1.5,-4);g.lineTo(x+5,4);g.fill()}},true);
const cobT=ctex(256,256,(g,w,h)=>{g.fillStyle='#4a4640';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=14)for(let x=-(y/14%2)*10;x<w;x+=20){g.fillStyle=shadeHex('#8a8278',(R()-.5)*.3);g.beginPath();g.roundRect(x+1.5,y+1.5,17,11,4);g.fill()}});cobT.repeat.set(2.6,2.6);
const dash=ctex(64,16,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#f4f2ea';g.fillRect(0,0,w*.55,h)});
const M=o=>new THREE.MeshLambertMaterial(o),M2=o=>M({...o,side:THREE.DoubleSide}),PO=n=>({polygonOffset:true,polygonOffsetFactor:n,polygonOffsetUnits:n});
// night windows: only the window panes glow (not the brick), and each window is on or off and warm or cool at random
function litWindows(sh){sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;float gP=0.0;').replace('#include <map_fragment>',`#include <map_fragment>
    {vec4 lc=texture2D(emissiveMap,vEmissiveMapUv),oc=texture2D(map,vMapUv);float w=smoothstep(.12,.35,length(lc.rgb-oc.rgb));
     float cl=floor(vMapUv.x+.001)*17.0+floor(vMapUv.y+.001)*131.0+floor(vWP.x*.013)*7.0+floor(vWP.z*.013)*3.0;float r=fract(sin(cl*39.346)*11.135*1000.0),r2=fract(sin(cl*7.13)*5713.1);
     vec3 cur=r2<.4?vec3(.86,.83,.76):r2<.55?vec3(.95,.95,.93):r2<.7?vec3(.55,.62,.72):r2<.82?vec3(.72,.38,.34):vec3(.52,.6,.44);
     float fy=fract(vMapUv.y*1.0);float bt=.45+.3*fract(r2*91.7);float bl=step(bt,fy)*(.9+.1*step(.5,fract(fy*48.0)))*(.65+.35*smoothstep(bt,bt+.012,fy));diffuseColor.rgb=mix(diffuseColor.rgb,cur,w*step(r,.38)*bl*.85);
     /* window-sill life: a pot plant (sometimes flowering) in about a quarter of the unblinded panes; height above the pane bottom found by marching down the window mask */
     float pr=fract(sin(cl*91.7)*3317.3);gP=0.0;
     if(w>.5&&r>=.38&&pr<.28){float hb=.22;for(int k=1;k<19;k++){vec2 q=vMapUv-vec2(0.0,float(k)*.012);float m=smoothstep(.12,.35,length(texture2D(emissiveMap,q).rgb-texture2D(map,q).rgb));if(m<.5){hb=float(k-1)*.012;break;}}
      float fx=fract(vMapUv.x),pcx=.5+(pr-.14)*.35,pd=abs(fx-pcx);
      if(hb<.04){if(pd<.05*(1.0-hb*4.0)){diffuseColor.rgb=vec3(.62,.32,.2)*(.8+.4*fract(fx*40.0));gP=1.0;}}
      else{float t=clamp((hb-.04)/.17,0.,1.);float rad=(.085*sin(t*3.14)+.012)*(pr<.09?.6:1.0);float jag=.75+.25*sin(hb*130.0+fx*90.0);
       if(pd<rad*jag){vec3 lf=mix(vec3(.12,.36,.14),vec3(.3,.55,.2),fract(sin((floor(hb*40.0)+floor(fx*60.0))*12.9)*43758.5));if(pr<.05&&fract(hb*55.0+fx*37.0)>.88)lf=vec3(.9,.35,.5);else if(pr<.1&&fract(hb*55.0+fx*37.0)>.9)lf=vec3(.95,.85,.3);diffuseColor.rgb=lf;gP=1.0;}}}
    }/* blinds: only pulled part-way down from the top of the pane, with slats, instead of a flat panel over the whole window */`).replace('#include <emissivemap_fragment>',`
    vec4 litC=texture2D(emissiveMap,vEmissiveMapUv);vec4 offC=texture2D(map,vMapUv);float win=smoothstep(.12,.35,length(litC.rgb-offC.rgb));
    float cell=floor(vMapUv.x+.001)*17.0+floor(vMapUv.y+.001)*131.0+floor(vWP.x*.013)*7.0+floor(vWP.z*.013)*3.0;float h=fract(sin(cell*12.9898)*43758.5453),h2=fract(sin(cell*78.233)*24634.6345);
    vec3 tint=h2<.25?vec3(.75,.85,1.0):h2<.35?vec3(1.0,.75,.55):vec3(1.0);totalEmissiveRadiance*=litC.rgb*win*step(h,.42)*tint*(1.0-gP);`)}
const WK=['stock','red','ware','flats','modern','church','lib','ftm','white','alaska','jchurch','paint','modr','clad'],WM={},WMEAN={};
for(const k of WK){const tx=wallTex(k,false);{const c=tx.image,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let r=0,g=0,b=0,n=0;for(let i=0;i<d.length;i+=64){r+=d[i];g+=d[i+1];b+=d[i+2];n++}WMEAN[k]=[r/n,g/n,b/n]}WM[k]=M({vertexColors:true,map:tx,emissiveMap:wallTex(k,true),emissive:0xffffff,emissiveIntensity:0,side:THREE.DoubleSide});WM[k].onBeforeCompile=litWindows}
const MAT={rail:M2({map:railT,transparent:true,alphaTest:.5}),cyc:M2({color:0x56585e,...PO(-1.8)}),cycp:M2({color:0x8c8a84,...PO(-1.8)}),buslane:M2({color:0xa8382e,...PO(-3)}),bike:M2({map:bikeT,transparent:true,alphaTest:.4,...PO(-5)}),bus:M2({map:busT,transparent:true,alphaTest:.4,...PO(-5)}),gdoorS:M2({vertexColors:true,map:groundTex('stock')}),gdoorR:M2({vertexColors:true,map:groundTex('red')}),wground:M2({map:groundTex('ware')}),cobble:M2({map:cobT,...PO(-2.2)}),shop:M2({map:shopTex}),shop1:M2({map:shopTexs[1]}),shop2:M2({map:shopTexs[2]}),shop3:M2({map:shopTexs[3]}),gpaint:M2({vertexColors:true,map:groundTex('paint')}),roofF:M2({map:roofFlat}),roofS:M2({map:roofSlate}),road:M2({map:asphalt,...PO(-2)}),pave:M({map:paving}),plaza:M2({map:plazaT,...PO(-1)}),grass:M2({map:grass,...PO(-1)}),play:M2({color:0x3a7a6a,...PO(-7)}),lawn:M2({map:grass,color:0xe0ecd0,...PO(-.6)})/* estate lawns: lifted from 0x9cae88, then 0xb2c49c, so they read green, not olive-black, from the air and at golden hour */,
  path:M2({color:0xb8b2a2,...PO(-1.5)}),line:M2({map:dash,transparent:true,...PO(-4)}),yel:M2({color:0xe8c040,...PO(-4)}),red:M2({color:0xc82828,...PO(-4)}),kerb:M2({color:0xd4d0c6,...PO(-3)}),
  water:(()=>{const m=new THREE.MeshPhongMaterial({map:waterT,color:0xb0c8e0,shininess:90,specular:0x8090a0,side:THREE.DoubleSide,...PO(-2.5)});m.userData.noTerrain=true;return m})(),quay:M2({color:0x8a8478,...PO(-3.5)}),pond:new THREE.MeshPhongMaterial({map:pondT,color:0xe6eef0,shininess:70,specular:0x8a9aa0,side:THREE.DoubleSide,...PO(-2.5)}),
  ballast:M({map:ballast}),arch:M2({map:arches}),under:M2({color:0x8a8078,emissive:0x2e2a26,side:THREE.DoubleSide}),vc:M({vertexColors:true}),
  lampOn:M({color:0x333333,emissive:0xffc070,emissiveIntensity:0}),hl:M({color:0xfff4c8,emissive:0xfff0c0,emissiveIntensity:.3}),tl:M({color:0xc01818,emissive:0xff2020,emissiveIntensity:.4})};

/* ---------- geometry builders ---------- */
// Geometry collectors: plain JS arrays cost 8 bytes a number and peaked near 640 MB on phones; these keep 4 bytes in a growing Float32Array.
class FA{constructor(){this.a=new Float32Array(4096);this.length=0}push(...v){const n=v.length;if(this.length+n>this.a.length){const b=new Float32Array(Math.max(this.a.length*2,this.length+n));b.set(this.a.subarray(0,this.length));this.a=b}const a=this.a;let l=this.length;for(let i=0;i<n;i++)a[l++]=v[i];this.length=l;return l}done(){return this.a.subarray(0,this.length)}}
const F32=x=>x&&x.done?x.done():x;
const GB=()=>({p:new FA,n:new FA,u:new FA,c:new FA});let TINT=[1,1,1];
function tri(G,a,b,c,n,ua,ub,uc){G.p.push(...a,...b,...c);G.n.push(...n,...n,...n);G.u.push(...ua,...ub,...uc);G.c.push(...TINT,...TINT,...TINT)}
function quad(G,a,b,c,d,n,u0,u1,v0,v1){tri(G,a,b,c,n,[u0,v0],[u1,v0],[u1,v1]);tri(G,a,c,d,n,[u0,v0],[u1,v1],[u0,v1])}
function mesh(G,mat,shadow=true,recv=true){if(!G.p.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(F32(G.p),3));g.setAttribute('normal',new THREE.Float32BufferAttribute(F32(G.n),3));g.setAttribute('uv',new THREE.Float32BufferAttribute(F32(G.u),2));if(mat.vertexColors&&G.c.length==G.p.length)g.setAttribute('color',new THREE.Float32BufferAttribute(F32(G.c),3));g.computeBoundingSphere();/* static world: once the GPU has the data, drop the CPU copy (about half of ~250 MB of vertices); iPhones kill the tab near 1 GB */for(const k in g.attributes)g.attributes[k].onUpload(function(){this.array=null});const m=new THREE.Mesh(g,mat);m.castShadow=shadow;m.receiveShadow=recv;m.matrixAutoUpdate=false;scene.add(m);return m}
/* ground decals (grass, water, paths, roads and markings) must follow the same terrain as the ground: it only lifts vertices, so a big flat triangle sank under it wherever the land rose between its corners (the park lake vanished). Split any triangle that strays more than its layer tolerance from the terrain. */
/* per layer: [how far a decal may sink below the terrain, how far it may float above it], in metres; lower layers are held tight so they never poke through the ones on top */
const DTOL={lawn:[.011,.024],grass:[.015,.014],plaza:[.019,.02],pond:[.008,.05],path:[.013,.07],cyc:[.018,.07],cycp:[.018,.07],road:[.022,.07],cobble:[.022,.07],quay:[.12,.8]};
function drape(G,[dn,up]){if(!TERR.has)return G;const O=GB(),P=F32(G.p),N=F32(G.n),U=F32(G.u),C=F32(G.c);
  const V=i=>[P[i*3],P[i*3+1],P[i*3+2],N[i*3],N[i*3+1],N[i*3+2],U[i*2],U[i*2+1],C[i*3],C[i*3+1],C[i*3+2],TH(P[i*3],P[i*3+2])];
  const put=v=>{O.p.push(v[0],v[1],v[2]);O.n.push(v[3],v[4],v[5]);O.u.push(v[6],v[7]);O.c.push(v[8],v[9],v[10])};
  const cut=(a,b,c,d)=>{const ab=hyp(b[0]-a[0],b[2]-a[2]),bc=hyp(c[0]-b[0],c[2]-b[2]),ca=hyp(a[0]-c[0],a[2]-c[2]),L=Math.max(ab,bc,ca);
    if(L>2.5&&d<24){const n=Math.min(10,Math.max(2,Math.ceil(L/3)));let bad=false;/* below 5 m, only keep splitting where the miss is still large (steep banks) */const k=L>5?1:0;for(let i=0;i<=n&&!bad;i++)for(let j=0;j<=n-i;j++){const s=i/n,t=j/n,r=1-s-t;const e=TH(a[0]*r+b[0]*s+c[0]*t,a[2]*r+b[2]*s+c[2]*t)-(a[11]*r+b[11]*s+c[11]*t);if(k?e>dn||-e>up:e>.2){bad=true;break}}
      if(bad){if(bc===L){const t=a;a=b;b=c;c=t}else if(ca===L){const t=c;c=b;b=a;a=t}/* a-b is now the longest side */const m=a.map((x,k)=>(x+b[k])/2);m[11]=TH(m[0],m[2]);cut(a,m,c,d+1);cut(m,b,c,d+1);return}}
    put(a);put(b);put(c)};
  for(let i=0,n=G.p.length/3;i<n;i+=3)cut(V(i),V(i+1),V(i+2),0);return O}
const pl2=f=>{const o=[];for(let i=0;i<f.length;i+=2)o.push([f[i]*K,f[i+1]*K]);return o};
function inPoly(x,z,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,zi]=P[i],[xj,zj]=P[j];if((zi>z)!=(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c}return c}
function flat(G,P,y,s){const v=P.map(p=>new THREE.Vector2(p[0],p[1]));let t;try{t=THREE.ShapeUtils.triangulateShape(v,[])}catch(e){return}for(const [a,b,c] of t)tri(G,[P[a][0],y,P[a][1]],[P[c][0],y,P[c][1]],[P[b][0],y,P[b][1]],[0,1,0],[P[a][0]/s,P[a][1]/s],[P[c][0]/s,P[c][1]/s],[P[b][0]/s,P[b][1]/s])}
function ribbon(G,pts,w,y,us,caps){let acc=0;for(let i=0;i<pts.length-1;i++){const [x0,z0]=pts[i],[x1,z1]=pts[i+1],dx=x1-x0,dz=z1-z0,L=hyp(dx,dz);if(L<.01)continue;const nx=-dz/L*w/2,nz=dx/L*w/2;
    const a=[x0+nx,y,z0+nz],b=[x1+nx,y,z1+nz],c=[x1-nx,y,z1-nz],d=[x0-nx,y,z0-nz];
    if(us)quad(G,a,b,c,d,[0,1,0],acc/us,(acc+L)/us,0,1);else{tri(G,a,b,c,[0,1,0],[a[0]/8,a[2]/8],[b[0]/8,b[2]/8],[c[0]/8,c[2]/8]);tri(G,a,c,d,[0,1,0],[a[0]/8,a[2]/8],[c[0]/8,c[2]/8],[d[0]/8,d[2]/8])}acc+=L}
  if(caps)for(const [x,z] of pts){const r=w/2;for(let k=0;k<10;k++){const a0=k/10*PI*2,a1=(k+1)/10*PI*2,p0=[x+Math.cos(a0)*r,y,z+Math.sin(a0)*r],p1=[x+Math.cos(a1)*r,y,z+Math.sin(a1)*r];tri(G,[x,y,z],p1,p0,[0,1,0],[x/8,z/8],[p1[0]/8,p1[2]/8],[p0[0]/8,p0[2]/8])}}}
function offsetLine(pts,o){return pts.map((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],L=hyp(dx,dz)||1;return[p[0]-dz/L*o,p[1]+dx/L*o]})}
// vertex-coloured boxes and prisms, for vehicles, people and street furniture
const VB=()=>({p:new FA,n:new FA,c:new FA});
const FACES=[[[1,0,0],[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]],[[-1,0,0],[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]],[[0,1,0],[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]],[[0,-1,0],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]],[[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],[[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]]];
const _c=new THREE.Color();
function addBox(V,w,h,d,x,y,z,col,ry=0){_c.set(col);const cs=Math.cos(ry),sn=Math.sin(ry),T=(px,py,pz)=>[x+px*cs+pz*sn,y+py,z-px*sn+pz*cs],N=(px,py,pz)=>[px*cs+pz*sn,py,-px*sn+pz*cs];
  for(const [n,cs4] of FACES){const v=cs4.map(q=>T(q[0]*w/2,q[1]*h/2,q[2]*d/2)),nn=N(...n);for(const i of [0,1,2,0,2,3]){V.p.push(...v[i]);V.n.push(...nn);V.c.push(_c.r,_c.g,_c.b)}}}
// tapered block: bottom rect [bx0..bx1]x[-bw/2..bw/2] at y0, top rect [tx0..tx1]x[-tw/2..tw/2] at y1
function addFrustum(V,bx0,bx1,bw,y0,tx0,tx1,tw,y1,col){_c.set(col);const P=[[bx0,y0,-bw/2],[bx1,y0,-bw/2],[bx1,y0,bw/2],[bx0,y0,bw/2],[tx0,y1,-tw/2],[tx1,y1,-tw/2],[tx1,y1,tw/2],[tx0,y1,tw/2]],C=[0,1,2].map(k=>P.reduce((a,p)=>a+p[k],0)/8);
  for(const f of [[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]){let q=f.map(i=>P[i]);const u=q[1].map((v,k)=>v-q[0][k]),w=q[2].map((v,k)=>v-q[0][k]);let n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];const fc=[0,1,2].map(k=>q.reduce((a,p)=>a+p[k],0)/4);
    if(n[0]*(fc[0]-C[0])+n[1]*(fc[1]-C[1])+n[2]*(fc[2]-C[2])<0){q=q.reverse();n=n.map(v=>-v)}const ln=Math.hypot(...n)||1;n=n.map(v=>v/ln);for(const i of [0,1,2,0,2,3]){V.p.push(...q[i]);V.n.push(...n);V.c.push(_c.r,_c.g,_c.b)}}}
function addWheel(V,r,w,x,y,z,col){_c.set(col);const S=8;for(let i=0;i<S;i++){const a0=i/S*PI*2,a1=(i+1)/S*PI*2,p=(a,s)=>[x+Math.cos(a)*r,y+Math.sin(a)*r,z+s*w/2],n=[Math.cos((a0+a1)/2),Math.sin((a0+a1)/2),0];
  const q=[p(a0,-1),p(a1,-1),p(a1,1),p(a0,1)];for(const k of [0,1,2,0,2,3]){V.p.push(...q[k]);V.n.push(...n);V.c.push(_c.r,_c.g,_c.b)}
  for(const s of [1,-1]){const c0=[x,y,z+s*w/2],a=p(a0,s),b=p(a1,s),tr=s>0?[c0,a,b]:[c0,b,a];for(const v of tr){V.p.push(...v);V.n.push(0,0,s);V.c.push(_c.r*.6,_c.g*.6,_c.b*.6)}}}}
function addCyl(V,r,h,x,y0,z,col,S=10){_c.set(col);for(let i=0;i<S;i++){const a0=i/S*PI*2,a1=(i+1)/S*PI*2,P0=[x+Math.cos(a0)*r,0,z+Math.sin(a0)*r],P1=[x+Math.cos(a1)*r,0,z+Math.sin(a1)*r],n=[Math.cos((a0+a1)/2),0,Math.sin((a0+a1)/2)];
  const q=[[P0[0],y0,P0[2]],[P1[0],y0,P1[2]],[P1[0],y0+h,P1[2]],[P0[0],y0+h,P0[2]]];for(const k of [0,2,1,0,3,2]){V.p.push(...q[k]);V.n.push(...n);V.c.push(_c.r,_c.g,_c.b)}
  for(const v of [[x,y0+h,z],[P1[0],y0+h,P1[2]],[P0[0],y0+h,P0[2]]]){V.p.push(...v);V.n.push(0,1,0);V.c.push(_c.r,_c.g,_c.b)}}}
function vgeo(V){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(F32(V.p),3));g.setAttribute('normal',new THREE.Float32BufferAttribute(F32(V.n),3));g.setAttribute('color',new THREE.Float32BufferAttribute(F32(V.c),3));g.computeBoundingSphere();return g}
function vmesh(V,shadow=true){const m=new THREE.Mesh(vgeo(V),MAT.vc);m.castShadow=shadow;m.receiveShadow=true;return m}

/* ---------- static world ---------- */
function snap(x,y,max){const ok=(X,Y)=>{const t=tAt(X,Y);return(t==0||t==5||t==6)&&!FB[(Y|0)*W+(X|0)]};if(ok(x,y))return[x,y];for(let r=1;r<=max;r+=1)for(let k=0;k<16;k++){const a=k/16*PI*2,X=x+Math.cos(a)*r,Y=y+Math.sin(a)*r;if(ok(X,Y))return[X,Y]}return null}
function toRoad(x,y){let best=null;for(let r=2;r<=16;r+=2){for(let k=0;k<16;k++){const a=k/16*PI*2,t=tAt(x+Math.cos(a)*r,y+Math.sin(a)*r);if(t==1||t==7){best=a;break}}if(best!==null)return best}return null}
const BELMAT2=new THREE.MeshLambertMaterial({color:0x2a5ad8,emissive:0x3a7aff,emissiveIntensity:1});
const BELISHA=[],BELMAT=new THREE.MeshLambertMaterial({color:0xffa020,emissive:0xff9010,emissiveIntensity:.8}),GARD=[],DECKS=[],BALC=[],TBT={},CHIM=[],HOIST=[],TIES=[],MODELLED=new Set(['HMS Belfast','City Hall','Southwark Park Bandstand']);
function obb(P,minR=.8){let area=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];area+=a[0]*b[1]-b[0]*a[1]}area=Math.abs(area)/2;let best=null;
  for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],dx=b[0]-a[0],dz=b[1]-a[1],L=hyp(dx,dz);if(L<1)continue;const ux=dx/L,uz=dz/L,vx=-uz,vz=ux;let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;
    for(const p of P){const u=p[0]*ux+p[1]*uz,v=p[0]*vx+p[1]*vz;if(u<u0)u0=u;if(u>u1)u1=u;if(v<v0)v0=v;if(v>v1)v1=v}const ar=(u1-u0)*(v1-v0);if(!best||ar<best.ar)best={ar,ux,uz,vx,vz,u0,u1,v0,v1}}
  if(!best||area/best.ar<minR)return null;const b=best;if(b.u1-b.u0<b.v1-b.v0)best={ar:b.ar,ux:b.vx,uz:b.vz,vx:-b.ux,vz:-b.uz,u0:b.v0,u1:b.v1,v0:-b.u1,v1:-b.u0};
  const o=.25;best.u0-=o;best.u1+=o;best.v0-=o;best.v1+=o;const w=best.v1-best.v0,ins=Math.min(w/2,(best.u1-best.u0)/2);best.r0=best.u0+ins;best.r1=best.u1-ins;return best}
function face(G,pts){const [a,b,c]=pts,ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let n=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];const l=hyp(...n)||1;n=n.map(v=>v/l);if(n[1]<0)n=n.map(v=>-v);
  const uv=p=>[p[0]/3,p[2]/3+p[1]/3];for(let k=1;k<pts.length-1;k++)tri(G,pts[0],pts[k],pts[k+1],n,uv(pts[0]),uv(pts[k]),uv(pts[k+1]))}
function hipRoof(G,o,y0){const vm=(o.v0+o.v1)/2,W=(u,v,y)=>[o.ux*u+o.vx*v,y,o.uz*u+o.vz*v],A=W(o.u0,o.v0,y0),B=W(o.u1,o.v0,y0),C=W(o.u1,o.v1,y0),D=W(o.u0,o.v1,y0),R0=W(o.r0,vm,y0+o.rh),R1=W(o.r1,vm,y0+o.rh);
  face(G,[A,B,R1,R0]);face(G,[C,D,R0,R1]);face(G,[D,A,R0]);face(G,[B,C,R1]);face(G,[A,D,C,B].map(p=>[p[0],y0-.02,p[2]]))}
let LAMPS=[],LAMP_HEADS=null,LAMP_POOL=null,WATERM=null,SHADSEG=null,MANZEB=null;
const WARES=new Set(["Butlers Wharf Buildings","Butlers Wharf West","Anchor Brewhouse","Coriander Court","Saffron Wharf","Butlers and Colonial Wharf","Vanilla and Sesame Court"]);
const segD=(x,z,p)=>{let b=1e9;for(let i=0;i<p.length-1;i++){const [x0,z0]=p[i],[x1,z1]=p[i+1],vx=x1-x0,vz=z1-z0,l=vx*vx+vz*vz||1,t=cl(((x-x0)*vx+(z-z0)*vz)/l,0,1);b=Math.min(b,hyp(x0+vx*t-x,z0+vz*t-z))}return b};
const cen=P=>[P.reduce((a,p)=>a+p[0],0)/P.length,P.reduce((a,p)=>a+p[1],0)/P.length];
function override(nm,P){if(nm=='St James')return'jchurch';if(nm=='Anchor Brewhouse')return'ware';{const [cx,cz]=cen(P);if(hyp(cx-778*K,cz-1842*K)<3)return'alaska'}if(nm=='Kagyu Samye Dzong London')return'lib';if(nm=='Fashion and Textile Museum')return'ftm';if(nm=='St Mary Magdalen')return'church';if(WARES.has(nm))return'ware';
  const [cx,cz]=cen(P);if(MANZEB&&hyp(cx-MANZEB[0],cz-MANZEB[1])<.01)return'red';if(SHADSEG&&segD(cx,cz,SHADSEG)<20)return'ware';return null}
function build(WD){
  initWet();
  /* Harris Academy Bermondsey (Southwark Park Road): the school blocks are three to four storeys; one OSM block came through at 33 m and rendered as a glass tower */
  for(const b of WD.b){if(b[5]!=='school'||b[1]<=16)continue;const f=b[0];let x=0,y=0;for(let i=0;i<f.length;i+=2){x+=f[i];y+=f[i+1]}x/=f.length/2;y/=f.length/2;if(x>1230&&x<1420&&y>1960&&y<2070)b[1]=15.5}
  const onRoadPx=(x,y)=>{const t=tAt(x,y);return t==1||t==7};
  // fine building raster, used for collision and camera
  {const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#000';for(const b of WD.b){const f=b[0];g.beginPath();for(let i=0;i<f.length;i+=2)i?g.lineTo(f[i],f[i+1]):g.moveTo(f[i],f[i+1]);g.closePath();g.fill()}
   const d=g.getImageData(0,0,W,H).data,fb=new Uint8Array(W*H);for(let i=0;i<fb.length;i++)if(d[i*4+3]>110){const x=i%W,y=(i/W)|0;fb[i]=onRoadPx(x,y)?0:1}FB=fb;FLOW=new Uint8Array(W*H)}
  const MW=W*K,MH=H*K;
  terrInit(WD.terrain);
  /* ground: one grid at the terrain cell size over the map (so it follows the heights), with a single big quad beyond each edge */
  const gx=[-2000],gz=[-2000];for(let x=0;x<MW;x+=TERR.cell)gx.push(x);gx.push(MW,MW+2000);for(let z=0;z<MH;z+=TERR.cell)gz.push(z);gz.push(MH,MH+2000);
  {const nx=gx.length,nz=gz.length,P=new Float32Array(nx*nz*3),N=new Float32Array(nx*nz*3),UV=new Float32Array(nx*nz*2),I=new Uint32Array((nx-1)*(nz-1)*6);let o=0;
   for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*nx+i;P[k*3]=gx[i];P[k*3+2]=gz[j];N[k*3+1]=1;UV[k*2]=gx[i]/4;UV[k*2+1]=gz[j]/4}
   for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=(j+1)*nx+i,c=j*nx+i+1,d=(j+1)*nx+i+1;I.set([a,b,c,c,b,d],o);o+=6}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));g.setAttribute('uv',new THREE.BufferAttribute(UV,2));g.setIndex(new THREE.BufferAttribute(I,1));
   const ground=new THREE.Mesh(g,MAT.pave);ground.frustumCulled=false;paving.repeat.set(1,1);ground.receiveShadow=true;scene.add(ground)}
  const tile=(x,z)=>Math.floor(x/360)+","+Math.floor(z/360),buckets={},bk=(m,x,z)=>{const k=m+'|'+tile(x,z);return buckets[k]||(buckets[k]=GB())};
  for(const f of WD.green){const P=pl2(f);flat(bk('grass',P[0][0],P[0][1]),P,.02,4)}
  // back gardens and courtyard lawns behind the buildings
  if(WD.gard){/* lawn rows come from the 4 px grid, so their ends made stair steps from the air. Each row's end now meets the overlapping row above/below halfway (only for steps up to 8 px), so lawn edges run as diagonals; visual only */
   const RT={},RB={};for(const r of WD.gard){(RT[r[1]]||(RT[r[1]]=[])).push(r);(RB[r[1]+r[3]]||(RB[r[1]+r[3]]=[])).push(r)}
   const nb=(row,r,i)=>{const x=i?r[0]+r[2]:r[0];if(!row)return x;let bx=x,bd=8.5;for(const q of row){if(q===r||q[0]>=r[0]+r[2]||q[0]+q[2]<=r[0])continue;const qx=i?q[0]+q[2]:q[0],d=Math.abs(qx-x);if(d<bd){bd=d;bx=qx}}return (x+bx)/2};let sm=0;
   for(const r of WD.gard){const [x,y,w,h]=r,up=RB[y],dn=RT[y+h],lt=nb(up,r,0),rt=nb(up,r,1),lb=nb(dn,r,0),rb=nb(dn,r,1);if(lt!=x||rt!=x+w||lb!=x||rb!=x+w)sm++;
    if(rt-lt<.5&&rb-lb<.5)continue;flat(bk('lawn',x*K,y*K),[[lt*K,y*K],[rt*K,y*K],[rb*K,(y+h)*K],[lb*K,(y+h)*K]],.012,4)}R3DBG.lawnSmooth=sm}
  for(const f of WD.plaza){const P=pl2(f);flat(bk('plaza',P[0][0],P[0][1]),P,.025,4)}
  for(const f of WD.water){const P=pl2(f);let my=1e9;for(let i=1;i<f.length;i+=2)my=Math.min(my,f[i]);flat(bk(my>300?'pond':'water',P[0][0],P[0][1]),P,.04,10);ribbon(bk('quay',P[0][0],P[0][1]),[...P,P[0]],1.2,.06,0,false)}
  for(const f of WD.foot){const P=pl2(f);ribbon(bk('path',P[0][0],P[0][1]),P,2.2,.044,0,true)}
  const COB=new Set(['Shad Thames','Gainsford Street','Curlew Street','Maltby Street','Ropewalk','Horselydown Lane','Lucey Way']);
  const roads=WD.r.map(r=>({p:pl2(r[0]),w:r[1]*K,c:r[2],nm:r[3]||'',cob:COB.has(r[3]),ow:r[4]||0,cyc:r[5]||0,pic:r[6]||0,bus:r[7]||0}));
  ROADSR=roads;
  for(const r of roads){const b=r.p[0];ribbon(bk(r.cob?'cobble':'road',b[0],b[1]),r.p,r.w,r.cob?.052:.05,0,true)}
  /* road markings stop where they run into another road's carriageway (junction mouths), instead of carrying on across it */
  const RSEG=new Map(),RC=16,NOCUT=new Set(['pedestrian','track','footway','path','cycleway','steps','bridleway']);roads.forEach((r,ri)=>{if(NOCUT.has(r.c))return;const h=r.w/2;for(let i=0;i<r.p.length-1;i++){const [x0,z0]=r.p[i],[x1,z1]=r.p[i+1];for(let cx=Math.floor((Math.min(x0,x1)-h)/RC);cx<=Math.floor((Math.max(x0,x1)+h)/RC);cx++)for(let cz=Math.floor((Math.min(z0,z1)-h)/RC);cz<=Math.floor((Math.max(z0,z1)+h)/RC);cz++){const k=cx+','+cz;let L=RSEG.get(k);if(!L)RSEG.set(k,L=[]);L.push([ri,x0,z0,x1,z1,h])}}});
  const inOther=(x,z,ri,dx,dz)=>{const L=RSEG.get(Math.floor(x/RC)+','+Math.floor(z/RC));if(!L)return false;for(const [j,x0,z0,x1,z1,h] of L){if(j===ri)continue;const vx=x1-x0,vz=z1-z0,l2=vx*vx+vz*vz;if(l2<1e-4)continue;const t=Math.max(0,Math.min(1,((x-x0)*vx+(z-z0)*vz)/l2)),ex=x0+vx*t-x,ez=z0+vz*t-z;if(ex*ex+ez*ez<(h+.15)*(h+.15)&&Math.abs(vx*dx+vz*dz)/Math.sqrt(l2)<.8)return true}return false};/* a road running the same way (the next piece of the same street) never cuts */
  const clipM=(pts,ri)=>{const out=[];let cur=[];const flush=()=>{if(cur.length>1)out.push(cur);cur=[]};for(let i=0;i<pts.length-1;i++){const [x0,z0]=pts[i],[x1,z1]=pts[i+1],L=hyp(x1-x0,z1-z0);if(L<.01)continue;const dx=(x1-x0)/L,dz=(z1-z0)/L,n=Math.max(1,Math.ceil(L/.8));for(let k=(i==0?0:1);k<=n;k++){const t=k/n,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;if(inOther(x,z,ri,dx,dz))flush();else cur.push([x,z])}}flush();return out};
  const mark=(G,pts,ri,w,y,us)=>{for(const c of clipM(pts,ri))ribbon(G,c,w,y,us,false)};
  roads.forEach((r,ri)=>{if(r.cob||['service','pedestrian','track','living_street'].includes(r.c))return;const b=r.p[0];for(const s of [1,-1])mark(bk('kerb',b[0],b[1]),offsetLine(r.p,s*(r.w/2-.12)),ri,.25,.055,0);
    if(!r.ow&&r.w>5.5){if(['trunk','primary','secondary','tertiary'].includes(r.c))mark(bk('line',b[0],b[1]),r.p,ri,.15,.06,6);else if(r.c=='residential'||r.c=='unclassified')mark(bk('line',b[0],b[1]),r.p,ri,.12,.06,9)}
    /* residential streets: double yellow kerb lines for the first ~10 m at each end (no parking within 10 m of a junction) */
    if((r.c=='residential'||r.c=='unclassified')&&r.w>5.5&&!r.ow){let tot=0;for(let i=1;i<r.p.length;i++)tot+=hyp(r.p[i][0]-r.p[i-1][0],r.p[i][1]-r.p[i-1][1]);if(tot>22){const Lh=Math.min(10,tot/2.6);for(const rev of [0,1]){const q=rev?[...r.p].reverse():r.p,seg=[q[0]];let acc=0;for(let i=1;i<q.length;i++){const d=hyp(q[i][0]-q[i-1][0],q[i][1]-q[i-1][1]);if(acc+d>=Lh){const t=(Lh-acc)/d;seg.push([q[i-1][0]+(q[i][0]-q[i-1][0])*t,q[i-1][1]+(q[i][1]-q[i-1][1])*t]);break}seg.push(q[i]);acc+=d}if(seg.length>1)for(const sd of [1,-1])for(const o of [.5,.75])mark(bk('yel',b[0],b[1]),offsetLine(seg,sd*(r.w/2-o)),ri,.1,.06,0)}}}
    const tg=r.c=='trunk'||r.c=='trunk_link'?'red':['primary','secondary','tertiary','primary_link','secondary_link'].includes(r.c)?'yel':null;if(tg)for(const s of [1,-1])for(const o of [.5,.75])mark(bk(tg,b[0],b[1]),offsetLine(r.p,s*(r.w/2-o)),ri,.1,.06,0)});
  // cycle tracks, painted cycle lanes, bus lanes and their markings, from OpenStreetMap lane tags
  const glyph=(G,x,z,dx,dz,len,wid,y)=>{const nx=-dz,nz=dx,a=[x-dx*len/2-nx*wid/2,y,z-dz*len/2-nz*wid/2],b=[x+dx*len/2-nx*wid/2,y,z+dz*len/2-nz*wid/2],c=[x+dx*len/2+nx*wid/2,y,z+dz*len/2+nz*wid/2],d=[x-dx*len/2+nx*wid/2,y,z-dz*len/2+nz*wid/2];tri(G,a,b,c,[0,1,0],[1,0],[1,1],[0,1]);tri(G,a,c,d,[0,1,0],[1,0],[0,1],[0,0])};
  const along=(pts,step,first,fn)=>{let acc=0,next=first;for(let i=0;i<pts.length-1;i++){const [x0,z0]=pts[i],[x1,z1]=pts[i+1],L=hyp(x1-x0,z1-z0);if(L<.01)continue;const dx=(x1-x0)/L,dz=(z1-z0)/L;while(next<acc+L){const t=next-acc;fn(x0+dx*t,z0+dz*t,dx,dz);next+=step}acc+=L}};
  // shared paths through parks (Southwark Park etc.) are pale park tarmac, not dark road-style cycle track
  const GRP=(WD.green||[]).map(f=>{const P=pl2(f);let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const [x,z] of P){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z)}return{P,x0,x1,z0,z1}}),inGreen=(x,z)=>GRP.some(g=>{if(x<g.x0||x>g.x1||z<g.z0||z>g.z1)return false;let c=false;const Q=g.P;for(let i=0,j=Q.length-1;i<Q.length;j=i++){const [xi,zi]=Q[i],[xj,zj]=Q[j];if((zi>z)!=(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c}return c});
  for(const f of WD.cyc||[]){const p=pl2(f),b=p[0],m=p[p.length>>1],pk=inGreen(m[0],m[1])||(p.length>1&&inGreen((p[0][0]+p[1][0])/2,(p[0][1]+p[1][1])/2));ribbon(bk(pk?'cycp':'cyc',b[0],b[1]),p,2.3,.036,0,true);along(p,30,8,(x,z,dx,dz)=>glyph(bk('bike',x,z),x,z,dx,dz,1.6,1.6,.04))}
  for(const r of roads){if(!(r.cyc||r.pic||r.bus))continue;const b=r.p[0];for(const sd of [1,2]){const sg=sd==1?-1:1;
      if(r.bus&sd){const o=sg*(r.w/2-1.6);ribbon(bk('buslane',b[0],b[1]),offsetLine(r.p,o),3,.058,0,false);ribbon(bk('kerb',b[0],b[1]),offsetLine(r.p,sg*(r.w/2-3.15)),.25,.062,0,false);along(offsetLine(r.p,o),60,20,(x,z,dx,dz)=>glyph(bk('bus',x,z),x,z,-dx*sg,-dz*sg,3,-2.6,.064))}
      else if(r.cyc&sd){ribbon(bk('kerb',b[0],b[1]),offsetLine(r.p,sg*(r.w/2-1.6)),.15,.062,0,false);along(offsetLine(r.p,sg*(r.w/2-.8)),25,6,(x,z,dx,dz)=>glyph(bk('bike',x,z),x,z,dx,dz,1.4,1.4,.064))}
      else if(r.pic&sd)along(offsetLine(r.p,sg*(r.w/4)),30,10,(x,z,dx,dz)=>glyph(bk('bike',x,z),x,z,dx,dz,1.6,1.6,.064))}}
  // buildings: ground floor fronts, upper floors, hipped slate roofs with chimneys on the terraces
  const GHT=3.4;
  {const r=WD.r.filter(r=>r[3]=='Shad Thames'&&r[2]=='pedestrian').map(r=>pl2(r[0])).sort((a,b)=>b.length-a.length)[0];SHADSEG=r||null;
   {const mp=manzePt(),f=mp&&bldFor(mp[0],mp[1]);MANZEB=f?cen(f.Q):null}}
  for(const b of WD.b)if(/^Tower Bridge (North|South) Tower$/.test(b[4]||'')){const P=pl2(b[0]);TBT[b[4].includes('North')?'n':'s']=[P.reduce((a,p)=>a+p[0],0)/P.length,P.reduce((a,p)=>a+p[1],0)/P.length]}
  const SHB={};for(const sh of D.shops){const k=Math.floor(sh[2]*K/40)+','+Math.floor(sh[3]*K/40);(SHB[k]=SHB[k]||[]).push([sh[2]*K,sh[3]*K])}
  const shopNear=(P)=>{const [cx,cz]=cen(P),ring=[...P,P[0]];for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=SHB[(Math.floor(cx/40)+a)+','+(Math.floor(cz/40)+b)];if(L)for(const [x,z] of L)if(inPoly(x,z,P)||segD(x,z,ring)<4)return true}return false};
  const VIA=[],VIA_H=7,UNDP=(WD.viaduct&&WD.viaduct.under||[]).map(u=>{const p=pl2(u);return{p,ring:[...p,p[0]]}});const inUnd=(x,z)=>UNDP.some(u=>inPoly(x,z,u.p)||segD(x,z,u.ring)<1.6);
  for(const [f,h,cat,hs,nm,bt,lv,mat_,col_,sty,rgb,rf] of WD.b){TINT=[1,1,1];if(/^Tower Bridge (North|South) Tower$/.test(nm||'')||MODELLED.has(nm))continue;const P=pl2(f);if(P.length<3)continue;
    // railway viaduct mapped as an arches block: brick arches up to track level, ballast and track on top, never a roof slab over the line
    if(sty=='via'){VIA.push(P);continue}
    let wk=cat=='modern'?'modern':cat=='ware'?'ware':cat=='flats'?'flats':cat=='church'?'church':(hs%3==0?'red':hs%7==1?'paint':'stock');const c0=P[0],ov=override(nm||'',P);if(ov)wk=ov;else if(sty&&WM[sty]){wk=sty;if(rgb){const m=WMEAN[wk];TINT=[0,1,2].map(i=>cl(rgb[i]*1.38/m[i],.45,2.8))}}const res=wk=='stock'||wk=='red'||wk=='paint';
    const isShop=(cat=='shopfront'||(res&&h<18&&shopNear(P)));
    const G=bk('w'+wk,c0[0],c0[1]),gk=isShop?['shop','shop1','shop2','shop3'][hs%4]:res?(wk=='red'?'gdoorR':wk=='paint'?'gpaint':'gdoorS'):wk=='ware'?'wground':null,Gg=gk?bk(gk,c0[0],c0[1]):null,gw=isShop?20:8;
    let roof=null,eave=h;/* rf: LiDAR roof shape (-1 flat, >0 measured rise in m, 0 not measured: old guess) */if(res&&!isShop&&rf!==-1&&(rf>0?h>3.8&&h<20:h>4.5&&h<16)){roof=obb(P,.9);if(!roof&&obb(P)){R3DBG.hipFlat=(R3DBG.hipFlat||0)+1}/* a hipped roof is built over the footprint's box: on an L-shaped or cut-away footprint (under 90% of its box) it would overhang the walls, so those get a flat roof */if(roof&&roof.v1-roof.v0>3&&roof.v1-roof.v0<16){roof.rh=rf>0?Math.min(3.4,Math.max(1.2,rf*1.1)):Math.min(3.4,(roof.v1-roof.v0)*.42);eave=Math.max(GHT+2.6,h-roof.rh*.45)}else roof=null}
    const split=Gg&&eave>GHT+1.5;let acc=0,longest=null;
    for(let i=0;i<P.length;i++){const [x0,z0]=P[i],[x1,z1]=P[(i+1)%P.length],dx=x1-x0,dz=z1-z0,L=hyp(dx,dz);if(L<.05)continue;let nx=dz/L,nz=-dx/L,fp=0;if(inPoly((x0+x1)/2+nx*.2,(z0+z1)/2+nz*.2,P)){nx=-nx;nz=-nz;fp=1}
      const bw=wk=='modern'?3:wk=='flats'||wk=='ftm'||wk=='jchurch'?5:wk=='ware'?8:wk=='white'||wk=='alaska'?6:4,sh=wk=='jchurch'?8:wk=='modern'||wk=='ware'||wk=='lib'||wk=='alaska'?3.6:wk=='ftm'||wk=='white'?4:3.2,y0=split?GHT:0;
      if(split){const ua=acc/gw,ub=(acc+L)/gw,sw=isShop&&!fp;/* shop signs read left to right from outside */quad(Gg,[x0,0,z0],[x1,0,z1],[x1,GHT,z1],[x0,GHT,z0],[nx,0,nz],sw?-ua:ua,sw?-ub:ub,0,1)}
      if(UNDP.length&&inUnd((x0+x1)/2,(z0+z1)/2))quad(bk('arch',c0[0],c0[1]),[x0,0,z0],[x1,0,z1],[x1,eave,z1],[x0,eave,z0],[nx,0,nz],acc/32,(acc+L)/32,0,eave/8);else quad(G,[x0,y0,z0],[x1,y0,z1],[x1,eave,z1],[x0,eave,z0],[nx,0,nz],acc/bw,(acc+L)/bw,y0/sh,eave/sh);
      if(res&&!isShop&&L>2.5)GARD.push([x0,z0,dx/L,dz/L,L,nx,nz,acc,wk]);
      if(!longest||L>longest.L)longest={x0,z0,dx:dx/L,dz:dz/L,nx,nz,L,acc};acc+=L}
    if(roof){hipRoof(bk('roofS',c0[0],c0[1]),roof,eave);const n=Math.max(1,Math.round((roof.r1-roof.r0)/6.5)),yr=eave+roof.rh,ry=Math.atan2(-roof.uz,roof.ux),vm=(roof.v0+roof.v1)/2;
      for(let k=0;k<n;k++){const u=roof.r1-roof.r0<1?(roof.r0+roof.r1)/2:roof.r0+(k+.5)*(roof.r1-roof.r0)/n;const chx=roof.ux*u+roof.vx*vm,chz=roof.uz*u+roof.vz*vm;if(inPoly(chx,chz,P))CHIM.push([chx,yr,chz,wk,ry]);else R3DBG.chimSkip=(R3DBG.chimSkip||0)+1}}/* only where the ridge is over the building itself: on an L-shaped or slanted footprint the roof box overhangs, and its chimney would float */
    else{flat(bk(res?'roofS':'roofF',c0[0],c0[1]),P,h,4);
      if(h>6||res){const ph=isShop?1.1:.8;for(let i=0;i<P.length;i++){const [x0,z0]=P[i],[x1,z1]=P[(i+1)%P.length],dx=x1-x0,dz=z1-z0,L=hyp(dx,dz);if(L<.1)continue;quad(G,[x0,h,z0],[x1,h,z1],[x1,h+ph,z1],[x0,h+ph,z0],[dz/L,0,-dx/L],0,L/4,h/3.2,(h+ph)/3.2)}}
      if(res){const o=obb(P,0);if(o){const n=Math.max(1,Math.round((o.u1-o.u0)/6)),vm=(o.v0+o.v1)/2,ry=Math.atan2(-o.uz,o.ux);for(let k=0;k<n;k++){const u=o.u0+(k+.5)*(o.u1-o.u0)/n,chx=o.ux*u+o.vx*vm,chz=o.uz*u+o.vz*vm;if(inPoly(chx,chz,P))CHIM.push([chx,h+.6,chz,wk,ry]);else R3DBG.chimSkip=(R3DBG.chimSkip||0)+1}}}}
    if(wk=='flats'&&longest&&longest.L>14&&h>=8&&h<=24&&!isShop)DECKS.push([longest,h]);
    if((wk=='modr'||wk=='clad')&&longest&&longest.L>10&&h>=8)BALC.push([longest,h]);
    if(wk=='ware'&&longest&&longest.L>9&&h>9){const u=6.2,x=longest.x0+longest.dx*u,z=longest.z0+longest.dz*u;HOIST.push([x,h-.9,z,longest.nx,longest.nz])}
    if(wk=='ware'&&longest&&longest.L>6&&h>6)TIES.push([longest.x0,longest.z0,longest.dx,longest.dz,longest.L,longest.nx,longest.nz,h])}
  TINT=[1,1,1];
  // railway viaducts, open where roads pass under
  // the railway viaduct as one continuous structure (union of all track corridors and arch blocks), with real underpasses where roads go through
  const VH=7;if(WD.viaduct){const VV=VB(),VD=WD.viaduct,Ga=k=>bk('arch',k[0],k[1]),Gt=k=>bk('wstock',k[0],k[1]);
    const flatH=(G,P,Hs,y,sc,down)=>{const v=P.map(p=>new THREE.Vector2(p[0],p[1])),hv=Hs.map(h=>h.map(p=>new THREE.Vector2(p[0],p[1]))),all=P.concat(...Hs);let t;try{t=THREE.ShapeUtils.triangulateShape(v,hv)}catch(e){return}
      for(const [a,b,c] of t){const A=all[a],B=all[b],C=all[c];if(down)tri(G,[A[0],y,A[1]],[B[0],y,B[1]],[C[0],y,C[1]],[0,-1,0],[A[0]/sc,A[1]/sc],[B[0]/sc,B[1]/sc],[C[0]/sc,C[1]/sc]);else tri(G,[A[0],y,A[1]],[C[0],y,C[1]],[B[0],y,B[1]],[0,1,0],[A[0]/sc,A[1]/sc],[C[0]/sc,C[1]/sc],[B[0]/sc,B[1]/sc])}};
    const UND=VD.under.map(pl2),inU=(x,z)=>UND.some(Q=>inPoly(x,z,Q));
    // collision: rasterise the solid parts onto the blocking grid
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;const cg=cv.getContext('2d');cg.fillStyle='#fff';
    VD.solid.forEach((poly,pi)=>{const rings=poly.map(pl2);
      rings.forEach((P,ri)=>{const kind=VD.kinds[pi][ri];let acc=0;for(let i=0;i<P.length;i++){const [x0,z0]=P[i],[x1,z1]=P[(i+1)%P.length],dx=x1-x0,dz=z1-z0,L=hyp(dx,dz);if(L<.05)continue;let nx=dz/L,nz=-dx/L;if(inPoly((x0+x1)/2+nx*.2,(z0+z1)/2+nz*.2,rings[0])!==(ri>0)){nx=-nx;nz=-nz}
        const tun=kind[i]==1,G=Ga(P[i]);quad(G,[x0,0,z0],[x1,0,z1],[x1,tun?VH-.7:VH,z1],[x0,tun?VH-.7:VH,z0],[nx,0,nz],acc/32,(acc+L)/32,0,tun?(VH-.7)/8:VH/8);acc+=L}});
      cg.beginPath();for(const r of poly){cg.moveTo(r[0],r[1]);for(let k=2;k<r.length;k+=2)cg.lineTo(r[k],r[k+1]);cg.closePath()}cg.fill('evenodd')});
    {const uc=document.createElement('canvas');uc.width=W;uc.height=H;const ug=uc.getContext('2d');ug.fillStyle='#fff';for(const r of VD.under){ug.beginPath();ug.moveTo(r[0],r[1]);for(let k=2;k<r.length;k+=2)ug.lineTo(r[k],r[k+1]);ug.closePath();ug.fill()}
      const ud=ug.getImageData(0,0,W,H).data,UPm=new Uint8Array(W*H);for(let i=0;i<W*H;i++)if(ud[i*4+3]>60)UPm[i]=1;window.UP=UPm;
      const d=cg.getImageData(0,0,W,H).data;let nb=0;for(let i=0;i<W*H;i++){if(UPm[i]){FB[i]=0;continue}if(d[i*4+3]>128&&!onRoadPx(i%W,(i/W)|0)){FB[i]=1;nb++}}window.R3DBG&&(R3DBG.viaCells=nb)}
    // ballast deck over the whole viaduct, brick parapets along its edges, green steel girders where it bridges a road
    VD.deck.forEach((d,i)=>{const P=pl2(d),Hs=(VD.deckHoles[i]||[]).map(pl2);flatH(bk('ballast',P[0][0],P[0][1]),P,Hs,VH,6,false);
      for(const R of [P,...Hs])for(let k=0;k<R.length;k++){const [x0,z0]=R[k],[x1,z1]=R[(k+1)%R.length],L=hyp(x1-x0,z1-z0);if(L<.05)continue;const mx=(x0+x1)/2,mz=(z0+z1)/2,ry=Math.atan2(-(z1-z0),x1-x0),V=VV;
        if(inU(mx,mz)||onRoadPx(mx/K,mz/K)){addBox(V,L+.05,2.0,.5,mx,VH-.6,mz,'#2f4a3a',ry);addBox(V,L+.05,.12,.7,mx,VH+.42,mz,'#25392e',ry)}else addBox(V,L+.05,1.0,.45,mx,VH+.5,mz,'#7a3e2e',ry)}});
    // underside of the bridges: dark soffit with lights so driving through isn't pitch black
    VD.deck.forEach((d,i)=>{const P=pl2(d),Hs=(VD.deckHoles[i]||[]).map(pl2);flatH(bk('under',P[0][0],P[0][1]),P,Hs,VH-.04,4,true)});
    for(const P of UND){flatH(bk('under',P[0][0],P[0][1]),P,[],VH-.7,4,true);let cx=0,cz=0;for(const p of P){cx+=p[0];cz+=p[1]}cx/=P.length;cz/=P.length;addBox(VV,1.2,.08,.3,cx,VH-.76,cz,'#fff6d8')}
    scene.add(vmesh(VV))}
  for(const k in buckets){const [m]=k.split('|');const mat=m[0]=='w'&&WM[m.slice(1)]?WM[m.slice(1)]:MAT[m];const flatm=['cyc','cycp','buslane','bike','bus','cobble','grass','lawn','play','plaza','water','pond','quay','path','road','kerb','line','red','yel'].includes(m);let gb=buckets[k];if(flatm&&m!='water'){const n0=gb.p.length/3;gb=drape(gb,DTOL[m]||[.016,.05]);const d=R3DBG.drape||(R3DBG.drape={});d[m]=(d[m]||[0,0]);d[m][0]+=n0;d[m][1]+=gb.p.length/3}const ms=mesh(gb,mat,!flatm);if(m=='path'||m=='cycp'||m=='cyc'){ms.renderOrder=m=='path'?1:2;mat.depthWrite=false}/* footpaths and cycle tracks overlap in nearly the same plane: draw them in a fixed order (path, then cycle track) instead of letting the depth buffer pick, which flickered on phones */if(m=='water'||m=='pond')(WATERM=WATERM||[]).push(ms)}
  // trees, instanced per area so off-screen groups are skipped
  {const kx=BELLK.x,ky=BELLK.y,trees=WD.trees.filter(t=>!FB[(t[1]|0)*W+(t[0]|0)]&&!onRoadPx(t[0],t[1])&&hyp(t[0]-kx,t[1]-ky)>9),groups={};for(const t of trees){const k=tile(t[0]*K,t[1]*K);(groups[k]=groups[k]||[]).push(t)}
   // estate squares: a tree in a concrete planter in the middle of big bare paved spaces between blocks (open ground well clear of roads, buildings, lawns and existing trees). Own groups and own PRNG so the shared random stream (and so every other tree, blind and window) is unchanged
   {let ls=97531;const LR=()=>{ls=(ls+0x6D2B79F5)|0;let t=Math.imul(ls^ls>>>15,1|ls);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};WD._plzLR=LR;
    const pip=(x,y,f)=>{let c=false;for(let i=0,j=f.length-2;i<f.length;j=i,i+=2){const xi=f[i],yi=f[i+1],xj=f[j],yj=f[j+1];if(((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c}return c},
      bb=f=>{let a=1e9,b=1e9,c=-1e9,d=-1e9;for(let i=0;i<f.length;i+=2){a=Math.min(a,f[i]);b=Math.min(b,f[i+1]);c=Math.max(c,f[i]);d=Math.max(d,f[i+1])}return[a,b,c,d]},GR=WD.green.map(f=>[f,bb(f)]),
      TG={};for(const t of WD.trees){const k=((t[0]/40)|0)+','+((t[1]/40)|0);(TG[k]=TG[k]||[]).push(t)}
    const nearT=(x,y,r)=>{for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const t of TG[(((x/40)|0)+a)+','+(((y/40)|0)+b)]||[])if(hyp(t[0]-x,t[1]-y)<r)return true;return false},
      nearF=(x,y)=>(WD.fronts||[]).some(f=>hyp(f[1]-x,f[2]-y)<30)||hyp(x-kx,y-ky)<30,SPP=[1,5,6,7,9,14],out=[],S=26;
    for(let gy=S/2;gy<H;gy+=S)for(let gx=S/2;gx<W;gx+=S){const h=Math.imul(gx|0,73856093)^Math.imul(gy|0,19349663),x=gx+((h>>>3)%9)-4,y=gy+((h>>>9)%9)-4;if(tAt(x,y)!=0)continue;let ok=true;
      for(let r=4;r<=13&&ok;r+=4.5)for(let k=0;k<8;k++){const a=k*.785,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r,tt=tAt(px,py);if((tt!=0&&tt!=5&&tt!=6)||FB[(py|0)*W+(px|0)]){ok=false;break}}
      if(!ok||nearT(x,y,14)||nearF(x,y)||GR.some(([f,b])=>x>=b[0]&&x<=b[2]&&y>=b[1]&&y<=b[3]&&pip(x,y,f)))continue;const t=[x,y,SPP[(h>>>13)%SPP.length],1];out.push(t);const k='p'+tile(x*K,y*K);(groups[k]=groups[k]||[]).push(t)}
    WD._plzt=out;window.R3DBG&&(R3DBG.plzt=out.length)}
   // species from Southwark's street-tree survey (via OpenStreetMap): shape, bark, and colour by real season
   // [crown, sx, sy, trunk height, trunk thickness, bark, summer HSL, autumn HSL, how early it drops, spring blossom HSL]
   const SP=[['ico',2.05,1.6,5.5,1.8,'#b4ae94',[.25,.4,.3],[.11,.55,.42],.85],['ico',1.15,1.6,3.5,1.1,'#5e5040',[.24,.45,.33],[.14,.7,.5],.78],['ico',.9,.75,2,.9,'#5a3a34',[.27,.35,.3],[.04,.65,.45],.68,[0,0,.95]],
     ['ico',1,.65,2,.9,'#5a3a34',[.27,.38,.3],[.07,.7,.45],.68,[.93,.6,.82]],['ico',.8,.75,2,.8,'#4a3430',[.95,.35,.25],[.97,.35,.28],.7,[.95,.5,.9]],['ico',1.25,1.1,3,1.1,'#5a5048',[.26,.45,.3],[.09,.8,.5],.75],
     ['ico',1.2,1.2,3.5,1.1,'#7a7468',[.23,.35,.35],[.15,.55,.5],.7],['ico',1.2,1,3.2,1,'#7a7064',[.22,.4,.33],[.13,.5,.45],.75],['ico',.65,1.4,3.5,.7,'#e8e6e0',[.22,.45,.42],[.14,.75,.55],.7],
     ['ico',1.05,1,3.2,1,'#5a4a3a',[.2,.5,.45],[.15,.7,.5],.75],['ico',.75,.85,2.2,.8,'#6a5a4c',[.27,.35,.3],[.03,.65,.42],.68,[0,0,.95]],['ico',.6,1.3,2.2,.8,'#5a5048',[.27,.45,.3],[.99,.6,.35],.78,[0,0,.95]],
     ['cone',1,1,1,1,'#5a4434',[.36,.35,.2],null,2],['ico',.8,1,1.2,.8,'#4a4438',[.33,.45,.18],null,2],['ico',1.5,1.35,3.5,1.4,'#5a4a3e',[.25,.45,.28],[.08,.6,.35],.72],
     ['ico',.55,2.2,2.5,1,'#6a6458',[.24,.4,.32],[.15,.7,.5],.76],['ico',.75,1.25,2.2,.9,'#7a7a72',[.27,.45,.3],[.12,.6,.45],.85],['ico',.8,1.35,2.5,.9,'#5a4a40',[.25,.45,.3],[.95,.6,.32],.8],['ico',1,1,3,1,'#5a4a3c',[.27,.4,.3],[.1,.5,.42],.78]];
   const now=new Date(),mo=now.getMonth(),dy=now.getDate(),season=mo==11||mo<2?'w':mo<4?'sp':mo<8?'su':'au',ap=season=='au'?((mo-8)*30+dy)/91:0;
   const tg=new THREE.CylinderGeometry(.18,.26,3,6),cg=(()=>{const L=[[2.05,0,0,0],[1.45,1.05,-.35,.55],[1.35,-.9,-.5,-.7],[1.25,.1,.75,-.2]].map(([r,x,y,z],i)=>{const g=new THREE.IcosahedronGeometry(r,0).toNonIndexed();g.rotateY(i*1.3);g.rotateX(i*.7);g.translate(x,y,z);return g}),n=L.reduce((a,g)=>a+g.attributes.position.count,0),pos=new Float32Array(n*3),nor=new Float32Array(n*3);let o=0;for(const g of L){pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);o+=g.attributes.position.count}const r=new THREE.BufferGeometry();r.setAttribute('position',new THREE.BufferAttribute(pos,3));r.setAttribute('normal',new THREE.BufferAttribute(nor,3));return r})(),kg=new THREE.ConeGeometry(2,7,7),tm=M({color:0xffffff}),cm=M({color:0xffffff,flatShading:true});
   // bare branches for trees that have dropped their leaves
   const bg=(()=>{const parts=[],m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();for(let i=0;i<7;i++){const g=new THREE.CylinderGeometry(.04,.09,2.6,4).toNonIndexed(),a=i/7*PI*2,t=.5+(i%3)*.18;g.translate(0,1.3,0);m.compose(new THREE.Vector3(0,0,0),q.setFromEuler(e.set(Math.cos(a)*t,0,Math.sin(a)*t)),new THREE.Vector3(1,1,1));g.applyMatrix4(m);g.translate(0,(i%2)*.6,0);parts.push(g)}
     const n=parts.reduce((a,g)=>a+g.attributes.position.count,0),pos=new Float32Array(n*3),nor=new Float32Array(n*3);let o=0;for(const g of parts){pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);o+=g.attributes.position.count}const r=new THREE.BufferGeometry();r.setAttribute('position',new THREE.BufferAttribute(pos,3));r.setAttribute('normal',new THREE.BufferAttribute(nor,3));return r})();
   const mm=new THREE.Matrix4(),m2=new THREE.Matrix4(),q=new THREE.Quaternion(),cc=new THREE.Color(),v=new THREE.Vector3(),sv=new THREE.Vector3(),e=new THREE.Euler();
   for(const k in groups){const rr=k[0]=='p'?WD._plzLR:R;const L=groups[k].map(t=>{const sp=SP[t[2]??18]||SP[18],bare=sp[8]<2&&(season=='w'||(season=='au'&&rr()<(ap-sp[8])*3.2));return{t,sp,bare}});
     const cnt=f=>Math.max(1,L.filter(f).length),trunk=new THREE.InstancedMesh(tg,tm,L.length),ico=new THREE.InstancedMesh(cg,cm,cnt(o=>!o.bare&&o.sp[0]=='ico')),cone=new THREE.InstancedMesh(kg,cm,cnt(o=>!o.bare&&o.sp[0]=='cone')),br=new THREE.InstancedMesh(bg,tm,cnt(o=>o.bare));
     let ni=0,nc=0,nb=0;
     L.forEach(({t,sp,bare},i)=>{const s=.8+rr()*.5,x=t[0]*K,z=t[1]*K,[shape,sx,sy,th,tr,bark,su,au,,bl]=sp,cy=th*s+2.4*sy*s*.72;
       mm.compose(v.set(x,(th*s+2.4*sy*s*.45)/2,z),q.identity(),sv.set(tr*s,(th*s+2.4*sy*s*.45)/3,tr*s));trunk.setMatrixAt(i,mm);trunk.setColorAt(i,cc.set(bark).offsetHSL(0,0,(rr()-.5)*.06));
       if(bare){mm.compose(v.set(x,th*s*.92,z),q.setFromEuler(e.set(0,rr()*6,0)),sv.set(sx*s*1.1,sy*s*1.2,sx*s*1.1));br.setMatrixAt(nb,mm);br.setColorAt(nb++,cc.set(bark).offsetHSL(0,0,-.08));return}
       const hsl=season=='sp'&&bl&&rr()<.85?bl:season=='au'&&au&&rr()<Math.min(.82,ap*1.3)?au:su,col=cc.setHSL(hsl[0]+(rr()-.5)*.06,cl(hsl[1]*.88+(rr()-.5)*.14,0,1),cl(hsl[2]+(rr()-.5)*.13,0,1));
       if(shape=='cone'){mm.compose(v.set(x,3.5*s+th,z),q.identity(),sv.set(s,s,s));cone.setMatrixAt(nc,mm);cone.setColorAt(nc++,col)}
       else{/* rotate the crown first, then stretch it, so tall narrow crowns (poplars, hornbeams) stay upright instead of leaning */mm.makeRotationFromEuler(e.set(rr()*.4,rr()*6,rr()*.4));mm.premultiply(m2.makeScale(sx*s*(1+rr()*.15),sy*s*(1+rr()*.15),sx*s*(1+rr()*.15)));mm.setPosition(x,cy,z);ico.setMatrixAt(ni,mm);ico.setColorAt(ni++,col)}});
     ico.count=ni;cone.count=nc;br.count=nb;
     for(const m of [trunk,ico,cone,br]){if(!m.count)continue;m.computeBoundingSphere();m.castShadow=true;m.receiveShadow=true;scene.add(m)}}}
  const mm=new THREE.Matrix4();
  // lamps
  const MLY=WD.mly||null,lampSrc=MLY?[...MLY.lamp,...(D.furn.lamp||[])]:[...D.lamps,...(D.furn.lamp||[])],LS=[];
  for(const l of lampSrc){const p=snap(l[0],l[1],10);if(!p)continue;if(LS.some(q=>hyp(q[0]-p[0],q[1]-p[1])<5))continue;LS.push([p[0],p[1],toRoad(p[0],p[1])])}
  /* the lamp data is patchy (over half the streets had no lamp within 40 m), so fill gaps with a column about every 32 m on alternating kerbs, as on real London streets */
  {const LIT=new Set(['trunk','primary','secondary','tertiary','residential','unclassified','living_street']),gap=18/K;let nf=0,side=1;
   for(const r of roads){if(!LIT.has(r.c))continue;let acc=16;for(let i=1;i<r.p.length;i++){const [ax,az]=r.p[i-1],[bx,bz]=r.p[i],L=hyp(bx-ax,bz-az);if(L<.01)continue;const ux=(bx-ax)/L,uz=(bz-az)/L;
     while(acc<L){const o=(r.w/2+.7)*side,X=(ax+ux*acc-uz*o)/K,Y=(az+uz*acc+ux*o)/K;acc+=32;side=-side;const p=snap(X,Y,4);if(!p||LS.some(q=>Math.abs(q[0]-p[0])<gap&&Math.abs(q[1]-p[1])<gap&&hyp(q[0]-p[0],q[1]-p[1])<gap))continue;const a=toRoad(p[0],p[1]);if(a===null)continue;LS.push([p[0],p[1],a]);nf++}
     acc-=L}}window.R3DBG&&(R3DBG.lampFill=nf)}
  /* estate access roads, car parks and pedestrian streets were unlit at night: columns every 40 m along service and pedestrian ways (same no-random placement), arm pointing at the way's centre line */
  {const gap=16/K;let ns=0,side=1;for(const r of roads){if(r.c!='service'&&r.c!='pedestrian')continue;let acc=14;for(let i=1;i<r.p.length;i++){const [ax,az]=r.p[i-1],[bx,bz]=r.p[i],L=hyp(bx-ax,bz-az);if(L<.01)continue;const ux=(bx-ax)/L,uz=(bz-az)/L;
     while(acc<L){const o=(r.w/2+.6)*side,X=(ax+ux*acc-uz*o)/K,Y=(az+uz*acc+ux*o)/K;acc+=40;side=-side;const p=snap(X,Y,3);if(!p||LS.some(q=>Math.abs(q[0]-p[0])<gap&&Math.abs(q[1]-p[1])<gap&&hyp(q[0]-p[0],q[1]-p[1])<gap))continue;const cx=(ax+ux*(acc-40))/K,cy=(az+uz*(acc-40))/K;LS.push([p[0],p[1],toRoad(p[0],p[1])??Math.atan2(cy-p[1],cx-p[0])]);ns++}
     acc-=L}}
   /* and a column beside about half of the estate-square planter trees, arm over the square */
   let nq=0;for(const [tx,ty] of WD._plzt||[]){const h=(Math.imul(tx|0,2246822519)^Math.imul(ty|0,3266489917))>>>0;if(h%2)continue;const a=(h>>>4)%8*.785,X=tx+Math.cos(a)*8,Y=ty+Math.sin(a)*8,tt=tAt(X,Y);if((tt!=0&&tt!=5&&tt!=6)||FB[(Y|0)*W+(X|0)])continue;
     if(LS.some(q=>hyp(q[0]-X,q[1]-Y)<gap))continue;LS.push([X,Y,a]);nq++}
   window.R3DBG&&(R3DBG.svcLamps=ns,R3DBG.sqLamps=nq)}
  if(WETENV){let h=97531;const pr=()=>{h=Math.imul(h^h>>>15,2246822507)^Math.imul(h^h>>>13,3266489909);return((h>>>0)%10000)/10000};
   const at=ctex(64,64,(g,w,hh)=>{for(let k=0;k<5;k++){const r=g.createRadialGradient(32+(pr()-.5)*20,32+(pr()-.5)*14,0,32,32,26-k*2);r.addColorStop(0,'rgba(255,255,255,.55)');r.addColorStop(.7,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,w,hh)}},false);
   const pm=new THREE.MeshPhongMaterial({color:0x2a3038,specular:0x9aa8b8,shininess:140,envMap:WETENV,combine:THREE.MixOperation,reflectivity:.6,alphaMap:at,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5});pm.userData.r0=.6;WETM.push(pm);
   const PS=[];for(const r of roads){if(['service','track','pedestrian'].includes(r.c))continue;let acc=7+pr()*10;for(let i=1;i<r.p.length;i++){const [ax,az]=r.p[i-1],[bx,bz]=r.p[i],L=hyp(bx-ax,bz-az);if(L<.01)continue;const ux=(bx-ax)/L,uz=(bz-az)/L;
     while(acc<L){const side=pr()<.5?1:-1,o=(r.w/2-.6-pr()*.8)*side;PS.push([ax+ux*acc-uz*o,az+uz*acc+ux*o,Math.atan2(uz,ux),1.6+pr()*3.2,.7+pr()*1.1]);acc+=9+pr()*22}acc-=L}}
   const pg=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),pu=new THREE.InstancedMesh(pg,pm,PS.length),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),sc=new THREE.Vector3();
   PS.forEach(([x,z,a,l,w],i)=>{mm.compose(v.set(x,.058,z),q.setFromEuler(e.set(0,-a,0)),sc.set(l,1,w));pu.setMatrixAt(i,mm)});pu.computeBoundingSphere();pu.renderOrder=1;scene.add(pu);window.R3DBG&&(R3DBG.puddles=PS.length)}
  LAMPS=LS.map(l=>[l[0]*K,l[1]*K,l[2]]);
  const post=new THREE.InstancedMesh(new THREE.CylinderGeometry(.08,.13,7.6,6),M({color:0x6a6e72}),LAMPS.length),arm=new THREE.InstancedMesh(new THREE.BoxGeometry(1.1,.08,.08),M({color:0x6a6e72}),LAMPS.length);LAMP_HEADS=new THREE.InstancedMesh(new THREE.BoxGeometry(.75,.14,.32),MAT.lampOn,LAMPS.length);
  {const q=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1),v=new THREE.Vector3(),ax=new THREE.Vector3(0,1,0);LAMPS.forEach((l,i)=>{const a=l[2]??0;q.setFromAxisAngle(ax,-a);mm.compose(v.set(l[0],3.8,l[1]),q,one);post.setMatrixAt(i,mm);
    mm.compose(v.set(l[0]+Math.cos(a)*.55,7.55,l[1]+Math.sin(a)*.55),q,one);arm.setMatrixAt(i,mm);mm.compose(v.set(l[0]+Math.cos(a)*1.2,7.5,l[1]+Math.sin(a)*1.2),q,one);LAMP_HEADS.setMatrixAt(i,mm)})}
  for(const m of [post,arm,LAMP_HEADS])m.computeBoundingSphere();post.castShadow=true;scene.add(post,arm,LAMP_HEADS);
  /* night: a soft warm pool of light on the ground under every street lamp (only the 8 nearest get real point lights) */
  {const tx=ctex(128,128,(g,w,h)=>{const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,196,120,1)');r.addColorStop(.35,'rgba(255,170,90,.55)');r.addColorStop(1,'rgba(255,150,70,0)');g.fillStyle=r;g.fillRect(0,0,w,h)},false);
   LAMP_POOL=new THREE.MeshBasicMaterial({map:tx,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,fog:true,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-6});
   const pg=new THREE.PlaneGeometry(11,11);pg.rotateX(-Math.PI/2);const pool=new THREE.InstancedMesh(pg,LAMP_POOL,LAMPS.length),q=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1),v=new THREE.Vector3();
   LAMPS.forEach((l,i)=>{const a=l[2]??0;mm.compose(v.set(l[0]+Math.cos(a)*1.6,.09,l[1]+Math.sin(a)*1.6),q,one);pool.setMatrixAt(i,mm)});pool.computeBoundingSphere();pool.renderOrder=2;pool.visible=false;LAMP_POOL.userData.mesh=pool;scene.add(pool);window.R3DBG&&(R3DBG.lampPools=LAMPS.length,R3DBG.lamps=LAMPS)}
  // street furniture, merged by area
  const fb={},fv=(x,z)=>{const k=tile(x,z);return fb[k]||(fb[k]=VB())};
  // track on top of the viaducts: two running rails and a third (conductor) rail per line, as on the lines out of London Bridge
  {const VH=7;TRL=[];for(const f of WD.rail){const P=pl2(f);let cum=[0];for(let i=1;i<P.length;i++)cum.push(cum[i-1]+hyp(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));if(cum[cum.length-1]>450)TRL.push({P,cum,L:cum[cum.length-1]});
    for(let i=0;i<P.length-1;i++){const [x0,z0]=P[i],[x1,z1]=P[i+1],dx=x1-x0,dz=z1-z0,L=hyp(dx,dz);if(L<.1)continue;const nx=-dz/L,nz=dx/L,mx=(x0+x1)/2,mz=(z0+z1)/2,ry=Math.atan2(-dz,dx),V=fv(mx,mz);
      addBox(V,L,.12,2.5,mx,VH+.06,mz,'#5a4a3e',ry);for(const o of[-.72,.72])addBox(V,L+.02,.16,.08,mx+nx*o,VH+.2,mz+nz*o,'#7a7470',ry);addBox(V,L,.1,.1,mx+nx*1.15,VH+.2,mz+nz*1.15,'#b8b4a8',ry)}}}
  const ang=(x,y)=>{let best=0,bd=1e9;for(let a=0;a<8;a++){const dx=Math.cos(a*PI/8),dy=Math.sin(a*PI/8);let d=0;for(let s=-12;s<=12;s+=4){const t=tAt(x+dx*s,y+dy*s);if(t!=0&&t!=6)d++}if(d<bd){bd=d;best=a*PI/8}}return best};
  for(const [x,y] of D.furn.post||[]){const X=x*K,Z=y*K,V=fv(X,Z);addCyl(V,.28,1.3,X,0,Z,'#c81e24');addCyl(V,.31,.12,X,1.3,Z,'#b01a20');addCyl(V,.18,.1,X,1.42,Z,'#c81e24');addBox(V,.3,.06,.04,X,1.05,Z+.27,'#1a1a1a')}
  // OSM often puts bus stops and signals on the road centreline: move them to the nearest pavement and face them to the road
  const pave=(x,y,max)=>{for(let r=1;r<=max;r+=1)for(let k=0;k<24;k++){const a=k/24*PI*2,X=x+Math.cos(a)*r,Y=y+Math.sin(a)*r,t=tAt(X,Y);if((t==0||t==6)&&!FB[(Y|0)*W+(X|0)]){let rx=X,ry=Y;for(let e=0;e<3;e++){const t2=tAt(rx+Math.cos(a),ry+Math.sin(a));if((t2==0||t2==6)&&!FB[((ry+Math.sin(a))|0)*W+((rx+Math.cos(a))|0)]){rx+=Math.cos(a);ry+=Math.sin(a)}}return{x:rx,y:ry,nx:Math.cos(a),ny:Math.sin(a),r}}}return null};
  const roadDir=(x,y)=>{for(let k=0;k<24;k++){const a=k/24*PI*2,t=tAt(x-Math.cos(a)*3,y-Math.sin(a)*3);if(t==1||t==7)return{nx:Math.cos(a),ny:Math.sin(a)}}return null};
  const busDone=[];
  // things on the pavement go by the kerb, not out in the middle of a wide pavement or plaza
  const kerbSnap=(x,y)=>{let best=null;for(let r=1;r<=16;r++){for(let k=0;k<32;k++){const a=k/32*PI*2,X=x+Math.cos(a)*r,Y=y+Math.sin(a)*r,t=tAt(X,Y);if(t==1||t==7){best=[a,r];break}}if(best)break}if(!best||best[1]<=3)return[x,y];const [a,r]=best,d=r-2.2;const X=x+Math.cos(a)*d,Y=y+Math.sin(a)*d,t=tAt(X,Y);return (t==0||t==6)&&!FB[(Y|0)*W+(X|0)]?[X,Y]:[x,y]};
  for(const [x00,y00] of D.furn.bus||[]){let p;const [x0,y0]=(tAt(x00,y00)==1||tAt(x00,y00)==7)?[x00,y00]:kerbSnap(x00,y00);const t0=tAt(x0,y0);if(t0==1||t0==7)p=pave(x0,y0,22);else{const d=roadDir(x0,y0);p=d?{x:x0,y:y0,...d}:null}if(!p)continue;
    if(busDone.some(b=>hyp(b[0]-p.x,b[1]-p.y)<16))continue;busDone.push([p.x,p.y]);
    const nx=p.nx,nz=p.ny,tx=-nz,tz=nx,ry=Math.atan2(-tz,tx),X=p.x*K+nx*.9,Z=p.y*K+nz*.9,V=fv(X,Z);
    addBox(V,3.2,.08,1.4,X,2.5,Z,'#2a2a30',ry);addBox(V,3.2,2.3,.06,X+nx*.65,1.25,Z+nz*.65,'#9ab8c8',ry);for(const s of [-1.5,1.5])addBox(V,.08,2.5,.08,X+tx*s+nx*.6,1.25,Z+tz*s+nz*.6,'#3a3a40',ry);addBox(V,1.6,.08,.35,X+nx*.4,.45,Z+nz*.4,'#3a3a40',ry);
    const sx=X+tx*2.4-nx*.5,sz=Z+tz*2.4-nz*.5;addBox(V,.07,2.8,.07,sx,1.4,sz,'#3a3a40');addBox(V,.06,.6,.6,sx,2.85,sz,'#d8202a',ry+PI/2)}
  for(const [x0,y0] of (MLY?MLY.sig:D.furn.sig)||[]){const t0=tAt(x0,y0);const p=(t0==1||t0==7)?pave(x0,y0,14):{x:x0,y:y0};if(!p)continue;const X=p.x*K,Z=p.y*K,V=fv(X,Z);addBox(V,.12,3,.12,X,1.5,Z,'#2a2a2a');addBox(V,.32,.95,.3,X,3.2,Z,'#1a1a1a');addBox(V,.2,.18,.06,X,2.95,Z+.16,'#48ff80');addBox(V,.2,.18,.06,X,3.45,Z+.16,'#5a1a1a')}
  if(MLY){
    for(const [x0,y0] of MLY.bin){const p=snap(x0,y0,8);if(!p)continue;const X=p[0]*K,Z=p[1]*K,V=fv(X,Z);addBox(V,.5,.95,.5,X,.48,Z,'#16181a');addBox(V,.54,.1,.54,X,.8,Z,'#b8902e');addBox(V,.56,.06,.56,X,.98,Z,'#22262a')}
    for(const [x0,y0] of MLY.bench){const p=snap(x0,y0,8);if(!p)continue;const X=p[0]*K,Z=p[1]*K,V=fv(X,Z),a=toRoad(p[0],p[1]),ry=a===null?R()*6:-a+PI/2;addBox(V,1.8,.08,.45,X,.45,Z,'#8a6440',ry);addBox(V,1.8,.4,.06,X-Math.cos(a??0)*.22,.7,Z-Math.sin(a??0)*.22,'#8a6440',ry);for(const s of [-.75,.75])addBox(V,.08,.45,.42,X+Math.cos(ry)*s,.22,Z-Math.sin(ry)*s,'#2a2a2a',ry)}
    for(const [x0,y0] of MLY.rack){const p=snap(x0,y0,8);if(!p)continue;const X=p[0]*K,Z=p[1]*K,V=fv(X,Z),a=toRoad(p[0],p[1])??0,ry=-a;for(let k=-1;k<=1;k++){const ox=-Math.sin(a)*k*1,oz=Math.cos(a)*k*1;for(const s of [-.32,.32])addBox(V,.06,.8,.06,X+ox+Math.cos(a)*s,.4,Z+oz+Math.sin(a)*s,'#8a8e92');addBox(V,.7,.06,.06,X+ox,.8,Z+oz,'#8a8e92',ry)}}
    for(const [x0,y0] of MLY.box){const p=snap(x0,y0,8);if(!p)continue;const X=p[0]*K,Z=p[1]*K,V=fv(X,Z),a=toRoad(p[0],p[1])??0;addBox(V,1,1.25,.42,X,.63,Z,'#4a5a4e',-a+PI/2);addBox(V,1.04,.06,.46,X,1.28,Z,'#3a4a3e',-a+PI/2)}
    for(const [x0,y0] of MLY.phone){const p=snap(x0,y0,8);if(!p)continue;const X=p[0]*K,Z=p[1]*K,V=fv(X,Z),k6=y0<300||(x0>1200&&y0<400);
      if(k6){addBox(V,1,2.5,1,X,1.25,Z,'#c8181e');addBox(V,1.06,.3,1.06,X,2.62,Z,'#c8181e');addBox(V,.8,.3,.8,X,2.86,Z,'#c8181e');for(const r of [0,PI/2,PI,PI*1.5]){addBox(V,.7,1.3,.04,X+Math.sin(r)*.51,1.35,Z+Math.cos(r)*.51,'#3a4048',r);addBox(V,.66,.14,.05,X+Math.sin(r)*.52,2.38,Z+Math.cos(r)*.52,'#f0f0e8',r)}}
      else{addBox(V,1.1,2.4,.9,X,1.2,Z,'#3a3e44');addBox(V,1,2,.04,X,1.2,Z+.46,'#9ab0c0');addBox(V,1.14,.2,.94,X,2.45,Z,'#2a2e34')}}
    const s20=ctex(128,128,(g)=>{g.fillStyle='#fff';g.beginPath();g.arc(64,64,62,0,7);g.fill();g.fillStyle='#d8202a';g.beginPath();g.arc(64,64,62,0,7);g.arc(64,64,46,0,7,true);g.fill();g.fillStyle='#111';g.font='900 52px Arial, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('20',64,68)},false);
    const S20=GB();for(const [x0,y0] of MLY.s20){const p=snap(x0,y0,8);if(!p)continue;const X=p[0]*K,Z=p[1]*K,a=toRoad(p[0],p[1])??0,V=fv(X,Z);addBox(V,.08,2.6,.08,X,1.3,Z,'#6a6e72');const tx=-Math.sin(a)*.3,tz=Math.cos(a)*.3,y0_=2.3,y1=2.9,ox=Math.cos(a)*.06,oz=Math.sin(a)*.06;
      quad(S20,[X+tx+ox,y0_,Z+tz+oz],[X-tx+ox,y0_,Z-tz+oz],[X-tx+ox,y1,Z-tz+oz],[X+tx+ox,y1,Z+tz+oz],[Math.cos(a),0,Math.sin(a)],0,1,0,1);quad(S20,[X-tx-ox,y0_,Z-tz-oz],[X+tx-ox,y0_,Z+tz-oz],[X+tx-ox,y1,Z+tz-oz],[X-tx-ox,y1,Z-tz-oz],[-Math.cos(a),0,-Math.sin(a)],0,1,0,1)}
    mesh(S20,new THREE.MeshLambertMaterial({map:s20,transparent:true,alphaTest:.5,side:THREE.DoubleSide}),false);
    // zebra crossings with Belisha beacons
    const ZB=GB();BELISHA.length=0;for(const [zx,zy] of MLY.zebra){let best=null,bd=14;for(const r of WD.r){if(r[2]=='foot'||r[2]=='pedestrian')continue;const f=r[0];for(let i=0;i<f.length-2;i+=2){const x0=f[i],y0=f[i+1],x1=f[i+2],y1=f[i+3],vx=x1-x0,vy=y1-y0,l=vx*vx+vy*vy||1,t=cl(((zx-x0)*vx+(zy-y0)*vy)/l,0,1),d=hyp(x0+vx*t-zx,y0+vy*t-zy);if(d<bd){bd=d;const L=Math.sqrt(l);best={x:x0+vx*t,y:y0+vy*t,ux:vx/L,uy:vy/L,w:r[1]}}}}
      if(!best)continue;const X=best.x*K,Z=best.y*K,ux=best.ux,uz=best.uy,nx=-uz,nz=ux,hw=best.w*K/2-.3;for(let c=-hw;c<hw-.3;c+=1){const a=[X+nx*c-ux*1.5,.07,Z+nz*c-uz*1.5],b=[X+nx*(c+.5)-ux*1.5,.07,Z+nz*(c+.5)-uz*1.5],d2=[X+nx*c+ux*1.5,.07,Z+nz*c+uz*1.5],e2=[X+nx*(c+.5)+ux*1.5,.07,Z+nz*(c+.5)+uz*1.5];quad(ZB,a,b,e2,d2,[0,1,0],0,1,0,1)}
      for(const s of [-1,1]){const bx=X+nx*s*(hw+1.1),bz=Z+nz*s*(hw+1.1),V=fv(bx,bz);for(let k=0;k<6;k++)addBox(V,.12,.45,.12,bx,.22+k*.45,bz,k%2?'#f0f0ea':'#1a1a1a');BELISHA.push([bx,2.95,bz])}}
    mesh(ZB,M2({color:0xf4f2ea,...PO(-4)}),false);
    if(BELISHA.length){const g=new THREE.InstancedMesh(new THREE.SphereGeometry(.24,10,8),BELMAT,BELISHA.length),mm2=new THREE.Matrix4();BELISHA.forEach((b,i)=>{mm2.makeTranslation(b[0],b[1],b[2]);g.setMatrixAt(i,mm2)});g.computeBoundingSphere();scene.add(g)}
    // tactile paving (red blister, controlled crossings) at both kerbs of each zebra, either side of the beacon; Thames Path fingerposts at the way ends
    {const TB=GB(),cv=document.createElement('canvas');cv.width=cv.height=64;const cx=cv.getContext('2d');cx.fillStyle='#d4584a';cx.fillRect(0,0,64,64);cx.fillStyle='#a8382e';for(let a=0;a<4;a++)for(let b=0;b<4;b++){cx.beginPath();cx.arc(8+a*16,8+b*16,3.2,0,7);cx.fill()}
     const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;let nT=0;
     for(const [zx,zy] of MLY.zebra){let best=null,bd=14;for(const r of WD.r){if(r[2]=='foot'||r[2]=='pedestrian')continue;const f=r[0];for(let i2=0;i2<f.length-2;i2+=2){const x0=f[i2],y0=f[i2+1],x1=f[i2+2],y1=f[i2+3],vx=x1-x0,vy=y1-y0,l=vx*vx+vy*vy||1,t=cl(((zx-x0)*vx+(zy-y0)*vy)/l,0,1),d=hyp(x0+vx*t-zx,y0+vy*t-zy);if(d<bd){bd=d;const L=Math.sqrt(l);best={x:x0+vx*t,y:y0+vy*t,ux:vx/L,uy:vy/L,w:r[1]}}}}
      if(!best)continue;const X=best.x*K,Z=best.y*K,ux=best.ux,uz=best.uy,nx=-uz,nz=ux,e=best.w*K/2;
      for(const s2 of[-1,1])for(const o of[-.9,.9]){const cx2=X+ux*o+nx*s2*(e+.55),cz2=Z+uz*o+nz*s2*(e+.55),hu=.42,hn=.55,P=(a,b)=>[cx2+ux*a+nx*b,.085,cz2+uz*a+nz*b];quad(TB,P(-hu,-hn),P(hu,-hn),P(hu,hn),P(-hu,hn),[0,1,0],0,1,0,1);nT++}}
     R3DBG.tactile=nT;if(nT)mesh(TB,M2({map:tx,...PO(-5)}),false);
     const fpS=new Set();let nF=0;for(const r of WD.r.filter(r=>r[3]=='Thames Path'||(r[3]=='Shad Thames'&&r[2]=='pedestrian'))){const p=pl2(r[0]);for(const [k,k2] of[[0,1],[p.length-1,p.length-2]]){const a=p[k],b=p[k2],dx=b[0]-a[0],dz=b[1]-a[1],L=hyp(dx,dz)||1,ux=dx/L,uz=dz/L,X=a[0]-uz*(r[1]*K/2+.5)+ux*1.2,Z=a[1]+ux*(r[1]*K/2+.5)+uz*1.2,V=fv(X,Z),ry=Math.atan2(ux,uz)+PI/2;if(tAt(X/K,Z/K)!=0)continue;{const kk=(X/6|0)+','+(Z/6|0);if(fpS.has(kk))continue;fpS.add(kk)}
       addBox(V,.1,1.9,.1,X,.95,Z,'#2c3a2c',ry);addBox(V,.62,.14,.03,X+ux*.28,1.72,Z+uz*.28,'#e8e6dc',ry);addBox(V,.14,.14,.035,X+ux*.64,1.72,Z+uz*.64,'#e8e6dc',ry+.5);addBox(V,.62,.14,.03,X-ux*.28,1.5,Z-uz*.28,'#e8e6dc',ry+PI);addBox(V,.14,.14,.035,X-ux*.64,1.5,Z-uz*.64,'#e8e6dc',ry+PI+.5);addBox(V,.2,.2,.04,X,2.05,Z,'#5a7a3a',ry);nF++}}R3DBG.fingerposts=nF}
  }
  // parked cars along residential and minor streets, kept clear of junctions, crossings, stops and signals
  {const avoid=[];for(let n=0;n<ADJ.length;n++)if(ADJ[n].length!=2)avoid.push([D.nodes[n][0],D.nodes[n][1],14]);
   if(MLY){for(const z of MLY.zebra)avoid.push([z[0],z[1],16]);for(const z of MLY.sig)avoid.push([z[0],z[1],16])}for(const b of D.furn.bus||[])avoid.push([b[0],b[1],20]);
   const AV={};for(const a of avoid){const k=Math.floor(a[0]/40)+','+Math.floor(a[1]/40);(AV[k]=AV[k]||[]).push(a)}
   const near=(x,y)=>{for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const L=AV[(Math.floor(x/40)+i)+','+(Math.floor(y/40)+j)];if(L)for(const a of L)if(hyp(a[0]-x,a[1]-y)<a[2])return true}return false};
   const cg=(()=>{const V=VB(),L=VB();modernCar(V,L,4.25,1.82,'#ffffff','hatch');for(let k=0;k<L.p.length/3;k++){V.p.push(L.p.a[k*3],L.p.a[k*3+1],L.p.a[k*3+2]);V.n.push(L.n.a[k*3],L.n.a[k*3+1],L.n.a[k*3+2]);V.c.push(L.c.a[k*3]*.6,L.c.a[k*3+1]*.3,L.c.a[k*3+2]*.3)}const g=vgeo(V);g.userData.shared=1;return g})();
   const CC=['#2a2c30','#7c8188','#9aa0a6','#c9ccd0','#f4f4f2','#f4f4f2','#1e2a4a','#2e4a7a','#7a1e22','#5e6e5a','#3a4048','#b8b2a6','#1a1a1e'];const PK={};let np=0;const cmat=new THREE.MeshLambertMaterial({vertexColors:true});
   // keep parked cars out of the lanes the traffic actually drives in
   const LG=new Map();for(const e of EDGES){for(const fw of[true,false]){if(!okDir(e,fw))continue;const off=laneOff(e);for(let q=0;q<=e.len;q+=3){const [x,y,hx,hy]=edgePos(e,q,fw),lx=x+hy*off,ly=y-hx*off,k=(lx>>3)+','+(ly>>3);if(!LG.has(k))LG.set(k,[]);LG.get(k).push(lx,ly)}}}
   const inLane=(px,py)=>{for(let gx=(px>>3)-1;gx<=(px>>3)+1;gx++)for(let gy=(py>>3)-1;gy<=(py>>3)+1;gy++){const L=LG.get(gx+','+gy);if(L)for(let i=0;i<L.length;i+=2)if((L[i]-px)**2+(L[i+1]-py)**2<RAD*RAD)return true}return false};let RAD=3.2;nLane=0;
   for(const r of WD.r){if(!['residential','unclassified','living_street'].includes(r[2])||r[7])continue;const wpx=r[1],ow=!!r[4];if(wpx/1.3<(ow?4.4:7.4))continue;RAD=ow?2.35:3.2;const p=pl2(r[0]),ofs=wpx*K/2-(ow?.85:.95);
     // density from aerial photos (Tanner St): roughly 1 parked car per 15-16 m of kerb, in short runs of bays between yellow lines and dropped kerbs
     for(const sg of [-1,1]){if(R()<.12)continue;let run=1+(R()*4|0),gap=R()*4|0;along(offsetLine(p,sg*ofs),5.6,3+R()*3,(x,z,dx,dz)=>{if(gap>0){gap--;return}if(run<=0){run=2+(R()*4|0);gap=2+(R()*4|0);return}run--;if(R()<.22)return;const px=x/K,py=z/K;if(near(px,py))return;if(inLane(px,py)){nLane++;return}const t=tAt(px,py);if(t!=1)return;
       const k=tile(x,z);(PK[k]=PK[k]||[]).push([x,z,Math.atan2(dz,dx)+(sg>0?PI:0)+(R()-.5)*.06,CC[(R()*CC.length)|0]]);
       const c=Math.cos(Math.atan2(dz,dx)),sn=Math.sin(Math.atan2(dz,dx));for(let a=-1.9;a<=1.9;a+=.475)for(let b=-.6;b<=.6;b+=.3){const X=((x+c*a-sn*b)/K)|0,Y=((z+sn*a+c*b)/K)|0;if(X>=0&&Y>=0&&X<W&&Y<H)FB[Y*W+X]=1}})}}
   const mm2=new THREE.Matrix4(),q2=new THREE.Quaternion(),ax=new THREE.Vector3(0,1,0),one=new THREE.Vector3(1,1,1),v2=new THREE.Vector3(),c2=new THREE.Color();
   for(const k in PK){const L=PK[k],m=new THREE.InstancedMesh(cg,cmat,L.length);L.forEach(([x,z,a,col],i)=>{mm2.compose(v2.set(x,0,z),q2.setFromAxisAngle(ax,-a),one);m.setMatrixAt(i,mm2);m.setColorAt(i,c2.set(col));PKL.push({x:x/K,y:z/K,a,col,m,i,gone:false,n:PKL.length})});m.computeBoundingSphere();m.castShadow=true;m.receiveShadow=true;scene.add(m);np+=L.length}
   window.R3DBG&&(R3DBG.parked=np)}
  for(const [x,y] of D.furn.dock||[]){const X=x*K,Z=y*K,V=fv(X,Z),a=ang(x,y);for(let i=0;i<5;i++){const o=(i-2)*.8,bx=X+Math.cos(-a)*o,bz=Z-Math.sin(-a)*o;addBox(V,.06,.9,1.7,bx,.6,bz,'#d8202a',-a);addBox(V,.1,.1,.4,bx,1.05,bz-.6,'#222',-a)}addBox(V,4.4,.12,.3,X,.06,Z,'#888',-a)}
  for(const [x,y] of D.furn.ev||[]){const X=x*K,Z=y*K,V=fv(X,Z);addBox(V,.4,1.4,.3,X,.7,Z,'#2a7ad8');addBox(V,.3,.3,.04,X,1.1,Z+.16,'#cfe8ff')}
  // front gardens: a low brick wall with black railings and a gate gap at each front door, hedges or a paved yard behind
  {const BRK={stock:'#b0925e',red:'#8e4632',paint:'#e6e0d2'},RG=GB();let ng=0;
   for(const [x0,z0,dx,dz,L,nx,nz,acc,wk] of GARD){const mx=x0+dx*L/2,mz=z0+dz*L/2;let dr=0;for(let s=1;s<=12;s+=.5){const t=tAt((mx+nx*s)/K,(mz+nz*s)/K);if(t==1||t==7){dr=s;break}if(t==2||t==3||t==4)break}
     if(!dr||dr<4.4)continue;const g=Math.min(2.6,dr-2.7);if(g<1.1)continue;const ok=[];for(let t=.25;t<L-.25;t+=.25){const u=((acc+t)%4+4)%4;ok.push(!(u>.38&&u<1.78))}
     let run=null;const flush=(t1)=>{if(!run)return;const a=run,b=t1;if(b-a>.3){const ax=x0+dx*a+nx*g,az=z0+dz*a+nz*g,bx=x0+dx*b+nx*g,bz=z0+dz*b+nz*g,len=b-a,cx=(ax+bx)/2,cz=(az+bz)/2,ry=Math.atan2(-dz,dx),V=fv(cx,cz);
         addBox(V,len,.6,.28,cx,.3,cz,BRK[wk]||'#a88a5c',ry);addBox(V,len,.06,.32,cx,.62,cz,'#d8d0c0',ry);quad(RG,[ax,.62,az],[bx,.62,bz],[bx,1.32,bz],[ax,1.32,az],[nx,0,nz],0,len/1.1,0,1);
         const hedge=(Math.floor(acc/4)%3)!=1;if(hedge)addBox(V,len,.85,Math.min(.9,g-.3),cx-nx*(Math.min(.9,g-.3)/2+.2),.42,cz-nz*(Math.min(.9,g-.3)/2+.2),['#3f6a32','#4a7a3a','#36602c'][Math.floor(acc)%3],ry);
         if(ng==1500)R3DBG.gpos=[cx,cz,nx,nz,dx,dz];for(let k=0;k<=len;k+=.5){const px=((ax+(bx-ax)*k/len)/K)|0,py=((az+(bz-az)*k/len)/K)|0;if(px>=0&&py>=0&&px<W&&py<H){const ii=py*W+px;if(!FB[ii])FLOW[ii]=1;FB[ii]=1}}ng++}run=null};
     ok.forEach((v,i)=>{const t=.25+i*.25;if(v){if(run===null)run=t}else flush(t)});flush(L-.25)}
   mesh(RG,MAT.rail,false);window.R3DBG&&(R3DBG.gardens=ng,R3DBG.parkedSkipped=nLane)}
  // Bermondsey Spa Gardens: low black park railings on a stone kerb, open at every path and gate
  if(WD.fence){const [fp,gp]=WD.fence,RG2=GB(),Q=[];for(let i=0;i<fp.length;i+=2)Q.push([fp[i]*K,fp[i+1]*K]);if(hyp(Q[0][0]-Q[Q.length-1][0],Q[0][1]-Q[Q.length-1][1])>.1)Q.push(Q[0]);
   let A=0;for(let i=0;i<Q.length-1;i++)A+=Q[i][0]*Q[i+1][1]-Q[i+1][0]*Q[i][1];const sg=A>0?1:-1,G2=gp.map(g=>[g[0]*K,g[1]*K]);let nf=0;
   for(let i=0;i<Q.length-1;i++){const [x0,z0]=Q[i],[x1,z1]=Q[i+1],L=hyp(x1-x0,z1-z0);if(L<.3)continue;const dx=(x1-x0)/L,dz=(z1-z0)/L,nx=-dz*sg,nz=dx*sg,ins=.35;
     let run=null;const flush=(a,b)=>{if(b-a<.4)return;const ax=x0+dx*a+nx*ins,az=z0+dz*a+nz*ins,bx=x0+dx*b+nx*ins,bz=z0+dz*b+nz*ins,len=b-a,cx=(ax+bx)/2,cz=(az+bz)/2,ry=Math.atan2(-dz,dx),V=fv(cx,cz);
       addBox(V,len,.16,.3,cx,.08,cz,'#b8b4a8',ry);quad(RG2,[ax,.16,az],[bx,.16,bz],[bx,1.05,bz],[ax,1.05,az],[nx,0,nz],0,len/1.1,0,1);addBox(V,len,.05,.07,cx,1.07,cz,'#1c1c1c',ry);
       for(let k=0;k<=len;k+=.4){const px=((ax+(bx-ax)*k/len)/K)|0,py=((az+(bz-az)*k/len)/K)|0;if(px>=0&&py>=0&&px<W&&py<H){const ii=py*W+px;if(!FB[ii])FLOW[ii]=1;FB[ii]=1}}nf+=len};
     const gate=(x,z)=>{const V=fv(x,z);addBox(V,.22,1.3,.22,x,.65,z,'#1c1c1c');addBox(V,.3,.1,.3,x,1.34,z,'#1c1c1c')};
     let pn=false;for(let t=0;t<=L;t+=.25){const x=x0+dx*t,z=z0+dz*t,near=G2.some(g=>hyp(g[0]-x,g[1]-z)<1.9),bld=!!FB[((z/K)|0)*W+((x/K)|0)];
       if(near!==pn&&t>0)gate(x+nx*ins,z+nz*ins);pn=near;
       if(!(near||bld)){if(run===null)run=t}else if(run!==null){flush(run,t);run=null}}
     if(run!==null)flush(run,L)}
   mesh(RG2,MAT.rail,false);window.R3DBG&&(R3DBG.spaFence=Math.round(nf))}
  // council-estate access decks: concrete walkways with railings along the long side of the brick flats, stair/door openings at street level
  {const RD=GB();for(const [e,h] of DECKS){const {x0,z0,dx,dz,nx,nz,L}=e,ry=Math.atan2(-dz,dx),V=fv(x0,z0),d=1.35;
     for(let y=3.2;y<h-1.5;y+=3.2){const cx=x0+dx*L/2+nx*(d/2),cz=z0+dz*L/2+nz*(d/2);addBox(V,L-.6,.22,d,cx,y,cz,'#b8b4aa',ry);addBox(V,L-.6,.06,.06,x0+dx*L/2+nx*(d-.03),y+1.05,z0+dz*L/2+nz*(d-.03),'#3a3e44',ry);
       quad(RD,[x0+dx*.3+nx*(d-.02),y+.11,z0+dz*.3+nz*(d-.02)],[x0+dx*(L-.3)+nx*(d-.02),y+.11,z0+dz*(L-.3)+nz*(d-.02)],[x0+dx*(L-.3)+nx*(d-.02),y+1.05,z0+dz*(L-.3)+nz*(d-.02)],[x0+dx*.3+nx*(d-.02),y+1.05,z0+dz*.3+nz*(d-.02)],[nx,0,nz],0,(L-.6)/1.1,0,1)}
     for(let u=4;u<L-2;u+=11){const x=x0+dx*u+nx*.06,z=z0+dz*u+nz*.06;addBox(V,1.1,2.2,.08,x,1.1,z,'#3a3028',ry);addBox(V,1.3,.12,.18,x,2.26,z,'#d8d2c4',ry)}}
   mesh(RD,MAT.rail,false);
   // life round the estates: bin stores, bike sheds, benches and the odd little playground on the open ground in front of the deck-access blocks
   {const free=(x,z,r)=>{for(const [a,b] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]]){const px=(x+a)/K,py=(z+b)/K,t=tAt(px,py);if(t==1||t==7||t==3||!camFree(x+a,z+b))return false}return true},mark=(x,z,w,d)=>{for(let a=-w/2;a<=w/2;a+=.4)for(let b=-d/2;b<=d/2;b+=.4){const X=((x+a)/K)|0,Y=((z+b)/K)|0;if(X>=0&&Y>=0&&X<W&&Y<H)FB[Y*W+X]=1}};let ne=0;
    /* planters and the odd bench round the estate-square trees (made in the tree pass above) */
    let np=0;for(const [px,py] of WD._plzt||[]){const x=px*K,z=py*K,V=fv(x,z),h=(Math.imul(px|0,2654435761)>>>0)%6;addBox(V,1.9,.55,1.9,x,.275,z,'#b4b0a6');addBox(V,1.6,.04,1.6,x,.56,z,'#3a2e24');mark(x,z,2,2);np++;
      if(h<3){const a=h*2.1,bx=x+Math.cos(a)*2.4,bz=z+Math.sin(a)*2.4;if(free(bx,bz,1.1)){const ry=-a+PI/2,V2=fv(bx,bz);addBox(V2,1.8,.08,.45,bx,.45,bz,'#8a6440',ry);addBox(V2,1.8,.4,.06,bx+Math.cos(a)*.22,.7,bz+Math.sin(a)*.22,'#8a6440',ry);for(const s of[-.75,.75])addBox(V2,.08,.45,.42,bx+Math.cos(ry)*s,.22,bz-Math.sin(ry)*s,'#2a2a2a',ry);mark(bx,bz,1.8,.6)}}}
    window.R3DBG&&(R3DBG.planters=np);
    DECKS.forEach(([e,h],i)=>{const {x0,z0,dx,dz,nx,nz,L}=e,ry=Math.atan2(-dz,dx),at=(u,o)=>[x0+dx*u+nx*o,z0+dz*u+nz*o];
      {const [x,z]=at(2.5,6.5);if(free(x,z,2.2)){const V=fv(x,z);addBox(V,3.6,2.1,1.8,x,1.05,z,'#6a7068',ry);addBox(V,3.8,.12,2,x,2.16,z,'#4a4e48',ry);for(let k=0;k<3;k++){const [bx,bz]=[x+dx*(-1.1+k*1.1)+nx*1.1,z+dz*(-1.1+k*1.1)+nz*1.1];addBox(V,.75,1.25,1.0,bx,.63,bz,['#2a5a30','#2a2c30','#2a4a8a'][k],ry);addBox(V,.8,.08,1.05,bx,1.28,bz,shadeHex(['#2a5a30','#2a2c30','#2a4a8a'][k],.1),ry)}mark(x,z,4,3);ne++}}
      if(L>30){const [x,z]=at(L-4,7);if(free(x,z,2.5)){const V=fv(x,z);addBox(V,4.2,.08,2.2,x,2.1,z,'#8a9aa0',ry);for(const u of[-2,2])for(const o of[-1,1]){const q=[x+dx*u+nx*o,z+dz*u+nz*o];addBox(V,.08,2.1,.08,q[0],1.05,q[1],'#5a5e64')}for(let k=0;k<4;k++){const q=[x+dx*(-1.5+k)+nx*.2,z+dz*(-1.5+k)+nz*.2];addWheel(V,.33,.04,q[0],.35,q[1],['#c83a3a','#2a6ad8','#2a2a2a','#e8c040'][k])}mark(x,z,4.4,2.4);ne++}}
      {const [x,z]=at(L/2,5.5);if(free(x,z,1.4)){const V=fv(x,z);addBox(V,1.8,.08,.5,x,.45,z,'#8a6a48',ry);addBox(V,1.8,.45,.08,x-nx*.25,.7,z-nz*.25,'#8a6a48',ry);for(const u of[-.75,.75])addBox(V,.08,.45,.45,x+dx*u,.22,z+dz*u,'#3a3e44',ry);ne++}}
      if(i%4==0){const [x,z]=at(L/2,15),P=(u,o)=>[x+dx*u+nx*o,z+dz*u+nz*o];/* equipment laid out along the block's own axes so it sits on the mat; mat corners checked so it never runs onto a road */
        if(free(x,z,5)&&[[-3.5,-3.5],[3.5,-3.5],[-3.5,3.5],[3.5,3.5],[0,3.5],[0,-3.5],[3.5,0],[-3.5,0]].every(([u,o])=>{const q=P(u,o);return free(q[0],q[1],.3)})){const V=fv(x,z);addBox(V,7,.04,7,x,.03,z,'#3a7a6a',ry);(R3DBG.play=R3DBG.play||[]).push([x,z,nx,nz]);
        for(const u of[-1.2,1.2])for(const o of[-.7,.7]){const q=P(-1.6+u,-1.4+o);addBox(V,.1,2.3,.1,q[0],1.15,q[1],'#2a6ad8')}{const q=P(-1.6,-1.4);addBox(V,2.6,.1,.1,q[0],2.3,q[1],'#2a6ad8',ry)}for(const u of[-.6,.6]){const q=P(-1.6+u,-1.4);addBox(V,.03,1.5,.03,q[0],1.5,q[1],'#888');addBox(V,.5,.06,.25,q[0],.75,q[1],'#e83a3a',ry)}
        {const t=P(1.6,1.2),sl=P(1.6,-.1);addBox(V,1.6,1.4,1.6,t[0],.7,t[1],'#e8b020',ry);addBox(V,1.8,.12,1.8,t[0],1.46,t[1],'#2aa860',ry);addBox(V,.5,.08,2.4,sl[0],.75,sl[1],'#e83a3a',ry)}mark(x,z,7,7);ne++}}});
    // bin day: wheelie bins out by some terraced front doors; a builder's skip and scaffolding on the odd house
    let nb=0;GARD.forEach((g,i)=>{const [x0,z0,dx,dz,L,nx,nz]=g;if(L<4)return;const h=(i*2654435761>>>0)%100;if(h<9){const x=x0+dx*L*.25+nx*2.2,z=z0+dz*L*.25+nz*2.2;if(!free(x,z,.5))return;const V=fv(x,z),c=['#2a2c30','#2a5a30','#2a4a8a'][h%3];addBox(V,.6,1.05,.7,x,.53,z,c);addBox(V,.65,.07,.75,x,1.08,z,shadeHex(c,.12));nb++}
      else if(h==50&&L>5){const x=x0+dx*L/2+nx*3.4,z=z0+dz*L/2+nz*3.4;if(free(x,z,1.6)){const V=fv(x,z),ry=Math.atan2(-dz,dx);addFrustum(V,-1.6,1.6,1.5,0,-1.9,1.9,1.8,1.1,'#e8b020');(()=>{})();for(let k=0;k<5;k++)addBox(V,.6,.3,.4,x-1+k*.5,1.05,z+(k%2?.3:-.2),['#b8a88a','#8a6a48','#c8c4bc','#6a4a3a','#a89a8a'][k]);mark(x,z,4,2);nb++}
        const sc=[x0+nx*.9,z0+nz*.9];for(let u=0;u<=L;u+=2.4)for(let y=0;y<=8;y+=2){const q=[x0+dx*u+nx*.9,z0+dz*u+nz*.9];const V=fv(q[0],q[1]);if(y<8)addBox(V,.06,2,.06,q[0],y+1,q[1],'#9aa0a6');addBox(V,2.4,.06,.06,q[0]+dx*1.2,y+1,q[1]+dz*1.2,'#9aa0a6',Math.atan2(-dz,dx));if(y>0)addBox(V,2.4,.05,.7,q[0]+dx*1.2-nx*.3,y,q[1]+dz*1.2-nz*.3,'#8a6a40',Math.atan2(-dz,dx))}}});
    window.R3DBG&&(R3DBG.estate=ne,R3DBG.bins=nb)}
   // newer blocks: a projecting balcony with a glass front at every bay
   const glassM=new THREE.MeshLambertMaterial({color:0x9ab8c8,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}),GG=GB();
   for(const [e,h] of BALC){const {x0,z0,dx,dz,nx,nz,L}=e,ry=Math.atan2(-dz,dx),V=fv(x0,z0);for(let y=3.6;y<h-1.5;y+=3.6)for(let u=1.6;u<L-1.4;u+=4.2){const x=x0+dx*u+nx*.7,z=z0+dz*u+nz*.7;addBox(V,2.4,.16,1.3,x,y,z,'#d4d2cc',ry);
       const ax=x-dx*1.2+nx*.6,az=z-dz*1.2+nz*.6,bx=x+dx*1.2+nx*.6,bz=z+dz*1.2+nz*.6;quad(GG,[ax,y+.08,az],[bx,y+.08,bz],[bx,y+1.1,bz],[ax,y+1.1,az],[nx,0,nz],0,1,0,1);addBox(V,2.4,.05,.05,x+nx*.6,y+1.12,z+nz*.6,'#5a5e64',ry)}}
   {const m=mesh(GG,glassM,false,false)}
   window.R3DBG&&(R3DBG.decks=DECKS.map(([e,h])=>[e.x0+e.dx*e.L/2+e.nx*14,e.z0+e.dz*e.L/2+e.nz*14,e.nx,e.nz,h]),R3DBG.balc=BALC.map(([e,h])=>[e.x0+e.dx*e.L/2+e.nx*14,e.z0+e.dz*e.L/2+e.nz*14,e.nx,e.nz,h]))}
  // park railings: tall black spear-top railings on a stone kerb with square posts round Southwark Park and the other big park greens (Spa Gardens has its own low railings above).
  // Open wherever a footpath, cycle track or road crosses the boundary, with taller gate piers either side; skipped where the edge runs over a road, water or a building. Solid, so people use the gates. No random calls.
  {const PSEG=new Map(),PC=12,addS=(f,hw)=>{for(let i=0;i+3<f.length;i+=2){const x0=f[i]*K,z0=f[i+1]*K,x1=f[i+2]*K,z1=f[i+3]*K;for(let cx=Math.floor(Math.min(x0,x1)/PC);cx<=Math.floor(Math.max(x0,x1)/PC);cx++)for(let cz=Math.floor(Math.min(z0,z1)/PC);cz<=Math.floor(Math.max(z0,z1)/PC);cz++){const k=cx+','+cz;let L=PSEG.get(k);if(!L)PSEG.set(k,L=[]);L.push([x0,z0,x1,z1,hw])}}};
   for(const f of WD.foot||[])addS(f,1.7);for(const f of WD.cyc||[])addS(f,1.8);for(const r of WD.r)addS(r[0],Math.max(2,r[1]*K/2+.8));
   const area=f=>{let a=0;const n=f.length/2;for(let i=0;i<n;i++){const j=(i+1)%n;a+=f[i*2]*f[j*2+1]-f[j*2]*f[i*2+1]}return a/2*K*K};
   const RAILT=MAT.rail.clone();RAILT.side=THREE.DoubleSide;const RG3=GB();let np=0,len3=0;
   WD.green.forEach((f,gi)=>{const A=area(f);if(Math.abs(A)<8000||f.length<8)return;const c0=[0,0];for(let i=0;i<f.length;i+=2){c0[0]+=f[i];c0[1]+=f[i+1]}c0[0]/=f.length/2;c0[1]/=f.length/2;
     if(hyp(c0[0]-1006,c0[1]-1815)<90)return;/* Bermondsey Spa Gardens: already railed */const RH=Math.abs(A)>100000?1.95:1.2;/* tall railings round Southwark Park, lower ones round the smaller greens */
     const Q=[];for(let i=0;i<f.length;i+=2)Q.push([f[i]*K,f[i+1]*K]);if(hyp(Q[0][0]-Q[Q.length-1][0],Q[0][1]-Q[Q.length-1][1])>.1)Q.push(Q[0]);const sg=A>0?1:-1;
     for(let i=0;i<Q.length-1;i++){const [x0,z0]=Q[i],[x1,z1]=Q[i+1],L=hyp(x1-x0,z1-z0);if(L<.3)continue;const dx=(x1-x0)/L,dz=(z1-z0)/L,nx=-dz*sg,nz=dx*sg,ins=.3;
       /* gaps where a path, cycle track or road crosses this edge */
       const gaps=[];for(let t=0;t<=L;t+=PC*.5){const k=Math.floor((x0+dx*t)/PC)+','+Math.floor((z0+dz*t)/PC);for(const [a0,b0,a1,b1,hw] of PSEG.get(k)||[]){const ex=a1-a0,ez=b1-b0,den=dx*ez-dz*ex;if(Math.abs(den)<1e-6)continue;const ox=a0-x0,oz=b0-z0,tt=(ox*ez-oz*ex)/den,ss=(ox*dz-oz*dx)/den;if(tt>=-1&&tt<=L+1&&ss>=-.05&&ss<=1.05){const w=hw/Math.max(.35,Math.abs(den)/hyp(ex,ez));gaps.push([tt-w,tt+w])}}}
       const open=t=>{const x=x0+dx*t+nx*ins,z=z0+dz*t+nz*ins,px=(x/K)|0,py=(z/K)|0,ti=tAt(px,py);return gaps.some(g=>t>g[0]&&t<g[1])||ti==1||ti==7||ti==3||!!FB[py*W+px]};
       let run=null;const flush=(a,b)=>{if(run===null)return;run=null;if(b-a<.6)return;const ax=x0+dx*a+nx*ins,az=z0+dz*a+nz*ins,bx=x0+dx*b+nx*ins,bz=z0+dz*b+nz*ins,len=b-a,cx=(ax+bx)/2,cz=(az+bz)/2,ry=Math.atan2(-dz,dx),V=fv(cx,cz);
         addBox(V,len,.22,.32,cx,.11,cz,'#a8a49a',ry);quad(RG3,[ax,.2,az],[bx,.2,bz],[bx,RH,bz],[ax,RH,az],[nx,0,nz],0,len/(RH>1.5?1.6:1.1),0,1);addBox(V,len,.05,.05,cx,RH-.2,cz,'#15171a',ry);
         for(let k=0;k<=len;k+=2.8){const px=ax+(bx-ax)*k/len,pz=az+(bz-az)*k/len;addBox(V,.09,RH+.05,.09,px,(RH+.05)/2,pz,'#15171a')}
         for(const [qx,qz] of [[ax,az],[bx,bz]]){addBox(V,.34,RH+.35,.34,qx,(RH+.35)/2,qz,'#1a1c20');addBox(V,.42,.12,.42,qx,RH+.38,qz,'#1a1c20')}/* gate piers at each opening */
         for(let k=0;k<=len;k+=.4){const px=((ax+(bx-ax)*k/len)/K)|0,py=((az+(bz-az)*k/len)/K)|0;if(px>=0&&py>=0&&px<W&&py<H)FB[py*W+px]=1}np++;len3+=len};
       let st=0;for(let t=0;t<=L;t+=.25){if(open(t)){if(run!==null)flush(run,t);}else if(run===null)run=t}if(run!==null)flush(run,L)}});
   mesh(RG3,RAILT,false);window.R3DBG&&(R3DBG.parkRails=[np,Math.round(len3)])}
  // Boutcher C of E Primary School (Grange Road, between Bacon Grove and Kintore Way): fenced playground with painted markings, gate, name board, bike shelter and benches
  {const GR=[[862.8,1797.7],[995,1949.3]],gd=(px,py)=>{const [ax,ay]=GR[0],[bx,by]=GR[1],t=cl(((px-ax)*(bx-ax)+(py-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2),0,1);return hyp(px-ax-t*(bx-ax),py-ay-t*(by-ay))},
   ok=(x,z)=>{const px=(x/K)|0,py=(z/K)|0,t=tAt(px,py);return !(t==1||t==7||t==3||FB[py*W+px]||!camFree(x,z))};
   const ang=Math.atan2(1949.3-1797.7,995-862.8),dx=Math.cos(ang),dz=Math.sin(ang),nx=-dz,nz=dx,LW=24,LD=15;let best=null;
   for(let gx=830;gx<=940;gx+=3)for(let gy=1830;gy<=1945;gy+=3){const cx=gx*K,cz=gy*K;let good=true;
     for(let u=-LW/2-1.5;u<=LW/2+1.5&&good;u+=2)for(let o=-LD/2-1.5;o<=LD/2+1.5;o+=2)if(!ok(cx+dx*u+nx*o,cz+dz*u+nz*o)){good=false;break}
     if(good){const sc=hyp(gx-868,gy-1892)+gd(gx,gy)*.3;if(!best||sc<best.sc)best={sc,gx,gy,cx,cz}}}
   window.R3DBG&&(R3DBG.school=best&&[best.gx,best.gy]);
   if(best){const {cx,cz}=best,ry=Math.atan2(-dz,dx),P=(u,o)=>[cx+dx*u+nx*o,cz+dz*u+nz*o],V=fv(cx,cz),side=gd((cx+nx*LD)/K,(cz+nz*LD)/K)<gd((cx-nx*LD)/K,(cz-nz*LD)/K)?1:-1;
    addBox(V,LW,.3,LD,cx,0,cz,'#4c5056',ry);
    /* painted playground markings */
    for(let k=0;k<6;k++){const q=P(-9+k*1.05,-4.6+(k%2?.9:0));addBox(V,.9,.01,.9,q[0],.165,q[1],['#e8c040','#e8c040','#d84040','#2a6ad8','#2aa860','#e8e8e8'][k],ry)}
    {const q=P(3,0);addBox(V,9,.01,.12,q[0],.165,q[1]-nz*0+0,'#e8e8e8',ry);for(const o of[-3.5,3.5]){const r=P(3,o);addBox(V,9,.01,.12,r[0],.165,r[1],'#e8e8e8',ry)}for(const u of[-1.5,7.5]){const r=P(u,0);addBox(V,.12,.01,7,r[0],.165,r[1],'#e8e8e8',ry)}}
    {const q=P(3,0);addBox(V,2.2,.012,2.2,q[0],.17,q[1],'#2a6ad8',ry)}
    for(let k=0;k<4;k++){const q=P(-8+(k%2)*1.9,3.4+(k>>1)*1.9);addBox(V,1.8,.01,1.8,q[0],.165,q[1],['#d84040','#2a6ad8','#e8c040','#2aa860'][k],ry)}
    /* blue railings round the yard, with a gate on the road side */
    const gu=-LW/2+4.5,rail=(a,b,gap)=>{const [x0,z0]=a,[x1,z1]=b,L=hyp(x1-x0,z1-z0),ex=(x1-x0)/L,ez=(z1-z0)/L,rr=Math.atan2(-ez,ex);for(let t=0;t<=L+.01;t+=.16){if(gap&&t>gap[0]&&t<gap[1])continue;addBox(V,.035,1.75,.035,x0+ex*t,.88,z0+ez*t,'#27408b');if(!(gap&&t>gap[0]-.3&&t<gap[1]+.3))addBox(V,.05,.14,.05,x0+ex*t,1.8,z0+ez*t,'#d8b040')}
      for(const y of[.2,1.7])for(let s=0,e=L;s<1;s++){if(gap){addBox(V,gap[0],.05,.05,x0+ex*gap[0]/2,y,z0+ez*gap[0]/2,'#27408b',rr);addBox(V,L-gap[1],.05,.05,x0+ex*(gap[1]+L)/2,y,z0+ez*(gap[1]+L)/2,'#27408b',rr)}else addBox(V,L,.05,.05,(x0+x1)/2,y,(z0+z1)/2,'#27408b',rr)}
      for(let t=0;t<=L+.01;t+=2.4){if(gap&&t>gap[0]-.2&&t<gap[1]+.2)continue;addBox(V,.1,1.95,.1,x0+ex*t,.98,z0+ez*t,'#1c3070')}};
    const c=[P(-LW/2,-LD/2),P(LW/2,-LD/2),P(LW/2,LD/2),P(-LW/2,LD/2)];
    rail(c[0],c[1],side<0?[5,8.4]:null);rail(c[1],c[2]);rail(c[2],c[3],side>0?[LW-8.4,LW-5]:null);rail(c[3],c[0]);
    /* gate leaves, standing open */
    {const gu0=side>0?LW/2-5:-LW/2+5,gq=P(side>0?-LW/2+5:LW/2-5,side*LD/2);}
    const go=P(side>0?(LW/2-6.7):(-LW/2+6.7),side*LD/2);addBox(V,1.6,1.7,.04,go[0],.88,go[1],'#27408b',ry);
    /* name board by the gate */
    const bq=P(side>0?(LW/2-6.7):(-LW/2+6.7),side*(LD/2+.08)),sm=new THREE.MeshLambertMaterial({map:signTex([['BOUTCHER',"bold 56px sans-serif",44],['Church of England Primary School',"28px sans-serif",92]],'#1c3f7a','#ffffff',512,128),side:THREE.DoubleSide}),sg=new THREE.Mesh(new THREE.PlaneGeometry(3.4,.85),sm);sg.position.set(bq[0],2.6,bq[1]);sg.rotation.y=Math.atan2(side*nx,side*nz);scene.add(sg);{const s2=sg.clone();s2.position.set(bq[0]-side*nx*.06,2.6,bq[1]-side*nz*.06);s2.rotation.y+=Math.PI;scene.add(s2)}
    addBox(V,.1,2.2,.1,bq[0]-dx*1.8*side,1.1,bq[1]-dz*1.8*side,'#1c3070');addBox(V,.1,2.2,.1,bq[0]+dx*1.8*side,1.1,bq[1]+dz*1.8*side,'#1c3070');
    /* bike & scooter shelter and two benches */
    {const q=P(LW/2-3,-LD/2+2);for(const a of[-1.6,1.6])for(const b of[-.7,.7]){const r=[q[0]+dx*a+nx*b,q[1]+dz*a+nz*b];addBox(V,.08,2.1,.08,r[0],1.05,r[1],'#5a5e64')}addBox(V,3.6,.08,1.8,q[0],2.12,q[1],'#2a8a5a',ry);for(let k=0;k<5;k++){const r=P(LW/2-4.4+k*.7,-LD/2+1.6);addBox(V,.05,.7,.55,r[0],.4,r[1],['#c83a3a','#2a6ad8','#e8c040','#2aa860','#8a4ac8'][k],ry)}}
    for(const u of[-4,0]){const q=P(u,LD/2-1);addBox(V,1.8,.08,.45,q[0],.45,q[1],'#8a6a48',ry);for(const t of[-.7,.7])addBox(V,.08,.45,.4,q[0]+dx*t,.22,q[1]+dz*t,'#3a3e44',ry)}
    /* a couple of planters of herbs and sunflowers by the railings */
    for(const u of[-LW/2+2,0,LW/2-8]){const q=P(u,-LD/2+.8);addBox(V,1.4,.45,.6,q[0],.23,q[1],'#8a5a3a',ry);for(let k=0;k<5;k++){const r=P(u-.5+k*.25,-LD/2+.8);addBox(V,.2,.5+k%2*.3,.2,r[0],.65,r[1],k%2?'#e8c020':'#3a8a3a',ry)}}
    for(let a=-(LW+2)/2;a<=(LW+2)/2;a+=.4)for(let b=-(LD+2)/2;b<=(LD+2)/2;b+=.4){const X=((cx+dx*a+nx*b)/K)|0,Y=((cz+dz*a+nz*b)/K)|0;if(X>=0&&Y>=0&&X<W&&Y<H)FB[Y*W+X]=1}window.R3DBG&&(R3DBG.schoolSide=side)}}
  // Harris Academy Bermondsey (Southwark Park Road, by Balaclava Road): the school's 3G football pitch on the OSM pitch outline, with markings, goals,
  // tall green ball-court fencing with a gate on the school side, four floodlights, a low brick wall along the road and a navy name board. No random calls.
  {const PC=[[1186,1994],[1143,2036],[1222,2112],[1264,2070]].map(([x,y])=>[x*K,y*K]),cx=PC.reduce((a,q)=>a+q[0],0)/4,cz=PC.reduce((a,q)=>a+q[1],0)/4;
   const lu=hyp(PC[2][0]-PC[1][0],PC[2][1]-PC[1][1]),lv=hyp(PC[0][0]-PC[1][0],PC[0][1]-PC[1][1]),dx=(PC[2][0]-PC[1][0])/lu,dz=(PC[2][1]-PC[1][1])/lu,nx=(PC[0][0]-PC[1][0])/lv,nz=(PC[0][1]-PC[1][1])/lv;
   const ry=Math.atan2(-dz,dx),P=(u,o)=>[cx+dx*u+nx*o,cz+dz*u+nz*o],V=fv(cx,cz),LU=lu-1,LV=lv-1,TU=LU-6,TV=LV-6,WH='#eef2ea',MESH='#2c5a3c';
   /* turf, mown in stripes, and a red run-off margin */
   addBox(V,LU,.1,LV,cx,.03,cz,'#7a4a3a',ry);
   for(let k=0;k<10;k++){const q=P(-TU/2+TU/20+k*TU/10,0);addBox(V,TU/10+.02,.1,TV+2,q[0],.045,q[1],k%2?'#3f8f45':'#47994c',ry)}
   /* markings */
   const ln=(u0,o0,u1,o1)=>{const a=P(u0,o0),b=P(u1,o1),L=hyp(b[0]-a[0],b[1]-a[1]);addBox(V,L+.12,.01,.12,(a[0]+b[0])/2,.1,(a[1]+b[1])/2,WH,Math.atan2(-(b[1]-a[1]),b[0]-a[0]))};
   const box=(u0,o0,u1,o1)=>{ln(u0,o0,u1,o0);ln(u1,o0,u1,o1);ln(u1,o1,u0,o1);ln(u0,o1,u0,o0)};
   box(-TU/2,-TV/2,TU/2,TV/2);ln(0,-TV/2,0,TV/2);
   for(let k=0;k<32;k++){const a0=k/32*PI*2,a1=(k+1)/32*PI*2,r=7;ln(Math.cos(a0)*r,Math.sin(a0)*r,Math.cos(a1)*r,Math.sin(a1)*r)}
   for(const sg of [-1,1]){const g=sg*TU/2;box(g,-12,g-sg*13,12);box(g,-5,g-sg*4.5,5);{const q=P(g-sg*9,0);addBox(V,.3,.012,.3,q[0],.1,q[1],WH,ry)}
     /* goal: posts, crossbar, net frame */
     for(const o of [-3.66,3.66]){const q=P(g+sg*.1,o);addBox(V,.12,2.44,.12,q[0],1.27,q[1],'#ffffff');const r=P(g+sg*1.6,o);addBox(V,1.5,.05,.05,(q[0]+r[0])/2,.1,(q[1]+r[1])/2,'#d8dcdc',ry);addBox(V,.05,2.3,.05,r[0],1.2,r[1],'#d8dcdc')}
     {const q=P(g+sg*.1,0);addBox(V,.12,.12,7.44,q[0],2.5,q[1],'#ffffff',ry);const r=P(g+sg*1.6,0);addBox(V,.05,.05,7.32,r[0],2.35,r[1],'#d8dcdc',ry);for(let o=-3.6;o<=3.6;o+=.45){const t=P(g+sg*.85,o);addBox(V,1.5,.02,.02,t[0],2.42,t[1],'#e4e6e6',ry);const w2=P(g+sg*1.6,o);addBox(V,.02,2.3,.02,w2[0],1.2,w2[1],'#e4e6e6')}}}
   /* tall green ball-court fencing (4.5 m), gate on the school (north-east) side near the east corner */
   const gate=[LU/2-9,LU/2-5],fence=(a,b,gap)=>{const [x0,z0]=a,[x1,z1]=b,L=hyp(x1-x0,z1-z0),ex=(x1-x0)/L,ez=(z1-z0)/L,rr=Math.atan2(-ez,ex);
     for(let t=0;t<=L+.01;t+=.3){if(gap&&t>gap[0]&&t<gap[1])continue;addBox(V,.03,4.5,.03,x0+ex*t,2.25,z0+ez*t,MESH)}
     for(let t=0;t<=L+.01;t+=2.5){if(gap&&t>gap[0]-.2&&t<gap[1]+.2)continue;addBox(V,.1,4.6,.1,x0+ex*t,2.3,z0+ez*t,'#244a30')}
     for(const y of [.15,1.2,2.4,3.5,4.5])if(gap){addBox(V,gap[0],.05,.05,x0+ex*gap[0]/2,y,z0+ez*gap[0]/2,MESH,rr);addBox(V,L-gap[1],.05,.05,x0+ex*(gap[1]+L)/2,y,z0+ez*(gap[1]+L)/2,MESH,rr)}else addBox(V,L,.05,.05,(x0+x1)/2,y,(z0+z1)/2,MESH,rr);
     for(let t=0;t<=L;t+=.25){const PX=((x0+ex*t)/K)|0,PY=((z0+ez*t)/K)|0;if(gap&&t>gap[0]&&t<gap[1])continue;if(PX>=0&&PY>=0&&PX<W&&PY<H)FB[PY*W+PX]=1}};
   const C=[P(-LU/2,-LV/2),P(LU/2,-LV/2),P(LU/2,LV/2),P(-LU/2,LV/2)];
   fence(C[0],C[1]);fence(C[1],C[2]);fence(C[3],C[2],[gate[0]+LU/2,gate[1]+LU/2]);fence(C[3],C[0]);
   /* the gate leaf, standing open */
   {const q=P(LU/2-7,LV/2+1);addBox(V,.05,2.4,2,q[0],1.2,q[1],MESH,ry)}
   /* floodlights at the four corners */
   for(const [su,so] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const q=P(su*(LU/2+.6),so*(LV/2+.6));addBox(V,.3,13,.3,q[0],6.5,q[1],'#8a9096');const h=P(su*(LU/2-.2),so*(LV/2-.2));addBox(V,1.6,.5,.9,h[0],13,h[1],'#5a6066',ry);addBox(V,1.4,.05,.7,h[0],12.73,h[1],'#fff6d8',ry)}
   /* low red-brick wall with a coping along Southwark Park Road (the south-west side) */
   {const a=P(-LU/2,-LV/2-.9),b=P(LU/2,-LV/2-.9);addBox(V,LU,.75,.35,(a[0]+b[0])/2,.38,(a[1]+b[1])/2,'#9a4e3a',ry);addBox(V,LU,.08,.45,(a[0]+b[0])/2,.79,(a[1]+b[1])/2,'#c8c0b0',ry)}
   /* name board on two posts by the road, facing Southwark Park Road */
   {const bq=P(LU/2-6,-LV/2-1.6),sm=new THREE.MeshLambertMaterial({map:signTex([['HARRIS ACADEMY',"bold 60px sans-serif",48],['BERMONDSEY',"bold 36px sans-serif",96]],'#16285c','#ffffff',512,128),side:THREE.DoubleSide}),sg=new THREE.Mesh(new THREE.PlaneGeometry(3.6,.9),sm);
    sg.position.set(bq[0],2.3,bq[1]);sg.rotation.y=Math.atan2(-nx,-nz);scene.add(sg);const s2=sg.clone();s2.position.set(bq[0]+nx*.06,2.3,bq[1]+nz*.06);s2.rotation.y+=PI;scene.add(s2);
    for(const t of [-1.9,1.9])addBox(V,.1,2.8,.1,bq[0]+dx*t,1.4,bq[1]+dz*t,'#16285c')}
   window.R3DBG&&(R3DBG.harris=[Math.round(cx/K),Math.round(cz/K),Math.round(LU),Math.round(LV)])}
  // Tanner Street Park tennis courts: green courts on a red surround, white lines, nets, tall green mesh fence with a gate
  if(WD.tennis&&WD.tennis.length){const cs=WD.tennis.map(pl2),all=cs.flat(),[ux,uz]=(()=>{const a=cs[0][0],b=cs[0][1],L=hyp(b[0]-a[0],b[1]-a[1]);return[(b[0]-a[0])/L,(b[1]-a[1])/L]})(),vx=-uz,vz=ux;
   let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;for(const [x,z] of all){const u=x*ux+z*uz,v=x*vx+z*vz;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v)}u0-=2;u1+=2;v0-=1.5;v1+=1.5;
   const P=(u,v)=>[ux*u+vx*v,vx===0?0:0,uz*u+vz*v],G=GB(),Gc=GB(),Gl=GB(),fl=(GG,a,b,c,d,y)=>{const q=[a,b,c,d].map(([x,z])=>[x,y,z]),cr=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(cr>0)quad(GG,q[0],q[3],q[2],q[1],[0,1,0],0,1,0,1);else quad(GG,q[0],q[1],q[2],q[3],[0,1,0],0,1,0,1)},Q=(u,v)=>{const p=P(u,v);return[p[0],p[2]]};
   fl(G,Q(u0,v0),Q(u1,v0),Q(u1,v1),Q(u0,v1),.1);
   for(const c of cs){const m=c.length;fl(Gc,c[0],c[1],c[2],c[3],.13);const cx=c.reduce((a,p)=>a+p[0],0)/m,cz=c.reduce((a,p)=>a+p[1],0)/m;
     const sh=(p,k)=>[cx+(p[0]-cx)*k,cz+(p[1]-cz)*k],L=c.map(p=>sh(p,.86));for(let i=0;i<4;i++){const a=L[i],b=L[(i+1)%4],dx=b[0]-a[0],dz=b[1]-a[1],l=hyp(dx,dz),nx=-dz/l*.06,nz=dx/l*.06;fl(Gl,[a[0]-nx,a[1]-nz],[b[0]-nx,b[1]-nz],[b[0]+nx,b[1]+nz],[a[0]+nx,a[1]+nz],.16)}
     const e=[[L[0],L[1]],[L[1],L[2]]].sort((p,q)=>hyp(p[0][0]-p[1][0],p[0][1]-p[1][1])-hyp(q[0][0]-q[1][0],q[0][1]-q[1][1]))[0];
     const a=[(L[0][0]+L[1][0])/2,(L[0][1]+L[1][1])/2],b=[(L[2][0]+L[3][0])/2,(L[2][1]+L[3][1])/2],ln=hyp(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/ln,dz=(b[1]-a[1])/ln;
     const nb=hyp(L[0][0]-L[1][0],L[0][1]-L[1][1])<hyp(L[1][0]-L[2][0],L[1][1]-L[2][1])?[L[1],L[2],L[3],L[0]]:L;
     {const m1=[(nb[0][0]+nb[1][0])/2,(nb[0][1]+nb[1][1])/2],m2=[(nb[2][0]+nb[3][0])/2,(nb[2][1]+nb[3][1])/2],V=fv(cx,cz),w=hyp(m2[0]-m1[0],m2[1]-m1[1]);const rN=Math.atan2(-(m2[1]-m1[1]),m2[0]-m1[0])+Math.PI/2,ux2=(m2[0]-m1[0])/w,uz2=(m2[1]-m1[1])/w,hl=(w+.8)/2;/* see-through net: thin cords and posts instead of a solid black slab */for(let y=.12;y<.9;y+=.12)addBox(V,.02,.018,w+.8,cx,y,cz,'#3a3a3a',rN);for(let t=-hl+.5;t<hl;t+=.5)addBox(V,.02,.86,.018,cx+ux2*t,.5,cz+uz2*t,'#3a3a3a',rN);for(const sg of[-1,1])addBox(V,.08,1.07,.08,cx+ux2*hl*sg,.53,cz+uz2*hl*sg,'#2e5a3a',rN);addBox(V,.07,.06,w+.8,cx,.95,cz,'#f4f4f4',Math.atan2(-(m2[1]-m1[1]),m2[0]-m1[0])+Math.PI/2)}}
   mesh(G,M2({color:0xc0503e,...PO(-6)}),false);mesh(Gc,M2({color:0x3f8a62,...PO(-7)}),false);mesh(Gl,M2({color:0xf4f4f0,...PO(-8)}),false);
   const FG=GB(),cr=[Q(u0,v0),Q(u1,v0),Q(u1,v1),Q(u0,v1)],fm=new THREE.MeshLambertMaterial({color:0x2f5a34,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false});
   for(let i=0;i<4;i++){const a=cr[i],b=cr[(i+1)%4],l=hyp(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/l,dz=(b[1]-a[1])/l;let segs=i==0?[[0,l/2-.7],[l/2+.7,l]]:[[0,l]];
     for(const [s0,s1] of segs){quad(FG,[a[0]+dx*s0,0,a[1]+dz*s0],[a[0]+dx*s1,0,a[1]+dz*s1],[a[0]+dx*s1,3.2,a[1]+dz*s1],[a[0]+dx*s0,3.2,a[1]+dz*s0],[-dz,0,dx],0,1,0,1);for(let t=s0;t<=s1+.01;t+=3){const x=a[0]+dx*Math.min(t,s1),z=a[1]+dz*Math.min(t,s1),V=fv(x,z);addBox(V,.08,3.3,.08,x,1.65,z,'#2a4a2e')}
       for(let t=s0;t<=s1;t+=.4){const px=((a[0]+dx*t)/K)|0,py=((a[1]+dz*t)/K)|0;if(px>=0&&py>=0&&px<W&&py<H)FB[py*W+px]=1}}}
   const fmsh=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(F32(FG.p),3)).setAttribute('normal',new THREE.Float32BufferAttribute(F32(FG.n),3)),fm);scene.add(fmsh)}
  // notable places: shopfronts, pub fronts and brand fascias on the real buildings, from photos
  if(WD.fronts){const pip=(x,z,Q)=>{let c=false;for(let i=0,j=Q.length-1;i<Q.length;j=i++){const [xi,zi]=Q[i],[xj,zj]=Q[j];if((zi>z)!=(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c}return c};let nfr=0;
   for(const [nm,px,py,bid,fc,fa,tx,tc,wd,fl,xc] of WD.fronts){const b=WD.b[bid];if(!b)continue;const Q=pl2(b[0]),X=px*K,Z=py*K;let best=null;
     for(let i=0;i<Q.length;i++){const [x0,z0]=Q[i],[x1,z1]=Q[(i+1)%Q.length],L=hyp(x1-x0,z1-z0);if(L<2.5)continue;const dx=(x1-x0)/L,dz=(z1-z0)/L;let nx=dz,nz=-dx;const mx=(x0+x1)/2,mz=(z0+z1)/2;if(pip(mx+nx*.6,mz+nz*.6,Q)){nx=-nx;nz=-nz}
       const ox=mx+nx*3,oz=mz+nz*3,blk=FB[((oz/K)|0)*W+((ox/K)|0)];const t=cl((X-x0)*dx+(Z-z0)*dz,0,L),d=hyp(x0+dx*t-X,z0+dz*t-Z)+(blk?25:0)+(L<wd*.6?6:0);if(!best||d<best.d)best={d,x0,z0,dx,dz,nx,nz,L,t}}
     if(!best)continue;const {x0,z0,dx,dz,nx,nz,L}=best,w=Math.min(wd,L-.3),t0=cl(best.t-w/2,.15,Math.max(.15,L-w-.15)),cx=x0+dx*(t0+w/2)+nx*.12,cz=z0+dz*(t0+w/2)+nz*.12,ry=Math.atan2(-dz,dx),V=fv(cx,cz);
     const at=(u,o,y)=>[cx+dx*u+nx*o,y,cz+dz*u+nz*o],B=(bw,bh,bd,u,o,y,c)=>{const q=at(u,o,y);addBox(V,bw,bh,bd,q[0],q[1],q[2],c,ry)};
     const big=fl.includes('S'),fh=big?1.1:.62,top=big?4.2:3.7,bh=b[1];
     if(fl.includes('P')){const ch=Math.min(bh-2.6,10.5),st='#ece8dc';B(w+2,.22,3.6,0,1.8,.11,'#d8d2c4');B(w+1,.22,2.8,0,1.4,.33,'#e0dace');B(w,.22,2,0,1,.55,'#e6e0d4');
       for(let k=0;k<4;k++){const u=-w/2+1.4+k*(w-2.8)/3,q=at(u,2.0,0);addCyl(V,.55,ch,q[0],.66,q[2],'#f0ece2');for(let f=0;f<8;f++){const a=f/8*Math.PI*2;addBox(V,.05,ch,.05,q[0]+Math.cos(a)*.55,.66+ch/2,q[2]+Math.sin(a)*.55,'#d6d0c2')}addBox(V,1.5,.32,.9,q[0],.66+ch+.16,q[2],'#e8e4d8',ry);addBox(V,1.3,.3,1.3,q[0],.8,q[2],'#e2dccf',ry)}
       B(w+.8,1.5,3.2,0,1.9,.66+ch+1.05,st);B(w+1.2,.25,3.6,0,2.0,.66+ch+1.9,'#e2ddd0');const pb=.66+ch+2.0;for(let k=0;k<7;k++){const ww=(w+1.2)*(1-k/7);B(ww,.38,3.4,0,1.9,pb+.19+k*.38,k?st:'#e2ddd0')}
       B(2.2,3.4,.12,0,.08,2.3,'#202428');B(2.6,.4,.2,0,.1,4.2,'#e2ddd0');for(let u=-w/2-6;u<=w/2+6;u+=.16){if(Math.abs(u)<1.6)continue;const q=at(u,4.6,0);addBox(V,.03,1.1,.03,q[0],.55,q[2],'#1a1a1a')}B(w+12,.06,.06,0,4.6,1.05,'#1a1a1a');B(w+12,.06,.06,0,4.6,.25,'#1a1a1a')}
     if(fl.includes('C')){const bw=Math.min(w,9);B(bw,bh,1.4,0,.7,bh/2,'#b23a2c');for(let y=1.2;y<bh-2;y+=3.1){B(bw*.62,1.3,.1,0,1.42,y+.65,'#2a3038');B(bw*.48,.5,.1,0,1.42,y+1.55,'#2a3038');B(bw*.28,.35,.1,0,1.42,y+1.98,'#2a3038');B(bw+.2,.18,1.6,0,.8,y-.1,'#9a2e22')}}
     if(fl.includes('U')){B(w,3.1,.1,0,.03,1.55,'#5e6a76');for(let u=-w/2+2;u<w/2;u+=2.4)B(.16,3.1,.16,u,.06,1.55,'#d0d2d0');B(w*.22,2.6,.12,w/2-w*.13,.08,1.4,'#2a3038');
       for(let k=0;k<5;k++)B(w*.035,2.2,.13,-w/2+1.4+k*w*.04,.09,1.2,['#e8a020','#3a8ad8','#d84a8a','#5ab84a','#f0d040'][k]);
       B(w+.4,.22,3.2,0,1.6,3.45,'#e8eaec');B(w+.4,.75,.12,0,3.2,3.35,fa);B(.12,.75,3.2,-w/2-.2,1.6,3.35,fa);B(.12,.75,3.2,w/2+.2,1.6,3.35,fa);
       {const sg=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w*.55,13),.55),M({map:signTex([[tx,'800 64px Rubik, system-ui, sans-serif',66]],fa,tc,1536,128)}));const q=at(0,3.27,3.35);sg.position.set(q[0],q[1],q[2]);sg.rotation.y=Math.atan2(nx,nz);scene.add(sg)}
       {const q=at(-w/2+1,.6,bh);addBox(V,.18,4.5,.18,q[0],bh+2.25,q[2],'#8a8e94');const ub=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.7),M({map:signTex([['UNDERGROUND','800 60px Rubik, system-ui, sans-serif',66]],'#1f3a8a','#ffffff',512,128),side:THREE.DoubleSide}));ub.position.set(q[0],bh+4.1,q[2]);ub.rotation.y=Math.atan2(nx,nz)+Math.PI/2;scene.add(ub)}}
     if(fl.includes('W')){B(w+1,.5,6.2,0,3.1,4.35,'#eeece8');for(let k=0;k<5;k++)B(w*.8,.04,.12,0,1.2+k*1.0,4.08,'#ffffff');B(.5,4.1,.5,-w/2+.5,5.8,2.05,'#eeece8');
       B(2.3,3.1,.08,-1.4,.03,1.55,'#d8dcd8');B(2.3,3.1,.08,1.4,.03,1.55,'#d8dcd8');B(.12,3.1,.14,0,.05,1.55,'#8a8e90');B(3.4,3.8,.18,-w/4-1,.1,1.9,xc);B(w*.3,1.0,.1,w*.28,.03,bh-1.3,'#c8d2d6');
       {const sg=new THREE.Mesh(new THREE.PlaneGeometry(1.8,.22),M({map:signTex([[tx.split('').join(' '),'500 46px Rubik, system-ui, sans-serif',66]],'#3a2c26',tc,1024,128)}));const q=at(w/4,.06,2.4);sg.position.set(q[0],q[1],q[2]);sg.rotation.y=Math.atan2(nx,nz);scene.add(sg)}}
     if(fl.includes('N')){B(2.6,3.6,.22,0,.06,1.8,'#d8ccb0');B(1.5,2.7,.12,0,.12,1.35,'#2a1e16');for(let k=0;k<4;k++)B(2.6-k*.5,.3,.24,0,.07,3.75+k*.28,xc);B(w,.9,.08,0,.02,.45,'#3a3634');
       for(const u of[-1.7,1.7]){const q=at(u,.45,0);addCyl(V,.3,.5,q[0],0,q[2],'#8a8680');addBox(V,.5,.9,.5,q[0],.95,q[2],'#2f6a2a');const l=at(u*1.25,.12,3.2);addBox(V,.14,.22,.14,l[0],l[1],l[2],'#ffe2a0')}
       {const sg=new THREE.Mesh(new THREE.PlaneGeometry(3.2,.42),M({map:signTex([[tx,'800 64px Georgia, serif',66]],'rgba(0,0,0,0)',tc,768,128),transparent:true}));const q=at(0,.13,4.45);sg.position.set(q[0],q[1],q[2]);sg.rotation.y=Math.atan2(nx,nz);scene.add(sg)}}
     if(fl.includes('H')){const [cx2,cz2]=cen(Q);for(let k=0;k<6;k++)addBox(V,8.4-k*1.3,.34,7.6-k*1.2,cx2,bh+.17+k*.34,cz2,k?'#3a3d42':'#2e3034',ry);addBox(V,.5,1.2,.5,cx2+dx*1.2,bh+1.6,cz2+dz*1.2,'#e8e0cc',ry);B(w+1.2,bh,.5,0,.25,bh/2,xc);B(w+1.5,.25,.6,0,.3,bh-.1,'#e2dac6');B(1.6,2.7,.08,0,.52,1.35,'#2a2420');B(w,.5,.1,0,.54,3.0,fc);
       {const sg=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.3),M({map:signTex([[tx,'600 56px Georgia, serif',66]],fc,tc,512,128)}));const q=at(0,.6,3.0);sg.position.set(q[0],q[1],q[2]);sg.rotation.y=Math.atan2(nx,nz);scene.add(sg)}
       const hb=at(w/2+.4,1.0,2.9);addBox(V,.5,.4,.5,hb[0],hb[1],hb[2],'#2f6a32');addBox(V,.2,.2,.2,hb[0]+.1,hb[1]+.25,hb[2],'#d84a8a')}
     if(fl.includes('O')){B(w+.6,.55,.5,0,.25,3.9,'#22252a');B(.9,3.6,.3,-w/2+.2,.15,1.8,'#2c3240');B(.9,3.6,.3,w/2-.2,.15,1.8,'#2c3240');B(w-1,3.4,.08,0,.04,1.7,'#3a2a1e');
       for(let u=-w/2+1;u<w/2-.8;u+=1.0){B(.9,2.7,.06,u+.45,.1,1.4,'#c8964e');B(.7,2.1,.07,u+.45,.12,1.6,'#5a4a3a')}
       B(w*.62,6,.2,0,.1,7.2,fc);for(let k=0;k<8;k++)B(.06,6,.22,-w*.31+k*w*.62/8,.11,7.2,'#186a30');B(1.1,6,.9,0,.45,7.2,'#1a1c20');B(.9,5.6,.92,0,.46,7.2,'#c8d8dc');for(let y=4.6;y<10;y+=1.1)B(1.0,.08,.95,0,.47,y,fc);
       B(.4,2.8,.14,w/2-.75,.3,1.6,xc);B(1.3,2.4,.1,-w/2-.3,.06,1.4,fc);B(1.3,2.4,.1,w/2+.4,.06,1.4,fc);for(let u=-w/2+.6;u<w/2;u+=.8){const l=at(u,.2,3.55);addBox(V,.12,.12,.12,l[0],l[1],l[2],'#fff2c0')}
       {const sg=new THREE.Mesh(new THREE.PlaneGeometry(3.4,.55),M({map:signTex([[tx,'900 74px Rubik, system-ui, sans-serif',66]],fa,tc,768,128)}));const q=at(0,.2,3.15);sg.position.set(q[0],q[1],q[2]);sg.rotation.y=Math.atan2(nx,nz);scene.add(sg)}
       for(const u of[-1.1,1.0]){const r=at(u,.2,0);addCyl(V,.33,.04,r[0],.72,r[2],xc);addBox(V,.04,.7,.04,r[0],.36,r[2],'#8ac8a8');for(const d of[-.45,.45]){const k=at(u+d,.2,0);addBox(V,.36,.04,.36,k[0],.46,k[2],xc)}}}
     if(!/[PCUWNHO]/.test(fl)){
     if(!fl.includes('m')){B(.32,top,.28,-w/2+.16,.1,top/2,fc);B(.32,top,.28,w/2-.16,.1,top/2,fc);B(w,.45,.22,0,.06,.22,fc);
       B(w-.64,top-fh-.55,.08,0,.02,.45+(top-fh-.55)/2,fl.includes('L')?'#a27a46':fl.includes('g')?'#6a7e8e':'#56687a');for(let u=-w/2+1.6;u<w/2-.4;u+=1.6)B(.14,top-fh-.55,.12,u,.05,.45+(top-fh-.55)/2,fc);
       B(1.0,2.3,.1,w/2-1.0,.04,1.15,shadeCol(fc,-.25));
       if(fl.includes('g'))for(let u=-w/2+.6;u<w/2-1.6;u+=.38)B(.3,.25+((u*7.3)%1+1)%1*.5,.25,u,-.12,.55,['#e8c040','#d84a3a','#5aa84a','#3a7ad8','#f0f0e8'][Math.abs(Math.round(u*3))%5])}
     if(!fl.includes('m')){B(w+.1,fh,.3,0,.15,top-fh/2,fa);B(w+.25,.1,.45,0,.2,top+.05,shadeCol(fa,-.15))}
     if(tx&&!/[UWNHmO]/.test(fl)){const tw=w-.4,th=fh*.82,sg=new THREE.Mesh(new THREE.PlaneGeometry(tw,th),M({map:(()=>{const serif=/MURANO|Sainsbury|José|TROVE/.test(tx),ital=tx=='José';const cw=Math.min(2048,Math.round(128*tw/th/4)*4),fs=Math.min(92,cw*1.55/Math.max(4,tx.length));return signTex([[tx,(ital?'italic 600 ':serif?'500 ':'800 ')+Math.round(fs*(serif?.8:1))+'px '+(serif?'Georgia, serif':'Rubik, system-ui, sans-serif'),66]],fa,tc,cw,128)})()}));const q=at(0,.31,top-fh/2);sg.position.set(q[0],q[1],q[2]);sg.rotation.y=Math.atan2(nx,nz);scene.add(sg)}
     if(fl.includes('m')){const pk='#e23c9e';B(w+.3,.7,.5,0,.1,bh+.3,pk);B(.8,3,.8,w/2-3,-1,bh+1.5,pk);
       const ex=-w/2+w*.3;B(2.6,6,1.6,ex,.8,3,pk);B(1.6,4.6,.1,ex,1.62,2.4,'#2a2028');B(.9,3.8,.12,ex+.75,1.64,3.6,'#3a1e3a');B(.8,2.8,.13,ex+.75,1.65,3.4,'#c8283a');B(1.6,.3,.14,ex-.3,1.66,4.8,'#f4f0f4');
       for(let u=-w/2+1;u<ex-1.8;u+=.35)B(.12,1.6,.15,u,.06,4.2,'#d88a1e');B(ex+w/2-2,2.6,.12,(-w/2+ex-1.6)/2,.04,1.3,'#4a4a48');
       for(const u of[w*.12,w*.26,w*.4])B(1.4,2.6,.1,u,.04,1.4,'#20283a');for(let u=ex+2;u<w/2-.5;u+=1.2){const q=at(u,1.2,0);addBox(V,.05,1.0,.05,q[0],.5,q[2],'#f0f0ec')}B(w/2-ex-2.2,.06,.06,(w/2+ex+2)/2,1.2,1.0,'#f0f0ec');B(w/2-ex-2.2,.25,1.8,(w/2+ex+2)/2,.9,.12,'#9a948a');
       {const sg=new THREE.Mesh(new THREE.PlaneGeometry(4.2,1.8),M({map:ctex(512,220,g=>{g.clearRect(0,0,512,220);g.lineWidth=14;g.lineCap='round';const st=(c,f)=>{g.strokeStyle=c;g.beginPath();f();g.stroke()};st('#e07040',()=>{g.moveTo(40,70);g.lineTo(170,60);g.moveTo(60,70);g.lineTo(70,200);g.moveTo(55,130);g.lineTo(140,120)});st('#b8a8e8',()=>{g.moveTo(150,40);g.lineTo(290,30);g.moveTo(220,35);g.lineTo(230,180)});st('#6ab8e8',()=>{g.moveTo(290,170);g.bezierCurveTo(300,40,350,40,360,120);g.bezierCurveTo(370,40,430,40,440,150);g.lineTo(480,200)})},false),transparent:true}));const q=at(w*.22,.04,7);sg.position.set(q[0],q[1],q[2]);sg.rotation.y=Math.atan2(nx,nz);scene.add(sg)}
       {const q=at(w*.33,.06,bh-3.2);B(3.6,2.4,.5,w*.33,.0,bh-3.2,'#f4c830');B(3.2,2.0,.1,w*.33,.26,bh-3.2,'#38485a');B(.5,2.6,.6,w*.33+2,.05,bh-3.1,pk)}
       for(let k=0;k<8;k++){const u=-w/2+2+k*(w*.5)/8;B(.8,.9,.1,u,.03,bh-4.5+k*.25,'#2a3a4a');B(.9,1.0,.08,u,.02,bh-4.5+k*.25,'#e8b040')}}
     if(xc&&fl.includes('a'))for(let k=0;k<Math.ceil(w/.5);k++){const u=-w/2+.25+k*.5;if(u>w/2)break;B(.5,.06,1.5,u,.85,top-fh-.25,k%2?xc:fc);B(.5,.3,.05,u,1.6,top-fh-.42,k%2?xc:fc)}
     if(xc&&!fl.includes('a')&&!fl.includes('m'))B(1.0,2.3,.11,w/2-1.0,.05,1.15,xc);
     if(fl.includes('p')){const q=at(-w/2-.1,.8,top+.9);const rn=Math.atan2(-nz,nx);addBox(V,1.2,.06,.06,q[0]-nx*.2,q[1]+.6,q[2]-nz*.2,'#1a1a1a',rn);addBox(V,.9,1.1,.1,q[0],q[1],q[2],fa,rn);addBox(V,.7,.85,.12,q[0],q[1],q[2],tc,rn);
       for(let u=-w/2+.9;u<w/2-.4;u+=Math.max(1.8,w/4)){const r=at(u,.45,top+.25);addBox(V,.55,.4,.55,r[0],r[1],r[2],'#3a7a32');for(const [a,b2,c2] of [[.15,.12,'#e84a6a'],[-.15,-.1,'#f0d040'],[.1,-.18,'#8a4ad8']])addBox(V,.14,.14,.14,r[0]+a,r[1]+.22,r[2]+b2,c2);addBox(V,.02,.4,.02,r[0],r[1]+.4,r[2],'#1a1a1a')}}
     if(fl.includes('V')){B(w+.1,.16,.34,0,.17,top-fh-.1,xc);B(w,.14,.26,0,.13,.5,xc);{const q=at(-w/2+1.2,.33,top-fh/2);addBox(V,.5,.45,.04,q[0],q[1],q[2],'#c8202a',ry)}}
     if(fl.includes('Z')){B(w-.7,top-fh-.5,.1,0,.1,.5+(top-fh-.5)/2,xc);for(let y=.6;y<top-fh;y+=.18)B(w-.7,.03,.12,0,.1,y,shadeCol(xc,-.2))}
     if(fl.includes('k'))for(const u of[-w/2+.7,-w/2+1.5,w/2-1.4,w/2-.6]){const r=at(u,.5,0);addBox(V,.6,.95,.08,r[0],.48,r[2],'#1e2124',ry);addBox(V,.5,.75,.09,r[0],.5,r[2],'#2a2e30',ry)}
     if(fl.includes('b')){const r=at(w/2-1.6,.8,0);addCyl(V,.34,.9,r[0],0,r[2],'#7a4a26');addCyl(V,.36,.06,r[0],.2,r[2],'#3a3a3a');addCyl(V,.36,.06,r[0],.7,r[2],'#3a3a3a')}
     if(fl.includes('f'))for(const u of[-w/2-.5,w/2+.5]){const r=at(u,.6,0);addBox(V,.7,.6,.7,r[0],.3,r[2],'#3a3f44');addBox(V,.9,.9,.9,r[0],1.0,r[2],'#3f7a34')}
     if(fl.includes('t'))for(let u=-w/2+1;u<w/2-.6;u+=2.2){const r=at(u,1.4,0);addCyl(V,.35,.04,r[0],.74,r[2],fl.includes('a')?'#3a2a20':'#2a2a2a');addBox(V,.05,.72,.05,r[0],.36,r[2],'#333');for(const s2 of[-.55,.55]){const k=at(u+s2,1.4,0);addBox(V,.34,.04,.34,k[0],.62,k[2],fl.includes('a')?'#c8202a':'#2a2a2a');addBox(V,.03,.6,.03,k[0],.3,k[2],'#333')}}
     }
     for(let u=-w/2;u<=w/2;u+=.4){const q=at(u,.3,0),qx=(q[0]/K)|0,qz=(q[2]/K)|0;if(qx>=0&&qz>=0&&qx<W&&qz<H)FB[qz*W+qx]=1}
     window.R3DBG&&(R3DBG.fv=R3DBG.fv||[]).push([nm,cx,cz,nx,nz,w]);nfr++}
   window.R3DBG&&(R3DBG.fronts=nfr,R3DBG.fb=(x,z)=>FB[((z/K)|0)*W+((x/K)|0)])}
  for(const [x,y,z,wk,ry] of CHIM){const V=fv(x,z),col=wk=='red'?'#8a4232':wk=='paint'?'#e8e2d4':'#a88a5c';addBox(V,.55,1.7,1,x,y+.2,z,col,ry);addBox(V,.62,.12,1.06,x,y+1.08,z,'#d8d0c0',ry);for(const s of [-.25,.25])addBox(V,.17,.38,.17,x-Math.sin(ry)*s,y+1.32,z-Math.cos(ry)*s,'#c0603a',ry)}
  R3DBG.ties=TIES.map(t=>[t[0]*1.3,t[1]*1.3,t[4]|0,t[7]|0]);
  /* Victorian warehouse wall-tie plates: rows of small dark-red plates between floors (seen as a pattern on Bermondsey Wall East, not copied from any one wall) */
  for(const [x0,z0,dx,dz,L,nx,nz,h] of TIES){const V=fv(x0+dx*L/2,z0+dz*L/2),ry=Math.atan2(nx,nz);let row=0;for(let y=3.4;y<h-1.2;y+=3.6,row++)for(let u=1.6+(row%2)*2.2;u<L-1.2;u+=4.4)addBox(V,.36,.36,.07,x0+dx*u+nx*.035,y,z0+dz*u+nz*.035,'#222020',ry)}
  for(const [x,y,z,nx,nz] of HOIST){const V=fv(x,z);addBox(V,.3,.3,1.6,x+nx*.7,y,z+nz*.7,'#2a2a2a',Math.atan2(nx,nz));addBox(V,.04,1.2,.04,x+nx*1.4,y-.7,z+nz*1.4,'#555');addBox(V,.2,.25,.15,x+nx*1.4,y-1.35,z+nz*1.4,'#333')}
  for(let n=0;n<ADJ.length;n++){if(ADJ[n].length<3)continue;const [jx,jy]=D.nodes[n];for(let k=0;k<4;k++){if(R()<.35)continue;const a=PI/4+k*PI/2;let X=jx,Y=jy,ok=false;for(let r=4;r<26;r+=1.5){X=jx+Math.cos(a)*r;Y=jy+Math.sin(a)*r;const t=tAt(X,Y);if(t==0&&!FB[(Y|0)*W+(X|0)]){ok=true;break}if(t!=1&&t!=7)break}
    if(!ok)continue;X+=Math.cos(a)*1.2;Y+=Math.sin(a)*1.2;const mx=X*K,mz=Y*K,V=fv(mx,mz);addBox(V,.2,.95,.2,mx,.48,mz,'#1a1a1c');addBox(V,.26,.08,.26,mx,.8,mz,'#b89030')}}
  for(const k in fb){const m=vmesh(fb[k]);m.matrixAutoUpdate=false;scene.add(m)}
  landmarks();places();
  // Bell's Cafe kiosk in Bermondsey Spa Gardens
  // Bell's Cafe: grey timber kiosk, dark teal awning with fairy lights, bistro tables with blue and mint chairs
  {const BK=BELLK,cx=BK.x*K,cz=BK.y*K,fx=Math.cos(BK.a),fz=Math.sin(BK.a),sx=-fz,sz=fx,ry=Math.atan2(-sz,sx),V=VB(),Lp=(u,v)=>[cx+fx*u+sx*v,cz+fz*u+sz*v];
   const bx=(w,h,d,u,y,v,c)=>{const [x,z]=Lp(u,v);addBox(V,w,h,d,x,y,z,c,ry)};
   bx(3.8,2.7,2.8,0,1.35,0,'#8e959c');for(let k=0;k<9;k++)bx(3.82,.03,2.82,0,.3+k*.29,0,'#737a82');
   bx(4.4,.12,1.6,1.9,2.62,0,'#1d5254');bx(4.4,.48,.06,2.7,2.4,0,'#1d5254');bx(4.0,.08,.08,2.7,2.14,0,'#163e40');
   bx(2.2,.9,.06,1.42,1.5,.2,'#6a5a48');for(const [c,v] of [['#e03a3a',-.6],['#f2c82a',0],['#3a8ad8',.6]]){bx(.5,.04,.5,1.2,2.05,.2+v,c)}bx(2.7,.08,.5,1.6,.95,.2,'#c8b08a');bx(.9,2.0,.06,1.42,1.0,-1.35,'#3a4048');
   for(let k=0;k<15;k++){const v=-2.1+k*.3,[x,z]=Lp(2.74,v);addBox(V,.06,.06,.06,x,2.12-Math.abs(Math.sin(k*1.1))*.08,z,'#ffe9a0')}
   {const g='#2f9a4a';bx(.06,.04,.9,.2,1.75,-1.9,g);bx(.06,.32,.04,.2,1.6,-2.25,g);bx(.06,.32,.04,.2,1.6,-1.55,g);bx(.06,.28,.28,.2,1.55,-1.6,g);bx(.06,.28,.28,.2,1.55,-2.2,g)}
   bx(.5,.8,.08,3.0,.4,-2.4,'#f2c82a');bx(.44,.3,.09,3.0,.6,-2.4,'#d82a2a');
   for(const [u,v,tc] of [[4.0,-1.2,'#e05a6a'],[4.4,1.0,'#e8e2d8'],[5.8,-.2,'#e05a6a']]){const [x,z]=Lp(u,v);addCyl(V,.38,.04,x,.74,z,tc);addBox(V,.06,.72,.06,x,.36,z,'#9a9aa0');
     for(const [du,dv,cc] of [[.55,0,'#3a7ad8'],[-.55,0,'#8ad8c0'],[0,.6,'#3a7ad8']]){const [qx,qz]=Lp(u+du,v+dv);addBox(V,.38,.05,.38,qx,.45,qz,cc);addBox(V,.38,.4,.05,qx+fx*du*.35+sx*dv*.35,.68,qz+fz*du*.35+sz*dv*.35,cc,Math.atan2(-(du?sz:fz),du?sx:fx));for(const [a,b] of [[.15,.15],[-.15,-.15],[.15,-.15],[-.15,.15]])addBox(V,.03,.45,.03,qx+a,.22,qz+b,cc)}}
   for(const v of [-2.2,2.2]){const [x,z]=Lp(1.2,v);addCyl(V,.25,.4,x,.2,z,'#b0603a');addBox(V,.4,.4,.4,x,.55,z,'#4a8a3a')}
   const m=vmesh(V);scene.add(m);
   for(let u=-1.5;u<=1.5;u+=.25)for(let v=-2;v<=2;v+=.25){const [x,z]=Lp(u,v),px=(x/K)|0,py=(z/K)|0;if(px>=0&&py>=0&&px<W&&py<H)FB[py*W+px]=1}
   {const V2=VB(),bx2=(w,h,d,u,y,v,c)=>{const [x,z]=Lp(u,v);addBox(V2,w,h,d,x,y,z,c,ry)};
   /* Bell's is part of the Ellen Brown Play Centre: a clad link joins the kiosk's back to the end wall of the building, so they read as one building */
   {const BP=WD.b.find(b=>b[4]=='Ellen Brown Bermondsey Play Centre');if(BP){const Q=[];for(let i=0;i<BP[0].length;i+=2)Q.push([BP[0][i]*K,BP[0][i+1]*K]);
     const hitB=(x,z)=>{let c=false;for(let i=0,j=Q.length-1;i<Q.length;j=i++){const [xi,zi]=Q[i],[xj,zj]=Q[j];if((zi>z)!=(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c}return c};
     let best=null;for(const v of [-1,-.5,0,.5,1])for(let d=0;d<8;d+=.1){const [x,z]=Lp(-1.9-d,v);if(hitB(x,z)){if(!best||d>best)best=d;break}}
     if(best!=null&&best>.05){const g=best+.35;bx2(g,2.7,2.8,-1.9-g/2+.02,1.35,0,'#8e959c');for(let k=0;k<9;k++)bx2(g,.03,2.82,-1.9-g/2+.02,.3+k*.29,0,'#737a82');bx2(g+.1,.1,3,-1.9-g/2,2.72,0,'#5e646a');
       for(let u=-1.9-g;u<=-1.9;u+=.25)for(let v=-1.4;v<=1.4;v+=.25){const [x,z]=Lp(u,v),px=(x/K)|0,py=(z/K)|0;if(px>=0&&py>=0&&px<W&&py<H)FB[py*W+px]=1}}
     window.R3DBG&&(R3DBG.bellLink=best);
     /* the small fenced children's play area against the building's north wall, at the cafe end: green turf, a red safety surface, a sandpit, a little slide and a spring rider */
     {const A=[969.2*K,1857*K],B2=[954.8*K,1866*K],L=hyp(B2[0]-A[0],B2[1]-A[1]),ex=(B2[0]-A[0])/L,ez=(B2[1]-A[1])/L;let nx=ez,nz=-ex;{const c=Q.reduce((a,q)=>[a[0]+q[0]/Q.length,a[1]+q[1]/Q.length],[0,0]);if((A[0]-c[0])*nx+(A[1]-c[1])*nz<0){nx=-nx;nz=-nz}}
      const P=(u,o)=>[A[0]+ex*u+nx*o,A[1]+ez*u+nz*o],okc=(x,z)=>{const px=(x/K)|0,py=(z/K)|0,t=tAt(px,py);return (t==0||t==5||t==6)&&!FB[py*W+px]};
      let D2=0;for(let d=3;d<=6.5;d+=.5){let ok=true;for(let u=1;u<=L-1&&ok;u+=.5)for(let o=.6;o<=d+.3;o+=.5)if(!okc(...P(u,o))){ok=false;break}if(ok)D2=d;else break}
      if(D2>=3){const u0=1,u1=Math.min(L-1,u0+9),uc=(u0+u1)/2,oc=(.4+D2)/2,ryp=Math.atan2(-ez,ex),bp=(w,h,d,u,y,o,c)=>{const [x,z]=P(u,o);addBox(V2,w,h,d,x,y,z,c,ryp)};
       bp(u1-u0,.06,D2-.4,uc,.03,oc,'#3f9a4a');bp((u1-u0)*.45,.07,D2-.6,u0+(u1-u0)*.3,.04,oc,'#c8463a');
       {const su=u1-2,so=oc;bp(2.2,.25,2.2,su,.12,so,'#8a6a48');bp(1.9,.06,1.9,su,.26,so,'#e2cd94')}
       {const [x,z]=P(u0+1.6,oc);addBox(V2,.9,1.1,.9,x,.55,z,'#e8c040',ryp);const [x2,z2]=P(u0+1.6,oc+1.3);addBox(V2,.55,.06,1.8,x2,.6,z2,'#2a8ad8',Math.atan2(-ez,ex)+0);addBox(V2,.5,.5,.35,x,1.35,z,'#d83a3a',ryp)}
       {const [x,z]=P(u0+3.6,oc+1);addBox(V2,.12,.5,.12,x,.25,z,'#3a3a40');addBox(V2,.7,.35,.3,x,.65,z,'#2fb070',ryp);addBox(V2,.2,.3,.2,x,.95,z,'#2fb070')}
       const MR='#2f6a3a',rail=(a,b,gap)=>{const [x0,z0]=a,[x1,z1]=b,LL=hyp(x1-x0,z1-z0),dx=(x1-x0)/LL,dz=(z1-z0)/LL,rr=Math.atan2(-dz,dx);for(let t=0;t<=LL+.01;t+=.14){if(gap&&t>gap[0]&&t<gap[1])continue;addBox(V2,.03,1.05,.03,x0+dx*t,.53,z0+dz*t,MR)}
         for(const y of [.1,1.02]){if(gap){addBox(V2,gap[0],.04,.04,x0+dx*gap[0]/2,y,z0+dz*gap[0]/2,MR,rr);addBox(V2,LL-gap[1],.04,.04,x0+dx*(gap[1]+LL)/2,y,z0+dz*(gap[1]+LL)/2,MR,rr)}else addBox(V2,LL,.04,.04,(x0+x1)/2,y,(z0+z1)/2,MR,rr)}
         for(let t=0;t<=LL;t+=.25){if(gap&&t>gap[0]&&t<gap[1])continue;const px=((x0+dx*t)/K)|0,py=((z0+dz*t)/K)|0;if(px>=0&&py>=0&&px<W&&py<H)FB[py*W+px]=1}};
       rail(P(u0,.35),P(u0,D2));rail(P(u0,D2),P(u1,D2),[(u1-u0)/2-.6,(u1-u0)/2+.6]);rail(P(u1,D2),P(u1,.35));
       window.R3DBG&&(R3DBG.bellPlay=[Math.round(u1-u0),D2])}}}}
   scene.add(vmesh(V2))}
   const sg=new THREE.Mesh(new THREE.PlaneGeometry(3.6,.42),M({map:signTex([["BELL'S BREAKFAST",'800 50px Rubik, system-ui, sans-serif',40]],'#1d5254','#ffffff',512,64)}));const [qx,qz]=Lp(2.74,0);sg.position.set(qx,2.42,qz);sg.rotation.y=Math.atan2(fx,fz);scene.add(sg)}
}

/* ---------- landmarks: Tower Bridge, the Tower of London, the Shard and the City ---------- */
const HAZE=[];
function addPyr(V,w,d,h,x,y,z,col,ry=0){_c.set(col);const cs=Math.cos(ry),sn=Math.sin(ry),T=(px,py,pz)=>[x+px*cs+pz*sn,y+py,z-px*sn+pz*cs],b=[T(-w/2,0,-d/2),T(w/2,0,-d/2),T(w/2,0,d/2),T(-w/2,0,d/2)],ap=T(0,h,0);
  for(let i=0;i<4;i++){const p=b[i],q=b[(i+1)%4],ux=q[0]-p[0],uy=q[1]-p[1],uz=q[2]-p[2],vx=ap[0]-p[0],vy=ap[1]-p[1],vz=ap[2]-p[2];let n=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];const l=hyp(...n)||1;n=n.map(v=>v/l);let tri3=[p,q,ap];if(n[1]<0){n=n.map(v=>-v);tri3=[q,p,ap]}
    for(const v of tri3){V.p.push(...v);V.n.push(...n);V.c.push(_c.r,_c.g,_c.b)}}}
function signTex(lines,bg,fg,w,h,font){return ctex(w,h,(g)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';lines.forEach((l,i)=>{g.font=l[1];g.fillText(l[0],w/2,l[2])})},false)}
function bldFor(x,z){let best=null,bd=1e9;for(const b of WD.b){const Q=pl2(b[0]);if(inPoly(x,z,Q))return{Q,b};const d=segD(x,z,[...Q,Q[0]]);if(d<bd){bd=d;best={Q,b}}}return bd<12?best:null}
const manzePt=()=>{const s=D.shops.find(s=>s[0]=='M. Manze');return s?[s[2]*K,s[3]*K]:P.manze?[P.manze.x*K,P.manze.y*K]:null};
function bldAt(x,z,r){let best=null,bd=r;for(const b of WD.b){const Q=pl2(b[0]),c=cen(Q),d=hyp(c[0]-x,c[1]-z);if(d<bd){bd=d;best={Q,b}}}return best}
function facing(Q,pick){let best=null;for(let i=0;i<Q.length;i++){const [x0,z0]=Q[i],[x1,z1]=Q[(i+1)%Q.length],dx=x1-x0,dz=z1-z0,L=hyp(dx,dz);if(L<2.5)continue;let nx=dz/L,nz=-dx/L;if(inPoly((x0+x1)/2+nx*.2,(z0+z1)/2+nz*.2,Q)){nx=-nx;nz=-nz}
  const e={x0,z0,x1,z1,dx:dx/L,dz:dz/L,nx,nz,L,mx:(x0+x1)/2,mz:(z0+z1)/2};const sc=pick(e);if(sc!==null&&(!best||sc>best.sc))best={...e,sc}}return best}
const streetScore=e=>{const t=tAt((e.mx+e.nx*5)/K,(e.mz+e.nz*5)/K);return(t==0||t==1||t==6)?e.L:null};
function plaque(e,tex,w,h,y,off=.12){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),M({map:tex}));m.position.set(e.mx+e.nx*off,y,e.mz+e.nz*off);m.rotation.y=Math.atan2(e.nx,e.nz);scene.add(m);return m}
window.R3DBG={g:0,tries:0,TH,TERR};function places(){const V=VB();
  // M. Manze, Tower Bridge Road: green timber shopfront, black glass fascia with gold lettering
  {const mp=manzePt(),f=mp&&bldFor(mp[0],mp[1]);const e=f&&facing(f.Q,e=>{const s=streetScore(e);return s===null?null:-hyp(e.mx-mp[0],e.mz-mp[1])});
    if(e){R3DBG.manze=[e.mx,e.mz,e.nx,e.nz];const w=Math.min(e.L-.4,7);plaque(e,signTex([['M. MANZE','900 64px Georgia, serif',44],['EEL PIE & MASH','700 22px Georgia, serif',92]],'#111414','#d8b048',512,112),w,1.1,3.5);
      plaque(e,ctex(512,256,(g,W,H)=>{g.fillStyle='#1f4a34';g.fillRect(0,0,W,H);g.fillStyle='#2a3440';g.fillRect(24,20,300,170);g.fillStyle='rgba(255,240,200,.35)';g.fillRect(40,40,120,130);g.fillStyle='#f0e6d0';g.fillRect(30,196,288,6);g.fillStyle='#16201a';g.fillRect(350,20,130,236);g.fillStyle='#d8b048';g.fillRect(452,130,8,8);g.fillStyle='#1f4a34';g.fillRect(24,100,300,6);g.fillRect(172,20,6,170);g.fillStyle='#3a2a20';g.fillRect(0,212,330,44)},false),w,2.95,1.48)}}
  // Kagyu Samye Dzong: the old Bermondsey Public Library, porch of coupled columns, lettering, railings and piers
  {const f=WD.b.find(b=>b[4]=='Kagyu Samye Dzong London');if(f){const Q=pl2(f[0]),e=facing(Q,streetScore);if(e){const cx=e.mx,cz=e.mz,tx=e.dx,tz=e.dz,nx=e.nx,nz=e.nz,ry=Math.atan2(-tz,tx),ST='#e6dcc4';
      for(const s of [-1.9,-1.3,1.3,1.9])addBox(V,.42,4.2,.42,cx+tx*s+nx*1.4,2.1,cz+tz*s+nz*1.4,ST,ry);addBox(V,4.8,.7,1.9,cx+nx*1.1,4.55,cz+nz*1.1,ST,ry);addBox(V,5.2,.25,2.1,cx+nx*1.1,5,cz+nz*1.1,'#d0c6ae',ry);
      addBox(V,1.9,3,.12,cx+nx*.1,1.5,cz+nz*.1,'#3a2a22',ry);addBox(V,.36,.5,.5,cx+nx*.12,3.3,cz+nz*.12,ST,ry);
      plaque(e,signTex([['KAGYU SAMYE DZONG LONDON','700 40px Georgia, serif',36]],'#e6dcc4','#3a3026',768,72),5.4,.5,5.55,1.35);
      for(let s=-e.L/2+.5;s<=e.L/2-.5;s+=.35){if(Math.abs(s)<1.6)continue;addBox(V,.04,1.1,.04,cx+tx*s+nx*2.4,.55,cz+tz*s+nz*2.4,'#151515')}
      for(const s of [-e.L/2+.3,-1.8,1.8,e.L/2-.3])addBox(V,.5,1.4,.5,cx+tx*s+nx*2.4,.7,cz+tz*s+nz*2.4,'#a04a34',ry);
      for(const s of [-1,1])addBox(V,e.L/2-2,.05,.05,cx+tx*s*(e.L/4+.9)+nx*2.4,1.05,cz+tz*s*(e.L/4+.9)+nz*2.4,'#151515',ry)}}}
  // Butlers Wharf: the big painted name on the river front
  {const f=WD.b.find(b=>b[4]=='Butlers Wharf Buildings');if(f){const Q=pl2(f[0]),e=facing(Q,e=>-e.nz*10+e.L*.1);if(e)plaque(e,signTex([['BUTLERS WHARF','900 88px Georgia, serif',60]],'#6a3426','#f4efe4',1024,120),Math.min(e.L*.8,40),4.4,f[1]-3.5,.15)}}
  // St Mary Magdalen: west tower with battlements and pinnacles, on Bermondsey Street
  {const f=WD.b.find(b=>b[4]=='St Mary Magdalen');if(f){const Q=pl2(f[0]);let p=Q[0];for(const q of Q)if(q[0]<p[0])p=q;const c=cen(Q),X=p[0]+(c[0]-p[0])*.18,Z=p[1]+(c[1]-p[1])*.18,ST='#d8cfb8';
      addBox(V,5.4,20,5.4,X,10,Z,ST);addBox(V,5.8,.6,5.8,X,12,Z,'#c8bea6');for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){addBox(V,.7,2.6,.7,X+a*2.4,21.3,Z+b*2.4,ST);addPyr(V,.8,.8,1.2,X+a*2.4,22.6,Z+b*2.4,ST)}
      for(let k=-2;k<=2;k++)for(const s of [-1,1]){addBox(V,.5,.7,.3,X+k*1.1,20.35,Z+s*2.55,ST);addBox(V,.3,.7,.5,X+s*2.55,20.35,Z+k*1.1,ST)}addBox(V,.06,2.5,.06,X,21.2,Z,'#333');addBox(V,.9,.06,.06,X,22.2,Z,'#c8a030');
      for(const s of [-1,1]){addBox(V,.08,2.6,1,X+s*2.72,15,Z,'#3a3430');addBox(V,1,2.6,.08,X,15,Z+s*2.72,'#3a3430')}addWheel(V,.7,.08,X,17.6,Z+2.74,'#e8e0c8')}}
  // Shad Thames: iron gantries criss-crossing the canyon between the warehouses
  if(SHADSEG){const p=SHADSEG;let acc=0,next=6;for(let i=0;i<p.length-1;i++){const [x0,z0]=p[i],[x1,z1]=p[i+1],L=hyp(x1-x0,z1-z0),ux=(x1-x0)/L,uz=(z1-z0)/L,nx=-uz,nz=ux;
      while(next<acc+L){R3DBG.tries++;const t=next-acc,x=x0+ux*t,z=z0+uz*t;let a=0,b=0;for(let s=.5;s<14;s+=.25){if(!a&&!camFree(x+nx*s,z+nz*s))a=s;if(!b&&!camFree(x-nx*s,z-nz*s))b=s}
        R3DBG.last=[a,b];if(a&&b&&a+b<16){R3DBG.g++;(R3DBG.gp=R3DBG.gp||[]).push([Math.round(x/K),Math.round(z/K)]);const span=a+b+.6,cx=x+nx*(a-b)/2,cz=z+nz*(a-b)/2,ry=Math.atan2(-nz,nx),hs=R()<.4?[7.5,13]:[[8,10.5,14,17][R()*4|0]];
          for(const h of hs){addBox(V,span,.25,1.5,cx,h,cz,'#4a5852',ry);for(const s of [-.72,.72]){addBox(V,span,.08,.08,cx+ux*s,h+1.3,cz+uz*s,'#4a5852',ry);addBox(V,span,.5,.04,cx+ux*s,h+.4,cz+uz*s,'#56645e',ry);for(let k=-span/2;k<=span/2;k+=1)addBox(V,.06,1.3,.06,cx+nx*k+ux*s,h+.65,cz+nz*k+uz*s,'#4a5852')}
            addBox(V,span,.08,1.5,cx,h+1.55,cz,'#5a6862',ry)}}
        next+=14+R()*8}acc+=L}}
  // Maltby Street: flags strung over the Ropewalk, and market stalls under the arches
  /* stalls are only up on trading days (an hour either side); the random calls below still run so the shared stream is unchanged */
  const MALTON=marketsOn(1).maltby,BLUEON=marketsOn(1).blue;
  {const r=WD.r.find(r=>r[3]=='Ropewalk');if(r){const p=pl2(r[0]),FL=['#d8202a','#2a5ad8','#f0c030','#2fa86a','#f4f0e8','#e07a2a','#8a3ac8'];let acc=0,nf=2,ns=4,nst=0;
      for(let i=0;i<p.length-1;i++){const [x0,z0]=p[i],[x1,z1]=p[i+1],L=hyp(x1-x0,z1-z0),ux=(x1-x0)/L,uz=(z1-z0)/L,nx=-uz,nz=ux,ry=Math.atan2(-uz,ux);
        while(nf<acc+L){const t=nf-acc,x=x0+ux*t,z=z0+uz*t;addBox(V,.03,.03,7,x,5.2,z,'#222',ry);for(let k=-3;k<=3;k+=.5)addBox(V,.03,.45,.35,x+nx*k,4.9,z+nz*k,FL[(R()*FL.length)|0],ry);nf+=4.5}
        /* a market stall (gazebo): table, legs, striped canopy, plus a peaked roof, valance, cloth skirt on the walk side and a row of produce. No random calls in here, so the shared random stream is unchanged */
        const ST=(t,s,cc,pc)=>{if(!MALTON)return;const x=x0+ux*t+nx*s,z=z0+uz*t+nz*s,sd=Math.sign(s);addBox(V,2.2,.08,1,x,.9,z,'#8a6a48',ry);for(const a of [-1,1])for(const b of [-.45,.45])addBox(V,.06,2.2,.06,x+ux*a+nx*b,1.1,z+uz*a+nz*b,'#666');
          for(let k=0;k<4;k++)addBox(V,.55,.06,1.3,x+ux*(-.82+k*.55),2.25,z+uz*(-.82+k*.55),k%2?'#f4f0e8':cc,ry);addPyr(V,2.3,1.4,.42,x,2.28,z,cc,ry);for(const b of [-.66,.66])addBox(V,2.25,.2,.04,x+nx*b,2.14,z+nz*b,cc,ry);for(const a of [-1.12,1.12])addBox(V,.04,.2,1.35,x+ux*a,2.14,z+uz*a,'#f4f0e8',ry);
          addBox(V,2.2,.82,.03,x-nx*sd*.5,.45,z-nz*sd*.5,cc,ry);addBox(V,2.2,.1,.035,x-nx*sd*.5,.82,z-nz*sd*.5,'#f4f0e8',ry);for(let g=0;g<4;g++)addBox(V,.36,.14,.24,x+ux*(-.75+g*.5)-nx*sd*.38,1.01,z+uz*(-.75+g*.5)-nz*sd*.38,['#e8c040','#d84a2a','#7ab040','#f0e0c0','#c88a4a','#8a3a6a'][(FL.indexOf(cc)+g)%6],ry);addBox(V,1.6,.3,.6,x,1.08,z,pc,ry)};
        while(ns<acc+L){const t=ns-acc,s=R()<.5?2.2:-2.2,cc=FL[(R()*FL.length)|0];ST(t,s,cc,['#e0b060','#c86a3a','#7aa050'][R()*3|0]);if(t+3.6<L-1)ST(t+3.6,-s,FL[(FL.indexOf(cc)+3)%FL.length],'#d8a048');nst++;ns+=7+R()*5}acc+=L}window.R3DBG&&(R3DBG.maltbyStalls=MALTON?nst:0,R3DBG.blueOn=BLUEON)}}
  // Maltby Street: a painted gateway sign where the Ropewalk opens off Maltby Street, up all week so the market reads even when it's shut (no random calls)
  {const r=WD.r.find(r=>r[3]=='Ropewalk'),mb=D.real&&D.real.maltby;if(r&&mb){const p=pl2(r[0]),mx=mb[2]*K,mz=mb[3]*K,e0=hyp(p[0][0]-mx,p[0][1]-mz)<=hyp(p[p.length-1][0]-mx,p[p.length-1][1]-mz),a=e0?p[0]:p[p.length-1],b=e0?p[1]:p[p.length-2],L=hyp(b[0]-a[0],b[1]-a[1])||1,ux=(b[0]-a[0])/L,uz=(b[1]-a[1])/L,nx=-uz,nz=ux,ry=Math.atan2(-uz,ux),X=a[0]+ux*Math.min(6,L*.6),Z=a[1]+uz*Math.min(6,L*.6),GR='#1f4a3a';
    for(const s of [-2.9,2.9]){addBox(V,.16,4.4,.16,X+nx*s,2.2,Z+nz*s,GR,ry);addBox(V,.3,.12,.3,X+nx*s,4.46,Z+nz*s,'#d8b048',ry)}addBox(V,.12,.1,6,X,3.4,Z,GR,ry);
    const tx=signTex([['MALTBY STREET','900 52px Georgia, serif',44],['MARKET  ·  ROPEWALK','700 24px Georgia, serif',94]],'#1f4a3a','#f0e2b8',512,124);
    for(const d of [-1,1]){const m=new THREE.Mesh(new THREE.PlaneGeometry(4.6,1.1),M({map:tx}));m.position.set(X+ux*d*.085,3.95,Z+uz*d*.085);m.rotation.y=Math.atan2(ux*d,uz*d);scene.add(m)}
    addBox(V,.14,1.24,4.74,X,3.95,Z,GR,ry);R3DBG.maltbySign=[Math.round(X/K),Math.round(Z/K)]}}
  // The Blue: the clock tower on stilts clad in shiny embossed tin, oak canopies and the fountain
  {const mp=[2012*K,2162*K],X=mp[0],Z=mp[1],OAK='#b08a5a';
    for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]])addBox(V,.3,6.2,.3,X+a*1,3.1,Z+b*1,OAK);addBox(V,2.4,3.4,2.4,X,7.8,Z,'#c8ccd2');
    const clock=VB();for(const r of [0,PI/2,PI,PI*1.5]){const fx=Math.sin(r),fz=Math.cos(r);addBox(clock,1.5,1.5,.05,X+fx*1.23,8.4,Z+fz*1.23,'#f4f2ea',r);addBox(clock,.08,.6,.06,X+fx*1.27,8.62,Z+fz*1.27,'#111',r);addBox(clock,.45,.08,.06,X+fx*1.27+Math.cos(r)*.18,8.4,Z+fz*1.27-Math.sin(r)*.18,'#111',r)}scene.add(vmesh(clock));
    const tin=new THREE.Mesh(new THREE.ConeGeometry(2.1,2.8,4),new THREE.MeshPhongMaterial({color:0xd8dce2,specular:0xffffff,shininess:120,flatShading:true}));tin.position.set(X,10.9,Z);tin.rotation.y=PI/4;tin.castShadow=true;scene.add(tin);
    addBox(V,3,.55,3,X,.28,Z,'#c8b8a0');addBox(V,2.4,.06,2.4,X,.57,Z,'#5a90c0');
    for(const s of [-1,1]){const cx=X+s*7,cz=Z;for(const [a,b] of [[-3.5,-1.8],[3.5,-1.8],[-3.5,1.8],[3.5,1.8]])addBox(V,.25,3.2,.25,cx+a,1.6,cz+b,OAK);addBox(V,7.6,.15,4,cx,3.25,cz,OAK);addBox(V,7.6,.1,4.2,cx,3.4,cz,'#6a8aa8')}
    for(let k=0;k<6;k++){const a=k/6*PI*2;addBox(V,1.6,.45,.6,X+Math.cos(a)*11,.23,Z+Math.sin(a)*11,'#b04a3a',-a)}
    /* the Blue Market: two rows of gazebo stalls on the Market Place paving south of the clock tower, an aisle between them, a gap left at the zebra crossing.
       Same gazebo as the Maltby Street stalls; deterministic (no random calls, so the shared random stream is unchanged); marked solid so people walk round them */
    {const FLB=['#d8202a','#2a5ad8','#f0c030','#2fa86a','#e07a2a','#8a3ac8','#2aa0a8'],PRB=['#e8c040','#d84a2a','#7ab040','#f0e0c0','#c88a4a','#8a3a6a'],ux=1,uz=0,nx=0,nz=1,ry=0;let nb=0;
     const ok=(cx,cz)=>{if(hyp(cx-X,cz-Z)<13.5||hyp(cx-2020*K,cz-2186*K)<6)return false;for(let a=-1.5;a<=1.5;a+=.5)for(let b=-1;b<=1;b+=.5){const x=cx+a,z=cz+b,t=tAt(x/K,z/K);if((t!=0&&t!=5&&t!=6)||!camFree(x,z))return false}return true};
     for(const [row,sd] of [[2174,-1],[2183,1]])for(let k=0;k<10;k++){const x=(1995+k*5.2)*K,z=row*K;if(!BLUEON||!ok(x,z))continue;const ci=(k*3+(sd>0?1:4))%FLB.length,cc=FLB[ci],pc=PRB[(k+ci)%PRB.length];
       addBox(V,2.2,.08,1,x,.9,z,'#8a6a48',ry);for(const a of [-1,1])for(const b of [-.45,.45])addBox(V,.06,2.2,.06,x+ux*a+nx*b,1.1,z+uz*a+nz*b,'#666');
       for(let q=0;q<4;q++)addBox(V,.55,.06,1.3,x+ux*(-.82+q*.55),2.25,z+uz*(-.82+q*.55),q%2?'#f4f0e8':cc,ry);addPyr(V,2.3,1.4,.42,x,2.28,z,cc,ry);for(const b of [-.66,.66])addBox(V,2.25,.2,.04,x+nx*b,2.14,z+nz*b,cc,ry);for(const a of [-1.12,1.12])addBox(V,.04,.2,1.35,x+ux*a,2.14,z+uz*a,'#f4f0e8',ry);
       addBox(V,2.2,.82,.03,x-nx*sd*.5,.45,z-nz*sd*.5,cc,ry);addBox(V,2.2,.1,.035,x-nx*sd*.5,.82,z-nz*sd*.5,'#f4f0e8',ry);for(let g=0;g<4;g++)addBox(V,.36,.14,.24,x+ux*(-.75+g*.5)-nx*sd*.38,1.01,z+uz*(-.75+g*.5)-nz*sd*.38,PRB[(ci+g)%6],ry);addBox(V,1.6,.3,.6,x,1.08,z,pc,ry);
       for(let a=-1.15;a<=1.15;a+=.4)for(let b=-.6;b<=.6;b+=.4){const PX=((x+a)/K)|0,PY=((z+b)/K)|0;if(PX>=0&&PY>=0&&PX<W&&PY<H)FB[PY*W+PX]=1}nb++}
     window.R3DBG&&(R3DBG.blueStalls=nb)}}
   /* Friday antiques market in Bermondsey Square (6am-2pm): plain trestle stalls under white canopies, only up on market mornings. No random calls, so the shared random stream is unchanged. */
   if(marketsOn(1).antiques){let na=0;const OKA=(x,z)=>{for(let a=-1.5;a<=1.5;a+=.5)for(let b=-1;b<=1;b+=.5){const t=tAt((x+a)/K,(z+b)/K);if((t!=0&&t!=5&&t!=6)||!camFree(x+a,z+b))return false}for(let k=0;k<8;k++){const t=tAt((x+Math.cos(k*PI/4)*5)/K,(z+Math.sin(k*PI/4)*5)/K);if(t==2)return false}return true};
    for(let r=0;r<8;r++)for(let c=0;c<7;c++){const x=(424+c*5.4)*K,z=(1418+r*6)*K;if(na>=22||!OKA(x,z))continue;const CC=['#e8e2d2','#c9d6e0','#e0d0b8'][(r+c)%3];
     addBox(V,2.2,.08,1,x,.9,z,'#7a5a3a');for(const a of [-1,1])for(const b of [-.45,.45]){addBox(V,.06,.9,.06,x+a,.45,z+b,'#555');addBox(V,.05,2.1,.05,x+a*1.05,1.05,z+b*1.15,'#777')}
     addBox(V,2.5,.07,1.7,x,2.15,z,CC);addBox(V,2.5,.2,.04,x,2.04,z+.85,CC);for(let g=0;g<5;g++)addBox(V,.3,.18+(g%3)*.1,.22,x-.8+g*.4,1.05+(g%3)*.05,z,['#c8a860','#8aa0b0','#a8603a','#d8d0c0','#6a7a58'][(g+c)%5]);
     for(let a=-1.2;a<=1.2;a+=.4)for(let b=-.7;b<=.7;b+=.4){const PX=((x+a)/K)|0,PY=((z+b)/K)|0;if(PX>=0&&PY>=0&&PX<W&&PY<H)FB[PY*W+PX]=1}na++}
    window.R3DBG&&(R3DBG.antiqueStalls=na)}
   /* Christmas lights strung across the main streets from 1 December to 5 January */
   if(xmasOn()){const XV=VB(),XC=['#ff3a3a','#ffd23a','#3aff6a','#4aa8ff','#fff2d0'];let ns=0,nb=0;
    for(const nm of ['Bermondsey Street','Tower Bridge Road','Shad Thames','Maltby Street','Jamaica Road']){for(const r of WD.r.filter(r=>r[3]==nm)){const p=pl2(r[0]),w=Math.min(r[1]*K,16);let acc=0,nxt=6;
      for(let i=0;i<p.length-1;i++){const [x0,z0]=p[i],[x1,z1]=p[i+1],L=hyp(x1-x0,z1-z0),ux=(x1-x0)/L,uz=(z1-z0)/L,nx=-uz,nz=ux;
       while(nxt<acc+L){const t=nxt-acc,cx=x0+ux*t,cz=z0+uz*t;for(let k=0;k<=8;k++){const s=(k/8-.5)*(w+1.5),sag=Math.sin(k/8*PI)*.9;addBox(XV,.24,.24,.24,cx+nx*s,5.7-sag,cz+nz*s,XC[(k+ns)%5]);nb++}ns++;nxt+=12}
       acc+=L}}}
    if(XV.p.length){const m=new THREE.Mesh(vgeo(XV),XMAT);m.frustumCulled=false;scene.add(m)}window.R3DBG&&(R3DBG.xmasBulbs=nb)}
  // the Alaska factory (Wallis, Gilbert & Partners, 1932): white facade, Crittall windows, red illuminated ALASKA lettering
  {const f=WD.b.find(b=>{const Q=pl2(b[0]),c=cen(Q);return hyp(c[0]-778*K,c[1]-1842*K)<3});if(f){const Q=pl2(f[0]),e=facing(Q,e=>e.L*.2+e.nx*4-e.nz*6);if(e){const t=signTex([['ALASKA','900 150px Rubik, system-ui, sans-serif',100]],'#f2f0ea','#e0201e',768,190);const m=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(e.L*.7,16),4),new THREE.MeshBasicMaterial({map:t}));m.position.set(e.mx+e.nx*.12,f[1]-3,e.mz+e.nz*.12);m.rotation.y=Math.atan2(e.nx,e.nz);scene.add(m)}
    {const gr=WD.r.filter(r=>r[3]=='Grange Road');let best=null,bd=1e9;const c0=cen(Q);for(const r of gr){const p=pl2(r[0]);for(let i=0;i<p.length-1;i++){const [x0,z0]=p[i],[x1,z1]=p[i+1],vx=x1-x0,vz=z1-z0,l=vx*vx+vz*vz||1,t=cl(((c0[0]-x0)*vx+(c0[1]-z0)*vz)/l,0,1),px=x0+vx*t,pz=z0+vz*t,d=hyp(px-c0[0],pz-c0[1]);if(d<bd){bd=d;const L=Math.sqrt(l);best={px,pz,ux:vx/L,uz:vz/L,w:r[1]*K}}}}
      if(best&&bd<90){let nx=-best.uz,nz=best.ux;if((c0[0]-best.px)*nx+(c0[1]-best.pz)*nz<0){nx=-nx;nz=-nz}const ax=best.px+nx*(best.w/2+3.2),az=best.pz+nz*(best.w/2+3.2),_d=(R3DBG.arch=[ax,az,nx,nz]),ry=Math.atan2(-best.uz,best.ux),BR='#9a5a3e';
        for(const s of [-1,1])addBox(V,1.4,5.2,1.4,ax+best.ux*s*2.6,2.6,az+best.uz*s*2.6,BR,ry);addBox(V,6.6,1.6,1.4,ax,5.2,az,BR,ry);addBox(V,6.8,.3,1.6,ax,6.1,az,'#d8cfb8',ry);addPyr(V,6.8,1.6,1.2,ax,6.25,az,BR,ry);
        for(let k=0;k<7;k++){const a=k/6*PI,xx=Math.cos(a)*1.9,yy=Math.sin(a)*1.1;addBox(V,.6,.5,1.45,ax+best.ux*xx,3.9+yy,az+best.uz*xx,'#b06a4a',ry-a+PI/2)}
        const pl=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.5),new THREE.MeshLambertMaterial({map:signTex([['1869','800 64px Georgia, serif',44]],'#d8cfb8','#3a2a20',192,72)}));pl.position.set(ax+nx*-.72,5.4,az+nz*-.72);pl.rotation.y=Math.atan2(-nx,-nz);scene.add(pl);
        const pl2_=pl.clone();pl2_.position.set(ax+nx*.72,5.4,az+nz*.72);pl2_.rotation.y=Math.atan2(nx,nz);scene.add(pl2_)}}
    const c=cen(Q);addBox(V,7,1.2,7,c[0],f[1]+.6,c[1],'#f2f0ea');addBox(V,7.4,.3,7.4,c[0],f[1]+1.3,c[1],'#dcd8ce')}}
  // St James's Church (James Savage, 1829): Ionic portico at the west end, tower with clock, spire and dragon weathervane
  {const f=WD.b.find(b=>b[4]=='St James');if(f){const Q=pl2(f[0]),h=f[1],e=facing(Q,e=>-e.nx*10+e.L*.05);if(e){const ST='#e0cf9a',ry=Math.atan2(-e.dz,e.dx),tx=e.dx,tz=e.dz,nx=e.nx,nz=e.nz,at=(s,o,y)=>[e.mx+tx*s+nx*o,y,e.mz+tz*s+nz*o];
      for(const s of [-3.3,-1.1,1.1,3.3]){const p=at(s,2.6,0);const C=new THREE.Mesh(new THREE.CylinderGeometry(.38,.45,8.4,10),M({color:0xe0cf9a}));C.position.set(p[0],4.2,p[2]);C.castShadow=true;scene.add(C)}
      {const p=at(0,2.6,0);addBox(V,9.2,.9,3.6,p[0],8.85,p[2],ST,ry);addBox(V,9.6,.3,3.9,p[0],9.45,p[2],'#d4c38e',ry);addBox(V,9,.5,3.4,p[0],.25,p[2],'#c8bc98',ry);
        const g=new THREE.BufferGeometry(),Wd=4.8,Hh=2.4,p0=[-Wd,0,0],p1=[Wd,0,0],p2=[0,Hh,0];g.setAttribute('position',new THREE.Float32BufferAttribute([...p0,...p1,...p2,...p1,...p0,...p2],3));g.computeVertexNormals();const ped=new THREE.Mesh(g,M({color:0xe0cf9a,side:THREE.DoubleSide}));ped.position.set(p[0]+nx*1.8,9.6,p[2]+nz*1.8);ped.rotation.y=Math.atan2(nx,nz);scene.add(ped);
        const rf=new THREE.Mesh(new THREE.BoxGeometry(9.8,.15,3.9),M({color:0x4a4e5a}));rf.position.set(p[0],9.62,p[2]);rf.rotation.y=-ry;rf.position.y=9.62;scene.add(rf)}
      const tp=at(0,-3,0),TX=tp[0],TZ=tp[2];addBox(V,6,8,6,TX,h+4,TZ,'#b89a68',ry);for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]])addBox(V,.5,8,.5,TX+(tx*a+nx*b)*2.8,h+4,TZ+(tz*a+nz*b)*2.8,ST,ry);
      for(const [fx,fz] of [[nx,nz],[-nx,-nz],[tx,tz],[-tx,-tz]]){addBox(V,2.4,2.4,.08,TX+fx*3.04,h+5.2,TZ+fz*3.04,'#1a2a4a',Math.atan2(fx,fz));addBox(V,.12,1,.1,TX+fx*3.1,h+5.5,TZ+fz*3.1,'#d8b040',Math.atan2(fx,fz));addBox(V,.8,.12,.1,TX+fx*3.1,h+5.2,TZ+fz*3.1,'#d8b040',Math.atan2(fx,fz))}
      addBox(V,6.6,.5,6.6,TX,h+8.25,TZ,ST,ry);for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0]])addBox(V,.45,4,.45,TX+(tx*a+nx*b)*2.3,h+10.5,TZ+(tz*a+nz*b)*2.3,ST,ry);addBox(V,4,4,4,TX,h+10.5,TZ,'#2a2a30',ry);addBox(V,5.4,.5,5.4,TX,h+12.75,TZ,ST,ry);
      addBox(V,3.6,3,3.6,TX,h+14.5,TZ,ST,ry);addBox(V,2.6,2.4,2.6,TX,h+17.2,TZ,ST,ry);addPyr(V,2.2,2.2,5,TX,h+18.4,TZ,ST,ry);addBox(V,.08,1.6,.08,TX,h+24.2,TZ,'#d8b040');addBox(V,1.4,.5,.12,TX+.2,h+25,TZ,'#d8b040',ry+.6);addBox(V,.3,.3,.3,TX,h+23.6,TZ,'#d8b040')}}}
  // Anchor Brewhouse: the 1895 boilerhouse chimney and the malt tower cupola
  {const f=WD.b.find(b=>b[4]=='Anchor Brewhouse');if(f){const Q=pl2(f[0]),h=f[1];let w=Q[0],ea=Q[0];for(const q of Q){if(q[0]<w[0])w=q;if(q[0]>ea[0])ea=q}const c=cen(Q),cx=w[0]+(c[0]-w[0])*.3,cz=w[1]+(c[1]-w[1])*.3;
    for(let k=0;k<8;k++){const s=3.2-k*.14;addBox(V,s,5.5,s,cx,h-4+k*5.5+2.75,cz,'#7a4632')}addBox(V,3,.8,3,cx,h+40.4,cz,'#d8cfb8');addBox(V,2.6,1.6,2.6,cx,h+41.6,cz,'#5a3426');
    const ux=ea[0]+(c[0]-ea[0])*.35,uz=ea[1]+(c[1]-ea[1])*.35;addBox(V,5,2,5,ux,h+1,uz,'#7a4632');addBox(V,4,3.2,4,ux,h+3.6,uz,'#e8e4dc');for(let k=-1;k<=1;k++)for(const s of [-1,1]){addBox(V,.25,2.4,.05,ux+k*1.1,h+3.6,uz+s*2.02,'#5a5e66');addBox(V,.05,2.4,.25,ux+s*2.02,h+3.6,uz+k*1.1,'#5a5e66')}
    addPyr(V,4.6,4.6,3.4,ux,h+5.2,uz,'#4a5a5a');addBox(V,.1,2,.1,ux,h+9.2,uz,'#d8b040')}}
  // Southwark Park bandstand: replica of Captain Fowke's 1861 bandstand, iron columns and copper roof
  {const f=WD.b.find(b=>b[4]=='Southwark Park Bandstand');if(f){const [X,Z]=cen(pl2(f[0])),r=4.4,PB='#c8bca8',IR='#1f3a2e';const plinth=new THREE.Mesh(new THREE.CylinderGeometry(r+.4,r+.6,1,8),M({color:0xc8bca8}));plinth.position.set(X,.5,Z);plinth.receiveShadow=true;scene.add(plinth);
    for(let k=0;k<8;k++){const a=k/8*PI*2+PI/8;addBox(V,.18,3.6,.18,X+Math.cos(a)*r,2.8,Z+Math.sin(a)*r,IR);addBox(V,.06,.9,1.2*r*.76,X+Math.cos(a)*r*.98,1.45,Z+Math.sin(a)*r*.98,IR,-a)}
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(r+.35,r+.35,.5,8,1,true),M({color:0x1f3a2e,side:THREE.DoubleSide}));ring.position.set(X,4.85,Z);scene.add(ring);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(r+.7,3.2,8),new THREE.MeshPhongMaterial({color:0x6aa088,specular:0x335544,shininess:40,flatShading:true}));roof.position.set(X,6.7,Z);roof.castShadow=true;scene.add(roof);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(.6,.9,1.2,8),new THREE.MeshPhongMaterial({color:0x6aa088,flatShading:true}));top.position.set(X,8.6,Z);scene.add(top);addBox(V,.1,1.8,.1,X,10,Z,'#d8b040')}}
  // City Hall (Foster + Partners, 2002): the leaning glass egg by Tower Bridge
  {const f=WD.b.find(b=>b[4]=='City Hall');if(f){const [X,Z]=cen(pl2(f[0])),prof=[[0,0],[19,0],[23,6],[25,14],[24.5,22],[22,30],[17.5,37],[11,42],[0,45]].map(([r,y])=>new THREE.Vector2(r,y));
    const t=ctex(512,256,(g,W,H)=>{g.fillStyle='#8aa4b8';g.fillRect(0,0,W,H);g.fillStyle='rgba(30,40,52,.5)';for(let y=0;y<H;y+=12)g.fillRect(0,y,W,3);g.fillStyle='rgba(255,255,255,.12)';for(let x=0;x<W;x+=24)g.fillRect(x,0,2,H)});t.repeat.set(4,6);
    const egg=new THREE.Mesh(new THREE.LatheGeometry(prof,28),new THREE.MeshPhongMaterial({map:t,color:0xd8e4ee,specular:0x99aabb,shininess:70}));egg.position.set(X,0,Z);egg.rotation.z=0;egg.rotation.x=.17;egg.scale.set(1,1,.92);egg.castShadow=true;egg.receiveShadow=true;scene.add(egg)}}
  // HMS Belfast, moored by Tower Bridge, in her Admiralty disruptive camouflage
  {const f=WD.b.find(b=>b[4]=='HMS Belfast');if(f){const o=obb(pl2(f[0]),0);if(o){const L=Math.min(187,o.u1-o.u0),cu=(o.u0+o.u1)/2,cv=(o.v0+o.v1)/2,ry=Math.atan2(-o.uz,o.ux),S=(u,v,y)=>[o.ux*(cu+u)+o.vx*(cv+v),y,o.uz*(cu+u)+o.vz*(cv+v)],B=(u,v,y,w,h,d,col)=>{const p=S(u,v,y);addBox(V,w,h,d,p[0],p[1],p[2],col,ry)};
    const LG='#bcc2c8',MG='#7e8c9a',DG='#465462',DK='#2a2e34',W2=L/2;
    B(0,0,1.5,L*.78,7,19,LG);for(let k=0;k<6;k++){const u=-W2*.75+k*L*.13;B(u,9.55,2,L*.07,5,.1,k%2?MG:DG);B(u+L*.03,-9.55,2,L*.06,5,.1,k%2?DG:MG)}
    for(let k=0;k<5;k++){const s=1-k*.18,u=W2*.78+k*L*.035;B(u,0,1.8+k*.25,L*.04,7.4-k*.1,19*s,k%2?MG:LG)}for(let k=0;k<3;k++){const s=1-k*.25,u=-W2*.78-k*L*.03;B(u,0,1.8,L*.035,6.6,19*s,LG)}
    B(0,0,5.2,L*.92,.3,17,'#8a8680');B(-L*.02,0,8,L*.22,5.5,13,LG);B(L*.06,0,12.5,L*.1,4,10,MG);B(L*.08,0,16,L*.05,3.5,7,LG);
    for(const [u,hh] of [[-L*.04,9],[-L*.13,8.5]]){const p=S(u,0,10);const fn=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.8,hh,10),M({color:0xa8b0b8}));fn.position.set(p[0],10.5+hh/2,p[2]);fn.rotation.z=0;scene.add(fn);B(u,0,10.5+hh+.2,5.2,.4,5.2,DK)}
    for(const [u,y] of [[L*.1,22],[-L*.2,20]]){B(u,0,y/2+8,.5,y,.5,DK);B(u,0,y+6,.3,.3,10,DK)}
    for(const [u,el] of [[L*.33,7.6],[L*.25,9.2],[-L*.27,9.2],[-L*.35,7.6]]){B(u,0,el,9,2.6,8,LG);const d=u>0?1:-1;for(const v of [-2.2,0,2.2])B(u+d*7.5,v,el+.2,7,.4,.4,DK)}
    for(let k=0;k<4;k++)B(-L*.05+k*6-9,8.6,7.5,3,2,2,MG)}}}
  const m=vmesh(V);scene.add(m)}
function landmarks(){
  if(TBT.n&&TBT.s){const V=VB(),[sx,sz]=TBT.s,[nx,nz]=TBT.n,L=hyp(nx-sx,nz-sz),ax=(nx-sx)/L,az=(nz-sz)/L,cx=-az,cz=ax,ry=Math.atan2(-az,ax),ST='#cfc4a8',ST2='#b8ab8c',BL='#4a86c4',RF='#4a5260',DK='#2a2c34',GD='#d8b040';
    const at=(o,a,c)=>[o[0]+ax*a+cx*c,o[1]+az*a+cz*c],bx=(o,a,c,w,h,d,y,col)=>{const p=at(o,a,c);addBox(V,w,h,d,p[0],y,p[1],col,ry)},py=(o,a,c,w,d,h,y,col)=>{const p=at(o,a,c);addPyr(V,w,d,h,p[0],y,p[1],col,ry)};
    for(const T of [TBT.s,TBT.n]){for(const s of [-1,1])bx(T,0,s*13.5,15,17,8,8.5,ST2);bx(T,0,0,15,4,19,17,ST);bx(T,0,0,16,27,30,32.5,ST);
      for(const a of [-6.8,6.8])for(const c of [-14,14]){bx(T,a,c,5,36,5,33,ST);py(T,a,c,5.6,5.6,9,51,RF);bx(T,a,c,.4,1.6,.4,60.6,GD)}
      py(T,0,0,15,27,13,46,RF);bx(T,0,0,1,2.4,1,59.5,GD);bx(T,0,0,16.6,1,30.6,46,ST2);bx(T,0,0,16.4,1,30.4,19.5,ST2);
      for(const sd of [-1,1])for(const c of [-7,0,7]){bx(T,sd*8.05,c,.2,8,2.4,34,DK);bx(T,sd*8.05,c,.2,4,2.4,24,DK)}for(const sd of [-1,1])for(const a of [-3,3])bx(T,a,sd*15.05,2.2,8,.2,34,DK)}
    const mid=[(sx+nx)/2,(sz+nz)/2],gap=L-16;for(const s of [-1,1]){bx(mid,0,s*9,gap,4,3.2,43,'#6a9ac8');bx(mid,0,s*9,gap,.35,3.4,41.1,'#e8eef4');bx(mid,0,s*9,gap,.35,3.4,44.9,'#e8eef4');bx(mid,0,s*9.9,L+170,1.2,.3,.65,BL)}
    const chainMat=M({color:0x3f7fc0});
    for(const [T,dir] of [[TBT.s,-1],[TBT.n,1]]){for(const c of [-10.5,10.5]){const pts=[[0,42],[20,25],[41,12],[62,15],[82,24]].map(([d,y])=>{const p=at(T,dir*(8+d),c);return new THREE.Vector3(p[0],y,p[1])});
        const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.55,5),chainMat);tube.castShadow=true;scene.add(tube);
        for(let d=8;d<80;d+=8){const k=d/82,y=pts[0].y,p=at(T,dir*(8+d),c);const yy=new THREE.CatmullRomCurve3(pts).getPoint(k).y;addBox(V,.15,yy-1,.15,p[0],(yy+1)/2,p[1],BL)}
        const e=at(T,dir*92,c);addBox(V,6,24,6,e[0],12,e[1],ST,ry);addPyr(V,6.6,6.6,6,e[0],24,e[1],RF,ry)}}
    const m=vmesh(V);scene.add(m)}
  // the Tower of London across the river
  {const V=VB(),X=693,Z=-66,WT='#e6dfcc',WL='#b8ae94';addBox(V,36,27,32,X,13.5,Z,WT);for(const [dx,dz] of [[-17,-15],[17,-15],[-17,15],[17,15]]){addBox(V,6,33,6,X+dx,16.5,Z+dz,WT);addPyr(V,6.4,6.4,4,X+dx,33,Z+dz,'#5a6066');addBox(V,.3,2,.3,X+dx,38,Z+dz,'#d8b040')}
   for(let k=0;k<5;k++)for(const s of [-1,1]){addBox(V,2,6,.2,X-12+k*6,18,Z+s*16.05,'#3a3430');addBox(V,.2,6,2,X+s*18.05,18,Z-12+k*6,'#3a3430')}
   for(const s of [-1,1]){addBox(V,124,10,4,X,5,Z+s*60,WL);addBox(V,4,10,124,X+s*60,5,Z,WL);for(const t of [-1,1]){addBox(V,10,13,10,X+s*60,6.5,Z+t*60,WL)}}
   const m=vmesh(V);m.position.y=0;scene.add(m)}
  // skyline: the Shard and the City cluster, hazy in the distance
  const glass=(col,k)=>{const m=new THREE.MeshPhongMaterial({color:col,specular:0x667788,shininess:60,fog:false,flatShading:true}),u={hz:{value:new THREE.Color(0xb8c8dc)},hk:{value:k}};HAZE.push(u);
    m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying float vWY;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWY=(modelMatrix*vec4(transformed,1.0)).y;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vWY;uniform vec3 hz;uniform float hk;').replace('#include <fog_fragment>','gl_FragColor.rgb=mix(gl_FragColor.rgb,hz,max(hk,1.0-smoothstep(0.0,90.0,vWY)));\n#include <fog_fragment>')};return m};
  const add=(geo,mat,x,z,ry=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,0,z);m.rotation.y=ry;scene.add(m);return m};
  {const g=new THREE.ConeGeometry(34,310,8,1,true);g.translate(0,155,0);add(g,glass(0x8ea4b8,.24),-35,332,.2);const t=new THREE.ConeGeometry(7,26,8,1,true);t.translate(0,300,0);add(t,glass(0xb8c8d6,.24),-33,330,.6)}
  const lathe=(prof,col,k,x,z)=>add(new THREE.LatheGeometry(prof.map(([r,y])=>new THREE.Vector2(r,y)),16),glass(col,k),x,z);
  lathe([[0,0],[24,0],[28,40],[27,90],[22,140],[12,170],[0,182]],0x2f4a5a,.5,397,-774);
  {const g=new THREE.CylinderGeometry(34,22,160,4);g.translate(0,80,0);add(g,glass(0x8a9aa8,.34),166,-420,PI/4+.3)}
  {const g=new THREE.CylinderGeometry(8,38,225,4);g.translate(0,112,0);add(g,glass(0xa8b0b8,.4),284,-708,PI/4)}
  {const g=new THREE.CylinderGeometry(26,30,278,8);g.translate(0,139,0);add(g,glass(0x7a8898,.44),159,-774)}
  {const g=new THREE.CylinderGeometry(10,24,190,4);g.translate(0,95,0);add(g,glass(0x6a8090,.4),409,-630,.5)}
  {const g=new THREE.CylinderGeometry(22,22,183,8);g.translate(0,91,0);add(g,glass(0x5a5e66,.46),152,-862)}
  for(let i=0;i<14;i++){const h=50+R()*90,g=new THREE.BoxGeometry(30+R()*30,h,30+R()*30);g.translate(0,h/2,0);add(g,glass([0x8090a0,0x9aa4ac,0x707c88][i%3],.47),60+R()*420,-500-R()*380,R())}
}

/* ---------- people, dogs and vehicles ---------- */
/* smooth low-poly lofts for people: rings=[[y,rx,rz,ox,oz]] (elliptical cross-sections, x forward, z across), per-vertex normals for soft shading */
function addLoft(V,R,col,S=10){_c.set(col);const P=R.map(([y,rx,rz,ox=0,oz=0])=>{const o=[];for(let j=0;j<S;j++){const a=j/S*PI*2;o.push([ox+Math.cos(a)*rx,y,oz+Math.sin(a)*rz])}return o}),n=R.length,
  N=P.map((ring,i)=>ring.map((p,j)=>{const u=P[i][(j+1)%S].map((v,k)=>v-P[i][(j+S-1)%S][k]),v=P[Math.min(n-1,i+1)][j].map((q,k)=>q-P[Math.max(0,i-1)][j][k]);let c=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const cx=R[i][3]||0,cz=R[i][4]||0,out=[p[0]-cx,0,p[2]-cz];if(c[0]*out[0]+c[2]*out[2]<0)c=c.map(q=>-q);const l=Math.hypot(...c)||1;return c.map(q=>q/l)}));
  const put=(i,j)=>{V.p.push(...P[i][j%S]);V.n.push(...N[i][j%S]);V.c.push(_c.r,_c.g,_c.b)};
  for(let i=0;i<n-1;i++){const up=R[i+1][0]>R[i][0];for(let j=0;j<S;j++){const q=[[i,j],[i,j+1],[i+1,j+1],[i+1,j]];for(const k of (up?[0,2,1,0,3,2]:[0,1,2,0,2,3]))put(...q[k])}}
  for(const [i,s] of [[0,-1],[n-1,1]]){const y=R[i][0],c=[R[i][3]||0,y,R[i][4]||0],dir=(i==0?(R[1][0]>y?-1:1):(R[i-1][0]<y?1:-1));for(let j=0;j<S;j++){const a=P[i][j],b=P[i][(j+1)%S],tr=dir>0?[c,b,a]:[c,a,b];for(const v of tr){V.p.push(...v);V.n.push(0,dir,0);V.c.push(_c.r,_c.g,_c.b)}}}}
function addEll(V,rx,ry,rz,x,y,z,col,S=10,Rn=7){const R=[];for(let i=0;i<=Rn;i++){const t=i/Rn*PI,s=Math.max(.02,Math.sin(t));R.push([y-Math.cos(t)*ry,rx*s,rz*s,x,z])}addLoft(V,R,col,S)}
const BLOBT=ctex(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(0,0,0,.55)');r.addColorStop(.6,'rgba(0,0,0,.25)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,w,h)},false),BLOBM=new THREE.MeshBasicMaterial({map:BLOBT,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),BLOBG=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
function blob(w,l){const m=new THREE.Mesh(BLOBG,BLOBM);m.scale.set(l,1,w);m.position.y=.035;m.renderOrder=1;return m}
function personMesh(o){const g=new THREE.Group(),b=new THREE.Group();g.add(b);g.add(blob(.62,.62));const shirt=o.col||o.shirt||'#d04a4a',trs=o.trs||'#2a2e3a',skin=o.skin||'#d8a478',hair=o.hair||'#2a1a12',dsk=shadeHex(skin,-.12),dsh=shadeHex(shirt,-.16),dtr=shadeHex(trs,-.2),lsh=shadeHex(shirt,.1);
  // per-person variety from a hash of their look (never touches the world's random stream)
  let hs=2166136261;for(const ch of shirt+trs+skin+hair+(o.hat||'')+(o.x||0)+(o.y||0)){hs^=ch.charCodeAt(0);hs=Math.imul(hs,16777619)}const rr=()=>{hs=Math.imul(hs^hs>>>15,2246822507)^Math.imul(hs^hs>>>13,3266489909);return((hs>>>0)%10000)/10000};
  const me=o===undefined||o.me,coat=!me&&!o.robe&&!o.long&&rr()<.28?['#3a3a42','#5a4632','#2a3a52','#6a2a2a','#4a5a3a','#8a7a5a'][rr()*6|0]:null,skirt=!me&&!o.robe&&o.long&&rr()<.5,pose=me?0:[0,1,1,2,3][rr()*5|0],hgt=o.robe||me?1:.93+rr()*.12,wid=o.robe||me?1:.9+rr()*.22,style=o.long?'long':(()=>{const r=rr();return r<.12?'buzz':r<.2?'afro':r<.28?'bun':'short'})(),beard=!me&&!o.long&&!o.robe&&rr()<.16,specs=!me&&(rr()<.13||!!o.specs);
  g.scale.set(hgt,hgt,hgt*wid);
  const V=VB();
  if(o.robe){addFrustum(V,-.2,.2,.5,.0,-.17,.17,.4,1.45,shirt);addBox(V,.34,.7,.14,.02,1.22,-.14,'#e8a020');addBox(V,.42,.06,.5,0,.62,0,dsh);addEll(V,.12,.07,.24,0,1.43,0,shirt)}
  else{
    // pelvis, belt, shaped torso (chest forward, shoulders broad, waist in), collar
    addLoft(V,[[.84,.1,.15],[.92,.115,.18],[1.0,.12,.185],[1.05,.118,.178]],trs);
    if(!coat&&!skirt&&rr()<.5){addLoft(V,[[1.04,.122,.182],[1.09,.122,.182]],'#201a16');addBox(V,.02,.035,.05,.122,1.065,0,'#c8b070')}
    if(coat){addLoft(V,[[.6,.15,.21],[.8,.135,.2],[1.0,.13,.195],[1.12,.125,.185]],coat,12);addLoft(V,[[1.43,.085,.15],[1.52,.07,.11]],shadeHex(coat,.12),10)}
    if(skirt)addLoft(V,[[.52,.17,.24],[.75,.15,.215],[.95,.125,.19],[1.06,.12,.18]],trs,12);
    addLoft(V,[[1.08,.118,.172,.0],[1.2,.122,.176,.005],[1.32,.132,.198,.012],[1.41,.13,.232,.008],[1.47,.108,.222,0],[1.515,.065,.12,0]],coat||shirt,12);
    addLoft(V,[[1.47,.07,.08,.0],[1.52,.064,.072,.0]],lsh);
    if(o.zip){addBox(V,.008,.4,.012,.133,1.28,0,dsh)}}
  // neck and head (oval skull, narrower jaw, chin)
  addLoft(V,[[1.48,.052,.052,.005],[1.61,.048,.048,.01]],dsk,8);
  addLoft(V,[[1.585,.03,.03,.04],[1.6,.07,.06,.03],[1.635,.093,.078,.015],[1.68,.104,.088,.005],[1.74,.11,.094,0],[1.8,.106,.092,-.008],[1.845,.088,.078,-.012],[1.875,.055,.05,-.012],[1.889,.012,.012,-.012]],skin,12);
  // face: ears, nose, eyes (white + iris), brows, mouth, cheeks
  for(const s of[-1,1]){addEll(V,.018,.03,.014,-.005,1.73,s*.094,dsk,6,4);addEll(V,.012,.014,.019,.093,1.752,s*.039,'#f6f4f0',6,4);addEll(V,.006,.0095,.0095,.104,1.751,s*.039,'#2a1c14',6,4);
    addBox(V,.014,.011,.045,.1,1.784,s*.04,shadeHex(hair,-.05),s*.12)}
  addEll(V,.02,.03,.017,.106,1.714,0,shadeHex(skin,-.03),6,4);
  addBox(V,.014,.014,.052,.099,1.662,0,'#7a3a34');
  if(beard)addLoft(V,[[1.6,.05,.05,.04],[1.63,.09,.08,.02],[1.68,.1,.09,.005],[1.71,.104,.093,0]],shadeHex(hair,.04),12);
  if(specs){for(const s of[-1,1]){addBox(V,.008,.032,.05,.112,1.752,s*.04,'#1a1a1e');addBox(V,.06,.008,.008,.08,1.765,s*.095,'#1a1a1e')}addBox(V,.008,.008,.03,.113,1.758,0,'#1a1a1e')}
  // hair or hat
  const cap=(rx,ry,rz,x,y,c)=>addLoft(V,[[y-ry*.55,rx*.84,rz*.84,x],[y-ry*.25,rx*.97,rz*.97,x],[y,rx,rz,x],[y+ry*.45,rx*.88,rz*.88,x],[y+ry*.8,rx*.58,rz*.58,x],[y+ry,rx*.08,rz*.08,x]],c,12);
  if(o.hat){cap(.118,.1,.104,-.01,1.8,o.hat);addLoft(V,[[1.745,.112,.098,-.012],[1.775,.116,.102,-.012]],shadeHex(o.hat,-.12),12);
    if(o.cap)addLoft(V,[[1.776,.085,.085,.1],[1.79,.085,.085,.1]],shadeHex(o.hat,-.1),10);else addEll(V,.03,.03,.03,-.01,1.905,0,shadeHex(o.hat,.1),6,4)}
  else if(!o.robe){
    if(style=='afro')addEll(V,.138,.125,.135,-.018,1.81,0,hair,12,8);
    else cap(style=='buzz'?.111:.118,style=='buzz'?.092:.1,style=='buzz'?.097:.103,style=='buzz'?-.006:-.013,style=='buzz'?1.79:1.795,hair);
    if(style=='bun')addEll(V,.05,.048,.05,-.085,1.87,0,hair,8,6);
    if(style=='long')addLoft(V,[[1.81,.075,.1,-.055],[1.7,.065,.112,-.065],[1.58,.05,.11,-.075],[1.47,.03,.09,-.08]],hair,10)}
  else addEll(V,.1,.03,.09,-.01,1.86,0,shadeHex(skin,-.1),8,4);
  if(o.acc=='backpack'){addBox(V,.15,.4,.3,-.205,1.27,0,o.accc||'#2a2a34');addBox(V,.06,.16,.24,-.29,1.18,0,shadeHex(o.accc||'#2a2a34',-.1));for(const s of[-1,1])addBox(V,.2,.035,.035,-.04,1.42,s*.13,o.accc||'#2a2a34')}
  if(o.acc=='tote'){addBox(V,.08,.32,.26,0,.98,.37,o.accc||'#c8a070');addBox(V,.02,.3,.02,0,1.2,.3,o.accc||'#c8a070')}
  const body=vmesh(V);b.add(body);
  // limbs: hip/knee and shoulder/elbow groups are what animPerson swings (pivots unchanged)
  const leg=(z)=>{const p=new THREE.Group();p.position.set(0,.92,z);const L=VB(),lc=o.robe?shirt:skirt?'#2a2a32':trs;
    addLoft(L,[[.02,.1,.1],[-.12,.096,.094],[-.3,.08,.078],[-.45,.065,.066]],lc,10);p.add(vmesh(L,false));
    const k=new THREE.Group();k.position.set(0,-.44,0);const S=VB(),sc=o.robe?shirt:o.shorts?skin:skirt?'#2a2a32':dtr;
    if(o.shorts){addLoft(S,[[.02,.066,.066],[-.1,.06,.058],[-.3,.045,.045],[-.4,.04,.04]],skin,8);addLoft(S,[[-.37,.046,.046],[-.42,.046,.046]],'#e8e8e8',8)}
    else addLoft(S,[[.03,.068,.068],[-.12,.066,.064],[-.36,.05,.05],[-.42,.052,.052]],sc,10);
    addEll(S,.135,.045,.062,.05,-.448,0,'#1e1e24',8,4);addLoft(S,[[-.5,.142,.066,.052],[-.47,.142,.066,.052]],'#e4e4e0',10);
    k.add(vmesh(S,false));p.add(k);p.userData.k=k;b.add(p);return p};
  const lL=leg(-.095),lR=leg(.095);
  const arm=(z)=>{const p=new THREE.Group();p.position.set(0,1.44,z);const L=VB(),sl=!coat&&(o.shorts||o.shortSleeve),shirt0=shirt;{const shirt=coat||shirt0,dsh=shadeHex(shirt,-.16);
    addEll(L,.068,.062,.066,0,-.02,z>0?-.018:.018,shirt,8,5);
    if(sl){addLoft(L,[[-.02,.068,.068],[-.15,.062,.062]],shirt,10);addLoft(L,[[-.14,.048,.048],[-.33,.043,.043]],skin,8)}
    else addLoft(L,[[-.02,.068,.068],[-.18,.06,.058],[-.33,.05,.05]],shirt,10);p.add(vmesh(L,false));
    const e=new THREE.Group();e.position.set(0,-.32,0);const F=VB();
    addLoft(F,[[.02,.05,.05],[-.15,.045,.045],[-.27,.038,.036]],sl?skin:dsh,8);if(!sl)addLoft(F,[[-.24,.044,.044],[-.285,.044,.044]],dsh,8);
    if(o.kind=='boxer')addEll(F,.11,.12,.1,.03,-.38,0,'#e02020',10,6);else{addEll(F,.034,.058,.03,.012,-.34,0,skin,6,4);addEll(F,.016,.03,.016,.045,-.32,z>0?-.02:.02,skin,6,4)}
    if(z>0&&pose==2){addBox(F,.02,.11,.06,.05,-.36,-.02,'#16161a');addBox(F,.004,.09,.05,.062,-.36,-.02,'#6a8aa8')}
    e.add(vmesh(F,false));p.add(e);p.userData.e=e;b.add(p);return p}};
  const aL=arm(-.255),aR=arm(.255);
  g.userData={lL,lR,aL,aR,b,ph:0,pose};return g}
function shadeCol(h,a){return shadeHex(h,a)}
function animPerson(g,speed,dt,seat){const u=g.userData;
  if(seat){u.lL.rotation.z=u.lR.rotation.z=1.25;u.lL.userData.k.rotation.z=u.lR.userData.k.rotation.z=-1.3;u.aL.rotation.z=u.aR.rotation.z=.7;u.aL.userData.e.rotation.z=u.aR.userData.e.rotation.z=.6;u.b.position.y=0;u.b.rotation.set(0,0,0);return}
  if(u.sp===undefined){u.sp=0;u.seed=Math.random()*6.28;u.t=0}u.t+=dt;u.sp+=(speed-u.sp)*Math.min(1,dt*7);/* the player's walk is ~4.6 m/s, which used to drive the full sprint cycle (±67° legs, 6 steps a second): squash the speed above a stroll so limbs swing in a believable jog */const sp=u.sp<2?u.sp:2+(u.sp-2)*.3,mv=cl((sp-.1)/.5,0,1),run=cl((sp-1.7)/1.5,0,1);
  u.ph+=sp*dt*(3.4+run*.5);const ph=u.ph,sn=Math.sin(ph),cs=Math.cos(ph),A=mv*(.4+Math.min(.18,sp*.06)+run*.1);
  const legs=[[u.lL,sn,cs],[u.lR,-sn,-cs]],arms=[[u.aL,-sn,-cs],[u.aR,sn,cs]];
  for(const [l,s,c] of legs){l.rotation.z=s*A+(1-mv)*0;l.userData.k.rotation.z=-(mv*(.12+Math.max(0,c)*(.7+run*.5)*(.5+A*.5)))-.04}
  const idle=Math.sin(u.t*1.3+u.seed);
  for(const [a,s,c] of arms){a.rotation.z=s*A*.85+(1-mv)*(.03+idle*.03);a.userData.e.rotation.z=.18+mv*(.25+Math.max(0,-c)*.55+run*.5)+(1-mv)*.05}
  {const t=1-mv,P=u.pose|0;u.aL.rotation.x=0;u.aR.rotation.x=0;if(t>0&&P){const L=(a,z,e,x)=>{a.rotation.z=a.rotation.z*(1-t)+z*t;a.userData.e.rotation.z=a.userData.e.rotation.z*(1-t)+e*t;a.rotation.x=x*t};
    if(P==1){L(u.aL,-.12,.55,.14);L(u.aR,-.12,.55,-.14)}else if(P==2){L(u.aL,.05,.25,.05);L(u.aR,.42,1.75,.32)}else if(P==3){L(u.aL,.3,1.55,-.45);L(u.aR,.32,1.6,.45)}}}
  // body: bob, sway, twist, forward lean, breathing and weight shift when still
  u.b.position.y=mv*Math.abs(cs)*(.035+run*.03)+0;u.b.position.x=0;
  u.b.rotation.y=sn*.07*mv;u.b.rotation.x=sn*.035*mv+(1-mv)*idle*.012;u.b.rotation.z=-(.03+run*.12)*mv+(1-mv)*idle*.008;
  u.b.scale.y=1+(1-mv)*Math.sin(u.t*1.9+u.seed)*.004}
function dogMesh(c,big,patch){const g=new THREE.Group(),b=new THREE.Group(),k=big?1.3:.85;b.scale.setScalar(k);g.add(b);const dk='#'+new THREE.Color(c).multiplyScalar(.62).getHexString();
  const V=VB();addBox(V,.62,.28,.26,0,.42,0,c);if(patch)addBox(V,.3,.29,.27,-.08,.43,0,patch);addBox(V,.24,.24,.22,.38,.6,0,c);addBox(V,.16,.12,.14,.55,.56,0,dk);addBox(V,.04,.05,.06,.64,.59,0,'#111');addBox(V,.06,.16,.06,.32,.7,-.1,dk);addBox(V,.06,.16,.06,.32,.7,.1,dk);addBox(V,.04,.29,.27,.24,.5,0,'#c42a36');b.add(vmesh(V));
  const legs=[];for(const [x,z] of [[.22,-.09],[.22,.09],[-.22,-.09],[-.22,.09]]){const p=new THREE.Group();p.position.set(x,.32,z);const L=VB();addBox(L,.08,.3,.08,0,-.15,0,dk);p.add(vmesh(L,false));b.add(p);legs.push(p)}
  const tail=new THREE.Group();tail.position.set(-.31,.5,0);const T=VB();addBox(T,.24,.05,.05,-.11,.05,0,c);tail.add(vmesh(T,false));b.add(tail);g.userData={legs,tail,ph:0};return g}
function animDog(g,speed,dt,t){const u=g.userData;u.ph+=speed*dt*6;const s=speed>.1?Math.sin(u.ph)*.6:0;u.legs[0].rotation.z=s;u.legs[3].rotation.z=s;u.legs[1].rotation.z=-s;u.legs[2].rotation.z=-s;u.tail.rotation.y=Math.sin(t*12)*.6;u.tail.rotation.z=.5}
const VCACHE=new Map();
// 2026-style car: smooth raked glass, floating black roof, full-width LED light bars, black wheel-arch cladding, two-tone alloys
function modernCar(V,L,l,w,col,kind){let roofC=col;{const c0=new THREE.Color(col),lu=c0.r*.2126+c0.g*.7152+c0.b*.0722;if(lu<.06){const k=(.06-lu)/.06;roofC='#'+c0.clone().lerp(new THREE.Color('#b4c4d8'),k*.5).getHexString();col='#'+c0.lerp(new THREE.Color('#76849a'),k*.3).getHexString()}}/* dark paints: lift a little towards blue-grey, roof catches the sky, so black and navy cars read as cars, not holes */const suv=kind=='suv',cab=kind=='cab',b0=suv?.4:.32,lo=suv?.5:.42,sh=suv?.3:.26,top=b0+lo+sh,gh=cab?.72:suv?.58:.52,glass='#3e4c5e',blk='#1a1b1e',h2=l/2;
  addBox(V,l,lo,w,0,b0+lo/2,0,col);addFrustum(V,-h2,h2,w,b0+lo,-h2+.08,h2-(cab?.25:.45),w-.08,top,col);
  addBox(V,l*.94,.2,w+.03,0,b0+.09,0,blk);
  const cf=cab?l*.22:l*.12,cr=cab?-l*.47:-l*.44;
  addFrustum(V,cr,cf,w-.1,top,cr+(suv||cab?.1:.32),cf-(cab?.5:.85),w-.36,top+gh,glass);
  addFrustum(V,cr+(suv||cab?.1:.32)-.02,cf-(cab?.5:.85)+.02,w-.34,top+gh,cr+(suv||cab?.14:.38),cf-(cab?.55:.92),w-.38,top+gh+.06,suv?blk:roofC);
  for(const z of[1,-1]){addBox(V,(cf-cr)*.08,gh*.8,.04,(cf+cr)/2-.1,top+gh*.42,z*(w/2-.11-.06),blk)}
  if(cab)addBox(V,.34,.14,.56,(cf+cr)/2-.2,top+gh+.13,0,'#ffd23a');
  addBox(V,.05,.16,w-.6,h2+.003,b0+.2,0,'#141518');
  addBox(L,.04,.05,w-.3,h2-.02,top-.08,0,'#ffffff');addBox(L,.04,.06,w-.2,-h2-.01,top-.1,0,'#ff1a1a');
  for(const z of[1,-1])addBox(V,.14,.06,.16,cf-.12,top+.06,z*(w/2-.02),blk);
  const wr=suv?.39:.36;for(const [x,z] of [[l*.32,w/2-.12],[l*.32,-w/2+.12],[-l*.32,w/2-.12],[-l*.32,-w/2+.12]]){addWheel(V,wr,.27,x,wr,z,'#141418');addWheel(V,wr*.68,.29,x,wr,z,'#aeb3ba');addWheel(V,.08,.31,x,wr,z,'#2a2c30')}}
function vehGeo(type,col){const key=type+col;if(VCACHE.has(key))return VCACHE.get(key);const V=VB(),L=VB();let len=4.2;
  const glass='#26303e',tyre='#141418',wheel=(x,z,r=.36,w=.26)=>addWheel(V,r,w,x,r,z,tyre);
  if(type=='hatch'||type=='cab'){const l=type=='cab'?4.7:4.25,w=type=='cab'?1.9:1.82;len=l;modernCar(V,L,l,w,col,type=='cab'?'cab':(parseInt(col.slice(1,3),16)%3==0?'suv':'hatch'))}
  else if(type=='van'){len=5;addBox(V,3.6,1.9,2,-.7,1.32,0,col);addBox(V,1.4,1.2,2,1.8,.98,0,col);addBox(V,.9,.62,1.9,1.9,1.84,0,glass);addBox(V,.3,.6,1.92,2.35,1.55,0,glass);for(const [x,z] of [[1.6,.9],[1.6,-.9],[-1.6,.9],[-1.6,-.9]])wheel(x,z,.4);for(const z of [.7,-.7]){addBox(L,.05,.16,.32,2.51,.8,z,'#fff');addBox(L,.05,.2,.2,-2.51,1,z,'#f00')}}
  else if(type=='bus'){len=10.6;addBox(V,10.4,3.9,2.5,0,2.3,0,'#c8201c');for(const y of [1.75,3.45])addBox(V,9.8,.95,2.52,-.1,y,0,glass);addBox(V,.06,2.8,2.2,5.22,2.2,0,glass);addBox(V,1.6,.35,.04,4.4,3.95,1.26,'#111');for(const [x,z] of [[3.6,1.1],[3.6,-1.1],[-3.4,1.1],[-3.4,-1.1]])wheel(x,z,.5,.32);for(const z of [.9,-.9]){addBox(L,.05,.2,.3,5.21,.8,z,'#fff');addBox(L,.05,.3,.2,-5.21,1,z,'#f00')}}
  else if(type=='heli'){len=10;addBox(V,3.4,1.8,1.9,0,1.5,0,col);addBox(V,1.3,1.2,1.7,2,1.3,0,glass);addBox(V,4.6,.42,.42,-3.8,1.8,0,col);addBox(V,.7,1.3,.1,-6,2.2,0,col);addBox(V,.3,.2,1.6,0,2.55,0,'#333');addBox(V,.3,1.2,.3,0,3,0,'#333');for(const s of [1,-1]){addBox(V,3.6,.1,.1,0,.1,s*1,'#2a2a30');addBox(V,.1,.5,.1,.8,.35,s*1,'#2a2a30');addBox(V,.1,.5,.1,-.8,.35,s*1,'#2a2a30')}addBox(L,.1,.2,.4,2.66,1,0,'#fff')}
  else{// two-wheelers
    const frame=col,w2=(x)=>addWheel(V,type=='scooter'?.2:.33,.08,x,type=='scooter'?.2:.33,0,tyre);len=type=='bike'?2.4:1.8;
    if(type=='scooter'){w2(.5);w2(-.5);addBox(V,1.1,.1,.2,0,.22,0,frame);addBox(V,.07,1.05,.07,.52,.72,0,frame);addBox(V,.07,.07,.55,.52,1.22,0,'#222')}
    else{const fx=type=='bike'?1:.6;w2(fx);w2(-.6);addBox(V,(fx+.6)*.9,.08,.08,(fx-.6)/2,.68,0,frame);addBox(V,.07,.62,.07,fx-.1,.75,0,frame);addBox(V,.07,.07,.56,fx-.1,1.06,0,'#222');addBox(V,.3,.08,.16,-.35,.95,0,'#222');addBox(V,.07,.4,.07,-.35,.75,0,frame);
      if(type=='bike')addBox(V,.9,.62,.8,.45,.66,0,'#1f6a64');if(type=='courier')addBox(V,.46,.46,.46,-.55,1.25,0,'#2bb3a0');if(type=='ebike')addBox(V,.36,.16,.18,-.2,.5,0,'#222')}
    addBox(L,.06,.1,.12,(type=='bike'?1:.6)+.05,1,0,'#fff')}
  const r={g:vgeo(V),l:L.p.length?lgeo(L):null,len};r.g.userData.shared=1;if(r.l)r.l.userData.shared=1;VCACHE.set(key,r);return r}
function lgeo(L){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(F32(L.p),3));g.setAttribute('normal',new THREE.Float32BufferAttribute(F32(L.n),3));g.setAttribute('color',new THREE.Float32BufferAttribute(F32(L.c),3));return g}
const LIGHTMAT=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.35,fog:true});
const XMAT=new THREE.MeshBasicMaterial({vertexColors:true,fog:true});/* Christmas lights: dim by day, bright at night */
function vehMesh(c){const vg=vehGeo(c.type,c.col||'#c0392b'),g=new THREE.Group(),m=new THREE.Mesh(vg.g,MAT.vc);m.castShadow=true;m.receiveShadow=true;g.add(m);if(vg.l){const l=new THREE.Mesh(vg.l,LIGHTMAT);g.add(l)}
  if(c.type=='heli'){const rot=new THREE.Group(),V=VB();addBox(V,11,.06,.32,0,0,0,'#222');addBox(V,.32,.06,11,0,0,0,'#222');rot.add(vmesh(V,false));rot.position.y=3.65;g.add(rot);g.userData.rot=rot;const tr=new THREE.Group(),T=VB();addBox(T,.08,1.5,.12,0,0,0,'#222');tr.add(vmesh(T,false));tr.position.set(-6,2.3,.12);g.add(tr);g.userData.tr=tr;
    // police livery: yellow/blue Battenburg band, POLICE on both sides and the belly, blue lights
    const P=VB();for(let k=0;k<6;k++)for(const sd of[1,-1])for(const r of[0,1])addBox(P,.56,.26,.02,-1.4+k*.56+.28,.78+r*.26,sd*.96,(k+r)%2?'#1f4aa8':'#f2d21b');
    for(let k=0;k<7;k++)for(const sd of[1,-1])addBox(P,.6,.2,.02,-2.0-k*.6,1.8,sd*.22,k%2?'#1f4aa8':'#f2d21b');addBox(P,.5,.12,.5,.4,2.48,0,'#2a5ad8');addBox(P,.2,.1,.2,1.6,.62,0,'#f4f4f4');g.add(vmesh(P,false));
    const pm=new THREE.MeshBasicMaterial({map:signTex([['POLICE','800 78px Rubik, system-ui, sans-serif',66]],'#16181c','#ffffff',384,128),side:THREE.DoubleSide});
    for(const sd of[1,-1]){const t=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.6),pm);t.position.set(.1,1.6,sd*.97);if(sd<0)t.rotation.y=Math.PI;g.add(t)}
    {const t=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.7),pm);t.rotation.x=Math.PI/2;t.position.set(0,.58,0);g.add(t)}
    const bl=new THREE.Mesh(new THREE.BoxGeometry(.18,.14,.18),BELMAT2);bl.position.set(-.6,2.6,0);g.add(bl)}
  if(c.ai&&(c.type=='ebike'||c.type=='courier'||c.type=='scooter')){const p=personMesh({col:['#2a6ad8','#e04848','#2fa86a','#2a2a34'][R()*4|0],trs:'#2a2e3a',skin:['#f0c8a0','#b07850','#7a4a2a'][R()*3|0],hat:'#e8e8e8',cap:0});animPerson(p,0,0,c.type!='scooter');p.position.y=c.type=='scooter'?.25:.15;if(c.type!='scooter'){p.position.x=-.15}g.add(p)}
  return g}
// ring-necked parakeets: bright green, red beak, long tail; fly between nearby trees and perch a while
function paraMesh(){const g=new THREE.Group(),V=VB();addBox(V,.26,.11,.11,0,0,0,'#5cc43c');addBox(V,.11,.11,.11,.16,.04,0,'#72d84e');addBox(V,.06,.05,.05,.24,.02,0,'#d8283a');addBox(V,.012,.02,.12,.16,.0,0,'#1a1a1a');addBox(V,.3,.02,.05,-.27,-.02,0,'#3e9a30');g.add(vmesh(V,false));
  const wl=[];for(const s of[1,-1]){const W=VB();addBox(W,.15,.015,.22,0,0,s*.11,'#44a832');const pv=new THREE.Group();pv.position.set(.02,.045,s*.05);pv.add(vmesh(W,false));g.add(pv);wl.push(pv)}g.userData.w=wl;g.scale.setScalar(1.35);return g}
let PARA=null,PTREE=[],ptT=0,CRIT=null,nLane=0;
// grey squirrels round the park trees (they dart up a trunk when you get close) and a couple of urban foxes trotting about
function squirrelMesh(){const V=VB(),c='#8a8580';addBox(V,.22,.12,.1,0,.11,0,c);addBox(V,.1,.1,.09,.14,.16,0,c);addBox(V,.02,.04,.02,.15,.23,.03,c);addBox(V,.02,.04,.02,.15,.23,-.03,c);addBox(V,.1,.06,.08,.04,.08,0,'#d8d0c4');addBox(V,.06,.28,.09,-.15,.22,0,'#9a948c');addBox(V,.08,.08,.11,-.12,.38,0,'#a8a298');const g=new THREE.Group();g.add(vmesh(V,false));return g}
function foxMesh(){const V=VB(),c='#c8622a';addBox(V,.62,.26,.22,0,.42,0,c);addBox(V,.24,.2,.2,.38,.5,0,c);addBox(V,.14,.1,.1,.55,.46,0,c);addBox(V,.05,.05,.05,.63,.47,0,'#1a1a1a');addBox(V,.16,.12,.16,.36,.4,0,'#f0ece4');for(const z of[.06,-.06])addBox(V,.06,.1,.04,.38,.64,z,'#2a1a14');
  addFrustum(V,-.62,-.3,.16,.44,-.66,-.36,.1,.5,'#c8622a');addBox(V,.08,.1,.1,-.66,.47,0,'#f4f0ea');const g=new THREE.Group();g.add(vmesh(V,false));const legs=[];for(const [x,z] of [[.22,.07],[.22,-.07],[-.22,.07],[-.22,-.07]]){const L=VB();addBox(L,.06,.3,.06,0,-.15,0,'#2a1e18');const pv=new THREE.Group();pv.position.set(x,.3,z);pv.add(vmesh(L,false));g.add(pv);legs.push(pv)}g.userData.legs=legs;return g}
function critStep(p,dt){const pxm=p.x*K,pzm=p.y*K;if(!CRIT){CRIT=[];for(let i=0;i<6;i++)CRIT.push({k:'sq'});for(let i=0;i<2;i++)CRIT.push({k:'fox'});window.R3DBG&&(R3DBG.crit=CRIT)}
  if(!PTREE.length)return;
  for(const a of CRIT){const far=a.x===undefined||hyp(a.x-pxm,a.z-pzm)>(a.k=='fox'?160:110);
    if(far){if(a.k=='sq'){const t=PTREE[R()*PTREE.length|0];a.tr=t;a.x=t[0]*K+(R()-.5)*4;a.z=t[1]*K+(R()-.5)*4}else{let ok=false;for(let i=0;i<20&&!ok;i++){const ang=R()*6.28,d=50+R()*70,x=pxm+Math.cos(ang)*d,z=pzm+Math.sin(ang)*d;if(camFree(x,z)){a.x=x;a.z=z;ok=true}}if(!ok)continue}a.h=R()*6.28;a.y=0;a.st=0;a.t=0}
    const m=ent(a,a.k=='sq'?squirrelMesh:foxMesh);a.t-=dt;
    if(a.k=='sq'){const pd=hyp(a.x-pxm,a.z-pzm);
      if(a.st==2){a.y=Math.min(a.y+dt*4,4.5);if(a.t<=0)a.st=3}else if(a.st==3){a.y=Math.max(0,a.y-dt*2);if(a.y==0){a.st=0;a.t=1}}
      else{if(pd<4&&a.tr){a.x=a.tr[0]*K+.25;a.z=a.tr[1]*K;a.st=2;a.t=4+R()*4}else if(a.t<=0){a.st=a.st?0:1;a.t=a.st?.6+R()*.8:1+R()*3;if(a.st)a.h+=(R()-.5)*2.5}
        if(a.st==1){const nx=a.x+Math.cos(a.h)*2.6*dt,nz=a.z+Math.sin(a.h)*2.6*dt;if(camFree(nx,nz)&&(!a.tr||hyp(nx-a.tr[0]*K,nz-a.tr[1]*K)<9)){a.x=nx;a.z=nz}else a.h+=2}}
      const hop=a.st==1?Math.abs(Math.sin(tSec*14))*.12:0;m.position.set(a.x,a.y+hop,a.z);m.rotation.set(0,-a.h,a.st==2?Math.PI/2:a.st==3?-Math.PI/2:0)}
    else{if(a.t<=0){a.st=R()<.7?1:0;a.t=a.st?3+R()*5:2+R()*3;if(a.st)a.h+=(R()-.5)*1.6}let mv=0;
      if(a.st==1){const nx=a.x+Math.cos(a.h)*1.7*dt,nz=a.z+Math.sin(a.h)*1.7*dt;if(camFree(nx,nz)&&camFree(nx+Math.cos(a.h),nz+Math.sin(a.h))){a.x=nx;a.z=nz;mv=1}else{a.h+=1.5+R()}}
      m.position.set(a.x,0,a.z);m.rotation.y=-a.h;const sw=mv?Math.sin(tSec*9)*.5:0;m.userData.legs.forEach((l,i)=>l.rotation.z=(i==0||i==3?sw:-sw))}}}
let TRL=[],TRAINS=null;
function trainMesh(){const g=new THREE.Group();for(let k=0;k<6;k++){const V=VB();addBox(V,19.4,2.7,2.8,0,1.65,0,'#eef0f2');addBox(V,19.4,.85,2.84,0,2.05,0,'#22344f');addBox(V,19.4,.35,2.84,0,.55,0,'#2a5aa8');addBox(V,19.6,.3,2.5,0,3.05,0,'#8a8e94');
    for(let d=-6.5;d<=6.5;d+=13)for(const s of[-1,1])addBox(V,1.3,2.1,.05,d,1.35,s*1.43,'#f2c82a');if(k==0||k==5)addBox(V,.1,2.4,2.6,k==0?9.75:-9.75,1.5,0,'#f2c82a');
    for(const w of[-6.5,6.5])addBox(V,2.2,.5,2.3,w,.25,0,'#2a2a2e');const m=vmesh(V,false);g.add(m)}return g}
function trainStep(p,dt){if(!TRL.length)return;const pxm=p.x*K,pzm=p.y*K;
  if(!TRAINS){TRAINS=[];for(let i=0;i<5;i++)TRAINS.push({});window.R3DBG&&(R3DBG.trains=TRAINS,R3DBG.trl=TRL)}
  for(const t of TRAINS){if(!t.ln||t.far>6){const near=TRL.filter(l=>{for(let i=0;i<l.P.length;i+=3)if(hyp(l.P[i][0]-pxm,l.P[i][1]-pzm)<450)return true;return false});if(!near.length)continue;t.ln=near[R()*near.length|0];t.dir=R()<.5?1:-1;t.s=R()*t.ln.L;t.v=11+R()*6;t.far=0;t.wait=0}
    const l=t.ln;if(t.wait>0)t.wait-=dt;else{t.s+=t.dir*t.v*dt;if(t.s>l.L||t.s<0){t.s=Math.max(0,Math.min(l.L,t.s));t.dir=-t.dir;t.wait=8+R()*20}}
    const at=s=>{s=Math.max(0,Math.min(l.L-.01,s));let a=0,b=l.cum.length-1;while(b-a>1){const m=(a+b)>>1;if(l.cum[m]<=s)a=m;else b=m}const f=(s-l.cum[a])/Math.max(.01,l.cum[a+1]-l.cum[a]),P0=l.P[a],P1=l.P[a+1];return[P0[0]+(P1[0]-P0[0])*f,P0[1]+(P1[1]-P0[1])*f]};
    const g=ent(t,trainMesh);let any=false;
    g.children.forEach((m,k)=>{const s0=t.s-t.dir*(k*20+10),A=at(s0-10),B=at(s0+10);m.position.set((A[0]+B[0])/2,7.12,(A[1]+B[1])/2);m.rotation.y=-Math.atan2(B[1]-A[1],B[0]-A[0]);if(hyp(m.position.x-pxm,m.position.z-pzm)<700)any=true});
    t.far=any?0:t.far+dt}}
function paraStep(p,dt){ptT-=dt;if(ptT<=0){ptT=2;PTREE=WD.trees.filter(t=>hyp(t[0]-p.x,t[1]-p.y)<230)}if(PTREE.length<2)return;if(!PARA){PARA=[];for(let i=0;i<10;i++)PARA.push({})}
  const pick=()=>PTREE[R()*PTREE.length|0];
  for(const b of PARA){if(b.x===undefined||hyp(b.x/K-p.x,b.z/K-p.y)>280){const t=pick();b.x=t[0]*K+(R()-.5)*30;b.z=t[1]*K+(R()-.5)*30;b.y=9+R()*8;b.tg=null;b.h=R()*6;b.ph=R()*6}
    if(!b.tg){const t=pick();b.tg=[t[0]*K+(R()-.5)*1.5,6.2+R()*2.4,t[1]*K+(R()-.5)*1.5];b.st=0}
    const m=ent(b,paraMesh);
    if(b.st==0){const dx=b.tg[0]-b.x,dz=b.tg[2]-b.z,d=Math.hypot(dx,dz),sp=12*dt;
      if(d<sp+.15){b.x=b.tg[0];b.z=b.tg[2];b.y=b.tg[1];b.st=1;b.wait=2+R()*9}
      else{const w=Math.sin(tSec*1.7+b.ph)*.35;b.x+=(dx/d-dz/d*w)*sp;b.z+=(dz/d+dx/d*w)*sp;const cr=b.tg[1]+Math.min(9,d*.3);b.y+=(cr-b.y)*Math.min(1,dt*1.8);b.h=Math.atan2(dz/d+dx/d*w,dx/d-dz/d*w)}}
    else{b.wait-=dt;if(b.wait<=0)b.tg=null;if(R()<dt*.6)b.h+=(R()-.5)*1.5}
    const fl=b.st==0?Math.sin(tSec*30+b.ph*5)*.95:-.15;m.position.set(b.x,b.y+(b.st==0?Math.sin(tSec*8+b.ph)*.1:0),b.z);m.rotation.set(0,-b.h,b.st==0?.08:.3);m.userData.w[0].rotation.x=fl;m.userData.w[1].rotation.x=-fl}}
function duckMesh(){const V=VB();addBox(V,.36,.16,.2,0,.08,0,'#8a6a48');addBox(V,.14,.14,.12,.16,.2,0,'#2f7a3a');addBox(V,.08,.03,.06,.26,.2,0,'#f0a020');return vmesh(V,false)}
function litterMesh(){const V=VB();addBox(V,.22,.08,.16,0,.04,0,'#e8e4d8');addBox(V,.1,.09,.1,.04,.05,.02,'#c03a3a');const m=vmesh(V,false);m.rotation.y=R()*6;return m}

/* ---------- sprites: signs, pins, particles ---------- */
const SPRC=new Map();
function textSprite(txt,bg,fg,h,round=18){const key=txt+bg+fg;let t=SPRC.get(key);if(!t){const c=document.createElement('canvas'),g=c.getContext('2d');g.font='800 44px Rubik, system-ui, sans-serif';const w=Math.max(70,Math.ceil(g.measureText(txt).width)+40);c.width=w;c.height=70;g.font='800 44px Rubik, system-ui, sans-serif';g.fillStyle=bg;g.beginPath();g.roundRect(0,0,w,70,round);g.fill();g.fillStyle=fg;g.textAlign='center';g.fillText(txt,w/2,50);t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.userData={w};SPRC.set(key,t)}
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,fog:true}));s.scale.set(t.userData.w/70*h,h,1);return s}
function pinSprite(ic,col){const key='pin'+ic+col;let t=SPRC.get(key);if(!t){const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d');g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.arc(48,50,40,0,7);g.fill();g.fillStyle=col;g.beginPath();g.arc(48,46,38,0,7);g.fill();g.lineWidth=5;g.strokeStyle='#fff';g.stroke();g.fillStyle='#fff';g.font='900 46px Rubik, system-ui, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(ic,48,49);t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;SPRC.set(key,t)}
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,fog:false,depthTest:false,transparent:true}));s.renderOrder=10;return s}
const PICON={heart:['♥','#ff6fa5'],coin:['£','#e8b020'],note:['♪','#e02020']};

/* ---------- day, night, weather ---------- */
const AMB=[[0,[20,24,48]],[5.5,[30,34,64]],[7,[200,170,180]],[8.5,[184,200,220]],[16,[190,204,222]],[17.3,[240,176,128]],[18.3,[232,154,116]],[19,[118,94,148]],[19.8,[26,30,58]],[24,[20,24,48]]];
function skyCol(){const d=new Date(),h=window.DBGH!=null?DBGH:d.getHours()+d.getMinutes()/60;for(let i=1;i<AMB.length;i++)if(h<=AMB[i][0]){const [h0,a]=AMB[i-1],[h1,b]=AMB[i],t=(h-h0)/(h1-h0);return[a.map((v,k)=>v+(b[k]-v)*t),h]}return[AMB[0][1],h]}
const PL=[];for(let i=0;i<8;i++){const l=new THREE.PointLight(0xffb060,0,26,1.6);scene.add(l);PL.push(l)}
let NIGHT=0;
const WETM=[];let WETENV=null;/* wet road surfaces (darker, glossy, reflecting the overcast sky): built at load when it is raining or has just rained */
function initWet(){if(!wxNow().wet)return;const env=ctex(256,128,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#5a6676');gr.addColorStop(.4,'#9aa4b0');gr.addColorStop(.5,'#7a8290');gr.addColorStop(.62,'#3a3e44');gr.addColorStop(1,'#2a2c30');g.fillStyle=gr;g.fillRect(0,0,w,h)},false);env.mapping=THREE.EquirectangularReflectionMapping;WETENV=env;
  for(const k of ['road','cobble','cyc']){const o=MAT[k];if(!o)continue;const n=new THREE.MeshPhongMaterial({map:o.map,color:o.color.clone().multiplyScalar(.78),specular:0x2a3038,shininess:70,envMap:env,combine:THREE.MixOperation,reflectivity:k=='cobble'?.1:.17,side:o.side,polygonOffset:o.polygonOffset,polygonOffsetFactor:o.polygonOffsetFactor,polygonOffsetUnits:o.polygonOffsetUnits});n.userData.r0=n.reflectivity;WETM.push(n);MAT[k]=n}}
/* gradient sky dome: zenith colour fading to a horizon that matches the fog exactly */
const SKYU={top:{value:new THREE.Color()},bot:{value:new THREE.Color()}};const SKYM=new THREE.Mesh(new THREE.SphereGeometry(950,24,12),new THREE.ShaderMaterial({uniforms:SKYU,side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false,
  vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform vec3 top;uniform vec3 bot;varying vec3 vP;void main(){float t=pow(clamp(vP.y,0.,1.),.55);gl_FragColor=vec4(mix(bot,top,t),1.);\n#include <colorspace_fragment>\n}'}));SKYM.renderOrder=-10;SKYM.frustumCulled=false;scene.add(SKYM);
const OVG=new THREE.Color(.5,.54,.6);let SUNLOW=0,OV=0;function lighting(cx,cz){const WXN=wxNow();OV=Math.min(1,Math.max(WXN.rain,Math.max(0,WXN.cloud-.45)*1.4));const [c,h]=skyCol(),col=new THREE.Color().setRGB(c[0]/255,c[1]/255,c[2]/255,THREE.SRGBColorSpace),lum=(c[0]*.3+c[1]*.5+c[2]*.2)/255,night=cl(1-lum*1.7,0,1);NIGHT=night;SUNLOW=cl((h-15.8)/2.2,0,1)*(1-night);/* golden hour: the sun drops low in the west and the light warms up */
  XMAT.color.setScalar(.4+night*.6);col.lerp(OVG,OV*(1-night)*.6);scene.background=col;scene.fog.color.copy(col);SKYU.bot.value.copy(col);SKYU.top.value.copy(col).lerp(new THREE.Color().setRGB(...(night>.5?[.03,.04,.09]:[.32+.1*OV,.5-.03*OV,.78-.25*OV]),THREE.SRGBColorSpace),night>.5?.7:.6);SKYM.position.copy(camera.position);hemi.intensity=(.3+lum*.8)*(1.15+.3*OV)+night*1.15;hemi.color.copy(col).lerp(new THREE.Color(0xa8c0e0),.55-SUNLOW*.12)/* golden hour: warm key, cooler fill, so the ground isn't one orange-brown */;sun.intensity=Math.max(.08+night*.3,lum*(1.75-.6*OV));/* a bit more moonlight so lawns and forecourts don't go black */sun.color.set(h>16.5&&h<19.2?0xffc488/* golden hour: warm but a touch less orange, so green lawns don't go olive-black */:night>.5?0x8090c0:0xffe6c4);if(SUNLOW>0){sun.intensity*=1+SUNLOW*.55;hemi.intensity*=1+SUNLOW*.25}
  for(const k of WK)WM[k].emissiveIntensity=night*.9;MAT.lampOn.emissiveIntensity=night*2.2;for(const m of WETM)m.reflectivity=m.userData.r0*(1-night*.75);if(LAMP_POOL){LAMP_POOL.opacity=night*.42;LAMP_POOL.userData.mesh.visible=night>.05}MAT.hl.emissiveIntensity=.3+night;LIGHTMAT.opacity=.35+night*.65;for(const k of ['grass','lawn'])if(MAT[k]&&MAT[k].emissive){MAT[k].emissive.setRGB(.011,.024,.018);MAT[k].emissiveIntensity=night}/* moonlit lawns: a faint green-blue lift so grass away from lamps doesn't go pitch black */
  const near=LAMPS.map(l=>[hyp(l[0]-cx,l[1]-cz),l]).sort((a,b)=>a[0]-b[0]).slice(0,8);PL.forEach((l,i)=>{const n=near[i];l.intensity=n?night*30:0;if(n)l.position.set(n[1][0],5.6,n[1][1])});
  for(const u of HAZE)u.hz.value.copy(col);{const fg=WXN.fog||0;scene.fog.near=(night>.5?40:90)*(1-.85*fg)+OV*0;scene.fog.far=(night>.5?260:420)*(1-.65*fg)*(1-.12*OV)*(1+1.6*cl((camera.position.y-18)/50,0,1));scene.fog.near*=1+1.2*cl((camera.position.y-18)/50,0,1)}/* from the helicopter or a rooftop you see further: the fog pulls back with height, so the City's towers stand on a visible city instead of a pale band */}
let rain=null;
function makeRain(){const n=mob?900:1600,g=new THREE.BufferGeometry(),p=new Float32Array(n*6);for(let i=0;i<n;i++){const x=(R()-.5)*60,y=R()*30,z=(R()-.5)*60;p.set([x,y,z,x-.1,y-.8,z],i*6)}g.setAttribute('position',new THREE.BufferAttribute(p,3));rain=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xb8c4d8,transparent:true,opacity:.22}));rain.frustumCulled=false;rain.userData.n=n;scene.add(rain)}

/* ---------- per-frame sync ---------- */
const ENT=new Map();let seen=new Set();
function ent(o,make){let m=ENT.get(o);if(!m){m=make();scene.add(m);ENT.set(o,m)}seen.add(o);return m}
function spd(o,x,y,dt){const s=o._px===undefined?0:hyp(x-o._px,y-o._py)*K/Math.max(dt,.001);o._px=x;o._py=y;o._sp=(o._sp||0)*.7+s*.3;return o._sp}
const TWO={bike:1,ebike:1,scooter:1,courier:1};
let dannyM=null,routeM=null,routeRef=null,beacon=null,destBeacon=null,giverPin=null,lastLight=0,tSec=0;const camPos=new THREE.Vector3(),camLook=new THREE.Vector3(),tv=new THREE.Vector3();
const PINS={};
function beaconMesh(col){const m=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,40,20,1,true),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,fog:false}));m.position.y=20;scene.add(m);return m}
let RIDX=null;function roofAt(x,y){if(!RIDX){RIDX=new Map();WD.b.forEach((b,i)=>{const f=b[0];let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let k=0;k<f.length;k+=2){x0=Math.min(x0,f[k]);x1=Math.max(x1,f[k]);y0=Math.min(y0,f[k+1]);y1=Math.max(y1,f[k+1])}for(let gx=Math.floor(x0/40);gx<=Math.floor(x1/40);gx++)for(let gy=Math.floor(y0/40);gy<=Math.floor(y1/40);gy++){const k=gx+','+gy;if(!RIDX.has(k))RIDX.set(k,[]);RIDX.get(k).push(i)}})}
  let h=0;for(const i of RIDX.get(Math.floor(x/40)+','+Math.floor(y/40))||[]){const b=WD.b[i],f=b[0];let c=false;for(let k=0,j=f.length-2;k<f.length;j=k,k+=2){const xi=f[k],yi=f[k+1],xj=f[j],yj=f[j+1];if((yi>y)!=(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}if(c)h=Math.max(h,b[1])}return h}
function camFree(x,z){const X=(x/K)|0,Y=(z/K)|0;if(X<0||Y<0||X>=W||Y>=H)return true;return !FB[Y*W+X]}
/* ---------- little 3D effects: sparks, debris and dust puffs ---------- */
const FXN=240,FXP=[];let FXM=null,DUSTM=null;
function fxInit(){FXM=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0xffffff}),FXN);DUSTM=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xc8beac,transparent:true,opacity:.3,depthWrite:false}),FXN);
  const c=new THREE.Color(1,1,1);for(const M of[FXM,DUSTM]){M.instanceMatrix.setUsage(THREE.DynamicDrawUsage);M.frustumCulled=false;M.count=0;scene.add(M)}for(let i=0;i<FXN;i++)FXM.setColorAt(i,c)}
function fxAdd(x,y,h,type,n){if(!FXM)fxInit();for(let i=0;i<n;i++){if(FXP.length>=FXN)FXP.shift();const a=Math.random()*PI*2,sp=type=='spark'?2.5+Math.random()*5:type=='debris'?1.5+Math.random()*3:.5+Math.random()*1.1;
  FXP.push({x:x*K,y:h+.15,z:y*K,vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,vy:type=='spark'?1.5+Math.random()*3:type=='debris'?2+Math.random()*3:.3+Math.random()*.6,t:0,life:type=='spark'?.3+Math.random()*.3:type=='debris'?1.6+Math.random():.6+Math.random()*.4,type,
    s:type=='spark'?.05:type=='debris'?.06+Math.random()*.08:.07+Math.random()*.05,c:type=='spark'?(Math.random()<.5?0xffd060:0xff8a30):[0x2a2a30,0x8a8e94,0xc8ccd0,0xb02a2a,0x1e1e22][Math.random()*5|0],r:Math.random()*6})}}
const _fm=new THREE.Matrix4(),_fq=new THREE.Quaternion(),_fe=new THREE.Euler(),_fv=new THREE.Vector3(),_fs=new THREE.Vector3(),_fc=new THREE.Color();
function fxStep(dt){if(!FXM)return;let n=0,d=0;for(let i=FXP.length-1;i>=0;i--){if((FXP[i].t+=dt)>FXP[i].life)FXP.splice(i,1)}
  for(const p of FXP){const dust=p.type=='dust';p.vy-=(dust?-.8:9.8)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;const dr=Math.pow(dust?.15:.6,dt);p.vx*=dr;p.vz*=dr;if(!dust&&p.y<.03){p.y=.03;p.vy=-p.vy*.35;p.vx*=.6;p.vz*=.6}
    const fade=1-p.t/p.life;p.r+=dt*(dust?1:8);_fe.set(p.r,p.r*.7,0);_fq.setFromEuler(_fe);
    if(dust){const sc=p.s*(1+p.t*1.6)*Math.min(1,fade*2.5);_fm.compose(_fv.set(p.x,p.y,p.z),_fq,_fs.set(sc,sc*.8,sc));DUSTM.setMatrixAt(d++,_fm)}
    else{const sc=p.type=='spark'?p.s*fade:p.s;_fm.compose(_fv.set(p.x,p.y,p.z),_fq,_fs.set(sc,p.type=='spark'?sc*.35:sc*.5,sc));FXM.setMatrixAt(n,_fm);FXM.setColorAt(n,_fc.setHex(p.c));n++}}
  FXM.count=n;DUSTM.count=d;FXM.instanceMatrix.needsUpdate=true;DUSTM.instanceMatrix.needsUpdate=true;if(FXM.instanceColor)FXM.instanceColor.needsUpdate=true}
/* airborne pose for a person (jumping, or leaping out of the way): knees tucked, arms up */
/* the parachute canopy: striped dome and lines, opening out over about a third of a second */
let chuteG=null;function chuteCanopy(dt){const c=pl.chute,show=!!(c&&c.open>.02&&dannyM);if(!chuteG){if(!show)return;chuteG=new THREE.Group();const g=new THREE.SphereGeometry(2.4,20,8,0,PI*2,0,PI*.5),col=[],p=g.attributes.position;for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),k=Math.floor((a+PI)/(PI*2)*10)%2;col.push(...(k?[.92,.92,.9]:[.86,.2,.18]))}g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.scale(1,.62,1);const dome=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));dome.position.y=3.6;chuteG.add(dome);const pts=[];for(let k=0;k<8;k++){const a=k/8*PI*2;pts.push(new THREE.Vector3(Math.cos(a)*2.35,3.6,Math.sin(a)*2.35),new THREE.Vector3(0,1.55,0))}chuteG.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x303030})));scene.add(chuteG)}
  chuteG.visible=show;if(show){const o=c.open;chuteG.position.copy(dannyM.position);chuteG.scale.set(.25+.75*o,.2+.8*o,.25+.75*o);chuteG.rotation.y=-pl.a;chuteG.rotation.z=Math.sin(tSec*1.6)*.05}}
function airPose(m,jz,flail){const u=m.userData,t=Math.min(1,(jz||0)/.35);if(t<=0)return;u.aL.rotation.x=t*(flail?.7:.35);u.aR.rotation.x=-t*(flail?.7:.35);
  u.lL.rotation.z=u.lL.rotation.z*(1-t)+.55*t;u.lR.rotation.z=u.lR.rotation.z*(1-t)-.1*t;u.lL.userData.k.rotation.z=-1.1*t;u.lR.userData.k.rotation.z=-.7*t;
  const up=flail?2.7+Math.sin(tSec*30)*.3:1.9;u.aL.rotation.z=u.aL.rotation.z*(1-t)+up*t;u.aR.rotation.z=u.aR.rotation.z*(1-t)+(flail?2.7-Math.sin(tSec*30)*.3:1.2)*t;u.aL.userData.e.rotation.z=u.aR.userData.e.rotation.z=.3*t}
function render(f){const dt=f/60;tSec+=dt;seen=new Set();
  const p=started?pos():(P.bells||P.flat||{x:1100,y:1360,a:0}),px=p.x*K,pz=p.y*K;
  // camera
  const inCar=started&&pl.car,heliOn=inCar&&pl.car.type=='heli',alt=heli?(heli.alt||0)*55:0,SPD=inCar&&!heliOn?Math.min(1,Math.abs(pl.car.v)/TYPES[pl.car.type].max):0;/* 0..1 how fast you're going: pulls the camera back, widens the view, looks ahead */
  if(started){CAM.yaw+=CAM.rx*2.5*dt;CAM.pitch=cl(CAM.pitch+CAM.ry*1.3*dt,.05,1.1);if(Math.abs(CAM.rx)>.05||Math.abs(CAM.ry)>.05)CAM.manual=1.4;CAM.manual-=dt;
    const mv=inCar?Math.abs(pl.car.v)>.03:(K_moving());if(CAM.manual<=0&&mv){const d=angD(p.a,CAM.yaw);if(inCar||Math.abs(d)<2.2)CAM.yaw+=d*Math.min(1,dt*(inCar?2.9-1.2*SPD:.9))}}
  else{CAM.yaw+=dt*.07}
  const dist=(heliOn?20:inCar?(TWO[pl.car.type]?6.5:9)*(1+.22*SPD):5.2)/ZF*(started?1:7),ph=CAM.pitch+(heliOn?.15:0),ty=(heliOn?alt+2:inCar&&!TWO[pl.car.type]?1.6:1.5+(!inCar&&started?pl.z||0:0));
  let dd=dist;const ox=-Math.cos(CAM.yaw)*Math.cos(ph),oz=-Math.sin(CAM.yaw)*Math.cos(ph),oy=Math.sin(ph);
  if(started&&!heliOn&&!(pl.z>0)){for(let s=.6;s<dist;s+=.4){if(!camFree(px+ox*s,pz+oz*s)&&ty+oy*s<14){dd=Math.max(1.2,s-.5);break}}}
  const th=TH(px,pz);camPos.set(px+ox*dd,Math.max(.6,ty+oy*dd+(started?0:20))+th,pz+oz*dd);if(!started)camera.position.copy(camPos);else camera.position.lerp(camPos,Math.min(1,dt*(dd<dist?18:9)));camLook.set(px+(pl.car&&pl.car.v>0?Math.cos(p.a)*2.6*SPD:0),ty+th+(started?0:4),pz+(pl.car&&pl.car.v>0?Math.sin(p.a)*2.6*SPD:0));camera.lookAt(camLook);if(!window.DBGCAM){const fb=(innerWidth<innerHeight?74:60)+SPD*9;if(Math.abs(camera.fov-fb)>.05){camera.fov+=(fb-camera.fov)*Math.min(1,dt*3);camera.updateProjectionMatrix()}}if(started&&typeof shake=='number'&&shake>0){const a=Math.min(shake,8);camera.rotateZ((Math.random()-.5)*a*.012);camera.rotateX((Math.random()-.5)*a*.009);camera.rotateY((Math.random()-.5)*a*.009)}
  if(window.DBGCAM){const d=window.DBGCAM;camera.position.set(d[0],d[1]+TH(d[0],d[2]),d[2]);camera.lookAt(d[3],d[4]+TH(d[3],d[5]),d[5]);if(window.DBGFOV&&camera.fov!==window.DBGFOV){camera.fov=window.DBGFOV;camera.updateProjectionMatrix()}}
  sun.position.set(px-60-SUNLOW*50,120-SUNLOW*62+th,pz-40+SUNLOW*22);sun.target.position.set(px,th,pz);
  if((lastLight-=dt)<=0){lastLight=.3;lighting(px,pz)}
  if(WATERM){waterT.offset.set(tSec*.01,tSec*.004);pondT.offset.set(tSec*.004,tSec*.002)}BELMAT.emissiveIntensity=(tSec%1)<.5?1.1:.05;BELMAT2.emissiveIntensity=(tSec*3%1)<.5?1.4:.05;
  {const rr=wxNow().rain;if(rr>.05&&!rain)makeRain();if(rain){rain.visible=rr>.05;rain.material.opacity=.16+.2*rr;rain.geometry.setDrawRange(0,2*Math.round(rain.userData.n*(.2+.8*rr)))}}
  if(rain){rain.position.set(px,0,pz);const a=rain.geometry.attributes.position.array;for(let i=0;i<a.length;i+=6){a[i+1]-=dt*22;a[i+4]-=dt*22;if(a[i+4]<0){const y=25+R()*5;a[i+1]=y;a[i+4]=y-.8}}rain.geometry.attributes.position.needsUpdate=true}
  if(started){
    // Danny
    if(!dannyM){dannyM=personMesh({...DANNY,me:1});scene.add(dannyM)}
    const two=pl.car&&TWO[pl.car.type];dannyM.visible=!pl.car||!!two;/* strict boolean: three.js only hides an object when visible === false, so undefined left the player standing where they got in */window.R3DBG&&(R3DBG.dannyVis=dannyM.visible,R3DBG.dannyPos=[dannyM.position.x/K,dannyM.position.z/K]);
    if(two){const c=pl.car;dannyM.position.set(c.x*K-Math.cos(c.a)*(c.type=='bike'?.1:.15),c.type=='scooter'?.25:.2,c.y*K-Math.sin(c.a)*(c.type=='bike'?.1:.15));dannyM.rotation.y=-c.a;animPerson(dannyM,0,dt,c.type!='scooter');if(c.type=='scooter')animPerson(dannyM,0,dt)}
    else if(!pl.car){const s=spd(pl,pl.x,pl.y,dt);dannyM.position.set(pl.x*K,(pl.z||0)+(pl.jz||0),pl.y*K);dannyM.rotation.y=-pl.a;animPerson(dannyM,s,dt);airPose(dannyM,pl.jz,false)}
    chuteCanopy(dt);
    // peds, their dogs, specials
    for(const q of peds){const m=ent(q,()=>personMesh(q)),s=spd(q,q.x,q.y,dt);m.scale.setScalar(q.kid?.78:1);m.position.set(q.x*K,q.jz||0,q.y*K);m.rotation.y=-q.a;animPerson(m,s,dt);airPose(m,q.jz,q.startle>0);
      if(q.dog){const d=q.dog,dm=ent(d,()=>dogMesh(d.col,d.big,d.patch)),ds=spd(d,d.x,d.y,dt);dm.position.set(d.x*K,0,d.y*K);dm.rotation.y=-d.a;animDog(dm,ds,dt,tSec)}
      if(q.happy>0||q.want){const k=q.happy>0?'h':'w',pm=ent(q.happy>0?q.hp||(q.hp={}):q.wp||(q.wp={}),()=>pinSprite(q.happy>0?'♥':'?',q.happy>0?'#ff6fa5':'#3a6fd8'));pm.position.set(q.x*K,2.55+Math.sin(tSec*3)*.08,q.y*K);pm.scale.set(.55,.55,1)}}
    for(const q of specials){const m=ent(q,()=>personMesh(q)),s=spd(q,q.x,q.y,dt);m.position.set(q.x*K,0,q.y*K);m.rotation.y=-q.a;animPerson(m,s,dt);
      if(q.kind!='bell'&&!q.nopin&&hyp(q.x-p.x,q.y-p.y)<90){const pm=ent(q.pinO||(q.pinO={}),()=>pinSprite(q.kind=='monk'?'☸':'♪',q.kind=='monk'?'#e8a020':'#e02020'));pm.position.set(q.x*K,2.7+Math.sin(tSec*3)*.1,q.y*K);pm.scale.set(.75,.75,1)}}
    if(dog&&!dog.ride){const dm=ent(dog,()=>dogMesh('#b8783e',false,'#f0e6d0')),ds=spd(dog,dog.x,dog.y,dt);dm.position.set(dog.x*K,0,dog.y*K);dm.rotation.y=-dog.a;animDog(dm,ds,dt,tSec);if(!dog.follow){const pm=ent(dog.pinO||(dog.pinO={}),()=>pinSprite('!','#ffb85c'));pm.position.set(dog.x*K,1.6+Math.sin(tSec*4)*.1,dog.y*K);pm.scale.set(.6,.6,1)}}
    if(typeof pack!='undefined'&&pack){for(const g of pack.dogs){const dm=ent(g,()=>dogMesh(g.col,g.big,g.patch)),ds=spd(g,g.x,g.y,dt);dm.position.set(g.x*K,0,g.y*K);dm.rotation.y=-g.a;animDog(dm,ds,dt,tSec)}
      if(hyp(pack.x-p.x,pack.y-p.y)<120&&pack.follow<=0){const pm=ent(pack.pin||(pack.pin={}),()=>pinSprite('🐾','#c8783a'));pm.position.set(pack.x*K,2.4+Math.sin(tSec*3)*.1,pack.y*K);pm.scale.set(.7,.7,1)}}
    for(const d of ducks){const m=ent(d,duckMesh);m.position.set(d.x*K,.05,d.y*K);m.rotation.y=-d.a}
    paraStep(p,dt);critStep(p,dt);fxStep(dt);
    trainStep(p,dt);
    for(const l of litter){const m=ent(l,litterMesh);m.position.set(l.x*K,.04,l.y*K)}
    if(window.keyItem){const k=window.keyItem,m=ent(k,keyMesh);m.position.set(k.x*K,.05,k.y*K);m.rotation.y=tSec;const pm=ent(k.pin||(k.pin={}),()=>pinSprite('🔑','#e8c020'));pm.position.set(k.x*K,1.5+Math.sin(tSec*3)*.1,k.y*K);pm.scale.set(.65,.65,1)}
    if(window.keyHeld){const k=window.keyHeld,c=PKL[k.i];if(c&&!c.gone){const pm=ent(k.pin||(k.pin={}),()=>pinSprite('🔑','#3ac060'));pm.position.set(c.x*K,2.6+Math.sin(tSec*3)*.1,c.y*K);pm.scale.set(.7,.7,1)}}
    for(const pr of peersL){const q=pr.presence;if(typeof q.x!='number'||typeof q.y!='number')continue;const car=q.car&&['hatch','cab','van','bike','ebike','scooter','heli'].includes(q.car)?q.car:null,key=pr.k||(pr.k={}),kk=car?key[car]||(key[car]={}):key.p||(key.p={});
      const m=ent(kk,()=>car?vehMesh({type:car,col:/^#[0-9a-f]{6}$/i.test(q.col||'')?q.col:'#5ad1ff'}):personMesh({...PEER}));m.position.set(q.x*K,car=='heli'?20:0,q.y*K);m.rotation.y=-(Number(q.a)||0);if(!car)animPerson(m,1.5,dt);
      const pm=ent(key.pin||(key.pin={}),()=>pinSprite('●','#5ad1ff'));pm.position.set(q.x*K,car=='heli'?24:2.8,q.y*K);pm.scale.set(.5,.5,1)}
  }
  // vehicles (also on the title screen, once seeded)
  for(const c of cars){if(hyp(c.x-p.x,c.y-p.y)>560)continue;const m=ent(c,()=>{const m=vehMesh(c);if(c.type!='heli'){const bb=new THREE.Box3().setFromObject(m),sz=bb.getSize(new THREE.Vector3());m.add(blob(sz.z*1.15+.3,sz.x*1.1+.4))}return m});const y=c.type=='heli'?(c.alt||0)*55:0;m.position.set(c.x*K,y,c.y*K);m.rotation.y=-c.a;if(c.crashT!=null){const tt=fr-c.crashT;if(tt>=0&&tt<70){const w=(c.crashK||0)*Math.exp(-tt/14);m.rotation.z=Math.sin(tt*.7)*w*.12;m.rotation.x=Math.sin(tt*.9+1)*w*.07;m.position.y+=Math.abs(Math.sin(tt*.45))*w*.22}else{m.rotation.x=0;if(c.type!='heli')m.rotation.z=0;c.crashT=null}}
    if(c.type=='heli'){m.userData.rot.rotation.y=(c.rot||0)*.25;m.userData.tr.rotation.z=(c.rot||0)*.5;m.rotation.order='YZX';m.rotation.z=c.tilt||0;m.rotation.x=c.bank||0}/* nose dips at speed, banks into turns */
    else if(c.roll||c.pit){m.rotation.order='YZX';m.rotation.z=c.pit||0;m.rotation.x=c.roll||0;if(c!==pl.car){c.roll*=.9;c.pit*=.9;if(Math.abs(c.roll)<.0005)c.roll=0;if(Math.abs(c.pit)<.0005)c.pit=0}}/* body leans out of turns, nose lifts and dips */
    if(c.rental&&c!==pl.car&&hyp(c.x-p.x,c.y-p.y)<40){const pm=ent(c.pinO||(c.pinO={}),()=>pinSprite('£','#2bd17e'));pm.position.set(c.x*K,1.9+Math.sin(tSec*3)*.08,c.y*K);pm.scale.set(.5,.5,1)}
    if(c.own&&c!==pl.car&&c.type!='heli'){const pm=ent(c.pinO||(c.pinO={}),()=>pinSprite('♥','#ff6fa5'));pm.position.set(c.x*K,2.2+Math.sin(tSec*3)*.08,c.y*K);pm.scale.set(.6,.6,1)}
    if(c===heli&&c!==pl.car){const pm=ent(c.pinO||(c.pinO={}),()=>pinSprite('H','#1f4aa8'));pm.position.set(c.x*K,5+Math.sin(tSec*3)*.1,c.y*K);pm.scale.set(1.4,1.4,1)}}
  // places
  if(started)for(const k in P){const q=P[k],d=hyp(q.x-p.x,q.y-p.y);const giv=!act&&MIS[S.mission]&&MIS[S.mission].g==k;const key=(giv?'g':'n')+k;
    if(d<420){const pm=ent(PINS[key]||(PINS[key]={}),()=>pinSprite(q.ic,giv?'#ffb85c':q.c));const sc=cl(d*K*.045,1.1,4);pm.position.set(q.x*K,4.2+sc*.5+(giv?Math.abs(Math.sin(tSec*3))*.6:0),q.y*K);pm.scale.set(sc,sc,1);pm.material.opacity=giv?1:cl((d*K-8)/22,.35,1)/* fades a little close up, where the shop itself is in view */}}
  // shop name signs
  if(started){const SP=[];for(const sh of D.shops){const d=hyp(sh[2]-p.x,sh[3]-p.y);if(d<50){let lv=0;for(const q of SP)if(hyp(q[0]-sh[2],q[1]-sh[3])<6)lv++;if(lv>2)continue;SP.push([sh[2],sh[3]]);const m=ent(sh,()=>{const s=textSprite(sh[0],sh[0]=='M. Manze'?'#1f5a3a':'rgba(20,16,36,.85)','#fff',.8);return s});m.position.set(sh[2]*K,3.5+lv*.95,sh[3]*K);m.material.transparent=true;m.material.opacity=shopOpen(sh)?1:.4}}}/* shops that share a spot (or nearly) stack their name tags instead of drawing on top of each other; at most 3 per spot */
  // targets
  const t=started&&act?act.tg:null;if(t){beacon=beacon||beaconMesh(0xffb85c);beacon.visible=true;beacon.position.set(t.x*K,20,t.y*K)}else if(beacon)beacon.visible=false;
  if(started&&dest){destBeacon=destBeacon||beaconMesh(0xff6fa5);destBeacon.visible=true;destBeacon.position.set(dest.x*K,20,dest.y*K)}else if(destBeacon)destBeacon.visible=false;
  // route ribbon
  if(route!==routeRef){routeRef=route;if(routeM){scene.remove(routeM);routeM.geometry.dispose()}routeM=null;if(route&&route.length>1){const G=GB();ribbon(G,route.map(q=>[q[0]*K,q[1]*K]),1.1,.14,0,true);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(F32(G.p),3));routeM=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:dest?0xff6fa5:0xffb85c,transparent:true,opacity:.75,depthWrite:false,...PO(-6)}));scene.add(routeM)}}
  // particles
  for(let i=parts.length-1;i>=0;i--){const q=parts[i];if(!PICON[q.type]){parts.splice(i,1);continue}q.l-=f;q.h=(q.h||2)+.018*f;q.x+=q.vx*f*.15;q.y+=q.vx*f*.1;if(q.l<=0){parts.splice(i,1);continue}const m=ent(q,()=>pinSprite(...PICON[q.type]));m.position.set(q.x*K,q.h,q.y*K);const s=.45*Math.min(1,q.l/30);m.scale.set(s,s,1)}
  // remove anything no longer in the game
  for(const [o,m] of ENT)if(!seen.has(o)){scene.remove(m);ENT.delete(o);m.traverse(x=>{if(x.geometry&&!x.geometry.userData.shared)x.geometry.dispose();if(x.isSprite)x.material.dispose()})}
  platesUpdate(px,pz,dt);
  renderer.render(scene,camera)}
const angD=(a,b)=>{let d=a-b;while(d>PI)d-=2*PI;while(d<-PI)d+=2*PI;return d};
function K_moving(){return (pl._sp||0)>.5}
const _v=new THREE.Vector3();
function project(x,y,h){_v.set(x*K,h,y*K).project(camera);if(_v.z>1)return null;return{x:(_v.x+1)/2*innerWidth,y:(1-_v.y)/2*innerHeight}}
const PKL=[];const zeroM=new THREE.Matrix4().makeScale(0,0,0);
function takeParked(i){const p=PKL[i];if(!p||p.gone)return;p.gone=true;p.m.setMatrixAt(p.i,zeroM);p.m.instanceMatrix.needsUpdate=true;const c=Math.cos(p.a),sn=Math.sin(p.a),x=p.x*K,z=p.y*K;for(let a=-1.9;a<=1.9;a+=.475)for(let b=-.6;b<=.6;b+=.3){const X=((x+c*a-sn*b)/K)|0,Y=((z+sn*a+c*b)/K)|0;if(X>=0&&Y>=0&&X<W&&Y<H)FB[Y*W+X]=0}}
const keyMesh=()=>{const V=VB();addBox(V,.12,.02,.12,0,.02,0,'#c8c8d0');addBox(V,.2,.02,.05,.1,.02,0,'#e8c020');addBox(V,.03,.02,.06,.17,.02,.04,'#e8c020');return vmesh(V,false)};
/* Street-name plates: white plate on a black corner post at the end of each named street, where it meets the road across. Pooled: only the nearest few are real meshes, relabelled as you move, so there is no texture per street. (Seen in Street View as a pattern, not copied.) */
let PLK=null,ROADSR=null;const PLP=[],PLN=14;
function platesInit(){PLK=[];const seenK=new Set();
  for(const r of ROADSR||[]){if(!r.nm||!['residential','unclassified','tertiary','secondary','primary','living_street'].includes(r.c)||r.cob)continue;const p=r.p;let tot=0;for(let i=1;i<p.length;i++)tot+=hyp(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);if(tot<30)continue;
    for(const rev of [0,1]){const q=rev?[...p].reverse():p,P0=q[0];let dx=0,dz=0;for(let i=1;i<q.length;i++){dx=q[i][0]-P0[0];dz=q[i][1]-P0[1];if(hyp(dx,dz)>3)break}const L=hyp(dx,dz);if(L<1)continue;dx/=L;dz/=L;const nx=-dz,nz=dx;let ok=null;
      for(const off of [9,7,11,5]){for(const sd of [1,-1]){const x=P0[0]+dx*off+nx*sd*(r.w/2+.9),z=P0[1]+dz*off+nz*sd*(r.w/2+.9);if(tAt(x/K,z/K)==0){ok=[x,z];break}}if(ok)break}
      if(!ok)continue;const k=r.nm+'|'+Math.round(ok[0]/4)+'|'+Math.round(ok[1]/4);if(seenK.has(k))continue;seenK.add(k);PLK.push([ok[0],ok[1],r.nm,Math.atan2(dx,dz)])}}
  const post=new THREE.CylinderGeometry(.045,.055,2.5,6),pm=M({color:0x1c1c1e});
  for(let i=0;i<PLN;i++){const g=new THREE.Group(),po=new THREE.Mesh(post,pm);po.position.y=1.25;g.add(po);
    const cv=document.createElement('canvas');cv.width=256;cv.height=48;const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;
    const pt=new THREE.Mesh(new THREE.PlaneGeometry(.92,.17),new THREE.MeshLambertMaterial({map:tx,side:THREE.DoubleSide}));pt.position.set(0,2.32,.07);g.add(pt);
    g.visible=false;scene.add(g);PLP.push({g,cv,tx,key:null})}}
let plT=0;
function platesUpdate(px,pz,dt){if(!PLK){try{platesInit();window.R3DBG&&(R3DBG.plk=PLK)}catch(e){console.warn('plates',e);PLK=[]}}plT-=dt;if(plT>0)return;plT=.4;
  const near=[];for(let i=0;i<PLK.length;i++){const q=PLK[i],d=hyp(q[0]-px,q[1]-pz);if(d<55)near.push([d,i])}near.sort((a,b)=>a[0]-b[0]);const want=near.slice(0,PLN).map(a=>a[1]),have=new Map();
  for(const s of PLP)if(s.key!==null)have.set(s.key,s);const free=PLP.filter(s=>s.key===null||!want.includes(s.key));
  for(const i of want){if(have.has(i))continue;const s=free.pop();if(!s)break;const q=PLK[i];s.key=i;s.g.position.set(q[0],0,q[1]);s.g.rotation.y=q[3];s.g.visible=true;
    const g=s.cv.getContext('2d'),w=256,h=48;g.fillStyle='#f4f1e8';g.fillRect(0,0,w,h);g.strokeStyle='#161616';g.lineWidth=3;g.strokeRect(2,2,w-4,h-4);g.fillStyle='#141414';g.textAlign='center';g.textBaseline='middle';let fs=30;g.font='700 '+fs+'px Rubik, system-ui, sans-serif';const t=q[2].toUpperCase();while(g.measureText(t).width>w-20&&fs>12){fs-=2;g.font='700 '+fs+'px Rubik, system-ui, sans-serif'}g.fillText(t,w/2,h/2+1);s.tx.needsUpdate=true}
  for(const s of PLP)if(s.key!==null&&!want.includes(s.key)){s.g.visible=false;s.key=null}}
/* one frame with culling off so every mesh uploads to the GPU now and releases its CPU copy (three.js only uploads what is drawn) */
function warm(){const ms=[];scene.traverse(o=>{if(o.isMesh&&o.frustumCulled){o.frustumCulled=false;ms.push(o)}});try{renderer.render(scene,camera)}catch(e){console.warn('warm',e)}finally{for(const o of ms)o.frustumCulled=true}}
window.R3={build,warm,render,project,roofAt,fx:fxAdd,parked:()=>PKL,take:takeParked,info:()=>({...renderer.info.render,geo:renderer.info.memory.geometries})};
