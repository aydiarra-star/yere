-- YÉRÉ Market: retrieve the current user's own seller profile without
-- exposing private contact columns through public storefront queries.
-- The privileged lookup stays in the non-exposed private schema.
create schema if not exists private;

create or replace function private.get_my_marketplace_seller_profile()
returns table (
  id uuid,
  type_vendeur text,
  atelier_id uuid,
  nom_entreprise text,
  nom_contact text,
  telephone text,
  ville text,
  categorie text,
  description text,
  logo_path text,
  statut text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    v.id,
    v.type_vendeur,
    v.atelier_id,
    v.nom_entreprise,
    v.nom_contact,
    v.telephone,
    v.ville,
    v.categorie,
    v.description,
    v.logo_path,
    v.statut
  from public.marketplace_vendeur v
  where (select auth.uid()) is not null
    and v.user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function private.get_my_marketplace_seller_profile() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.get_my_marketplace_seller_profile() to authenticated;

-- PostgREST calls this public, invoker-rights wrapper. It cannot read the
-- seller table's private columns itself; it delegates to the owner-scoped
-- helper, which returns a row only for auth.uid().
create or replace function public.get_my_marketplace_seller_profile()
returns table (
  id uuid,
  type_vendeur text,
  atelier_id uuid,
  nom_entreprise text,
  nom_contact text,
  telephone text,
  ville text,
  categorie text,
  description text,
  logo_path text,
  statut text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_my_marketplace_seller_profile();
$$;

revoke all on function public.get_my_marketplace_seller_profile() from public, anon;
grant execute on function public.get_my_marketplace_seller_profile() to authenticated;
