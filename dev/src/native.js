/* ================== APPLICATION NATIVE (Android, Capacitor) ================== */
const NATIF=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
function PL(n){try{return(Capacitor.Plugins&&Capacitor.Plugins[n])||Capacitor.registerPlugin(n)}catch(e){return null}}
function blobB64(blob){return new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=ko;r.readAsDataURL(blob)})}
async function natSave(blob,name,text){const FS=PL('Filesystem'),SH=PL('Share');
  const w=await FS.writeFile({path:name,data:await blobB64(blob),directory:'CACHE'});
  try{await SH.share({title:name,text:text||name,files:[w.uri],dialogTitle:'Enregistrer ou envoyer'})}catch(e){if(!/cancel/i.test(String(e&&e.message||e)))throw e}return true}

/* Téléchargements (Excel, reçus PDF) : web = lien de téléchargement ; natif = partager / enregistrer */
DL={save:async({filename,data})=>{if(NATIF)return natSave(data,filename);
  const u=URL.createObjectURL(data);const a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}};

if(NATIF){
  document.documentElement.classList.add('natif');
  /* Reçu : en natif, la feuille de partage propose directement WhatsApp avec le PDF joint */
  const ra0=receiptAction;receiptAction=async function(kind,id){if(kind!=='share')return ra0(kind,id);
    try{toast('Préparation du PDF…');const r=await receiptPdf(id);const text=`Bonjour ${prenomOf(r.m)}, voici ton reçu ${r.num} (${r.c.nom} : ${fmt(r.x.montant)}). Merci !`;
      await natSave(r.doc.output('blob'),r.name,text)}catch(e){toast(e.message||'PDF indisponible.')}};
  /* Liens externes (WhatsApp, téléphone, SMS, e-mail) : ouverts dans l'application concernée */
  const ext=u=>{try{const A=PL('AppLauncher');if(A&&A.openUrl)return A.openUrl({url:u})}catch(e){}location.href=u};
  window.open=(u)=>{if(u)ext(String(u));return null};
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a)return;const h=a.getAttribute('href');
    if(/^(https?:|tel:|sms:|mailto:|whatsapp:)/i.test(h)&&!h.startsWith(location.origin)){e.preventDefault();e.stopPropagation();ext(a.href)}},true);
  /* Bouton retour Android : ferme la fenêtre ouverte, revient en arrière, sinon met l'appli en arrière-plan */
  PL('App').addListener('backButton',()=>{
    if(document.getElementById('modalBg').classList.contains('show')){closeModal();return}
    const p=PANES&&PANES[0];if(p&&p.session&&p.sub){p.sub=null;renderPane(p);return}
    if(p&&p.session&&!p.session.mustChange){const t0=tabsFor(p)[0][0];if(p.tab&&p.tab!==t0){p.tab=t0;renderPane(p);return}}
    PL('App').minimizeApp()});
  try{PL('StatusBar').setStyle({style:'LIGHT'});PL('StatusBar').setBackgroundColor({color:'#FFFFFF'})}catch(e){}
  try{majAuto()}catch(e){console.warn(e)}
  try{if(!Capacitor.isPluginAvailable||Capacitor.isPluginAvailable('PushNotifications'))pushNatif()}catch(e){console.warn('push',e)}
}

/* ---- Notifications Android (Firebase Cloud Messaging) ---- */
function pushNatif(){const PN=PL('PushNotifications');if(!PN)return;const LS='younity-fcm';
  const tok=()=>{try{return localStorage.getItem(LS)}catch(_){return null}};
  PN.createChannel({id:'younity',name:'Younity',description:'Paiements, rappels, événements, tâches',importance:4,visibility:1,vibration:true,lights:true,lightColor:'#135C2E'}).catch(()=>{});
  PN.addListener('registration',async t=>{try{localStorage.setItem(LS,t.value)}catch(_){}
    if(PANES[0]&&PANES[0].session)await rpc('enregistrer_abonnement',{p_endpoint:'fcm:'+t.value,p_p256dh:'fcm',p_auth:'fcm',p_appareil:'Application Android'}).catch(e=>console.warn('fcm',e));
    PUSH_ETAT='?'});
  PN.addListener('registrationError',e=>console.warn('fcm',e));
  PN.addListener('pushNotificationActionPerformed',()=>{const p=PANES[0];if(p&&p.session&&!p.session.mustChange){p.sub='notifs';p.notif=null;renderPane(p);if(typeof sync==='function')sync()}});
  PN.addListener('pushNotificationReceived',()=>{if(typeof sync==='function')sync()});
  const perm=async()=>{try{return(await PN.checkPermissions()).receive}catch(_){return'denied'}};
  pushEtat=async()=>{const r=await perm();return r==='denied'?'refuse':r==='granted'&&tok()?'actif':'inactif'};
  activerPush=async(sil)=>{let r=await perm();if(r!=='granted'&&r!=='denied')r=(await PN.requestPermissions()).receive;
    if(r!=='granted'){if(!sil)toast('Notifications refusées. Autorise-les dans Réglages > Applications > Younity > Notifications.');return false}
    await PN.register();PUSH_ETAT='?';if(!sil)toast('Notifications activées sur ce téléphone 🔔');return true};
  desactiverPush=async()=>{const t=tok();if(t)await rpc('supprimer_abonnement',{p_endpoint:'fcm:'+t}).catch(()=>{});
    await PN.unregister().catch(()=>{});try{localStorage.removeItem(LS)}catch(_){}PUSH_ETAT='?'};
  pushApresConnexion=async()=>{const r=await perm();if(r==='granted'){activerPush(true).catch(()=>{});return}if(r==='denied')return;
    let plusTard=0;try{plusTard=+localStorage.getItem('younity-push-plustard')||0}catch(_){}if(Date.now()-plusTard<7*864e5)return;
    setTimeout(()=>{if(document.getElementById('modalBg').classList.contains('show')||!PANES[0].session||PANES[0].session.mustChange)return;
      openModal(`<div style="text-align:center"><div class="avatar" style="margin:0 auto 12px;width:56px;height:56px;background:var(--green-soft);color:var(--green)"><i data-lucide="bell-ring" class="i" style="width:28px;height:28px"></i></div>
      <h2>Recevoir les notifications ?</h2><div class="muted">Younity te prévient sur ce téléphone, même quand l'application est fermée : paiements, rappels de cotisation, événements, tâches, anniversaires.</div></div>
      <div class="foot"><button class="btn sec" data-act="pushPlusTard">Plus tard</button><button class="btn" data-act="pushActiver"><i data-lucide="bell" class="i i-sm"></i>Activer</button></div>`,{pane:'m'})},1500)};
}

