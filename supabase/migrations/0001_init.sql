-- =====================================================================
-- Younity — schéma initial de la base de données (Supabase / PostgreSQL)
-- Jeunes, listes de référence, rôles et comptes, campagnes, paiements,
-- relances, notifications, journal, paramètres + règles d'accès (RLS).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Listes de référence (gérées par le président)
-- ---------------------------------------------------------------------
create table public.departements (
  id      serial primary key,
  nom     text not null unique,
  cree_le timestamptz not null default now()
);

create table public.fonctions (
  id      serial primary key,
  nom     text not null unique,
  cree_le timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Registre des jeunes
-- ---------------------------------------------------------------------
create table public.membres (
  id             uuid primary key default gen_random_uuid(),
  nom            text not null check (length(trim(nom)) > 0),
  prenoms        text not null default '',
  tel            text,
  email          text,
  anniv_jour     smallint check (anniv_jour between 1 and 31),
  anniv_mois     smallint check (anniv_mois between 1 and 12),
  baptise        boolean not null default false,
  profession     text,
  habitation     text,
  departement_id integer references public.departements(id) on delete set null,
  fonction_id    integer references public.fonctions(id) on delete set null,
  adhesion       date not null default current_date,
  actif          boolean not null default true,
  cree_le        timestamptz not null default now(),
  check ((anniv_jour is null) = (anniv_mois is null))
);
-- Un même e-mail ne peut pas servir à deux jeunes. Un numéro peut être partagé
-- (famille), mais il ne peut alors servir d'identifiant qu'à un seul compte
-- (vérifié à la création de l'accès et dans login_email()).
create index membres_tel_idx on public.membres ((regexp_replace(tel, '\D', '', 'g')));
create unique index membres_email_unique on public.membres (lower(email))
  where email is not null and email <> '';

-- ---------------------------------------------------------------------
-- 3. Rôles, permissions et comptes
-- ---------------------------------------------------------------------
create table public.roles (
  id          text primary key,
  nom         text not null,
  systeme     boolean not null default false,
  permissions text[] not null default '{}'
);

insert into public.roles (id, nom, systeme, permissions) values
  ('president',   'Président (super admin)', true,
     array['membres_voir','membres_gerer','campagnes_voir','campagnes_lancer','paiements_valider',
           'relances','journal','exports','acces_gerer','parametres']),
  ('commissaire', 'Commissaire aux comptes', false, array['membres_voir','campagnes_voir','campagnes_lancer','journal','exports']),
  ('tresorier',   'Trésorier(e)',            false, array['membres_voir','campagnes_voir','paiements_valider','relances','exports']),
  ('secretaire',  'Secrétaire',              false, array['membres_voir','campagnes_voir','relances','exports']),
  ('membre',      'Membre',                  true,  '{}');

-- Un compte = un utilisateur Supabase Auth relié à un jeune du registre.
-- L'identifiant de connexion est le téléphone ou l'e-mail ; en interne,
-- l'utilisateur Auth a une adresse technique (voir login_email()).
create table public.comptes (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  membre_id          uuid not null unique references public.membres(id) on delete cascade,
  role_id            text not null default 'membre' references public.roles(id),
  actif              boolean not null default true,       -- false = compte bloqué
  motif_blocage      text,
  doit_changer_mdp   boolean not null default true,
  derniere_connexion timestamptz,
  prefs              jsonb not null default '{"messages":true,"paiements":true,"campagnes":true,"relances":true,"anniversaires":true}',
  cree_le            timestamptz not null default now()
);
-- Un seul président
create unique index comptes_un_seul_president on public.comptes (role_id) where role_id = 'president';

-- ---------------------------------------------------------------------
-- 4. Campagnes, lignes (montant par jeune), paiements
-- ---------------------------------------------------------------------
create table public.campagnes (
  id       uuid primary key default gen_random_uuid(),
  nom      text not null check (length(trim(nom)) > 0),
  nb_mois  smallint not null check (nb_mois between 1 and 36),
  debut    date not null default date_trunc('month', current_date)::date,  -- Mois 1 = mois du lancement
  statut   text not null default 'en_cours' check (statut in ('en_cours','cloturee')),
  cree_par uuid references public.membres(id) on delete set null,
  cree_le  timestamptz not null default now(),
  check (debut = date_trunc('month', debut)::date)
);

create table public.campagne_lignes (
  campagne_id uuid not null references public.campagnes(id) on delete cascade,
  membre_id   uuid not null references public.membres(id) on delete restrict,
  montant     integer not null check (montant > 0),
  primary key (campagne_id, membre_id)
);

create table public.paiements (
  id                uuid primary key default gen_random_uuid(),
  numero            bigserial unique,                   -- numéro de reçu (REC-00001)
  campagne_id       uuid not null,
  membre_id         uuid not null,
  montant           integer not null check (montant > 0),
  date_paiement     date not null default current_date,
  moyen             text not null check (moyen in ('Orange Money','MTN MoMo','Moov Money','Wave','Espèces')),
  reference         text,
  source            text not null default 'tresoriere' check (source in ('tresoriere','appli')),
  saisi_par         uuid references public.membres(id) on delete set null,
  saisi_le          timestamptz not null default now(),
  annule            boolean not null default false,
  motif_annulation  text,
  annule_par        uuid references public.membres(id) on delete set null,
  annule_le         timestamptz,
  -- Un membre qui a déjà payé ne peut pas être retiré de la campagne
  foreign key (campagne_id, membre_id) references public.campagne_lignes(campagne_id, membre_id) on delete restrict,
  check (not annule or (motif_annulation is not null and length(trim(motif_annulation)) > 0))
);
create index paiements_membre_idx on public.paiements (membre_id, saisi_le desc);
create index paiements_campagne_idx on public.paiements (campagne_id);

-- ---------------------------------------------------------------------
-- 5. Relances, notifications, journal, paramètres
-- ---------------------------------------------------------------------
create table public.relances (
  id          bigserial primary key,
  campagne_id uuid not null references public.campagnes(id) on delete cascade,
  membre_id   uuid not null references public.membres(id) on delete cascade,
  canal       text not null check (canal in ('whatsapp','sms','appli','groupe')),
  par         uuid references public.membres(id) on delete set null,
  le          timestamptz not null default now()
);

create table public.notifications (
  id        bigserial primary key,
  membre_id uuid not null references public.membres(id) on delete cascade,   -- destinataire
  type      text not null check (type in ('messages','paiements','campagnes','relances','anniversaires')),
  titre     text not null,
  corps     text not null default '',
  auteur    uuid references public.membres(id) on delete set null,
  lu        boolean not null default false,
  cree_le   timestamptz not null default now()
);
create index notifications_dest_idx on public.notifications (membre_id, cree_le desc);

create table public.journal (
  id      bigserial primary key,
  le      timestamptz not null default now(),
  auteur  uuid references public.membres(id) on delete set null,
  action  text not null,
  detail  text not null default ''
);

create table public.parametres (
  id               boolean primary key default true check (id),
  paiement_integre boolean not null default false,
  operateurs       jsonb not null default '{"Orange Money":true,"MTN MoMo":true,"Moov Money":true,"Wave":true}',
  nom_app          text not null default 'Younity'
);
insert into public.parametres default values;

-- =====================================================================
-- 6. Fonctions utilitaires
-- =====================================================================

-- Le jeune connecté (null si compte bloqué ou jeune inactif)
create or replace function public.current_membre() returns uuid
language sql stable security definer set search_path = public as $$
  select c.membre_id from comptes c join membres m on m.id = c.membre_id
  where c.user_id = auth.uid() and c.actif and m.actif
$$;

create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from comptes c join roles r on r.id = c.role_id join membres m on m.id = c.membre_id
    where c.user_id = auth.uid() and c.actif and m.actif
      and (r.id = 'president' or p = any(r.permissions)))
$$;

create or replace function public.is_president() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from comptes c where c.user_id = auth.uid() and c.actif and c.role_id = 'president')
$$;

