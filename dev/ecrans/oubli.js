/* ================== MOT DE PASSE OUBLIÉ : par e-mail (code) ou via le président ================== */
let FG=null;
function presAcct(){return DB.accounts.find(a=>a.roleId==='president'&&a.actif)}
function fgModal(step){const pid=FG.pane;
  if(step==='choix')return openModal(`<h2>Mot de passe oublié</h2><div class="muted mb">Choisis comment retrouver ton accès.</div>
  <button class="fg-opt" data-act="fgMail"><span class="fg-ic"><i data-lucide="mail" class="i"></i></span><span><b>Réinitialiser moi-même</b><small>Je reçois un code à 6 chiffres sur mon e-mail</small></span><i data-lucide="chevron-right" class="i"></i></button>
  <button class="fg-opt" data-act="fgPres"><span class="fg-ic wa"><i data-lucide="message-circle" class="i"></i></span><span><b>Demander au président</b><small>Si je n'ai pas d'e-mail ou si je ne reçois pas le code</small></span><i data-lucide="chevron-right" class="i"></i></button>
  <div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button></div>`,{pane:pid});
  if(step==='mail')return openModal(`<h2>Réinitialiser par e-mail</h2><div class="muted mb">Entre l'e-mail enregistré sur ton profil. Tu recevras un code à 6 chiffres, valable 15 minutes.</div>
  <div class="field"><label>E-mail</label><input class="inp" id="fg-mail" inputmode="email" placeholder="nom@mail.com" value="${esc(FG.mail||'')}"></div><div id="fg-err" class="info red" style="display:none"></div>
  <div class="foot"><button class="btn sec" data-act="fgBack">Retour</button><button class="btn" data-act="fgSendCode"><i data-lucide="send" class="i i-sm"></i>Recevoir le code</button></div>`,{pane:pid});
  if(step==='code')return openModal(`<h2>Entre le code reçu</h2><div class="muted mb">Si cet e-mail correspond à un compte, un code a été envoyé à <b>${esc(FG.mail)}</b>. Pense à regarder dans les spams.</div>
  ${FG.demo?`<div class="info gold mb" style="font-size:12px">Prototype : le code envoyé est <b>${FG.demo}</b></div>`:''}
  <div class="field"><label>Code à 6 chiffres</label><input class="inp code6" id="fg-code" inputmode="numeric" maxlength="6" placeholder="••••••"></div>
  <div class="field"><label>Nouveau mot de passe (6 caractères minimum)</label><input class="inp" type="password" id="fg-p1"></div>
  <div class="field"><label>Confirmer</label><input class="inp" type="password" id="fg-p2"></div><div id="fg-err" class="info red" style="display:none"></div>
  <div class="foot"><button class="btn sec" data-act="fgSendCode" data-again="1">Renvoyer le code</button><button class="btn" data-act="fgValidate"><i data-lucide="check" class="i i-sm"></i>Valider</button></div>`,{pane:pid});
  if(step==='pres')return openModal(`<h2>Demander au président</h2><div class="muted mb">Le président reçoit ta demande dans l'application. Il réinitialise ton mot de passe et t'envoie un mot de passe provisoire sur WhatsApp.</div>
  <div class="field"><label>Ton numéro de téléphone ou ton e-mail</label><input class="inp" id="fg-id" placeholder="Téléphone ou e-mail" value="${esc(FG.id||'')}"></div><div id="fg-err" class="info red" style="display:none"></div>
  <div class="foot"><button class="btn sec" data-act="fgBack">Retour</button><button class="btn" data-act="fgPresSend"><i data-lucide="send" class="i i-sm"></i>Envoyer la demande</button></div>`,{pane:pid});
}
function fgErr(t){const e=document.getElementById('fg-err');if(e){e.style.display='block';e.textContent=t}}
function fgAction(a,p,d){
  switch(a){
    case'forgot':FG={pane:p.id};fgModal('choix');return true;
    case'fgBack':fgModal('choix');return true;
    case'fgMail':fgModal('mail');return true;
    case'fgPres':fgModal('pres');return true;
    case'fgSendCode':{if(!d.again){const v=(document.getElementById('fg-mail').value||'').trim().toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v))return fgErr('Entre une adresse e-mail valide.'),true;FG.mail=v}
      const m=DB.members.find(x=>x.email&&x.email.toLowerCase()===FG.mail&&x.actif);const ac=m&&acctOfMember(m.id);
      FG.code=ac&&ac.actif?String(Math.floor(100000+Math.random()*900000)):null;FG.essais=0;FG.demo=FG.code;FG.acct=ac&&ac.id;
      if(d.again)toast('Nouveau code envoyé.');fgModal('code');return true}
    case'fgValidate':{const c=document.getElementById('fg-code').value.trim(),p1=document.getElementById('fg-p1').value,p2=document.getElementById('fg-p2').value;
      if(!FG.code)return fgErr('Code incorrect ou expiré.'),true;
      if(++FG.essais>5){FG.code=null;return fgErr('Trop d\'essais. Demande un nouveau code.'),true}
      if(c!==FG.code)return fgErr(`Code incorrect (${5-FG.essais} essai${5-FG.essais>1?'s':''} restant${5-FG.essais>1?'s':''}).`),true;
      if(p1.length<6)return fgErr('6 caractères minimum.'),true;if(p1!==p2)return fgErr('Les deux mots de passe sont différents.'),true;
      const ac=DB.accounts.find(x=>x.id===FG.acct);ac.pwd=p1;ac.mustChange=false;log(fullName(member(ac.memberId)),'Mot de passe réinitialisé','Par code reçu par e-mail');persist();
      const pp=pane(FG.pane);closeModal();FG=null;toast('Mot de passe changé. Tu peux te connecter.');
      const m=member(ac.memberId);const i=document.getElementById('li-id-'+pp.id);if(i)i.value=m.email||m.tel;return true}
    case'fgPresSend':{const v=document.getElementById('fg-id').value.trim();if(!v)return fgErr('Entre ton numéro ou ton e-mail.'),true;FG.id=v;
      const ac=findLogin(v);const pr=presAcct();const pm=pr&&member(pr.memberId);
      if(ac){const m=member(ac.memberId);notify({acct:pr.id},'messages',`Mot de passe oublié : ${titleCase(fullName(m))}`,`Réinitialise son mot de passe : Jeunes → sa fiche → Réinitialiser, puis envoie-le-lui sur WhatsApp.`);
        log(titleCase(fullName(m)),'Demande de réinitialisation','Envoyée au président');persist()}
      const txt=`Bonjour Président, j'ai oublié mon mot de passe Younity. Mon identifiant : ${v}. Merci de le réinitialiser 🙏`;const n=pm?telN(pm.tel):'';
      openModal(`<h2>Demande envoyée ✅</h2><div class="muted mb">Si ce numéro ou cet e-mail correspond à un compte, le président a reçu ta demande dans l'application. Il t'enverra un mot de passe provisoire.</div>
      ${n?`<a class="btn ch-wa block" href="https://wa.me/225${n}?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener"><i data-lucide="message-circle" class="i i-sm"></i>Prévenir aussi le président sur WhatsApp</a>`:''}
      <div class="foot"><button class="btn" data-act="closeModal">Terminé</button></div>`,{pane:FG.pane});refresh();return true}
  }return false}
