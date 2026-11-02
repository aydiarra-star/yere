-- Allow the public catalogue to read only storefront fields (RLS remains enforced).
grant select (
  id, type_vendeur, nom_entreprise, ville, categorie,
  description, logo_path, statut
) on table public.marketplace_vendeur to anon, authenticated;

-- Sellers may update only editable storefront/contact fields.
grant update (
  nom_entreprise, nom_contact, telephone, ville, categorie,
  description, logo_path
) on table public.marketplace_vendeur to authenticated;
