-- Add an explicit recipient decision and expose a first-class invitation inbox.
alter table public.invitation_atelier
  add column if not exists declined_at timestamptz;

drop policy if exists invitation_select_manager_or_invitee on public.invitation_atelier;
create policy invitation_select_manager_or_invitee
on public.invitation_atelier for select to authenticated
using (
  private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire'])
  or (
    lower(email) = lower(coalesce((select auth.jwt())->>'email', ''))
    and accepted_at is null
    and cancelled_at is null
    and declined_at is null
    and expires_at > now()
  )
);

create or replace function public.create_atelier_invitation(p_atelier_id uuid, p_email text, p_role text)
returns table(id uuid, atelier_nom text, email text, role text, expires_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_atelier_nom text;
  v_at_pos integer;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;
  if not private.has_atelier_role(p_atelier_id, array['proprietaire','gestionnaire']) then
    raise exception 'Droits insuffisants pour inviter un collaborateur' using errcode = '42501';
  end if;
  v_at_pos := position('@' in v_email);
  if v_at_pos <= 1 or v_at_pos >= length(v_email) - 2
     or position('.' in substring(v_email from v_at_pos + 1)) = 0
     or v_email ~ '[[:space:]]' then
    raise exception 'Adresse e-mail invalide' using errcode = '22023';
  end if;
  if p_role not in ('gestionnaire','employe') then
    raise exception 'Rôle non autorisé' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_atelier_id::text || ':' || v_email, 0));
  select a.nom into v_atelier_nom from public.atelier a where a.id = p_atelier_id;
  if v_atelier_nom is null then
    raise exception 'Atelier introuvable' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.invitation_atelier i
    where i.atelier_id = p_atelier_id and i.email = v_email
      and i.accepted_at is null and i.cancelled_at is null
      and i.declined_at is null and i.expires_at > now()
  ) then
    raise exception 'Une invitation active existe déjà pour cette adresse' using errcode = '23505';
  end if;
  return query
  insert into public.invitation_atelier(atelier_id, atelier_nom, email, role, invited_by)
  values (p_atelier_id, v_atelier_nom, v_email, p_role, auth.uid())
  returning invitation_atelier.id, invitation_atelier.atelier_nom,
    invitation_atelier.email, invitation_atelier.role, invitation_atelier.expires_at;
end;
$$;

revoke all on function public.create_atelier_invitation(uuid,text,text) from public, anon;
grant execute on function public.create_atelier_invitation(uuid,text,text) to authenticated;

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
  where i.id = p_invitation_id and lower(i.email) = v_email
    and i.accepted_at is null and i.cancelled_at is null
    and i.declined_at is null and i.expires_at > now()
  for update;
  if not found then
    raise exception 'Invitation introuvable, expirée ou destinée à une autre adresse' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.atelier_membre m
    where m.atelier_id = v_invitation.atelier_id and m.user_id = v_user_id and m.actif = true
  ) then
    raise exception 'Vous êtes déjà membre de cet atelier' using errcode = '23505';
  end if;
  insert into public.atelier_membre(atelier_id,user_id,role,actif)
  values(v_invitation.atelier_id,v_user_id,v_invitation.role,true)
  on conflict (atelier_id,user_id) do update
    set role=excluded.role, actif=true
    where public.atelier_membre.actif=false
      and public.atelier_membre.role <> 'proprietaire';
  update public.invitation_atelier set accepted_at=now() where id=v_invitation.id;
  return v_invitation.atelier_id;
end;
$$;

create or replace function private.decline_atelier_invitation_impl(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_invitation_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;
  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_user_id and u.email_confirmed_at is not null;
  if v_email is null then
    raise exception 'Confirmez votre adresse e-mail avant de répondre à une invitation' using errcode = '42501';
  end if;
  update public.invitation_atelier i
  set declined_at = now()
  where i.id = p_invitation_id
    and lower(i.email) = v_email
    and i.accepted_at is null
    and i.cancelled_at is null
    and i.declined_at is null
    and i.expires_at > now()
  returning i.id into v_invitation_id;
  if v_invitation_id is null then
    raise exception 'Invitation introuvable, expirée ou destinée à une autre adresse' using errcode = '42501';
  end if;
  return true;
end;
$$;

revoke all on function private.decline_atelier_invitation_impl(uuid) from public, anon;
grant execute on function private.decline_atelier_invitation_impl(uuid) to authenticated;

create or replace function public.decline_atelier_invitation(p_invitation_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.decline_atelier_invitation_impl(p_invitation_id);
$$;
revoke all on function public.decline_atelier_invitation(uuid) from public, anon;
grant execute on function public.decline_atelier_invitation(uuid) to authenticated;
