/* =====================================================================
   YOUNITY — couche de données réelle (Supabase)
   Les écrans viennent du prototype validé ; ici on remplace les données
   de démonstration par la vraie base, et chaque action par un appel serveur.
   ===================================================================== */
const SB_URL='https://zrnhsdtpfyjlvrgrmssf.supabase.co',SB_KEY='sb_publishable_HPuEkuvoy2eAFJ3F5EuZGg_F74ruVQX';
const sb=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'younity-session',detectSessionInUrl:false}});
const IMG=path=>path?`${SB_URL}/storage/v1/object/public/visuels/${path}`:'';

/* ---- identifiants : la base utilise des uuid, les écrans des nombres ---- */
const IDM={u2i:new Map(),i2u:new Map(),n:1};
function I(u){if(u==null)return null;let i=IDM.u2i.get(u);if(!i){i=IDM.n++;IDM.u2i.set(u,i);IDM.i2u.set(i,u)}return i}
function U(i){return i==null||i===''?null:IDM.i2u.get(+i)||null}
let ME=null;      // résultat de mon_compte()
let PAYU=new Map(); // numéro de reçu -> uuid du paiement

function emptyDB(){return{seq:1e6,members:[],accounts:[],roles:[],campaigns:[],payments:[],journal:[],relances:[],notifs:[],events:[],evtRep:[],tasks:[],affiches:[],suivi:[],
  settings:{paiementIntegre:false,operateurs:{'Orange Money':true,'MTN MoMo':true,'Moov Money':true,'Wave':true},apiStatut:'test',departements:[],fonctions:[]},depIds:{},fonIds:{}}}

function errMsg(e){const m=(e&&(e.message||e.error_description||e.erreur))||String(e||'');
  if(/Failed to fetch|NetworkError|Load failed/i.test(m))return'Pas de connexion internet. Réessaie dans un instant.';
  if(/JWT|session/i.test(m))return'Ta session a expiré. Reconnecte-toi.';
  return m.replace(/^.*?ERROR:\s*/,'')}
async function rpc(name,params){const{data,error}=await sb.rpc(name,params||{});if(error)throw error;return data}
async function fn(name,body){const{data,error}=await sb.functions.invoke(name,{body});
  if(error){let msg=error.message;try{const j=await error.context.json();msg=j.erreur||j.message||msg}catch(_){}throw new Error(msg)}return data}
async function q(table,build){let r=sb.from(table).select('*');if(build)r=build(r);const{data,error}=await r;if(error){console.warn(table,error.message);return[]}return data||[]}
async function must(p){const{data,error}=await p;if(error)throw error;return data}

/* ---- chargement complet (moins de 100 jeunes : on charge tout ce qu'on a le droit de voir) ---- */
async function loadAll(){
  const mc=await rpc('mon_compte');ME=mc;if(!mc||mc.etat!=='actif')return mc;
  const [deps,fons,mems,roles,comptes,camps,lignes,pays,rels,notifs,journ,params,evts,parts,etaches,affs,taches,tpers,trap,anniv]=await Promise.all([
    q('departements',r=>r.order('nom')),q('fonctions',r=>r.order('nom')),q('membres'),q('roles'),q('comptes'),q('campagnes',r=>r.order('cree_le')),q('campagne_lignes'),
    q('paiements',r=>r.order('saisi_le')),q('relances',r=>r.order('le')),q('notifications',r=>r.order('cree_le',{ascending:false}).limit(300)),
    q('journal',r=>r.order('le',{ascending:false}).limit(800)),q('parametres'),q('evenements',r=>r.order('debut')),q('evenement_participants'),q('evenement_taches',r=>r.order('id')),
    q('affiches'),q('taches',r=>r.order('cree_le')),q('tache_personnes'),q('tache_rappels',r=>r.order('le')),rpc('anniversaires').catch(()=>[])]);
  const D=emptyDB();
  const depName={},fonName={};deps.forEach(d=>{depName[d.id]=d.nom;D.depIds[d.nom]=d.id});fons.forEach(f=>{fonName[f.id]=f.nom;D.fonIds[f.nom]=f.id});
  D.settings.departements=deps.map(d=>d.nom);D.settings.fonctions=fons.map(f=>f.nom);
  const anniv2=(j,m)=>j&&m?String(m).padStart(2,'0')+'-'+String(j).padStart(2,'0'):'';
  D.members=mems.map(m=>({id:I(m.id),uuid:m.id,nom:m.nom,prenoms:m.prenoms||'',tel:m.tel||'',email:m.email||'',anniv:anniv2(m.anniv_jour,m.anniv_mois),baptise:!!m.baptise,
    fonction:fonName[m.fonction_id]||'Membre',profession:m.profession||'',habitation:m.habitation||'',departement:depName[m.departement_id]||'',adhesion:m.adhesion,actif:m.actif,creeLe:m.cree_le}));
  anniv.forEach(a=>{if(!D.members.find(x=>x.uuid===a.membre_id))D.members.push({id:I(a.membre_id),uuid:a.membre_id,nom:a.nom,prenoms:a.prenoms||'',tel:a.tel||'',email:'',anniv:anniv2(a.anniv_jour,a.anniv_mois),
    baptise:false,fonction:'Membre',profession:'',habitation:'',departement:a.departement||'',adhesion:null,actif:true,partiel:true})});
  D.roles=roles.map(r=>({id:r.id,nom:r.nom,systeme:r.systeme,perms:r.permissions||[]})).sort((a,b)=>(a.id==='president'?-1:b.id==='president'?1:a.id==='membre'?1:b.id==='membre'?-1:a.nom.localeCompare(b.nom)));
  const roleNom=id=>(D.roles.find(r=>r.id===id)||{}).nom||'';
  D.accounts=comptes.map(c=>({id:I(c.user_id),uid:c.user_id,memberId:I(c.membre_id),roleId:c.role_id,actif:c.actif,motif:c.motif_blocage||'',mustChange:c.doit_changer_mdp,derniere:c.derniere_connexion,creeLe:c.cree_le,prefs:c.prefs||{}}));
  const nameOf=u=>{if(!u)return'';const m=D.members.find(x=>x.uuid===u);if(!m)return'Bureau';const a=D.accounts.find(x=>x.memberId===m.id);const r=a&&a.roleId!=='membre'?` (${a.roleId==='president'?'Président':roleNom(a.roleId)})`:'';return titleCase(fullName(m))+r};
  D.campaigns=camps.map(c=>({id:I(c.id),uuid:c.id,nom:c.nom,nbMois:c.nb_mois,debut:c.debut.slice(0,7),statut:c.statut==='en_cours'?'En cours':'Clôturée',creePar:nameOf(c.cree_par),creeLe:c.cree_le,
    lignes:lignes.filter(l=>l.campagne_id===c.id).map(l=>({memberId:I(l.membre_id),montant:l.montant}))}));
  PAYU=new Map();
  D.payments=pays.map(x=>{PAYU.set(x.numero,x.id);return{id:x.numero,uuid:x.id,campagneId:I(x.campagne_id),memberId:I(x.membre_id),montant:x.montant,date:x.date_paiement,moyen:x.moyen,ref:x.reference||'',note:'',
    saisiPar:x.source==='appli'?'Paiement dans l\'application':nameOf(x.saisi_par)||'Trésorerie',saisiLe:x.saisi_le,annule:x.annule,motif:x.motif_annulation||'',source:x.source}});
  D.relances=rels.map(r=>({campagneId:I(r.campagne_id),memberId:I(r.membre_id),t:r.le,par:nameOf(r.par),canal:r.canal}));
  const myAcct=I(mc&&ME?(await sb.auth.getUser()).data.user?.id:null);
  D.notifs=notifs.map(n=>({id:n.id,t:n.cree_le,target:{acct:myAcct},type:n.type,title:n.titre,body:n.corps,read:n.lu?[myAcct]:[]})).reverse();
  D.journal=journ.map(j=>({t:j.le,auteur:j.auteur?nameOf(j.auteur):'Serveur',action:j.action,detail:j.detail})).reverse();
  const pr=params[0]||{};D.settings.paiementIntegre=!!pr.paiement_integre;if(pr.operateurs)D.settings.operateurs=pr.operateurs;
  const t16=s=>s?new Date(s).toISOString().slice(0,16):null;
  D.events=evts.map(e=>({id:I(e.id),uuid:e.id,titre:e.titre,description:e.description||'',categorie:e.categorie,debut:t16(e.debut),fin:t16(e.fin),lieu:e.lieu||'',img:IMG(e.image),imgPath:e.image,
    responsable:I(e.responsable),inscription:e.inscription,annule:e.annule,motif:e.motif_annulation||'',creePar:nameOf(e.cree_par),rap:{j7:1,j1:1,jj:1}}));
  D.evtRep=parts.map(r=>({evtId:I(r.evenement_id),mid:I(r.membre_id),reponse:r.reponse,present:r.present}));
  D.tasks=etaches.map(t=>({id:t.id,evtId:I(t.evenement_id),libelle:t.libelle,resp:I(t.responsable),echeance:t.echeance||'',faite:t.faite}));
  D.affiches=affs.map(a=>({id:I(a.id),uuid:a.id,titre:a.titre||'',img:IMG(a.image),imgPath:a.image,lien:a.lien||'',evtId:I(a.evenement_id),debut:a.debut,fin:a.fin||'',ordre:a.ordre,actif:a.actif}));
  D.suivi=taches.map(t=>({id:I(t.id),uuid:t.id,titre:t.titre,details:t.details||'',origine:t.origine||'',dateOrig:t.date_origine||'',echeance:t.echeance||'',tous:t.pour_tous,faite:t.faite,
    resp:tpers.filter(x=>x.tache_id===t.id).map(x=>I(x.membre_id)),creePar:nameOf(t.cree_par),creeLe:t.cree_le,
    rappels:trap.filter(x=>x.tache_id===t.id).map(x=>({t:x.le,canal:{appli:'Appli',whatsapp:'WhatsApp',sms:'SMS',groupe:'WhatsApp (groupe)'}[x.canal]||x.canal}))}));
  DB=D;return mc}

