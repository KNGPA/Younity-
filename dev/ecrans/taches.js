function dLab(v){return v.startsWith('Réunion')?'Date de la réunion':v==='autre'?'Date de l\'échange':'Date de la décision'}
function tOrig(t){return t.origine?t.origine+(t.dateOrig?(t.origine.startsWith('Réunion')?' du ':' le ')+fdate(t.dateOrig):''):''}
const ORIG=[['Réunion du bureau','Lors de la réunion du bureau'],['Réunion de la jeunesse','Lors de la réunion de la jeunesse'],['Décidé par le président','Par le président'],['Décidé par la trésorière','Par la trésorière']];
/* ================== RAPPELS & TÂCHES (secrétariat) ================== */
function tache(id){return DB.suivi.find(t=>t.id===id)}
function tEtat(t){if(t.faite)return['Fait','ok'];if(t.echeance&&t.echeance<today())return['En retard','late'];if(t.echeance&&t.echeance<=addD(3))return['Bientôt','gold'];return['À faire','mut']}
function tPour(t){return t.tous?'Toute la jeunesse':t.resp.map(id=>member(id)).filter(Boolean).map(m=>titleCase(fullName(m))).join(', ')||'Personne désignée'}
function tMsg(t){return `Rappel : ${t.titre}${t.echeance?` — à faire avant le ${fdate(t.echeance)}`:''}.${t.details?' '+t.details:''}${t.origine?` (${tOrig(t).charAt(0).toLowerCase()+tOrig(t).slice(1)})`:''} Merci !`}
function tRow(t,p){const[e,k]=tEtat(t);return `<div class="list-item" style="align-items:flex-start"><button class="chk ${t.faite?'on':''}" data-act="tDone" data-id="${t.id}" title="Marquer comme fait" style="margin-top:2px"><i data-lucide="check" class="i i-sm"></i></button>
  <div class="grow" style="min-width:0;cursor:pointer" data-act="tOpen" data-id="${t.id}"><div class="name" style="font-size:13.5px;${t.faite?'text-decoration:line-through;color:var(--ink-3)':''}">${esc(t.titre)}</div>
  <div class="muted ellip"><i data-lucide="${t.tous?'users':'user'}" class="i i-sm" style="vertical-align:-2px"></i> ${esc(tPour(t))}</div>
  <div class="muted" style="font-size:11.5px">${t.echeance?`Avant le ${fdate(t.echeance)}`:'Sans échéance'}${t.origine?' · '+esc(tOrig(t)):''}${t.rappels.length?` · ${t.rappels.length} rappel${t.rappels.length>1?'s':''}`:''}</div></div>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px"><span class="chip ${k}">${e}</span>${t.faite?'':`<button class="btn sec sm" data-act="tRemind" data-id="${t.id}"><i data-lucide="bell-ring" class="i i-sm"></i>Rappeler</button>`}</div></div>`}
function vRappels(p){const f=p.f.tf||'afaire';const all=DB.suivi.slice().sort((a,b)=>(a.echeance||'9999').localeCompare(b.echeance||'9999'));
  const af=all.filter(t=>!t.faite),late=af.filter(t=>tEtat(t)[0]==='En retard'),done=all.filter(t=>t.faite).reverse();
  const L=f==='afaire'?af:f==='retard'?late:done;const U=upcoming().slice(0,3);
  return wTitle(p,'Rappels & tâches','Ce qui a été décidé en réunion, qui doit le faire, et les rappels à la jeunesse.','<button class="btn" data-act="tNew"><i data-lucide="plus" class="i"></i>Nouvelle tâche</button>')+
  `<div class="kpis"><div class="kpi"><div class="l">À faire</div><div class="v">${af.length}</div></div><div class="kpi"><div class="l">En retard</div><div class="v" style="color:var(--red)">${late.length}</div></div></div>
  <div class="pills filters mb">${pills(p,'tf',[['afaire','À faire',af.length],['retard','En retard',late.length],['faites','Faites',done.length]],'afaire')}</div>
  <div class="card mb" style="padding:4px 16px">${L.map(t=>tRow(t,p)).join('')||`<div class="empty">${f==='faites'?'Rien de terminé pour l\'instant.':'Rien à faire, tout est à jour 👍'}</div>`}</div>
  <div class="card mb"><h3><i data-lucide="calendar-days" class="i"></i>Activités à venir<span class="r"><button class="link" data-act="tab" data-tab="evenements">Toutes →</button></span></h3>
  ${U.map(e=>{const c=evCounts(e);return `<div class="list-item">${dbadge(e)}<div class="grow" style="min-width:0;cursor:pointer" data-act="openEvt" data-id="${e.id}"><div class="name ellip">${esc(e.titre)}</div><div class="muted ellip">${evDans(e)} · ${evHeure(e).split(' – ')[0]} · ${c.oui} participent</div></div><button class="btn sec sm" data-act="evRemind" data-id="${e.id}"><i data-lucide="bell-ring" class="i i-sm"></i>Rappeler</button></div>`}).join('')||'<div class="empty" style="padding:12px">Aucune activité prévue.</div>'}</div>`}
