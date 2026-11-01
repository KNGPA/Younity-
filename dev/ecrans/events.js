/* ================== AFFICHES & ÉVÉNEMENTS ================== */
const CATS=['Culte','Réunion','Sortie','Formation','Action sociale','Célébration','Autre'];
const CATIC={'Culte':'church','Réunion':'users-round','Sortie':'bus','Formation':'graduation-cap','Action sociale':'heart-handshake','Célébration':'party-popper','Autre':'calendar'};
const CATCOL={'Culte':'#17603f','Réunion':'#2f6fd6','Sortie':'#0e8a7a','Formation':'#7a4fc9','Action sociale':'#c2410c','Célébration':'#b37509','Autre':'#4a5852'};
const JOURS=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
function dISO(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function addD(n){const d=new Date();d.setDate(d.getDate()+n);return dISO(d)}
function evD(e){return new Date(e.debut.slice(0,10)+'T12:00')}
function evHeure(e){return e.debut.slice(11,16).replace(':','h')+(e.fin?' – '+e.fin.slice(11,16).replace(':','h'):'')}
function evDateLong(e){const d=evD(e);const j=JOURS[d.getDay()];return `${j[0].toUpperCase()+j.slice(1)} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`}
function evPast(e){return (e.fin||e.debut).slice(0,10)<today()}
function evDays(e){const n=new Date(today()+'T12:00');return Math.round((evD(e)-n)/864e5)}
function evDans(e){const n=evDays(e);return n===0?'Aujourd\'hui':n===1?'Demain':n>1?`Dans ${n} jours`:`Il y a ${-n} jour${n<-1?'s':''}`}
function evt(id){return DB.events.find(e=>e.id===id)}
function upcoming(){return DB.events.filter(e=>!e.annule&&!evPast(e)).sort((a,b)=>a.debut.localeCompare(b.debut))}
function rep(eid,mid){return DB.evtRep.find(r=>r.evtId===eid&&r.mid===mid)}
function evCounts(e){const R=DB.evtRep.filter(r=>r.evtId===e.id&&member(r.mid)?.actif);return{oui:R.filter(r=>r.reponse==='oui').length,pe:R.filter(r=>r.reponse==='peut_etre').length,non:R.filter(r=>r.reponse==='non').length,pres:R.filter(r=>r.present).length}}
function evTasks(e){return DB.tasks.filter(t=>t.evtId===e.id)}
function dbadge(e,big){const d=evD(e);return `<div class="dbadge ${big?'big':''}" style="--c:${CATCOL[e.categorie]||'#17603f'}"><b>${d.getDate()}</b><span>${MCOURT[d.getMonth()]}</span></div>`}
const REPL={oui:['Je participe','ok','check'],peut_etre:['Peut-être','part','help-circle'],non:['Absent','mut','x']};
function evRow(e,p){const me=sMember(p),r=rep(e.id,me.id),c=evCounts(e),g=can(p,'evenements_gerer');
  return `<div class="list-item" style="cursor:pointer;${e.annule?'opacity:.6':''}" data-act="openEvt" data-id="${e.id}">${dbadge(e)}<div class="grow" style="min-width:0"><div class="name ellip">${esc(e.titre)}</div><div class="muted ellip">${e.annule?'<b style="color:var(--red)">Annulé</b> · ':''}${evHeure(e)}${e.lieu?' · '+esc(e.lieu):''}</div>
  ${g&&!e.annule?`<div class="muted" style="font-size:11.5px">${c.oui} participent · ${c.pe} peut-être${evTasks(e).length?` · tâches ${evTasks(e).filter(t=>t.faite).length}/${evTasks(e).length}`:''}</div>`:''}</div>
  ${!g&&r&&r.reponse&&!e.annule?`<span class="chip ${REPL[r.reponse][1]}">${REPL[r.reponse][0]}</span>`:'<i data-lucide="chevron-right" class="i" style="color:var(--ink-3)"></i>'}</div>`}
function eventsBlock(p,n=3){const L=upcoming();const g=can(p,'evenements_gerer');
  return `<div class="card mb" style="padding:14px 16px 6px"><h3><i data-lucide="calendar-days" class="i"></i>Événements à venir<span class="r"><button class="link" data-act="tab" data-tab="evenements">Tous →</button></span></h3>
  ${L.slice(0,n).map(e=>evRow(e,p)).join('')||`<div class="empty" style="padding:14px">Aucun événement prévu.${g?'<br><button class="link mt" data-act="newEvt">+ Ajouter un événement</button>':''}</div>`}</div>`}

/* ---- Affiches (carrousel) ---- */
function affState(a){if(!a.actif)return['Masquée','mut'];if(a.debut>today())return['Programmée','gold'];if(a.fin&&a.fin<today())return['Expirée','mut'];return['En ligne','ok']}
function activeAff(){return DB.affiches.filter(a=>affState(a)[0]==='En ligne').sort((a,b)=>a.ordre-b.ordre)}
const BAN_W=1200,BAN_H=500;
function banners(p,sansEvt){if(sRole(p).id==='president')return'';const L=activeAff().filter(a=>!sansEvt||!a.evtId);if(!L.length)return'';
  return `<div class="bans mb ${L.length===1?'one':''}">${L.map(a=>`<div class="ban" data-act="openAff" data-id="${a.id}"><img src="${a.img}" alt="${esc(a.titre)}"></div>`).join('')}</div>`}

/* ---- Visuels générés pour la démo (en vrai : l'image envoyée par le président) ---- */
function poster(o){const s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${o.c1}"/><stop offset="1" stop-color="${o.c2}"/></linearGradient></defs>
<rect width="1200" height="500" fill="url(#g)"/><circle cx="1080" cy="40" r="230" fill="#fff" opacity=".07"/><circle cx="1150" cy="470" r="150" fill="${o.acc}" opacity=".22"/><circle cx="60" cy="520" r="110" fill="#fff" opacity=".05"/>
<text x="70" y="105" font-family="Arial,Helvetica,sans-serif" font-size="30" font-weight="700" fill="${o.acc}" letter-spacing="5">${o.k}</text>
<text x="66" y="215" font-family="Arial Black,Arial,Helvetica,sans-serif" font-size="${o.fs||92}" font-weight="900" fill="#fff">${o.t1}</text>
<rect x="70" y="270" width="${o.dw||400}" height="66" rx="33" fill="${o.acc}"/><text x="${70+(o.dw||400)/2}" y="313" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="29" font-weight="800" fill="#16211c">${o.d}</text>
<text x="70" y="420" font-family="Arial,Helvetica,sans-serif" font-size="27" fill="#fff" opacity=".85">${o.l}</text>
<text x="1130" y="455" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="800" fill="#fff" opacity=".7">YOUNITY</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s)}