/* ---- remplacements des fonctions de démonstration ---- */
function persist(){}                     // tout est enregistré sur le serveur
function log(){}                         // le journal est rempli par le serveur
function notify(){}                      // les notifications sont créées par le serveur
function autoRappels(){}                 // les rappels partent du serveur chaque matin à 7h
function seed(){return emptyDB()}
function genPwd(){return''}
function demoAccounts(){return[]}
function exportCreds(){toast('Par sécurité, un mot de passe n\'est montré qu\'une fois, à la création de l\'accès.')}

let SYNCING=false,LASTSYNC=0;
async function sync(silent){if(SYNCING)return;SYNCING=true;try{const mc=await loadAll();LASTSYNC=Date.now();const p=PANES[0];
    if(p&&p.session&&mc&&mc.etat!=='actif'){await sb.auth.signOut();p.session=null;p.kicked=true}
    if(p&&p.session)p.session.mustChange=!!(mc&&mc.doit_changer_mdp)&&p.session.mustChange!==false;
    if(silent&&(document.getElementById('modalBg').classList.contains('show')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)))return;
    PANES.forEach(o=>{o.keepScroll=true;renderPane(o)})}
  catch(e){if(!silent)toast(errMsg(e))}finally{SYNCING=false}}
setInterval(()=>{if(document.visibilityState==='visible'&&PANES[0]&&PANES[0].session&&Date.now()-LASTSYNC>25000)sync(true)},30000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&PANES[0]&&PANES[0].session&&Date.now()-LASTSYNC>10000)sync(true)});

/* ---- un seul écran, qui s'adapte : téléphone, tablette portrait, tablette paysage / ordinateur ---- */
function layoutMode(){return window.innerWidth>=1000?'web':'mobile'}
function setupPanes(){MODE=layoutMode();const w=window.innerWidth;
  document.body.classList.toggle('full-mobile',MODE==='mobile');document.body.classList.toggle('tablette',MODE==='mobile'&&w>=700);document.body.classList.toggle('large',MODE==='web');
  if(!PANES.length)PANES=[{id:'m',mode:MODE,session:null,sub:null,pay:{},notif:null,f:{}}];else PANES[0].mode=MODE;renderAll()}
function renderAll(){const st=document.getElementById('stage');
  if(!document.getElementById('pane-m'))st.innerHTML='<div class="pane-wrap on"><div id="pane-m" data-pane="m"></div></div>';
  PANES.forEach(renderPane)}
let lastW=layoutMode();window.addEventListener('resize',()=>{const m=layoutMode();document.body.classList.toggle('tablette',m==='mobile'&&window.innerWidth>=700);if(m!==lastW){lastW=m;setupPanes()}});

function loginHtml(p){
  return `<div style="margin:4px 0 22px">${logoFull(210)}</div>
  ${p.kicked?'<div class="info red mb">Ta session a été fermée : ton compte a été bloqué ou rendu inactif. Rapproche-toi du président.</div>':''}<h2>Bienvenue</h2><div class="muted" style="font-size:13.5px;margin:4px 0 18px">Connecte-toi avec ton numéro de téléphone ou ton e-mail, et ton mot de passe.</div>
  <form data-login="${p.id}">
  <div class="field"><label>Téléphone ou e-mail</label><input class="inp" id="li-id-${p.id}" placeholder="07 00 00 00 00 ou nom@mail.com" autocomplete="username" inputmode="email"></div>
  <div class="field"><label>Mot de passe</label><div class="pw-wrap"><input class="inp" id="li-pw-${p.id}" type="password" autocomplete="current-password"><button type="button" class="pw-eye" data-act="pwEye" aria-label="Afficher le mot de passe"><i data-lucide="eye" class="i i-sm"></i></button></div></div>
  <div id="li-err-${p.id}" class="info red mb" style="display:none"></div>
  <button class="btn block" type="submit" id="li-go-${p.id}"><i data-lucide="log-in" class="i"></i>Se connecter</button></form>
  <div style="text-align:center;margin-top:12px"><button class="link" data-act="forgot">Mot de passe oublié ?</button></div>
  <div class="muted mt" style="text-align:center;font-size:12px">Pas d'inscription libre : les accès sont créés par le président.</div>`}
