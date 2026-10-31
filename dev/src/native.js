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
  majAuto();
}

/* ---- Mises à jour automatiques en arrière-plan ----
   L'appli vérifie https://kngpa.github.io/Younity-/natif/version.json au démarrage et au retour dans l'appli.
   Si une version plus récente existe, elle la télécharge en silence ; elle s'installe la prochaine fois que
   l'appli passe en arrière-plan (aucune action du jeune, pas de Play Store). */
const MAJ_URL='https://kngpa.github.io/Younity-/natif/version.json';
function vNum(v){return String(v||'0').split('.').map(x=>+x||0).reduce((a,x)=>a*1000+x,0)}
let MAJ_T=0;
async function majVerif(){const U=PL('CapacitorUpdater');if(!U||Date.now()-MAJ_T<10*60000)return;MAJ_T=Date.now();
  try{const r=await fetch(MAJ_URL+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const j=await r.json();
    if(vNum(j.version)<=vNum(window.YV))return;
    const L=await U.list();let b=(L.bundles||[]).find(x=>x.version===j.version&&x.status!=='error');
    if(!b)b=await U.download({url:j.url,version:j.version,checksum:j.checksum||undefined});
    await U.next({id:b.id});if(j.forcer)await U.set({id:b.id});
  }catch(e){console.warn('maj',e)}}
function majAuto(){const U=PL('CapacitorUpdater');if(!U)return;
  U.notifyAppReady().catch(()=>{});setTimeout(majVerif,4000);
  PL('App').addListener('appStateChange',s=>{if(s.isActive)majVerif()})}