function seedEvents(db){
  const id=()=>db.seq++;const mem=db.members,org=db.accounts.find(a=>a.roleId==='organisateur'),om=org?org.memberId:mem[0].id;
  const tres=db.accounts.find(a=>a.roleId==='tresorier'),sec=db.accounts.find(a=>a.roleId==='secretaire');
  const noelD=(()=>{const y=new Date().getFullYear();let d=`${y}-12-20`;if(d<=dISO(new Date()))d=`${y+1}-12-20`;return d})();
  const E=[
    {titre:'Veillée de prière jeunesse',categorie:'Culte',debut:addD(1)+'T20:00',fin:addD(1)+'T23:30',lieu:'Temple principal',description:'Une soirée de louange et d\'intercession pour la jeunesse. Viens avec ta Bible et un cœur ouvert.'},
    {titre:'Réunion du bureau',categorie:'Réunion',debut:addD(4)+'T16:00',fin:addD(4)+'T18:00',lieu:'Salle annexe',description:'Point sur les cotisations, préparation de la sortie et du concert de Noël.'},
    {titre:'Sortie détente à Grand-Bassam',categorie:'Sortie',debut:addD(15)+'T07:00',fin:addD(15)+'T18:00',lieu:'Grand-Bassam (départ devant l\'église)',description:'Journée de détente et de communion au bord de la mer. Départ en car à 7h précises, retour vers 18h. Prévois ton maillot et ta bonne humeur !',img:poster({c1:'#0e8a7a',c2:'#0b4f63',acc:'#ffd166',k:'SORTIE JEUNESSE',t1:'Grand-Bassam',fs:100,d:fdate(addD(15)).slice(0,5)+' · 7h00',dw:330,l:'Départ devant l\'église · Car réservé'})},
    {titre:'Formation : leadership chrétien',categorie:'Formation',debut:addD(22)+'T09:00',fin:addD(22)+'T13:00',lieu:'Salle annexe',description:'Matinée de formation pour tous ceux qui servent dans un département.'},
    {titre:'Concert de Noël',categorie:'Célébration',debut:noelD+'T18:00',fin:noelD+'T21:00',lieu:'Temple principal',description:'Le grand concert de la jeunesse : chorale, théâtre et partage. Invite ta famille et tes amis !',img:poster({c1:'#7a1f2b',c2:'#3d0d14',acc:'#d99a1e',k:'LA JEUNESSE PRÉSENTE',t1:'Concert de Noël',fs:92,d:'20 décembre · 18h',dw:400,l:'Temple principal · Entrée libre'})},
    {titre:'Journée d\'évangélisation',categorie:'Action sociale',debut:addD(-12)+'T08:00',fin:addD(-12)+'T14:00',lieu:'Quartier Yopougon',description:'Sortie d\'évangélisation et distribution de kits aux enfants.'}];
  E.forEach(e=>{db.events.push(Object.assign({id:id(),responsable:om,inscription:true,annule:false,motif:'',img:'',creePar:'Paul-Andre Koffi (Président)',creeLe:nowIso()},e))});
  const ev=db.events;const sortie=ev[2],veil=ev[0],noel=ev[4],past=ev[5];
  mem.forEach((m,i)=>{
    if(i%3!==1)db.evtRep.push({evtId:veil.id,mid:m.id,reponse:i%5===0?'peut_etre':'oui'});
    if(i%4!==3&&i>0)db.evtRep.push({evtId:sortie.id,mid:m.id,reponse:i%6===2?'non':i%7===4?'peut_etre':'oui'});
    if(i%2===0&&i>0)db.evtRep.push({evtId:noel.id,mid:m.id,reponse:'oui'});
    if(i%3!==2)db.evtRep.push({evtId:past.id,mid:m.id,reponse:'oui',present:i%4!==1})});
  const T=[[sortie,'Réserver le car (60 places)',om,true],[sortie,'Collecter la participation de chacun',tres&&tres.memberId,false],[sortie,'Prévoir le repas et l\'eau',mem[4].id,false],[sortie,'Kit de premiers secours',mem[9].id,false],
    [noel,'Répétitions de la chorale (samedis)',mem[3].id,true],[noel,'Affiches et invitations',sec&&sec.memberId,false],[noel,'Sonorisation et lumière',om,false],[veil,'Liste des sujets de prière',om,true]];
  T.forEach(([e,l,r,f],k)=>db.tasks.push({id:id(),evtId:e.id,libelle:l,resp:r||null,echeance:k<4?addD(10):'',faite:f}));
  db.affiches.push({id:id(),titre:'Concert de Noël',img:noel.img,lien:'',evtId:noel.id,debut:addD(-3),fin:noelD,ordre:1,actif:true});
  db.affiches.push({id:id(),titre:'Sortie à Grand-Bassam',img:sortie.img,lien:'',evtId:sortie.id,debut:addD(-1),fin:addD(15),ordre:2,actif:true});
  db.affiches.push({id:id(),titre:'Moisson 2026',img:poster({c1:'#17603f',c2:'#0b3a25',acc:'#d99a1e',k:'CAMPAGNE EN COURS',t1:'Moisson 2026',fs:100,d:'Donnons avec joie',dw:380,l:'Paye ta cotisation chaque mois · 2 Corinthiens 9:7'}),lien:'',evtId:null,debut:addD(-30),fin:'',ordre:3,actif:true});
}

