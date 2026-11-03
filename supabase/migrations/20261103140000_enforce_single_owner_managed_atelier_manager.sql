-- One active manager per atelier. The owner alone controls appointments.
-- The partial unique index is the final database-level invariant.
create unique index if not exists atelier_membre_one_active_manager_idx
  on public.atelier_membre (atelier_id)
  where role = 'gestionnaire' and actif = true;

-- Serialize every manager transfer per atelier and demote the previous manager.
create or replace function private.update_atelier_member_role_impl(
  p_atelier_id uuid,
  p_user_id uuid,
  p_role text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target_role text;
begin
  if v_actor is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;
  if p_role not in ('gestionnaire', 'employe') then
    raise exception 'Rôle non autorisé' using errcode = '22023';
  end if;
  if not private.has_atelier_role(p_atelier_id, array['proprietaire']) then
    raise exception 'Seul le propriétaire peut modifier les rôles' using errcode = '42501';
  end if;
  if p_user_id = v_actor then
    raise exception 'Vous ne pouvez pas modifier votre propre rôle' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_atelier_id::text || ':manager', 0)
  );

  select m.role into v_target_role
  from public.atelier_membre m
  where m.atelier_id = p_atelier_id and m.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Membre introuvable dans cet atelier' using errcode = 'P0002';
  end if;
  if v_target_role = 'proprietaire' then
    raise exception 'Le rôle du propriétaire ne peut pas être modifié' using errcode = '42501';
  end if;

  if p_role = 'gestionnaire' then
    update public.atelier_membre
    set role = 'employe'
    where atelier_id = p_atelier_id
      and role = 'gestionnaire'
      and actif = true
      and user_id <> p_user_id;
  end if;

  update public.atelier_membre
  set role = p_role
  where atelier_id = p_atelier_id and user_id = p_user_id;
  return true;
end;
$$;

-- Reactivating a former manager transfers the role only after owner authorization.
create or replace function private.reactivate_atelier_member_impl(
  p_atelier_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target_role text;
  v_active boolean;
begin
  if v_actor is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;
  if not private.has_atelier_role(p_atelier_id, array['proprietaire']) then
    raise exception 'Seul le propriétaire peut rétablir un membre' using errcode = '42501';
  end if;
  if p_user_id = v_actor then
    raise exception 'Le propriétaire ne peut pas modifier son propre accès' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_atelier_id::text || ':manager', 0)
  );

  select m.role, m.actif into v_target_role, v_active
  from public.atelier_membre m
  where m.atelier_id = p_atelier_id and m.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Membre introuvable dans cet atelier' using errcode = 'P0002';
  end if;
  if v_target_role = 'proprietaire' then
    raise exception 'Le propriétaire ne peut pas être réactivé comme collaborateur' using errcode = '42501';
  end if;
  if v_active then
    raise exception 'Ce membre est déjà actif' using errcode = '22023';
  end if;

  if v_target_role = 'gestionnaire' then
    update public.atelier_membre
    set role = 'employe'
    where atelier_id = p_atelier_id
      and role = 'gestionnaire'
      and actif = true
      and user_id <> p_user_id;
  end if;

  update public.atelier_membre
  set actif = true
  where atelier_id = p_atelier_id and user_id = p_user_id;
  return true;
end;
$$;

-- Invitation acceptance uses the same lock and verifies the inviter is still
-- the active owner when a manager invitation is accepted.
create or replace function private.accept_atelier_invitation_impl(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_invitation public.invitation_atelier%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_user_id and u.email_confirmed_at is not null;

  if v_email is null then
    raise exception 'Confirmez votre adresse e-mail avant d’accepter une invitation' using errcode = '42501';
  end if;

  select * into v_invitation
  from public.invitation_atelier i
  where i.id = p_invitation_id
    and lower(i.email) = v_email
    and i.accepted_at is null
    and i.cancelled_at is null
    and i.declined_at is null
    and i.expires_at > pg_catalog.now()
  for update;

  if not found then
    raise exception 'Invitation introuvable, expirée ou destinée à une autre adresse' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_invitation.atelier_id::text || ':manager', 0)
  );

  if exists (
    select 1 from public.atelier_membre m
    where m.atelier_id = v_invitation.atelier_id
      and m.user_id = v_user_id
      and m.actif = true
  ) then
    raise exception 'Vous êtes déjà membre de cet atelier' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.atelier_membre m
    where m.atelier_id = v_invitation.atelier_id
      and m.user_id = v_user_id
      and m.role = 'proprietaire'
  ) then
    raise exception 'Un propriétaire ne peut pas être rétrogradé par invitation' using errcode = '42501';
  end if;

  if v_invitation.role = 'gestionnaire' then
    if not exists (
      select 1 from public.atelier_membre owner_member
      where owner_member.atelier_id = v_invitation.atelier_id
        and owner_member.user_id = v_invitation.invited_by
        and owner_member.role = 'proprietaire'
        and owner_member.actif = true
    ) then
      raise exception 'La nomination du gestionnaire doit être autorisée par le propriétaire actuel' using errcode = '42501';
    end if;

    update public.atelier_membre
    set role = 'employe'
    where atelier_id = v_invitation.atelier_id
      and role = 'gestionnaire'
      and actif = true
      and user_id <> v_user_id;
  end if;

  insert into public.atelier_membre(atelier_id, user_id, role, actif)
  values (v_invitation.atelier_id, v_user_id, v_invitation.role, true)
  on conflict (atelier_id, user_id) do update
    set role = excluded.role, actif = true
    where public.atelier_membre.actif = false
      and public.atelier_membre.role <> 'proprietaire';

  update public.invitation_atelier
  set accepted_at = pg_catalog.now()
  where id = v_invitation.id;

  return v_invitation.atelier_id;
end;
$$;
