alter table public.invitation_atelier add column atelier_nom text not null default '';
update public.invitation_atelier i set atelier_nom=a.nom from public.atelier a where a.id=i.atelier_id;
drop function public.create_atelier_invitation(uuid,text,text);
create function public.create_atelier_invitation(p_atelier_id uuid,p_email text,p_role text)
returns table(id uuid,atelier_nom text,email text,role text,expires_at timestamptz)
language plpgsql security invoker set search_path=''
as $$
declare v_email text:=lower(trim(coalesce(p_email,''))); v_atelier_nom text;
begin
 if auth.uid() is null then raise exception 'Authentification requise' using errcode='28000'; end if;
 if not private.has_atelier_role(p_atelier_id,array['proprietaire','gestionnaire']) then raise exception 'Droits insuffisants pour inviter un collaborateur' using errcode='42501'; end if;
 if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Adresse e-mail invalide' using errcode='22023'; end if;
 if p_role not in ('gestionnaire','employe') then raise exception 'Rôle non autorisé' using errcode='22023'; end if;
 select a.nom into v_atelier_nom from public.atelier a where a.id=p_atelier_id;
 if v_atelier_nom is null then raise exception 'Atelier introuvable' using errcode='P0002'; end if;
 if exists(select 1 from public.atelier_membre m join auth.users u on u.id=m.user_id where m.atelier_id=p_atelier_id and m.actif=true and lower(u.email)=v_email) then raise exception 'Cette personne est déjà membre de l’atelier' using errcode='23505'; end if;
 if exists(select 1 from public.invitation_atelier i where i.atelier_id=p_atelier_id and i.email=v_email and i.accepted_at is null and i.cancelled_at is null and i.expires_at>now()) then raise exception 'Une invitation active existe déjà pour cette adresse' using errcode='23505'; end if;
 return query insert into public.invitation_atelier(atelier_id,atelier_nom,email,role,invited_by)
 values(p_atelier_id,v_atelier_nom,v_email,p_role,auth.uid())
 returning invitation_atelier.id,invitation_atelier.atelier_nom,invitation_atelier.email,invitation_atelier.role,invitation_atelier.expires_at;
end; $$;
revoke all on function public.create_atelier_invitation(uuid,text,text) from public,anon;
grant execute on function public.create_atelier_invitation(uuid,text,text) to authenticated;