-- Restore the marketplace seller privacy boundary after the temporary API grant.
-- Public and authenticated clients may read only storefront fields.
revoke select on table public.marketplace_vendeur from public, anon, authenticated;
grant select (
  id, type_vendeur, nom_entreprise, ville, categorie,
  description, logo_path, statut
) on table public.marketplace_vendeur to anon, authenticated;

-- Sellers may edit only storefront/contact fields; ownership, atelier link,
-- seller type and moderation status remain server-controlled.
revoke update on table public.marketplace_vendeur from public, anon, authenticated;
grant update (
  nom_entreprise, nom_contact, telephone, ville, categorie,
  description, logo_path
) on table public.marketplace_vendeur to authenticated;
