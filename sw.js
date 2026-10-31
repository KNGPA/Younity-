// Younity — service worker : l'application s'ouvre vite et même hors connexion (les données, elles, viennent du serveur).
const V='younity-v2';
const FICHIERS=['./','index.html','manifest.webmanifest','vendor/supabase.js','vendor/lucide.min.js','vendor/xlsx.full.min.js','vendor/jspdf.umd.min.js',
  'icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FICHIERS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;            // le serveur Supabase n'est jamais mis en cache
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))))});