/* ---- Mises à jour automatiques en arrière-plan ----
   L'appli vérifie https://kngpa.github.io/Younity-/natif/version.json au démarrage et au retour dans l'appli.
   Si une version plus récente existe, elle la télécharge en silence ; elle s'installe la prochaine fois que
   l'appli passe en arrière-plan (aucune action du jeune, pas de Play Store). */
const MAJ_URL='https://kngpa.github.io/Younity-/natif/version.json';
function vNum(v){return String(v||'0').split('.').map(x=>+x||0).reduce((a,x)=>a*1000+x,0)}
let MAJ_T=0,MAJ={etat:'',v:'',pct:0,id:null};
/* Petite barre en bas de l'écran : téléchargement puis « mise à jour prête » */
function majBar(){let el=document.getElementById('majBar');
  if(!MAJ.etat||MAJ.ferme){if(el)el.remove();return}
  if(!el){el=document.createElement('div');el.id='majBar';document.body.appendChild(el)}
  el.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));z-index:9000;background:#123a26;color:#fff;border-radius:14px;padding:10px 12px 10px 14px;display:flex;align-items:center;gap:10px;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.25);width:min(92vw,420px)';
  el.innerHTML=MAJ.etat==='dl'?`<i data-lucide="download" class="i i-sm"></i><div style="flex:1"><b>Mise à jour ${esc(MAJ.v)}</b> en téléchargement…<div style="height:4px;background:rgba(255,255,255,.2);border-radius:4px;margin-top:6px;overflow:hidden"><i style="display:block;height:100%;width:${MAJ.pct}%;background:#F2B233"></i></div></div>`
   :`<i data-lucide="sparkles" class="i i-sm" style="color:#F2B233"></i><div style="flex:1"><b>Mise à jour ${esc(MAJ.v)} prête</b><div style="opacity:.75;font-size:11.5px">Elle s'installera à la prochaine ouverture</div></div><button data-act="majOk" style="background:#F2B233;color:#1a1a1a;border:0;border-radius:10px;padding:8px 10px;font-weight:800;font-size:12.5px">Installer</button><button data-act="majX" style="background:none;border:0;color:#fff;opacity:.7;font-size:18px;padding:0 4px">×</button>`;
  try{lucide.createIcons()}catch(_){}}
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('#majBar [data-act],[data-act="majCheck"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const a=b.dataset.act;const U=PL('CapacitorUpdater');
  if(a==='majOk'&&MAJ.id){toast('Installation de la mise à jour…');await U.set({id:MAJ.id})}
  if(a==='majX'){MAJ.ferme=true;majBar()}
  if(a==='majCheck'){MAJ_T=0;toast('Recherche d\'une mise à jour…');const r=await majVerif(true);if(r==='rien')toast(`Younity est à jour (version ${window.YV}).`)}},true);