function vTacheForm(p,id){const t=id?tache(id):null;const sel=p.f.tSel||(t?t.resp.slice():[]);p.f.tSel=sel;const q=norm(p.f.tq||'');
  const act=DB.members.filter(m=>m.actif);const tous=p.f.tTous??(t?t.tous:false);
  return wTitle(p,id?'Modifier la tâche':'Nouvelle tâche','Les personnes concernées sont prévenues dans l\'application.')+`<div class="card mb" style="max-width:640px">
  <div class="field"><label>Quoi ? *</label><input class="inp" id="tk-t-${p.id}" value="${esc(t?t.titre:p.f.tT||'')}" placeholder="Ex. Préparer la liste des chants de Noël"></div>
  <div class="field"><label>Détails</label><textarea class="inp" rows="3" id="tk-d-${p.id}" placeholder="Ce qui a été dit, ce qu'il faut apporter…">${esc(t?t.details:p.f.tD||'')}</textarea></div>
  ${(()=>{const cur=t?t.origine:(p.f.tO??ORIG[0][0]);const known=ORIG.some(o=>o[0]===cur);const v=p.f.tOS??(known?cur:'autre');
   return `<div class="field"><label>Décidé par / lors de</label><select class="inp" id="tk-os-${p.id}" data-osel="1">${ORIG.map(([k,l])=>`<option value="${esc(k)}" ${v===k?'selected':''}>${l}</option>`).join('')}<option value="autre" ${v==='autre'?'selected':''}>Autre (je précise)</option></select>
   <input class="inp mt" id="tk-o-${p.id}" placeholder="Ex. Échange avec le pasteur, réunion des responsables…" value="${esc(known?'':cur)}" style="${v==='autre'?'':'display:none'}"></div>
   <div class="field"><label id="tk-dl-${p.id}">${dLab(v)}</label><input class="inp" type="date" id="tk-do-${p.id}" max="${today()}" value="${t?t.dateOrig||'':p.f.tDO||today()}"></div>`})()}
  <div class="field"><label>À faire avant le</label><input class="inp" type="date" id="tk-e-${p.id}" value="${t?t.echeance:p.f.tE||addD(7)}"></div>
  <div class="field"><label>Pour qui ?</label><div class="pills"><button type="button" class="pill ${tous?'':'on'}" data-act="tTous" data-v="0">Une ou plusieurs personnes</button><button type="button" class="pill ${tous?'on':''}" data-act="tTous" data-v="1">Toute la jeunesse</button></div></div>
  ${tous?'':`<div class="field"><input class="inp" placeholder="Rechercher un jeune…" data-fk="tq" data-live="1" value="${esc(p.f.tq||'')}" style="margin-bottom:6px"><div class="pick-list">${act.filter(m=>!q||norm(fullName(m)).includes(q)).map(m=>`<label class="pick"><input type="checkbox" data-tpick="${m.id}" ${sel.includes(m.id)?'checked':''}><span class="avatar sm">${initials(m.nom)}</span><span class="ellip">${esc(titleCase(fullName(m)))}</span></label>`).join('')}</div><div class="muted mt">${sel.length} personne${sel.length>1?'s':''} choisie${sel.length>1?'s':''}</div></div>`}
  <div class="row" style="gap:8px;justify-content:flex-end"><button class="btn sec" data-act="back">Annuler</button><button class="btn" data-act="tSave" data-id="${id||''}"><i data-lucide="check" class="i i-sm"></i>${id?'Enregistrer':'Enregistrer et prévenir'}</button></div></div>`}