function vMustChange(p){const m=sMember(p);
  return `<div class="card" style="max-width:460px;margin:0 auto"><h3><i data-lucide="shield-check" class="i"></i>Première connexion</h3>
  <div class="muted mb">Bonjour ${esc(prenomOf(m))}. Choisis ton propre mot de passe pour remplacer celui que tu as reçu.</div>
  <div class="field"><label>Nouveau mot de passe (6 caractères minimum)</label><input class="inp" type="password" id="mc-1-${p.id}" autocomplete="new-password"></div>
  <div class="field"><label>Confirmer</label><input class="inp" type="password" id="mc-2-${p.id}" autocomplete="new-password"></div>
  <button class="btn block" data-act="mcSave">Enregistrer et continuer</button>
  <button class="btn sec block mt" data-act="logout">Se déconnecter</button></div>`}

/* ---- connexion ---- */
async function doLogin(p){const ident=document.getElementById('li-id-'+p.id).value.trim(),pw=document.getElementById('li-pw-'+p.id).value;
  const err=document.getElementById('li-err-'+p.id),btn=document.getElementById('li-go-'+p.id);const fail=t=>{err.style.display='block';err.textContent=t};
  if(!ident||!pw)return fail('Entre ton identifiant et ton mot de passe.');
  btn.disabled=true;btn.classList.add('busy');err.style.display='none';
  try{const email=await rpc('login_email',{identifiant:ident});
    if(!email)return fail('Aucun accès actif ne correspond à ce numéro ou cet e-mail. Si ton numéro est partagé, connecte-toi avec ton e-mail. Sinon, rapproche-toi du président.');
    const{error}=await sb.auth.signInWithPassword({email,password:pw});
    if(error)return fail(/invalid/i.test(error.message)?'Mot de passe incorrect.':/banned/i.test(error.message)?'Ton compte est bloqué. Rapproche-toi du président.':errMsg(error));
    await startSession(p)}
  catch(e){fail(errMsg(e))}finally{btn.disabled=false;btn.classList.remove('busy')}}
async function startSession(p){const{data}=await sb.auth.getUser();const u=data.user;if(!u){p.session=null;renderPane(p);return}
  const mc=await loadAll();
  if(!mc||mc.etat!=='actif'){await sb.auth.signOut();p.session=null;p.kicked=mc&&(mc.etat==='bloque'||mc.etat==='inactif');renderPane(p);return}
  rpc('enregistrer_connexion').catch(()=>{});
  p.session={accountId:I(u.id),mustChange:!!mc.doit_changer_mdp};p.kicked=false;p.tab=null;p.sub=null;p.f={};p.pay={};LASTSYNC=Date.now();renderPane(p);
  if(location.hash==='#notifications'&&!p.session.mustChange){history.replaceState(null,'',location.pathname);API.openNotifs(p)}
  pushApresConnexion()}
window.addEventListener('submit',async e=>{const f=e.target.closest('form[data-login]');if(!f)return;e.preventDefault();e.stopImmediatePropagation();doLogin(pane(f.dataset.login))},true);

/* ---- listes : départements et fonctions ---- */
window.addEventListener('submit',async e=>{const la=e.target.closest('form[data-listadd]');if(!la)return;e.preventDefault();e.stopImmediatePropagation();
  const k=la.dataset.listadd,inp=la.querySelector('input'),v=inp.value.trim();if(!v)return;
  if(DB.settings[k].some(x=>norm(x)===norm(v))){toast('Déjà dans la liste.');return}
  try{await must(sb.from(k==='departements'?'departements':'fonctions').insert({nom:v}));inp.value='';toast((k==='departements'?'Département':'Fonction')+' ajouté(e).');await sync();
    const n=document.getElementById(`la-${k}-m`);if(n)n.focus()}catch(err){toast(errMsg(err))}},true);

/* ---- actions branchées sur le serveur ---- */
const API={};let BUSY=false;
window.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;
  if(el.dataset.replay){delete el.dataset.replay;return}
  const a=el.dataset.act,f=API[a];if(!f)return;
  e.stopImmediatePropagation();if(el.tagName!=='A')e.preventDefault();
  const p=pane(el.closest('[data-pane]')?.dataset.pane||MCTX?.pane)||PANES[0];if(p&&!el.closest('#modal'))MCTX={pane:p.id};
  if(BUSY)return;BUSY=true;el.classList.add('busy');
  try{const r=await f(p,el.dataset,el);
    if(r==='replay'){el.dataset.replay='1';el.click();await sync()}
    else if(r!=='nosync')await sync()}
  catch(err){console.error(err);toast(errMsg(err))}
  finally{BUSY=false;el.classList.remove('busy')}},true);
const gv=(id)=>{const e=document.getElementById(id);return e?e.value.trim():''};
function dataUrlBlob(u){const[h,b]=u.split(',');const bin=atob(b);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:h.match(/:(.*?);/)[1]})}
async function uploadImg(dataUrl,folder){if(!dataUrl||!dataUrl.startsWith('data:'))return null;const path=`${folder}/${crypto.randomUUID()}.jpg`;
  await must(sb.storage.from('visuels').upload(path,dataUrlBlob(dataUrl),{contentType:'image/jpeg',upsert:false}));return path}

API.pwEye=async(p,d,el)=>{const i=el.parentElement.querySelector('input');if(!i)return'nosync';const show=i.type==='password';i.type=show?'text':'password';
  el.setAttribute('aria-label',show?'Cacher le mot de passe':'Afficher le mot de passe');el.innerHTML=`<i data-lucide="${show?'eye-off':'eye'}" class="i i-sm"></i>`;icons();return'nosync'};
/* œil afficher / cacher sur tous les champs de mot de passe (connexion, première connexion, profil, mot de passe oublié) */
function pwEyes(root){(root||document).querySelectorAll('input[type=password]:not([data-eye])').forEach(i=>{i.dataset.eye='1';if(i.parentElement.classList.contains('pw-wrap'))return;
  const w=document.createElement('div');w.className='pw-wrap';i.parentNode.insertBefore(w,i);w.appendChild(i);
  w.insertAdjacentHTML('beforeend','<button type="button" class="pw-eye" data-act="pwEye" aria-label="Afficher le mot de passe"><i data-lucide="eye" class="i i-sm"></i></button>');icons()})}
new MutationObserver(()=>pwEyes()).observe(document.documentElement,{childList:true,subtree:true});
API.logout=async p=>{await desactiverPush();await sb.auth.signOut();PUSH_ETAT='?';p.session=null;p.sub=null;p.notif=null;DB=emptyDB();renderPane(p);return'nosync'};
API.mcSave=async p=>{const a1=gv('mc-1-'+p.id),a2=gv('mc-2-'+p.id);if(a1.length<6){toast('6 caractères minimum.');return'nosync'}if(a1!==a2){toast('Les deux mots de passe sont différents.');return'nosync'}
  const{error}=await sb.auth.updateUser({password:a1});if(error)throw error;await rpc('mot_de_passe_change');
  if(p.session&&p.session.mustChange){p.session.mustChange=false;pushApresConnexion()}if(p.session)p.session.mustChange=false;['mc-1-','mc-2-'].forEach(k=>{const e=document.getElementById(k+p.id);if(e)e.value=''});toast('Mot de passe enregistré.')};
API.mcSkip=async()=>'nosync';
API.saveMail=async p=>{const v=gv('pm-mail-'+p.id).toLowerCase();if(v&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){toast('E-mail invalide.');return'nosync'}
  await rpc('maj_mon_email',{nouvel_email:v});toast('E-mail enregistré.')};
