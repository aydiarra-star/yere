-- Owner-only team administration. Membership history is preserved by deactivation.
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

  select m.role into v_target_role
  from public.atelier_membre m
  where m.atelier_id = p_atelier_id
    and m.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Membre introuvable dans cet atelier' using errcode = 'P0002';
  end if;
  if v_target_role = 'proprietaire' then
    raise exception 'Le rôle du propriétaire ne peut pas être modifié' using errcode = '42501';
  end if;

  update public.atelier_membre
  set role = p_role
  where atelier_id = p_atelier_id and user_id = p_user_id;
  return true;
end;
$$;

revoke all on function private.update_atelier_member_role_impl(uuid, uuid, text) from public, anon;
grant execute on function private.update_atelier_member_role_impl(uuid, uuid, text) to authenticated;

create or replace function public.update_atelier_member_role(
  p_atelier_id uuid,
  p_user_id uuid,
  p_role text
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.update_atelier_member_role_impl(p_atelier_id, p_user_id, p_role);
$$;
revoke all on function public.update_atelier_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.update_atelier_member_role(uuid, uuid, text) to authenticated;

create or replace function private.deactivate_atelier_member_impl(
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
    raise exception 'Seul le propriétaire peut retirer un membre' using errcode = '42501';
  end if;
  if p_user_id = v_actor then
    raise exception 'Le propriétaire ne peut pas se retirer lui-même' using errcode = '42501';
  end if;

  select m.role, m.actif into v_target_role, v_active
  from public.atelier_membre m
  where m.atelier_id = p_atelier_id
    and m.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Membre introuvable dans cet atelier' using errcode = 'P0002';
  end if;
  if v_target_role = 'proprietaire' then
    raise exception 'Le propriétaire ne peut pas être retiré de son atelier' using errcode = '42501';
  end if;
  if not v_active then
    raise exception 'Ce membre est déjà désactivé' using errcode = '22023';
  end if;

  update public.atelier_membre
  set actif = false
  where atelier_id = p_atelier_id and user_id = p_user_id;
  return true;
end;
$$;

revoke all on function private.deactivate_atelier_member_impl(uuid, uuid) from public, anon;
grant execute on function private.deactivate_atelier_member_impl(uuid, uuid) to authenticated;

create or replace function public.deactivate_atelier_member(
  p_atelier_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.deactivate_atelier_member_impl(p_atelier_id, p_user_id);
$$;
revoke all on function public.deactivate_atelier_member(uuid, uuid) from public, anon;
grant execute on function public.deactivate_atelier_member(uuid, uuid) to authenticated;