-- Échéancier : mensualités arrondies à 5 FCFA, le dernier mois absorbe la différence
create or replace function public.echeancier(montant integer, n integer) returns integer[]
language sql immutable as $$
  select array_agg(case when i < n then (floor(montant::numeric / n / 5) * 5)::int
                        else montant - (floor(montant::numeric / n / 5) * 5)::int * (n - 1) end order by i)
  from generate_series(1, n) i
$$;

-- Mois en cours d'une campagne (1..nb_mois), compté depuis le lancement
create or replace function public.mois_courant(c public.campagnes) returns integer
language sql stable as $$
  select case when c.statut = 'cloturee' then c.nb_mois
    else greatest(0, least(c.nb_mois,
      (extract(year from age(date_trunc('month', current_date), c.debut)) * 12
       + extract(month from age(date_trunc('month', current_date), c.debut)))::int + 1)) end
$$;

-- =====================================================================
-- 7. Situations (calculées, jamais stockées)
-- =====================================================================

-- Situation d'un jeune dans une campagne
create or replace view public.v_situations with (security_invoker = true) as
with base as (
  select l.campagne_id, l.membre_id, l.montant as total, c.nb_mois, c.statut,
         public.mois_courant(c) as cur, public.echeancier(l.montant, c.nb_mois) as ech,
         coalesce((select sum(p.montant) from public.paiements p
                   where p.campagne_id = l.campagne_id and p.membre_id = l.membre_id and not p.annule), 0)::int as verse,
         (select max(p.date_paiement) from public.paiements p
                   where p.campagne_id = l.campagne_id and p.membre_id = l.membre_id and not p.annule) as dernier_paiement
  from public.campagne_lignes l join public.campagnes c on c.id = l.campagne_id
)
select campagne_id, membre_id, total, nb_mois, cur as mois_courant, ech[1] as mensualite, verse,
       greatest(0, total - verse) as reste,
       greatest(0, (select coalesce(sum(x), 0) from unnest(ech) with ordinality t(x, i) where i <= cur)::int - verse) as retard,
       case when verse >= total then 'solde'
            when (select coalesce(sum(x), 0) from unnest(ech) with ordinality t(x, i) where i <= cur) > verse then 'en_retard'
            else 'a_jour' end as statut,
       dernier_paiement