function vTacheDetail(p,id){const t=tache(id);if(!t)return'';const[e,k]=tEtat(t);
  const back=p.mode==='web'?`<button class="link mb" data-act="back"><i data-lucide="arrow-left" class="i i-sm"></i>Rappels & tâches</button>`:'';
  return back+`<div class="card mb"><div class="row between"><span class="chip ${k}">${e}</span><button class="link" data-act="tEdit" data-id="${t.id}"><i data-lucide="pencil" class="i i-sm"></i>Modifier</button></div>
  <div class="name" style="font-size:18px;margin:10px 0 6px">${esc(t.titre)}</div>${t.details?`<div style="color:var(--ink-2);line-height:1.5;margin-bottom:8px">${esc(t.details)}</div>`:''}
  <div class="kv"><span>Pour</span><b>${esc(tPour(t))}</b></div><div class="kv"><span>À faire avant le</span><b>${t.echeance?fdate(t.echeance):'—'}</b></div><div class="kv"><span>Décidé par / lors de</span><b>${esc(tOrig(t))||'—'}</b></div><div class="kv"><span>Noté par</span><b>${esc(t.creePar)}</b></div></div>
  ${t.faite?'':`<button class="btn block mb" data-act="tRemind" data-id="${t.id}"><i data-lucide="bell-ring" class="i"></i>Envoyer un rappel</button>`}
  ${!t.tous&&!t.faite?`<div class="card mb"><h3><i data-lucide="users" class="i"></i>Rappeler une personne</h3>${t.resp.map(member).filter(Boolean).map(m=>`<div class="list-item"><div class="avatar sm">${initials(m.nom)}</div><div class="grow name ellip">${esc(titleCase(fullName(m)))}</div>${chans(m,`Bonjour ${prenomOf(m)}, ${tMsg(t)}`,{labels:false,act:'tLog',attrs:`data-id="${t.id}" data-m="${m.id}"`})}</div>`).join('')}</div>`:''}
  <div class="card mb"><h3><i data-lucide="history" class="i"></i>Rappels envoyés<span class="r">${t.rappels.length}</span></h3>${t.rappels.slice().reverse().map(r=>`<div class="kv"><span>${fdt(r.t)}</span><b>${esc(r.canal)}</b></div>`).join('')||'<div class="muted">Aucun rappel pour l\'instant.</div>'}</div>
  <button class="btn ${t.faite?'sec':''} block" data-act="tDone" data-id="${t.id}"><i data-lucide="${t.faite?'rotate-ccw':'check'}" class="i i-sm"></i>${t.faite?'Remettre à faire':'Marquer comme fait'}</button>`}
function seedSuivi(db){const id=()=>db.seq++;const M=db.members;const sec=db.accounts.find(a=>a.roleId==='secretaire');const sn='Nene Lou Marie Michelle (Secrétaire)';
  [['Préparer la liste des chants de Noël','Choisir 8 chants et les envoyer à la chorale.','Réunion du bureau',addD(5),[M[3].id,M[10].id],false,false],
   ['Rapporter les kits de l\'évangélisation','Les kits restants sont à ramener à la salle annexe.','Décidé par le président',addD(-2),[M[12].id],false,false],
   ['Venir en blanc au culte de dimanche','Toute la jeunesse est attendue en tenue blanche pour le culte de reconnaissance.','Réunion de la jeunesse',addD(1),[],true,false],
   ['Confirmer la salle pour la formation','Appeler le pasteur pour réserver la salle annexe.','Décidé par la trésorière',addD(9),[M[20].id],false,false],
   ['Envoyer le compte rendu de la réunion','','Réunion du bureau',addD(-8),[sec?sec.memberId:M[22].id],false,true]]
  .forEach(([titre,details,origine,echeance,resp,tous,faite],k)=>db.suivi.push({id:id(),titre,details,origine,dateOrig:addD(-[13,20,6,9,13][k]),echeance,resp,tous,faite,creePar:sn,creeLe:nowIso(),rappels:faite?[]:[{t:addD(-1)+'T18:00:00',canal:'Appli'}].slice(0,echeance<today()?1:0)}))}
