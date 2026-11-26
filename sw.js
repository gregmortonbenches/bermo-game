/* caches the big data files so repeat visits and bad signal are fine. Bump V when data files change. */
const V='bermo-v1',BIG=/\.(json|png|jpg)$|three\.module\.js$/;
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!='GET')return;
  const u=new URL(r.url);if(u.origin!=location.origin&&!/jsdelivr/.test(u.host))return;
  if(BIG.test(u.pathname))e.respondWith(caches.open(V).then(c=>c.match(r).then(h=>h||fetch(r).then(n=>{if(n.ok)c.put(r,n.clone());return n}))));
  else e.respondWith(fetch(r).then(n=>{if(n.ok&&u.origin==location.origin){const k=n.clone();caches.open(V).then(c=>c.put(r,k))}return n}).catch(()=>caches.match(r)))});