from base;

-- Détail mois par mois : chaque paiement complète d'abord le mois le plus ancien
create or replace view public.v_situation_mois with (security_invoker = true) as
select s.campagne_id, s.membre_id, t.i::int as mois, t.du,
       least(t.du, greatest(0, s.verse - (t.cumul - t.du)))::int as paye,
       case when least(t.du, greatest(0, s.verse - (t.cumul - t.du))) >= t.du then 'paye'
            when greatest(0, s.verse - (t.cumul - t.du)) > 0 then 'partiel'
            when t.i <= s.mois_courant then 'du'
            else 'a_venir' end as etat
from public.v_situations s
join public.campagne_lignes l on l.campagne_id = s.campagne_id and l.membre_id = s.membre_id
join public.campagnes c on c.id = s.campagne_id
cross join lateral (
  select x as du, i, sum(x) over (order by i) as cumul
  from unnest(public.echeancier(l.montant, c.nb_mois)) with ordinality u(x, i)
) t;

-- Totaux par campagne
create or replace view public.v_campagnes_stats with (security_invoker = true) as
select c.id as campagne_id, c.nom, c.nb_mois, c.statut, public.mois_courant(c) as mois_courant,
       count(s.membre_id)::int as nb_membres,
       coalesce(sum(s.total), 0)::int as attendu,
       coalesce(sum(least(s.verse, s.total)), 0)::int as encaisse,
       coalesce(sum(s.reste), 0)::int as reste,
       coalesce(sum(s.retard), 0)::int as arrieres,
       count(*) filter (where s.statut = 'solde')::int as nb_soldes,
       count(*) filter (where s.statut = 'en_retard')::int as nb_retard,
       count(*) filter (where s.statut = 'a_jour')::int as nb_a_jour
from public.campagnes c left join public.v_situations s on s.campagne_id = c.id
group by c.id;

-- =====================================================================
-- 8. Journal et notifications automatiques (déclencheurs)
-- =====================================================================
create or replace function public.journaliser(p_action text, p_detail text) returns void
language sql security definer set search_path = public as $$
  insert into journal (auteur, action, detail) values (current_membre(), p_action, coalesce(p_detail, ''))
$$;

