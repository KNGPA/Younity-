-- 0015 — Un numéro de téléphone (ou un e-mail) ne peut appartenir qu'à un seul jeune.
--        Message clair dans le formulaire comme à l'import Excel.
create or replace function public.trg_membre_unique() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_qui text;
begin
  if nullif(trim(coalesce(new.tel, '')), '') is not null then
    select nom_complet(id) into v_qui from membres where id <> new.id and tel_norm(tel) = tel_norm(new.tel) limit 1;
    if v_qui is not null then raise exception 'Le numéro % est déjà enregistré pour %', new.tel, v_qui using errcode = 'unique_violation'; end if;
  end if;
  if nullif(trim(coalesce(new.email, '')), '') is not null then
    select nom_complet(id) into v_qui from membres where id <> new.id and lower(email) = lower(new.email) limit 1;
    if v_qui is not null then raise exception 'L''e-mail % est déjà enregistré pour %', new.email, v_qui using errcode = 'unique_violation'; end if;
  end if;
  return new;
end $$;
drop trigger if exists membres_unique on public.membres;
create trigger membres_unique before insert or update of tel, email on public.membres
  for each row execute function public.trg_membre_unique();
create unique index if not exists membres_tel_unique on public.membres (tel_norm(tel)) where tel is not null and trim(tel) <> '';
create unique index if not exists membres_email_unique on public.membres (lower(email)) where email is not null and trim(email) <> '';