/* ---- Écrans ---- */
function vEvents(p){const g=can(p,'evenements_gerer');const f=p.f.evf||'avenir';
  const all=DB.events.slice().sort((a,b)=>a.debut.localeCompare(b.debut));
  const L=f==='avenir'?all.filter(e=>!e.annule&&!evPast(e)):f==='passes'?all.filter(e=>!e.annule&&evPast(e)).reverse():all.filter(e=>e.annule);
  const groups={};L.forEach(e=>{const d=evD(e);const k=MOIS[d.getMonth()]+' '+d.getFullYear();(groups[k]=groups[k]||[]).push(e)});
  return wTitle(p,'Événements','Tout ce qui se prépare dans la jeunesse.',g?'<button class="btn" data-act="newEvt"><i data-lucide="plus" class="i"></i>Nouvel événement</button>':'')+
  `<div class="pills filters mb">${pills(p,'evf',[['avenir','À venir',all.filter(e=>!e.annule&&!evPast(e)).length],['passes','Passés',all.filter(e=>!e.annule&&evPast(e)).length],...(all.some(e=>e.annule)?[['annules','Annulés',all.filter(e=>e.annule).length]]:[])],'avenir')}</div>
  ${Object.entries(groups).map(([k,es])=>`<div class="muted" style="font-weight:700;text-transform:capitalize;margin:4px 2px 6px">${k}</div><div class="card mb" style="padding:4px 16px">${es.map(e=>evRow(e,p)).join('')}</div>`).join('')||'<div class="card empty">Rien ici pour l\'instant.</div>'}`}

function vEventDetail(p,id){const e=evt(id);if(!e)return'<div class="card empty">Événement introuvable.</div>';
  const me=sMember(p),r=rep(e.id,me.id),c=evCounts(e),g=can(p,'evenements_gerer'),past=evPast(e);const resp=member(e.responsable);
  const myTasks=evTasks(e).filter(t=>t.resp===me.id);
  const back=p.mode==='web'?`<button class="link mb" data-act="back"><i data-lucide="arrow-left" class="i i-sm"></i>Événements</button>`:'';
  const head=e.img?`<div class="evt-img mb"><img src="${e.img}" alt=""></div>`:`<div class="evt-ban mb" style="--c:${CATCOL[e.categorie]}"><i data-lucide="${CATIC[e.categorie]}" class="i"></i></div>`;
  const share=encodeURIComponent(`📅 ${e.titre}\n${evDateLong(e)} · ${evHeure(e)}${e.lieu?'\n📍 '+e.lieu:''}\n\n${e.description}\n\nRéponds dans l'appli Younity 🙏`);
  let h=back+head+`<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px"><span class="chip" style="background:${CATCOL[e.categorie]}1a;color:${CATCOL[e.categorie]}"><i data-lucide="${CATIC[e.categorie]}" class="i i-sm"></i>${e.categorie}</span>${e.annule?'<span class="chip late">Annulé</span>':past?'<span class="chip mut">Terminé</span>':`<span class="chip gold">${evDans(e)}</span>`}</div>
  <div class="name" style="font-size:20px;letter-spacing:-.01em;margin-bottom:10px">${esc(e.titre)}</div>
  ${e.annule?`<div class="info red mb"><b>Événement annulé.</b>${e.motif?'<br>'+esc(e.motif):''}</div>`:''}
  <div class="card mb"><div class="kv"><span><i data-lucide="calendar" class="i i-sm"></i> Date</span><b>${evDateLong(e)}</b></div><div class="kv"><span><i data-lucide="clock" class="i i-sm"></i> Heure</span><b>${evHeure(e)}</b></div>${e.lieu?`<div class="kv"><span><i data-lucide="map-pin" class="i i-sm"></i> Lieu</span><b>${esc(e.lieu)}</b></div>`:''}${resp?`<div class="kv"><span><i data-lucide="user-round-cog" class="i i-sm"></i> Organisé par</span><b>${esc(titleCase(fullName(resp)))}</b></div>`:''}
  ${e.description?`<div style="margin-top:10px;line-height:1.55;color:var(--ink-2)">${esc(e.description).replace(/\n/g,'<br>')}</div>`:''}</div>`;
  if(myTasks.length)h+=`<div class="info gold mb"><b>Ta mission pour cet événement :</b><br>${myTasks.map(t=>`${t.faite?'✅':'•'} ${esc(t.libelle)}`).join('<br>')}</div>`;
  if(e.inscription&&!e.annule&&!past)h+=`<div class="card mb"><h3><i data-lucide="hand" class="i"></i>Ta réponse</h3><div class="rep3">${Object.entries(REPL).map(([k,[l,,ic]])=>`<button class="${r&&r.reponse===k?'on '+k:''}" data-act="evRep" data-id="${e.id}" data-v="${k}"><i data-lucide="${ic}" class="i i-sm"></i>${l}</button>`).join('')}</div>
    <div class="muted mt" style="text-align:center">${c.oui} participent · ${c.pe} peut-être</div></div>`;
  h+=`<div class="row mb" style="gap:8px"><a class="btn ch-wa sm" style="flex:1" href="https://wa.me/?text=${share}" target="_blank" rel="noopener"><i data-lucide="message-circle" class="i i-sm"></i>Partager sur WhatsApp</a></div>`;
  if(g)h+=evManage(p,e);
  return h}

