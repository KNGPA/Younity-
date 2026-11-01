/* ================== PAIEMENT ESPÈCES PAR QR + CAPTURES (OCR) ================== */
(function(){const st=document.createElement('style');st.textContent=`
.qr-box{background:#fff;border:1px solid var(--line,#e3e8e5);border-radius:16px;padding:14px;display:flex;justify-content:center}
.qr-box svg{width:230px;height:230px;display:block}
.qr-code{font:800 22px/1 ui-monospace,Menlo,monospace;letter-spacing:.18em;text-align:center;margin-top:8px;color:var(--ink)}
.qr-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.qr-tile{border:1px solid #e3e8e5;background:#fff;border-radius:14px;padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;font:600 12.5px/1.2 inherit;color:var(--ink);cursor:pointer;position:relative;text-align:center}
.qr-tile .ic{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--green-soft);color:var(--green)}
.qr-tile.gold .ic{background:var(--gold-soft);color:#8a6110}
.qr-tile .bd{position:absolute;top:6px;right:6px;background:var(--red);color:#fff;border-radius:99px;font-size:11px;font-weight:800;padding:1px 7px}
.viewf{position:relative;background:#0d1512;border-radius:18px;aspect-ratio:1/1;max-width:320px;margin:0 auto;overflow:hidden;display:grid;place-items:center}
.viewf video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.viewf .sim{background:#fff;padding:10px;border-radius:10px;transform:rotate(-4deg) scale(.82);box-shadow:0 10px 30px rgba(0,0,0,.5);opacity:.92}
.viewf .sim svg{width:170px;height:170px;display:block}
.viewf .cr{position:absolute;width:44px;height:44px;border:4px solid #fff;border-radius:6px}
.viewf .cr.a{top:18px;left:18px;border-right:0;border-bottom:0}.viewf .cr.b{top:18px;right:18px;border-left:0;border-bottom:0}
.viewf .cr.c{bottom:18px;left:18px;border-right:0;border-top:0}.viewf .cr.d{bottom:18px;right:18px;border-left:0;border-top:0}
.viewf .laser{position:absolute;left:12%;right:12%;height:3px;background:#3ee08f;box-shadow:0 0 12px #3ee08f;animation:qlz 1.6s ease-in-out infinite alternate;top:15%}
@keyframes qlz{to{top:83%}}
.viewf .msg{position:absolute;bottom:10px;left:0;right:0;text-align:center;color:#cfe;font-size:12px}
.viewf.ok{outline:4px solid #3ee08f}
.cap-wrap{display:grid;grid-template-columns:1fr;gap:14px}
@media(min-width:700px){.modal.wide .cap-wrap{grid-template-columns:240px 1fr}}
.cap-img{width:100%;max-height:420px;object-fit:contain;border-radius:12px;background:#f3f5f4;border:1px solid #e3e8e5}
.cap-scan{position:relative;border-radius:12px;overflow:hidden}
.cap-scan:after{content:'';position:absolute;left:0;right:0;height:40px;background:linear-gradient(transparent,rgba(62,224,143,.55),transparent);animation:qsc 1.2s linear infinite;top:-40px}
@keyframes qsc{to{top:100%}}
.ocr-tag{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:#0e7a4c;background:#e3f6ec;border-radius:99px;padding:1px 7px;margin-left:6px}
.dem-row{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #eef1ef}
.dem-row:last-child{border-bottom:0}
.dem-th{width:46px;height:62px;border-radius:8px;object-fit:cover;background:#eef1ef;flex:none;border:1px solid #e3e8e5}
`;document.head.appendChild(st)})();

