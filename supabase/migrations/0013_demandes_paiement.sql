-- 0013 — Paiement en espèces par QR code et paiement par capture (Wave, Orange Money, banque…).
--   * Le jeune crée une demande : QR (valable 30 min, à usage unique) ou capture (image + infos lues).
--   * La trésorière (ou toute personne autorisée à valider, dont le président) la valide : le paiement
--     est créé en une seule opération, avec son nom ; si c'est le président, la trésorière est prévenue.
--   * Les captures sont rangées dans un espace privé (bucket « captures »).

alter table public.paiements drop constraint if exists paiements_moyen_check;
alter table public.paiements add constraint paiements_moyen_check
  check (moyen in ('Orange Money','MTN MoMo','Moov Money','Wave','Espèces','Dépôt bancaire'));
alter table public.paiements add column if not exists demande_id uuid;

create table if not exists public.demandes_paiement (
  id            uuid primary key default gen_random_uuid(),
  membre_id     uuid not null references public.membres(id) on delete cascade,
  campagne_id   uuid not null references public.campagnes(id) on delete cascade,
  type          text not null check (type in ('qr','capture')),
  source        text not null default 'membre' check (source in ('membre','tresoriere')),
  montant       integer not null check (montant > 0),
  code          text,
  statut        text not null default 'en_attente' check (statut in ('en_attente','validee','rejetee','expiree','annulee')),
  image         text,
  operateur     text,
  reference     text,
  date_paiement date,
  ocr_lu        boolean not null default false,
  valide_par    uuid references public.membres(id) on delete set null,
  valide_le     timestamptz,
  paiement_id   uuid references public.paiements(id) on delete set null,
  motif         text,
  vu            boolean not null default false,
  cree_par      uuid references public.membres(id) on delete set null,
  cree_le       timestamptz not null default now(),
  expire_le     timestamptz
);
create index if not exists demandes_membre_idx on public.demandes_paiement (membre_id, cree_le desc);
create index if not exists demandes_attente_idx on public.demandes_paiement (statut) where statut = 'en_attente';
alter table public.demandes_paiement enable row level security;
create policy lire on public.demandes_paiement for select to authenticated
  using (membre_id = current_membre() or has_perm('paiements_valider'));
grant select on public.demandes_paiement to authenticated;

-- Une référence de transaction ne peut servir qu'une fois
create or replace function public.reference_utilisee(p_ref text, p_sauf uuid default null) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select 'déjà utilisée pour le paiement de ' || nom_complet(p.membre_id) || ' du ' || to_char(p.date_paiement, 'DD/MM/YYYY')
       from paiements p where not p.annule and p.reference is not null
        and upper(regexp_replace(p.reference, '\s', '', 'g')) = upper(regexp_replace(p_ref, '\s', '', 'g')) limit 1),
    (select 'déjà envoyée dans une autre capture (' || nom_complet(d.membre_id) || ')'
       from demandes_paiement d where d.statut = 'en_attente' and d.reference is not null and d.id is distinct from p_sauf
        and upper(regexp_replace(d.reference, '\s', '', 'g')) = upper(regexp_replace(p_ref, '\s', '', 'g')) limit 1))
  where nullif(trim(coalesce(p_ref, '')), '') is not null
$$;

create or replace function public.expirer_demandes() returns void
language sql security definer set search_path = public as $$
  update demandes_paiement set statut = 'expiree' where type = 'qr' and statut = 'en_attente' and expire_le < now()
$$;

-- Le jeune génère un QR pour payer en espèces
create or replace function public.creer_demande_qr(p_campagne uuid, p_montant integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text; v_exp timestamptz := now() + interval '30 minutes';
begin
  if current_membre() is null then raise exception 'Non connecté'; end if;
  if p_montant is null or p_montant <= 0 then raise exception 'Montant invalide'; end if;
  if not exists (select 1 from campagne_lignes l join campagnes c on c.id = l.campagne_id
                 where l.campagne_id = p_campagne and l.membre_id = current_membre() and c.statut = 'en_cours')
    then raise exception 'Tu ne fais pas partie de cette campagne'; end if;
  update demandes_paiement set statut = 'annulee'
    where membre_id = current_membre() and type = 'qr' and statut = 'en_attente';
  v_code := translate(upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)), '01', 'XY');
  insert into demandes_paiement (membre_id, campagne_id, type, montant, code, expire_le, cree_par)
    values (current_membre(), p_campagne, 'qr', p_montant, v_code, v_exp, current_membre()) returning id into v_id;
  return jsonb_build_object('id', v_id, 'code', v_code, 'expire_le', v_exp);
