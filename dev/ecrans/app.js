/* ================== DONNÉES ================== */
const KEY='cotis-jeunesse-proto-v17';
const MOYENS=['Orange Money','MTN MoMo','Moov Money','Wave','Espèces'];
const PERMS=[
 ['membres_voir','Voir le registre des jeunes'],
 ['membres_gerer','Ajouter, modifier, importer des jeunes'],
 ['campagnes_voir','Voir les campagnes et qui a payé'],
 ['campagnes_lancer','Lancer et modifier les campagnes'],
 ['paiements_valider','Valider et annuler les paiements'],
 ['relances','Relancer les membres'],
 ['journal','Consulter le journal des opérations'],
 ['exports','Exporter en Excel'],
 ['acces_gerer','Attribuer les rôles et les accès'],
 ['parametres','Modifier les paramètres'],
 ['affiches_gerer','Publier les bannières de l\'accueil'],
 ['evenements_gerer','Créer et organiser les événements'],
 ['suivi_taches','Noter les décisions et tâches, faire les rappels']];
const FILE_ROWS=[
["TIE BI CHRISTIAN","07 8788 1680",40000],["OUAKA K. JULIEN","07 5890 3812",40000],["ZORO ANNE MARIE","07 696730 59",25000],
["GBEGONE BI DIEUDONNE","07 4506 9827",30000],["DJE LOU MARIE PAULE","07 8720 9381",20000],["TIA BOUE ARIEL","07 98061335",15000],
["OCHOU GUY ARMAND","07 4795 3288",40000],["ROBERTINE YOUAN","07 6967 3059",35000],["N'DRI SARA","07 58950896",35000],
["IRIE LOU MARTINE","05 04366473",15000],["KOFFI FLORE AMOIN","01 5245 2595",25000],["KOUADIO OLIVIA","07 8902 8085",15000],
["KOUAME. F. EDDY","07 8908 6310",20000],["KOFFI DANIELLA ROXANE","01 0187 1318",20000],["TIEU LOU DÉBORAH","07 1158 0568",20000],
["OLIVE BOSSI","",15000],["SERGE","",10000],["MONDESIR BAFFO","",20000],["BIENVENUE","",10000],
["PAUL-ANDRE KOFFI (Président)","07 5923 5984",150000],["KIPRE RUFINE (Conseillère à l'Organisation)","07 7967 1325",85000],
["KOFFI DANIELLE (Trésorière)","07 4901 2616",80000],["NENE LOU MARIE MICHELLE (Secrétaire Générale)","01 0199 6744",55000],
["YASSI JUNIOR (Resp. à la Mobilisation)","07 6862 2236",35000],["MELI SONIA (Resp. Théâtre)","07 4997 1704",25000]];
const PATTERN=[3,3,2,3,1,0,3,2,3,2,3,3,1,2,3,0,2,3,1,3,2,3,3,2,4];
const DEMO_PROF=['Étudiant(e)','Commerçant(e)','Enseignant(e)','Infirmier(ère)','Informaticien(ne)','Comptable','Couturier(ère)','Élève','Chauffeur','Graphiste','Électricien','Coiffeur(se)'];
const DEMO_HAB=['Yopougon','Cocody','Abobo','Marcory','Koumassi','Treichville','Bingerville','Port-Bouët','Adjamé','Anyama'];
const DEPS=['Jeunesse'];

function splitFonction(s){const m=String(s).match(/^(.*?)\s*\((.+)\)\s*$/);return m?[m[1].trim(),m[2].trim()]:[String(s).trim(),'Membre']}
function genPwd(){const c='abcdefghjkmnpqrstuvwxyz23456789';let s='';for(let i=0;i<8;i++){if(i===4)s+='-';s+=c[Math.floor(Math.random()*c.length)]}return s}

function seed(){
  const db={seq:1,members:[],accounts:[],roles:[],campaigns:[],payments:[],journal:[],relances:[],settings:{paiementIntegre:false,operateurs:{'Orange Money':true,'MTN MoMo':true,'Moov Money':true,'Wave':true},apiStatut:'test',departements:DEPS.slice(),fonctions:['Membre']},notifs:[],events:[],evtRep:[],tasks:[],affiches:[],suivi:[]};
  const id=()=>db.seq++;
  db.roles=[
    {id:'president',nom:'Président (super admin)',systeme:true,perms:PERMS.map(p=>p[0])},
    {id:'commissaire',nom:'Commissaire aux comptes',perms:['membres_voir','campagnes_voir','campagnes_lancer','journal','exports']},
    {id:'tresorier',nom:'Trésorier(e)',perms:['membres_voir','campagnes_voir','campagnes_lancer','paiements_valider','relances','exports']},
    {id:'secretaire',nom:'Secrétaire',perms:['membres_voir','campagnes_voir','relances','exports','suivi_taches']},
    {id:'organisateur',nom:'Organisateur',perms:['membres_voir','evenements_gerer','exports']},
    {id:'membre',nom:'Membre',systeme:true,perms:[]}];
  FILE_ROWS.forEach(([n,c],i)=>{const [nom,f]=splitFonction(n);
    const deps=['Jeunesse'];if(i%3===0)deps.push('Chorale');if(i%5===1||/th[ée]âtre/i.test(f))deps.push('Théâtre');if(i%7===2)deps.push('Accueil');if(/mobilisation/i.test(f))deps.push('Mobilisation');
    db.members.push({id:id(),nom,prenoms:'',tel:c,email:'',anniv:i%6===5?'':`${String((i*5)%12+1).padStart(2,'0')}-${String((i*11)%27+1).padStart(2,'0')}`,
      baptise:i%4!==3,fonction:f,profession:DEMO_PROF[(i*5)%DEMO_PROF.length],habitation:DEMO_HAB[(i*3)%DEMO_HAB.length],departement:'Jeunesse',adhesion:'2026-01-15',creeLe:i>=14&&i<=18?addD(-(19-i)*3)+'T1'+(i%9)+':20:00':'2026-01-15T10:00:00',actif:true})});
  const P=db.members.find(m=>/pr[ée]sident/i.test(m.fonction));P.email='paulandre.koffi@exemple.ci';
  db.members.forEach(m=>{if(!m.tel&&!m.email)return;
    const role=/pr[ée]sident/i.test(m.fonction)?'president':/tr[ée]sori/i.test(m.fonction)?'tresorier':/secr[ée]taire/i.test(m.fonction)?'secretaire':/mobilisation/i.test(m.fonction)?'organisateur':'membre';
    db.accounts.push({id:id(),memberId:m.id,roleId:role,pwd:genPwd(),actif:true,mustChange:true,creeLe:'2026-08-01T09:00:00',derniere:null})});
  const presName='Paul-Andre Koffi (Président)',tresName='Koffi Danielle (Trésorier(e))';
  const mk=(nom,nbMois,debut,lignes,statut)=>{const c={id:id(),nom,nbMois,debut,debutJ:debut+'-01',fin:(()=>{const[y,m]=debut.split('-').map(Number);const d=new Date(y,m-1+nbMois,0);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})(),periode:'mois',statut,creePar:presName,creeLe:debut+'-01T09:00:00',lignes};db.campaigns.push(c);
    db.journal.push({t:c.creeLe,auteur:presName,action:'Campagne lancée',detail:`« ${nom} » — ${nbMois} mois, ${lignes.length} membres, ${fmt(lignes.reduce((a,l)=>a+l.montant,0))}`});return c};
  const retraite=mk('Retraite spirituelle 2026',3,'2026-03',db.members.slice(0,18).map(m=>({memberId:m.id,montant:9000})),'Clôturée');
  const moisson=mk('Moisson 2026',10,'2026-08',db.members.map((m,i)=>({memberId:m.id,montant:FILE_ROWS[i][2]})),'En cours');
  const noel=mk('Concert de Noël',3,'2026-10',db.members.filter((m,i)=>i%2===0||i>18).map(m=>({memberId:m.id,montant:6000})),'En cours');
  const sortie=mk('Sortie détente jeunesse',4,'2026-09',db.members.filter((m,i)=>i%3!==2).map(m=>({memberId:m.id,montant:10000})),'En cours');
  const solid=mk('Fonds de solidarité',6,'2026-07',db.members.map(m=>({memberId:m.id,montant:3000})),'En cours');
  const pays=[];
  sortie.lignes.forEach((l,i)=>{const k=i%4;for(let j=0;j<k&&j<2;j++)pays.push({campagneId:sortie.id,memberId:l.memberId,montant:2500,date:`2026-${String(9+j).padStart(2,'0')}-${String(6+i).padStart(2,'0')}`,moyen:MOYENS[(i+j)%5],ref:''})});
  solid.lignes.forEach((l,i)=>{const k=[4,3,2,4,1,0,4,3][i%8];for(let j=0;j<k;j++)pays.push({campagneId:solid.id,memberId:l.memberId,montant:500,date:`2026-${String(7+j).padStart(2,'0')}-${String(4+i).padStart(2,'0')}`,moyen:MOYENS[(i*2+j)%5],ref:''})});
  retraite.lignes.forEach((l,i)=>{if(i%9!==4)pays.push({campagneId:retraite.id,memberId:l.memberId,montant:9000,date:`2026-0${3+i%3}-${String(5+i).padStart(2,'0')}`,moyen:MOYENS[i%5],ref:''})});
  moisson.lignes.forEach((l,i)=>{const sch=schedule(l.montant,10);const k=PATTERN[i];
    for(let j=0;j<k;j++){const mo=Math.min(8+j,10);pays.push({campagneId:moisson.id,memberId:l.memberId,montant:sch[j],date:`2026-${String(mo).padStart(2,'0')}-${String(3+((i*3+j*7)%24)).padStart(2,'0')}`,moyen:MOYENS[(i+j)%5],ref:(i+j)%5===4?'':'MP'+(26080000+i*137+j*11)})}
    if(i%6===1)pays.push({campagneId:moisson.id,memberId:l.memberId,montant:1000,date:'2026-10-12',moyen:'Espèces',ref:''})});
  noel.lignes.forEach((l,i)=>{if(i%3===0)pays.push({campagneId:noel.id,memberId:l.memberId,montant:2000,date:`2026-10-${String(10+i).padStart(2,'0')}`,moyen:i%2?'Espèces':'Wave',ref:''})});
  pays.sort((a,b)=>a.date.localeCompare(b.date)).forEach(p=>{Object.assign(p,{id:id(),note:'',saisiPar:tresName,saisiLe:p.date+'T18:00:00',annule:false,motif:''});db.payments.push(p);
    const m=db.members.find(x=>x.id===p.memberId);db.journal.push({t:p.saisiLe,auteur:tresName,action:'Paiement validé',detail:`${m.nom} — ${fmt(p.montant)} (${p.moyen})`})});
  db.members.forEach(m=>{if(!db.settings.fonctions.includes(m.fonction))db.settings.fonctions.push(m.fonction)});
  const td=new Date(),mmdd=d=>String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  db.members[3].anniv=mmdd(td);const t3=new Date(td);t3.setDate(t3.getDate()+3);db.members[7].anniv=mmdd(t3);
  db.payments.filter(x=>x.date>='2026-10-20').forEach(x=>{const m=db.members.find(y=>y.id===x.memberId),c=db.campaigns.find(y=>y.id===x.campagneId);
    db.notifs.push({id:id(),t:x.saisiLe,target:{mid:m.id},type:'paiements',title:`Versement enregistré : ${fmt(x.montant)}`,body:`${c.nom} · ${x.moyen} · le ${fdate(x.date)}`,read:[]});
    db.notifs.push({id:id(),t:x.saisiLe,target:{perm:'campagnes_voir'},type:'paiements',title:`Paiement validé : ${titleCase(m.nom)}`,body:`${fmt(x.montant)} (${x.moyen}) · ${c.nom}`,read:[],actorAcct:(db.accounts.find(a=>a.roleId==='tresorier')||{}).id})});
  seedEvents(db);seedSuivi(db);
  db.journal.sort((a,b)=>a.t.localeCompare(b.t));
  return db;
}
let DB;
function load(){try{const s=localStorage.getItem(KEY);if(s)return JSON.parse(s)}catch(e){}return null}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){}}