const QR_MIN=30;
function DM(){if(!DB.demandes)DB.demandes=[];const n=Date.now();DB.demandes.forEach(d=>{if(d.type==='qr'&&d.statut==='en_attente'&&new Date(d.expire).getTime()<n)d.statut='expiree'});return DB.demandes}
function dem(id){return DM().find(d=>d.id===+id)}
function qrSvg(txt){try{const q=qrcode(0,'M');q.addData(txt);q.make();return q.createSvgTag({cellSize:4,margin:2,scalable:true})}catch(e){return'<div class="muted">QR indisponible</div>'}}
function qrPayload(d){return `YOUNITY:PAY:${d.uuid||d.id}:${d.code}`}
function rndCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=A[Math.floor(Math.random()*A.length)];return s}
function isoIn(min){const d=new Date(Date.now()+min*60000);return d.toISOString()}
function hhmm(iso){const d=new Date(iso);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function refUsed(ref,exceptDem){if(!ref)return null;const R=ref.replace(/\s/g,'').toUpperCase();
  const pay=DB.payments.find(x=>!x.annule&&x.ref&&x.ref.replace(/\s/g,'').toUpperCase()===R);if(pay)return`déjà utilisée pour le paiement de ${titleCase(fullName(member(pay.memberId)))} du ${fdate(pay.date)}`;
  const d=DM().find(d=>d.id!==exceptDem&&d.statut==='en_attente'&&d.ocr&&d.ocr.ref&&d.ocr.ref.replace(/\s/g,'').toUpperCase()===R);if(d)return`déjà envoyée dans une autre capture (${titleCase(fullName(member(d.memberId)))})`;return null}
const OPS_CAP=['Wave','Orange Money','MTN MoMo','Moov Money','Dépôt bancaire'];

/* ---------- Côté membre ---------- */
function qrMember(p,cid,s){if(sRole(p).id!=='membre'&&!sMember(p))return'';const me=sMember(p);if(!me)return'';
  const mine=DM().filter(d=>d.memberId===me.id&&d.campagneId===cid&&(d.statut==='en_attente'||(d.statut==='rejetee'&&!d.vu))).sort((a,b)=>b.id-a.id);
  const list=mine.map(d=>d.statut==='rejetee'?`<div class="info red mb" style="font-size:12.5px"><b>Capture refusée</b> (${fmt(d.ocr?.montant||d.montant)}) : ${esc(d.motif||'')}<br><button class="link" data-act="demVu" data-id="${d.id}">OK, compris</button></div>`
    :d.type==='qr'?`<div class="list-item" data-act="qrShow" data-id="${d.id}" style="cursor:pointer"><div class="avatar sm" style="background:var(--gold-soft);color:#8a6110"><i data-lucide="qr-code" class="i i-sm"></i></div><div class="grow"><div class="name">QR espèces · ${fmt(d.montant)}</div><div class="muted">Valable jusqu'à ${hhmm(d.expire)} · en attente de scan</div></div><i data-lucide="chevron-right" class="i"></i></div>`
    :`<div class="list-item"><img class="dem-th" style="width:34px;height:46px" src="${d.img}"><div class="grow"><div class="name">Capture · ${fmt(d.ocr?.montant||0)}</div><div class="muted">${esc(d.ocr?.op||'')} · envoyée le ${fdt(d.cree)} · en cours de vérification</div></div><span class="chip part">En attente</span></div>`).join('');
  if(s.reste<=0&&!list)return'';
  if(!list)return'';
  return `<div class="card mb"><h3><i data-lucide="hourglass" class="i"></i>Mes paiements en attente</h3>${list}</div>`}
function payMethods(p,cid){const me=sMember(p);const c=camp(cid);const s=situation(cid,me.id);const mm=DB.settings.paiementIntegre&&Object.values(DB.settings.operateurs).some(Boolean);
  openModal(`<h2>Payer ma cotisation</h2><div class="muted mb">${esc(c.nom)} · reste ${fmt(s.reste)}${s.retard?` · <b style="color:var(--red)">${fmt(s.retard)} pour être à jour</b>`:''}</div>
  ${mm?`<button class="fg-opt" data-act="payInApp" data-c="${cid}" data-m="mm"><span class="fg-ic"><i data-lucide="smartphone" class="i"></i></span><span><b>Payer par Mobile Money</b><small>Orange Money, MTN, Moov, Wave : validé tout seul</small></span><i data-lucide="chevron-right" class="i"></i></button>`:''}
  <button class="fg-opt" data-act="qrNew" data-c="${cid}"><span class="fg-ic" style="background:var(--gold-soft);color:#8a6110"><i data-lucide="qr-code" class="i"></i></span><span><b>Payer en espèces (QR code)</b><small>Génère un QR, remets l'argent et fais-le scanner par la trésorière</small></span><i data-lucide="chevron-right" class="i"></i></button>
  <button class="fg-opt" data-act="capNew" data-c="${cid}"><span class="fg-ic"><i data-lucide="image-up" class="i"></i></span><span><b>Montrer une capture</b><small>Tu as déjà payé (Wave, Orange Money, banque…) : envoie la capture du reçu</small></span><i data-lucide="chevron-right" class="i"></i></button>
  <div class="foot"><button class="btn sec" data-act="closeModal">Fermer</button></div>`,{pane:p.id})}
function qrNew(p,cid){const me=sMember(p);const c=camp(cid);const s=situation(cid,me.id);const def=s.retard||Math.min(s.mensualite,s.reste);PAYCTX={cid,mid:me.id};
  openModal(`<h2>Payer en espèces</h2><div class="muted mb">${esc(c.nom)} · reste ${fmt(s.reste)}</div>
  <div class="field"><label>Montant que tu vas remettre (FCFA)</label><input class="inp big" id="pay-amt" inputmode="numeric" value="${def}"><div class="pills" style="margin-top:4px">${[...new Set([Math.min(s.mensualite,s.reste),s.retard,s.reste].filter(v=>v>0))].map(v=>`<button class="pill" data-act="payAmt" data-v="${v}">${fmtN(v)}${v===s.reste?' (tout)':v===s.retard?' (pour être à jour)':' (1 mois)'}</button>`).join('')}</div></div>
  <div class="receipt mb" id="pay-prev">${previewHtml(s,def)}</div>
  <div class="info gold" style="font-size:12.5px">Le QR est valable <b>${QR_MIN} minutes</b> et ne sert qu'une seule fois. Rien n'est payé tant que la trésorière (ou le Président) ne l'a pas scanné.</div>
  <div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button><button class="btn gold" data-act="qrGen" data-c="${cid}"><i data-lucide="qr-code" class="i i-sm"></i>Générer le QR</button></div>`,{pane:p.id});}
function qrShow(p,id){const d=dem(id);if(!d)return;const c=camp(d.campagneId),m=member(d.memberId);
  if(d.statut==='validee'){openModal(`<div style="text-align:center"><div class="avatar" style="margin:0 auto 10px;width:52px;height:52px"><i data-lucide="check" class="i"></i></div><h2>Paiement validé</h2><div class="muted">${fmt(d.montant)} · ${esc(c.nom)}<br>Validé par ${esc(d.valideePar)}</div></div><div class="foot"><button class="btn" data-act="closeModal">OK</button></div>`,{pane:p.id});return}
  if(d.statut!=='en_attente'){openModal(`<h2>QR expiré</h2><div class="muted">Ce QR n'est plus valable. Génère-en un nouveau au moment de payer.</div><div class="foot"><button class="btn" data-act="closeModal">OK</button></div>`,{pane:p.id});return}
  openModal(`<div style="text-align:center"><h2 style="margin-bottom:2px">Montre ce QR à la trésorière</h2><div class="muted mb">Remets l'argent, elle scanne, c'est validé.</div></div>
  <div class="qr-box" data-qrid="${d.id}">${qrSvg(qrPayload(d))}</div>
  <div class="qr-code">${d.code.slice(0,3)}-${d.code.slice(3)}</div><div class="muted" style="text-align:center;font-size:11.5px">Code à saisir si la caméra ne marche pas</div>
  <div class="receipt mt"><div class="rl"><span class="muted">Jeune</span><b>${esc(titleCase(fullName(m)))}</b></div><div class="rl"><span class="muted">Cotisation</span><b>${esc(c.nom)}</b></div><div class="rl"><span class="muted">Montant en espèces</span><b style="font-size:17px">${fmt(d.montant)}</b></div><div class="rl"><span class="muted">Valable encore</span><b id="qr-cd">—</b></div></div>
  <div class="foot"><button class="btn danger" data-act="qrCancel" data-id="${d.id}">Annuler ce QR</button><button class="btn sec" data-act="closeModal">Fermer</button></div>`,{pane:p.id});
  const tick=()=>{const el=document.getElementById('qr-cd');if(!el)return clearInterval(iv);const left=new Date(d.expire).getTime()-Date.now();if(d.statut==='validee'){clearInterval(iv);qrShow(p,id);return}if(left<=0){clearInterval(iv);el.textContent='expiré';el.style.color='var(--red)';return}el.textContent=`${Math.floor(left/60000)} min ${String(Math.floor(left/1000)%60).padStart(2,'0')} s`};const iv=setInterval(tick,1000);tick()}

/* ---------- Côté trésorière / Président ---------- */
function qrBar(p){if(!can(p,'paiements_valider'))return'';const D=DM();const nq=D.filter(d=>d.type==='qr'&&d.statut==='en_attente').length,nc=D.filter(d=>d.type==='capture'&&d.statut==='en_attente').length;
  return `<div class="qr-tiles mb"><button class="qr-tile" data-act="qScan"><span class="ic"><i data-lucide="scan-line" class="i"></i></span>Scanner un QR<small class="muted" style="font-weight:500">espèces</small>${nq?`<span class="bd">${nq}</span>`:''}</button>
  <button class="qr-tile gold" data-act="capList"><span class="ic"><i data-lucide="images" class="i"></i></span>Captures à vérifier${nc?`<span class="bd">${nc}</span>`:''}</button>
  <button class="qr-tile" data-act="capImport"><span class="ic"><i data-lucide="image-plus" class="i"></i></span>Importer une capture</button></div>`}
let QS=null;
function qStop(){if(QS&&QS.stream){QS.stream.getTracks().forEach(t=>t.stop())}if(QS){clearTimeout(QS.t);clearInterval(QS.iv)}QS=null}
function qScan(p,pick){qStop();const P=DM().filter(d=>d.type==='qr'&&d.statut==='en_attente').sort((a,b)=>a.id-b.id);const d=pick?dem(pick):P[0];
  openModal(`<h2>Scanner le QR du jeune</h2><div class="muted mb">Vise le QR affiché sur son téléphone, puis compte l'argent reçu.</div>
  <div class="viewf" id="viewf"><span class="cr a"></span><span class="cr b"></span><span class="cr c"></span><span class="cr d"></span>${d?`<div class="sim">${qrSvg(qrPayload(d))}</div>`:''}<div class="laser"></div><div class="msg">${d?'Recherche du QR…':'Aucun QR devant la caméra'}</div></div>
  <div class="info gold mt" style="font-size:12px"><b>Prototype :</b> la caméra est simulée et « voit » le QR d'un jeune qui en a généré un. ${P.length?'':'Génère d\'abord un QR depuis un compte membre (bouton « Espèces (QR) »).'}</div>
  ${P.length>1?`<div class="field mt"><label>Plusieurs QR en attente : qui est devant toi ?</label>${P.map(x=>`<button class="prof" data-act="${window.REEL?'qPick':'qScan'}" data-id="${x.id}"><div class="grow"><div class="name">${esc(titleCase(fullName(member(x.memberId))))}</div><div class="muted">${fmt(x.montant)} · ${esc(camp(x.campagneId).nom)}</div></div><i data-lucide="chevron-right" class="i"></i></button>`).join('')}</div>`:''}
  <div class="field mt"><label>Ou saisir le code affiché sous le QR</label><div class="row" style="gap:8px"><input class="inp" id="q-code" placeholder="ABC-123" maxlength="7" style="text-transform:uppercase;letter-spacing:.12em;font-weight:700"><button class="btn sec" data-act="qCode">OK</button></div></div>
  <div class="foot">${window.REEL?'':'<button class="btn sec" data-act="qReal"><i data-lucide="camera" class="i i-sm"></i>Vraie caméra</button>'}<button class="btn sec" data-act="qClose">Fermer</button></div>`,{pane:p.id});
  QS={p:p.id};if(window.REEL){const v=document.getElementById('viewf');v.querySelector('.sim')?.remove();v.querySelector('.msg').textContent='Ouverture de la caméra…';const inf=v.parentNode.querySelector('.info.gold');if(inf)inf.remove();qReal(p);return}if(d){QS.t=setTimeout(()=>{const v=document.getElementById('viewf');if(!v||!QS)return;v.classList.add('ok');v.querySelector('.msg').textContent='QR détecté ✓';setTimeout(()=>{if(document.getElementById('viewf'))qScanned(p,qrPayload(d))},550)},1700)}}
async function qReal(p){if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('Caméra indisponible sur cet appareil : saisis le code affiché sous le QR.');return}
  try{clearTimeout(QS&&QS.t);const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});const v=document.getElementById('viewf');if(!v){stream.getTracks().forEach(t=>t.stop());return}
    v.querySelector('.sim')?.remove();const vid=document.createElement('video');vid.playsInline=true;vid.muted=true;vid.setAttribute('playsinline','');vid.srcObject=stream;v.prepend(vid);await vid.play();v.querySelector('.msg').textContent='Vise le QR du jeune';
    const bd=('BarcodeDetector'in window)?new BarcodeDetector({formats:['qr_code']}):null;const cv=document.createElement('canvas');const g=cv.getContext('2d',{willReadFrequently:true});
    QS={p:p.id,stream};QS.iv=setInterval(async()=>{if(!document.getElementById('viewf')){qStop();return}if(!vid.videoWidth)return;
      try{let raw=null;if(bd){const r=await bd.detect(vid);raw=r[0]&&r[0].rawValue}
        else if(window.jsQR){const w=Math.min(640,vid.videoWidth),h=Math.round(vid.videoHeight*w/vid.videoWidth);cv.width=w;cv.height=h;g.drawImage(vid,0,0,w,h);const c=jsQR(g.getImageData(0,0,w,h).data,w,h,{inversionAttempts:'dontInvert'});raw=c&&c.data}
        if(raw){v.classList.add('ok');qStop();qScanned(p,raw)}}catch(e){}},300)}
  catch(e){toast('Autorise la caméra pour scanner (Réglages > Applications > Younity > Autorisations), ou saisis le code.')}}
