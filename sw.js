// Younity — service worker : l'application s'ouvre vite et même hors connexion (les données, elles, viennent du serveur).
const V='younity-v4';
const FICHIERS=['./','index.html','manifest.webmanifest','vendor/supabase.js','vendor/lucide.min.js','vendor/xlsx.full.min.js','vendor/jspdf.umd.min.js',
  'icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FICHIERS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;            // le serveur Supabase n'est jamais mis en cache
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))))});

// ---- Notifications sur le téléphone ----
self.addEventListener('push',e=>{let d={};try{d=e.data.json()}catch(_){d={title:'Younity',body:e.data?e.data.text():''}}
  e.waitUntil(self.registration.showNotification(d.title||'Younity',{body:d.body||'',icon:'icons/icon-192.png',badge:'icons/badge-96.png',tag:d.tag,data:{url:d.url||'./#notifications'},lang:'fr'}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=new URL((e.notification.data&&e.notification.data.url)||'./#notifications',self.registration.scope).href;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(L=>{for(const c of L){if(c.url.startsWith(self.registration.scope)){c.postMessage({younity:'notifications'});return c.focus()}}return clients.openWindow(url)}))});