/* ================== OUTILS & CALCULS ================== */
function fmt(n){return Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g,' ')+' FCFA'}
function fmtN(n){return Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g,' ')}
function fdate(d){if(!d)return'';const [y,m,j]=d.slice(0,10).split('-');return `${j}/${m}/${y}`}
function fdt(d){return fdate(d)+' '+d.slice(11,16)}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function nowIso(){const d=new Date();return today()+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':00'}
function initials(n){return String(n).replace(/[^A-Za-zÀ-ÿ' -]/g,'').split(/[\s-]+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase()}
function digits(s){return String(s||'').replace(/\D/g,'')}
function norm(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function titleCase(n){return String(n).toLowerCase().replace(/(^|[\s'-])(\S)/g,(a,b,c)=>b+c.toUpperCase())}
function member(id){return DB.members.find(m=>m.id===id)}
function fullName(m){return m?(m.nom+' '+(m.prenoms||'')).trim():'?'}
function prenomOf(m){return titleCase(m.prenoms?m.prenoms.split(' ')[0]:m.nom)}
const MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function fanniv(a){if(!a)return'';const [m,d]=a.split('-');return `${+d} ${MOIS[+m-1]}`}
function daysTo(a){if(!a)return null;const n=new Date();n.setHours(0,0,0,0);const [m,d]=a.split('-').map(Number);let t=new Date(n.getFullYear(),m-1,d);if(t<n)t=new Date(n.getFullYear()+1,m-1,d);return Math.round((t-n)/864e5)}
function age(d){if(!d)return null;const b=new Date(d),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;return a}
function camp(id){return DB.campaigns.find(c=>c.id===id)}
function schedule(montant,n){const base=Math.floor(montant/n/5)*5;const a=Array(n).fill(base);a[n-1]=montant-base*(n-1);return a}
const MCOURT=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const PER={jour:['jour','Jour','J','jours'],semaine:['semaine','Semaine','S','semaines'],mois:['mois','Mois','M','mois'],unique:['fois','Échéance','','']};
function perK(c){return(c&&PER[c.periode])?c.periode:'mois'}
function perU(c){return PER[perK(c)][0]}
function perL(c){return PER[perK(c)][1]}
function perA(c){return PER[perK(c)][2]}
function nbPer(c,n){n=n??c.nbMois;const k=perK(c);if(k==='unique')return'1 versement unique';return `${n} ${n>1?PER[k][3]:PER[k][0]}`}
function perPos(c,cur){return perK(c)==='unique'?`Échéance le ${fdate(campFin(c)).slice(0,5)}`:`${perL(c)} ${cur}/${c.nbMois}`}
function perAuto(deb,fin){if(!deb||!fin)return'mois';const d=Math.round((dPar(fin)-dPar(deb))/864e5)+1;return d<=1?'unique':d<=14?'jour':d<=62?'semaine':'mois'}
function dPar(s){const[y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d||1)}
function dIso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function nPeriodes(deb,fin,per){if(!deb||!fin)return 0;const a=dPar(deb),b=dPar(fin);if(b<a)return 0;if(per==='unique')return 1;if(per==='jour')return Math.round((b-a)/864e5)+1;if(per==='semaine')return Math.ceil((Math.round((b-a)/864e5)+1)/7);return(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth()+1}
function campFin(c){if(c.fin)return c.fin;const[y,m]=c.debut.split('-').map(Number);return dIso(new Date(y,m-1+c.nbMois,0))}
function delaiDepasse(c){return!!(c&&c.fin&&c.statut==='En cours'&&today()>c.fin)}
function delaiChip(c){return delaiDepasse(c)?'<span class="chip late" style="font-size:10.5px">Délai dépassé</span>':''}
function moisNom(c,i){if(c.periode==='unique')return'au '+fdate(campFin(c)).slice(0,5);if(c.periode==='jour'){const d=dPar(c.debutJ);d.setDate(d.getDate()+i);return d.getDate()+' '+MCOURT[d.getMonth()]}if(c.periode==='semaine'){const d=dPar(c.debutJ||c.debut+'-01');d.setDate(d.getDate()+7*i);return d.getDate()+' '+MCOURT[d.getMonth()]}const [y,m]=c.debut.split('-').map(Number);const d=new Date(y,m-1+i,1);return MCOURT[d.getMonth()]+(d.getFullYear()!==new Date().getFullYear()?' '+String(d.getFullYear()).slice(2):'')}
function moCell(s,mo,curOn=true){return `<div class="mo ${mo.state} ${curOn&&mo.i===s.cur-1?'cur':''}">${perA(s.c)}${mo.i+1}<span class="mo-m">${moisNom(s.c,mo.i)}</span><b>${mo.state==='paye'?'✓':mo.state==='avenir'?fmtN(mo.due):fmtN(mo.paid)}</b>${mo.state==='partiel'||mo.state==='du'?`<small>sur ${fmtN(mo.due)}</small>`:''}</div>`}
function moisDetail(s){const L=s.months.filter(mo=>mo.i<s.cur&&mo.paid<mo.due);
  return `<div class="mo-help">${s.c.periode==='unique'?`Un seul versement, à faire au plus tard le ${fdate(campFin(s.c))}.`:s.c.periode==='jour'?`Un versement par jour à partir du ${fdate(s.c.debutJ)} (Jour 1).`:s.c.periode==='semaine'?`Les semaines sont comptées à partir du ${fdate(s.c.debutJ)} (Semaine 1).`:`Les mois sont comptés à partir du lancement (Mois 1 = ${moisNom(s.c,0)}).`} Fin de la campagne : <b>${fdate(campFin(s.c))}</b>. ${s.c.periode==='unique'?'On peut payer en plusieurs fois avant cette date.':'Chaque paiement complète d\'abord la période la plus ancienne non soldée.'}</div>${delaiDepasse(s.c)?`<div class="info red mt" style="font-size:12.5px"><b>Délai dépassé</b> depuis le ${fdate(s.c.fin)}. Les paiements restent possibles : la trésorière peut toujours les valider.</div>`:''}`+
  (L.length?`<div class="mt">${L.map(mo=>`<div class="kv"><span>${perL(s.c)} ${mo.i+1} · ${moisNom(s.c,mo.i)}${mo.i===s.cur-1?' (en cours)':''}</span><b style="color:var(--red)">${fmtN(mo.paid)} / ${fmtN(mo.due)} · manque ${fmtN(mo.due-mo.paid)}</b></div>`).join('')}</div>`:(s.cur?`<div class="info mt" style="font-size:12.5px">Tout est soldé jusqu'à ${s.c.periode==='semaine'?'la semaine du':''} ${moisNom(s.c,s.cur-1)} ✓</div>`:''))}
function simulatePay(s,amt){let r=amt;const out=[];for(const mo of s.months){const need=mo.due-mo.paid;if(need<=0)continue;if(r<=0)break;const add=Math.min(need,r);r-=add;out.push({mo,add,paid:mo.paid+add})}
  const verse=s.verse+amt;const dueToDate=s.months.slice(0,s.cur).reduce((a,m)=>a+m.due,0);return{out,surplus:Math.max(0,r),retard:Math.max(0,dueToDate-verse),reste:Math.max(0,s.total-verse)}}
function previewHtml(s,amt){if(!amt)return'<div class="muted">Saisis un montant pour voir ce qu\'il couvre.</div>';const r=simulatePay(s,amt);
  return `<div class="muted" style="font-weight:700;margin-bottom:4px">CE PAIEMENT VA COUVRIR</div>${r.out.map(o=>`<div class="kv"><span>Mois ${o.mo.i+1} · ${moisNom(s.c,o.mo.i)}</span><b style="color:${o.paid>=o.mo.due?'var(--ok)':'var(--amber)'}">+${fmtN(o.add)} → ${o.paid>=o.mo.due?'soldé ✓':`${fmtN(o.paid)} / ${fmtN(o.mo.due)} (manque ${fmtN(o.mo.due-o.paid)})`}</b></div>`).join('')}
  ${r.surplus?`<div class="kv"><span>Au-delà du total</span><b>${fmtN(r.surplus)}</b></div>`:''}
  <div class="info mt" style="font-size:12.5px;${r.retard?'background:var(--red-soft);color:#7d2020':''}">${r.reste===0?'Après ce paiement : cotisation <b>entièrement soldée</b> 🎉':r.retard?`Après ce paiement : encore <b>${fmt(r.retard)}</b> à payer pour être à jour.`:'Après ce paiement : <b>à jour</b> pour ce mois 👍'} Reste total : ${fmt(r.reste)}.</div>`}
function curIdx(c){if(c.periode==='unique')return today()>=campFin(c)?1:0;if(c.periode==='jour'){const a=dPar(c.debutJ),n=new Date();n.setHours(0,0,0,0);return Math.max(0,Math.min(c.nbMois,Math.round((n-a)/864e5)+1))}if(c.periode==='semaine'){const a=dPar(c.debutJ||c.debut+'-01'),n=new Date();n.setHours(0,0,0,0);return Math.max(0,Math.min(c.nbMois,Math.floor((n-a)/864e5/7)+1))}const [y,m]=c.debut.split('-').map(Number);const d=new Date();const v=(d.getFullYear()-y)*12+(d.getMonth()+1-m)+1;return Math.max(0,Math.min(c.nbMois,v))}
function situation(cid,mid){
  const c=camp(cid);const line=c&&c.lignes.find(l=>l.memberId===mid);if(!line)return null;
  const sch=schedule(line.montant,c.nbMois);const cur=c.statut==='Clôturée'?c.nbMois:curIdx(c);
  const pays=DB.payments.filter(p=>p.campagneId===cid&&p.memberId===mid&&!p.annule);
  const verse=pays.reduce((a,p)=>a+p.montant,0);let r=verse;
  const months=sch.map((due,i)=>{const paid=Math.min(due,r);r-=paid;return{i,due,paid,state:paid>=due?'paye':paid>0?'partiel':(i<cur?'du':'avenir')}});
  const dueToDate=sch.slice(0,cur).reduce((a,b)=>a+b,0);
  const retard=Math.max(0,dueToDate-verse);const reste=Math.max(0,line.montant-verse);
  const statut=verse>=line.montant?'Soldé':retard>0?'En retard':'À jour';
  return{c,line,total:line.montant,verse,reste,retard,statut,months,cur,next:months.find(m=>m.paid<m.due),pays,mensualite:sch[0],surplus:Math.max(0,verse-line.montant),dernier:pays.length?pays[pays.length-1].date:null}
}
function statutChip(s){return `<span class="chip ${s==='Soldé'?'ok':s==='En retard'?'late':'mut'}">${s==='Soldé'?'<i data-lucide="check" class="i i-sm"></i>':''}${s}</span>`}
function campStats(c){
  let total=0,verse=0,retard=0,nbRetard=0,nbSolde=0,nbZero=0;const perMonth=Array.from({length:c.nbMois},()=>({att:0,enc:0}));
  c.lignes.forEach(l=>{const s=situation(c.id,l.memberId);total+=s.total;verse+=Math.min(s.verse,s.total);retard+=s.retard;if(s.retard>0)nbRetard++;if(s.statut==='Soldé')nbSolde++;if(!s.verse)nbZero++;
    s.months.forEach((m,i)=>{perMonth[i].att+=m.due;perMonth[i].enc+=m.paid})});
  return{total,verse,reste:total-verse,retard,nbRetard,nbSolde,nbZero,perMonth,taux:total?verse/total:0,cur:c.statut==='Clôturée'?c.nbMois:curIdx(c)}
}
function campTotal(c){return c.lignes.reduce((a,l)=>a+l.montant,0)}

/* ================== COMPTES / RÔLES ================== */
function acctOfMember(mid){return DB.accounts.find(a=>a.memberId===mid)}
function role(id){return DB.roles.find(r=>r.id===id)}
function sAcct(p){return p.session&&DB.accounts.find(a=>a.id===p.session.accountId)}
function sRole(p){const a=sAcct(p);return a&&role(a.roleId)}
function sMember(p){const a=sAcct(p);return a&&member(a.memberId)}
function can(p,perm){const r=sRole(p);return!!r&&(r.id==='president'||r.perms.includes(perm))}
function sessName(p){const m=sMember(p),r=sRole(p);return `${titleCase(fullName(m))} (${r.id==='president'?'Président':r.nom})`}
function roleChip(a){if(!a)return'<span class="chip mut">Pas d\'accès</span>';const r=role(a.roleId);if(!a.actif)return'<span class="chip late"><i data-lucide="lock" class="i i-sm"></i>Compte bloqué</span>';
  return `<span class="chip ${r.id==='membre'?'mut':'gold'}">${r.id==='president'?'<i data-lucide="crown" class="i i-sm"></i>':''}${esc(r.id==='president'?'Président':r.nom)}</span>`}
const NTYPES=[['messages','Messages du bureau','send'],['paiements','Paiements','hand-coins'],['campagnes','Campagnes','layers'],['relances','Rappels de cotisation','megaphone'],['anniversaires','Anniversaires','cake'],['evenements','Événements','calendar-days'],['taches','Tâches et rappels','list-todo']];
function canAcct(a,perm){const r=role(a.roleId);return!!r&&(r.id==='president'||r.perms.includes(perm))}
function prefsOf(a){return Object.assign({messages:true,paiements:true,campagnes:true,relances:true,anniversaires:true,evenements:true,taches:true},a.prefs||{})}
function notifTargets(n,a){return n.actorAcct!==a.id&&((n.target.acct&&n.target.acct===a.id)||(n.target.mid&&n.target.mid===a.memberId)||(n.target.mids&&n.target.mids.includes(a.memberId))||(n.target.perm==='__tous')||(n.target.perm&&canAcct(a,n.target.perm)))}
function notifsFor(a){const pr=prefsOf(a);
  const L=DB.notifs.filter(n=>pr[n.type]!==false&&notifTargets(n,a)).slice().reverse();
  const B=[];if(pr.anniversaires){
    DB.members.filter(m=>m.actif&&m.anniv&&daysTo(m.anniv)<=7&&m.id!==a.memberId).forEach(m=>{const d=daysTo(m.anniv);B.push({d,m,title:d===0?`Aujourd'hui : anniversaire de ${titleCase(fullName(m))} 🎉`:`Anniversaire de ${titleCase(fullName(m))} dans ${d} jour${d>1?'s':''}`,body:fanniv(m.anniv)+(m.departement?' · '+m.departement:'')})});
    const me=member(a.memberId);if(me&&me.anniv&&daysTo(me.anniv)===0)B.push({d:0,m:null,title:`Joyeux anniversaire ${prenomOf(me)} ! 🎂`,body:'Toute la jeunesse te souhaite une belle journée.'})}
  return{B:B.sort((x,y)=>x.d-y.d),L}}
function unreadCount(a){const{B,L}=notifsFor(a);return L.filter(n=>!n.read.includes(a.id)).length+B.filter(b=>b.d===0&&!(a.seenB||'').includes(today())).length}
function notify(target,type,title,body,actorAcct){const n={id:DB.seq++,t:nowIso(),target,type,title,body,read:[],actorAcct};DB.notifs.push(n);
  PANES.forEach(o=>{const a=sAcct(o);if(a&&notifTargets(n,a)&&prefsOf(a)[type]!==false){o.notif={t1:title,t2:body};const k=o.notifK=Date.now()+Math.random();setTimeout(()=>{if(o.notifK===k){o.notif=null;rerender(o)}},7000)}})}
function log(auteur,action,detail){DB.journal.push({t:nowIso(),auteur,action,detail})}
function telN(s){let d=digits(s);if(d.startsWith('00225'))d=d.slice(5);else if(d.startsWith('225')&&d.length===13)d=d.slice(3);return d}
function findLogin(ident){const d=telN(ident),e=String(ident).trim().toLowerCase();
  return DB.accounts.find(a=>{const m=member(a.memberId);return m&&((d.length>=8&&telN(m.tel)===d)||(e.includes('@')&&m.email.toLowerCase()===e))})}

function tabsFor(p){
  const r=sRole(p);const m=sMember(p);
  const inCamp=m&&DB.campaigns.some(c=>c.lignes.some(l=>l.memberId===m.id));
  if(r.id==='membre')return[['situation','Situation','wallet'],['mescamps','Campagnes','layers'],['anniv','Anniv.','cake'],['stats','Stats','bar-chart-3'],['evenements','Événements','calendar-days'],['historique','Mes versements','receipt'],['profil','Mon profil','user']];
  const t=[['dashboard','Accueil','layout-dashboard']];
  if(can(p,'paiements_valider')||can(p,'journal'))t.push(['paiements','Paiements','hand-coins']);
  if(can(p,'suivi_taches'))t.push(['rappels','Rappels','bell-ring']);
  if(can(p,'relances'))t.push(['relances','Relances cotisations','megaphone']);
  if(can(p,'campagnes_voir'))t.push(['campagnes','Campagnes','layers']);
  if(can(p,'membres_voir')||can(p,'membres_gerer'))t.push(['membres','Jeunes','users']);
  t.push(['evenements','Événements','calendar-days']);
  if(can(p,'affiches_gerer'))t.push(['affiches','Bannières','image']);
  t.push(['stats','Statistiques','bar-chart-3']);
  if(can(p,'acces_gerer'))t.push(['acces','Rôles & accès','key-round']);
  if(can(p,'journal'))t.push(['journal','Journal','scroll-text']);
  if(inCamp)t.push(['situation','Ma cotisation','wallet']);
  t.push(['anniv','Anniversaires','cake']);
  if(can(p,'parametres'))t.push(['parametres','Paramètres','settings']);
  t.push(['profil','Mon profil','user']);
  const PRI={president:['dashboard','campagnes','paiements','membres'],tresorier:['dashboard','paiements','campagnes','membres'],secretaire:['dashboard','rappels','campagnes','membres'],organisateur:['dashboard','evenements','membres','situation'],president:['dashboard','campagnes','paiements','membres','evenements','affiches']}[r.id];
  if(PRI){const pri=PRI;t.sort((x,y)=>(pri.indexOf(x[0])+1||99)-(pri.indexOf(y[0])+1||99))}
  if(r.id==='tresorier')return t.filter(x=>x[0]!=='relances');
  return t;
}
function navTabs(p){const t=tabsFor(p);return t.length<=5?t:[...t.slice(0,4),['plus','Plus','menu']]}

/* ================== PANES ================== */
let MODE='app',USERMODE='app',CACHE={};
let PANES=[];
function setupPanes(){
  const narrow=window.innerWidth<760;MODE=narrow?'mobile':USERMODE;
  document.body.classList.toggle('full-mobile',narrow);
  autoRappels();
  if(CACHE[MODE])PANES=CACHE[MODE];
  else{
    const tres=DB.accounts.find(a=>a.roleId==='tresorier'&&a.actif),mem=acctOfMember(DB.members[0].id);
    if(MODE==='web')PANES=[{id:'w',mode:'web',session:null}];
    else if(MODE==='mobile')PANES=[{id:'m',mode:'mobile',session:null}];
    else{const byRole=r=>DB.accounts.find(a=>a.roleId===r&&a.actif);const pr=byRole('president'),se=byRole('secretaire');
      PANES=[pr&&{id:'p1',mode:'mobile',cap:'👑 Président — super admin',session:{accountId:pr.id}},
             tres&&{id:'p2',mode:'mobile',cap:'💰 Trésorière',session:{accountId:tres.id}},
             se&&{id:'p3',mode:'mobile',cap:'📢 Secrétaire',session:{accountId:se.id}},
             byRole('organisateur')&&{id:'p5',mode:'mobile',cap:'🎉 Organisateur',session:{accountId:byRole('organisateur').id}},
             mem&&{id:'p4',mode:'mobile',cap:'🙋 Membre — Tie Bi Christian',session:{accountId:mem.id}}].filter(Boolean)}
    PANES.forEach(o=>{const ac=o.session&&DB.accounts.find(x=>x.id===o.session.accountId);if(ac&&!ac.derniere)ac.derniere=nowIso()});
    PANES.forEach(p=>{p.sub=null;p.pay={};p.notif=null;p.f={}});CACHE[MODE]=PANES;
  }
  document.querySelectorAll('#modeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.mode===MODE));
  document.getElementById('hint').innerHTML=MODE==='app'
    ?'<b>L\'application mobile, telle que chacun la verra sur son téléphone.</b> Choisis un profil ci-dessous pour voir son écran. « Tous côte à côte » montre les téléphones ensemble : quand la trésorière valide un paiement, les autres se mettent à jour.'
    :MODE==='web'?'Back-office ordinateur : réservé pour l\'instant au <b>président</b> et à la <b>trésorière</b>. Les autres utilisent l\'application mobile.':'Application mobile : les mêmes accès, et le back-office dans le téléphone pour le bureau.';
  renderAll();
}
function pane(id){return PANES.find(p=>p.id===id)}
const SPLASH='<div class="splash"><div class="sp-glow"></div><svg class="sp-logo" viewBox="0 0 120 120" width="132" height="132"><g class="sp-fig" style="--r:0deg;animation-delay:0.15s"><circle cx="60" cy="14" r="9.5" fill="#fff"/><path d="M41.62 41.62 A26 26 0 0 1 78.38 41.62" fill="none" stroke="#fff" stroke-width="10"/></g><g class="sp-fig" style="--r:90deg;animation-delay:0.3s"><circle cx="60" cy="14" r="9.5" fill="#fff"/><path d="M41.62 41.62 A26 26 0 0 1 78.38 41.62" fill="none" stroke="#fff" stroke-width="10"/></g><g class="sp-fig" style="--r:180deg;animation-delay:0.45s"><circle cx="60" cy="14" r="9.5" fill="#fff"/><path d="M41.62 41.62 A26 26 0 0 1 78.38 41.62" fill="none" stroke="#fff" stroke-width="10"/></g><g class="sp-fig" style="--r:270deg;animation-delay:0.6s"><circle cx="60" cy="14" r="9.5" fill="#fff"/><path d="M41.62 41.62 A26 26 0 0 1 78.38 41.62" fill="none" stroke="#fff" stroke-width="10"/></g><path class="sp-core" d="M51 48 L60 60 L69 48 M60 60 L60 72" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="sp-name"><span style="animation-delay:1.25s">Y</span><span style="animation-delay:1.31s">o</span><span style="animation-delay:1.37s">u</span><span style="animation-delay:1.43s">n</span><span style="animation-delay:1.49s">i</span><span style="animation-delay:1.55s">t</span><span style="animation-delay:1.61s">y</span></div><div class="sp-tag">Gestion des jeunes Harvest</div><div class="sp-bar"><i></i></div></div>';
function showSplash(){PANES.forEach(p=>{if(p.mode!=='mobile')return;const sc=document.querySelector('#pane-'+p.id+' .screen');if(!sc)return;sc.querySelectorAll('.splash').forEach(x=>x.remove());sc.insertAdjacentHTML('beforeend',SPLASH);const el=sc.lastElementChild;setTimeout(()=>el.classList.add('out'),3200);setTimeout(()=>el.remove(),3800)})}
let FIRST=true,SHOWN=null;
function renderAll(){
  const st=document.getElementById('stage');
  const multi=MODE==='app'&&PANES.length>1;if(multi&&!PANES.find(p=>p.id===SHOWN)&&SHOWN!=='all')SHOWN=PANES[0].id;
  st.classList.toggle('single',multi&&SHOWN!=='all');
  document.getElementById('whoBar').innerHTML=multi?PANES.map(p=>`<button class="${SHOWN===p.id?'on':''}" data-who="${p.id}">${esc(p.cap.split('—')[0].trim())}</button>`).join('')+`<button class="${SHOWN==='all'?'on':''}" data-who="all">Tous côte à côte</button>`:'';
  st.innerHTML=PANES.map(p=>`<div class="pane-wrap ${SHOWN===p.id?'on':''}">${p.cap?`<div class="pane-cap">${p.cap}</div>`:''}<div id="pane-${p.id}" data-pane="${p.id}"></div></div>`).join('');
  PANES.forEach(renderPane);
  if(FIRST){FIRST=false;showSplash()}
}
function opLogo(o,s=26){return LOGOS[o]?`<img src="${LOGOS[o]}" alt="${esc(o)}" style="width:${s}px;height:${s}px;border-radius:${Math.round(s/4)}px;flex:none">`:`<span style="width:${s}px;height:${s}px;border-radius:${Math.round(s/4)}px;background:var(--gold-soft);display:inline-grid;place-items:center;flex:none"><i data-lucide="banknote" class="i i-sm"></i></span>`}
function chans(m,text,o={}){const sz=o.size??'sm',la=o.labels!==false,ex=o.act?`data-act="${o.act}" ${o.attrs||''}`:'',t=encodeURIComponent(text),n=digits(m.tel);
  const wa=n?`<a class="btn ch-wa ${sz}" ${ex} data-chan="wa" href="https://wa.me/225${n}?text=${t}" target="_blank" rel="noopener" title="WhatsApp"><i data-lucide="message-circle" class="i i-sm"></i>${la?'WhatsApp':''}</a>`:'';
  const sms=n?`<a class="btn ch-sms ${sz}" ${ex} data-chan="sms" href="sms:+225${n}?body=${t}" title="SMS (message normal)"><i data-lucide="message-square-text" class="i i-sm"></i>${la?'SMS':''}</a>`:'';
  const app=acctOfMember(m.id)&&!o.noApp?`<button class="btn ch-app ${sz}" ${o.act?ex:`data-act="appMsg" data-m="${m.id}"`} data-chan="app" data-t="${esc(text)}" title="Message direct dans l'appli"><i data-lucide="send" class="i i-sm"></i>${la?'Message appli':''}</button>`:'';
  return wa||sms||app?`<span class="chans">${wa}${sms}${app}</span>`:'<span class="muted">pas de contact</span>'}
function refBtn(p){return(p.mode==='web'||!(window.matchMedia&&matchMedia('(pointer:coarse)').matches))?`<button class="bellbtn" data-act="actualiser" title="Actualiser" style="margin-right:6px"><i data-lucide="refresh-cw" class="i"></i></button>`:''}
function bell(p){const n=unreadCount(sAcct(p));return refBtn(p)+`<button class="bellbtn" data-act="openNotifs" title="Notifications"><i data-lucide="bell" class="i"></i>${n?`<span class="badge">${n>9?'9+':n}</span>`:''}</button>`}
function headAvatar(p){const r=sRole(p),m=sMember(p);return `<div class="avatar ${r.id==='membre'?'':'gold'} sm">${initials(fullName(m))}</div>`}
function renderPane(p){
  const el=document.getElementById('pane-'+p.id);if(!el)return;
  if(p.session&&(!sAcct(p)||!sAcct(p).actif||!sMember(p).actif)){p.session=null;p.kicked=true}
  const scrollEl=el.querySelector('.m-body,.w-main');const sc=scrollEl?scrollEl.scrollTop:0;
  if(p.session){const tb=tabsFor(p);if(!p.tab||(p.tab!=='plus'&&!tb.find(t=>t[0]===p.tab)))p.tab=tb[0][0]}
  const body=p.session?(p.session.mustChange?vMustChange(p):view(p)):'';
  if(p.mode==='web'){
    if(!p.session){el.innerHTML=`<div class="web"><div class="web-login"><div class="box card" style="padding:28px">${loginHtml(p)}</div></div></div>`}
    else{
      const tabs=tabsFor(p);if(!p.tab||!tabs.find(t=>t[0]===p.tab))p.tab=tabs[0][0];
      const m=sMember(p),r=sRole(p);
      el.innerHTML=`<div class="web"><aside class="side">
        <div class="who"><div class="avatar ${r.id==='membre'?'':'gold'}">${initials(fullName(m))}</div><div style="min-width:0"><div class="name ellip">${esc(titleCase(fullName(m)))}</div><div class="muted">${esc(r.id==='president'?'Président · super admin':r.nom)}</div></div></div>
        ${p.session.mustChange?'':tabs.map(t=>`<a class="${p.tab===t[0]?'on':''}" data-act="tab" data-tab="${t[0]}"><i data-lucide="${t[2]}" class="i"></i>${t[1]}</a>`).join('')}
        <div class="grow"></div><a data-act="logout"><i data-lucide="log-out" class="i"></i>Se déconnecter</a>
      </aside><main class="w-main">${body}</main>${notifHtml(p)}</div>`;
    }
  }else{
    let nav='';if(p.session&&!p.session.mustChange){const tabs=tabsFor(p);if(!p.tab||(p.tab!=='plus'&&!tabs.find(t=>t[0]===p.tab)))p.tab=tabs[0][0];
      const nt=navTabs(p);const overflow=!nt.find(t=>t[0]===p.tab);
      nav=`<nav class="m-nav">${nt.map(t=>`<button class="${p.tab===t[0]||(t[0]==='plus'&&overflow)?'on':''}" data-act="tab" data-tab="${t[0]}"><i data-lucide="${t[2]}" class="i"></i>${t[1]}</button>`).join('')}</nav>`}
    el.innerHTML=`<div class="phone mobile"><div class="screen">
      <div class="m-status"><span>9:41</span><span style="display:flex;gap:5px"><i data-lucide="signal" class="i i-sm"></i><i data-lucide="wifi" class="i i-sm"></i><i data-lucide="battery-full" class="i i-sm"></i></span></div>
      ${p.session?`<div class="m-head">${p.sub?`<button class="link" data-act="back" style="color:var(--ink)"><i data-lucide="chevron-left" class="i"></i></button>`:''}<div style="flex:1;min-width:0"><h1 class="ellip">${p.session.mustChange?'Bienvenue':mTitle(p)}</h1><div class="sub ellip">${esc(sessName(p))}</div></div>${p.session.mustChange?'':bell(p)}${headAvatar(p)}</div>
      <div class="m-body">${body}</div>${nav}`:`<div class="login">${loginHtml(p)}</div>`}
      ${notifHtml(p)}</div></div>`;
  }
  const ns=el.querySelector('.m-body,.w-main');if(ns&&p.keepScroll)ns.scrollTop=sc;p.keepScroll=false;
  icons();
}
function icons(){try{lucide.createIcons()}catch(e){}}
function mTitle(p){
  if(p.sub==='notifs')return'Notifications';
  if(p.sub==='tnew')return'Nouvelle tâche';if(p.sub&&p.sub.tedit)return'Modifier la tâche';if(p.sub&&p.sub.tache)return'Tâche';
  if(p.sub&&p.sub.evt)return'Événement';if(p.sub==='newevt')return'Nouvel événement';if(p.sub&&p.sub.editEvt)return'Modifier l\'événement';if(p.sub==='newaff')return'Nouvelle bannière';if(p.sub&&p.sub.editAff)return'Modifier la bannière';
  if(p.sub==='relances')return'Relances';
  if(p.sub&&p.sub.mycamp)return esc(camp(p.sub.mycamp).nom);
  if(p.tab==='mescamps')return'Mes campagnes';
  if(p.tab==='anniv')return'Anniversaires';
  if(p.tab==='stats')return'Statistiques';
  if(p.sub==='newcamp')return'Nouvelle campagne';
  if(p.sub&&p.sub.edit)return'Modifier la campagne';
  if(p.sub&&p.sub.camp)return esc(camp(p.sub.camp).nom);
  if(p.sub&&p.sub.member)return'Fiche du jeune';
  const t=tabsFor(p).find(t=>t[0]===p.tab);
  return{dashboard:'Tableau de bord',paiements:can(p,'paiements_valider')?'Valider un paiement':'Paiements',plus:'Plus',situation:sRole(p).id==='membre'?'Ma situation':'Ma cotisation',membres:'Registre des jeunes',evenements:'Événements',affiches:'Bannières',rappels:'Rappels & tâches',relances:'Relances cotisations'}[p.tab]||(t&&t[1])||'';
}
function notifHtml(p){if(!p.notif)return'';return `<div class="notif"><i data-lucide="bell-ring" class="i" style="color:var(--gold)"></i><div style="flex:1"><div class="t1">${p.notif.t1}</div><div class="t2">${p.notif.t2}</div></div><button class="link" style="color:#fff" data-act="closeNotif"><i data-lucide="x" class="i i-sm"></i></button></div>`}

function demoAccounts(web){
  const out=[];const pick=(rid,label)=>{const a=DB.accounts.find(a=>a.roleId===rid&&a.actif);if(a)out.push([label,a])};
  pick('president','Président');pick('commissaire','Commissaire');pick('tresorier','Trésorière');pick('secretaire','Secrétaire');pick('organisateur','Organisateur');
  DB.roles.filter(r=>!['president','commissaire','tresorier','secretaire','organisateur','membre'].includes(r.id)).forEach(r=>pick(r.id,r.nom));
  const mem=acctOfMember(DB.members[0].id);if(mem&&mem.roleId==='membre'&&mem.actif)out.push(['Membre',mem]);
  return web?out.filter(([l,a])=>['president','tresorier'].includes(a.roleId)):out;
}
function loginHtml(p){
  return `<div style="margin:6px 0 18px">${logoFull(200)}</div>
  ${p.kicked?'<div class="info red mb">Ta session a été fermée : ton compte a été bloqué. Rapproche-toi du président.</div>':''}<h2>Bienvenue</h2><div class="muted" style="font-size:13.5px;margin:4px 0 18px">Connecte-toi avec ton numéro de téléphone ou ton e-mail, et le mot de passe reçu.</div>
  <form data-login="${p.id}">
  <div class="field"><label>Téléphone ou e-mail</label><input class="inp" id="li-id-${p.id}" placeholder="Téléphone ou e-mail" autocomplete="off"></div>
  <div class="field"><label>Mot de passe</label><input class="inp" id="li-pw-${p.id}" type="password" placeholder="••••-••••"></div>
  <div id="li-err-${p.id}" class="info red mb" style="display:none"></div>
  <button class="btn block" type="submit"><i data-lucide="log-in" class="i"></i>Se connecter</button></form>
  <div style="text-align:center;margin-top:10px"><button class="link" data-act="forgot">Mot de passe oublié ?</button></div><div class="muted mt" style="text-align:center;font-size:12px">Pas d'inscription libre : les accès sont créés par le président.</div>
  <div class="info gold mt" style="font-size:12px"><b>Accès de démonstration</b> : touche un profil pour remplir les champs.</div>
  <div class="pills mt">${demoAccounts(p.mode==='web').map(([l,a])=>{const m=member(a.memberId);return `<button class="pill" data-act="fillLogin" data-id="${esc(m.tel||m.email)}" data-pw="${a.pwd}">${esc(l)}</button>`}).join('')}</div>`;
}
function vMustChange(p){
  const m=sMember(p);
  return `<div class="card" style="max-width:460px"><h3><i data-lucide="shield-check" class="i"></i>Première connexion</h3>
  <div class="muted mb">Bonjour ${esc(prenomOf(m))}. Choisis ton propre mot de passe pour remplacer celui que tu as reçu.</div>
  <div class="field"><label>Nouveau mot de passe (6 caractères minimum)</label><input class="inp" type="password" id="mc-1-${p.id}"></div>
  <div class="field"><label>Confirmer</label><input class="inp" type="password" id="mc-2-${p.id}"></div>
  <button class="btn block" data-act="mcSave">Enregistrer et continuer</button>
  <button class="btn sec block mt" data-act="mcSkip">Plus tard (démo)</button></div>`;
}

/* ================== VUES ================== */
function view(p){
  if(p.sub==='newcamp')return vCampForm(p,null);
  if(p.sub&&p.sub.edit)return vCampForm(p,p.sub.edit);
  if(p.sub&&p.sub.camp)return vCampDetail(p,p.sub.camp);
  if(p.sub&&p.sub.member)return vMemberFiche(p,p.sub.member);
  if(p.sub==='notifs')return vNotifs(p);
  if(p.sub==='tnew')return vTacheForm(p,null);if(p.sub&&p.sub.tedit)return vTacheForm(p,p.sub.tedit);if(p.sub&&p.sub.tache)return vTacheDetail(p,p.sub.tache);
  if(p.sub&&p.sub.evt)return vEventDetail(p,p.sub.evt);if(p.sub==='newevt')return vEvtForm(p,null);if(p.sub&&p.sub.editEvt)return vEvtForm(p,p.sub.editEvt);if(p.sub==='newaff')return vAffForm(p,null);if(p.sub&&p.sub.editAff)return vAffForm(p,p.sub.editAff);
  if(p.sub==='relances')return vRelances(p);
  if(p.sub&&p.sub.mycamp)return vMyCamp(p,p.sub.mycamp);
  switch(p.tab){
    case'dashboard':return can(p,'campagnes_voir')?vDashboard(p):vOrgHome(p);
    case'evenements':return vEvents(p);
    case'rappels':return vRappels(p);
    case'affiches':return vAffiches(p);
    case'campagnes':return vCampagnes(p);
    case'membres':return vMembres(p);
    case'paiements':return can(p,'paiements_valider')?vPayer(p):vPaiementsList(p);
    case'relances':return vRelances(p);
    case'acces':return vAcces(p);
    case'journal':return vJournal(p);
    case'parametres':return vParams(p);
    case'plus':return vPlus(p);
    case'situation':return vMemberHome(p);
    case'mescamps':return vMyCamps(p);
    case'anniv':return vAnniv(p);
    case'stats':return vStats(p);
    case'historique':return vMemberHist(p);
    case'profil':return vProfil(p);
  }return'';
}
function wTitle(p,title,sub,actions=''){return p.mode==='web'?`<div class="w-title"><div><h1>${title}</h1>${sub?`<div class="sub">${sub}</div>`:''}</div><div class="actions">${actions}${p.session&&!p.session.mustChange?bell(p):''}</div></div>`:(actions?`<div class="row mb" style="flex-wrap:wrap;gap:8px">${actions}</div>`:'')}
function sm(p){return p.mode==='mobile'?'sm':''}
function enCours(){return DB.campaigns.filter(c=>c.statut==='En cours')}
function pills(p,key,opts,def){const v=p.f[key]??def;return opts.map(([val,label,n])=>`<button class="pill ${v===val?'on':''}" data-act="setF" data-k="${key}" data-v="${val}">${label}${n!=null?`<span class="n">${n}</span>`:''}</button>`).join('')}

/* ---- Accueil ---- */
function campCard(c,p,compact){const s=campStats(c);return `<div class="card ${compact?'':'mb'}" style="cursor:pointer" data-act="opencamp" data-id="${c.id}">
  <div class="row between"><div style="min-width:0"><div class="name ellip" style="font-size:15px">${esc(c.nom)} ${delaiChip(c)}</div><div class="muted">${c.lignes.length} membres · ${nbPer(c)}${c.statut==='En cours'?` · ${perPos(c,s.cur)}`:''}</div></div><span class="chip ${c.statut==='En cours'?'ok':'mut'}">${c.statut==='En cours'?'<i data-lucide="radio" class="i i-sm"></i>':''}${c.statut}</span></div>
  <div class="row between mt" style="font-size:12.5px"><span><b>${fmt(s.verse)}</b> / ${fmt(s.total)}</span><b style="color:var(--green)">${(s.taux*100).toFixed(0)} %</b></div>
  <div class="bar" style="margin-top:6px"><i style="width:${(s.taux*100).toFixed(1)}%"></i></div>
  <div class="row mt" style="gap:6px;flex-wrap:wrap"><span class="chip ok">${s.nbSolde} soldés</span><span class="chip late">${s.nbRetard} en retard</span><span class="chip mut">${c.lignes.length-s.nbSolde-s.nbRetard} à jour</span></div></div>`}
function sortCamps(L){return L.slice().sort((a,b)=>campTotal(b)-campTotal(a)||b.nbMois-a.nbMois)}
function ring(pct,size=48){const r=(size-7)/2,c=2*Math.PI*r,h=size/2;return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex:none"><circle cx="${h}" cy="${h}" r="${r}" fill="#fff" stroke="#c8e6df" stroke-width="5"/><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="#1d8c77" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c*(1-Math.min(1,pct))).toFixed(1)}" transform="rotate(-90 ${h} ${h})"/><text x="${h}" y="${h+1}" text-anchor="middle" dominant-baseline="middle" font-size="11.5" font-weight="800" fill="#0d5547" font-family="Plus Jakarta Sans,sans-serif">${Math.round(Math.min(1,pct)*100)}%</text></svg>`}
function miniCard(c,pct,verse,reste,foot,act){return `<div class="mini" ${act}><div class="row" style="gap:8px;align-items:center">${ring(pct,40)}<div class="mini-n">${esc(c.nom)}</div></div>
  <div class="mini-r"><span>Versé</span><span>${fmtN(verse)}</span></div><div class="mini-r big"><span>Reste</span><b>${fmtN(reste)}</b></div>${foot?`<div class="mini-f">${foot}</div>`:''}</div>`}
function adminHero(p,ec){
  if(!ec.length)return `<div class="card empty mb">Aucune campagne en cours.${can(p,'campagnes_lancer')?'<br><button class="btn mt" data-act="newcamp">Lancer une campagne</button>':''}</div>`;
  const c=ec[0],s=campStats(c);
  return `<div class="hero big-hero mb" data-act="opencamp" data-id="${c.id}" style="cursor:pointer">
    <div class="row between"><div class="l">Campagne principale · ${perPos(c,s.cur)}</div><span class="chip" style="background:rgba(255,255,255,.16);color:#fff"><i data-lucide="radio" class="i i-sm"></i>En cours</span></div>
    <div class="hero-name">${esc(c.nom)}</div>${delaiDepasse(c)?`<div style="margin:-2px 0 6px"><span class="chip" style="background:#fde2e2;color:#a32020">Délai dépassé · fin le ${fdate(c.fin)}</span></div>`:''}
    <div class="big">${fmt(s.verse)}</div><div class="bar"><i style="width:${(s.taux*100).toFixed(1)}%"></i></div>
    <div class="split"><div>Attendu<b>${fmt(s.total)}</b></div><div style="text-align:right">Recouvré<b>${(s.taux*100).toFixed(0)} %</b></div></div>
    <div class="hero-pills"><span>${c.lignes.length} membres</span><span>${s.nbSolde} soldés</span><span>${s.nbRetard} en retard</span><span>${nbPer(c)}</span></div></div>${myPayCard(p)}${myLateBlock(p)}
  ${ec.length>1?`<div class="row between" style="margin:2px 2px 8px"><div class="name" style="font-size:14px">Autres campagnes en cours</div><button class="link" data-act="tab" data-tab="campagnes">Toutes (${DB.campaigns.length}) →</button></div>
  <div class="minis mb">${ec.slice(1,3).map(x=>{const t=campStats(x);return miniCard(x,t.taux,t.verse,t.reste,`${perPos(x,t.cur)} · ${t.nbRetard} en retard`,`data-act="opencamp" data-id="${x.id}"`)}).join('')}</div>`
  :`<div class="row" style="justify-content:flex-end;margin:-4px 2px 12px"><button class="link" data-act="tab" data-tab="campagnes">Toutes les campagnes (${DB.campaigns.length}) →</button></div>`}`;
}
function myLateBlock(p){const me=sMember(p);if(!me||sRole(p).id==='membre')return'';
  const L=DB.campaigns.filter(c=>c.statut==='En cours'&&c.lignes.some(l=>l.memberId===me.id)).map(c=>({c,s:situation(c.id,me.id)})).filter(o=>o.s.retard>0).sort((x,y)=>y.s.retard-x.s.retard);
  if(!L.length)return'';
  return `<div class="card mb"><h3><i data-lucide="alarm-clock" class="i"></i>Mes cotisations en retard<span class="r">${L.length}</span></h3>
  ${L.slice(0,3).map(o=>`<div class="list-item" style="cursor:pointer" data-act="tab" data-tab="situation"><div class="grow"><div class="name ellip">${esc(o.c.nom)} ${delaiChip(o.c)}</div><div class="muted">${perPos(o.c,o.s.cur)} · pour être à jour : <b style="color:var(--red)">${fmt(o.s.retard)}</b></div></div>${payOn()?`<button class="btn gold sm" data-act="payInApp" data-c="${o.c.id}">Payer</button>`:'<i data-lucide="chevron-right" class="i" style="color:var(--ink-3)"></i>'}</div>`).join('')}
  ${L.length>3?`<button class="link mt" data-act="tab" data-tab="situation">Voir mes ${L.length} cotisations en retard →</button>`:''}</div>`}
function myPayCard(p){const me=sMember(p);if(!me||sRole(p).id==='membre'||!payOn())return'';if(!payable(me).length)return'';
  return `<button class="btn gold block mb" data-act="payInApp"><i data-lucide="wallet" class="i"></i>Payer ma cotisation</button>`}
function vDashboard(p){
  const ec=sortCamps(enCours());
  const acts='';
  let h=bdBanner(p)+(p.mode==='web'?wTitle(p,`Bonjour ${esc(prenomOf(sMember(p)))} 👋`,`${sRole(p).id==='president'?'Super admin':esc(sRole(p).nom)} · ${ec.length} campagne${ec.length>1?'s':''} en cours`,acts):`<div class="muted mb" style="font-size:13px">Bonjour <b style="color:var(--ink)">${esc(prenomOf(sMember(p)))}</b> 👋 · ${ec.length} campagne${ec.length>1?'s':''} en cours</div>`);
  if(can(p,'campagnes_voir')){
    h+=adminHero(p,ec);
    const glob=can(p,'paiements_valider')||can(p,'journal');const myId=sMember(p).id;
    const recent=DB.payments.filter(x=>!x.annule&&(glob||x.memberId===myId)).slice().sort((a,b)=>b.saisiLe.localeCompare(a.saisiLe)).slice(0,5);
    const c=ec[0];const late=c?c.lignes.map(l=>({x:situation(c.id,l.memberId),m:member(l.memberId)})).filter(o=>o.x.retard>0).sort((a,b)=>b.x.retard-a.x.retard):[];
    h+=`<div class="grid g-stack" style="grid-template-columns:${p.mode==='web'?'1.3fr 1fr':'1fr'}">
    <div><div class="card mb" style="padding:14px 16px 4px"><h3><i data-lucide="history" class="i"></i>${glob?'5 derniers paiements':'Mes 5 derniers paiements'}${glob?`<span class="r"><button class="link" data-act="tab" data-tab="paiements">Tout voir →</button></span>`:''}</h3>${recent.map(x=>payRow(x,p,false,!glob)).join('')||`<div class="empty">${glob?'Aucun paiement.':'Aucun versement pour l\'instant.'}</div>`}</div>${banners(p)}</div>
    ${sRole(p).id==='secretaire'?newMembers(p):c?`<div class="card"><h3><i data-lucide="alarm-clock" class="i"></i>En retard — ${esc(c.nom)}<span class="r">${late.length}</span></h3>
      ${late.length?late.slice(0,5).map(o=>`<div class="list-item" style="cursor:pointer" data-act="memberSit" data-c="${c.id}" data-m="${o.m.id}"><div class="avatar sm">${initials(o.m.nom)}</div><div class="grow"><div class="name ellip">${esc(fullName(o.m))}</div><div class="muted">Pour être à jour : <b style="color:var(--red)">${fmt(o.x.retard)}</b></div></div><i data-lucide="chevron-right" class="i" style="color:var(--ink-3)"></i></div>`).join(''):'<div class="empty">Personne en retard 🎉</div>'}
      ${late.length>5?`<button class="link mt" data-act="openCampFilter" data-id="${c.id}" data-v="retard">Voir les ${late.length} membres en retard →</button>`:''}</div>`:''}</div>
    <div class="mt">${eventsBlock(p,3)}</div>
    <button class="btn sec block" data-act="tab" data-tab="stats"><i data-lucide="bar-chart-3" class="i"></i>Voir les statistiques</button>`;
  }
  return h;
}
function barRows(rows,total,color){const max=Math.max(1,...rows.map(r=>r[1]));return rows.map(([l,v,extra])=>`<div style="margin-bottom:9px"><div class="row between" style="font-size:12.5px;margin-bottom:4px"><span class="row" style="gap:7px">${extra||''}${esc(l)}</span><b>${typeof v==='number'&&total!==null?fmtN(v):v}</b></div><div class="bar"><i style="width:${(+String(v).replace(/\D/g,'')||0)/max*100}%;background:${color||'var(--green)'}"></i></div></div>`).join('')}
function monthChart(cols,cur){const max=Math.max(1,...cols.map(c=>Math.max(c.att||0,c.enc)));return `<div class="chart">${cols.map((m,i)=>`<div class="col ${i===cur?'cur':''}" title="${esc(m.lab)} : ${fmt(m.enc)}${m.att!=null?' / '+fmt(m.att):''}"><div class="bars">${m.att!=null?`<div class="a" style="height:${m.att/max*100}%"></div>`:''}<div class="p" style="height:${m.enc/max*100}%"></div></div><div class="lab">${esc(m.lab)}</div></div>`).join('')}</div>`}
function vStats(p){
  const r=sRole(p);let h=wTitle(p,'Statistiques',r.id==='membre'?'Tes chiffres personnels.':`Vue ${r.id==='president'?'super admin':esc(r.nom)}.`);
  const me=sMember(p);
  if(r.id==='membre'||!can(p,'campagnes_voir')){
    const L=DB.campaigns.filter(c=>c.lignes.some(l=>l.memberId===me.id));const S=L.map(c=>({c,s:situation(c.id,me.id)}));
    const tv=S.reduce((a,o)=>a+o.s.verse,0),tt=S.reduce((a,o)=>a+o.s.total,0),tr=S.reduce((a,o)=>a+o.s.reste,0);
    const mine=DB.payments.filter(x=>x.memberId===me.id&&!x.annule);const byM={};mine.forEach(x=>{const k=x.date.slice(0,7);byM[k]=(byM[k]||0)+x.montant});
    const keys=Object.keys(byM).sort().slice(-8);const byOp={};mine.forEach(x=>byOp[x.moyen]=(byOp[x.moyen]||0)+x.montant);
    return h+`<div class="kpis"><div class="kpi"><div class="l">Total versé</div><div class="v" style="color:var(--green)">${fmt(tv)}</div></div><div class="kpi"><div class="l">Reste à payer</div><div class="v">${fmt(tr)}</div></div><div class="kpi"><div class="l">Taux global</div><div class="v">${tt?Math.round(tv/tt*100):0} %</div></div><div class="kpi"><div class="l">Versements</div><div class="v">${mine.length}</div></div></div>
    <div class="card mb"><h3><i data-lucide="bar-chart-3" class="i"></i>Mes versements par mois</h3>${keys.length?monthChart(keys.map(k=>({lab:MCOURT[+k.slice(5)-1],enc:byM[k]})),keys.length-1):'<div class="empty">Aucun versement.</div>'}</div>
    <div class="card mb"><h3><i data-lucide="layers" class="i"></i>Avancement par campagne</h3>${S.map(o=>`<div style="margin-bottom:10px"><div class="row between" style="font-size:12.5px;margin-bottom:4px"><span>${esc(o.c.nom)}</span><b>${Math.round(Math.min(1,o.s.verse/o.s.total)*100)} %</b></div><div class="bar"><i style="width:${Math.min(100,o.s.verse/o.s.total*100)}%"></i></div></div>`).join('')}</div>
    <div class="card"><h3><i data-lucide="wallet" class="i"></i>Moyens de paiement utilisés</h3>${Object.keys(byOp).length?barRows(Object.entries(byOp).map(([k,v])=>[k,v,opLogo(k,20)]),1):'<div class="empty">—</div>'}</div>`;
  }
  const camps=sortCamps(DB.campaigns.filter(c=>c.statut==='En cours')).concat(DB.campaigns.filter(c=>c.statut!=='En cours'));
  if(!p.f.sc||!camp(+p.f.sc))p.f.sc=camps[0]&&camps[0].id;const c=camp(+p.f.sc);
  if(c){const s=campStats(c);const all=c.lignes.map(l=>situation(c.id,l.memberId));
    const pays=DB.payments.filter(x=>x.campagneId===c.id&&!x.annule);const byOp={};pays.forEach(x=>byOp[x.moyen]=(byOp[x.moyen]||0)+x.montant);
    const byCal={};pays.forEach(x=>{const k=x.date.slice(0,7);byCal[k]=(byCal[k]||0)+x.montant});const ck=Object.keys(byCal).sort();
    h+=`<div class="field"><label>Campagne</label><select class="inp" data-fk="sc">${camps.map(x=>`<option value="${x.id}" ${x.id===c.id?'selected':''}>${esc(x.nom)}${x.statut!=='En cours'?' (clôturée)':''}</option>`).join('')}</select></div>
    <div class="kpis"><div class="kpi"><div class="l">Attendu</div><div class="v">${fmt(s.total)}</div></div><div class="kpi"><div class="l">Encaissé</div><div class="v" style="color:var(--green)">${fmt(s.verse)}</div><div class="bar" style="margin-top:8px"><i style="width:${(s.taux*100).toFixed(1)}%"></i></div></div><div class="kpi"><div class="l">Reste</div><div class="v">${fmt(s.reste)}</div></div><div class="kpi"><div class="l">Recouvrement</div><div class="v">${(s.taux*100).toFixed(1)} %</div></div></div>
    <div class="grid" style="grid-template-columns:${p.mode==='web'?'1.5fr 1fr':'1fr'}">
      <div class="card"><h3><i data-lucide="bar-chart-3" class="i"></i>Encaissé par ${perU(c)} de cotisation<span class="r">gris = attendu</span></h3>${monthChart(s.perMonth.map((m,i)=>({lab:perA(c)+(i+1),att:m.att,enc:m.enc})),s.cur-1)}<div class="muted" style="margin-top:6px">Mois 1 = ${moisNom(c,0)} (lancement)</div></div>
      <div class="card"><h3><i data-lucide="pie-chart" class="i"></i>Statut des membres</h3>${barRows([['Soldés',all.filter(x=>x.statut==='Soldé').length],['À jour',all.filter(x=>x.statut==='À jour').length],['En retard',all.filter(x=>x.statut==='En retard').length],['Rien payé',all.filter(x=>!x.verse).length]],null)}<div class="muted">Arriérés totaux : <b style="color:var(--red)">${fmt(s.retard)}</b></div></div>
    </div>
    <div class="grid mt" style="grid-template-columns:${p.mode==='web'?'1fr 1fr':'1fr'}">
      <div class="card"><h3><i data-lucide="calendar" class="i"></i>Encaissements réels (date de paiement)</h3>${ck.length?monthChart(ck.map(k=>({lab:MCOURT[+k.slice(5)-1],enc:byCal[k]})),ck.length-1):'<div class="empty">Aucun encaissement.</div>'}</div>
      <div class="card"><h3><i data-lucide="wallet" class="i"></i>Par moyen de paiement</h3>${barRows(MOYENS.map(m=>[m,byOp[m]||0,opLogo(m,20)]),1)}<div class="muted">Dont payé dans l'appli : <b>${fmt(pays.filter(x=>x.source==='appli').reduce((a,x)=>a+x.montant,0))}</b></div></div>
    </div>`;
  }
  if(can(p,'paiements_valider')){const nm=sessName(p);const mine=DB.payments.filter(x=>x.saisiPar===nm||(sRole(p).id==='tresorier'&&/Trésori/.test(x.saisiPar)));const mo=today().slice(0,7);const thisM=mine.filter(x=>!x.annule&&x.date.slice(0,7)===mo);
    h+=`<div class="card mt"><h3><i data-lucide="hand-coins" class="i"></i>Mes validations de paiements</h3><div class="kpis" style="margin:0"><div class="kpi"><div class="l">Ce mois-ci</div><div class="v">${thisM.length}</div><div class="s">${fmt(thisM.reduce((a,x)=>a+x.montant,0))}</div></div><div class="kpi"><div class="l">Depuis le début</div><div class="v">${mine.filter(x=>!x.annule).length}</div><div class="s">${mine.filter(x=>x.annule).length} annulé(s)</div></div></div></div>`}
  if(can(p,'relances')){const R=DB.relances.filter(x=>Date.now()-new Date(x.t)<30*864e5);const byC={};R.forEach(x=>{const n=(camp(x.campagneId)||{}).nom||'?';byC[n]=(byC[n]||0)+1});
    h+=`<div class="card mt"><h3><i data-lucide="megaphone" class="i"></i>Relances (30 derniers jours)<span class="r">${R.length}</span></h3>${R.length?barRows(Object.entries(byC),null,'var(--red)'):'<div class="empty">Aucune relance.</div>'}</div>`}
  if(can(p,'membres_voir')){const act=DB.members.filter(m=>m.actif);const byD={},byF={};act.forEach(m=>{const ds=depsOf(m);(ds.length?ds:['Non renseigné']).forEach(d=>byD[d]=(byD[d]||0)+1);byF[m.fonction]=(byF[m.fonction]||0)+1});
    h+=`<div class="card mt"><h3><i data-lucide="users" class="i"></i>Jeunesse</h3><div class="kpis"><div class="kpi"><div class="l">Jeunes actifs</div><div class="v">${act.length}</div></div><div class="kpi"><div class="l">Baptisés</div><div class="v">${act.filter(m=>m.baptise).length}</div><div class="s">${act.length?Math.round(act.filter(m=>m.baptise).length/act.length*100):0} %</div></div><div class="kpi"><div class="l">Avec un accès</div><div class="v">${act.filter(m=>acctOfMember(m.id)).length}</div></div></div>
    <div class="grid" style="grid-template-columns:${p.mode==='web'?'1fr 1fr':'1fr'}"><div><div class="name mb" style="font-size:13px">Par département</div>${barRows(Object.entries(byD).sort((a,b)=>b[1]-a[1]),null,'var(--gold)')}</div><div><div class="name mb" style="font-size:13px">Par fonction</div>${barRows(Object.entries(byF).sort((a,b)=>b[1]-a[1]),null,'var(--gold)')}</div></div></div>`}
  return h;
}

/* ---- Paiements ---- */
function payRow(x,p,actions=true,own=false){
  const m=member(x.memberId);const c=camp(x.campagneId);
  return `<div class="list-item" data-act="receipt" data-id="${x.id}" style="cursor:pointer;${x.annule?'opacity:.55':''}">${LOGOS[x.moyen]?opLogo(x.moyen,30):`<div class="avatar sm" style="background:var(--gold);color:var(--ink)"><i data-lucide="banknote" class="i i-sm"></i></div>`}
  <div class="grow"><div class="name ellip">${own?esc(c?c.nom:''):esc(fullName(m))}</div><div class="muted">${x.source==='appli'?'<span class="chip ok" style="font-size:10px;padding:1px 6px">Payé dans l\'appli</span> ':''}${typeof qrChips==='function'?qrChips(x,p):''}${fdate(x.date)} · ${x.moyen}${x.ref?' · '+esc(x.ref):''}${own?'':' · '+esc(c?c.nom:'')}${x.annule?` · <b style="color:var(--red)">Annulé</b> (${esc(x.motif)})`:''}</div></div>
  <div style="text-align:right"><div class="name" style="${x.annule?'text-decoration:line-through':''}">${fmtN(x.montant)}</div>
  ${actions?`<div class="row" style="gap:8px;justify-content:flex-end;margin-top:2px"><button class="link" data-act="receipt" data-id="${x.id}">Reçu</button>${!x.annule&&can(p,'paiements_valider')?`<button class="link" style="color:var(--red)" data-act="cancelPay" data-id="${x.id}">Annuler</button>`:''}</div>`:''}</div></div>`;
}
function filteredPays(p){
  const f=p.f;let L=DB.payments.slice();
  if(f.pc&&f.pc!=='all')L=L.filter(x=>x.campagneId===+f.pc);
  if(f.pm&&f.pm!=='all')L=L.filter(x=>x.moyen===f.pm);
  if(f.ps==='ok')L=L.filter(x=>!x.annule);if(f.ps==='annule')L=L.filter(x=>x.annule);
  if(f.pd1)L=L.filter(x=>x.date>=f.pd1);if(f.pd2)L=L.filter(x=>x.date<=f.pd2);
  if(f.pq){const q=norm(f.pq);L=L.filter(x=>norm(fullName(member(x.memberId))).includes(q))}
  return L.reverse();
}
function payFilters(p){const f=p.f;
  return `<div class="filters"><select class="inp" data-fk="pc"><option value="all">Toutes les campagnes</option>${DB.campaigns.map(c=>`<option value="${c.id}" ${+f.pc===c.id?'selected':''}>${esc(c.nom)}</option>`).join('')}</select>
  <select class="inp" data-fk="pm"><option value="all">Tous les moyens</option>${MOYENS.map(m=>`<option ${f.pm===m?'selected':''}>${m}</option>`).join('')}</select>
  <select class="inp" data-fk="ps"><option value="all">Validés et annulés</option><option value="ok" ${f.ps==='ok'?'selected':''}>Validés</option><option value="annule" ${f.ps==='annule'?'selected':''}>Annulés</option></select>
  <span class="muted">du</span><input type="date" class="inp" style="width:auto;padding:6px 8px" data-fk="pd1" value="${esc(f.pd1||'')}"><span class="muted">au</span><input type="date" class="inp" style="width:auto;padding:6px 8px" data-fk="pd2" value="${esc(f.pd2||'')}"></div>
  <div class="search mb"><i data-lucide="search" class="i"></i><input class="inp" placeholder="Rechercher un membre" data-fk="pq" data-live="1" value="${esc(f.pq||'')}"></div>`}
function payListBlock(p){const L=filteredPays(p);const tot=L.filter(x=>!x.annule).reduce((a,x)=>a+x.montant,0);
  return `${payFilters(p)}<div class="count-line">${L.length} paiement${L.length>1?'s':''} · total validé <b>${fmt(tot)}</b>${can(p,'exports')?` · <button class="link" data-act="exportPays">Exporter cette liste</button>`:''}</div>
  <div class="card" style="padding:4px 16px">${L.slice(0,80).map(x=>payRow(x,p)).join('')||'<div class="empty">Aucun paiement ne correspond aux filtres.</div>'}</div>`}
function vPayer(p){
  const camps=enCours();
  if(!camps.length)return `<div class="card empty">Aucune campagne en cours.</div>`;
  const f=p.pay;if(!f.cid||!camp(+f.cid)||camp(+f.cid).statut!=='En cours')f.cid=camps.sort((a,b)=>campTotal(b)-campTotal(a))[0].id;const c=camp(+f.cid);
  if(f.date==null)f.date=today();if(!f.moyen)f.moyen='Orange Money';
  const lines=c.lignes.map(l=>member(l.memberId)).filter(Boolean).sort((a,b)=>a.nom.localeCompare(b.nom));
  const s=f.mid?situation(c.id,+f.mid):null;
  const form=`<div class="card">
    <div class="field"><label>Campagne</label><select class="inp" data-payf="cid">${camps.map(x=>`<option value="${x.id}" ${x.id===c.id?'selected':''}>${esc(x.nom)}</option>`).join('')}</select></div>
    <div class="field"><label>1. Qui a payé ?</label><select class="inp" data-payf="mid"><option value="">— Choisir le membre —</option>${lines.map(m=>`<option value="${m.id}" ${+f.mid===m.id?'selected':''}>${esc(fullName(m))}</option>`).join('')}</select></div>
    ${s?`<div class="info mb"><div class="row between"><b>${fmt(s.verse)} versés sur ${fmt(s.total)}</b>${statutChip(s.statut)}</div>${s.retard&&can(p,'relances')?`<button class="btn sm danger mt" style="width:100%" data-act="memberSit" data-c="${c.id}" data-m="${+f.mid}"><i data-lucide="megaphone" class="i i-sm"></i>Voir sa situation et le relancer</button>`:''}<div style="margin-top:4px">Reste : <b>${fmt(s.reste)}</b> · Mensualité : ${fmt(s.mensualite)}${s.retard?` · <b style="color:var(--red)">Retard ${fmt(s.retard)}</b>`:''}</div>${s.next?`<div class="muted" style="margin-top:4px;color:#2c5e46">Prochain à compléter : Mois ${s.next.i+1} (${fmtN(s.next.paid)} / ${fmtN(s.next.due)})</div>`:''}</div>`:''}
    <div class="field"><label>2. Montant reçu (FCFA)</label><input class="inp big" inputmode="numeric" data-payf="montant" value="${f.montant?fmtN(+f.montant):''}" placeholder="0">
      ${s&&s.reste?`<div class="pills" style="margin-top:4px">${[...new Set([s.mensualite,s.retard,s.reste].filter(v=>v>0))].map(v=>`<button class="pill" data-act="quickAmt" data-v="${v}">${fmtN(v)}${v===s.reste?' (tout)':v===s.retard?' (retard)':''}</button>`).join('')}</div>`:''}</div>
    ${s?`<div class="receipt mb" id="tprev-${p.id}">${previewHtml(s,+digits(f.montant||0))}</div>`:''}
    <div class="field"><label>3. Moyen de paiement</label><div class="pills">${MOYENS.map(m=>`<button class="pill ${f.moyen===m?'on':''}" data-act="moyen" data-v="${m}" style="display:inline-flex;align-items:center;gap:6px;padding:5px 11px 5px 6px">${opLogo(m,22)}${m}</button>`).join('')}</div></div>
    <div class="${p.mode==='web'?'two':''}"><div class="field"><label>4. Date du paiement</label><input type="date" class="inp" data-payf="date" value="${esc(f.date)}"></div>
      ${f.moyen!=='Espèces'?`<div class="field"><label>Référence de la transaction (facultatif)</label><input class="inp" data-payf="ref" value="${esc(f.ref||'')}" placeholder="Ex. MP260930.1234.A12345"></div>`:''}</div>
    <button class="btn block" data-act="submitPay"><i data-lucide="check-circle-2" class="i"></i>Valider le paiement</button>
    <div class="muted" style="margin-top:8px;text-align:center">Le montant est réparti automatiquement sur les mois, en commençant par le plus ancien.</div></div>`;
  const lateN=c.lignes.filter(l=>situation(c.id,l.memberId).retard>0).length;
  const relBox=can(p,'relances')&&lateN?`<div class="card mb row between" style="background:var(--red-soft);border-color:#f3cccc"><div><div class="name" style="color:#7d2020">${lateN} membre${lateN>1?'s':''} en retard ce mois-ci</div><div class="muted">${esc(c.nom)} · ${perPos(c,curIdx(c))}</div></div><button class="btn danger sm" data-act="openRel" data-id="${c.id}"><i data-lucide="megaphone" class="i i-sm"></i>Relancer</button></div>`:'';
  const hist=`<div class="${p.mode==='mobile'?'mt':''}"><div class="name mb" style="font-size:15px">Historique des paiements</div>${payListBlock(p)}</div>`;
  return wTitle(p,'Valider un paiement','Enregistre ce qu\'un membre t\'a remis : la situation de tout le monde se met à jour.')+
   (typeof qrBar==='function'?qrBar(p):'')+relBox+(p.mode==='web'?`<div class="grid" style="grid-template-columns:1fr 1.2fr;align-items:start">${form}${hist}</div>`:form+hist);
}
function vPaiementsList(p){
  return wTitle(p,'Paiements','Validés par la trésorière · lecture seule')+`<div class="info gold mb"><i data-lucide="shield-check" class="i i-sm"></i> Seule la trésorière valide les paiements. Tu vois tout, en temps réel.</div>`+payListBlock(p);
}

/* ---- Relances (secrétaire) ---- */
const REL_TPL='Bonjour {prenom}, petit rappel pour la cotisation « {campagne} » : nous sommes au {mois}. Pour être à jour, tu dois payer {retard} (reste total : {reste}). Tu peux payer en espèces ou par Mobile Money auprès de la trésorière. Merci !';
function relMsg(tpl,m,s){return tpl.replace(/\{prenom\}/g,prenomOf(m)).replace(/\{nom\}/g,titleCase(fullName(m))).replace(/\{retard\}/g,fmt(s.retard||s.reste)).replace(/\{reste\}/g,fmt(s.reste)).replace(/\{campagne\}/g,s.c.nom).replace(/\{verse\}/g,fmt(s.verse)).replace(/\{mois\}/g,`${perU(s.c)} ${s.cur} sur ${s.c.nbMois}`)+(delaiDepasse(s.c)?` Le délai de la campagne (${fdate(s.c.fin)}) est dépassé, mais tu peux encore payer.`:'')}
function lastRel(cid,mid){const r=DB.relances.filter(r=>r.campagneId===cid&&r.memberId===mid);return r.length?r[r.length-1].t:null}
let PAYCTX=null;
function payable(me){return DB.campaigns.filter(c=>c.statut==='En cours'&&c.lignes.some(l=>l.memberId===me.id)).map(c=>({c,s:situation(c.id,me.id)})).filter(o=>o.s.reste>0)}
function payOn(){return DB.settings.paiementIntegre||typeof payMethods==='function'}
function openPay(p,cid,meth){const me=sMember(p);const L=payable(me);MCTX={pane:p.id};
  if(!L.length){openModal(`<h2>Tout est soldé 🎉</h2><div class="muted">Tu n'as aucune cotisation en cours à payer.</div><div class="foot"><button class="btn" data-act="closeModal">OK</button></div>`);return}
  if(!cid){openModal(`<h2>Quelle cotisation veux-tu payer ?</h2><div class="muted mb">Choisis la cotisation, puis la façon de payer.</div>${L.map(o=>`<button class="prof" data-act="payInApp" data-c="${o.c.id}"><div class="grow"><div class="name">${esc(o.c.nom)}</div><div class="muted">Reste ${fmt(o.s.reste)}${o.s.retard?` · <b style="color:var(--red)">${fmt(o.s.retard)} pour être à jour</b>`:' · à jour'}</div></div>${statutChip(o.s.statut)}<i data-lucide="chevron-right" class="i"></i></button>`).join('')}<div class="foot"><button class="btn sec" data-act="closeModal">Fermer</button></div>`);return}
  if(!meth&&typeof payMethods==='function'){payMethods(p,cid);return}
  const o=L.find(x=>x.c.id===cid)||L[0];const c=o.c,s=o.s;const ops=Object.keys(DB.settings.operateurs).filter(k=>DB.settings.operateurs[k]);
  if(!ops.length){toast('Aucun opérateur activé.');return}
  const def=s.retard||Math.min(s.mensualite,s.reste);PAYCTX={cid:c.id,mid:me.id};
  openModal(`<h2>Payer une cotisation</h2>
  <div class="field mt"><label>Cotisation à payer</label><select class="inp" id="pay-camp">${L.map(x=>`<option value="${x.c.id}" ${x.c.id===c.id?'selected':''}>${esc(x.c.nom)} — reste ${fmtN(x.s.reste)}${x.s.retard?' · retard '+fmtN(x.s.retard):''}</option>`).join('')}</select>
  <div class="muted" style="margin-top:4px">${perPos(c,s.cur)} (${moisNom(c,Math.max(0,s.cur-1))}) · ${fmt(s.mensualite)}/${perU(c)} · ${s.retard?`<b style="color:var(--red)">${fmt(s.retard)} pour être à jour</b>`:'à jour'}</div></div>
  <div class="field"><label>Moyen de paiement</label><div class="op-grid" id="pay-ops">${ops.map((k,i)=>`<button class="op-tile ${i===0?'on':''}" data-act="pickOp" data-v="${k}">${opLogo(k,40)}<span>${k}</span></button>`).join('')}</div></div>
  <div class="field"><label>Montant (FCFA) — tu peux payer moins ou plus qu'une mensualité</label><input class="inp big" id="pay-amt" inputmode="numeric" value="${def}"><div class="pills" style="margin-top:4px">${[...new Set([Math.min(s.mensualite,s.reste),s.retard,s.reste].filter(v=>v>0))].map(v=>`<button class="pill" data-act="payAmt" data-v="${v}">${fmtN(v)}${v===s.reste?' (tout)':v===s.retard?' (pour être à jour)':' (1 mois)'}</button>`).join('')}</div></div>
  <div class="receipt mb" id="pay-prev">${previewHtml(s,def)}</div>
  <div class="field"><label>Numéro Mobile Money</label><input class="inp" id="pay-tel" value="${esc(me.tel)}"></div>
  <div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button><button class="btn gold" data-act="payGo" data-c="${c.id}"><i data-lucide="lock" class="i i-sm"></i>Payer</button></div>`);
}
function updPrev(){if(!PAYCTX)return;const el=document.getElementById('pay-prev'),i=document.getElementById('pay-amt');if(!el||!i)return;el.innerHTML=previewHtml(situation(PAYCTX.cid,PAYCTX.mid),+digits(i.value))}
function memberSit(p,cid,mid){
  const c=camp(cid),m=member(mid),s=situation(cid,mid);const lr=lastRel(cid,mid);const msg=relMsg(p.f.rtpl||REL_TPL,m,s);
  openModal(`<div class="row" style="gap:12px"><div class="avatar">${initials(m.nom)}</div><div style="flex:1;min-width:0"><h2 style="margin:0">${esc(fullName(m))}</h2><div class="muted">${esc(c.nom)} · ${perPos(c,s.cur)}</div></div>${statutChip(s.statut)}</div>
  <div class="receipt mt"><div class="rl"><span class="muted">Cotisation</span><b>${fmt(s.total)}</b></div><div class="rl"><span class="muted">Déjà versé</span><b style="color:var(--green)">${fmt(s.verse)}</b></div><div class="rl"><span class="muted">À payer ce mois-ci pour être à jour</span><b style="color:${s.retard?'var(--red)':'inherit'}">${fmt(s.retard)}</b></div><div class="rl"><span class="muted">Reste total</span><b>${fmt(s.reste)}</b></div>${lr?`<div class="rl"><span class="muted">Dernière relance</span><b>${fdt(lr)}</b></div>`:''}</div>
  <div class="months mt" style="grid-template-columns:repeat(${Math.min(5,c.nbMois)},1fr)">${s.months.map(mo=>moCell(s,mo)).join('')}</div>${moisDetail(s)}
  ${can(p,'relances')&&s.reste>0&&c.statut==='En cours'?`<div class="field mt"><label>Message de relance</label><div class="info" style="font-size:12.5px">${esc(msg)}</div></div>`:''}
  <div class="foot" style="flex-wrap:wrap">${can(p,'campagnes_lancer')&&c.statut==='En cours'?`<button class="btn sec" style="margin-right:auto" data-act="editLine" data-c="${c.id}" data-m="${m.id}"><i data-lucide="pencil" class="i i-sm"></i>Modifier le montant</button>`:''}<button class="btn sec" data-act="closeModal">Fermer</button>
  </div>${can(p,'relances')&&s.reste>0&&c.statut==='En cours'?`<div class="card mt" style="background:var(--red-soft);border-color:#f3cccc"><div class="name mb" style="color:#7d2020"><i data-lucide="megaphone" class="i i-sm"></i> Relancer par :</div>${chans(m,msg,{act:'relOne',attrs:`data-c="${c.id}" data-m="${m.id}"`,size:''})}</div>`:''}`,{pane:p.id});
}
function vRelances(p){
  const camps=enCours();const back=p.sub==='relances'?`<button class="link mb" data-act="back"><i data-lucide="arrow-left" class="i i-sm"></i>Retour</button>`:'';if(!camps.length)return back+wTitle(p,'Relances','')+'<div class="card empty">Aucune campagne en cours.</div>';
  const f=p.f;if(!f.rc||!camp(+f.rc)||camp(+f.rc).statut!=='En cours')f.rc=camps.sort((a,b)=>campTotal(b)-campTotal(a))[0].id;const c=camp(+f.rc);
  if(f.rtpl==null)f.rtpl=REL_TPL;
  const all=c.lignes.map(l=>({m:member(l.memberId),s:situation(c.id,l.memberId)}));
  const flt=f.rf||'retard';
  const L=all.filter(o=>flt==='retard'?o.s.retard>0:flt==='nonsolde'?o.s.statut!=='Soldé':flt==='zero'?o.s.verse===0:true).sort((a,b)=>b.s.retard-a.s.retard);
  const week=DB.relances.filter(r=>r.campagneId===c.id&&(Date.now()-new Date(r.t))<7*864e5).length;
  return back+wTitle(p,'Relances','Vois qui doit encore payer et envoie un rappel personnalisé par WhatsApp.',can(p,'exports')?`<button class="btn sec ${sm(p)}" data-act="exportRel"><i data-lucide="download" class="i"></i>Exporter la liste</button>`:'')+
  `<div class="field"><label>Campagne</label><select class="inp" data-fk="rc">${camps.map(x=>`<option value="${x.id}" ${x.id===c.id?'selected':''}>${esc(x.nom)}</option>`).join('')}</select></div>
  <div class="kpis"><div class="kpi"><div class="l">En retard</div><div class="v" style="color:var(--red)">${all.filter(o=>o.s.retard>0).length}</div></div><div class="kpi"><div class="l">Arriérés</div><div class="v">${fmt(all.reduce((a,o)=>a+o.s.retard,0))}</div></div><div class="kpi"><div class="l">Ont payé</div><div class="v" style="color:var(--green)">${all.filter(o=>o.s.verse>0).length} / ${all.length}</div></div><div class="kpi"><div class="l">Relances (7 jours)</div><div class="v">${week}</div></div></div>
  <div class="card mb"><h3><i data-lucide="message-square-text" class="i"></i>Message de rappel<span class="r">{prenom} {mois} {retard} {reste} {campagne}</span></h3><textarea class="inp" data-fk="rtpl" data-live="1">${esc(f.rtpl)}</textarea>
  <div class="row mt" style="gap:8px;flex-wrap:wrap"><button class="btn sec sm" data-act="copyGroup"><i data-lucide="copy" class="i i-sm"></i>Copier la liste pour le groupe WhatsApp</button><button class="btn sec sm" data-act="resetTpl">Message par défaut</button></div></div>
  <div class="filters">${pills(p,'rf',[['retard','En retard',all.filter(o=>o.s.retard>0).length],['nonsolde','Non soldés',all.filter(o=>o.s.statut!=='Soldé').length],['zero','Rien payé',all.filter(o=>!o.s.verse).length],['tous','Tous',all.length]],'retard')}</div>
  <div class="card" style="padding:4px 16px">${L.map(({m,s})=>{const lr=lastRel(c.id,m.id);return `<div class="list-item"><div class="avatar sm">${initials(m.nom)}</div><div class="grow"><div class="name ellip">${esc(fullName(m))}</div><div class="muted">${s.retard?`Retard <b style="color:var(--red)">${fmtN(s.retard)}</b> · `:''}Reste ${fmtN(s.reste)}${lr?` · relancé le ${fdate(lr)}`:''}</div></div>
    ${chans(m,relMsg(f.rtpl,m,s),{act:'logRel',attrs:`data-c="${c.id}" data-m="${m.id}"`,labels:false})}</div>`}).join('')||'<div class="empty">Personne dans cette liste 🎉</div>'}</div>`;
}

/* ---- Campagnes ---- */
function vCampagnes(p){
  const f=p.f;const flt=f.cs||'all';
  const L=DB.campaigns.filter(c=>flt==='all'||c.statut===flt).sort((a,b)=>f.ct==='montant'?campTotal(b)-campTotal(a):b.creeLe.localeCompare(a.creeLe));
  return wTitle(p,'Campagnes de cotisation','Chaque campagne : une période (du … au …) et un montant par membre.',can(p,'campagnes_lancer')?`<button class="btn ${sm(p)}" data-act="newcamp"><i data-lucide="plus" class="i"></i>Lancer une campagne</button>`:'')+
  `<div class="filters">${pills(p,'cs',[['all','Toutes',DB.campaigns.length],['En cours','En cours',enCours().length],['Clôturée','Clôturées',DB.campaigns.length-enCours().length]],'all')}
   <select class="inp" data-fk="ct"><option value="date">Plus récentes d'abord</option><option value="montant" ${f.ct==='montant'?'selected':''}>Plus gros montant d'abord</option></select></div>
  <div class="grid" style="grid-template-columns:${p.mode==='web'?'1fr 1fr':'1fr'}">${L.map(c=>campCard(c,p,true)).join('')}</div>`;
}
function campRows(p,c){
  const f=p.f;const flt=f.cf||'all';const q=norm(f.cq||'');
  return c.lignes.map(l=>({l,m:member(l.memberId),x:situation(c.id,l.memberId)}))
    .filter(o=>flt==='all'||(flt==='solde'&&o.x.statut==='Soldé')||(flt==='nonsolde'&&o.x.statut!=='Soldé')||(flt==='retard'&&o.x.retard>0)||(flt==='ajour'&&o.x.statut==='À jour')||(flt==='zero'&&o.x.verse===0)||(flt==='paye'&&o.x.verse>0))
    .filter(o=>!q||norm(fullName(o.m)).includes(q))
    .sort((a,b)=>f.co==='reste'?b.x.reste-a.x.reste:f.co==='verse'?b.x.verse-a.x.verse:a.m.nom.localeCompare(b.m.nom));
}
function vCampDetail(p,cid){
  const c=camp(cid);const s=campStats(c);const ed=can(p,'campagnes_lancer');
  const all=c.lignes.map(l=>situation(c.id,l.memberId));
  const rows=campRows(p,c);
  const back=p.mode==='web'?`<button class="link mb" data-act="back"><i data-lucide="arrow-left" class="i i-sm"></i>Toutes les campagnes</button>`:'';
  const actions=(can(p,'relances')&&c.statut==='En cours'?`<button class="btn ${sm(p)}" data-act="openRel" data-id="${c.id}"><i data-lucide="megaphone" class="i"></i>Relancer les retards</button>`:'')+(can(p,'exports')?`<button class="btn sec ${sm(p)}" data-act="exportCamp" data-id="${c.id}"><i data-lucide="download" class="i"></i>Excel (liste filtrée)</button>`:'')+(ed?`<button class="btn sec ${sm(p)}" data-act="editcamp" data-id="${c.id}"><i data-lucide="pencil" class="i"></i>Modifier</button>${c.statut==='En cours'?`<button class="btn sec ${sm(p)}" data-act="closeCamp" data-id="${c.id}"><i data-lucide="lock" class="i"></i>Clôturer</button>`:`<button class="btn sec ${sm(p)}" data-act="reopenCamp" data-id="${c.id}"><i data-lucide="unlock" class="i"></i>Rouvrir</button>`}`:'');
  const kp=`<div class="kpis"><div class="kpi"><div class="l">Attendu</div><div class="v">${fmt(s.total)}</div></div><div class="kpi"><div class="l">Encaissé</div><div class="v" style="color:var(--green)">${fmt(s.verse)}</div></div><div class="kpi"><div class="l">Reste</div><div class="v">${fmt(s.reste)}</div></div><div class="kpi"><div class="l">${c.statut==='En cours'?(perK(c)==='unique'?'Échéance':perL(c)+' en cours'):'Statut'}</div><div class="v">${c.statut==='En cours'?(perK(c)==='unique'?fdate(campFin(c)):s.cur+' / '+c.nbMois):'Clôturée'}</div></div></div>`;
  const filters=`<div class="filters">${pills(p,'cf',[['all','Tous',all.length],['solde','Soldés',all.filter(x=>x.statut==='Soldé').length],['nonsolde','Non soldés',all.filter(x=>x.statut!=='Soldé').length],['retard','En retard',all.filter(x=>x.retard>0).length],['ajour','À jour',all.filter(x=>x.statut==='À jour').length],['paye','Ont payé',all.filter(x=>x.verse>0).length],['zero','Rien payé',all.filter(x=>!x.verse).length]],'all')}
    <select class="inp" data-fk="co"><option value="nom">Trier : nom</option><option value="reste" ${p.f.co==='reste'?'selected':''}>Trier : reste à payer</option><option value="verse" ${p.f.co==='verse'?'selected':''}>Trier : montant versé</option></select></div>
    <div class="search mb"><i data-lucide="search" class="i"></i><input class="inp" placeholder="Rechercher un membre" data-fk="cq" data-live="1" value="${esc(p.f.cq||'')}"></div>
    <div class="count-line">${rows.length} membre${rows.length>1?'s':''} affiché${rows.length>1?'s':''} · versé ${fmt(rows.reduce((a,o)=>a+o.x.verse,0))} · reste ${fmt(rows.reduce((a,o)=>a+o.x.reste,0))}</div>`;
  const legend=`<div class="legend mb"><span><i style="background:var(--ok-soft);border:1px solid var(--ok)"></i>Payé</span><span><i style="background:var(--amber-soft);border:1px solid var(--amber)"></i>Partiel</span><span><i style="background:var(--red-soft);border:1px solid var(--red)"></i>Dû, non payé</span><span><i style="background:#f0f3f1;border:1px solid #ccc"></i>À venir</span></div>`;
  if(p.mode==='web'){
    return back+wTitle(p,esc(c.nom),`${c.lignes.length} membres · ${nbPer(c)} · du ${fdate(c.debutJ||c.debut+'-01')} au ${fdate(campFin(c))} · lancée par ${esc(c.creePar)} · <span class="chip ${c.statut==='En cours'?'ok':'mut'}">${c.statut}</span> ${delaiChip(c)}`,actions)+kp+filters+legend+
    `<div class="tbl-wrap"><table class="t camp-t"><thead><tr><th>Membre</th><th class="num">Cotisation</th>${Array.from({length:c.nbMois},(_,i)=>`<th style="text-align:center;${i===s.cur-1&&c.statut==='En cours'?'color:var(--gold)':''}">M${i+1}</th>`).join('')}<th class="num">Versé</th><th class="num">Reste</th><th>Statut</th><th></th></tr></thead><tbody>
    ${rows.map(({l,m,x})=>`<tr><td><div class="name">${esc(fullName(m))}</div><div class="muted">${esc(m.fonction)}</div></td><td class="num">${fmtN(l.montant)}</td>
      ${x.months.map(mo=>`<td style="text-align:center;padding:6px 3px"><span class="cell ${mo.state}" title="Mois ${mo.i+1} : ${fmtN(mo.paid)} / ${fmtN(mo.due)}">${mo.state==='avenir'?fmtN(mo.due):mo.state==='paye'?'✓ '+fmtN(mo.paid):fmtN(mo.paid)}</span></td>`).join('')}
      <td class="num"><b>${fmtN(x.verse)}</b></td><td class="num">${fmtN(x.reste)}</td><td>${statutChip(x.statut)}</td><td><button class="link" data-act="memberSit" data-c="${c.id}" data-m="${m.id}">Voir<i data-lucide="chevron-right" class="i i-sm"></i></button></td></tr>`).join('')||`<tr><td colspan="${c.nbMois+7}" class="empty">Aucun membre ne correspond.</td></tr>`}
    </tbody></table></div>`;
  }
  return `<div class="row mb" style="gap:6px;flex-wrap:wrap">${actions}</div>${kp}${filters}${legend}
  <div class="card" style="padding:4px 14px">${rows.map(({l,m,x})=>`<div class="list-item" style="display:block;cursor:pointer" data-act="memberSit" data-c="${c.id}" data-m="${m.id}"><div class="row between"><div style="min-width:0"><div class="name ellip">${esc(fullName(m))}</div><div class="muted">${fmtN(x.verse)} / ${fmtN(l.montant)}${x.retard?` · retard ${fmtN(x.retard)}`:''}</div></div>${statutChip(x.statut)}</div><div class="dots">${x.months.map(mo=>`<i class="${mo.state}"></i>`).join('')}</div></div>`).join('')||'<div class="empty">Aucun membre ne correspond.</div>'}</div>`;
}
function vCampForm(p,cid){
  const c=cid?camp(cid):null;const mem=DB.members.filter(m=>m.actif||(c&&c.lignes.some(l=>l.memberId===m.id))).sort((a,b)=>a.nom.localeCompare(b.nom));
  const back=p.mode==='web'?`<button class="link mb" data-act="back"><i data-lucide="arrow-left" class="i i-sm"></i>Retour</button>`:'';
  const lineOf=mid=>c&&c.lignes.find(l=>l.memberId===mid);
  const paid=mid=>c?DB.payments.filter(x=>x.campagneId===c.id&&x.memberId===mid&&!x.annule).reduce((a,x)=>a+x.montant,0):0;
  return back+wTitle(p,c?'Modifier la campagne':'Lancer une campagne',c?'Corrige le nom, les dates, les montants ou les membres. Chaque changement est inscrit au journal.':'Choisis la date de début et la date de fin : l\'application calcule le nombre de mois (ou de semaines) et ce que chacun doit verser par période.')+
  `${c?`<div class="info gold mb">Les paiements déjà validés sont conservés : l'application les répartit à nouveau sur le nouvel échéancier. Un membre qui a déjà payé ne peut pas être retiré.</div>`:''}
  <div class="card mb">
    <div class="field"><label>Nom de la campagne</label><input class="inp" id="nc-nom-${p.id}" value="${esc(c?c.nom:'')}" placeholder="Ex. Moisson 2027, Projet investissement…"></div>
    <div class="${p.mode==='web'?'two':''}" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Début</label><input class="inp" type="date" id="nc-deb-${p.id}" value="${c?(c.debutJ||c.debut+'-01'):today()}" data-act-input="ncRecalc"></div>
      <div class="field"><label>Fin (dernier délai)</label><input class="inp" type="date" id="nc-fin-${p.id}" value="${c?campFin(c):dIso(new Date(new Date().getFullYear(),new Date().getMonth()+10,0))}" data-act-input="ncRecalc"></div></div>
    <div class="field"><label>Rythme des versements <span class="muted" style="font-weight:500">(proposé selon la durée, tu peux changer)</span></label><div class="pills" id="nc-per-${p.id}" ${c?'data-manuel="1"':''}>${[['jour','Chaque jour'],['semaine','Chaque semaine'],['mois','Chaque mois'],['unique','En une fois']].map(([v,l])=>`<button type="button" class="pill ${(c?.periode||'mois')===v?'on':''}" data-act="ncPer" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="info mb" id="nc-dur-${p.id}" style="font-size:13px">—</div>
    <div class="field"><label>Montant pour tous (facultatif)</label><div class="row"><input class="inp" id="nc-all-${p.id}" inputmode="numeric" placeholder="Ex. 20000"><button class="btn sec sm" data-act="ncApplyAll">Appliquer</button></div></div>
  <div class="muted">Après la date de fin, la campagne <b>reste ouverte</b> : elle est marquée « Délai dépassé » et les retardataires peuvent encore payer. Si un montant ne se divise pas juste, la dernière période absorbe la différence.</div></div>
  <div class="card" style="padding:4px 0"><div class="row between" style="padding:10px 14px;border-bottom:1px solid var(--line)"><label class="row" style="gap:8px;font-weight:700"><input type="checkbox" ${!c?'checked':''} data-act="ncAll"> Membres (${mem.length})</label><span class="muted">Montant total → par période</span></div>
  <div style="max-height:${p.mode==='web'?'420px':'none'};overflow:auto">${mem.map(m=>{const l=lineOf(m.id);const pd=paid(m.id);const inn=c?!!l:true;return `<div class="row" style="padding:8px 14px;border-bottom:1px solid var(--line);gap:10px"><input type="checkbox" ${inn?'checked':''} ${pd?'disabled title="A déjà payé"':''} class="nc-chk" data-m="${m.id}"><div style="flex:1;min-width:0"><div class="name ellip" style="font-size:13px">${esc(fullName(m))}</div><div class="muted">${pd?`Déjà versé : ${fmtN(pd)}`:esc(m.fonction)}</div></div><input class="inp nc-amt" data-m="${m.id}" inputmode="numeric" style="width:${p.mode==='web'?'130px':'96px'};text-align:right" placeholder="0" value="${l?l.montant:(c?'':lastAmount(m.id)||'')}" data-act-input="ncRecalc"><div class="muted nc-prev" data-m="${m.id}" style="width:${p.mode==='web'?'110px':'62px'};text-align:right"></div></div>`}).join('')}</div>
  <div class="row between" style="padding:12px 14px"><div><div class="muted">Total attendu</div><div class="name" id="nc-tot-${p.id}" style="font-size:17px">—</div></div><button class="btn gold" data-act="${c?'ncSave':'ncLaunch'}" data-id="${c?c.id:''}"><i data-lucide="${c?'save':'rocket'}" class="i"></i>${c?'Enregistrer les modifications':'Lancer la campagne'}</button></div></div>`;
}
function lastAmount(mid){for(let i=DB.campaigns.length-1;i>=0;i--){const l=DB.campaigns[i].lignes.find(l=>l.memberId===mid);if(l)return l.montant}return 0}

/* ---- Jeunes ---- */
function filteredMembers(p){
  const f=p.f;let L=DB.members.slice();
  if((f.ma||'actif')==='actif')L=L.filter(m=>m.actif);else if(f.ma==='inactif')L=L.filter(m=>!m.actif);
  if(f.md&&f.md!=='all')L=L.filter(m=>depsOf(m).includes(f.md));
  if(f.mb==='oui')L=L.filter(m=>m.baptise);if(f.mb==='non')L=L.filter(m=>!m.baptise);
  if(f.mr&&f.mr!=='all'){L=L.filter(m=>{const a=acctOfMember(m.id);return f.mr==='bloque'?a&&!a.actif:f.mr==='aucun'?!a:f.mr==='bureau'?a&&a.roleId!=='membre':a&&a.roleId===f.mr})}
  if(f.mq){const q=norm(f.mq);L=L.filter(m=>norm(fullName(m)+m.tel+m.email+m.profession+m.habitation+m.fonction).includes(q))}
  return L.sort((a,b)=>a.nom.localeCompare(b.nom));
}
function vMembres(p){
  const g=can(p,'membres_gerer');const f=p.f;
  const L=filteredMembers(p);const act=DB.members.filter(m=>m.actif);
  const byD={};act.forEach(m=>{const ds=depsOf(m);(ds.length?ds:['Non renseigné']).forEach(d=>byD[d]=(byD[d]||0)+1)});
  const actions=(g?`<button class="btn ${sm(p)}" data-act="addMember"><i data-lucide="user-plus" class="i"></i>Enregistrer un jeune</button><label class="btn sec ${sm(p)}" style="cursor:pointer"><i data-lucide="upload" class="i"></i>Importer Excel<input type="file" accept=".xlsx,.xls,.csv" data-import="${p.id}" hidden></label><button class="btn sec ${sm(p)}" data-act="template"><i data-lucide="file-spreadsheet" class="i"></i>Modèle</button>`:'')+(can(p,'exports')?`<button class="btn sec ${sm(p)}" data-act="exportMembers"><i data-lucide="download" class="i"></i>Exporter (liste filtrée)</button>`:'');
  const sec=g?(f.msec||'liste'):'liste';
  const segs=g?`<div class="seg2 mb">${[['liste','Les jeunes'],['departements','Départements'],['fonctions','Fonctions']].map(([k,l])=>`<button class="${sec===k?'on':''}" data-act="setF" data-k="msec" data-v="${k}">${l}</button>`).join('')}</div>`:'';
  if(sec==='departements'||sec==='fonctions')return wTitle(p,'Jeunes','Prépare les listes utilisées dans le formulaire d\'enregistrement.')+segs+`<div class="muted mb">${sec==='departements'?'Saisis les départements de l\'église. Ils apparaissent dans la liste déroulante « Département » quand on enregistre un jeune.':'Saisis les fonctions dans la jeunesse. Elles apparaissent dans la liste déroulante « Fonction » quand on enregistre un jeune.'}</div>`+(sec==='departements'?listCard(p,'departements','Départements de l\'église','building-2','Ex. Chorale, Accueil, Intercession…'):listCard(p,'fonctions','Fonctions dans la jeunesse','badge-check','Ex. Responsable chorale…'));
  return wTitle(p,'Registre des jeunes',`${act.length} jeunes enregistrés${g?'':' · lecture seule'}`,actions)+segs+
  `<div class="kpis"><div class="kpi"><div class="l">Jeunes actifs</div><div class="v">${act.length}</div></div><div class="kpi"><div class="l">Baptisés</div><div class="v">${act.filter(m=>m.baptise).length}</div><div class="s">${act.length?Math.round(act.filter(m=>m.baptise).length/act.length*100):0} %</div></div>${p.mode==='web'?`<div class="kpi"><div class="l">Avec un accès</div><div class="v">${act.filter(m=>acctOfMember(m.id)).length}</div></div><div class="kpi"><div class="l">Bureau</div><div class="v">${DB.accounts.filter(a=>a.roleId!=='membre'&&a.actif).length}</div></div>`:''}</div>
  <div class="card mb"><h3><i data-lucide="building-2" class="i"></i>Par département</h3><div class="pills">${Object.entries(byD).sort((a,b)=>b[1]-a[1]).map(([d,n])=>`<button class="pill ${f.md===d?'on':''}" data-act="setF" data-k="md" data-v="${f.md===d?'all':esc(d)}">${esc(d)}<span class="n" style="background:#eef1ef;border-radius:99px;padding:0 6px;margin-left:5px;font-size:11px">${n}</span></button>`).join('')}</div></div>
  <div class="filters">
    <select class="inp" data-fk="md"><option value="all">Tous les départements</option>${DB.settings.departements.map(d=>`<option ${f.md===d?'selected':''}>${esc(d)}</option>`).join('')}</select>
    <select class="inp" data-fk="mb"><option value="all">Baptisés et non baptisés</option><option value="oui" ${f.mb==='oui'?'selected':''}>Baptisés</option><option value="non" ${f.mb==='non'?'selected':''}>Non baptisés</option></select>
    <select class="inp" data-fk="mr"><option value="all">Tous les accès</option><option value="bureau" ${f.mr==='bureau'?'selected':''}>Membres du bureau</option><option value="membre" ${f.mr==='membre'?'selected':''}>Accès membre</option><option value="aucun" ${f.mr==='aucun'?'selected':''}>Sans accès</option><option value="bloque" ${f.mr==='bloque'?'selected':''}>Comptes bloqués</option></select>
    <select class="inp" data-fk="ma"><option value="actif">Actifs</option><option value="inactif" ${f.ma==='inactif'?'selected':''}>Inactifs</option><option value="tous" ${f.ma==='tous'?'selected':''}>Actifs et inactifs</option></select></div>
  <div class="search mb"><i data-lucide="search" class="i"></i><input class="inp" placeholder="Nom, téléphone, profession, quartier…" data-fk="mq" data-live="1" value="${esc(f.mq||'')}"></div>
  <div class="count-line">${L.length} jeune${L.length>1?'s':''} affiché${L.length>1?'s':''}</div>
  ${p.mode==='web'?`<div class="tbl-wrap"><table class="t"><thead><tr><th>Nom &amp; prénoms</th><th>Téléphone</th><th>Anniversaire</th><th>Département</th><th>Baptisé</th><th>Profession</th><th>Accès</th></tr></thead><tbody>
    ${L.map(m=>`<tr style="cursor:pointer" data-act="openMember" data-id="${m.id}"><td><div class="row"><div class="avatar sm" style="${m.actif?'':'background:#bbb'}">${initials(m.nom)}</div><div><div class="name">${esc(fullName(m))}</div><div class="muted">${esc(m.fonction)}</div></div></div></td><td>${esc(m.tel)||'<span class="muted">—</span>'}</td><td>${fanniv(m.anniv)||'<span class="muted">—</span>'}</td><td>${m.departement?`<span class="chip mut">${esc(m.departement)}</span>`:'<span class="muted">—</span>'}</td><td>${m.baptise?'<span class="chip ok">Oui</span>':'<span class="chip mut">Non</span>'}</td><td>${esc(m.profession)}</td><td>${roleChip(acctOfMember(m.id))}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">Aucun jeune ne correspond.</td></tr>'}
  </tbody></table></div>`
  :`<div class="card" style="padding:4px 14px">${L.map(m=>`<div class="list-item" data-act="openMember" data-id="${m.id}" style="cursor:pointer"><div class="avatar sm" style="${m.actif?'':'background:#bbb'}">${initials(m.nom)}</div><div class="grow"><div class="name ellip">${esc(fullName(m))}</div><div class="muted ellip">${esc(m.departement||'')}${m.anniv?' · 🎂 '+fanniv(m.anniv):''}</div></div>${acctOfMember(m.id)&&acctOfMember(m.id).roleId!=='membre'?roleChip(acctOfMember(m.id)):''}<i data-lucide="chevron-right" class="i" style="color:var(--ink-3)"></i></div>`).join('')||'<div class="empty">Aucun jeune ne correspond.</div>'}</div>`}`;
}
function statutLabel(a,m){if(m&&!m.actif)return'<span class="chip mut">Inactif</span>';if(a&&!a.actif)return'<span class="chip late">Bloqué</span>';const r=a&&role(a.roleId);return r&&r.id!=='membre'?`<span class="chip gold">${esc(r.id==='president'?'Président':r.nom)}</span> <span class="chip mut">Membre</span>`:'<span class="chip mut">Membre</span>'}
function vMemberFiche(p,mid){
  const m=member(mid);const a=acctOfMember(mid);const g=can(p,'membres_gerer');const ac=can(p,'acces_gerer');
  const cs=DB.campaigns.filter(c=>c.lignes.some(l=>l.memberId===mid));
  const back=p.mode==='web'?`<button class="link mb" data-act="back"><i data-lucide="arrow-left" class="i i-sm"></i>Registre des jeunes</button>`:'';
  const contact=`<div class="card mb"><h3><i data-lucide="send" class="i"></i>Contacter</h3>${chans(m,`Bonjour ${prenomOf(m)}, `,{size:''})}</div>`;
  const info=`<div class="card mb"><div class="row mb" style="gap:14px"><div class="avatar" style="width:56px;height:56px;font-size:18px;${m.actif?'':'background:#bbb'}">${initials(m.nom)}</div><div style="flex:1;min-width:0"><div class="name" style="font-size:17px">${esc(fullName(m))}</div><div class="muted">${esc(m.fonction)}${m.actif?'':' · <b style="color:var(--red)">Inactif</b>'}</div></div>${g?`<button class="btn sec sm" data-act="editMember" data-id="${m.id}"><i data-lucide="pencil" class="i i-sm"></i>Modifier</button>`:''}</div>
    <div class="kv"><span>Téléphone</span><b>${esc(m.tel)||'—'}</b></div><div class="kv"><span>E-mail</span><b>${esc(m.email)||'—'}</b></div>
    <div class="kv"><span>Anniversaire</span><b>${fanniv(m.anniv)||'—'}</b></div><div class="kv"><span>Baptisé(e)</span><b>${m.baptise?'Oui':'Non'}</b></div>
    <div class="kv"><span>Profession</span><b>${esc(m.profession)||'—'}</b></div><div class="kv"><span>Lieu d'habitation</span><b>${esc(m.habitation)||'—'}</b></div>
    <div class="kv"><span>Département</span><b>${esc(m.departement)||'—'}</b></div><div class="kv"><span>Membre depuis</span><b>${fdate(m.adhesion)}</b></div>
    <div class="kv"><span>Statut</span><b>${statutLabel(a,m)}</b></div>${a&&!a.actif&&a.motif?`<div class="kv"><span>Motif du blocage</span><b>${esc(a.motif)}</b></div>`:''}<div class="kv"><span>Dernière connexion</span><b>${a&&a.derniere?fdt(a.derniere):'Jamais connecté'}</b></div></div>`;
  const acc=!ac?'':`<div class="card mb"><h3><i data-lucide="key-round" class="i"></i>Accès à l'application</h3>
    ${a?`<div class="kv"><span>Rôle</span><b>${roleChip(a)}</b></div><div class="kv"><span>Identifiant</span><b>${esc([m.tel,m.email].filter(Boolean).join(' ou '))}</b></div><div class="kv"><span>Mot de passe</span><b>${a.mustChange?'Provisoire (pas encore changé)':'Choisi par le membre'}</b></div><div class="kv"><span>Dernière connexion</span><b>${a.derniere?fdt(a.derniere):'Jamais'}</b></div>`
      :'<div class="muted mb">Ce jeune n\'a pas encore d\'accès.</div>'}
    ${ac?`<div class="row mt" style="gap:8px;flex-wrap:wrap">${a?(a.roleId!=='president'?`<button class="btn sm" data-act="giveRole" data-m="${m.id}"><i data-lucide="user-cog" class="i i-sm"></i>Changer le rôle</button><button class="btn sec sm" data-act="resetPwd" data-id="${a.id}"><i data-lucide="refresh-cw" class="i i-sm"></i>Nouveau mot de passe</button>${a.actif?`<button class="btn danger sm" data-act="blockAcct" data-id="${a.id}"><i data-lucide="lock" class="i i-sm"></i>Bloquer le compte</button>`:`<button class="btn sm" data-act="unblockAcct" data-id="${a.id}"><i data-lucide="unlock" class="i i-sm"></i>Débloquer le compte</button>`}`:'<span class="muted">Super admin : ce compte ne peut pas être modifié ici.</span>'):`<button class="btn sm" data-act="createAccess" data-m="${m.id}"><i data-lucide="key-round" class="i i-sm"></i>Créer son accès membre</button><button class="btn sec sm" data-act="giveRole" data-m="${m.id}"><i data-lucide="user-cog" class="i i-sm"></i>Lui attribuer un rôle du bureau</button>`}</div>`:''}</div>`;
  let st=(g||ac)&&m.id!==sMember(p).id&&!(a&&a.roleId==='president')?`<div class="card mb"><h3><i data-lucide="user-check" class="i"></i>Statut dans la jeunesse</h3>
    <div class="row between"><div>${m.actif?'<span class="chip ok">Actif</span>':'<span class="chip mut">Inactif</span>'}<div class="muted mt" style="max-width:420px">${m.actif?'Actif : il apparaît dans le registre, les campagnes, les relances et les anniversaires.':'Inactif : il ne fait plus partie de la jeunesse. Son historique est gardé, mais il n\'apparaît plus dans les listes et ne peut plus se connecter.'}</div></div>
    ${m.actif?`<button class="btn sec sm" data-act="setInactive" data-id="${m.id}">Rendre inactif</button>`:`<button class="btn sm" data-act="setActive" data-id="${m.id}">Réactiver</button>`}</div></div>`:'';
  const cot=`<div class="card"><h3><i data-lucide="wallet" class="i"></i>Cotisations</h3>${cs.map(c=>{const s=situation(c.id,mid);return `<div class="list-item" data-act="opencamp" data-id="${c.id}" style="cursor:pointer"><div class="grow"><div class="name">${esc(c.nom)}</div><div class="muted">${fmtN(s.verse)} / ${fmtN(s.total)} · reste ${fmtN(s.reste)}</div></div>${statutChip(s.statut)}</div>`}).join('')||'<div class="empty">Aucune campagne.</div>'}</div>`;
  const quick=(ac&&a&&a.roleId!=='president')||((g||ac)&&!(a&&a.roleId==='president')&&m.id!==sMember(p).id)?`<div class="card mb" style="background:#fff7f5;border-color:#f3d5cf"><h3><i data-lucide="shield-alert" class="i"></i>Actions sur ce compte</h3><div class="row" style="gap:8px;flex-wrap:wrap">
    ${ac&&a&&a.roleId!=='president'?(a.actif?`<button class="btn danger sm" data-act="blockAcct" data-id="${a.id}"><i data-lucide="lock" class="i i-sm"></i>Bloquer le compte</button>`:`<button class="btn sm" data-act="unblockAcct" data-id="${a.id}"><i data-lucide="unlock" class="i i-sm"></i>Débloquer le compte</button>`):''}
    ${m.actif?`<button class="btn sec sm" data-act="setInactive" data-id="${m.id}"><i data-lucide="user-x" class="i i-sm"></i>Rendre inactif</button>`:`<button class="btn sm" data-act="setActive" data-id="${m.id}"><i data-lucide="user-check" class="i i-sm"></i>Réactiver</button>`}</div></div>`:'';
  st='';
  return back+quick+(p.mode==='web'?`<div class="grid" style="grid-template-columns:1.1fr 1fr;align-items:start"><div>${info}${contact}</div><div>${acc}${st}${can(p,'campagnes_voir')?cot:''}</div></div>`:info+contact+acc+st+(can(p,'campagnes_voir')?cot:''));
}

/* ---- Rôles & accès ---- */
function vAcces(p){
  const bureau=DB.accounts.filter(a=>a.roleId!=='membre').sort((a,b)=>(a.roleId==='president'?-1:0)-(b.roleId==='president'?-1:0));
  const withAcc=DB.members.filter(m=>m.actif&&acctOfMember(m.id)).length,without=DB.members.filter(m=>m.actif&&!acctOfMember(m.id)&&(m.tel||m.email)).length;
  const noContact=DB.members.filter(m=>m.actif&&!m.tel&&!m.email).length;
  const missing=DB.roles.filter(r=>!['president','membre'].includes(r.id)&&!DB.accounts.some(a=>a.roleId===r.id&&a.actif));
  return wTitle(p,'Rôles et accès','Seul le président crée, bloque ou débloque les accès. Personne ne peut s\'inscrire seul.',`<button class="btn ${sm(p)}" data-act="giveRole"><i data-lucide="user-cog" class="i"></i>Attribuer un rôle</button>`)+
  `${missing.length?`<div class="info gold mb"><b>À attribuer :</b> ${missing.map(r=>esc(r.nom)).join(', ')}. Choisis un jeune du registre pour ce rôle.</div>`:''}
  <div class="card mb"><h3><i data-lucide="shield" class="i"></i>Membres du bureau<span class="r">${bureau.length}</span></h3>
  ${bureau.map(a=>{const m=member(a.memberId);return `<div class="list-item"><div class="avatar sm gold">${initials(m.nom)}</div><div class="grow"><div class="name ellip">${esc(fullName(m))}</div><div class="muted ellip">${esc([m.tel,m.email].filter(Boolean).join(' · '))} · ${a.derniere?'connecté le '+fdate(a.derniere):'jamais connecté'}</div></div>${roleChip(a)}${a.roleId!=='president'?(a.actif?`<button class="btn danger sm" data-act="blockAcct" data-id="${a.id}" title="Bloquer"><i data-lucide="lock" class="i i-sm"></i></button>`:`<button class="btn sm" data-act="unblockAcct" data-id="${a.id}" title="Débloquer"><i data-lucide="unlock" class="i i-sm"></i></button>`):''}<button class="link" data-act="openMember" data-id="${m.id}"><i data-lucide="chevron-right" class="i"></i></button></div>`}).join('')}</div>
  <div class="card mb"><h3><i data-lucide="lock" class="i"></i>Bloquer un compte</h3><div class="muted mb">Choisis le jeune dont tu veux bloquer l'accès.</div><div class="row" style="gap:8px"><select class="inp" id="blk-pick-${p.id}">${DB.accounts.filter(a=>a.actif&&a.roleId!=='president').map(a=>member(a.memberId)).sort((x,y)=>x.nom.localeCompare(y.nom)).map(m=>`<option value="${acctOfMember(m.id).id}">${esc(fullName(m))}</option>`).join('')}</select><button class="btn danger" data-act="blockPick"><i data-lucide="lock" class="i i-sm"></i>Bloquer</button></div></div>
  ${(()=>{const B=DB.accounts.filter(a=>!a.actif);return B.length?`<div class="card mb"><h3><i data-lucide="lock" class="i"></i>Comptes bloqués<span class="r">${B.length}</span></h3>${B.map(a=>{const m=member(a.memberId);return `<div class="list-item"><div class="avatar sm" style="background:#bbb">${initials(m.nom)}</div><div class="grow"><div class="name ellip">${esc(fullName(m))}</div><div class="muted">${esc(a.motif||'Sans motif')}</div></div><button class="btn sm" data-act="unblockAcct" data-id="${a.id}">Débloquer</button></div>`}).join('')}</div>`:''})()}
  <div class="card mb"><h3><i data-lucide="users" class="i"></i>Accès des jeunes</h3>
  <div class="muted mb">${withAcc} jeunes ont un accès. ${without} n'en ont pas encore.${noContact?` ${noContact} n'ont ni téléphone ni e-mail (impossible de créer leur accès).`:''}</div>
  <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sec sm" data-act="createAll" ${without?'':'disabled'}><i data-lucide="key-round" class="i i-sm"></i>Créer les accès manquants (${without})</button><button class="btn sec sm" data-act="exportCreds"><i data-lucide="download" class="i i-sm"></i>Liste des accès (Excel)</button></div></div>
  <div class="card"><h3><i data-lucide="sliders-horizontal" class="i"></i>Rôles et permissions<span class="r"><button class="link" data-act="newRole"><i data-lucide="plus" class="i i-sm"></i>Créer un rôle</button></span></h3>
  <div class="tbl-wrap" style="border:0"><table class="t perm-t"><thead><tr><th>Permission</th>${DB.roles.map(r=>`<th style="white-space:normal;min-width:80px">${esc(r.id==='president'?'Président':r.nom)}${!r.systeme?`<br><button class="link" data-act="editRole" data-id="${r.id}">modifier</button>`:''}</th>`).join('')}</tr></thead><tbody>
  ${PERMS.map(([k,l])=>`<tr><td>${l}</td>${DB.roles.map(r=>`<td>${r.id==='president'||r.perms.includes(k)?'<i data-lucide="check" class="i i-sm" style="color:var(--green)"></i>':'<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}
  <tr><td>Voir sa propre cotisation</td>${DB.roles.map(()=>'<td><i data-lucide="check" class="i i-sm" style="color:var(--green)"></i></td>').join('')}</tr></tbody></table></div></div>`;
}

/* ---- Journal / Paramètres / Plus / Profil ---- */
function vJournal(p,limit){
  const f=p.f;let j=DB.journal.slice().reverse();
  const types=[['all','Tout'],['paiement','Paiements'],['campagne','Campagnes'],['membre','Jeunes'],['acces','Accès'],['relance','Relances']];
  const t=f.jt||'all';
  if(t!=='all')j=j.filter(e=>t==='paiement'?/paiement/i.test(e.action):t==='campagne'?/campagne|montant/i.test(e.action):t==='membre'?/membre|import|jeune/i.test(e.action)&&!/rôle|accès|mot de passe/i.test(e.action):t==='acces'?/rôle|accès|mot de passe|connexion/i.test(e.action):/relance/i.test(e.action));
  if(f.jq){const q=norm(f.jq);j=j.filter(e=>norm(e.action+e.detail+e.auteur).includes(q))}
  return (limit?'':wTitle(p,'Journal des opérations','Tout est tracé : qui a fait quoi, et quand. Rien ne peut être effacé.',can(p,'exports')?`<button class="btn sec ${sm(p)}" data-act="exportJournal"><i data-lucide="download" class="i"></i>Exporter</button>`:'')+
    `<div class="filters">${pills(p,'jt',types,'all')}</div><div class="search mb"><i data-lucide="search" class="i"></i><input class="inp" placeholder="Rechercher dans le journal" data-fk="jq" data-live="1" value="${esc(f.jq||'')}"></div>`)+
  `<div class="card" style="padding:4px 16px">${j.slice(0,limit||150).map(e=>`<div class="list-item"><div class="avatar sm" style="background:${/annul|désactiv/i.test(e.action)?'var(--red)':/campagne|montant|rôle|accès/i.test(e.action)?'var(--gold)':'var(--green)'};color:#fff"><i data-lucide="${/paiement/i.test(e.action)?'hand-coins':/rôle|accès|mot de passe/i.test(e.action)?'key-round':/relance/i.test(e.action)?'megaphone':/membre|import/i.test(e.action)?'user':'flag'}" class="i i-sm"></i></div><div class="grow"><div class="name" style="font-size:13px">${esc(e.action)}</div><div class="muted">${esc(e.detail)}</div><div class="muted" style="font-size:11px">${fdt(e.t)} · ${esc(e.auteur)}</div></div></div>`).join('')||'<div class="empty">Rien à afficher.</div>'}</div>`;
}
function listCard(p,k,title,icon,ph){const L=DB.settings[k];const used=v=>DB.members.filter(m=>k==='departements'?depsOf(m).includes(v):m.fonction===v).length;
  return `<div class="card mb"><h3><i data-lucide="${icon}" class="i"></i>${title}<span class="r">${L.length}</span></h3>
  <form class="row mb" data-listadd="${k}" style="gap:8px"><input class="inp" id="la-${k}-${p.id}" placeholder="${ph}"><button class="btn" type="submit"><i data-lucide="plus" class="i i-sm"></i>Ajouter</button></form>
  ${L.map(v=>`<div class="list-item" style="padding:9px 0"><div class="grow"><div class="name" style="font-size:13.5px">${esc(v)}</div><div class="muted">${used(v)} jeune${used(v)>1?'s':''}</div></div><button class="link" style="color:var(--red)" data-act="listRemove" data-k="${k}" data-v="${esc(v)}"><i data-lucide="trash-2" class="i i-sm"></i></button></div>`).join('')||'<div class="empty">Liste vide : ajoute le premier élément.</div>'}</div>`}
function vParams(p){
  const on=DB.settings.paiementIntegre;
  return wTitle(p,'Paramètres','Réservé au président (super admin).')+`<div class="card mb"><h3><i data-lucide="smartphone" class="i"></i>Paiement Mobile Money dans l'application</h3>
  <div class="row between"><div><div class="name" style="font-size:13.5px">Activer pour tous les comptes</div><div class="muted" style="max-width:520px">Le bouton « Payer ma cotisation » est toujours visible, avec « Payer en espèces (QR code) » et « Montrer une capture ». Activé, il propose en plus « Payer par Mobile Money » : le paiement s'enregistre seul, sans saisie par la trésorière.</div></div><button class="toggle ${on?'on':''}" data-act="togglePay"></button></div>
  <div class="name mt" style="font-size:13px">Opérateurs proposés aux membres</div>
  ${Object.keys(DB.settings.operateurs).map(o=>`<div class="row between" style="padding:7px 0;border-bottom:1px solid #f0f2f1"><span class="row" style="gap:10px">${opLogo(o,30)}${o}</span><button class="toggle ${DB.settings.operateurs[o]?'on':''}" data-act="toggleOp" data-v="${o}"></button></div>`).join('')}
  <div class="name mt" style="font-size:13px">Connexion au service de paiement (API)</div>
  <div class="kv"><span>Agrégateur</span><b>À choisir (ex. un agrégateur ivoirien qui couvre Orange, MTN, Moov et Wave)</b></div>
  <div class="kv"><span>Clés API</span><b>${DB.settings.apiStatut==='prod'?'<span class="chip ok">Configurées (production)</span>':'<span class="chip part">Mode test (simulation)</span>'}</b></div>
  <div class="info gold mt" style="font-size:12px">Les clés API ne sont jamais stockées dans l'application du téléphone : elles restent sur le serveur, par sécurité. Le serveur reçoit la confirmation de l'opérateur et enregistre le paiement automatiquement.</div></div>

  <div class="card"><div class="name mb">Moyens de paiement suivis</div><div class="pills">${MOYENS.map(m=>`<span class="chip mut" style="font-size:12.5px;padding:6px 11px">${m}</span>`).join('')}</div></div>`;
}
function vPlus(p){
  const t=tabsFor(p).slice(4);
  return `<div class="card mb" style="padding:4px 16px">${t.map(x=>`<button class="menu-link" data-act="tab" data-tab="${x[0]}"><i data-lucide="${x[2]}" class="i" style="color:var(--green)"></i>${x[1]}<i data-lucide="chevron-right" class="i" style="margin-left:auto;color:var(--ink-3)"></i></button>`).join('')}</div>
  <button class="btn sec block" data-act="logout"><i data-lucide="log-out" class="i"></i>Se déconnecter</button>`;
}
function vNotifs(p){
  const a=sAcct(p);const{B,L}=notifsFor(a);const unread=p.nSnap||new Set(L.filter(n=>!n.read.includes(a.id)).map(n=>n.id));
  setTimeout(()=>{let ch=false;L.forEach(n=>{if(!n.read.includes(a.id)){n.read.push(a.id);ch=true}});if(!(a.seenB||'').includes(today())){a.seenB=today();ch=true}if(ch){persist()}},0);
  const ic={messages:'send',paiements:'hand-coins',campagnes:'layers',relances:'megaphone',anniversaires:'cake',evenements:'calendar-days',taches:'list-todo'};
  const back=p.mode==='web'?`<button class="link mb" data-act="back"><i data-lucide="arrow-left" class="i i-sm"></i>Retour</button>`:'';
  return back+wTitle(p,'Notifications','')+
  `<div class="row between mb"><div class="muted">${unread.size} nouvelle${unread.size>1?'s':''}</div><button class="link" data-act="tab" data-tab="profil"><i data-lucide="settings-2" class="i i-sm"></i>Réglages des notifications</button></div>
  ${B.length?`<div class="card mb" style="background:var(--gold-soft);border-color:#f0dfb8"><h3><i data-lucide="cake" class="i"></i>Anniversaires</h3>${B.map(b=>`<div class="list-item"><div class="avatar sm gold">🎂</div><div class="grow"><div class="name" style="font-size:13px">${esc(b.title)}</div><div class="muted">${esc(b.body)}</div></div>${b.m?chans(b.m,`Joyeux anniversaire ${prenomOf(b.m)} ! 🎉 Toute la jeunesse te souhaite une belle journée.`,{labels:false}):''}</div>`).join('')}</div>`:''}
  <div class="card" style="padding:4px 16px">${L.slice(0,60).map(n=>`<div class="list-item" style="${unread.has(n.id)?'background:linear-gradient(90deg,var(--green-soft),transparent);margin:0 -16px;padding-left:16px;padding-right:16px':''}"><div class="avatar sm" style="background:${n.type==='relances'?'var(--red)':n.type==='campagnes'?'var(--gold)':n.type==='messages'?'#2f6fd6':n.type==='evenements'?'#7a4fc9':n.type==='taches'?'#c2410c':'var(--green)'};color:#fff"><i data-lucide="${ic[n.type]}" class="i i-sm"></i></div><div class="grow"><div class="name" style="font-size:13px">${esc(n.title)}${unread.has(n.id)?' <span class="chip ok" style="font-size:10px;padding:1px 6px">nouveau</span>':''}</div><div class="muted">${esc(n.body)}</div><div class="muted" style="font-size:11px">${fdt(n.t)}</div></div></div>`).join('')||'<div class="empty">Aucune notification.</div>'}</div>`;
}
function vProfil(p){
  const m=sMember(p),a=sAcct(p);
  return wTitle(p,'Mon profil','')+`<div class="${p.mode==='web'?'grid':''}" style="${p.mode==='web'?'grid-template-columns:1fr 1fr;align-items:start':''}"><div class="card mb"><div style="text-align:center"><div class="avatar" style="margin:0 auto 10px;width:56px;height:56px;font-size:18px">${initials(m.nom)}</div><div class="name" style="font-size:16px">${esc(fullName(m))}</div><div class="mb">${roleChip(a)}</div></div>
    <div class="kv"><span>Téléphone</span><b>${esc(m.tel)||'—'}</b></div><div class="kv"><span>Département</span><b>${esc(m.departement)||'—'}</b></div><div class="kv"><span>Fonction</span><b>${esc(m.fonction)}</b></div><div class="kv"><span>Anniversaire</span><b>${fanniv(m.anniv)||'—'}</b></div><div class="kv"><span>Membre depuis</span><b>${fdate(m.adhesion)}</b></div>
    <div class="field mt"><label>Mon e-mail (sert aussi à me connecter et à récupérer mon mot de passe)</label><div class="row" style="gap:8px"><input class="inp" id="pm-mail-${p.id}" value="${esc(m.email)}" placeholder="nom@mail.com"><button class="btn sec" data-act="saveMail">Enregistrer</button></div></div>
    <div class="muted">Pour changer de numéro de téléphone, demande au président : c'est le bureau qui le met à jour.</div></div>
  <div class="card mb"><h3><i data-lucide="bell" class="i"></i>Notifications</h3><div class="muted mb">Choisis ce que tu veux recevoir sur ton téléphone.</div>
    ${NTYPES.filter(([k])=>k!=='relances'||sRole(p).id==='membre'||sMember(p)).map(([k,l,ic])=>`<div class="row between" style="padding:9px 0;border-bottom:1px solid #f0f2f1"><div class="row" style="gap:10px"><i data-lucide="${ic}" class="i" style="color:var(--green)"></i><div><div class="name" style="font-size:13px">${l}</div><div class="muted">${{messages:'Messages directs envoyés par le bureau',paiements:sRole(p).id==='membre'?'Quand la trésorière enregistre un de tes versements':'Chaque paiement validé',campagnes:'Nouvelles campagnes et changements de montant',relances:'Rappels quand tu as un retard',anniversaires:'Anniversaires des jeunes (le jour J et 7 jours avant)',evenements:'Nouveaux événements, changements et rappels',taches:'Tâches qui te sont confiées et rappels du secrétariat'}[k]}</div></div></div><button class="toggle ${prefsOf(a)[k]?'on':''}" data-act="togglePref" data-k="${k}"></button></div>`).join('')}</div>
  <div class="card mb"><h3><i data-lucide="lock" class="i"></i>Changer mon mot de passe</h3><div class="field"><label>Nouveau mot de passe</label><input class="inp" type="password" id="mc-1-${p.id}"></div><div class="field"><label>Confirmer</label><input class="inp" type="password" id="mc-2-${p.id}"></div><button class="btn block" data-act="mcSave">Enregistrer</button></div></div>
  ${p.mode==='mobile'?'':''}<button class="btn sec block mt" data-act="logout"><i data-lucide="log-out" class="i"></i>Se déconnecter</button>`;
}

/* ---- Membre ---- */
function vMemberHome(p){
  const m=sMember(p);const mid=m.id;const mineAll=DB.campaigns.filter(c=>c.lignes.some(l=>l.memberId===mid));
  if(!mineAll.length)return bdBanner(p)+`<div class="card empty mb">Tu ne fais partie d'aucune campagne pour l'instant.</div>`+banners(p)+eventsBlock(p,3);
  const myTot=c=>c.lignes.find(l=>l.memberId===mid).montant;
  const enc=mineAll.filter(c=>c.statut==='En cours').sort((a,b)=>myTot(b)-myTot(a)||b.nbMois-a.nbMois);
  const closed=mineAll.filter(c=>c.statut!=='En cours');
  const sel=enc.find(c=>c.id===p.sel)||enc[0];
  let h=(p.mode==='web'?wTitle(p,`Bonjour ${esc(prenomOf(m))} 👋`,'Ta situation, mise à jour à chaque paiement validé par la trésorière.'):`<div class="muted mb" style="font-size:13px">Bonjour <b style="color:var(--ink)">${esc(prenomOf(m))}</b> 👋 · ${enc.length} cotisation${enc.length>1?'s':''} en cours</div>`)+bdBanner(p);
  if(sel){const s=situation(sel.id,mid);const pct=Math.min(100,s.verse/s.total*100);
    const top=`<div class="hero big-hero mb"><div class="row between"><div class="l">${sel===enc[0]?'Ma plus grosse cotisation':'Cotisation'} · ${perPos(sel,s.cur)}</div><span class="chip" style="background:rgba(255,255,255,.16);color:#fff">${s.statut}</span></div>
      <div class="hero-name">${esc(sel.nom)}</div>${delaiDepasse(sel)?`<div style="margin:-2px 0 6px"><span class="chip" style="background:#fde2e2;color:#a32020">Délai dépassé · fin le ${fdate(sel.fin)}</span></div>`:''}<div class="big">${fmt(s.verse)}</div><div class="bar"><i style="width:${pct}%"></i></div>
      <div class="split"><div>Ma cotisation<b>${fmt(s.total)}</b></div><div style="text-align:right">Reste à payer<b>${fmt(s.reste)}</b></div></div>
      <div class="hero-pills"><span>${fmt(s.mensualite)} / ${perU(sel)}</span><span>${nbPer(sel)}</span><span>Fin ${fdate(campFin(sel))}</span>${s.retard?`<span style="background:rgba(255,120,120,.25)">Retard ${fmtN(s.retard)}</span>`:''}</div></div>
      ${enc.length>1?`<div class="name" style="font-size:14px;margin:2px 2px 8px">Mes autres cotisations en cours</div><div class="minis mb">${enc.filter(c=>c!==sel).slice(0,2).map(c=>{const t=situation(c.id,mid);return miniCard(c,t.verse/t.total,t.verse,t.reste,t.statut==='En retard'?`<b style="color:var(--red)">Retard ${fmtN(t.retard)}</b>`:t.statut,`data-act="selCamp" data-id="${c.id}"`)}).join('')}</div>`:''}`;
    const status=s.retard?`<div class="info red mb"><b>Tu as ${fmt(s.retard)} de retard.</b><br>Rapproche-toi de la trésorière pour régulariser.</div>`:s.statut==='Soldé'?`<div class="info mb"><b>Bravo, ta cotisation est soldée ! 🎉</b>${s.surplus?`<br>Tu as versé ${fmt(s.surplus)} de plus que prévu.`:''}</div>`:`<div class="info mb"><b>Tu es à jour 👍</b>${s.next?`<br>Prochain : Mois ${s.next.i+1}, il reste ${fmt(s.next.due-s.next.paid)}.`:''}</div>`;
    const pay=(s.reste>0&&payOn()?`<button class="btn gold block mb" data-act="payInApp" data-c="${sel.id}"><i data-lucide="wallet" class="i"></i>Payer ma cotisation</button>`:'')+(typeof qrMember==='function'?qrMember(p,sel.id,s):'');
    const ech=`<div class="card mb"><h3><i data-lucide="calendar-days" class="i"></i>Mon échéancier — ${esc(sel.nom)}</h3>
      <div class="months" style="grid-template-columns:repeat(${Math.min(5,sel.nbMois)},1fr)">${s.months.map(mo=>moCell(s,mo)).join('')}</div>
      <div class="legend mt" style="font-size:11px"><span><i style="background:var(--ok)"></i>Payé</span><span><i style="background:var(--amber)"></i>Partiel</span><span><i style="background:var(--red)"></i>En retard</span><span><i style="background:#d5ddd9"></i>À venir</span></div>${moisDetail(s)}</div>`;
    h+=p.mode==='web'?`<div class="grid" style="grid-template-columns:1fr 1.2fr;align-items:start"><div>${top}</div><div>${status}${pay}${ech}</div></div>`:top+status+pay+ech;
  }
  {const lateC=enc.map(c=>({c,s:situation(c.id,mid)})).filter(o=>o.s.retard>0).sort((x,y)=>y.s.retard-x.s.retard).slice(0,5);
   const last=DB.payments.filter(x=>x.memberId===mid&&!x.annule).slice().sort((a,b)=>b.saisiLe.localeCompare(a.saisiLe)).slice(0,5);
   h+=`<div class="${p.mode==='web'?'grid':''}" style="${p.mode==='web'?'grid-template-columns:1fr 1fr;align-items:start':''}">
   <div class="card mb"><h3><i data-lucide="alarm-clock" class="i"></i>Mes cotisations en retard<span class="r">${lateC.length}</span></h3>
   ${lateC.length?lateC.map(o=>`<div class="list-item" style="cursor:pointer" data-act="openMyCamp" data-id="${o.c.id}"><div class="grow"><div class="name ellip">${esc(o.c.nom)}</div><div class="muted">${perPos(o.c,o.s.cur)} (${moisNom(o.c,o.s.cur-1)}) · pour être à jour : <b style="color:var(--red)">${fmt(o.s.retard)}</b></div></div>${payOn()?`<button class="btn gold sm" data-act="payInApp" data-c="${o.c.id}">Payer</button>`:'<i data-lucide="chevron-right" class="i" style="color:var(--ink-3)"></i>'}</div>`).join(''):'<div class="empty" style="padding:14px">Aucun retard, bravo 👍</div>'}</div>
   ${sRole(p).id==='organisateur'?'':banners(p)}<div class="card mb" style="padding:14px 16px 4px;grid-column:1/-1"><h3><i data-lucide="history" class="i"></i>Mes 5 derniers paiements<span class="r"><button class="link" data-act="tab" data-tab="historique">Tout voir →</button></span></h3>${last.map(x=>payRow(x,p,false,true)).join('')||'<div class="empty">Aucun versement pour l\'instant.</div>'}</div></div>`+(sRole(p).id==='organisateur'?'':eventsBlock(p,3));}
  if(closed.length)h+=`<div class="card"><h3><i data-lucide="archive" class="i"></i>Campagnes terminées</h3>${closed.map(c=>{const s=situation(c.id,mid);return `<div class="list-item"><div class="grow"><div class="name">${esc(c.nom)}</div><div class="muted">${fmtN(s.verse)} / ${fmtN(s.total)}</div></div>${statutChip(s.statut)}</div>`}).join('')}</div>`;
  return h;
}
function bdText(m){return `Joyeux anniversaire ${prenomOf(m)} ! 🎉🎂 Que Dieu te bénisse et t'accorde une très belle année. Toute la jeunesse pense à toi !`}
function bdBanner(p){const me=sMember(p);const L=DB.members.filter(m=>m.actif&&m.anniv&&daysTo(m.anniv)===0);if(!L.length)return'';const mine=L.some(m=>m.id===me.id),others=L.filter(m=>m.id!==me.id);
  return `<div class="bd-banner mb" data-act="tab" data-tab="anniv"><div style="font-size:24px">🎂</div><div style="flex:1;min-width:0"><div class="name" style="font-size:13.5px">${mine?`Joyeux anniversaire ${esc(prenomOf(me))} ! 🎉`:`Aujourd'hui : anniversaire de ${others.map(m=>esc(titleCase(fullName(m)))).join(', ')}`}</div><div class="muted" style="color:#7a5309">${others.length?'Touche ici pour lui souhaiter (WhatsApp, SMS ou message appli)':'Toute la jeunesse te souhaite une belle journée'}</div></div><i data-lucide="chevron-right" class="i"></i></div>`}
function vAnniv(p){
  const me=sMember(p);const act=DB.members.filter(m=>m.actif&&m.anniv);
  const withD=act.map(m=>({m,d:daysTo(m.anniv)})).sort((a,b)=>a.d-b.d);
  const today=withD.filter(o=>o.d===0),week=withD.filter(o=>o.d>0&&o.d<=7),month=withD.filter(o=>o.d>7&&o.d<=31),later=withD.filter(o=>o.d>31);
  const row=(o,big)=>`<div class="list-item"><div class="avatar ${big?'':'sm'} gold" style="${big?'width:46px;height:46px;font-size:20px':''}">${big?'🎂':+o.m.anniv.slice(3)}</div><div class="grow"><div class="name ellip">${esc(titleCase(fullName(o.m)))}${o.m.id===me.id?' (toi)':''}</div><div class="muted">${fanniv(o.m.anniv)}${o.d===0?'':o.d===1?' · demain':' · dans '+o.d+' jours'}${o.m.departement?' · '+esc(o.m.departement):''}</div></div>${o.m.id===me.id?'':chans(o.m,bdText(o.m),{labels:false,act:'bdSent',attrs:`data-m="${o.m.id}"`})}</div>`;
  const grp=today.filter(o=>o.m.id!==me.id);
  return wTitle(p,'Anniversaires','Souhaite l\'anniversaire des jeunes, individuellement ou dans le groupe.')+
  (today.length?`<div class="hero mb" style="background:linear-gradient(140deg,#d99a1e,#b37509)"><div class="l">Aujourd'hui · ${fanniv(today[0].m.anniv)}</div><div class="hero-name" style="font-size:20px">🎉 ${today.map(o=>o.m.id===me.id?'C\'est ton anniversaire !':esc(titleCase(fullName(o.m)))).join(', ')}</div>
    ${grp.length?`<div class="muted" style="color:#fff;opacity:.9;margin-top:4px">Envoie-lui un message ou souhaite-lui dans le groupe WhatsApp de la jeunesse.</div><div class="row mt" style="gap:8px;flex-wrap:wrap"><button class="btn sm" style="background:#fff;color:#8a5a00" data-act="copyBdGroup"><i data-lucide="copy" class="i i-sm"></i>Message pour le groupe</button></div>`:`<div class="muted" style="color:#fff;margin-top:4px">Toute la jeunesse te souhaite une belle journée ! 🎂</div>`}</div>
    <div class="card mb"><h3><i data-lucide="party-popper" class="i"></i>Aujourd'hui</h3>${today.map(o=>row(o,true)).join('')}</div>`:`<div class="card mb empty">Pas d'anniversaire aujourd'hui.</div>`)+
  (week.length?`<div class="card mb"><h3><i data-lucide="calendar-clock" class="i"></i>Cette semaine</h3>${week.map(o=>row(o)).join('')}</div>`:'')+
  (month.length?`<div class="card mb"><h3><i data-lucide="calendar" class="i"></i>Dans le mois qui vient</h3>${month.map(o=>row(o)).join('')}</div>`:'')+
  (later.length?`<div class="card mb"><h3><i data-lucide="calendar-days" class="i"></i>Plus tard</h3>${later.slice(0,40).map(o=>row(o)).join('')}</div>`:'');
}
function vMyCamps(p){
  const mid=sMember(p).id;const L=DB.campaigns.filter(c=>c.lignes.some(l=>l.memberId===mid)).sort((a,b)=>(a.statut==='En cours'?0:1)-(b.statut==='En cours'?0:1)||campTotal(b)-campTotal(a));
  const tot=L.reduce((a,c)=>{const s=situation(c.id,mid);a.v+=s.verse;a.r+=s.reste;return a},{v:0,r:0});
  return wTitle(p,'Mes campagnes','Toutes les cotisations qui te concernent, avec ta situation dans chacune.')+(payOn()&&tot.r>0?`<button class="btn gold block mb" data-act="payInApp"><i data-lucide="wallet" class="i"></i>Payer une cotisation</button>`:'')+
  `<div class="kpis"><div class="kpi"><div class="l">Total versé</div><div class="v" style="color:var(--green)">${fmt(tot.v)}</div></div><div class="kpi"><div class="l">Reste à payer</div><div class="v">${fmt(tot.r)}</div></div></div>
  ${L.map(c=>{const s=situation(c.id,mid);const pct=Math.min(100,s.verse/s.total*100);const on=c.statut==='En cours';return `<div class="card mb" style="cursor:pointer;${on?'':'opacity:.7'}" data-act="openMyCamp" data-id="${c.id}">
    <div class="row between"><div style="min-width:0"><div class="name ellip" style="font-size:15px">${esc(c.nom)} ${delaiChip(c)}</div><div class="muted">${on?`${perPos(c,s.cur)} · ${fmt(s.mensualite)}/${perU(c)}`:'Campagne terminée'}</div></div>${statutChip(s.statut)}</div>
    <div class="row between mt" style="font-size:12.5px"><span>Versé <b>${fmtN(s.verse)}</b> / ${fmtN(s.total)}</span><span>Reste <b>${fmtN(s.reste)}</b></span></div>
    <div class="bar" style="margin-top:6px"><i style="width:${pct}%"></i></div><div class="dots">${s.months.map(mo=>`<i class="${mo.state}"></i>`).join('')}</div></div>`}).join('')||'<div class="card empty">Aucune campagne.</div>'}`;
}
function vMyCamp(p,cid){
  const c=camp(cid),mid=sMember(p).id,s=situation(cid,mid);const pct=Math.min(100,s.verse/s.total*100);const on=c.statut==='En cours';
  const back=p.mode==='web'?`<button class="link mb" data-act="back"><i data-lucide="arrow-left" class="i i-sm"></i>Mes campagnes</button>`:'';
  return back+`<div class="hero big-hero mb" style="${on?'':'background:linear-gradient(140deg,#4a5852,#2b3833)'}"><div class="row between"><div class="l">${on?`${perPos(c,s.cur)}`:'Terminée'}</div><span class="chip" style="background:rgba(255,255,255,.16);color:#fff">${s.statut}</span></div>
    <div class="hero-name">${esc(c.nom)}</div>${delaiDepasse(c)?`<div style="margin:-2px 0 6px"><span class="chip" style="background:#fde2e2;color:#a32020">Délai dépassé · fin le ${fdate(c.fin)}</span></div>`:''}<div class="big">${fmt(s.verse)}</div><div class="bar"><i style="width:${pct}%"></i></div>
    <div class="split"><div>Ma cotisation<b>${fmt(s.total)}</b></div><div style="text-align:right">Reste à payer<b>${fmt(s.reste)}</b></div></div></div>
  ${on&&s.retard?`<div class="info red mb"><b>Pour être à jour : ${fmt(s.retard)}</b></div>`:''}
  ${on&&s.reste>0&&payOn()?`<button class="btn gold block mb" data-act="payInApp" data-c="${c.id}"><i data-lucide="wallet" class="i"></i>Payer cette cotisation</button>`:''}${on&&typeof qrMember==='function'?qrMember(p,c.id,s):''}
  <div class="card mb"><h3><i data-lucide="calendar-days" class="i"></i>Mon échéancier<span class="r">${fmt(s.mensualite)} / ${perU(c)}</span></h3><div class="months" style="grid-template-columns:repeat(${Math.min(5,c.nbMois)},1fr)">${s.months.map(mo=>moCell(s,mo,on)).join('')}</div>${on?moisDetail(s):''}</div>
  <div class="card" style="padding:4px 14px"><h3 style="margin:12px 0 4px">Mes versements pour cette campagne</h3>${DB.payments.filter(x=>x.campagneId===cid&&x.memberId===mid).slice().reverse().map(x=>payRow(x,p)).join('')||'<div class="empty">Aucun versement.</div>'}</div>`;
}
function vMemberHist(p){
  const pays=DB.payments.filter(x=>x.memberId===sMember(p).id).slice().reverse();
  return wTitle(p,'Mes versements','Chaque versement validé par la trésorière, avec son reçu.')+
  `<div class="card" style="padding:4px 14px">${pays.map(x=>payRow(x,p)).join('')||'<div class="empty">Aucun versement pour l\'instant.</div>'}</div>`;
}

/* ================== MODALE / TOAST ================== */
let MCTX=null;
function openModal(html,ctx,wide){MCTX=ctx||MCTX||null;const m=document.getElementById('modal');m.className='modal'+(wide?' wide':'');m.innerHTML=html;document.getElementById('modalBg').classList.add('show');icons()}
function closeModal(){document.getElementById('modalBg').classList.remove('show');MCTX=null}
let tt;function toast(t){const e=document.getElementById('toast');e.textContent=t;e.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('show'),3200)}
document.getElementById('modalBg').addEventListener('click',e=>{if(e.target.id==='modalBg')closeModal()});
async function copy(t){try{await navigator.clipboard.writeText(t);toast('Copié !')}catch(e){toast('Copie impossible ici : sélectionne le texte à la main.')}}

let FORMBAP=true;
function memberForm(m){
  FORMBAP=m?!!m.baptise:false;FORMDEP=m?depsOf(m).slice():[];const deps=DB.settings.departements.slice();FORMDEP.forEach(d=>{if(!deps.includes(d))deps.push(d)});const fcts=DB.settings.fonctions.slice();if(m&&m.fonction&&!fcts.includes(m.fonction))fcts.push(m.fonction);if(!fcts.length)fcts.push('Membre');
  return `<h2>${m?'Modifier la fiche':'Enregistrer un jeune'}</h2><div class="muted mb">${m?'Toute modification est enregistrée dans le journal.':'Il pourra ensuite recevoir un accès avec son téléphone ou son e-mail.'}</div>
  <div class="fgrid">
  <div class="field"><label>Nom *</label><input class="inp" id="f-nom" value="${esc(m?.nom||'')}"></div>
  <div class="field"><label>Prénoms</label><input class="inp" id="f-prenoms" value="${esc(m?.prenoms||'')}"></div>
  <div class="field"><label>Téléphone</label><input class="inp" id="f-tel" value="${esc(m?.tel||'')}" placeholder="07 00 00 00 00"></div>
  <div class="field"><label>E-mail</label><input class="inp" id="f-email" type="email" value="${esc(m?.email||'')}" placeholder="nom@mail.com"></div>
  <div class="field"><label>Anniversaire (jour et mois)</label><div class="row" style="gap:8px"><select class="inp" id="f-aj"><option value="">Jour</option>${Array.from({length:31},(_,i)=>`<option value="${i+1}" ${m&&m.anniv&&+m.anniv.slice(3)===i+1?'selected':''}>${i+1}</option>`).join('')}</select><select class="inp" id="f-am"><option value="">Mois</option>${MOIS.map((x,i)=>`<option value="${i+1}" ${m&&m.anniv&&+m.anniv.slice(0,2)===i+1?'selected':''}>${x}</option>`).join('')}</select></div></div>
  <div class="field"><label>Baptisé(e) ?</label><div class="pills" id="f-bap"><button type="button" class="pill ${FORMBAP?'on':''}" data-act="bap" data-v="1">Oui</button><button type="button" class="pill ${!FORMBAP?'on':''}" data-act="bap" data-v="0">Non</button></div></div>
  <div class="field"><label>Profession</label><input class="inp" id="f-prof" value="${esc(m?.profession||'')}" placeholder="Ex. Étudiant, commerçante…"></div>
  <div class="field"><label>Lieu d'habitation</label><input class="inp" id="f-hab" value="${esc(m?.habitation||'')}" placeholder="Commune / quartier"></div>
  <div class="field full"><label>Départements <span class="muted" style="font-weight:500">(un ou plusieurs)</span></label><div class="pills" id="f-deps">${deps.length?deps.map(d=>`<button type="button" class="pill ${FORMDEP.includes(d)?'on':''}" data-act="dep" data-v="${esc(d)}">${esc(d)}</button>`).join(''):'<span class="muted">Aucun département dans la liste pour l\'instant.</span>'}</div></div></div>
  <div class="field"><label>Fonction dans la jeunesse</label><select class="inp" id="f-fonction">${fcts.map(f=>`<option ${(m?m.fonction:'Membre')===f?'selected':''}>${esc(f)}</option>`).join('')}</select></div>
  <div class="field"><label>Membre depuis</label><input type="date" class="inp" id="f-adh" value="${esc(m?.adhesion||today())}"></div>
  ${m?`<div class="field"><label>Statut</label><select class="inp" id="f-actif"><option value="1" ${m.actif?'selected':''}>Actif</option><option value="0" ${!m.actif?'selected':''}>Inactif</option></select></div>`
     :`<div class="field full"><label class="row" style="gap:8px;font-weight:600"><input type="checkbox" id="f-access" checked> Créer tout de suite son accès membre (il recevra un mot de passe)</label></div>`}
  </div>
  <div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button><button class="btn" data-act="saveMember" data-id="${m?.id||''}">Enregistrer</button></div>`;
}
let FORMDEP=[];
function depsOf(m){return m.deps&&m.deps.length?m.deps:(m.departement?String(m.departement).split(/\s*[,;/]\s*/).filter(Boolean):[])}
function matchDep(v){if(!v)return'';return String(v).split(/\s*[,;/]\s*/).filter(Boolean).map(x=>DB.settings.departements.find(d=>norm(d)===norm(x))||x).join(', ')}
function depPills_unused(){return DB.settings.departements.map(d=>`<button type="button" class="pill ${FORMDEP.includes(d)?'on':''}" data-act="dep" data-v="${esc(d)}">${esc(d)}</button>`).join('')}
function credModal(a,title){
  const m=member(a.memberId),r=role(a.roleId);const id=[m.tel,m.email].filter(Boolean).join(' ou ');
  const txt=`Bonjour ${prenomOf(m)}, voici ton accès à l'application Younity (${r.id==='membre'?'membre':r.nom}).\nIdentifiant : ${id}\nMot de passe : ${a.pwd}\nÀ ta première connexion, tu choisiras ton propre mot de passe.`;
  openModal(`<h2>${title||'Accès créé'}</h2><div class="muted">${esc(fullName(m))} · ${esc(r.id==='membre'?'Membre':r.nom)}</div>
  <div class="cred"><div class="l">IDENTIFIANT</div><div class="v">${esc(id)}</div><div class="l">MOT DE PASSE PROVISOIRE</div><div class="v pwd">${a.pwd}</div><div class="l" style="margin:0">Il devra le changer à sa première connexion.</div></div>
  <div class="info gold mt" style="font-size:12px">Dans l'application réelle, ce mot de passe n'est montré qu'une seule fois. Transmets-le maintenant.</div>
  <div class="name mt" style="font-size:13px">Envoyer ses accès par :</div><div class="mt" style="margin-top:8px">${chans(m,txt,{size:'',noApp:true})}</div>
  <div class="foot"><button class="btn sec" data-act="copyTxt" data-t="${esc(txt)}"><i data-lucide="copy" class="i"></i>Copier</button><button class="btn" data-act="closeModal">Terminé</button></div>`);
}
function roleModal(mid){
  const opts=DB.roles.filter(r=>r.id!=='president');
  const mem=DB.members.filter(m=>m.actif&&(m.tel||m.email)).sort((a,b)=>a.nom.localeCompare(b.nom));
  const cur=mid?acctOfMember(mid):null;
  openModal(`<h2>Attribuer un rôle</h2><div class="muted mb">Le jeune se connectera avec son téléphone ou son e-mail. S'il n'a pas encore d'accès, un mot de passe est généré automatiquement.</div>
  <div class="field"><label>Jeune</label><select class="inp" id="r-m">${mem.map(m=>{const a=acctOfMember(m.id);return `<option value="${m.id}" ${m.id===mid?'selected':''} ${a&&a.roleId==='president'?'disabled':''}>${esc(fullName(m))}${a?' — '+(a.roleId==='membre'?'membre':role(a.roleId).nom):''}</option>`}).join('')}</select></div>
  <div class="field"><label>Rôle</label><div class="pills" id="r-roles">${opts.map((r,i)=>`<button type="button" class="pill ${(cur?cur.roleId===r.id:i===0)?'on':''}" data-act="pickRole" data-v="${r.id}">${esc(r.nom)}</button>`).join('')}</div></div>
  <div class="muted" id="r-desc"></div>
  <div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button><button class="btn" data-act="confirmRole">Attribuer</button></div>`);
  roleDesc();
}
function pickedRole(){const b=document.querySelector('#r-roles .pill.on');return b&&b.dataset.v}
function roleDesc(){const r=role(pickedRole());const el=document.getElementById('r-desc');if(el&&r)el.innerHTML=r.id==='membre'?'Accès simple : il voit uniquement sa propre situation.':'Pourra : '+r.perms.map(k=>PERMS.find(x=>x[0]===k)[1].toLowerCase()).join(', ')+'.'}
function roleForm(r){
  openModal(`<h2>${r?'Modifier le rôle':'Créer un rôle'}</h2><div class="muted mb">Ex. Trésorier adjoint, Responsable des relances…</div>
  <div class="field"><label>Nom du rôle</label><input class="inp" id="ro-nom" value="${esc(r?r.nom:'')}"></div>
  <div class="field"><label>Permissions</label>${PERMS.filter(x=>!['acces_gerer','parametres'].includes(x[0])).map(([k,l])=>`<label class="row" style="gap:8px;padding:6px 0"><input type="checkbox" class="ro-p" value="${k}" ${r&&r.perms.includes(k)?'checked':''}> ${l}</label>`).join('')}
  <div class="muted">« Attribuer les accès » et « Paramètres » restent réservés au président.</div></div>
  <div class="foot">${r&&!DB.accounts.some(a=>a.roleId===r.id)?`<button class="btn sec" style="margin-right:auto;color:var(--red)" data-act="delRole" data-id="${r.id}">Supprimer</button>`:''}<button class="btn sec" data-act="closeModal">Annuler</button><button class="btn" data-act="saveRole" data-id="${r?r.id:''}">Enregistrer</button></div>`);
}

/* ================== ACTIONS ================== */
function refresh(){persist();PANES.forEach(p=>{p.keepScroll=true;renderPane(p)})}
function who(){const p=pane(MCTX&&MCTX.pane);return p?sessName(p):'?'}
function rerender(p){p.keepScroll=true;renderPane(p)}

document.addEventListener('submit',e=>{const la=e.target.closest('form[data-listadd]');if(la){e.preventDefault();const p=pane(la.closest('[data-pane]').dataset.pane);const k=la.dataset.listadd;const inp=la.querySelector('input');const v=inp.value.trim();if(!v)return;
  if(DB.settings[k].some(x=>norm(x)===norm(v))){toast('Déjà dans la liste.');return}DB.settings[k].push(v);log(sessName(p),(k==='departements'?'Département':'Fonction')+' ajouté(e)',v);refresh();
  const n=document.getElementById(`la-${k}-${p.id}`);if(n)n.focus();return}
  const f=e.target.closest('form[data-login]');if(!f)return;e.preventDefault();
  const p=pane(f.dataset.login);const ident=document.getElementById('li-id-'+p.id).value,pw=document.getElementById('li-pw-'+p.id).value;
  const err=document.getElementById('li-err-'+p.id);const a=findLogin(ident);
  const fail=t=>{err.style.display='block';err.textContent=t};
  if(!a)return fail('Aucun accès trouvé avec ce numéro ou cet e-mail. Demande au président de créer ton accès.');
  if(a.pwd!==pw)return fail('Mot de passe incorrect.');
  if(!a.actif)return fail('Ton compte est bloqué. Rapproche-toi du président.');
  if(p.mode==='web'&&!['president','tresorier'].includes(a.roleId))return fail('Le back-office ordinateur est réservé au président et à la trésorière pour l\'instant. Utilise l\'application mobile.');
  if(!member(a.memberId).actif)return fail('Ton profil est inactif. Rapproche-toi du président.');
  a.derniere=nowIso();persist();p.session={accountId:a.id,mustChange:a.mustChange};p.kicked=false;p.tab=null;p.sub=null;p.f={};p.pay={};renderPane(p);
});
document.addEventListener('click',async e=>{
  const segB=e.target.closest('#modeSeg button');if(segB){USERMODE=segB.dataset.mode;setupPanes();return}
  const wb=e.target.closest('#whoBar button');if(wb){SHOWN=wb.dataset.who;renderAll();return}
  const el=e.target.closest('[data-act]');if(!el)return;
  if(el.tagName==='INPUT'&&el.type!=='checkbox')return;
  const paneId=el.closest('[data-pane]')?.dataset.pane||MCTX?.pane;const p=pane(paneId);
  const a=el.dataset.act;const d=el.dataset;
  if(p&&!el.closest('#modal'))MCTX={pane:p.id};
  if(fgAction(a,p,d))return;
  if(a==='recPdf'||a==='recShare'){receiptAction(a==='recPdf'?'dl':'share',+d.id);return}
  if(evAction(a,p,d,el))return;
  if(tAction(a,p,d)){if(el.tagName==='A')e.preventDefault();return}
  if(typeof qAction==='function'&&qAction(a,p,d,el))return;
  switch(a){
    case'tab':p.tab=d.tab;p.sub=null;p.nSnap=null;renderPane(p);break;
    case'back':p.sub=p.sub&&p.sub.edit?{camp:p.sub.edit}:p.sub&&p.sub.editEvt?{evt:p.sub.editEvt}:p.sub&&p.sub.tedit?{tache:p.sub.tedit}:null;renderPane(p);break;
    case'setF':p.f[d.k]=d.v;rerender(p);break;
    case'fillLogin':document.getElementById('li-id-'+p.id).value=d.id;document.getElementById('li-pw-'+p.id).value=d.pw;break;
    case'mcSave':{const a1=document.getElementById('mc-1-'+p.id).value,a2=document.getElementById('mc-2-'+p.id).value;if(a1.length<6){toast('6 caractères minimum.');return}if(a1!==a2){toast('Les deux mots de passe sont différents.');return}
      const ac=sAcct(p);ac.pwd=a1;ac.mustChange=false;log(sessName(p),'Mot de passe changé','Par l\'utilisateur lui-même');p.session.mustChange=false;toast('Mot de passe enregistré.');refresh();break}
    case'mcSkip':p.session.mustChange=false;renderPane(p);break;
    case'logout':p.session=null;p.sub=null;p.notif=null;renderPane(p);break;
    case'closeNotif':p.notif=null;renderPane(p);break;
    case'opencamp':closeModal();p.sub={camp:+d.id};p.f.cf='all';renderPane(p);break;
    case'openCampFilter':p.sub={camp:+d.id};p.f.cf=d.v;renderPane(p);break;
    case'openNotifs':{const a=sAcct(p);p.nSnap=new Set(notifsFor(a).L.filter(n=>!n.read.includes(a.id)).map(n=>n.id))}p.sub='notifs';p.notif=null;renderPane(p);setTimeout(()=>rerender(p),50);break;
    case'togglePref':{const a=sAcct(p);a.prefs=prefsOf(a);a.prefs[d.k]=!a.prefs[d.k];persist();rerender(p);break}
    case'openRel':closeModal();p.f.rc=+d.id;p.f.rf='retard';p.sub='relances';renderPane(p);break;
    case'memberSit':memberSit(p,+d.c,+d.m);break;
    case'relOne':{const c=camp(+d.c),m=member(+d.m),s=situation(c.id,m.id);DB.relances.push({campagneId:c.id,memberId:m.id,t:nowIso(),par:sessName(p)});log(sessName(p),'Relance envoyée',`${fullName(m)} — ${c.nom} (WhatsApp)`);
      notify({mid:m.id},'relances',`Rappel : ${c.nom}`,`${perPos(c,s.cur)} : tu dois payer ${fmt(s.retard||s.reste)} pour être à jour.`,sAcct(p).id);persist();setTimeout(()=>{memberSit(p,c.id,m.id);refresh()},300);break}
    case'forgot':openModal(`<h2>Mot de passe oublié</h2><div class="muted mb">Entre l'e-mail enregistré sur ton profil. Tu recevras un lien pour choisir un nouveau mot de passe.</div><div class="field"><label>E-mail</label><input class="inp" id="fg-mail" placeholder="nom@mail.com"></div><div class="info gold" style="font-size:12px">Pas d'e-mail ? Demande au président de réinitialiser ton mot de passe.</div><div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button><button class="btn" data-act="forgotSend">Envoyer le lien</button></div>`,{pane:paneId});break;
    case'forgotSend':{const v=document.getElementById('fg-mail').value.trim().toLowerCase();const ok=DB.members.some(m=>m.email&&m.email===v&&acctOfMember(m.id));openModal(`<h2>${ok?'E-mail envoyé':'E-mail inconnu'}</h2><div class="muted">${ok?`Un lien de réinitialisation a été envoyé à <b>${esc(v)}</b> (simulation dans ce prototype).`:'Aucun accès ne correspond à cet e-mail. Demande au président de réinitialiser ton mot de passe.'}</div><div class="foot"><button class="btn" data-act="closeModal">OK</button></div>`);break}
    case'saveMail':{const a=sAcct(p),m=sMember(p);const v=document.getElementById('pm-mail-'+p.id).value.trim().toLowerCase();if(v&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){toast('E-mail invalide.');return}
      if(v&&DB.members.some(x=>x.id!==m.id&&x.email===v)){toast('Cet e-mail est déjà utilisé.');return}const old=m.email;m.email=v;log(sessName(p),'E-mail modifié',`${fullName(m)} : ${old||'—'} → ${v||'—'}`);toast('E-mail enregistré.');refresh();break}
    case'appMsg':{const m=member(+d.m);openModal(`<h2>Message direct</h2><div class="muted mb">À ${esc(fullName(m))} · il le reçoit dans l'application (cloche de notifications).</div><textarea class="inp" id="am-txt">${esc(d.t||'')}</textarea><div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button><button class="btn" data-act="appMsgSend" data-m="${m.id}"><i data-lucide="send" class="i"></i>Envoyer</button></div>`,{pane:paneId});break}
    case'appMsgSend':{const m=member(+d.m),t=document.getElementById('am-txt').value.trim();if(!t){toast('Écris un message.');return}const pp=pane(MCTX.pane);notify({mid:m.id},'messages',`Message de ${sessName(pp)}`,t,sAcct(pp).id);log(sessName(pp),'Message envoyé',`À ${fullName(m)} (appli)`);closeModal();toast('Message envoyé dans l\'application.');refresh();break}
    case'bdSent':{const m=member(+d.m);if(d.chan==='app'){openModal(`<h2>Message d'anniversaire</h2><div class="muted mb">À ${esc(fullName(m))}, dans l'application.</div><textarea class="inp" id="am-txt">${esc(bdText(m))}</textarea><div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button><button class="btn" data-act="appMsgSend" data-m="${m.id}"><i data-lucide="send" class="i"></i>Envoyer</button></div>`,{pane:paneId})}else toast('Message d\'anniversaire ouvert dans '+(d.chan==='wa'?'WhatsApp':'les SMS')+'.');break}
    case'copyBdGroup':{const me=sMember(p);const L=DB.members.filter(m=>m.actif&&m.anniv&&daysTo(m.anniv)===0&&m.id!==me.id);copy(`🎉🎂 Aujourd'hui, nous célébrons l'anniversaire de ${L.map(m=>titleCase(fullName(m))).join(' et ')} ! Joyeux anniversaire de la part de toute la jeunesse. Que Dieu ${L.length>1?'vous':'te'} bénisse abondamment ! 🙏🎈`);break}
    case'openMyCamp':p.sub={mycamp:+d.id};renderPane(p);break;
    case'selCamp':p.sel=+d.id;rerender(p);break;
    case'openMember':p.sub={member:+d.id};renderPane(p);break;
    case'newcamp':p.sub='newcamp';renderPane(p);ncRecalc(p);break;
    case'editcamp':p.sub={edit:+d.id};renderPane(p);ncRecalc(p);break;
    case'moyen':p.pay.moyen=d.v;rerender(p);break;
    case'quickAmt':p.pay.montant=d.v;rerender(p);break;
    case'submitPay':submitPay(p);break;
    case'cancelPay':{const x=DB.payments.find(x=>x.id===+d.id);const m=member(x.memberId);
      openModal(`<h2>Annuler ce paiement ?</h2><div class="muted mb">${esc(fullName(m))} — ${fmt(x.montant)} du ${fdate(x.date)} (${x.moyen}).<br>Le paiement n'est pas effacé : il reste visible, marqué « annulé ».</div>
      <div class="field"><label>Motif (obligatoire)</label><input class="inp" id="f-motif" placeholder="Ex. erreur de montant, doublon…"></div>
      <div class="foot"><button class="btn sec" data-act="closeModal">Retour</button><button class="btn danger" data-act="confirmCancel" data-id="${x.id}">Annuler le paiement</button></div>`,{pane:paneId});break}
    case'confirmCancel':{const motif=document.getElementById('f-motif').value.trim();if(!motif){toast('Indique le motif de l\'annulation.');return}
      const x=DB.payments.find(x=>x.id===+d.id);x.annule=true;x.motif=motif;log(who(),'Paiement annulé',`${fullName(member(x.memberId))} — ${fmt(x.montant)} · motif : ${motif}`);{const pp=pane(MCTX.pane);notify({mid:x.memberId},'paiements',`Paiement annulé : ${fmt(x.montant)}`,`Motif : ${motif}`,sAcct(pp).id);notify({perm:'journal'},'paiements',`Paiement annulé : ${titleCase(fullName(member(x.memberId)))}`,`${fmt(x.montant)} · motif : ${motif}`,sAcct(pp).id)}closeModal();toast('Paiement annulé et tracé.');refresh();break}
    case'receipt':showReceipt(+d.id);break;
    case'closeModal':closeModal();break;
    case'copyTxt':copy(d.t);break;
    case'addMember':openModal(memberForm(null),{pane:paneId},true);break;
    case'editMember':openModal(memberForm(member(+d.id)),{pane:paneId},true);break;
    case'dep':{const v=d.v;FORMDEP=FORMDEP.includes(v)?FORMDEP.filter(x=>x!==v):[...FORMDEP,v];el.classList.toggle('on',FORMDEP.includes(v));break}
    case'ncPer':{const pb=document.getElementById(`nc-per-${p.id}`);if(pb)pb.dataset.manuel='1';document.querySelectorAll(`#nc-per-${p.id} .pill`).forEach(b=>b.classList.toggle('on',b.dataset.v===d.v));ncRecalc(p);break}
    case'actualiser':refresh();toast('À jour ✓');break;
    case'bap':FORMBAP=d.v==='1';document.querySelectorAll('#f-bap .pill').forEach(b=>b.classList.toggle('on',b.dataset.v===d.v));break;
    case'saveMember':saveMember(d.id?+d.id:null);break;
    case'createAccess':{const m=member(+d.m);if(!m.tel&&!m.email){toast('Ajoute d\'abord un téléphone ou un e-mail.');return}
      const ac={id:DB.seq++,memberId:m.id,roleId:'membre',pwd:genPwd(),actif:true,mustChange:true,creeLe:nowIso(),derniere:null};DB.accounts.push(ac);log(who(),'Accès créé',`${fullName(m)} — membre`);refresh();credModal(ac);break}
    case'giveRole':roleModal(d.m?+d.m:null);break;
    case'pickRole':document.querySelectorAll('#r-roles .pill').forEach(b=>b.classList.toggle('on',b===el));roleDesc();break;
    case'confirmRole':{const mid=+document.getElementById('r-m').value,rid=pickedRole();const m=member(mid);let ac=acctOfMember(mid);
      if(ac&&ac.roleId==='president'){toast('Le président ne peut pas changer de rôle ici.');return}
      if(ac){const old=role(ac.roleId).nom;ac.roleId=rid;ac.actif=true;log(who(),'Rôle attribué',`${fullName(m)} : ${old} → ${role(rid).nom}`);notify({acct:ac.id},'campagnes',`Nouveau rôle : ${role(rid).nom}`,'Le président t\'a attribué ce rôle. Tes nouveaux écrans sont disponibles.',sAcct(pane(MCTX.pane)).id);closeModal();refresh();toast(`${prenomOf(m)} est maintenant ${role(rid).nom}. Il garde son mot de passe.`)}
      else{ac={id:DB.seq++,memberId:mid,roleId:rid,pwd:genPwd(),actif:true,mustChange:true,creeLe:nowIso(),derniere:null};DB.accounts.push(ac);log(who(),'Rôle attribué',`${fullName(m)} : ${role(rid).nom} (accès créé)`);refresh();credModal(ac,'Rôle attribué et accès créé')}
      break}
    case'resetPwd':{const ac=DB.accounts.find(x=>x.id===+d.id);ac.pwd=genPwd();ac.mustChange=true;log(who(),'Mot de passe réinitialisé',fullName(member(ac.memberId)));refresh();credModal(ac,'Nouveau mot de passe');break}
    case'blockAcct':{const ac=DB.accounts.find(x=>x.id===+d.id),m=member(ac.memberId);openModal(`<h2>Bloquer le compte de ${esc(prenomOf(m))} ?</h2><div class="muted mb">Il ne pourra plus se connecter. S'il est connecté en ce moment, il sera déconnecté. Ses données et ses cotisations sont gardées.</div><div class="field"><label>Motif (facultatif, visible par le bureau)</label><input class="inp" id="blk-motif" placeholder="Ex. téléphone perdu, départ, abus…"></div><div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button><button class="btn danger" data-act="confirmBlock" data-id="${ac.id}"><i data-lucide="lock" class="i i-sm"></i>Bloquer</button></div>`,{pane:paneId});break}
    case'blockPick':{const v=document.getElementById('blk-pick-'+p.id).value;if(!v)return;el.dataset.id=v;const ac=DB.accounts.find(x=>x.id===+v),m=member(ac.memberId);openModal(`<h2>Bloquer le compte de ${esc(prenomOf(m))} ?</h2><div class="muted mb">Il ne pourra plus se connecter. S'il est connecté en ce moment, il sera déconnecté. Ses données et ses cotisations sont gardées.</div><div class="field"><label>Motif (facultatif, visible par le bureau)</label><input class="inp" id="blk-motif" placeholder="Ex. téléphone perdu, départ, abus…"></div><div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button><button class="btn danger" data-act="confirmBlock" data-id="${ac.id}"><i data-lucide="lock" class="i i-sm"></i>Bloquer</button></div>`,{pane:paneId});break}
    case'confirmBlock':{const ac=DB.accounts.find(x=>x.id===+d.id);ac.actif=false;ac.motif=document.getElementById('blk-motif').value.trim();log(who(),'Compte bloqué',`${fullName(member(ac.memberId))}${ac.motif?' — motif : '+ac.motif:''}`);closeModal();toast('Compte bloqué.');refresh();break}
    case'unblockAcct':{const ac=DB.accounts.find(x=>x.id===+d.id);ac.actif=true;ac.motif='';log(sessName(p),'Compte débloqué',fullName(member(ac.memberId)));notify({acct:ac.id},'messages','Ton compte a été débloqué','Tu peux de nouveau te connecter.',sAcct(p).id);toast('Compte débloqué.');refresh();break}
    case'setInactive':{const m=member(+d.id);openModal(`<h2>Rendre ${esc(prenomOf(m))} inactif ?</h2><div class="muted">À utiliser quand un jeune quitte la jeunesse. Son historique de cotisations est gardé, mais il disparaît du registre actif, des nouvelles campagnes, des relances et des anniversaires. Son compte est aussi bloqué. Tu pourras le réactiver à tout moment.</div><div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button><button class="btn danger" data-act="confirmInactive" data-id="${m.id}">Rendre inactif</button></div>`,{pane:paneId});break}
    case'confirmInactive':{const m=member(+d.id);m.actif=false;const ac=acctOfMember(m.id);if(ac&&ac.actif){ac.actif=false;ac.motif='Membre rendu inactif'}log(who(),'Membre rendu inactif',fullName(m));closeModal();toast('Membre inactif.');refresh();break}
    case'setActive':{const m=member(+d.id);m.actif=true;const ac=acctOfMember(m.id);if(ac&&ac.motif==='Membre rendu inactif'){ac.actif=true;ac.motif=''}log(sessName(p),'Membre réactivé',fullName(m));toast('Membre réactivé.');refresh();break}
    case'toggleAcct':{const ac=DB.accounts.find(x=>x.id===+d.id);ac.actif=!ac.actif;log(who(),ac.actif?'Accès réactivé':'Accès désactivé',fullName(member(ac.memberId)));refresh();break}
    case'createAll':{const L=DB.members.filter(m=>m.actif&&!acctOfMember(m.id)&&(m.tel||m.email));L.forEach(m=>DB.accounts.push({id:DB.seq++,memberId:m.id,roleId:'membre',pwd:genPwd(),actif:true,mustChange:true,creeLe:nowIso(),derniere:null}));
      log(who(),'Accès créés',`${L.length} accès membres créés`);refresh();toast(`${L.length} accès créés. Exporte la liste pour les transmettre.`);break}
    case'exportCreds':exportCreds();break;
    case'newRole':roleForm(null);break;
    case'editRole':roleForm(role(d.id));break;
    case'saveRole':{const nom=document.getElementById('ro-nom').value.trim();if(!nom){toast('Donne un nom au rôle.');return}
      const perms=[...document.querySelectorAll('.ro-p')].filter(c=>c.checked).map(c=>c.value);
      if(d.id){const r=role(d.id);r.nom=nom;r.perms=perms;log(who(),'Rôle modifié',`${nom} : ${perms.length} permissions`)}
      else{DB.roles.splice(DB.roles.length-1,0,{id:'r'+DB.seq++,nom,perms});log(who(),'Rôle créé',`${nom} : ${perms.length} permissions`)}
      closeModal();refresh();break}
    case'delRole':{DB.roles=DB.roles.filter(r=>r.id!==d.id);log(who(),'Rôle supprimé',d.id);closeModal();refresh();break}
    case'ncApplyAll':{const v=digits(document.getElementById('nc-all-'+p.id).value);if(!v)return;document.querySelectorAll(`#pane-${p.id} .nc-amt`).forEach(i=>{const c=document.querySelector(`#pane-${p.id} .nc-chk[data-m="${i.dataset.m}"]`);if(c.checked)i.value=v});ncRecalc(p);break}
    case'ncAll':document.querySelectorAll(`#pane-${p.id} .nc-chk:not(:disabled)`).forEach(c=>c.checked=el.checked);ncRecalc(p);break;
    case'ncLaunch':ncLaunch(p);break;
    case'confirmLaunch':doLaunch();break;
    case'ncSave':ncSave(p,+d.id);break;
    case'confirmSave':doSave();break;
    case'editLine':{const c=camp(+d.c),m=member(+d.m);const l=c.lignes.find(l=>l.memberId===m.id);const s=situation(c.id,m.id);
      openModal(`<h2>${esc(fullName(m))}</h2><div class="muted mb">${esc(c.nom)} · déjà versé : <b>${fmt(s.verse)}</b></div>
      <div class="field"><label>Montant total de la cotisation (FCFA)</label><input class="inp big" id="f-line" inputmode="numeric" value="${l.montant}"></div>
      <div class="info gold">La modification recalcule ses mensualités. Elle est enregistrée dans le journal.</div>
      <div class="foot">${s.verse===0?`<button class="btn sec" style="margin-right:auto;color:var(--red)" data-act="removeLine" data-c="${c.id}" data-m="${m.id}">Retirer de la campagne</button>`:''}<button class="btn sec" data-act="closeModal">Fermer</button><button class="btn" data-act="saveLine" data-c="${c.id}" data-m="${m.id}">Enregistrer</button></div>`,{pane:paneId});break}
    case'saveLine':{const c=camp(+d.c),m=member(+d.m);const l=c.lignes.find(l=>l.memberId===m.id);const v=+digits(document.getElementById('f-line').value);if(!v){toast('Montant invalide.');return}
      if(v!==l.montant){log(who(),'Montant modifié',`${fullName(m)} — ${c.nom} : ${fmt(l.montant)} → ${fmt(v)}`);l.montant=v}closeModal();toast('Montant mis à jour.');refresh();break}
    case'removeLine':{const c=camp(+d.c),m=member(+d.m);c.lignes=c.lignes.filter(l=>l.memberId!==m.id);log(who(),'Membre retiré de la campagne',`${fullName(m)} — ${c.nom}`);closeModal();refresh();break}
    case'closeCamp':openModal(`<h2>Clôturer la campagne ?</h2><div class="muted">Plus aucun paiement ne pourra y être validé. Les membres gardent l'historique et leurs reçus. Tu pourras la rouvrir si besoin.</div><div class="foot"><button class="btn sec" data-act="closeModal">Retour</button><button class="btn danger" data-act="confirmClose" data-id="${d.id}">Clôturer</button></div>`,{pane:paneId});break;
    case'confirmClose':{const c=camp(+d.id);c.statut='Clôturée';log(who(),'Campagne clôturée',c.nom);closeModal();refresh();break}
    case'reopenCamp':{const c=camp(+d.id);c.statut='En cours';log(sessName(p),'Campagne rouverte',c.nom);refresh();break}
    case'togglePay':DB.settings.paiementIntegre=!DB.settings.paiementIntegre;log(sessName(p),'Paramètre modifié',`Paiement dans l'application : ${DB.settings.paiementIntegre?'activé (aperçu)':'désactivé'}`);refresh();toast(DB.settings.paiementIntegre?'Aperçu activé : regarde l\'écran d\'un membre.':'Paiement dans l\'appli désactivé.');break;
    case'listRemove':{const k=d.k,lab=k==='departements'?'Département':'Fonction';DB.settings[k]=DB.settings[k].filter(x=>x!==d.v);log(sessName(p),lab+' retiré(e) de la liste',d.v+' (les fiches existantes gardent leur valeur)');refresh();break}
    case'toggleOp':DB.settings.operateurs[d.v]=!DB.settings.operateurs[d.v];log(sessName(p),'Paramètre modifié',`${d.v} : ${DB.settings.operateurs[d.v]?'proposé':'retiré'} pour le paiement dans l'appli`);refresh();break;
    case'pickOp':document.querySelectorAll('#pay-ops .op-tile').forEach(b=>b.classList.toggle('on',b===el));break;
    case'payGo':{const c=camp(+d.c),me=sMember(p),s=situation(c.id,me.id);const amt=+digits(document.getElementById('pay-amt').value);const op=document.querySelector('#pay-ops .op-tile.on')?.dataset.v;const tel=document.getElementById('pay-tel').value;
      if(!amt){toast('Indique le montant.');return}if(amt>s.reste){toast(`Le reste à payer est de ${fmt(s.reste)}.`);return}if(digits(tel).length<10){toast('Numéro Mobile Money invalide.');return}
      openModal(`<div style="text-align:center;padding:10px 0"><div style="margin-bottom:12px">${opLogo(op,52)}</div><div class="spin"></div><h2 class="mt">Confirme sur ton téléphone</h2><div class="muted">${op} t'envoie une demande de paiement de <b>${fmt(amt)}</b> au ${esc(tel)}.<br>Valide avec ton code secret ${op}.</div><div class="info gold mt" style="font-size:12px">Simulation : la confirmation arrive dans 2 secondes.</div></div>`,{pane:p.id});
      setTimeout(()=>{const ref='APP-'+Date.now().toString(36).toUpperCase();const x={id:DB.seq++,campagneId:c.id,memberId:me.id,montant:amt,date:today(),moyen:op,ref,note:'',saisiPar:'Paiement dans l\'application',source:'appli',saisiLe:nowIso(),annule:false,motif:''};
        DB.payments.push(x);log('Paiement dans l\'application','Paiement reçu (appli)',`${fullName(me)} — ${fmt(amt)} (${op}, réf. ${ref}) · ${c.nom}`);
        const after=situation(c.id,me.id);
        notify({perm:'campagnes_voir'},'paiements',`Paiement reçu dans l'appli : ${titleCase(fullName(me))}`,`${fmt(amt)} (${op}) · ${c.nom} · enregistré automatiquement`,sAcct(p).id);
        persist();PANES.forEach(o=>{o.keepScroll=true;renderPane(o)});MCTX={pane:p.id};
        openModal(`<div style="text-align:center"><div class="avatar" style="margin:0 auto 10px;width:52px;height:52px"><i data-lucide="check" class="i" style="width:26px;height:26px"></i></div><h2>Paiement réussi</h2><div class="muted">${fmt(amt)} · ${op} · réf. ${ref}</div></div>
        <div class="receipt mt"><div class="rl"><span>Total versé</span><b>${fmt(after.verse)}</b></div><div class="rl"><span>Reste à payer</span><b>${fmt(after.reste)}</b></div><div class="rl"><span>Statut</span>${statutChip(after.statut)}</div></div>
        <div class="muted mt" style="font-size:12px;text-align:center">La trésorière et le bureau ont été prévenus. Aucune saisie n'est nécessaire.</div>
        <div class="foot"><button class="btn sec" data-act="receipt" data-id="${x.id}">Voir le reçu</button><button class="btn" data-act="closeModal">Terminé</button></div>`)},2000);break}
    case'payInApp':openPay(p,d.c?+d.c:null,d.m||null);break;
    case'payAmt':document.getElementById('pay-amt').value=d.v;updPrev();break;
    case'payInAppOld':openModal(`<h2>Payer avec Mobile Money</h2><div class="muted mb">Aperçu de la future mise à jour.</div><div class="pills mb">${MOYENS.filter(m=>m!=='Espèces').map((m,i)=>`<span class="pill ${i===0?'on':''}">${m}</span>`).join('')}</div><div class="field"><label>Montant</label><input class="inp big" value="${fmtN(situation(+d.c,sMember(p).id).mensualite)}" disabled></div><div class="info gold">Dans la version finale : confirmation sur ton téléphone (code Mobile Money), puis le paiement apparaît tout seul chez la trésorière et dans ta situation.</div><div class="foot"><button class="btn" data-act="closeModal">Compris</button></div>`,{pane:paneId});break;
    case'logRel':{DB.relances.push({campagneId:+d.c,memberId:+d.m,t:nowIso(),par:sessName(p)});{const s=situation(+d.c,+d.m);notify({mid:+d.m},'relances',`Rappel : ${camp(+d.c).nom}`,`Il te reste ${fmt(s.retard||s.reste)} à régulariser.`,sAcct(p).id)}log(sessName(p),'Relance envoyée',`${fullName(member(+d.m))} — ${camp(+d.c).nom} (WhatsApp)`);persist();setTimeout(()=>rerender(p),300);break}
    case'copyGroup':{const c=camp(+p.f.rc);const L=c.lignes.map(l=>({m:member(l.memberId),s:situation(c.id,l.memberId)})).filter(o=>o.s.retard>0).sort((a,b)=>a.m.nom.localeCompare(b.m.nom));
      const txt=`📢 Rappel cotisation « ${c.nom} » — point au ${fdate(today())}\n\nMembres qui ont un retard :\n${L.map(o=>`• ${titleCase(fullName(o.m))} : ${fmt(o.s.retard)}`).join('\n')}\n\nMerci de vous rapprocher de la trésorière (espèces ou Mobile Money). 🙏`;
      DB.relances.push(...L.map(o=>({campagneId:c.id,memberId:o.m.id,t:nowIso(),par:sessName(p)})));notify({mids:L.map(o=>o.m.id)},'relances',`Rappel : ${c.nom}`,'Tu as un retard sur ta cotisation. Ouvre « Ma situation » pour voir le montant.',sAcct(p).id);log(sessName(p),'Relance groupe',`${c.nom} — ${L.length} membres cités`);persist();copy(txt);rerender(p);break}
    case'resetTpl':p.f.rtpl=REL_TPL;rerender(p);break;
    case'exportMembers':exportMembers(p);break;
    case'exportPays':exportPays(p);break;
    case'exportCamp':exportCamp(p,+d.id);break;
    case'exportJournal':exportJournal();break;
    case'exportRel':exportRel(p);break;
    case'template':exportTemplate();break;
    case'confirmImport':confirmImport();break;
  }
});
let liveT;
document.addEventListener('input',e=>{
  const t=e.target;const paneId=t.closest('[data-pane]')?.dataset.pane;const p=pane(paneId);
  if(t.dataset.payf&&p){p.pay[t.dataset.payf]=t.value;if(t.dataset.payf==='montant'){const v=digits(t.value);t.value=v?fmtN(+v):'';p.pay.montant=v}}
  if(t.dataset.actInput==='ncRecalc'&&p)ncRecalc(p);
  if(t.id==='pay-amt')updPrev();
  if(t.dataset.payf==='montant'&&p){const el=document.getElementById('tprev-'+p.id);if(el&&p.pay.cid&&p.pay.mid)el.innerHTML=previewHtml(situation(+p.pay.cid,+p.pay.mid),+digits(p.pay.montant))}
  if(t.dataset.fk&&t.dataset.live&&p){p.f[t.dataset.fk]=t.value;if(t.dataset.fk==='rtpl')return;clearTimeout(liveT);liveT=setTimeout(()=>{const pos=t.selectionStart;rerender(p);const n=document.querySelector(`#pane-${p.id} [data-fk="${t.dataset.fk}"]`);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}},250)}
});
document.addEventListener('change',e=>{
  const t=e.target;const paneId=t.closest('[data-pane]')?.dataset.pane;const p=pane(paneId);
  if(t.dataset.payf&&p&&(t.dataset.payf==='mid'||t.dataset.payf==='cid')){p.pay[t.dataset.payf]=t.value;if(t.dataset.payf==='cid')p.pay.mid='';rerender(p)}
  if(t.dataset.fk&&!t.dataset.live&&p){p.f[t.dataset.fk]=t.value;rerender(p)}
  if(t.dataset.fk==='rtpl'&&p)rerender(p);
  if(t.dataset.import)handleImport(t,p);
  if(t.classList.contains('nc-chk')&&p)ncRecalc(p);
  if(t.id==='pay-camp'){const pp=pane(MCTX&&MCTX.pane);if(pp)openPay(pp,+t.value,'mm')}
  if(t.id==='r-m'){const a=acctOfMember(+t.value);if(a)document.querySelectorAll('#r-roles .pill').forEach(b=>b.classList.toggle('on',b.dataset.v===a.roleId));roleDesc()}
});

/* ---- paiement ---- */
function submitPay(p){
  const f=p.pay;const c=camp(+f.cid);const mid=+f.mid;const montant=+digits(f.montant);
  if(!mid){toast('Choisis le membre qui a payé.');return}if(!montant){toast('Indique le montant reçu.');return}if(!f.date){toast('Indique la date du paiement.');return}
  const before=situation(c.id,mid);const m=member(mid);
  const x={id:DB.seq++,campagneId:c.id,memberId:mid,montant,date:f.date,moyen:f.moyen,ref:f.moyen==='Espèces'?'':(f.ref||''),note:'',saisiPar:sessName(p),saisiLe:nowIso(),annule:false,motif:''};
  DB.payments.push(x);log(x.saisiPar,'Paiement validé',`${fullName(m)} — ${fmt(montant)} (${x.moyen}${x.ref?', réf. '+x.ref:''}), payé le ${fdate(x.date)} · ${c.nom}`);
  const after=situation(c.id,mid);
  const changes=after.months.filter((mo,i)=>mo.paid!==before.months[i].paid).map(mo=>`<div class="rl"><span>Mois ${mo.i+1} · ${moisNom(c,mo.i)}</span><b style="color:${mo.state==='paye'?'var(--ok)':'var(--amber)'}">${mo.state==='paye'?'Soldé ✓':fmtN(mo.paid)+' / '+fmtN(mo.due)+' (manque '+fmtN(mo.due-mo.paid)+')'}</b></div>`).join('');
  p.pay={cid:c.id,moyen:f.moyen,date:today()};
  notify({perm:'campagnes_voir'},'paiements',`Paiement validé : ${titleCase(fullName(m))}`,`${fmt(montant)} (${x.moyen}) · ${c.nom}`,sAcct(p).id);
  notify({mid},'paiements',`Versement enregistré : ${fmt(montant)}`,`${c.nom} · Total versé ${fmt(after.verse)} · Reste ${fmt(after.reste)}`,sAcct(p).id);
  PANES.forEach(o=>{if(o!==p&&o.session&&sRole(o).id==='membre'&&sMember(o).id===mid){o.tab='situation';o.sub=null;o.sel=c.id}});
  refresh();MCTX={pane:p.id};
  openModal(`<div style="text-align:center"><div class="avatar" style="margin:0 auto 10px;width:52px;height:52px"><i data-lucide="check" class="i" style="width:26px;height:26px"></i></div><h2>Paiement validé</h2><div class="muted">${esc(fullName(m))} · ${fmt(montant)} · ${x.moyen}</div></div>
  <div class="receipt mt"><div class="muted" style="font-weight:700;margin-bottom:4px">RÉPARTITION AUTOMATIQUE</div>${changes||'<div class="muted">Cotisation déjà soldée : montant enregistré en surplus.</div>'}
  <div class="rl" style="margin-top:6px"><span>Total versé</span><b>${fmt(after.verse)}</b></div><div class="rl"><span>Reste à payer</span><b>${fmt(after.reste)}</b></div><div class="rl"><span>Statut</span>${statutChip(after.statut)}</div></div>
  <div class="foot"><button class="btn sec" data-act="receipt" data-id="${x.id}"><i data-lucide="receipt" class="i"></i>Voir le reçu</button><button class="btn" data-act="closeModal">Terminé</button></div>`);
}
function showReceipt(id){
  const x=DB.payments.find(x=>x.id===id);const m=member(x.memberId);const c=camp(x.campagneId);const num='REC-'+String(x.id).padStart(5,'0');const s=situation(c.id,m.id);const pp=pane(MCTX&&MCTX.pane);const staff=pp&&sRole(pp).id!=='membre';
  const txt=`Reçu ${num} — Younity\n${fullName(m)}\n${c.nom} : ${fmt(x.montant)} (${x.moyen}) le ${fdate(x.date)}\nValidé par ${x.saisiPar}${x.annule?'\nANNULÉ : '+x.motif:''}`;
  openModal(`<h2>Reçu de paiement</h2><div class="receipt mt" style="${x.annule?'opacity:.6':''}">
    <div class="rc-head">${logoWhite(150)}<div style="text-align:right"><b style="font-size:12.5px;letter-spacing:.03em">REÇU DE PAIEMENT</b><div style="font-size:11.5px;opacity:.85">${num}</div></div></div>
    <div style="text-align:center;margin:8px 0 14px"><div class="muted">Montant reçu</div><div style="font-size:28px;font-weight:800">${fmt(x.montant)}</div>${x.annule?'<span class="chip late">ANNULÉ</span>':''}</div>
    <div class="rl"><span class="muted">Membre</span><b>${esc(fullName(m))}</b></div><div class="rl"><span class="muted">Campagne</span><b>${esc(c.nom)}</b></div>
    <div class="rl"><span class="muted">Date du paiement</span><b>${fdate(x.date)}</b></div><div class="rl"><span class="muted">Moyen</span><b>${x.moyen}</b></div>
    ${x.ref?`<div class="rl"><span class="muted">Référence</span><b>${esc(x.ref)}</b></div>`:''}<div class="rl"><span class="muted">Validé par</span><b>${esc(x.saisiPar)}</b></div></div>
  ${s?`<div class="card mt" style="background:#f6f9f7"><div class="row between mb"><div class="name" style="font-size:13px">Situation actuelle · ${esc(c.nom)}</div>${statutChip(s.statut)}</div><div class="kv"><span>Total versé</span><b style="color:var(--green)">${fmt(s.verse)} / ${fmt(s.total)}</b></div><div class="kv"><span>Reste à payer</span><b>${fmt(s.reste)}</b></div>${s.retard?`<div class="kv"><span>À payer pour être à jour</span><b style="color:var(--red)">${fmt(s.retard)}</b></div>`:''}<div class="dots" style="margin-top:8px">${s.months.map(mo=>`<i class="${mo.state}"></i>`).join('')}</div></div>`:''}
  <div class="name mt" style="font-size:13px">Reçu en PDF</div><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn sec" data-act="recPdf" data-id="${x.id}"><i data-lucide="file-down" class="i i-sm"></i>Télécharger</button><button class="btn ch-wa" data-act="recShare" data-id="${x.id}"><i data-lucide="share-2" class="i i-sm"></i>${staff?'Envoyer le PDF (WhatsApp…)':'Partager le PDF'}</button></div>
  ${staff?`<div class="name mt" style="font-size:13px">Ou envoyer en texte :</div><div style="margin-top:8px">${chans(m,txt,{size:''})}</div>`:''}
  <div class="foot">${staff&&!x.annule&&can(pp,'paiements_valider')?`<button class="btn sec" style="margin-right:auto;color:var(--red)" data-act="cancelPay" data-id="${x.id}">Annuler ce paiement</button>`:''}<button class="btn" data-act="closeModal">Fermer</button></div>`);
}

/* ---- jeunes ---- */
function readAnniv(){const j=document.getElementById('f-aj').value,m=document.getElementById('f-am').value;return j&&m?`${String(m).padStart(2,'0')}-${String(j).padStart(2,'0')}`:''}
function saveMember(id){
  const nom=document.getElementById('f-nom').value.trim().toUpperCase();if(!nom){toast('Le nom est obligatoire.');return}
  const prenoms=document.getElementById('f-prenoms').value.trim().toUpperCase();
  const tel=document.getElementById('f-tel').value.trim(),email=document.getElementById('f-email').value.trim().toLowerCase();
  if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){toast('E-mail invalide.');return}
  const dup=DB.members.find(m=>m.id!==id&&((tel&&digits(m.tel)===digits(tel))||(email&&m.email===email)||norm(fullName(m))===norm(nom+prenoms)));
  if(dup){toast(`Déjà enregistré : ${fullName(dup)}`);return}
  const data={nom,prenoms,tel,email,anniv:readAnniv(),baptise:FORMBAP,profession:document.getElementById('f-prof').value.trim(),habitation:document.getElementById('f-hab').value.trim(),
    deps:FORMDEP.slice(),departement:FORMDEP.join(', '),fonction:document.getElementById('f-fonction').value||'Membre',adhesion:document.getElementById('f-adh').value};
  if(id){const m=member(id);data.actif=document.getElementById('f-actif').value==='1';Object.assign(m,data);log(who(),'Fiche modifiée',fullName(m));closeModal();toast('Fiche mise à jour.');refresh();return}
  const wantAcc=document.getElementById('f-access').checked;
  const m={id:DB.seq++,...data,actif:true,creeLe:nowIso()};DB.members.push(m);log(who(),'Jeune enregistré',`${fullName(m)} (${data.departement||'sans département'})`);
  if(wantAcc&&(tel||email)){const ac={id:DB.seq++,memberId:m.id,roleId:'membre',pwd:genPwd(),actif:true,mustChange:true,creeLe:nowIso(),derniere:null};DB.accounts.push(ac);log(who(),'Accès créé',`${fullName(m)} — membre`);refresh();credModal(ac,'Jeune enregistré · accès créé')}
  else{closeModal();refresh();toast(wantAcc?'Enregistré. Pas d\'accès : il faut un téléphone ou un e-mail.':'Jeune enregistré.')}
}

/* ---- campagne ---- */
function ncRecalc(p){
  const root=document.getElementById('pane-'+p.id);if(!root)return;
  const deb=root.querySelector(`#nc-deb-${p.id}`)?.value,fin=root.querySelector(`#nc-fin-${p.id}`)?.value;const pb=root.querySelector(`#nc-per-${p.id}`);
  if(pb&&!pb.dataset.manuel){const a=perAuto(deb,fin);pb.querySelectorAll('.pill').forEach(b=>b.classList.toggle('on',b.dataset.v===a))}
  const per=root.querySelector(`#nc-per-${p.id} .pill.on`)?.dataset.v||'mois';
  const n0=nPeriodes(deb,fin,per),n=Math.max(1,n0);const u={jour:'jour',semaine:'sem.',mois:'mois',unique:'en une fois'}[per];let tot=0,cnt=0;
  const box=root.querySelector(`#nc-dur-${p.id}`);if(box){box.className='info mb'+(n0?'':' red');box.innerHTML=n0?`Du <b>${fdate(deb)}</b> au <b>${fdate(fin)}</b> → <b>${nbPer({periode:per},n0)}</b>${per==='unique'?` à verser au plus tard le ${fdate(fin)}`:` (une échéance chaque ${PER[per][0]})`}.${n0>{jour:120,semaine:104,mois:36,unique:1}[per]?' <b>Trop d\'échéances : choisis un autre rythme.</b>':''}`:'La date de fin doit être après la date de début.'}
  root.querySelectorAll('.nc-amt').forEach(i=>{const v=+digits(i.value);const chk=root.querySelector(`.nc-chk[data-m="${i.dataset.m}"]`).checked;const prev=root.querySelector(`.nc-prev[data-m="${i.dataset.m}"]`);
    prev.textContent=v&&chk?(per==='unique'?fmtN(v)+' '+u:fmtN(schedule(v,n)[0])+'/'+u):'';if(chk&&v){tot+=v;cnt++}});
  const t=root.querySelector(`#nc-tot-${p.id}`);if(t)t.textContent=`${fmt(tot)} · ${cnt} membres`;
}
function readCampForm(p){
  const root=document.getElementById('pane-'+p.id);const nom=root.querySelector(`#nc-nom-${p.id}`).value.trim();
  const deb=root.querySelector(`#nc-deb-${p.id}`).value,fin=root.querySelector(`#nc-fin-${p.id}`).value,per=root.querySelector(`#nc-per-${p.id} .pill.on`)?.dataset.v||'mois';const n=nPeriodes(deb,fin,per);
  if(!nom){toast('Donne un nom à la campagne.');return null}if(!deb||!fin){toast('Choisis la date de début et la date de fin.');return null}if(!n){toast('La date de fin doit être après la date de début.');return null}
  if(n>{jour:120,semaine:104,mois:36,unique:1}[per]){toast('Trop d\'échéances pour ce rythme : choisis-en un autre.');return null}
  const lignes=[];let bad=null;root.querySelectorAll('.nc-amt').forEach(i=>{const chk=root.querySelector(`.nc-chk[data-m="${i.dataset.m}"]`).checked;const v=+digits(i.value);if(chk&&v)lignes.push({memberId:+i.dataset.m,montant:v});else if(chk&&!v)bad=bad||member(+i.dataset.m)});
  if(bad){toast(`Montant manquant pour ${fullName(bad)} (ou décoche-le).`);return null}
  if(!lignes.length){toast('Indique au moins un montant.');return null}
  return{nom,n,deb,fin,per,lignes};
}
let PENDING=null;
function ncLaunch(p){
  const r=readCampForm(p);if(!r)return;const tot=r.lignes.reduce((a,l)=>a+l.montant,0);PENDING={pane:p.id,...r};MCTX={pane:p.id};
  openModal(`<h2>Lancer « ${esc(r.nom)} » ?</h2><div class="receipt mt"><div class="rl"><span>Période</span><b>${fdate(r.deb)} → ${fdate(r.fin)}</b></div><div class="rl"><span>Échéances</span><b>${nbPer({periode:r.per},r.n)}</b></div><div class="rl"><span>Membres</span><b>${r.lignes.length}</b></div><div class="rl"><span>Total attendu</span><b>${fmt(tot)}</b></div></div>
  <div class="info mt">Dès le lancement, la campagne apparaît chez la trésorière pour le suivi, et chaque membre voit sa cotisation et son échéancier.</div>
  <div class="foot"><button class="btn sec" data-act="closeModal">Retour</button><button class="btn gold" data-act="confirmLaunch"><i data-lucide="rocket" class="i"></i>Lancer</button></div>`);
}
function doLaunch(){
  const P=PENDING;if(!P)return;const p=pane(P.pane);const d=new Date();
  const c={id:DB.seq++,nom:P.nom,nbMois:P.n,debut:P.deb.slice(0,7),debutJ:P.deb,fin:P.fin,periode:P.per,statut:'En cours',creePar:sessName(p),creeLe:nowIso(),lignes:P.lignes};
  DB.campaigns.push(c);log(c.creePar,'Campagne lancée',`« ${c.nom} » — ${nbPer(c)} (${fdate(c.debutJ||c.debut+'-01')} → ${fdate(campFin(c))}), ${c.lignes.length} membres, ${fmt(campTotal(c))}`);
  notify({perm:'campagnes_voir'},'campagnes',`Nouvelle campagne : ${c.nom}`,`${nbPer(c)} · ${c.lignes.length} membres · ${fmt(campTotal(c))}`,sAcct(p).id);
  notify({mids:c.lignes.map(l=>l.memberId)},'campagnes',`Nouvelle cotisation : ${c.nom}`,`Ouvre « Ma situation » pour voir ton montant et ton échéancier (${nbPer(c)}, jusqu'au ${fdate(campFin(c))}).`,sAcct(p).id);
  PENDING=null;closeModal();p.sub={camp:c.id};toast('Campagne lancée !');refresh();
}
function ncSave(p,cid){
  const c=camp(cid);const r=readCampForm(p);if(!r)return;
  const ch=[];if(r.nom!==c.nom)ch.push(`nom : « ${c.nom} » → « ${r.nom} »`);if(r.deb!==(c.debutJ||c.debut+'-01')||r.fin!==campFin(c)||r.per!==(c.periode||'mois'))ch.push(`dates : ${fdate(c.debutJ||c.debut+'-01')} → ${fdate(campFin(c))} devient ${fdate(r.deb)} → ${fdate(r.fin)} (${nbPer({periode:r.per},r.n)})`);
  const oldMap=new Map(c.lignes.map(l=>[l.memberId,l.montant]));const newMap=new Map(r.lignes.map(l=>[l.memberId,l.montant]));
  const added=r.lignes.filter(l=>!oldMap.has(l.memberId)),removed=c.lignes.filter(l=>!newMap.has(l.memberId)),changed=r.lignes.filter(l=>oldMap.has(l.memberId)&&oldMap.get(l.memberId)!==l.montant);
  if(added.length)ch.push(`${added.length} membre(s) ajouté(s)`);if(removed.length)ch.push(`${removed.length} membre(s) retiré(s)`);if(changed.length)ch.push(`${changed.length} montant(s) modifié(s)`);
  if(!ch.length){toast('Aucune modification.');return}
  PENDING={pane:p.id,cid,...r,ch,changed,oldMap};MCTX={pane:p.id};
  const oldT=campTotal(c),newT=r.lignes.reduce((a,l)=>a+l.montant,0);
  openModal(`<h2>Enregistrer les modifications ?</h2><div class="receipt mt">${ch.map(x=>`<div class="rl"><span>${esc(x)}</span></div>`).join('')}
  ${changed.slice(0,8).map(l=>`<div class="rl"><span class="muted">${esc(fullName(member(l.memberId)))}</span><b>${fmtN(oldMap.get(l.memberId))} → ${fmtN(l.montant)}</b></div>`).join('')}${changed.length>8?`<div class="rl"><span class="muted">… et ${changed.length-8} autres</span></div>`:''}
  <div class="rl"><span>Total attendu</span><b>${fmt(oldT)} → ${fmt(newT)}</b></div></div>
  <div class="info mt">Les membres concernés verront leur nouvel échéancier tout de suite. Le changement est inscrit au journal.</div>
  <div class="foot"><button class="btn sec" data-act="closeModal">Retour</button><button class="btn" data-act="confirmSave">Enregistrer</button></div>`);
}
function doSave(){
  const P=PENDING;if(!P)return;const p=pane(P.pane);const c=camp(P.cid);
  c.nom=P.nom;c.nbMois=P.n;c.debut=P.deb.slice(0,7);c.debutJ=P.deb;c.fin=P.fin;c.periode=P.per;c.lignes=P.lignes;
  log(sessName(p),'Campagne modifiée',`« ${c.nom} » — ${P.ch.join(' ; ')}${P.changed.length?' · '+P.changed.map(l=>`${fullName(member(l.memberId))} ${fmtN(P.oldMap.get(l.memberId))}→${fmtN(l.montant)}`).join(', '):''}`);
  notify({perm:'campagnes_voir'},'campagnes',`Campagne modifiée : ${c.nom}`,P.ch.join(' ; '),sAcct(p).id);
  P.changed.forEach(l=>notify({mid:l.memberId},'campagnes',`Ta cotisation a changé : ${c.nom}`,`Nouveau montant : ${fmt(l.montant)} (${fmt(schedule(l.montant,c.nbMois)[0])}/mois)`,sAcct(p).id));
  PENDING=null;closeModal();p.sub={camp:c.id};toast('Campagne mise à jour.');refresh();
}

/* ================== EXCEL ================== */
let DL=null;
async function getDL(){if(DL!==null)return DL;try{DL=await window.claude?.use?.('downloads')||false}catch(e){DL=false}return DL}
async function saveXlsx(filename,sheets){
  if(typeof XLSX==='undefined'){toast('Module Excel non chargé.');return}
  const wb=XLSX.utils.book_new();
  sheets.forEach(([name,rows,widths])=>{const ws=XLSX.utils.aoa_to_sheet(rows);if(widths)ws['!cols']=widths.map(w=>({wch:w}));XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31))});
  const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  const dl=await getDL();
  if(!dl){toast('Téléchargement indisponible dans cette vue (il fonctionnera dans l\'application).');return}
  try{await dl.save({filename,data:new Blob([buf])});toast('Fichier Excel prêt : '+filename)}catch(err){if(err&&err.code==='declined')return;toast('Téléchargement refusé ou indisponible.')}
}
function exportMembers(p){const L=filteredMembers(p);saveXlsx('jeunes.xlsx',[['Jeunes',[['Nom','Prénoms','Téléphone','E-mail','Anniversaire','Baptisé','Profession',"Lieu d'habitation",'Département','Fonction','Membre depuis','Accès','Statut'],...L.map(m=>{const a=acctOfMember(m.id);return[m.nom,m.prenoms,m.tel,m.email,fanniv(m.anniv),m.baptise?'Oui':'Non',m.profession,m.habitation,m.departement||'',m.fonction,fdate(m.adhesion),a?role(a.roleId).nom:'Aucun',m.actif?'Actif':'Inactif']})],[26,20,15,26,14,6,8,18,18,24,26,13,16,9]]])}
function exportPays(p){const L=filteredPays(p);saveXlsx('paiements.xlsx',[['Paiements',[['Date du paiement','Membre','Campagne','Montant (FCFA)','Moyen','Référence','Validé par','Saisi le','Statut','Motif annulation'],...L.map(x=>[fdate(x.date),fullName(member(x.memberId)),camp(x.campagneId)?.nom,x.montant,x.moyen,x.ref,x.saisiPar,fdt(x.saisiLe),x.annule?'Annulé':'Validé',x.motif])],[14,32,22,14,14,22,30,16,10,24]]])}
function exportJournal(){saveXlsx('journal-operations.xlsx',[['Journal',[['Date','Auteur','Action','Détail'],...DB.journal.slice().reverse().map(e=>[fdt(e.t),e.auteur,e.action,e.detail])],[16,32,26,80]]])}
function exportCamp(p,id){const c=camp(id);if(!c)return;const rows=campRows(p,c);
  const head=['Nom & prénoms','Téléphone','Fonction','Cotisation',...Array.from({length:c.nbMois},(_,i)=>'Mois '+(i+1)),'Total versé','Reste à payer','Retard','Statut','Dernier paiement'];
  const out=rows.map(({l,m,x})=>[fullName(m),m.tel,m.fonction,l.montant,...x.months.map(y=>y.paid),x.verse,x.reste,x.retard,x.statut,x.dernier?fdate(x.dernier):'']);
  const sum=k=>rows.reduce((a,o)=>a+o.x[k],0);out.push(['TOTAL','','',rows.reduce((a,o)=>a+o.l.montant,0),...Array.from({length:c.nbMois},(_,i)=>rows.reduce((a,o)=>a+o.x.months[i].paid,0)),sum('verse'),sum('reste'),sum('retard'),'','']);
  const fl={all:'tous',solde:'soldes',nonsolde:'non-soldes',retard:'en-retard',ajour:'a-jour',paye:'ont-paye',zero:'rien-paye'}[p.f.cf||'all'];
  saveXlsx(`${norm(c.nom).toLowerCase()}-${fl}.xlsx`,[[c.nom,[head,...out],[32,15,26,12,...Array(c.nbMois).fill(9),12,12,10,11,14]]])}
function exportRel(p){const c=camp(+p.f.rc);const L=c.lignes.map(l=>({m:member(l.memberId),s:situation(c.id,l.memberId)})).filter(o=>o.s.statut!=='Soldé');
  saveXlsx(`relances-${norm(c.nom).toLowerCase()}.xlsx`,[['Relances',[['Nom & prénoms','Téléphone','Cotisation','Versé','Reste','Retard','Statut','Dernière relance'],...L.map(({m,s})=>{const lr=lastRel(c.id,m.id);return[fullName(m),m.tel,s.total,s.verse,s.reste,s.retard,s.statut,lr?fdate(lr):'']})],[30,15,12,12,12,12,11,15]]])}
function exportCreds(){const L=DB.accounts.filter(a=>a.actif);saveXlsx('acces-application.xlsx',[['Accès',[['Nom & prénoms','Rôle','Identifiant (téléphone)','Identifiant (e-mail)','Mot de passe provisoire','Changé par le membre'],...L.map(a=>{const m=member(a.memberId);return[fullName(m),role(a.roleId).nom,m.tel,m.email,a.mustChange?a.pwd:'(déjà changé)',a.mustChange?'Non':'Oui']})],[30,24,18,28,20,14]],['Important',[["Document confidentiel : il contient des mots de passe. Supprime-le après avoir transmis les accès."]],[90]]])}
function exportTemplate(){saveXlsx('modele-import-jeunes.xlsx',[['Jeunes',[['Nom','Prénoms','Téléphone','E-mail','Anniversaire (JJ/MM)','Baptisé (Oui/Non)','Profession',"Lieu d'habitation",'Département','Fonction'],['KOUASSI','AMANI JEAN','07 00 00 00 00','amani@mail.com','15/04','Oui','Étudiant','Yopougon','Jeunesse','Membre']],[16,20,16,24,16,16,16,18,22,16]],["Mode d'emploi",[['Une ligne par jeune à partir de la ligne 2 (efface l\'exemple).'],['Seul le Nom est obligatoire.'],['Anniversaire au format JJ/MM (jour/mois), l\'année n\'est pas nécessaire.'],['Département : écris-le exactement comme dans la liste des départements de l\'application ('+DB.settings.departements.join(', ')+').'],['Les doublons (même nom, même téléphone ou même e-mail) sont signalés à l\'import.']],[80]]])}

let IMPORT=null;
function handleImport(input,p){
  const f=input.files[0];if(!f)return;input.value='';
  if(typeof XLSX==='undefined'){toast('Module Excel non chargé.');return}
  const r=new FileReader();r.onload=ev=>{
    try{
      const wb=XLSX.read(new Uint8Array(ev.target.result),{type:'array',cellDates:true});
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''});
      const h=rows.findIndex(r=>r.some(c=>/nom/i.test(String(c))));if(h<0){toast('Colonne « Nom » introuvable.');return}
      const H=rows[h].map(c=>String(c));const col=re=>H.findIndex(c=>re.test(c));
      const cN=col(/^nom|nom\s*&|nom et/i)>=0?col(/^nom|nom\s*&|nom et/i):col(/nom/i),cP=col(/pr[ée]nom/i)!==cN?col(/pr[ée]nom/i):-1;
      const cT=col(/contact|t[ée]l|num[ée]ro/i),cE=col(/mail/i),cB=col(/naiss|anniv/i),cBa=col(/bapt/i),cPr=col(/profession|m[ée]tier/i),cH=col(/habit|lieu|quartier|commune/i),cD=col(/d[ée]part/i),cF=col(/fonction|poste/i);
      const dt=v=>{if(v instanceof Date)return String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0');const s=String(v).trim();let m=s.match(/^(\d{1,2})[\/.-](\d{1,2})/);if(m)return `${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;m=s.match(/^\d{4}-(\d{2})-(\d{2})$/);return m?`${m[1]}-${m[2]}`:''};
      const out=[];
      for(const r of rows.slice(h+1)){let n=String(r[cN]||'').trim();if(!n||/^(total|l[ée]gende|cellules|solde|mois)/i.test(n)||n.length>70)continue;
        const [nn,ff]=splitFonction(n);const fct0=cF>=0&&String(r[cF]).trim()?String(r[cF]).trim():ff;const fct=DB.settings.fonctions.find(x=>norm(x)===norm(fct0))||fct0;
        const o={nom:nn.toUpperCase(),prenoms:cP>=0?String(r[cP]).trim().toUpperCase():'',tel:cT>=0?String(r[cT]).trim():'',email:cE>=0?String(r[cE]).trim().toLowerCase():'',anniv:cB>=0?dt(r[cB]):'',
          baptise:cBa>=0?/^o|^y|1|vrai/i.test(String(r[cBa]).trim()):false,profession:cPr>=0?String(r[cPr]).trim():'',habitation:cH>=0?String(r[cH]).trim():'',
          departement:cD>=0?matchDep(String(r[cD]).trim()):'',fonction:fct||'Membre',adhesion:today()};
        const dup=DB.members.find(m=>norm(fullName(m))===norm(o.nom+o.prenoms)||(o.tel&&digits(m.tel)===digits(o.tel))||(o.email&&m.email===o.email))||out.find(x=>norm(x.nom+x.prenoms)===norm(o.nom+o.prenoms));
        o.dup=dup?fullName(dup):null;out.push(o)}
      if(!out.length){toast('Aucune ligne trouvée dans le fichier.');return}
      IMPORT={pane:p.id,rows:out,file:f.name};MCTX={pane:p.id};
      const nNew=out.filter(o=>!o.dup).length;
      openModal(`<h2>Importer « ${esc(f.name)} »</h2><div class="muted mb">${out.length} lignes lues · <b style="color:var(--green)">${nNew} nouveaux</b> · ${out.length-nNew} déjà présents (décochés)</div>
      <div class="tbl-wrap" style="max-height:50vh;overflow:auto"><table class="t"><thead><tr><th></th><th>Nom &amp; prénoms</th><th>Téléphone</th><th>Département</th><th></th></tr></thead><tbody>
      ${out.map((o,i)=>`<tr><td><input type="checkbox" class="imp-chk" data-i="${i}" ${o.dup?'':'checked'}></td><td class="name">${esc((o.nom+' '+o.prenoms).trim())}</td><td>${esc(o.tel)||'—'}</td><td>${esc(o.departement)||'—'}</td><td>${o.dup?`<span class="chip part">Déjà présent</span>`:'<span class="chip ok">Nouveau</span>'}</td></tr>`).join('')}
      </tbody></table></div>
      <label class="row mt" style="gap:8px;font-weight:600"><input type="checkbox" id="imp-acc" checked> Créer aussi leurs accès membres (si téléphone ou e-mail)</label>
      <div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button><button class="btn" data-act="confirmImport"><i data-lucide="upload" class="i"></i>Importer la sélection</button></div>`,null,true);
    }catch(err){toast('Fichier illisible : '+err.message)}
  };r.readAsArrayBuffer(f);
}
function confirmImport(){
  if(!IMPORT)return;const sel=[...document.querySelectorAll('.imp-chk')].filter(c=>c.checked).map(c=>IMPORT.rows[+c.dataset.i]);const acc=document.getElementById('imp-acc').checked;let na=0;
  sel.forEach(o=>{const{dup,...data}=o;const m={id:DB.seq++,...data,actif:true,creeLe:nowIso()};DB.members.push(m);if(acc&&(m.tel||m.email)){DB.accounts.push({id:DB.seq++,memberId:m.id,roleId:'membre',pwd:genPwd(),actif:true,mustChange:true,creeLe:nowIso(),derniere:null});na++}});
  log(who(),'Import Excel',`${sel.length} jeunes ajoutés depuis « ${IMPORT.file} »${na?`, ${na} accès créés`:''}`);
  IMPORT=null;closeModal();toast(`${sel.length} jeunes ajoutés${na?`, ${na} accès créés`:''}.`);refresh();
}

/* ================== INIT ================== */
document.getElementById('splashBtn').addEventListener('click',()=>{if(MODE==='web'){USERMODE='app';setupPanes()}showSplash()});
document.getElementById('resetBtn').addEventListener('click',()=>{openModal(`<h2>Réinitialiser la démo ?</h2><div class="muted">Les modifications faites sur cet appareil seront effacées et les données de départ restaurées (nouveaux mots de passe de démonstration).</div><div class="foot"><button class="btn sec" data-act="closeModal">Annuler</button><button class="btn danger" id="doReset">Réinitialiser</button></div>`);
  document.getElementById('doReset').onclick=()=>{DB=seed();persist();closeModal();CACHE={};setupPanes();toast('Démo réinitialisée.')}});
DB=load()||seed();{const t=DB.roles.find(r=>r.id==='tresorier');if(t&&!t.perms.includes('campagnes_lancer'))t.perms.push('campagnes_lancer')}persist();
let lastNarrow=window.innerWidth<760;
window.addEventListener('resize',()=>{const n=window.innerWidth<760;if(n!==lastNarrow){lastNarrow=n;setupPanes()}});
setupPanes();getDL();