-- Envoie une notification à tous les comptes actifs qui ont une permission
create or replace function public.notifier_permission(p_perm text, p_type text, p_titre text, p_corps text) returns void
language sql security definer set search_path = public as $$
  insert into notifications (membre_id, type, titre, corps, auteur)
  select c.membre_id, p_type, p_titre, p_corps, current_membre()
  from comptes c join roles r on r.id = c.role_id
  where c.actif and (r.id = 'president' or p_perm = any(r.permissions))
    and c.membre_id is distinct from current_membre()
$$;

create or replace function public.nom_complet(m uuid) returns text
language sql stable security definer set search_path = public as $$
  select trim(nom || ' ' || prenoms) from membres where id = m
$$;

create or replace function public.fmt_fcfa(n integer) returns text language sql immutable as $$
  select replace(to_char(n, 'FM999G999G999'), ',', ' ') || ' FCFA'
$$;

create or replace function public.trg_paiement() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_camp text; v_nom text; s record;
begin
  select nom into v_camp from campagnes where id = new.campagne_id;
  v_nom := nom_complet(new.membre_id);
  select * into s from v_situations where campagne_id = new.campagne_id and membre_id = new.membre_id;
  if tg_op = 'INSERT' then
    perform journaliser(case when new.source = 'appli' then 'Paiement reçu (appli)' else 'Paiement validé' end,
      format('%s — %s (%s%s), payé le %s · %s', v_nom, fmt_fcfa(new.montant), new.moyen,
             coalesce(', réf. ' || new.reference, ''), to_char(new.date_paiement, 'DD/MM/YYYY'), v_camp));
    insert into notifications (membre_id, type, titre, corps, auteur)
      values (new.membre_id, 'paiements', 'Versement enregistré : ' || fmt_fcfa(new.montant),
              format('%s · Total versé %s · Reste %s', v_camp, fmt_fcfa(s.verse), fmt_fcfa(s.reste)), current_membre());
    perform notifier_permission('campagnes_voir', 'paiements',
      case when new.source = 'appli' then 'Paiement reçu dans l''appli : ' else 'Paiement validé : ' end || v_nom,
      format('%s (%s) · %s', fmt_fcfa(new.montant), new.moyen, v_camp));
  elsif tg_op = 'UPDATE' and new.annule and not old.annule then
    perform journaliser('Paiement annulé', format('%s — %s · motif : %s', v_nom, fmt_fcfa(new.montant), new.motif_annulation));
    insert into notifications (membre_id, type, titre, corps, auteur)
      values (new.membre_id, 'paiements', 'Paiement annulé : ' || fmt_fcfa(new.montant), 'Motif : ' || new.motif_annulation, current_membre());
  end if;
  return new;
end $$;
create trigger paiements_apres after insert or update on public.paiements
  for each row execute function public.trg_paiement();

create or replace function public.trg_campagne() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser('Campagne lancée', format('« %s » — %s mois', new.nom, new.nb_mois));
    perform notifier_permission('campagnes_voir', 'campagnes', 'Nouvelle campagne : ' || new.nom, new.nb_mois || ' mois');
  elsif tg_op = 'UPDATE' then
    if new.statut <> old.statut then
      perform journaliser(case when new.statut = 'cloturee' then 'Campagne clôturée' else 'Campagne rouverte' end, new.nom);
    end if;
    if new.nom <> old.nom or new.nb_mois <> old.nb_mois then
      perform journaliser('Campagne modifiée', format('« %s » → « %s », %s → %s mois', old.nom, new.nom, old.nb_mois, new.nb_mois));
    end if;
  end if;
  return new;
end $$;
create trigger campagnes_apres after insert or update on public.campagnes
  for each row execute function public.trg_campagne();

