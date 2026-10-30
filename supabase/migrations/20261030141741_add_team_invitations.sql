-- Équipe YÉRÉ : invitations nominatives et acceptation par le compte vérifié.
create table public.invitation_atelier (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null references public.atelier(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and length(email) between 5 and 254),
  role text not null check (role in ('gestionnaire','employe')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (accepted_at is null or cancelled_at is null)
);
create index invitation_atelier_lookup_idx on public.invitation_atelier(atelier_id, lower(email), expires_at desc);
create index invitation_atelier_inviter_idx on public.invitation_atelier(invited_by);
alter table public.invitation_atelier enable row level security;
create policy invitation_select_manager_or_invitee on public.invitation_atelier for select to authenticated
using (private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']) or
(lower(email)=lower(coalesce((select auth.jwt())->>'email','')) and accepted_at is null and cancelled_at is null and expires_at>now()));
create policy invitation_insert_managers on public.invitation_atelier for insert to authenticated
with check (private.has_atelier_role(atelier_id,array['proprietaire','gestionnaire']) and invited_by=(select auth.uid()) and role in ('gestionnaire','employe') and accepted_at is null and cancelled_at is null);
grant select,insert on public.invitation_atelier to authenticated;
revoke all on public.invitation_atelier from anon;
revoke update,delete on public.invitation_atelier from authenticated;
create or replace function public.create_atelier_invitation(p_atelier_id uuid,p_email text,p_role text)
returns table(id uuid,email text,role text,expires_at timestamptz) language plpgsql security invoker set search_path=''
as $$
declare v_email text:=lower(trim(coalesce(p_email,'')));
begin
 if auth.uid() is null then raise exception 'Authentification requise' using errcode='28000'; end if;
 if not private.has_atelier_role(p_atelier_id,array['proprietaire','gestionnaire']) then raise exception 'Droits insuffisants pour inviter un collaborateur' using errcode='42501'; end if;
 if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Adresse e-mail invalide' using errcode='22023'; end if;
 if p_role not in ('gestionnaire','employe') then raise exception 'Rôle non autorisé' using errcode='22023'; end if;
 if exists(select 1 from public.atelier_membre m join auth.users u on u.id=m.user_id where m.atelier_id=p_atelier_id and m.actif=true and lower(u.email)=v_email) then raise exception 'Cette personne est déjà membre de l’atelier' using errcode='23505'; end if;
 if exists(select 1 from public.invitation_atelier i where i.atelier_id=p_atelier_id and i.email=v_email and i.accepted_at is null and i.cancelled_at is null and i.expires_at>now()) then raise exception 'Une invitation active existe déjà pour cette adresse' using errcode='23505'; end if;
 return query insert into public.invitation_atelier(atelier_id,email,role,invited_by) values(p_atelier_id,v_email,p_role,auth.uid())
 returning invitation_atelier.id,invitation_atelier.email,invitation_atelier.role,invitation_atelier.expires_at;
end; $$;
revoke all on function public.create_atelier_invitation(uuid,text,text) from public,anon;
grant execute on function public.create_atelier_invitation(uuid,text,text) to authenticated;
create or replace function private.accept_atelier_invitation_impl(p_invitation_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_user_id uuid:=auth.uid(); v_email text; v_invitation public.invitation_atelier%rowtype;
begin
 if v_user_id is null then raise exception 'Authentification requise' using errcode='28000'; end if;
 select lower(u.email) into v_email from auth.users u where u.id=v_user_id and u.email_confirmed_at is not null;
 if v_email is null then raise exception 'Confirmez votre adresse e-mail avant d’accepter une invitation' using errcode='42501'; end if;
 select * into v_invitation from public.invitation_atelier i where i.id=p_invitation_id and lower(i.email)=v_email and i.accepted_at is null and i.cancelled_at is null and i.expires_at>now() for update;
 if not found then raise exception 'Invitation introuvable, expirée ou destinée à une autre adresse' using errcode='42501'; end if;
 if exists(select 1 from public.atelier_membre m where m.atelier_id=v_invitation.atelier_id and m.user_id=v_user_id and m.actif=true) then raise exception 'Vous êtes déjà membre de cet atelier' using errcode='23505'; end if;
 if exists(select 1 from public.atelier_membre m where m.atelier_id=v_invitation.atelier_id and m.user_id=v_user_id and m.role='proprietaire') then raise exception 'Un propriétaire ne peut pas être rétrogradé par invitation' using errcode='42501'; end if;
 insert into public.atelier_membre(atelier_id,user_id,role,actif) values(v_invitation.atelier_id,v_user_id,v_invitation.role,true)
 on conflict(atelier_id,user_id) do update set role=excluded.role,actif=true where public.atelier_membre.actif=false and public.atelier_membre.role<>'proprietaire';
 update public.invitation_atelier set accepted_at=now() where id=v_invitation.id;
 return v_invitation.atelier_id;
end; $$;
revoke all on function private.accept_atelier_invitation_impl(uuid) from public,anon;
grant execute on function private.accept_atelier_invitation_impl(uuid) to authenticated;
create or replace function public.accept_atelier_invitation(p_invitation_id uuid) returns uuid
language sql security invoker set search_path='' as $$ select private.accept_atelier_invitation_impl(p_invitation_id); $$;
revoke all on function public.accept_atelier_invitation(uuid) from public,anon;
grant execute on function public.accept_atelier_invitation(uuid) to authenticated;