function qScanned(p,raw){qStop();const mm=/^YOUNITY:PAY:([0-9a-f-]+):([A-Z0-9]{6})$/i.exec((raw||'').trim());
  const err=(t,s)=>openModal(`<div style="text-align:center"><div class="avatar" style="margin:0 auto 10px;width:52px;height:52px;background:var(--red-soft);color:var(--red)"><i data-lucide="x" class="i"></i></div><h2>${t}</h2><div class="muted">${s}</div></div><div class="foot"><button class="btn sec" data-act="closeModal">Fermer</button><button class="btn" data-act="qScan">Scanner un autre</button></div>`,{pane:p.id});
  if(!mm)return err('QR non reconnu','Ce QR ne vient pas de Younity.');const d=DM().find(x=>String(x.uuid||x.id)===mm[1]);
  if(!d||d.code!==mm[2])return err('QR non reconnu','Ce QR ne correspond à aucune demande de paiement.');
  if(d.statut==='validee')return err('QR déjà utilisé',`Ce paiement a déjà été validé par ${esc(d.valideePar)}.`);
  if(d.statut!=='en_attente')return err('QR expiré','Demande au jeune de générer un nouveau QR.');
  const m=member(d.memberId),c=camp(d.campagneId),s=situation(c.id,m.id);
  openModal(`<div class="row" style="gap:12px"><div class="avatar">${initials(m.nom)}</div><div style="flex:1;min-width:0"><h2 style="margin:0">${esc(titleCase(fullName(m)))}</h2><div class="muted">${esc(c.nom)} · Mois ${s.cur}/${c.nbMois}</div></div>${statutChip(s.statut)}</div>
  <div style="text-align:center;margin:16px 0 6px"><div class="muted">Montant à recevoir en espèces</div><div style="font-size:30px;font-weight:800;color:var(--green)">${fmt(d.montant)}</div></div>
  <div class="receipt mb">${previewHtml(s,d.montant)}</div>
  ${sRole(p).id==='president'?`<div class="info gold mb" style="font-size:12.5px">Tu valides en tant que <b>Président</b> : la trésorière sera prévenue et le paiement portera la mention « Validé par le Président ».</div>`:''}
  <div class="foot"><button class="btn sec" data-act="qClose">Annuler</button><button class="btn" data-act="qOk" data-id="${d.id}"><i data-lucide="check-circle-2" class="i i-sm"></i>J'ai reçu l'argent — Valider</button></div>`,{pane:p.id})}