function evManage(p,e){const past=evPast(e);const c=evCounts(e);const f=p.f.epf||'oui';
  const act=DB.members.filter(m=>m.actif);const st=m=>{const r=rep(e.id,m.id);return r&&r.reponse?r.reponse:'aucune'};
  const L=act.filter(m=>f==='tous'||st(m)===f);const T=evTasks(e);
  const ppl=act.filter(m=>acctOfMember(m.id));
  return `<div class="sect-t"><i data-lucide="settings-2" class="i i-sm"></i>Organisation</div>
  ${e.annule?'':`<div class="grid2 mb"><button class="btn sec" data-act="editEvt" data-id="${e.id}"><i data-lucide="pencil" class="i i-sm"></i>Modifier</button><button class="btn sec" data-act="evRemind" data-id="${e.id}"><i data-lucide="bell-ring" class="i i-sm"></i>Rappel</button></div>`}
  <div class="kpis mb" style="grid-template-columns:repeat(${past?4:3},1fr)"><div class="kpi"><div class="l">Participent</div><div class="v" style="color:var(--green)">${c.oui}</div></div><div class="kpi"><div class="l">Peut-être</div><div class="v" style="color:var(--amber)">${c.pe}</div></div><div class="kpi"><div class="l">Absents</div><div class="v">${c.non}</div></div>${past?`<div class="kpi"><div class="l">Présents</div><div class="v">${c.pres}</div></div>`:''}</div>
  <div class="card mb"><h3><i data-lucide="list-checks" class="i"></i>Tâches<span class="r">${T.filter(t=>t.faite).length}/${T.length}</span></h3>
    ${T.map(t=>{const m=member(t.resp);return `<div class="list-item"><button class="chk ${t.faite?'on':''}" data-act="evTask" data-id="${t.id}"><i data-lucide="check" class="i i-sm"></i></button><div class="grow" style="min-width:0"><div class="name" style="font-size:13px;${t.faite?'text-decoration:line-through;color:var(--ink-3)':''}">${esc(t.libelle)}</div><div class="muted">${m?esc(titleCase(fullName(m))):'Personne désignée'}${t.echeance?' · avant le '+fdate(t.echeance):''}</div></div>${m&&!t.faite&&m.tel?`<a class="btn ch-wa sm" href="https://wa.me/225${digits(m.tel)}?text=${encodeURIComponent(`Bonjour ${prenomOf(m)}, petit rappel pour « ${e.titre} » : ${t.libelle}. Merci !`)}" target="_blank" rel="noopener" title="Rappeler par WhatsApp"><i data-lucide="message-circle" class="i i-sm"></i></a>`:''}<button class="link" style="color:var(--ink-3)" data-act="evTaskDel" data-id="${t.id}" title="Supprimer"><i data-lucide="trash-2" class="i i-sm"></i></button></div>`}).join('')||'<div class="muted" style="padding:6px 0 10px">Aucune tâche. Ajoute ce qu\'il faut préparer et confie chaque tâche à quelqu\'un.</div>'}
    <div class="task-add"><input class="inp" id="tk-l-${p.id}" placeholder="Nouvelle tâche (ex. Réserver la salle)"><select class="inp" id="tk-r-${p.id}"><option value="">Confier à…</option>${act.map(m=>`<option value="${m.id}">${esc(titleCase(fullName(m)))}</option>`).join('')}</select><button class="btn sm" data-act="evTaskAdd" data-id="${e.id}"><i data-lucide="plus" class="i i-sm"></i>Ajouter</button></div></div>
  <div class="card mb"><h3><i data-lucide="users" class="i"></i>${past?'Présences':'Participants'}</h3>
    <div class="pills filters mb">${pills(p,'epf',[['oui','Participent',c.oui],['peut_etre','Peut-être',c.pe],['non','Absents',c.non],['aucune','Sans réponse',act.filter(m=>st(m)==='aucune').length],['tous','Tous',act.length]],'oui')}</div>
    ${past||evDays(e)<=0?'<div class="muted mb">Coche les jeunes présents le jour J.</div>':''}
    ${L.map(m=>{const r=rep(e.id,m.id);return `<div class="list-item"><div class="avatar sm">${initials(m.nom)}</div><div class="grow" style="min-width:0"><div class="name ellip">${esc(titleCase(fullName(m)))}</div><div class="muted">${r&&r.reponse?REPL[r.reponse][0]:'Pas encore répondu'}</div></div>
      ${past||evDays(e)<=0?`<button class="chk ${r&&r.present?'on':''}" data-act="evPres" data-id="${e.id}" data-m="${m.id}" title="Présent"><i data-lucide="check" class="i i-sm"></i></button>`:chans(m,`Bonjour ${prenomOf(m)} ! Tu es invité(e) : « ${e.titre} », ${evDateLong(e)} à ${evHeure(e)}${e.lieu?', '+e.lieu:''}. Réponds dans l'appli Younity 🙏`,{labels:false})}</div>`}).join('')||'<div class="empty" style="padding:12px">Personne dans cette liste.</div>'}</div>
  ${e.annule||past?'':`<button class="btn danger block mb" data-act="evCancel" data-id="${e.id}" style="color:#fff"><i data-lucide="calendar-x" class="i i-sm"></i>Annuler l'événement</button>`}`}

function imgField(key,p,cur,hint){return `<div class="field"><label>Visuel ${hint||''}</label><div class="dim-hint"><i data-lucide="ruler" class="i i-sm"></i><span><b>Dimensions : ${BAN_W} × ${BAN_H} px</b> (format bannière 12:5) · JPG ou PNG · 5 Mo max.<br>Garde le texte important au centre, loin des bords.</span></div><label class="img-drop"><input type="file" accept="image/*" data-img="${key}" hidden><img id="prev-${key}-${p.id}" src="${cur||''}" style="${cur?'':'display:none'}"><span ${cur?'style="display:none"':''} id="ph-${key}-${p.id}"><i data-lucide="image-plus" class="i"></i>Choisir une image (${BAN_W} × ${BAN_H})</span></label><div id="warn-${key}-${p.id}" class="info gold mt" style="display:none;font-size:12px"></div></div>`}
function vEvtForm(p,id){const e=id?evt(id):null;p.f.evImg=p.f.evImg===undefined?(e&&e.img)||'':p.f.evImg;
  const resp=DB.members.filter(m=>m.actif&&acctOfMember(m.id)&&canAcct(acctOfMember(m.id),'evenements_gerer'));const me=sMember(p);
  return wTitle(p,id?'Modifier l\'événement':'Nouvel événement','Tous les jeunes seront prévenus dans l\'application.')+`<div class="card mb" style="max-width:640px">
  <div class="field"><label>Titre *</label><input class="inp" id="ev-t-${p.id}" value="${esc(e?e.titre:'')}" placeholder="Ex. Sortie détente, Veillée de prière…"></div>
  <div class="field"><label>Catégorie</label><select class="inp" id="ev-c-${p.id}">${CATS.map(c=>`<option ${e&&e.categorie===c?'selected':''}>${c}</option>`).join('')}</select></div>
  <div class="grid3"><div class="field"><label>Date *</label><input class="inp" type="date" id="ev-d-${p.id}" value="${e?e.debut.slice(0,10):addD(7)}"></div><div class="field"><label>Début *</label><input class="inp" type="time" id="ev-h1-${p.id}" value="${e?e.debut.slice(11,16):'16:00'}"></div><div class="field"><label>Fin</label><input class="inp" type="time" id="ev-h2-${p.id}" value="${e&&e.fin?e.fin.slice(11,16):''}"></div></div>
  <div class="field"><label>Lieu</label><input class="inp" id="ev-l-${p.id}" value="${esc(e?e.lieu:'')}" placeholder="Temple principal, salle annexe…"></div>
  <div class="field"><label>Responsable de l'organisation</label><select class="inp" id="ev-r-${p.id}">${resp.map(m=>`<option value="${m.id}" ${(e?e.responsable:me.id)===m.id?'selected':''}>${esc(titleCase(fullName(m)))}</option>`).join('')}</select></div>
  <div class="field"><label>Description</label><textarea class="inp" rows="4" id="ev-desc-${p.id}" placeholder="Programme, ce qu'il faut apporter…">${esc(e?e.description:'')}</textarea></div>
  <label class="row" style="gap:8px;margin:4px 0 14px;font-weight:600"><input type="checkbox" id="ev-i-${p.id}" ${!e||e.inscription?'checked':''}> Les jeunes peuvent répondre « Je participe »</label>
  ${imgField('evImg',p,p.f.evImg,'de l\'événement (facultatif)')}
  <div class="row" style="gap:8px;justify-content:flex-end"><button class="btn sec" data-act="back">Annuler</button><button class="btn" data-act="saveEvt" data-id="${id||''}"><i data-lucide="check" class="i i-sm"></i>${id?'Enregistrer':'Publier l\'événement'}</button></div></div>`}

function vAffiches(p){const L=DB.affiches.slice().sort((a,b)=>a.ordre-b.ordre);
  return wTitle(p,'Bannières de l\'accueil','Les bannières en ligne défilent sur l\'accueil des membres.','<button class="btn" data-act="newAff"><i data-lucide="image-plus" class="i"></i>Nouvelle bannière</button>')+
  `<div class="info mb" style="font-size:12.5px">Les bannières s'affichent en petit format, sous la carte principale de l'accueil des membres. Dimensions : <b>${BAN_W} × ${BAN_H} px</b>. Tu choisis la période d'affichage ; la bannière disparaît seule à la date de fin.</div>
  <div class="${p.mode==='web'?'aff-grid':''}">${L.map((a,i)=>{const[s,k]=affState(a);const e=a.evtId&&evt(a.evtId);return `<div class="card mb aff-card"><div class="aff-thumb"><img src="${a.img}" alt=""></div>
    <div class="row between mt"><div style="min-width:0"><div class="name ellip">${esc(a.titre)||'Sans titre'}</div><div class="muted">${a.fin?`Du ${fdate(a.debut)} au ${fdate(a.fin)}`:`Depuis le ${fdate(a.debut)}`}${e?' · ouvre « '+esc(e.titre)+' »':a.lien?' · lien':''}</div></div><span class="chip ${k}">${s}</span></div>
    <div class="row mt" style="gap:6px"><button class="btn sec sm" data-act="affMove" data-id="${a.id}" data-v="-1" ${i?'':'disabled'} title="Monter"><i data-lucide="arrow-up" class="i i-sm"></i></button><button class="btn sec sm" data-act="affMove" data-id="${a.id}" data-v="1" ${i<L.length-1?'':'disabled'} title="Descendre"><i data-lucide="arrow-down" class="i i-sm"></i></button>
    <button class="btn sec sm" data-act="affToggle" data-id="${a.id}"><i data-lucide="${a.actif?'eye-off':'eye'}" class="i i-sm"></i>${a.actif?'Masquer':'Afficher'}</button><button class="btn sec sm" data-act="editAff" data-id="${a.id}"><i data-lucide="pencil" class="i i-sm"></i></button><button class="btn sec sm" data-act="affDel" data-id="${a.id}" style="color:var(--red)"><i data-lucide="trash-2" class="i i-sm"></i></button></div></div>`}).join('')||'<div class="card empty">Aucune affiche pour l\'instant.</div>'}</div>`}
function vAffForm(p,id){const a=id?DB.affiches.find(x=>x.id===id):null;p.f.affImg=p.f.affImg===undefined?(a&&a.img)||'':p.f.affImg;
  return wTitle(p,id?'Modifier l\'affiche':'Nouvelle affiche','')+`<div class="card mb" style="max-width:640px">
  ${imgField('affImg',p,p.f.affImg,'de la bannière *')}
  <div class="field"><label>Titre (pour toi, et lu par les lecteurs d'écran)</label><input class="inp" id="af-t-${p.id}" value="${esc(a?a.titre:'')}" placeholder="Ex. Concert de Noël"></div>
  <div class="field"><label>Quand on touche la bannière</label><select class="inp" id="af-e-${p.id}"><option value="">Afficher l'image en grand</option>${upcoming().map(e=>`<option value="${e.id}" ${a&&a.evtId===e.id?'selected':''}>Ouvrir l'événement « ${esc(e.titre)} »</option>`).join('')}</select></div>
  <div class="field"><label>Ou un lien (facultatif : formulaire, direct, page…)</label><input class="inp" id="af-l-${p.id}" value="${esc(a?a.lien:'')}" placeholder="https://…"></div>
  <div class="grid2"><div class="field"><label>Afficher à partir du</label><input class="inp" type="date" id="af-d-${p.id}" value="${a?a.debut:today()}"></div><div class="field"><label>Jusqu'au (vide = sans fin)</label><input class="inp" type="date" id="af-f-${p.id}" value="${a?a.fin:''}"></div></div>
  <div class="row" style="gap:8px;justify-content:flex-end"><button class="btn sec" data-act="back">Annuler</button><button class="btn" data-act="saveAff" data-id="${id||''}"><i data-lucide="check" class="i i-sm"></i>${id?'Enregistrer':'Publier'}</button></div></div>`}

/* ---- Accueil de l'organisateur ---- */
function vOrgHome(p){const me=sMember(p);const U=upcoming();
  let h=(p.mode==='web'?wTitle(p,`Bonjour ${esc(prenomOf(me))} 👋`,`Organisateur · ${U.length} événement${U.length>1?'s':''} à venir`):`<div class="muted mb" style="font-size:13px">Bonjour <b style="color:var(--ink)">${esc(prenomOf(me))}</b> 👋 · ${U.length} événement${U.length>1?'s':''} à venir</div>`);
  if(U.length)h+=`<div class="row between" style="margin:2px 2px 8px"><div class="name" style="font-size:14px">Prochains événements</div><button class="link" data-act="tab" data-tab="evenements">Tous (${U.length}) →</button></div>
    <div class="bans mb">${U.slice(0,Math.max(3,Math.min(U.length,6))).map(e=>{const c=evCounts(e),T=evTasks(e),td=T.filter(t=>t.faite).length;const j=evDays(e);
      const vis=e.img?`<img src="${e.img}" alt="">`:`<div class="ec-gen" style="--c:${CATCOL[e.categorie]}"><div class="ec-k"><i data-lucide="${CATIC[e.categorie]}" class="i i-sm"></i>${e.categorie}</div><div class="ec-t">${esc(e.titre)}</div><div class="ec-d">${evDateLong(e)} · ${evHeure(e).split(' – ')[0]}</div></div>`;
      return `<div class="evc" data-act="openEvt" data-id="${e.id}"><div class="evc-img">${vis}<span class="evc-j">${j===0?'Aujourd\'hui':j===1?'Demain':'J-'+j}</span></div>
      <div class="evc-f"><span title="Participent"><i data-lucide="users" class="i i-sm"></i><b>${c.oui}</b> participent${c.pe?` · ${c.pe} peut-être`:''}</span><span title="Tâches" class="${T.length&&td<T.length?'warn':''}"><i data-lucide="list-checks" class="i i-sm"></i><b>${T.length?td+'/'+T.length:'—'}</b></span></div></div>`}).join('')}</div>`;
  else h+=`<div class="card empty mb">Aucun événement prévu.<br><button class="btn mt" data-act="newEvt">Créer un événement</button></div>`;
  h+=(typeof myPayCard==='function'?myPayCard(p)+myLateBlock(p):'');
  h+=bdBanner(p);
  const todo=DB.tasks.filter(t=>!t.faite&&evt(t.evtId)&&!evt(t.evtId).annule&&!evPast(evt(t.evtId))).sort((a,b)=>evt(a.evtId).debut.localeCompare(evt(b.evtId).debut));
  h+=`<div><div class="card mb"><h3><i data-lucide="list-todo" class="i"></i>Tâches à faire<span class="r">${todo.length}</span></h3>
    ${todo.slice(0,5).map(t=>{const m=member(t.resp),e=evt(t.evtId);return `<div class="list-item"><button class="chk" data-act="evTask" data-id="${t.id}"><i data-lucide="check" class="i i-sm"></i></button><div class="grow" style="min-width:0;cursor:pointer" data-act="openEvt" data-id="${e.id}"><div class="name ellip" style="font-size:13px">${esc(t.libelle)}</div><div class="muted ellip">${esc(e.titre)} · ${m?esc(titleCase(fullName(m))):'personne désignée'}</div></div></div>`}).join('')||'<div class="empty" style="padding:12px">Tout est prêt 🎉</div>'}</div>
  ${newMembers(p)}
</div>`;
  return h}

/* ---- Actions ---- */
function shrinkImg(file,cb){const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const W=1200,s=Math.min(1,W/im.width);const cv=document.createElement('canvas');cv.width=Math.round(im.width*s);cv.height=Math.round(im.height*s);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);cb(cv.toDataURL('image/jpeg',.82),im.width,im.height)};im.onerror=()=>toast('Image illisible.');im.src=r.result};r.readAsDataURL(file)}
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.img)return;const p=pane(t.closest('[data-pane]').dataset.pane);const f=t.files[0];if(!f)return;
  shrinkImg(f,(u,w,hh)=>{p.f[t.dataset.img]=u;const wn=document.getElementById(`warn-${t.dataset.img}-${p.id}`);if(wn){const r=w/hh;wn.style.display=Math.abs(r-BAN_W/BAN_H)>0.15?'':'none';wn.innerHTML=`Ton image fait <b>${w} × ${hh} px</b> : elle sera recadrée pour tenir en ${BAN_W} × ${BAN_H}. Pour un meilleur rendu, prépare-la à ces dimensions.`}const im=document.getElementById(`prev-${t.dataset.img}-${p.id}`),ph=document.getElementById(`ph-${t.dataset.img}-${p.id}`);if(im){im.src=u;im.style.display=''}if(ph)ph.style.display='none'})});
function val(p,k){const el=document.getElementById(`${k}-${p.id}`);return el?el.value.trim():''}
function evAction(a,p,d,el){
  switch(a){
    case'openEvt':closeModal();p.sub={evt:+d.id};p.f.epf='oui';renderPane(p);return true;
    case'newEvt':p.sub='newevt';p.f.evImg=undefined;renderPane(p);return true;
    case'editEvt':p.sub={editEvt:+d.id};p.f.evImg=undefined;renderPane(p);return true;
    case'saveEvt':{const t=val(p,'ev-t'),dt=val(p,'ev-d'),h1=val(p,'ev-h1'),h2=val(p,'ev-h2');
      if(!t){toast('Donne un titre à l\'événement.');return true}if(!dt||!h1){toast('Indique la date et l\'heure de début.');return true}if(h2&&h2<h1){toast('L\'heure de fin est avant le début.');return true}
      const data={titre:t,categorie:val(p,'ev-c'),debut:dt+'T'+h1,fin:h2?dt+'T'+h2:null,lieu:val(p,'ev-l'),responsable:+val(p,'ev-r')||sMember(p).id,description:val(p,'ev-desc'),inscription:document.getElementById('ev-i-'+p.id).checked,img:p.f.evImg||''};
      let e;if(d.id){e=evt(+d.id);const moved=e.debut!==data.debut||e.lieu!==data.lieu;Object.assign(e,data);log(sessName(p),'Événement modifié',e.titre);
        notify({perm:'__tous'},'evenements',(moved?'Changement de date ou de lieu : ':'Événement mis à jour : ')+e.titre,`${evDateLong(e)} · ${evHeure(e)}${e.lieu?' · '+e.lieu:''}`,sAcct(p).id)}
      else{e=Object.assign({id:DB.seq++,annule:false,motif:'',creePar:sessName(p),creeLe:nowIso()},data);DB.events.push(e);log(sessName(p),'Événement créé',`${e.titre} — ${fdate(e.debut)}`);
        notify({perm:'__tous'},'evenements','Nouvel événement : '+e.titre,`${evDateLong(e)} · ${evHeure(e)}${e.lieu?' · '+e.lieu:''}`,sAcct(p).id)}
      p.sub={evt:e.id};p.f.evImg=undefined;toast(d.id?'Événement mis à jour : tout le monde est prévenu.':'Événement publié : tout le monde est prévenu.');refresh();return true}
    case'evRep':{const me=sMember(p);let r=rep(+d.id,me.id);if(!r){r={evtId:+d.id,mid:me.id};DB.evtRep.push(r)}r.reponse=d.v;toast(d.v==='oui'?'Super, on compte sur toi ! 🙌':d.v==='non'?'Merci de nous avoir prévenus.':'Noté. Tu peux changer d\'avis à tout moment.');refresh();return true}
    case'evPres':{let r=rep(+d.id,+d.m);if(!r){r={evtId:+d.id,mid:+d.m};DB.evtRep.push(r)}r.present=!r.present;persist();rerender(p);return true}
    case'evTask':{const t=DB.tasks.find(x=>x.id===+d.id);t.faite=!t.faite;if(t.faite)log(sessName(p),'Tâche terminée',`${t.libelle} — ${evt(t.evtId).titre}`);refresh();return true}
    case'evTaskDel':{DB.tasks=DB.tasks.filter(x=>x.id!==+d.id);refresh();return true}
    case'evTaskAdd':{const l=val(p,'tk-l'),r=+val(p,'tk-r')||null;if(!l){toast('Écris la tâche.');return true}DB.tasks.push({id:DB.seq++,evtId:+d.id,libelle:l,resp:r,echeance:'',faite:false});
      if(r){const e=evt(+d.id);notify({mid:r},'evenements','Nouvelle mission : '+l,`Pour « ${e.titre} » (${fdate(e.debut)}). Merci !`,sAcct(p).id)}toast(r?'Tâche ajoutée, la personne est prévenue.':'Tâche ajoutée.');refresh();return true}
    case'evRemind':{const e=evt(+d.id);const c=evCounts(e);MCTX={pane:p.id,evt:e.id};
      openModal(`<h2>Envoyer un rappel</h2><div class="muted mb">« ${esc(e.titre)} » — ${evDateLong(e)} à ${evHeure(e)}</div>
      <div class="field"><label>À qui ?</label><select class="inp" id="rm-who"><option value="rep">Ceux qui ont répondu oui / peut-être (${c.oui+c.pe})</option><option value="tous">Tous les jeunes</option></select></div>
      <div class="field"><label>Message</label><textarea class="inp" rows="3" id="rm-msg">N'oublie pas : ${esc(e.titre)}, ${evDateLong(e)} à ${evHeure(e)}${e.lieu?' — '+esc(e.lieu):''}. On compte sur toi !</textarea></div>
      <div class="foot"><a class="btn ch-wa" href="https://wa.me/?text=${encodeURIComponent(`📣 Rappel : ${e.titre}, ${evDateLong(e)} à ${evHeure(e)}${e.lieu?' — '+e.lieu:''}. On compte sur vous !`)}" target="_blank" rel="noopener"><i data-lucide="message-circle" class="i i-sm"></i>Groupe WhatsApp</a><button class="btn" data-act="evRemindGo"><i data-lucide="send" class="i i-sm"></i>Envoyer dans l'appli</button></div>`);return true}
    case'evRemindGo':{const e=evt(MCTX.evt),pp=pane(MCTX.pane);const who=document.getElementById('rm-who').value,msg=document.getElementById('rm-msg').value;
      const mids=who==='tous'?null:DB.evtRep.filter(r=>r.evtId===e.id&&['oui','peut_etre'].includes(r.reponse)).map(r=>r.mid);
      notify(mids?{mids}:{perm:'__tous'},'evenements','Rappel : '+e.titre,msg,sAcct(pp).id);log(sessName(pp),'Rappel d\'événement',`${e.titre} — ${mids?mids.length+' personne(s)':'tous les jeunes'}`);closeModal();toast('Rappel envoyé.');refresh();return true}
    case'evCancel':{const e=evt(+d.id);MCTX={pane:p.id,evt:e.id};openModal(`<h2>Annuler « ${esc(e.titre)} » ?</h2><div class="muted mb">Tous les jeunes seront prévenus. L'événement reste visible dans l'onglet « Annulés ».</div><div class="field"><label>Motif (affiché aux jeunes)</label><input class="inp" id="cx-m" placeholder="Ex. Reporté à cause de la pluie"></div><div class="foot"><button class="btn sec" data-act="closeModal">Retour</button><button class="btn danger" data-act="evCancelGo">Annuler l'événement</button></div>`);return true}
    case'evCancelGo':{const e=evt(MCTX.evt),pp=pane(MCTX.pane);e.annule=true;e.motif=document.getElementById('cx-m').value.trim();DB.affiches.forEach(a=>{if(a.evtId===e.id)a.actif=false});
      notify({perm:'__tous'},'evenements','Événement annulé : '+e.titre,e.motif||'',sAcct(pp).id);log(sessName(pp),'Événement annulé',e.titre+(e.motif?' — motif : '+e.motif:''));closeModal();toast('Événement annulé, tout le monde est prévenu.');refresh();return true}
    case'openAff':{const x=DB.affiches.find(y=>y.id===+d.id);if(!x)return true;if(x.evtId&&evt(x.evtId)){p.sub={evt:x.evtId};renderPane(p);return true}
      openModal(`<img src="${x.img}" style="width:100%;border-radius:12px;display:block"><div class="row between mt"><div class="name">${esc(x.titre)}</div>${x.lien?`<a class="btn sm" href="${esc(x.lien)}" target="_blank" rel="noopener">Ouvrir le lien</a>`:''}</div><div class="foot"><button class="btn sec" data-act="closeModal">Fermer</button></div>`,{pane:p.id},true);return true}
    case'newAff':p.sub='newaff';p.f.affImg=undefined;renderPane(p);return true;
    case'editAff':p.sub={editAff:+d.id};p.f.affImg=undefined;renderPane(p);return true;
    case'saveAff':{if(!p.f.affImg){toast('Choisis une image.');return true}const deb=val(p,'af-d')||today(),fin=val(p,'af-f');if(fin&&fin<deb){toast('La date de fin est avant le début.');return true}
      const lien=val(p,'af-l');if(lien&&!/^https?:\/\//.test(lien)){toast('Le lien doit commencer par https://');return true}
      const data={titre:val(p,'af-t'),img:p.f.affImg,evtId:+val(p,'af-e')||null,lien,debut:deb,fin};
      if(d.id){Object.assign(DB.affiches.find(x=>x.id===+d.id),data);log(sessName(p),'Affiche modifiée',data.titre)}
      else{DB.affiches.forEach(x=>x.ordre++);DB.affiches.push(Object.assign({id:DB.seq++,ordre:0,actif:true},data));log(sessName(p),'Affiche publiée',data.titre||'Sans titre')}
      p.sub=null;p.tab='affiches';p.f.affImg=undefined;toast(deb>today()?`Bannière programmée pour le ${fdate(deb)}.`:'Affiche en ligne sur l\'accueil de tous.');refresh();return true}
    case'affToggle':{const x=DB.affiches.find(y=>y.id===+d.id);x.actif=!x.actif;toast(x.actif?'Bannière affichée.':'Bannière masquée.');refresh();return true}
    case'affMove':{const L=DB.affiches.slice().sort((a,b)=>a.ordre-b.ordre);const i=L.findIndex(x=>x.id===+d.id),j=i+(+d.v);if(j<0||j>=L.length)return true;[L[i],L[j]]=[L[j],L[i]];L.forEach((x,k)=>x.ordre=k);refresh();return true}
    case'affDel':{const x=DB.affiches.find(y=>y.id===+d.id);MCTX={pane:p.id,aff:x.id};openModal(`<h2>Supprimer cette bannière ?</h2><img src="${x.img}" style="width:100%;border-radius:10px;margin:8px 0"><div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button><button class="btn danger" data-act="affDelGo">Supprimer</button></div>`);return true}
    case'affDelGo':{const pp=pane(MCTX.pane);const x=DB.affiches.find(y=>y.id===MCTX.aff);DB.affiches=DB.affiches.filter(y=>y!==x);log(sessName(pp),'Affiche retirée',x.titre||'Sans titre');closeModal();toast('Bannière supprimée.');refresh();return true}
  }
  return false}

/* ---- Nouveaux jeunes inscrits (organisateur) ---- */
function newMembers(p){const L=DB.members.filter(m=>m.actif).slice().sort((a,b)=>(b.creeLe||'').localeCompare(a.creeLe||'')||b.id-a.id).slice(0,5);
  const ago=t=>{if(!t)return'';const n=Math.round((new Date(today()+'T12:00')-new Date(t.slice(0,10)+'T12:00'))/864e5);return n<=0?'aujourd\'hui':n===1?'hier':n<31?`il y a ${n} jours`:'le '+fdate(t)};
  return `<div class="card mb"><h3><i data-lucide="user-plus" class="i"></i>Nouveaux jeunes inscrits<span class="r"><button class="link" data-act="tab" data-tab="membres">Tous →</button></span></h3>
  ${L.map(m=>`<div class="list-item"><div class="avatar sm" style="cursor:pointer" data-act="openMember" data-id="${m.id}">${initials(m.nom)}</div><div class="grow" style="min-width:0;cursor:pointer" data-act="openMember" data-id="${m.id}"><div class="name ellip">${esc(titleCase(fullName(m)))}</div><div class="muted ellip">Inscrit ${ago(m.creeLe)}${m.departement?' · '+esc(m.departement):''}</div></div>${chans(m,`Bienvenue dans la jeunesse ${prenomOf(m)} ! 🎉 Nous sommes heureux de t'accueillir. Retrouve nos prochains événements dans l'appli Younity.`,{labels:false})}</div>`).join('')||'<div class="empty" style="padding:12px">Aucun jeune inscrit récemment.</div>'}</div>`}

/* ---- Rappels automatiques des événements (en vrai : tâche planifiée chaque matin sur le serveur) ---- */
function autoRappels(){let ch=false;upcoming().forEach(e=>{const d=evDays(e);e.rap=e.rap||{};
  const st=d===0?'jj':d===1?'j1':d<=7?'j7':null;if(!st||e.rap[st])return;e.rap[st]=true;ch=true;
  const quand=`${evDateLong(e)} · ${evHeure(e)}${e.lieu?' · '+e.lieu:''}`;
  const R=DB.evtRep.filter(r=>r.evtId===e.id);
  if(st==='j7')notify({perm:'__tous'},'evenements',`Dans ${d} jours : ${e.titre}`,quand+(e.inscription?' — dis-nous si tu viens !':''));
  if(st==='j1')notify({mids:DB.members.filter(m=>m.actif&&!R.some(r=>r.mid===m.id&&r.reponse==='non')).map(m=>m.id)},'evenements',`Demain : ${e.titre}`,quand);
  if(st==='jj')notify({mids:R.filter(r=>['oui','peut_etre'].includes(r.reponse)).map(r=>r.mid)},'evenements',`C'est aujourd'hui : ${e.titre}`,quand+' — on t\'attend !');
  if(e.responsable&&st!=='j7'){const T=evTasks(e).filter(t=>!t.faite).length,c=evCounts(e);notify({mid:e.responsable},'evenements',`${st==='jj'?'Aujourd\'hui':'Demain'} : ${e.titre} (tu organises)`,`${c.oui} participent, ${c.pe} peut-être${T?` · ${T} tâche${T>1?'s':''} pas encore faite${T>1?'s':''}`:' · toutes les tâches sont faites'}`)}
});if(ch)persist()}