function tAction(a,p,d){
  switch(a){
    case'tNew':p.sub='tnew';['tSel','tTous','tq','tT','tD','tO','tOS','tE','tDO'].forEach(k=>delete p.f[k]);renderPane(p);return true;
    case'tEdit':p.sub={tedit:+d.id};['tSel','tTous','tq','tO','tOS'].forEach(k=>delete p.f[k]);renderPane(p);return true;
    case'tOpen':p.sub={tache:+d.id};renderPane(p);return true;
    case'tTous':{['t','d','o','e','do'].forEach(k=>{const v=val(p,'tk-'+k);if(v!=='')p.f['t'+k.toUpperCase()]=v});p.f.tOS=val(p,'tk-os');p.f.tTous=d.v==='1';rerender(p);return true}
    case'tSave':{const t0=d.id?tache(+d.id):null;const titre=val(p,'tk-t');if(!titre){toast('Écris ce qu\'il faut faire.');return true}
      const tous=!!(p.f.tTous??(t0?t0.tous:false));const resp=tous?[]:(p.f.tSel||[]);if(!tous&&!resp.length){toast('Choisis au moins une personne, ou « Toute la jeunesse ».');return true}
      const os=val(p,'tk-os');const origine=os==='autre'?val(p,'tk-o'):os;if(os==='autre'&&!origine){toast('Précise d\'où vient la décision.');return true}
      const dateOrig=val(p,'tk-do');if(dateOrig>today()){toast('La date de la décision ne peut pas être dans le futur.');return true}
      const data={titre,details:val(p,'tk-d'),origine,dateOrig,echeance:val(p,'tk-e'),tous,resp};let t;
      if(t0){Object.assign(t0,data);t=t0;log(sessName(p),'Tâche modifiée',t.titre)}else{t=Object.assign({id:DB.seq++,faite:false,creePar:sessName(p),creeLe:nowIso(),rappels:[]},data);DB.suivi.push(t);log(sessName(p),'Tâche notée',`${t.titre} — ${tPour(t)}`)}
      notify(tous?{perm:'__tous'}:{mids:resp},'taches',(t0?'Tâche mise à jour : ':tous?'Pour toute la jeunesse : ':'Nouvelle tâche pour toi : ')+t.titre,`${t.echeance?'À faire avant le '+fdate(t.echeance):''}${t.origine?' · '+tOrig(t):''}`,sAcct(p).id);
      p.sub={tache:t.id};['tSel','tTous','tq'].forEach(k=>delete p.f[k]);toast(tous?'Enregistré : toute la jeunesse est prévenue.':`Enregistré : ${resp.length} personne${resp.length>1?'s':''} prévenue${resp.length>1?'s':''}.`);refresh();return true}
    case'tDone':{const t=tache(+d.id);t.faite=!t.faite;if(t.faite)log(sessName(p),'Tâche terminée',t.titre);toast(t.faite?'Bravo, c\'est fait ✅':'Tâche remise à faire.');refresh();return true}
    case'tRemind':{const t=tache(+d.id);MCTX={pane:p.id,t:t.id};
      openModal(`<h2>Envoyer un rappel</h2><div class="muted mb">${esc(t.titre)} · ${esc(tPour(t))}</div><div class="field"><label>Message</label><textarea class="inp" rows="4" id="tr-msg">${esc(tMsg(t))}</textarea></div>
      <div class="foot"><a class="btn ch-wa" data-act="tLogWa" href="https://wa.me/?text=${encodeURIComponent(tMsg(t))}" target="_blank" rel="noopener"><i data-lucide="message-circle" class="i i-sm"></i>Groupe WhatsApp</a><button class="btn" data-act="tRemindGo"><i data-lucide="send" class="i i-sm"></i>Envoyer dans l'appli</button></div>`);return true}
    case'tRemindGo':{const t=tache(MCTX.t),pp=pane(MCTX.pane);const msg=document.getElementById('tr-msg').value;notify(t.tous?{perm:'__tous'}:{mids:t.resp},'taches','Rappel : '+t.titre,msg,sAcct(pp).id);t.rappels.push({t:nowIso(),canal:'Appli'});log(sessName(pp),'Rappel envoyé',`${t.titre} — ${tPour(t)}`);closeModal();toast('Rappel envoyé.');refresh();return true}
    case'tLogWa':{const t=tache(MCTX.t);t.rappels.push({t:nowIso(),canal:'WhatsApp (groupe)'});persist();setTimeout(()=>{closeModal();refresh()},300);return false}
    case'tLog':{const t=tache(+d.id);t.rappels.push({t:nowIso(),canal:{wa:'WhatsApp',sms:'SMS',app:'Appli'}[d.chan]||'Appli'});if(d.chan==='app'){notify({mid:+d.m},'taches','Rappel : '+t.titre,tMsg(t),sAcct(p).id)}persist();setTimeout(refresh,300);return d.chan==='app'}
  }return false}
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.tpick)return;const p=pane(t.closest('[data-pane]').dataset.pane);const id=+t.dataset.tpick;
  p.f.tSel=p.f.tSel||[];if(t.checked){if(!p.f.tSel.includes(id))p.f.tSel.push(id)}else p.f.tSel=p.f.tSel.filter(x=>x!==id);
  const c=t.closest('.field').querySelector('.muted.mt');if(c){const n=p.f.tSel.length;c.textContent=`${n} personne${n>1?'s':''} choisie${n>1?'s':''}`}});

document.addEventListener('change',e=>{const s=e.target;if(!s.dataset||!s.dataset.osel)return;const lb=document.getElementById(s.id.replace('tk-os','tk-dl'));if(lb)lb.textContent=dLab(s.value);const i=s.parentElement.querySelector('input');if(i){i.style.display=s.value==='autre'?'':'none';if(s.value==='autre')i.focus()}});