async function majVerif(manuel){const U=PL('CapacitorUpdater');if(!U||(!manuel&&Date.now()-MAJ_T<10*60000))return;MAJ_T=Date.now();
  try{const r=await fetch(MAJ_URL+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const j=await r.json();
    if(vNum(j.version)<=vNum(window.YV))return'rien';
    const L=await U.list();let b=(L.bundles||[]).find(x=>x.version===j.version&&x.status!=='error');
    if(!b){Object.assign(MAJ,{etat:'dl',v:j.version,pct:0,ferme:false});majBar();b=await U.download({url:j.url,version:j.version})}
    await U.next({id:b.id});Object.assign(MAJ,{etat:'pret',v:j.version,id:b.id});majBar();
    if(j.forcer)await U.set({id:b.id});return'ok'
  }catch(e){console.warn('maj',e);MAJ.etat='';majBar();if(manuel)toast('Mise à jour impossible pour le moment (connexion ?).')}}
function majAuto(){const U=PL('CapacitorUpdater');
  if(location.hostname!=='localhost'){try{U&&U.notifyAppReady().catch(()=>{})}catch(_){}
    const vp0=vProfil;vProfil=function(p){return vp0(p)+`<div class="card mt"><div class="name" style="font-size:13.5px">Younity ${esc(window.YV)} · application Android</div><div class="muted">Toujours à jour : chaque ouverture charge la dernière version.</div></div>`};return}
  if(!U)return;
  U.notifyAppReady().catch(()=>{});
  try{U.addListener('download',d=>{if(MAJ.etat==='dl'){MAJ.pct=Math.round(d.percent||0);majBar()}})}catch(_){}
  setTimeout(()=>majVerif(),4000);
  PL('App').addListener('appStateChange',s=>{if(s.isActive)majVerif()});
  /* Version affichée dans Mon profil, avec un bouton pour vérifier tout de suite */
  const vp=vProfil;vProfil=function(p){return vp(p)+`<div class="card mt" style="display:flex;align-items:center;gap:12px"><div style="flex:1"><div class="name" style="font-size:13.5px">Younity ${esc(window.YV)} · application Android</div><div class="muted">Les mises à jour s'installent toutes seules.</div></div><button class="btn sec sm" data-act="majCheck"><i data-lucide="refresh-cw" class="i i-sm"></i>Vérifier</button></div>`}}

/* Version web (navigateur / ancienne appli Chrome) : on l'indique dans Mon profil */
if(!NATIF){const vpw=vProfil;vProfil=function(p){return vpw(p)+`<div class="card mt"><div class="name" style="font-size:13.5px">Younity ${esc(window.YV)} · version navigateur</div><div class="muted mb">Tu utilises Younity dans le navigateur (Chrome). Pour l'application Android avec ses propres notifications, installe-la :</div><a class="btn sec sm" href="https://kngpa.github.io/android" target="_blank" rel="noopener"><i data-lucide="download" class="i i-sm"></i>Installer l'application Android</a></div>`}}

/* ---- Tirer l'écran vers le bas pour actualiser (téléphone et tablette) ---- */
(function(){let y0=null,dy=0,sc=null,busy=false,el=null;const SEUIL=72;
  const ind=()=>{if(!el){el=document.createElement('div');el.id='ptr';el.innerHTML='<i data-lucide="refresh-cw" class="i"></i>';
    el.style.cssText='position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 8px);width:40px;height:40px;margin-left:-20px;border-radius:50%;background:#fff;color:#135C2E;box-shadow:0 4px 16px rgba(0,0,0,.18);display:grid;place-items:center;z-index:8000;opacity:0;transform:translateY(-50px);pointer-events:none';
    document.body.appendChild(el);try{lucide.createIcons({nodes:[el]})}catch(_){try{lucide.createIcons()}catch(__){}}}return el};
  const pose=(d,anim)=>{const e=ind();const k=Math.min(d,110);e.style.transition=anim?'transform .25s,opacity .25s':'none';e.style.transform=`translateY(${k-50}px) rotate(${k*3}deg)`;e.style.opacity=Math.min(1,k/SEUIL)};
  document.addEventListener('touchstart',e=>{if(busy||e.touches.length!==1||document.getElementById('modalBg')?.classList.contains('show')||document.getElementById('spWrap'))return;
    if(!PANES[0]||!PANES[0].session)return;
    sc=e.target.closest&&e.target.closest('.m-body,.w-main');const s=sc||document.scrollingElement;if(s.scrollTop>0||document.scrollingElement.scrollTop>0){y0=null;return}
    y0=e.touches[0].clientY;dy=0},{passive:true});
  document.addEventListener('touchmove',e=>{if(y0===null||busy)return;dy=(e.touches[0].clientY-y0)*0.5;if(dy>4)pose(dy)},{passive:true});
  document.addEventListener('touchend',async()=>{if(y0===null||busy)return;y0=null;
    if(dy<SEUIL){pose(0,true);return}
    busy=true;const e=ind();e.style.transition='transform .2s';e.style.transform='translateY(20px)';e.style.opacity=1;e.firstElementChild&&(e.firstElementChild.style.animation='ptrspin .8s linear infinite');
    const t0=LASTSYNC;try{await sync(true)}catch(_){}toast(LASTSYNC!==t0?'À jour ✓':'Pas de connexion internet.')
    if(e.firstElementChild)e.firstElementChild.style.animation='';pose(0,true);busy=false},{passive:true});
  const st=document.createElement('style');st.textContent='@keyframes ptrspin{to{transform:rotate(360deg)}}';document.head.appendChild(st)})();