create or replace function public.trg_ligne() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_camp text;
begin
  select nom into v_camp from campagnes where id = coalesce(new.campagne_id, old.campagne_id);
  if tg_op = 'INSERT' then
    insert into notifications (membre_id, type, titre, corps, auteur)
      values (new.membre_id, 'campagnes', 'Nouvelle cotisation : ' || v_camp,
              'Ton montant : ' || fmt_fcfa(new.montant) || '. Ouvre « Ma situation » pour voir ton échéancier.', current_membre());
  elsif tg_op = 'UPDATE' and new.montant <> old.montant then
    perform journaliser('Montant modifié', format('%s — %s : %s → %s', nom_complet(new.membre_id), v_camp, fmt_fcfa(old.montant), fmt_fcfa(new.montant)));
    insert into notifications (membre_id, type, titre, corps, auteur)
      values (new.membre_id, 'campagnes', 'Ta cotisation a changé : ' || v_camp, 'Nouveau montant : ' || fmt_fcfa(new.montant), current_membre());
  elsif tg_op = 'DELETE' then
    perform journaliser('Membre retiré de la campagne', format('%s — %s', nom_complet(old.membre_id), v_camp));
    return old;
  end if;
  return new;
end $$;
create trigger lignes_apres after insert or update or delete on public.campagne_lignes
  for each row execute function public.trg_ligne();

create or replace function public.trg_membre() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser('Jeune enregistré', trim(new.nom || ' ' || new.prenoms));
  elsif new.actif <> old.actif then
    perform journaliser(case when new.actif then 'Membre réactivé' else 'Membre rendu inactif' end, trim(new.nom || ' ' || new.prenoms));
    if not new.actif then
      update comptes set actif = false, motif_blocage = coalesce(motif_blocage, 'Membre rendu inactif')
      where membre_id = new.id and actif;
    else
      update comptes set actif = true, motif_blocage = null
      where membre_id = new.id and motif_blocage = 'Membre rendu inactif';
    end if;
  else
    perform journaliser('Fiche modifiée', trim(new.nom || ' ' || new.prenoms));
  end if;
  return new;
end $$;
create trigger membres_apres after insert or update on public.membres
  for each row execute function public.trg_membre();

create or replace function public.trg_compte() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser('Accès créé', nom_complet(new.membre_id) || ' — ' || new.role_id);
  else
    if new.role_id <> old.role_id then
      perform journaliser('Rôle attribué', format('%s : %s → %s', nom_complet(new.membre_id), old.role_id, new.role_id));
      insert into notifications (membre_id, type, titre, corps, auteur)
        values (new.membre_id, 'messages', 'Nouveau rôle', 'Le président t''a attribué un nouveau rôle.', current_membre());
    end if;
    if new.actif <> old.actif then
      perform journaliser(case when new.actif then 'Compte débloqué' else 'Compte bloqué' end,
        nom_complet(new.membre_id) || coalesce(' — motif : ' || new.motif_blocage, ''));
    end if;
  end if;
  return new;
end $$;
create trigger comptes_apres after insert or update on public.comptes
  for each row execute function public.trg_compte();

-- Le président ne peut ni être bloqué, ni perdre son rôle depuis l'application
create or replace function public.trg_protege_president() returns trigger
language plpgsql as $$
begin
  if old.role_id = 'president' and (new.role_id <> 'president' or not new.actif) then
    raise exception 'Le compte du président ne peut pas être bloqué ni rétrogradé.';
  end if;
  return new;
end $$;
create trigger comptes_protege_president before update on public.comptes
  for each row execute function public.trg_protege_president();

-- =====================================================================
-- 9. Fonctions appelées par l'application (RPC)
-- =====================================================================

-- Connexion : transforme « téléphone ou e-mail » en adresse technique Auth.
-- Ne renvoie rien si le compte n'existe pas, est bloqué ou si le jeune est inactif.
create or replace function public.login_email(identifiant text) returns text
language sql stable security definer set search_path = public, auth as $$
  with t as (
    select u.email from comptes c join membres m on m.id = c.membre_id join auth.users u on u.id = c.user_id
    where c.actif and m.actif and (
      (length(regexp_replace(identifiant, '\D', '', 'g')) >= 8
         and regexp_replace(m.tel, '\D', '', 'g') = regexp_replace(identifiant, '\D', '', 'g'))
      or (position('@' in identifiant) > 0 and lower(m.email) = lower(trim(identifiant)))))
  select email from t where (select count(*) from t) = 1   -- identifiant ambigu → refusé
$$;
revoke all on function public.login_email(text) from public;
grant execute on function public.login_email(text) to anon, authenticated;