function qFinish(p,d,v){/* v={montant,moyen,ref,date} → crée le paiement via le circuit normal */
  p.pay={cid:d.campagneId,mid:d.memberId,montant:String(v.montant),date:v.date||today(),moyen:v.moyen,ref:v.ref||''};
  const n0=DB.payments.length;submitPay(p);const x=DB.payments[DB.payments.length-1];if(DB.payments.length===n0)return false;
  x.source=d.type==='qr'?'qr':'capture';x.demandeId=d.id;Object.assign(d,{statut:'validee',valideePar:sessName(p),valideeLe:nowIso(),paymentId:x.id});
  if(sRole(p).id==='president')notify({perm:'paiements_valider'},'paiements',`Le Président a validé un paiement ${d.type==='qr'?'en espèces':'(capture)'}`,`${titleCase(fullName(member(d.memberId)))} · ${fmt(x.montant)} · ${camp(d.campagneId).nom}`,sAcct(p).id);
  persist();refresh();return true}

/* ---------- Captures ---------- */
let CAP=null;
function capPick(p,mode,cid,mid){CAP={pane:p.id,mode,cid,mid,img:null,ocr:null,op:'Wave'};capStep()}
function capStep(){const p=pane(CAP.pane);const tres=CAP.mode==='tresoriere';
  let who='';if(tres){const camps=enCours();if(!CAP.cid||!camp(CAP.cid))CAP.cid=camps[0]&&camps[0].id;const c=camp(CAP.cid);const L=c?c.lignes.map(l=>member(l.memberId)).filter(Boolean).sort((a,b)=>a.nom.localeCompare(b.nom)):[];
    who=`<div class="field"><label>Campagne</label><select class="inp" id="ci-camp">${camps.map(x=>`<option value="${x.id}" ${x.id===CAP.cid?'selected':''}>${esc(x.nom)}</option>`).join('')}</select></div>
    <div class="field"><label>De quel jeune vient la capture ?</label><select class="inp" id="ci-mem"><option value="">— Choisir —</option>${L.map(m=>`<option value="${m.id}" ${m.id===CAP.mid?'selected':''}>${esc(fullName(m))}</option>`).join('')}</select></div>`}
  openModal(`<h2>${tres?'Importer une capture':'Envoyer une capture de paiement'}</h2><div class="muted mb">${tres?'Une capture reçue sur WhatsApp ? Ajoute-la ici : l\'app lit les informations pour toi.':'Tu as payé par Wave, Orange Money, MTN, Moov ou à la banque ? Envoie la capture du reçu.'}</div>${who}
  <div class="field"><label>Opérateur</label><div class="pills">${OPS_CAP.map(o=>`<button class="pill ${CAP.op===o?'on':''}" data-act="capOp" data-v="${o}">${o}</button>`).join('')}</div></div>
  <label class="btn block" style="cursor:pointer"><i data-lucide="image-up" class="i"></i>Choisir la capture dans la galerie<input type="file" accept="image/*" id="cap-file" style="display:none"></label>
  ${window.REEL?'':`<button class="btn sec block mt" data-act="capSample"><i data-lucide="sparkles" class="i"></i>Utiliser une capture d'exemple</button>`}
  <div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button></div>`,{pane:p.id})}
function capWho(){if(CAP.mode!=='tresoriere')return true;const e=document.getElementById('ci-mem');CAP.mid=e&&+e.value||CAP.mid;if(!CAP.mid){toast('Choisis d\'abord le jeune concerné.');return false}return true}
function sampleCapture(op,montant){const cv=document.createElement('canvas');cv.width=540;cv.height=900;const g=cv.getContext('2d');
  const col={'Wave':'#1dc3ff','Orange Money':'#ff7900','MTN MoMo':'#ffcb05','Moov Money':'#0060a9','Dépôt bancaire':'#135C2E'}[op]||'#135C2E';
  g.fillStyle='#f4f6f8';g.fillRect(0,0,540,900);g.fillStyle=col;g.fillRect(0,0,540,170);g.fillStyle=op==='MTN MoMo'?'#111':'#fff';g.font='bold 34px sans-serif';g.textAlign='center';g.fillText(op,270,95);g.font='20px sans-serif';g.fillText('Reçu de transaction',270,132);
  g.fillStyle='#fff';g.beginPath();g.roundRect(30,200,480,640,22);g.fill();g.fillStyle='#1ea763';g.beginPath();g.arc(270,270,40,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=8;g.beginPath();g.moveTo(250,272);g.lineTo(265,288);g.lineTo(292,256);g.stroke();
  const d=new Date();const ds=`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const pre={'Wave':'T_','Orange Money':'MP','MTN MoMo':'','Moov Money':'MV','Dépôt bancaire':'VIR'}[op];const ref=pre+(op==='Orange Money'?`${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.${rndCode().slice(0,1)}${Math.floor(10000+Math.random()*89999)}`:rndCode()+Math.floor(1000+Math.random()*8999));
  g.fillStyle='#111';g.font='bold 24px sans-serif';g.fillText('Transfert réussi',270,350);g.font='bold 52px sans-serif';g.fillText(`-${fmtN(montant)} F`,270,425);
  g.textAlign='left';g.font='19px sans-serif';const rows=[['À','Trésorerie Jeunesse Harvest'],['Numéro','07 59 23 59 84'],['Montant',`${fmtN(montant)} FCFA`],['Frais','0 FCFA'],['Date',ds],['Référence',ref],['Statut','Effectué']];
  rows.forEach(([k,v],i)=>{const y=490+i*46;g.fillStyle='#7a8580';g.fillText(k,60,y);g.fillStyle='#111';g.textAlign='right';g.font='bold 19px sans-serif';g.fillText(v,480,y);g.textAlign='left';g.font='19px sans-serif';g.fillStyle='#eceff1';g.fillRect(60,y+16,420,2)});
  return{img:cv.toDataURL('image/jpeg',.8),vals:{montant,ref,date:today(),op}}}
function shrink(file,cb){const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,1000/Math.max(im.width,im.height));const cv=document.createElement('canvas');cv.width=im.width*k;cv.height=im.height*k;cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);cb(cv.toDataURL('image/jpeg',.72))};im.src=r.result};r.readAsDataURL(file)}
function capOcr(img,vals){const p=pane(CAP.pane);CAP.img=img;
  openModal(`<h2>Lecture de la capture…</h2><div class="muted mb">L'app repère le montant, la référence, la date et l'opérateur. Ça peut prendre quelques secondes la première fois.</div><div class="cap-scan"><img class="cap-img" src="${img}"></div>`,{pane:p.id});
  if(vals){setTimeout(()=>{if(!CAP)return;CAP.ocr={...vals,lu:true};capReview(p,null)},1600);return}
  const fb=()=>{if(!CAP)return;CAP.ocr={montant:'',ref:'',date:today(),op:CAP.op,lu:false};capReview(p,null)};
  runOcr(img).then(txt=>{if(!CAP||CAP.img!==img)return;const o=parseOcr(txt);if(!o.montant&&!o.ref)return fb();CAP.ocr={montant:o.montant||'',ref:o.ref||'',date:o.date||today(),op:o.op||CAP.op,lu:true};capReview(p,null)}).catch(fb)}
