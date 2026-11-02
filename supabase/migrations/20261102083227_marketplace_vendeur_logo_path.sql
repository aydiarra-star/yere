-- Persist the private Storage object path for each Market seller storefront image.
alter table public.marketplace_vendeur
  add column if not exists logo_path text;

comment on column public.marketplace_vendeur.logo_path
  is 'Private Storage object path for the seller storefront logo or photo.';