API.togglePref=async(p,d)=>{const a=sAcct(p);const pr=prefsOf(a);await rpc('maj_mes_prefs',{p:{[d.k]:!pr[d.k]}})};
API.openNotifs=async p=>{const a=sAcct(p);p.nSnap=new Set(notifsFor(a).L.filter(n=>!n.read.includes(a.id)).map(n=>n.id));p.sub='notifs';p.notif=null;renderPane(p);
  const ids=DB.notifs.filter(n=>!n.read.length).map(n=>n.id);if(ids.length)sb.from('notifications').update({lu:true}).in('id',ids).then(()=>{DB.notifs.forEach(n=>{if(!n.read.length)n.read=[a.id]})});return'nosync'};

/* mot de passe oublié */
API.fgSendCode=async(p,d)=>{if(!d.again){const v=gv('fg-mail').toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){fgErr('Entre une adresse e-mail valide.');return'nosync'}FG.mail=v}
  FG.demo=null;await fn('mot-de-passe-oublie',{action:'envoyer',email:FG.mail});if(d.again)toast('Nouveau code envoyé (attends une minute entre deux envois).');fgModal('code');return'nosync'};
API.fgValidate=async()=>{const c=gv('fg-code'),p1=document.getElementById('fg-p1').value,p2=document.getElementById('fg-p2').value;
  if(!/^\d{6}$/.test(c)){fgErr('Le code fait 6 chiffres.');return'nosync'}if(p1.length<6){fgErr('6 caractères minimum.');return'nosync'}if(p1!==p2){fgErr('Les deux mots de passe sont différents.');return'nosync'}
  try{await fn('mot-de-passe-oublie',{action:'valider',email:FG.mail,code:c,mot_de_passe:p1})}catch(e){fgErr(errMsg(e));return'nosync'}
  const mail=FG.mail;closeModal();FG=null;toast('Mot de passe changé. Tu peux te connecter.');const i=document.getElementById('li-id-m');if(i)i.value=mail;return'nosync'};
API.fgPresSend=async()=>{const v=gv('fg-id');if(!v){fgErr('Entre ton numéro ou ton e-mail.');return'nosync'}FG.id=v;
  const n=await rpc('demander_reinitialisation',{p_identifiant:v});
  const txt=`Bonjour Président, j'ai oublié mon mot de passe Younity. Mon identifiant : ${v}. Merci de le réinitialiser 🙏`;
  openModal(`<h2>Demande envoyée ✅</h2><div class="muted mb">Si ce numéro ou cet e-mail correspond à un compte, le président a reçu ta demande dans l'application. Il t'enverra un mot de passe provisoire.</div>
  ${n?`<a class="btn ch-wa block" href="https://wa.me/225${n}?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener"><i data-lucide="message-circle" class="i i-sm"></i>Prévenir aussi le président sur WhatsApp</a>`:''}
  <div class="foot"><button class="btn" data-act="closeModal">Terminé</button></div>`,{pane:'m'});return'nosync'};

/* jeunes */
function readMemberForm(){const nom=gv('f-nom').toUpperCase(),prenoms=gv('f-prenoms').toUpperCase(),tel=gv('f-tel'),email=gv('f-email').toLowerCase();
  const an=readAnniv();const dep=gv('f-dep'),fon=gv('f-fonction');
  return{nom,prenoms,tel:tel||null,email:email||null,anniv_jour:an?+an.slice(3):null,anniv_mois:an?+an.slice(0,2):null,baptise:FORMBAP,profession:gv('f-prof')||null,habitation:gv('f-hab')||null,
    departement_id:dep?DB.depIds[dep]||null:null,fonction_id:fon&&fon!=='Membre'?DB.fonIds[fon]||null:(DB.fonIds['Membre']||null),adhesion:gv('f-adh')||undefined}}
API.saveMember=async(p,d)=>{const r=readMemberForm();if(!r.nom){toast('Le nom est obligatoire.');return'nosync'}
  if(r.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)){toast('E-mail invalide.');return'nosync'}
  const id=d.id?+d.id:null;
  const dup=DB.members.find(m=>m.id!==id&&!m.partiel&&((r.email&&m.email===r.email)||norm(fullName(m))===norm(r.nom+r.prenoms)));if(dup){toast(`Déjà enregistré : ${fullName(dup)}`);return'nosync'}
  if(id){const act=gv('f-actif');if(act)r.actif=act==='1';await must(sb.from('membres').update(r).eq('id',U(id)));closeModal();toast('Fiche mise à jour.');return}
  const wantAcc=document.getElementById('f-access')?.checked;const row=await must(sb.from('membres').insert(r).select().single());
  if(wantAcc&&(r.tel||r.email)){const res=await fn('creer-acces',{membre_id:row.id,role:'membre'});await sync();showCreds(I(row.id),res,'Jeune enregistré · accès créé');return'nosync'}
  closeModal();toast(wantAcc?'Enregistré. Pas d\'accès : il faut un téléphone ou un e-mail.':'Jeune enregistré.')};
API.confirmInactive=async(p,d)=>{await must(sb.from('membres').update({actif:false}).eq('id',U(d.id)));closeModal();toast('Membre inactif. Son accès est bloqué, son historique est gardé.')};
API.setActive=async(p,d)=>{await must(sb.from('membres').update({actif:true}).eq('id',U(d.id)));toast('Membre réactivé.')};
API.listRemove=async(p,d)=>{const k=d.k,t=k==='departements'?'departements':'fonctions';const used=DB.members.filter(m=>(k==='departements'?m.departement:m.fonction)===d.v).length;
  if(used){toast(`${used} jeune${used>1?'s ont':' a'} « ${d.v} » sur sa fiche : change-les d'abord.`);return'nosync'}
  await must(sb.from(t).delete().eq('id',k==='departements'?DB.depIds[d.v]:DB.fonIds[d.v]));toast('Retiré de la liste.')};
API.confirmImport=async()=>{if(!IMPORT)return'nosync';const sel=[...document.querySelectorAll('.imp-chk')].filter(c=>c.checked).map(c=>IMPORT.rows[+c.dataset.i]);const acc=document.getElementById('imp-acc').checked;
  const missing=[...new Set(sel.flatMap(o=>[o.departement&&!DB.depIds[o.departement]?['departements',o.departement]:null,o.fonction&&o.fonction!=='Membre'&&!DB.fonIds[o.fonction]?['fonctions',o.fonction]:null]).filter(Boolean).map(JSON.stringify))].map(JSON.parse);
  for(const[t,nom]of missing){await sb.from(t).insert({nom})}
  const lignes=sel.map(o=>({nom:o.nom,prenoms:o.prenoms,tel:o.tel,email:o.email,anniversaire:o.anniv?o.anniv.slice(3)+'/'+o.anniv.slice(0,2):'',baptise:o.baptise?'oui':'non',profession:o.profession,habitation:o.habitation,departement:o.departement,fonction:o.fonction==='Membre'?'':o.fonction}));
  const res=await rpc('importer_jeunes',{p_lignes:lignes});IMPORT=null;closeModal();await sync();
  let created=[];if(acc){const sans=DB.members.filter(m=>!m.partiel&&m.actif&&!acctOfMember(m.id)&&(m.tel||m.email)&&lignes.some(l=>norm(l.nom)===norm(m.nom)&&norm(l.prenoms||'')===norm(m.prenoms)));
    for(const m of sans){try{const r=await fn('creer-acces',{membre_id:m.uuid,role:'membre'});created.push({m,r})}catch(_){}}await sync()}
  const errs=res.erreurs||[];openModal(`<h2>Import terminé</h2><div class="receipt mt"><div class="rl"><span>Jeunes ajoutés</span><b>${res.ajoutes}</b></div><div class="rl"><span>Déjà présents (ignorés)</span><b>${res.ignores}</b></div>${acc?`<div class="rl"><span>Accès créés</span><b>${created.length}</b></div>`:''}${errs.length?`<div class="rl"><span>Lignes en erreur</span><b style="color:var(--red)">${errs.length}</b></div>`:''}</div>
  ${errs.length?`<div class="info red mt" style="font-size:12px">${errs.slice(0,8).map(x=>`Ligne ${x.ligne} (${esc(x.nom||'?')}) : ${esc(x.erreur)}`).join('<br>')}</div>`:''}
  ${created.length?`<div class="info gold mt" style="font-size:12px">Télécharge la liste des identifiants et mots de passe provisoires maintenant : elle ne pourra plus être affichée ensuite.</div>`:''}
  <div class="foot">${created.length?'<button class="btn sec" data-act="dlCreds">Télécharger les accès (Excel)</button>':''}<button class="btn" data-act="closeModal">Terminé</button></div>`,{pane:'m'});LASTCREDS=created;return'nosync'};