create or replace function public.enregistrer_connexion() returns void
language sql security definer set search_path = public as $$
  update comptes set derniere_connexion = now() where user_id = auth.uid()
$$;

create or replace function public.mot_de_passe_change() returns void
language sql security definer set search_path = public as $$
  update comptes set doit_changer_mdp = false where user_id = auth.uid()
$$;

create or replace function public.maj_mon_email(nouvel_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_membre() is null then raise exception 'Non connecté'; end if;
  if nouvel_email is not null and nouvel_email <> '' and nouvel_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail invalide';
  end if;
  update membres set email = nullif(lower(trim(nouvel_email)), '') where id = current_membre();
end $$;

create or replace function public.maj_mes_prefs(p jsonb) returns void
language sql security definer set search_path = public as $$
  update comptes set prefs = prefs || p where user_id = auth.uid()
$$;

create or replace function public.annuler_paiement(p_id uuid, p_motif text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('paiements_valider') then raise exception 'Action réservée à la trésorerie'; end if;
  if p_motif is null or length(trim(p_motif)) = 0 then raise exception 'Le motif est obligatoire'; end if;
  update paiements set annule = true, motif_annulation = trim(p_motif), annule_par = current_membre(), annule_le = now()
  where id = p_id and not annule;
end $$;

create or replace function public.bloquer_compte(p_membre uuid, p_motif text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_president() then raise exception 'Action réservée au président'; end if;
  update comptes set actif = false, motif_blocage = nullif(trim(coalesce(p_motif, '')), '') where membre_id = p_membre;
end $$;

create or replace function public.debloquer_compte(p_membre uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_president() then raise exception 'Action réservée au président'; end if;
  update comptes set actif = true, motif_blocage = null where membre_id = p_membre;
  insert into notifications (membre_id, type, titre, corps, auteur)
    values (p_membre, 'messages', 'Ton compte a été débloqué', 'Tu peux de nouveau te connecter.', current_membre());
end $$;

create or replace function public.attribuer_role(p_membre uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_president() then raise exception 'Action réservée au président'; end if;
  if p_role = 'president' then raise exception 'Le rôle de président ne peut pas être attribué ici.'; end if;
  update comptes set role_id = p_role where membre_id = p_membre;
end $$;

create or replace function public.envoyer_message(p_membre uuid, p_titre text, p_corps text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (has_perm('relances') or has_perm('membres_gerer') or has_perm('paiements_valider')) then
    raise exception 'Action réservée au bureau';
  end if;
  insert into notifications (membre_id, type, titre, corps, auteur) values (p_membre, 'messages', p_titre, p_corps, current_membre());
  perform journaliser('Message envoyé', 'À ' || nom_complet(p_membre) || ' (appli)');
end $$;

create or replace function public.enregistrer_relance(p_campagne uuid, p_membre uuid, p_canal text) returns void
language plpgsql security definer set search_path = public as $$
declare s record; v_camp text;
begin
  if not has_perm('relances') then raise exception 'Action réservée au bureau'; end if;
  select * into s from v_situations where campagne_id = p_campagne and membre_id = p_membre;
  select nom into v_camp from campagnes where id = p_campagne;
  insert into relances (campagne_id, membre_id, canal, par) values (p_campagne, p_membre, p_canal, current_membre());
  insert into notifications (membre_id, type, titre, corps, auteur)
    values (p_membre, 'relances', 'Rappel : ' || v_camp,
            format('Mois %s/%s : tu dois payer %s pour être à jour.', s.mois_courant, s.nb_mois, fmt_fcfa(greatest(s.retard, 0))), current_membre());
  perform journaliser('Relance envoyée', format('%s — %s (%s)', nom_complet(p_membre), v_camp, p_canal));
end $$;

-- Anniversaires visibles par tous les jeunes connectés (champs limités)
create or replace function public.anniversaires() returns table (membre_id uuid, nom text, prenoms text, tel text,
  anniv_jour smallint, anniv_mois smallint, departement text)
language sql stable security definer set search_path = public as $$
  select m.id, m.nom, m.prenoms, m.tel, m.anniv_jour, m.anniv_mois, d.nom
  from membres m left join departements d on d.id = m.departement_id
  where current_membre() is not null and m.actif and m.anniv_jour is not null
$$;

-- =====================================================================
-- 10. Règles d'accès (Row Level Security)
-- =====================================================================
alter table public.departements    enable row level security;
alter table public.fonctions       enable row level security;
alter table public.membres         enable row level security;
alter table public.roles           enable row level security;
alter table public.comptes         enable row level security;
alter table public.campagnes       enable row level security;
alter table public.campagne_lignes enable row level security;
alter table public.paiements       enable row level security;
alter table public.relances        enable row level security;
alter table public.notifications   enable row level security;
alter table public.journal         enable row level security;
alter table public.parametres      enable row level security;

-- Listes : lisibles par tout jeune connecté, gérées par ceux qui gèrent les jeunes
create policy lire on public.departements for select to authenticated using (current_membre() is not null);
create policy gerer on public.departements for all to authenticated using (has_perm('membres_gerer')) with check (has_perm('membres_gerer'));
create policy lire on public.fonctions for select to authenticated using (current_membre() is not null);
create policy gerer on public.fonctions for all to authenticated using (has_perm('membres_gerer')) with check (has_perm('membres_gerer'));

-- Jeunes : le bureau voit le registre ; chacun voit sa propre fiche
create policy lire on public.membres for select to authenticated using (has_perm('membres_voir') or id = current_membre());
create policy creer on public.membres for insert to authenticated with check (has_perm('membres_gerer'));
create policy modifier on public.membres for update to authenticated using (has_perm('membres_gerer')) with check (has_perm('membres_gerer'));

-- Rôles : lisibles par tous, modifiés par le président (sauf rôles système)
create policy lire on public.roles for select to authenticated using (true);
create policy gerer on public.roles for all to authenticated using (is_president() and not systeme) with check (is_president() and not systeme);

-- Comptes : chacun voit le sien ; le bureau voit le statut ; seuls les RPC / fonctions serveur les modifient
create policy lire on public.comptes for select to authenticated using (user_id = auth.uid() or has_perm('membres_voir'));

-- Campagnes : le bureau voit tout ; un jeune voit les campagnes qui le concernent
create policy lire on public.campagnes for select to authenticated using (
  has_perm('campagnes_voir') or exists (select 1 from campagne_lignes l where l.campagne_id = campagnes.id and l.membre_id = current_membre()));
create policy creer on public.campagnes for insert to authenticated with check (has_perm('campagnes_lancer'));
create policy modifier on public.campagnes for update to authenticated using (has_perm('campagnes_lancer')) with check (has_perm('campagnes_lancer'));

create policy lire on public.campagne_lignes for select to authenticated using (has_perm('campagnes_voir') or membre_id = current_membre());
create policy gerer on public.campagne_lignes for all to authenticated using (has_perm('campagnes_lancer')) with check (has_perm('campagnes_lancer'));

-- Paiements : la trésorerie enregistre ; les paiements « appli » sont écrits par le serveur (service_role)
create policy lire on public.paiements for select to authenticated using (
  has_perm('campagnes_voir') or has_perm('journal') or membre_id = current_membre());
create policy saisir on public.paiements for insert to authenticated with check (
  has_perm('paiements_valider') and source = 'tresoriere' and saisi_par = current_membre() and not annule
  and exists (select 1 from campagnes c where c.id = campagne_id and c.statut = 'en_cours'));

create policy lire on public.relances for select to authenticated using (has_perm('relances') or has_perm('campagnes_voir'));

create policy lire on public.notifications for select to authenticated using (membre_id = current_membre());
create policy marquer_lu on public.notifications for update to authenticated using (membre_id = current_membre()) with check (membre_id = current_membre());

create policy lire on public.journal for select to authenticated using (has_perm('journal'));

create policy lire on public.parametres for select to authenticated using (current_membre() is not null);
create policy modifier on public.parametres for update to authenticated using (has_perm('parametres')) with check (has_perm('parametres'));

-- Droits SQL de base pour les rôles Supabase
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.journaliser(text, text) from public, anon, authenticated;
revoke execute on function public.notifier_permission(text, text, text, text) from public, anon, authenticated;
