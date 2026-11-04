-- YÉRÉ Market: return the current user's own seller profile without exposing
-- private seller contacts through the public storefront query.
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
  where v.user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function public.get_my_marketplace_seller_profile() from public, anon;
grant execute on function public.get_my_marketplace_seller_profile() to authenticated;