let LASTCREDS=[];
API.dlCreds=async()=>{saveXlsx('acces-younity.xlsx',[['Accès',[['Nom','Identifiant','Mot de passe provisoire'],...LASTCREDS.map(o=>[fullName(o.m),o.r.identifiant,o.r.mot_de_passe])],[32,24,20]]]);return'nosync'};

/* accès et rôles */
function showCreds(mid,res,title){const m=member(mid);const ac=acctOfMember(mid)||{memberId:mid,roleId:'membre'};
  if(res.avertissements&&res.avertissements.length)setTimeout(()=>toast(res.avertissements[0]),400);
  credModal(Object.assign({},ac,{pwd:res.mot_de_passe}),title)}
API.createAccess=async(p,d)=>{const m=member(+d.m);if(!m.tel&&!m.email){toast('Ajoute d\'abord un téléphone ou un e-mail.');return'nosync'}
  const res=await fn('creer-acces',{membre_id:m.uuid,role:'membre'});await sync();showCreds(m.id,res,'Accès créé');return'nosync'};
API.confirmRole=async()=>{const mid=+gv('r-m'),rid=pickedRole();const m=member(mid);const ac=acctOfMember(mid);if(!rid){toast('Choisis un rôle.');return'nosync'}
  if(ac&&ac.roleId==='president'){toast('Le président ne peut pas changer de rôle ici.');return'nosync'}
  if(ac){await rpc('attribuer_role',{p_membre:m.uuid,p_role:rid});if(!ac.actif)await fn('gerer-compte',{action:'debloquer',membre_id:m.uuid});closeModal();toast(`${prenomOf(m)} est maintenant ${role(rid).nom}. Il garde son mot de passe.`);return}
  const res=await fn('creer-acces',{membre_id:m.uuid,role:rid});closeModal();await sync();showCreds(mid,res,'Rôle attribué et accès créé');return'nosync'};
API.resetPwd=async(p,d)=>{const ac=DB.accounts.find(x=>x.id===+d.id);const m=member(ac.memberId);const res=await fn('gerer-compte',{action:'reinitialiser',membre_id:m.uuid});await sync();credModal(Object.assign({},ac,{pwd:res.mot_de_passe}),'Nouveau mot de passe');return'nosync'};
API.confirmBlock=async(p,d)=>{const ac=DB.accounts.find(x=>x.id===+d.id);await fn('gerer-compte',{action:'bloquer',membre_id:U(ac.memberId),motif:gv('blk-motif')||null});closeModal();toast('Compte bloqué : il ne peut plus se connecter.')};
API.unblockAcct=async(p,d)=>{const ac=DB.accounts.find(x=>x.id===+d.id);await fn('gerer-compte',{action:'debloquer',membre_id:U(ac.memberId)});toast('Compte débloqué.')};
API.toggleAcct=async(p,d)=>{const ac=DB.accounts.find(x=>x.id===+d.id);await fn('gerer-compte',{action:ac.actif?'bloquer':'debloquer',membre_id:U(ac.memberId)})};
API.createAll=async()=>{const L=DB.members.filter(m=>!m.partiel&&m.actif&&!acctOfMember(m.id)&&(m.tel||m.email));if(!L.length){toast('Tous les jeunes ont déjà un accès.');return'nosync'}
  const created=[];for(const m of L){try{created.push({m,r:await fn('creer-acces',{membre_id:m.uuid,role:'membre'})})}catch(e){console.warn(m.nom,e)}}LASTCREDS=created;await sync();
  openModal(`<h2>${created.length} accès créés</h2><div class="muted mb">Télécharge la liste maintenant pour transmettre à chacun son identifiant et son mot de passe provisoire : par sécurité, elle ne pourra plus être affichée.</div>
  <div class="foot"><button class="btn" data-act="dlCreds"><i data-lucide="download" class="i i-sm"></i>Télécharger (Excel)</button><button class="btn sec" data-act="closeModal">Fermer</button></div>`,{pane:'m'});return'nosync'};
API.saveRole=async(p,d)=>{const nom=gv('ro-nom');if(!nom){toast('Donne un nom au rôle.');return'nosync'}const perms=[...document.querySelectorAll('.ro-p')].filter(c=>c.checked).map(c=>c.value);
  if(d.id)await must(sb.from('roles').update({nom,permissions:perms}).eq('id',d.id));else await must(sb.from('roles').insert({id:'r_'+Date.now().toString(36),nom,permissions:perms,systeme:false}));closeModal()};
API.delRole=async(p,d)=>{await must(sb.from('roles').delete().eq('id',d.id));closeModal()};
API.appMsgSend=async(p,d)=>{const m=member(+d.m),t=gv('am-txt');if(!t){toast('Écris un message.');return'nosync'}await rpc('envoyer_message',{p_membre:m.uuid,p_titre:`Message de ${sessName(pane(MCTX.pane)||p)}`,p_corps:t});closeModal();toast('Message envoyé dans l\'application.')};

/* paramètres */
API.togglePay=async()=>{const v=!DB.settings.paiementIntegre;await must(sb.from('parametres').update({paiement_integre:v}).eq('id',true));
  toast(v?'Paiement dans l\'appli activé : il fonctionnera dès que les opérateurs (clés API) seront branchés.':'Paiement dans l\'appli désactivé.')};
API.toggleOp=async(p,d)=>{const ops=Object.assign({},DB.settings.operateurs,{[d.v]:!DB.settings.operateurs[d.v]});await must(sb.from('parametres').update({operateurs:ops}).eq('id',true))};
API.payGo=async()=>{toast('Le paiement Mobile Money sera disponible dès que les opérateurs seront branchés. En attendant, paie auprès de la trésorière.');return'nosync'};

