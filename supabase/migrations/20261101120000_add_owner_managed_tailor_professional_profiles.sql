-- Professional profiles for atelier tailors.
-- Profiles are visible to active members of the same atelier.
-- Only the atelier owner can edit profiles, and only for active employees.
-- No compensation, payment, cash or profit fields are introduced.

alter table public.atelier_membre
  add column if not exists nom_professionnel text,
  add column if not exists specialites text[] not null default '{}'::text[],
  add column if not exists niveau_experience text,
  add column if not exists presentation text;

alter table public.atelier_membre
  drop constraint if exists atelier_membre_niveau_experience_check;

alter table public.atelier_membre
  add constraint atelier_membre_niveau_experience_check
  check (niveau_experience is null or niveau_experience in ('debutant', 'intermediaire', 'experimente', 'maitre'));

create or replace function private.update_atelier_member_profile_impl(
  p_atelier_id uuid,
  p_user_id uuid,
  p_nom_professionnel text,
  p_specialites text[],
  p_niveau_experience text,
  p_presentation text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_role text;
  v_target_active boolean;
  v_specialites text[];
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  if not private.has_atelier_role(p_atelier_id, array['proprietaire']) then
    raise exception 'Seul le propriétaire peut modifier les profils professionnels' using errcode = '42501';
  end if;

  if p_niveau_experience is not null
     and p_niveau_experience not in ('debutant', 'intermediaire', 'experimente', 'maitre') then
    raise exception 'Niveau d’expérience invalide' using errcode = '22023';
  end if;

  if length(trim(coalesce(p_nom_professionnel, ''))) > 100
     or length(trim(coalesce(p_presentation, ''))) > 600 then
    raise exception 'Le nom ou la présentation dépasse la longueur autorisée' using errcode = '22023';
  end if;

  if coalesce(cardinality(p_specialites), 0) > 8 then
    raise exception 'Huit spécialités au maximum sont autorisées' using errcode = '22023';
  end if;

  select m.role, m.actif
    into v_target_role, v_target_active
  from public.atelier_membre m
  where m.atelier_id = p_atelier_id
    and m.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Membre introuvable dans cet atelier' using errcode = 'P0002';
  end if;
  if v_target_role <> 'employe' or not v_target_active then
    raise exception 'Le profil ne peut être renseigné que pour un tailleur actif' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct left(trim(s), 60)), '{}'::text[])
    into v_specialites
  from unnest(coalesce(p_specialites, '{}'::text[])) as s
  where trim(s) <> '';

  update public.atelier_membre
  set nom_professionnel = nullif(trim(coalesce(p_nom_professionnel, '')), ''),
      specialites = v_specialites,
      niveau_experience = p_niveau_experience,
      presentation = nullif(trim(coalesce(p_presentation, '')), '')
  where atelier_id = p_atelier_id
    and user_id = p_user_id;

  return true;
end;
$$;

revoke all on function private.update_atelier_member_profile_impl(uuid, uuid, text, text[], text, text) from public, anon;
grant execute on function private.update_atelier_member_profile_impl(uuid, uuid, text, text[], text, text) to authenticated;

create or replace function public.update_atelier_member_profile(
  p_atelier_id uuid,
  p_user_id uuid,
  p_nom_professionnel text,
  p_specialites text[],
  p_niveau_experience text,
  p_presentation text
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.update_atelier_member_profile_impl(
    p_atelier_id, p_user_id, p_nom_professionnel, p_specialites, p_niveau_experience, p_presentation
  );
$$;

revoke all on function public.update_atelier_member_profile(uuid, uuid, text, text[], text, text) from public, anon;
grant execute on function public.update_atelier_member_profile(uuid, uuid, text, text[], text, text) to authenticated;