end $$;

-- Capture envoyée par le jeune, ou importée par la trésorière (p_membre)
create or replace function public.envoyer_capture(p_campagne uuid, p_montant integer, p_image text, p_operateur text,
  p_reference text, p_date date, p_ocr_lu boolean, p_membre uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_m uuid := coalesce(p_membre, current_membre()); v_id uuid; v_u text;
begin
  if current_membre() is null then raise exception 'Non connecté'; end if;
  if p_membre is not null and p_membre <> current_membre() and not has_perm('paiements_valider') then raise exception 'Action réservée à la trésorerie'; end if;
  if p_montant is null or p_montant <= 0 then raise exception 'Montant invalide'; end if;
  if not exists (select 1 from campagne_lignes where campagne_id = p_campagne and membre_id = v_m) then raise exception 'Ce jeune ne fait pas partie de cette campagne'; end if;
  v_u := reference_utilisee(p_reference);
  if v_u is not null then raise exception 'Cette référence est %', v_u; end if;
  insert into demandes_paiement (membre_id, campagne_id, type, source, montant, image, operateur, reference, date_paiement, ocr_lu, cree_par)
    values (v_m, p_campagne, 'capture', case when v_m = current_membre() then 'membre' else 'tresoriere' end, p_montant, p_image,
            p_operateur, nullif(trim(coalesce(p_reference, '')), ''), coalesce(p_date, current_date), coalesce(p_ocr_lu, false), current_membre())
    returning id into v_id;
  if v_m = current_membre() then
    perform notifier_permission('paiements_valider', 'paiements', 'Capture de paiement à vérifier',
      format('%s · %s (%s) · %s', nom_complet(v_m), fmt_fcfa(p_montant), coalesce(p_operateur, ''), (select nom from campagnes where id = p_campagne)));
  end if;
  return v_id;
end $$;

-- La trésorière scanne un QR : on vérifie le code et on renvoie la demande
create or replace function public.verifier_qr(p_id uuid, p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d record;
begin
  if not has_perm('paiements_valider') then raise exception 'Action réservée à la trésorerie'; end if;
  perform expirer_demandes();
  select * into d from demandes_paiement where (p_id is not null and id = p_id) or (p_id is null and type = 'qr' and code = upper(p_code) and statut = 'en_attente')
    order by cree_le desc limit 1;
  if d.id is null or d.type <> 'qr' or d.code <> upper(p_code) then return jsonb_build_object('erreur', 'inconnu'); end if;
  if d.statut = 'validee' then return jsonb_build_object('erreur', 'utilise', 'par', nom_complet(d.valide_par)); end if;
  if d.statut <> 'en_attente' then return jsonb_build_object('erreur', 'expire'); end if;
  return jsonb_build_object('id', d.id, 'membre_id', d.membre_id, 'campagne_id', d.campagne_id, 'montant', d.montant);
end $$;

-- Validation (QR ou capture) : crée le paiement au nom de celui qui valide
create or replace function public.valider_demande(p_id uuid, p_montant integer default null, p_moyen text default null,
  p_reference text default null, p_date date default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d record; v_pay uuid; v_num bigint; v_moyen text; v_u text; v_pres boolean;
begin
  if not has_perm('paiements_valider') then raise exception 'Action réservée à la trésorerie'; end if;
  perform expirer_demandes();
  select * into d from demandes_paiement where id = p_id for update;
  if d.id is null then raise exception 'Demande introuvable'; end if;
  if d.statut <> 'en_attente' then raise exception 'Cette demande n''est plus en attente (%)', d.statut; end if;
  if not exists (select 1 from campagnes where id = d.campagne_id and statut = 'en_cours') then raise exception 'Campagne clôturée'; end if;
  v_moyen := case when d.type = 'qr' then 'Espèces' else coalesce(nullif(p_moyen, ''), d.operateur, 'Wave') end;
  if d.type = 'capture' then
    v_u := reference_utilisee(coalesce(p_reference, d.reference), d.id);
    if v_u is not null then raise exception 'Cette référence est %', v_u; end if;
  end if;
  insert into paiements (campagne_id, membre_id, montant, date_paiement, moyen, reference, source, saisi_par, demande_id)
    values (d.campagne_id, d.membre_id, coalesce(p_montant, d.montant), coalesce(p_date, d.date_paiement, current_date), v_moyen,
            case when d.type = 'qr' then null else nullif(trim(coalesce(p_reference, d.reference, '')), '') end,
            'tresoriere', current_membre(), d.id)
    returning id, numero into v_pay, v_num;
  update demandes_paiement set statut = 'validee', valide_par = current_membre(), valide_le = now(), paiement_id = v_pay,
    montant = coalesce(p_montant, d.montant), reference = coalesce(nullif(trim(coalesce(p_reference, '')), ''), d.reference),
    operateur = case when d.type = 'capture' then v_moyen else d.operateur end
    where id = d.id;
  select exists (select 1 from comptes where membre_id = current_membre() and role_id = 'president') into v_pres;
  if v_pres then
    insert into notifications (membre_id, type, titre, corps, auteur)
      select c.membre_id, 'paiements', 'Le Président a validé un paiement ' || case when d.type = 'qr' then 'en espèces' else '(capture)' end,
             format('%s · %s · %s', nom_complet(d.membre_id), fmt_fcfa(coalesce(p_montant, d.montant)), (select nom from campagnes where id = d.campagne_id)),
             current_membre()
      from comptes c join roles r on r.id = c.role_id
      where c.actif and c.membre_id <> current_membre() and (c.role_id = 'tresorier' or 'paiements_valider' = any (r.permissions));
  end if;
  return jsonb_build_object('paiement_id', v_pay, 'numero', v_num);
end $$;

create or replace function public.rejeter_demande(p_id uuid, p_motif text) returns void
language plpgsql security definer set search_path = public as $$
declare d record;
begin
  if not has_perm('paiements_valider') then raise exception 'Action réservée à la trésorerie'; end if;
  if nullif(trim(coalesce(p_motif, '')), '') is null then raise exception 'Indique le motif'; end if;
  select * into d from demandes_paiement where id = p_id and statut = 'en_attente';
  if d.id is null then raise exception 'Demande introuvable ou déjà traitée'; end if;
  update demandes_paiement set statut = 'rejetee', motif = trim(p_motif), valide_par = current_membre(), valide_le = now() where id = p_id;
  insert into notifications (membre_id, type, titre, corps, auteur)
    values (d.membre_id, 'paiements', 'Capture de paiement refusée', format('%s · %s', fmt_fcfa(d.montant), trim(p_motif)), current_membre());
  perform journaliser('Capture refusée', format('%s — %s · motif : %s', nom_complet(d.membre_id), fmt_fcfa(d.montant), trim(p_motif)));
end $$;

-- Le jeune annule son QR, ou marque un refus comme lu
create or replace function public.annuler_demande(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update demandes_paiement set statut = 'annulee' where id = p_id and membre_id = current_membre() and statut = 'en_attente'
$$;
create or replace function public.demande_vue(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update demandes_paiement set vu = true where id = p_id and membre_id = current_membre()
$$;

revoke all on function public.reference_utilisee(text, uuid), public.expirer_demandes(), public.creer_demande_qr(uuid, integer),
  public.envoyer_capture(uuid, integer, text, text, text, date, boolean, uuid), public.verifier_qr(uuid, text),
  public.valider_demande(uuid, integer, text, text, date), public.rejeter_demande(uuid, text),
  public.annuler_demande(uuid), public.demande_vue(uuid) from public, anon;
grant execute on function public.reference_utilisee(text, uuid), public.expirer_demandes(), public.creer_demande_qr(uuid, integer),
  public.envoyer_capture(uuid, integer, text, text, text, date, boolean, uuid), public.verifier_qr(uuid, text),
  public.valider_demande(uuid, integer, text, text, date), public.rejeter_demande(uuid, text),
  public.annuler_demande(uuid), public.demande_vue(uuid) to authenticated;