/* campagnes */
API.confirmLaunch=async()=>{const P=PENDING;if(!P)return'nosync';const d=new Date();
  const c=await must(sb.from('campagnes').insert({nom:P.nom,nb_mois:P.n,debut:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`,cree_par:ME.membre_id}).select().single());
  if(P.lignes.length)await must(sb.from('campagne_lignes').insert(P.lignes.map(l=>({campagne_id:c.id,membre_id:U(l.memberId),montant:l.montant}))));
  PENDING=null;closeModal();const p=pane(P.pane);await sync();p.sub={camp:I(c.id)};renderPane(p);toast('Campagne lancée !');return'nosync'};
API.confirmSave=async()=>{const P=PENDING;if(!P)return'nosync';const c=camp(P.cid);
  await must(sb.from('campagnes').update({nom:P.nom,nb_mois:P.n}).eq('id',c.uuid));
  const newMap=new Map(P.lignes.map(l=>[l.memberId,l.montant]));
  for(const l of c.lignes)if(!newMap.has(l.memberId))await must(sb.from('campagne_lignes').delete().eq('campagne_id',c.uuid).eq('membre_id',U(l.memberId)));
  const up=P.lignes.filter(l=>P.oldMap.get(l.memberId)!==l.montant).map(l=>({campagne_id:c.uuid,membre_id:U(l.memberId),montant:l.montant}));
  if(up.length)await must(sb.from('campagne_lignes').upsert(up));
  PENDING=null;closeModal();toast('Campagne mise à jour.');const p=pane(P.pane);p.sub={camp:c.id}};
API.saveLine=async(p,d)=>{const c=camp(+d.c),m=member(+d.m);const v=+digits(gv('f-line'));if(!v){toast('Montant invalide.');return'nosync'}
  await must(sb.from('campagne_lignes').update({montant:v}).eq('campagne_id',c.uuid).eq('membre_id',m.uuid));closeModal();toast('Montant mis à jour.')};
API.removeLine=async(p,d)=>{const c=camp(+d.c),m=member(+d.m);await must(sb.from('campagne_lignes').delete().eq('campagne_id',c.uuid).eq('membre_id',m.uuid));closeModal()};
API.confirmClose=async(p,d)=>{await must(sb.from('campagnes').update({statut:'cloturee'}).eq('id',camp(+d.id).uuid));closeModal()};
API.reopenCamp=async(p,d)=>{await must(sb.from('campagnes').update({statut:'en_cours'}).eq('id',camp(+d.id).uuid))};

/* paiements */
API.submitPay=async p=>{const f=p.pay;const c=camp(+f.cid),mid=+f.mid,montant=+digits(f.montant);
  if(!mid){toast('Choisis le membre qui a payé.');return'nosync'}if(!montant){toast('Indique le montant reçu.');return'nosync'}if(!f.date){toast('Indique la date du paiement.');return'nosync'}
  const before=situation(c.id,mid);const m=member(mid);
  const x=await must(sb.from('paiements').insert({campagne_id:c.uuid,membre_id:m.uuid,montant,date_paiement:f.date,moyen:f.moyen,reference:f.moyen==='Espèces'?null:(f.ref||null),source:'tresoriere',saisi_par:ME.membre_id}).select().single());
  p.pay={cid:c.id,moyen:f.moyen,date:today()};await sync();const after=situation(c.id,mid);
  const changes=after.months.filter((mo,i)=>mo.paid!==before.months[i].paid).map(mo=>`<div class="rl"><span>Mois ${mo.i+1} · ${moisNom(c,mo.i)}</span><b style="color:${mo.state==='paye'?'var(--ok)':'var(--amber)'}">${mo.state==='paye'?'Soldé ✓':fmtN(mo.paid)+' / '+fmtN(mo.due)+' (manque '+fmtN(mo.due-mo.paid)+')'}</b></div>`).join('');
  MCTX={pane:p.id};openModal(`<div style="text-align:center"><div class="avatar" style="margin:0 auto 10px;width:52px;height:52px"><i data-lucide="check" class="i" style="width:26px;height:26px"></i></div><h2>Paiement validé</h2><div class="muted">${esc(fullName(m))} · ${fmt(montant)} · ${f.moyen}</div></div>
  <div class="receipt mt"><div class="muted" style="font-weight:700;margin-bottom:4px">RÉPARTITION AUTOMATIQUE</div>${changes||'<div class="muted">Cotisation déjà soldée : montant enregistré en surplus.</div>'}
  <div class="rl" style="margin-top:6px"><span>Total versé</span><b>${fmt(after.verse)}</b></div><div class="rl"><span>Reste à payer</span><b>${fmt(after.reste)}</b></div><div class="rl"><span>Statut</span>${statutChip(after.statut)}</div></div>
  <div class="foot"><button class="btn sec" data-act="receipt" data-id="${x.numero}"><i data-lucide="receipt" class="i"></i>Voir le reçu</button><button class="btn" data-act="closeModal">Terminé</button></div>`);return'nosync'};
API.confirmCancel=async(p,d)=>{const motif=gv('f-motif');if(!motif){toast('Indique le motif de l\'annulation.');return'nosync'}await rpc('annuler_paiement',{p_id:PAYU.get(+d.id),p_motif:motif});closeModal();toast('Paiement annulé et tracé.')};

/* relances cotisations */
API.relOne=async(p,d)=>{const c=camp(+d.c),m=member(+d.m);await rpc('enregistrer_relance',{p_campagne:c.uuid,p_membre:m.uuid,p_canal:'whatsapp'});setTimeout(()=>memberSit(p,c.id,m.id),300);return};
API.logRel=async(p,d)=>{await rpc('enregistrer_relance',{p_campagne:camp(+d.c).uuid,p_membre:member(+d.m).uuid,p_canal:d.chan==='sms'?'sms':d.chan==='app'?'appli':'whatsapp'})};
API.copyGroup=async p=>{const c=camp(+p.f.rc);const L=c.lignes.map(l=>({m:member(l.memberId),s:situation(c.id,l.memberId)})).filter(o=>o.s.retard>0).sort((a,b)=>a.m.nom.localeCompare(b.m.nom));
  const txt=`📢 Rappel cotisation « ${c.nom} » — point au ${fdate(today())}\n\nMembres qui ont un retard :\n${L.map(o=>`• ${titleCase(fullName(o.m))} : ${fmt(o.s.retard)}`).join('\n')}\n\nMerci de vous rapprocher de la trésorière (espèces ou Mobile Money). 🙏`;
  copy(txt);for(const o of L)await rpc('enregistrer_relance',{p_campagne:c.uuid,p_membre:o.m.uuid,p_canal:'groupe'}).catch(()=>{})};

/* événements */
function evRow2(e){return null}
API.saveEvt=async(p,d)=>{const t=gv('ev-t-'+p.id),dt=gv('ev-d-'+p.id),h1=gv('ev-h1-'+p.id),h2=gv('ev-h2-'+p.id);
  if(!t){toast('Donne un titre à l\'événement.');return'nosync'}if(!dt||!h1){toast('Indique la date et l\'heure de début.');return'nosync'}if(h2&&h2<h1){toast('L\'heure de fin est avant le début.');return'nosync'}
  const e0=d.id?evt(+d.id):null;let image=e0?e0.imgPath:null;
  if(p.f.evImg&&p.f.evImg.startsWith('data:'))image=await uploadImg(p.f.evImg,'evenements');else if(!p.f.evImg)image=null;
  const row={titre:t,categorie:gv('ev-c-'+p.id),debut:dt+'T'+h1+':00Z',fin:h2?dt+'T'+h2+':00Z':null,lieu:gv('ev-l-'+p.id),responsable:U(gv('ev-r-'+p.id))||ME.membre_id,description:gv('ev-desc-'+p.id),inscription:document.getElementById('ev-i-'+p.id).checked,image};
  let id;if(e0){await must(sb.from('evenements').update(row).eq('id',e0.uuid));id=e0.id}else{const r=await must(sb.from('evenements').insert({...row,cree_par:ME.membre_id}).select().single());id=I(r.id)}
  p.f.evImg=undefined;toast(e0?'Événement mis à jour : tout le monde est prévenu.':'Événement publié : tout le monde est prévenu.');await sync();p.sub={evt:id};renderPane(p);return'nosync'};
API.evRep=async(p,d)=>{await rpc('repondre_evenement',{p_evt:evt(+d.id).uuid,p_reponse:d.v});toast(d.v==='oui'?'Super, on compte sur toi ! 🙌':d.v==='non'?'Merci de nous avoir prévenus.':'Noté. Tu peux changer d\'avis à tout moment.')};
API.evPres=async(p,d)=>{const r=rep(+d.id,+d.m);await rpc('pointer_presence',{p_evt:evt(+d.id).uuid,p_membre:member(+d.m).uuid,p_present:!(r&&r.present)})};
API.evTask=async(p,d)=>{const t=DB.tasks.find(x=>x.id===+d.id);await must(sb.from('evenement_taches').update({faite:!t.faite}).eq('id',t.id))};
API.evTaskDel=async(p,d)=>{await must(sb.from('evenement_taches').delete().eq('id',+d.id))};
API.evTaskAdd=async(p,d)=>{const l=gv('tk-l-'+p.id),r=+gv('tk-r-'+p.id)||null;if(!l){toast('Écris la tâche.');return'nosync'}
  await must(sb.from('evenement_taches').insert({evenement_id:evt(+d.id).uuid,libelle:l,responsable:U(r)}));
  if(r){const e=evt(+d.id);await rpc('envoyer_message',{p_membre:U(r),p_titre:'Nouvelle mission : '+l,p_corps:`Pour « ${e.titre} » (${fdate(e.debut)}). Merci !`}).catch(()=>{})}toast(r?'Tâche ajoutée, la personne est prévenue.':'Tâche ajoutée.')};
API.evRemindGo=async()=>{const e=evt(MCTX.evt);const n=await rpc('rappel_evenement',{p_evt:e.uuid,p_tous:gv('rm-who')==='tous',p_message:gv('rm-msg')});closeModal();toast(`Rappel envoyé à ${n} personne${n>1?'s':''}.`)};
API.evCancelGo=async()=>{const e=evt(MCTX.evt);await must(sb.from('evenements').update({annule:true,motif_annulation:gv('cx-m')||null}).eq('id',e.uuid));
  await sb.from('affiches').update({actif:false}).eq('evenement_id',e.uuid);closeModal();toast('Événement annulé, tout le monde est prévenu.')};

/* bannières */
API.saveAff=async(p,d)=>{if(!p.f.affImg){toast('Choisis une image.');return'nosync'}const deb=gv('af-d-'+p.id)||today(),fin=gv('af-f-'+p.id);if(fin&&fin<deb){toast('La date de fin est avant le début.');return'nosync'}
  const lien=gv('af-l-'+p.id);if(lien&&!/^https?:\/\//.test(lien)){toast('Le lien doit commencer par https://');return'nosync'}
  const a0=d.id?DB.affiches.find(x=>x.id===+d.id):null;let image=a0?a0.imgPath:null;if(p.f.affImg.startsWith('data:'))image=await uploadImg(p.f.affImg,'affiches');
  const row={titre:gv('af-t-'+p.id),image,evenement_id:U(gv('af-e-'+p.id)),lien:lien||null,debut:deb,fin:fin||null};
  if(a0)await must(sb.from('affiches').update(row).eq('id',a0.uuid));else{const ord=DB.affiches.length?Math.min(...DB.affiches.map(x=>x.ordre))-1:0;await must(sb.from('affiches').insert({...row,ordre:ord,cree_par:ME.membre_id}))}
  p.sub=null;p.tab='affiches';p.f.affImg=undefined;toast(deb>today()?`Bannière programmée pour le ${fdate(deb)}.`:'Bannière en ligne sur l\'accueil des membres.')};
API.affToggle=async(p,d)=>{const x=DB.affiches.find(y=>y.id===+d.id);await must(sb.from('affiches').update({actif:!x.actif}).eq('id',x.uuid));toast(x.actif?'Bannière masquée.':'Bannière affichée.')};
API.affMove=async(p,d)=>{const L=DB.affiches.slice().sort((a,b)=>a.ordre-b.ordre);const i=L.findIndex(x=>x.id===+d.id),j=i+(+d.v);if(j<0||j>=L.length)return'nosync';[L[i],L[j]]=[L[j],L[i]];
  for(let k=0;k<L.length;k++)if(L[k].ordre!==k)await must(sb.from('affiches').update({ordre:k}).eq('id',L[k].uuid))};
API.affDelGo=async()=>{const x=DB.affiches.find(y=>y.id===MCTX.aff);await must(sb.from('affiches').delete().eq('id',x.uuid));if(x.imgPath)sb.storage.from('visuels').remove([x.imgPath]).catch(()=>{});closeModal();toast('Bannière supprimée.')};

/* tâches du secrétariat */
API.tSave=async(p,d)=>{const t0=d.id?tache(+d.id):null;const titre=gv('tk-t-'+p.id);if(!titre){toast('Écris ce qu\'il faut faire.');return'nosync'}
  const tous=!!(p.f.tTous??(t0?t0.tous:false));const resp=tous?[]:(p.f.tSel||[]);if(!tous&&!resp.length){toast('Choisis au moins une personne, ou « Toute la jeunesse ».');return'nosync'}
  const os=gv('tk-os-'+p.id);const origine=os==='autre'?gv('tk-o-'+p.id):os;if(os==='autre'&&!origine){toast('Précise d\'où vient la décision.');return'nosync'}
  const dateOrig=gv('tk-do-'+p.id);if(dateOrig>today()){toast('La date de la décision ne peut pas être dans le futur.');return'nosync'}
  const id=await rpc('enregistrer_tache',{p_id:t0?t0.uuid:null,p_titre:titre,p_details:gv('tk-d-'+p.id),p_origine:origine,p_date_origine:dateOrig||null,p_echeance:gv('tk-e-'+p.id)||null,p_pour_tous:tous,p_personnes:resp.map(U)});
  ['tSel','tTous','tq'].forEach(k=>delete p.f[k]);toast(tous?'Enregistré : toute la jeunesse est prévenue.':`Enregistré : ${resp.length} personne${resp.length>1?'s':''} prévenue${resp.length>1?'s':''}.`);
  await sync();p.sub={tache:I(id)};renderPane(p);return'nosync'};
API.tDone=async(p,d)=>{const t=tache(+d.id);await rpc('tache_faite',{p_id:t.uuid,p_faite:!t.faite});toast(t.faite?'Tâche remise à faire.':'Bravo, c\'est fait ✅')};
API.tRemindGo=async()=>{const t=tache(MCTX.t);const n=await rpc('rappel_tache',{p_id:t.uuid,p_canal:'appli',p_message:gv('tr-msg')});closeModal();toast(`Rappel envoyé à ${n} personne${n>1?'s':''}.`)};
API.tLogWa=async()=>{const t=tache(MCTX.t);await rpc('rappel_tache',{p_id:t.uuid,p_canal:'groupe',p_message:''});setTimeout(closeModal,300)};
API.tLog=async(p,d)=>{const t=tache(+d.id);const canal=d.chan==='sms'?'sms':d.chan==='app'?'appli':'whatsapp';
  await rpc('rappel_tache',{p_id:t.uuid,p_canal:canal,p_message:tMsg(t),p_membre:canal==='appli'?member(+d.m).uuid:null});if(canal==='appli')toast('Rappel envoyé dans l\'application.')};

/* paiement dans l'application (Mobile Money) : pas encore branché */
API.payInAppOld=async()=>'nosync';

/* ---- démarrage ---- */
async function boot(){DB=emptyDB();setupPanes();showSplash();
  try{const{data}=await sb.auth.getSession();if(data.session)await startSession(PANES[0])}catch(e){console.warn(e)}
  renderAll()}
sb.auth.onAuthStateChange((ev)=>{if(ev==='SIGNED_OUT'&&PANES[0]&&PANES[0].session){PANES[0].session=null;renderAll()}});

/* =====================================================================
   NOTIFICATIONS SUR LE TÉLÉPHONE (Web Push)
   ===================================================================== */
const PUSH_OK=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const IOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const STANDALONE=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function b64u(s){const p='='.repeat((4-s.length%4)%4);const b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0))}
async function pushReg(){return navigator.serviceWorker.ready}
async function pushEtat(){if(!PUSH_OK())return IOS()&&!STANDALONE()?'ios-safari':'non';if(Notification.permission==='denied')return'refuse';
  try{const r=await pushReg();const s=await r.pushManager.getSubscription();return s&&Notification.permission==='granted'?'actif':'inactif'}catch(_){return'inactif'}}
async function activerPush(silencieux){if(!PUSH_OK())return false;
  const perm=Notification.permission==='granted'?'granted':await Notification.requestPermission();
  if(perm!=='granted'){if(!silencieux)toast('Notifications refusées. Tu peux les autoriser dans les réglages du téléphone.');return false}
  const r=await pushReg();let s=await r.pushManager.getSubscription();
  if(!s){const k=await rpc('cle_push_publique');s=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(k)})}
  const j=s.toJSON();await rpc('enregistrer_abonnement',{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_appareil:navigator.userAgent});
  if(!silencieux)toast('Notifications activées sur ce téléphone 🔔');return true}
async function desactiverPush(){try{const r=await pushReg();const s=await r.pushManager.getSubscription();if(s){await rpc('supprimer_abonnement',{p_endpoint:s.endpoint}).catch(()=>{});await s.unsubscribe()}}catch(_){}}
/* après la connexion : on rafraîchit l'abonnement, ou on propose d'activer (une fois tous les 7 jours au plus) */
async function pushApresConnexion(){if(!PUSH_OK())return;
  if(Notification.permission==='granted'){activerPush(true).catch(()=>{});return}
  if(Notification.permission==='denied')return;
  let plusTard=0;try{plusTard=+localStorage.getItem('younity-push-plustard')||0}catch(_){}
  if(Date.now()-plusTard<7*864e5)return;
  setTimeout(()=>{if(document.getElementById('modalBg').classList.contains('show')||!PANES[0].session||PANES[0].session.mustChange)return;
    openModal(`<div style="text-align:center"><div class="avatar" style="margin:0 auto 12px;width:56px;height:56px;background:var(--green-soft);color:var(--green)"><i data-lucide="bell-ring" class="i" style="width:28px;height:28px"></i></div>
    <h2>Recevoir les notifications ?</h2><div class="muted">Younity te prévient sur ce téléphone, même quand l'application est fermée : paiements, rappels de cotisation, événements, tâches, anniversaires.</div></div>
    <div class="foot"><button class="btn sec" data-act="pushPlusTard">Plus tard</button><button class="btn" data-act="pushActiver"><i data-lucide="bell" class="i i-sm"></i>Activer</button></div>`,{pane:'m'})},1500)}
API.pushActiver=async()=>{closeModal();await activerPush(false);return'nosync'};
API.pushPlusTard=async()=>{try{localStorage.setItem('younity-push-plustard',String(Date.now()))}catch(_){}closeModal();return'nosync'};
API.pushProfil=async(p)=>{await activerPush(false);rerender(p);return'nosync'};
API.pushOff=async(p)=>{await desactiverPush();toast('Notifications désactivées sur ce téléphone.');rerender(p);return'nosync'};
API.pushTest=async()=>{await rpc('notification_essai');toast('Notification d\'essai envoyée : elle arrive dans quelques secondes.')};
/* bloc « Notifications sur ce téléphone » dans Mon profil */
let PUSH_ETAT='?';
function pushCarte(p){if(PUSH_ETAT==='?')pushEtat().then(e=>{PUSH_ETAT=e;rerender(p)});
  const e=PUSH_ETAT;const ligne={actif:'<span class="chip ok">Activées</span>',inactif:'<span class="chip mut">Désactivées</span>',refuse:'<span class="chip late">Bloquées</span>','ios-safari':'<span class="chip gold">À installer</span>',non:'<span class="chip mut">Indisponibles</span>','?':''}[e];
  const corps=e==='actif'?`<div class="muted mb">Tu reçois les notifications Younity sur ce téléphone, même application fermée. Choisis ci-dessous ce que tu veux recevoir.</div><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sec sm" data-act="pushTest"><i data-lucide="send" class="i i-sm"></i>Envoyer un essai</button><button class="btn sec sm" data-act="pushOff">Désactiver</button></div>`
   :e==='inactif'?`<div class="muted mb">Active-les pour être prévenu même quand Younity est fermée.</div><button class="btn block" data-act="pushProfil"><i data-lucide="bell-ring" class="i i-sm"></i>Activer les notifications</button>`
   :e==='refuse'?`<div class="muted">Les notifications sont bloquées pour Younity. Pour les autoriser : réglages du téléphone → Applications → Younity (ou Chrome) → Notifications.</div>`
   :e==='ios-safari'?`<div class="muted">Sur iPhone, ajoute d'abord Younity à l'écran d'accueil : bouton Partager de Safari → « Sur l'écran d'accueil ». Ouvre-la ensuite depuis l'icône et reviens ici (iOS 16.4 ou plus récent).</div>`
   :e==='non'?`<div class="muted">Ce téléphone ou ce navigateur ne permet pas les notifications. Tu les retrouves dans la cloche de l'application.</div>`:'';
  return `<div class="card mb"><h3><i data-lucide="smartphone" class="i"></i>Notifications sur ce téléphone<span class="r">${ligne}</span></h3>${corps}</div>`}
function vProfil(p){const h=vProfil0(p);const i=h.indexOf('<div class="card mb"><h3><i data-lucide="bell" class="i"></i>Notifications</h3>');return i<0?pushCarte(p)+h:h.slice(0,i)+pushCarte(p)+h.slice(i)}
/* toucher une notification ouvre la liste des notifications */
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.younity==='notifications'){const p=PANES[0];if(p&&p.session&&!p.session.mustChange){sync(true).then(()=>{API.openNotifs(p)})}}});