let TESS=null;
function loadTess(){if(TESS)return TESS;TESS=new Promise((ok,ko)=>{if(window.Tesseract)return ok(window.Tesseract);const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';sc.onload=()=>ok(window.Tesseract);sc.onerror=()=>{TESS=null;ko()};document.head.appendChild(sc)});return TESS}
function runOcr(img){return Promise.race([loadTess().then(T=>T.recognize(img,'fra')).then(r=>r.data.text),new Promise((_,ko)=>setTimeout(ko,45000))])}
function parseOcr(t){const T=(t||'').replace(/\r/g,'');const L=T.split('\n').map(x=>x.trim()).filter(Boolean);const o={};
  const num=v=>+String(v).replace(/[^0-9]/g,'');const amtRe=/(\d{1,3}(?:[ .,\u202f\u00a0]\d{3})+|\d{3,7})\s*(?:F\s?CFA|FCFA|XOF|F\b|francs)/i;
  const ml=L.find(l=>/montant|amount|somme/i.test(l)&&amtRe.test(l))||L.find(l=>amtRe.test(l)&&!/frais|solde|balance/i.test(l));if(ml)o.montant=num(amtRe.exec(ml)[1]);
  if(!o.montant){const ln=L.find(l=>/montant/i.test(l));const m=ln&&/(\d[\d .]{2,})/.exec(ln);if(m)o.montant=num(m[1])}
  const rl=L.find(l=>/r[ée]f|transaction|id\b|n°/i.test(l));const rm=rl&&/([A-Z0-9][A-Z0-9._\-]{5,})\s*$/i.exec(rl.replace(/^.*?(?:r[ée]f[ée]rence|r[ée]f|transaction id|id de transaction|transaction|id|n°)\s*[:#]?\s*/i,''));
  o.ref=rm?rm[1]:((/\b(MP\d{6}\.\d{4}\.[A-Z0-9]+|T_[A-Z0-9]{6,}|[A-Z]{2,}\d{6,}[A-Z0-9]*)\b/.exec(T)||[])[1]||'');
  const dm=/(\d{2})[\/.\-](\d{2})[\/.\-](\d{4}|\d{2})/.exec(T);if(dm){const y=dm[3].length===2?'20'+dm[3]:dm[3];o.date=`${y}-${dm[2]}-${dm[1]}`}
  o.op=/wave/i.test(T)?'Wave':/orange/i.test(T)?'Orange Money':/mtn|momo/i.test(T)?'MTN MoMo':/moov|flooz/i.test(T)?'Moov Money':/banque|virement|bank|ecobank|sgbci|nsia|bicici/i.test(T)?'Dépôt bancaire':null;return o}
function capReview(p,demId){const d=demId?dem(demId):null;const o=d?d.ocr:CAP.ocr;const mid=d?d.memberId:CAP.mid,cid=d?d.campagneId:CAP.cid;const img=d?d.img:CAP.img;
  const m=member(mid),c=camp(cid),s=situation(cid,mid);const validator=can(p,'paiements_valider');const dup=refUsed(o.ref,d&&d.id);
  const tag=o.lu?'<span class="ocr-tag"><i data-lucide="scan-text" style="width:11px;height:11px"></i>lu</span>':'';
  PAYCTX={cid,mid};
  openModal(`<h2>${d?'Vérifier la capture':validator?'Vérifie et valide':'Vérifie avant d\'envoyer'}</h2>
  <div class="muted mb">${esc(titleCase(fullName(m)))} · ${esc(c.nom)}${d?` · envoyée le ${fdt(d.cree)}${d.source==='tresoriere'?'':' par le jeune'}`:''}</div>
  <div class="cap-wrap"><div><img class="cap-img" src="${img}"></div><div>
  ${o.lu?`<div class="info mb" style="font-size:12px">Informations lues automatiquement sur la capture : <b>vérifie-les</b> avant de continuer.</div>`:`<div class="info gold mb" style="font-size:12px">La capture n'a pas pu être lue (image floue ou format inconnu). Complète les champs à la main.</div>`}
  <div class="field"><label>Opérateur ${tag}</label><div class="pills" id="cr-ops">${OPS_CAP.map(x=>`<button class="pill ${o.op===x?'on':''}" data-act="crOp" data-v="${x}">${x}</button>`).join('')}</div></div>
  <div class="field"><label>Montant (FCFA) ${tag}</label><input class="inp big" id="pay-amt" inputmode="numeric" value="${o.montant||''}"></div>
  <div class="field"><label>Référence de la transaction ${tag}</label><input class="inp" id="cr-ref" value="${esc(o.ref||'')}" placeholder="Ex. MP261031.1542.C80214"></div>
  <div id="cr-dup" class="info red mb" style="font-size:12.5px;${dup?'':'display:none'}">Attention : cette référence est ${esc(dup||'')}.</div>
  <div class="field"><label>Date du paiement ${tag}</label><input type="date" class="inp" id="cr-date" value="${esc(o.date||today())}"></div>
  ${validator?`<div class="receipt mb" id="pay-prev">${previewHtml(s,+o.montant||0)}</div>`:''}
  ${validator&&sRole(p).id==='president'?`<div class="info gold mb" style="font-size:12.5px">Validé par le <b>Président</b> : la trésorière sera prévenue.</div>`:''}
  </div></div>
  <div class="foot">${d&&validator?`<button class="btn danger" style="margin-right:auto" data-act="capReject" data-id="${d.id}">Refuser</button>`:''}<button class="btn sec" data-act="closeModal">${d?'Plus tard':'Annuler'}</button>
  ${validator?`<button class="btn" data-act="capValidate" data-id="${d?d.id:''}"><i data-lucide="check-circle-2" class="i i-sm"></i>Valider le paiement</button>`:`<button class="btn gold" data-act="capSend"><i data-lucide="send" class="i i-sm"></i>Envoyer à la trésorière</button>`}</div>`,{pane:p.id},true)}
function crVals(){const op=document.querySelector('#cr-ops .pill.on')?.dataset.v;return{op,montant:+digits(document.getElementById('pay-amt').value),ref:document.getElementById('cr-ref').value.trim(),date:document.getElementById('cr-date').value}}
function capList(p){const L=DM().filter(d=>d.type==='capture'&&d.statut==='en_attente').sort((a,b)=>a.id-b.id);
  const done=DM().filter(d=>d.type==='capture'&&d.statut!=='en_attente').sort((a,b)=>b.id-a.id).slice(0,5);
  openModal(`<h2>Captures à vérifier</h2><div class="muted mb">Envoyées par les jeunes. Ouvre-en une pour vérifier ce que l'app a lu, puis valide ou refuse.</div>
  <div class="card" style="padding:2px 14px">${L.map(d=>{const m=member(d.memberId);return`<div class="dem-row" data-act="capOpen" data-id="${d.id}" style="cursor:pointer"><img class="dem-th" src="${d.img}"><div class="grow"><div class="name">${esc(titleCase(fullName(m)))}</div><div class="muted">${fmt(d.ocr.montant||0)} · ${esc(d.ocr.op)} · ${esc(camp(d.campagneId).nom)}</div><div class="muted" style="font-size:11px">Reçue le ${fdt(d.cree)}</div></div><i data-lucide="chevron-right" class="i"></i></div>`}).join('')||'<div class="empty" style="padding:14px">Aucune capture en attente.</div>'}</div>
  ${done.length?`<div class="name mt mb" style="font-size:13px">Dernières traitées</div><div class="card" style="padding:2px 14px">${done.map(d=>`<div class="dem-row"><img class="dem-th" style="width:30px;height:40px" src="${d.img}"><div class="grow"><div class="name" style="font-size:13px">${esc(titleCase(fullName(member(d.memberId))))} · ${fmt(d.ocr.montant||0)}</div><div class="muted" style="font-size:11.5px">${d.statut==='validee'?`Validée par ${esc(d.valideePar)}`:`Refusée : ${esc(d.motif||'')}`}</div></div>${d.statut==='validee'?'<span class="chip ok">Validée</span>':'<span class="chip late">Refusée</span>'}</div>`).join('')}</div>`:''}
  <div class="foot"><button class="btn sec" data-act="closeModal">Fermer</button></div>`,{pane:p.id})}
function qrChips(x,p){let h='';if(x.source==='qr')h+='<span class="chip gold" style="font-size:10px;padding:1px 6px">QR espèces</span> ';if(x.source==='capture')h+='<span class="chip mut" style="font-size:10px;padding:1px 6px">Capture</span> ';
  if(/\(Président\)/.test(x.saisiPar||'')&&p&&sRole(p).id!=='president'&&sRole(p).id!=='membre')h+='<span class="chip ok" style="font-size:10px;padding:1px 6px">Validé par le Président</span> ';return h}

document.addEventListener('change',e=>{const t=e.target;
  if(t.id==='cap-file'&&t.files[0]&&CAP){if(!capWho())return;shrink(t.files[0],img=>capOcr(img,null))}
  if(t.id==='ci-camp'&&CAP){CAP.cid=+t.value;CAP.mid=null;capStep()}
  if(t.id==='ci-mem'&&CAP){CAP.mid=+t.value||null}});
document.addEventListener('input',e=>{if(e.target.id==='cr-ref'){const el=document.getElementById('cr-dup');const u=refUsed(e.target.value.trim(),null);if(el){el.style.display=u?'':'none';el.textContent=u?`Attention : cette référence est ${u}.`:''}}});

function qAction(a,p,d,el){switch(a){
  case'qrNew':qrNew(p,+d.c);return true;
  case'qrGen':{const me=sMember(p);const amt=+digits(document.getElementById('pay-amt').value);if(!amt){toast('Indique le montant.');return true}
    DM().filter(x=>x.type==='qr'&&x.statut==='en_attente'&&x.memberId===me.id).forEach(x=>x.statut='expiree');
    const x={id:DB.seq++,type:'qr',memberId:me.id,campagneId:+d.c,montant:amt,code:rndCode(),statut:'en_attente',cree:nowIso(),expire:isoIn(QR_MIN)};DM().push(x);persist();refresh();qrShow(p,x.id);return true}
  case'qrShow':qrShow(p,+d.id);return true;
  case'qrCancel':{const x=dem(+d.id);if(x&&x.statut==='en_attente')x.statut='annulee';persist();closeModal();refresh();toast('QR annulé.');return true}
  case'demVu':{const x=dem(+d.id);if(x)x.vu=true;persist();refresh();return true}
  case'qScan':qScan(p,d.id?+d.id:null);return true;
  case'qPick':{const x=dem(+d.id);if(x)qScanned(p,qrPayload(x));return true}
  case'qClose':qStop();closeModal();return true;
  case'qReal':qReal(p);return true;
  case'qCode':{const c=(document.getElementById('q-code').value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');const x=DM().find(y=>y.type==='qr'&&y.code===c);qScanned(p,x?qrPayload(x):'YOUNITY:PAY:0:'+c.padEnd(6,'0').slice(0,6));return true}
  case'qOk':{const x=dem(+d.id);if(!x||x.statut!=='en_attente'){toast('Ce QR n\'est plus valable.');return true}qFinish(p,x,{montant:x.montant,moyen:'Espèces',date:today()});return true}
  case'capNew':capPick(p,'membre',+d.c,sMember(p).id);return true;
  case'capImport':capPick(p,'tresoriere',null,null);return true;
  case'capOp':CAP.op=d.v;document.querySelectorAll('[data-act="capOp"]').forEach(b=>b.classList.toggle('on',b.dataset.v===d.v));return true;
  case'crOp':document.querySelectorAll('#cr-ops .pill').forEach(b=>b.classList.toggle('on',b.dataset.v===d.v));return true;
  case'capSample':{if(!capWho())return true;const s=situation(CAP.cid,CAP.mid);const r=sampleCapture(CAP.op,s.retard||Math.min(s.mensualite,s.reste)||s.mensualite);capOcr(r.img,r.vals);return true}
  case'capSend':{const v=crVals();if(!v.montant){toast('Indique le montant payé.');return true}if(v.ref&&refUsed(v.ref,null)){toast('Cette référence a déjà été utilisée.');return true}
    const x={id:DB.seq++,type:'capture',source:'membre',memberId:CAP.mid,campagneId:CAP.cid,montant:v.montant,img:CAP.img,ocr:{...v,lu:CAP.ocr.lu},statut:'en_attente',cree:nowIso()};DM().push(x);
    notify({perm:'paiements_valider'},'paiements',`Capture de paiement à vérifier`,`${titleCase(fullName(member(x.memberId)))} · ${fmt(v.montant)} (${v.op}) · ${camp(x.campagneId).nom}`,sAcct(p).id);
    CAP=null;persist();closeModal();refresh();toast('Capture envoyée. Tu seras prévenu dès qu\'elle est validée.');return true}
  case'capList':capList(p);return true;
  case'capOpen':capReview(p,+d.id);return true;
  case'capValidate':{const v=crVals();if(!v.montant){toast('Indique le montant.');return true}const exc=d.id?+d.id:null;if(v.ref&&refUsed(v.ref,exc)){toast('Référence déjà utilisée : vérifie qu\'il ne s\'agit pas d\'un doublon.');return true}
    let x=exc?dem(exc):null;if(!x){x={id:DB.seq++,type:'capture',source:'tresoriere',memberId:CAP.mid,campagneId:CAP.cid,montant:v.montant,img:CAP.img,ocr:{...v,lu:CAP.ocr.lu},statut:'en_attente',cree:nowIso()};DM().push(x)}else x.ocr={...x.ocr,...v};
    CAP=null;qFinish(p,x,{montant:v.montant,moyen:v.op==='Dépôt bancaire'?'Dépôt bancaire':v.op,ref:v.ref,date:v.date});return true}
  case'capReject':{openModal(`<h2>Refuser cette capture ?</h2><div class="muted mb">Le jeune sera prévenu avec le motif.</div><div class="field"><label>Motif</label><div class="pills mb">${['Capture illisible','Montant non reçu','Référence déjà utilisée','Mauvais destinataire'].map(m=>`<button class="pill" data-act="rjPick" data-v="${m}">${m}</button>`).join('')}</div><input class="inp" id="rj-motif" placeholder="Ou écris le motif"></div><div class="foot"><button class="btn sec" data-act="capOpen" data-id="${d.id}">Retour</button><button class="btn danger" data-act="capRejectOk" data-id="${d.id}">Refuser</button></div>`,{pane:p.id});return true}
  case'rjPick':document.getElementById('rj-motif').value=d.v;return true;
  case'capRejectOk':{const motif=document.getElementById('rj-motif').value.trim();if(!motif){toast('Indique le motif.');return true}const x=dem(+d.id);Object.assign(x,{statut:'rejetee',motif,valideePar:sessName(p),valideeLe:nowIso()});
    log(sessName(p),'Capture refusée',`${fullName(member(x.memberId))} — ${fmt(x.ocr.montant||0)} · motif : ${motif}`);notify({mid:x.memberId},'paiements','Capture de paiement refusée',`${fmt(x.ocr.montant||0)} · ${motif}`,sAcct(p).id);
    persist();refresh();capList(p);toast('Capture refusée, le jeune est prévenu.');return true}
}return false}
