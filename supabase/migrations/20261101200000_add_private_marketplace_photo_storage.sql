-- YÉRÉ Market — stockage privé des photos d'annonces.
-- Les fichiers ne sont jamais publics par URL directe. Seul le vendeur propriétaire
-- peut téléverser, consulter ou supprimer les objets de sa boutique.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'yere-market-photos',
  'yere-market-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists yere_market_photos_insert_own on storage.objects;
create policy yere_market_photos_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'yere-market-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.marketplace_vendeur_est_moi(((storage.foldername(name))[2])::uuid)
);

drop policy if exists yere_market_photos_read_own on storage.objects;
create policy yere_market_photos_read_own
on storage.objects for select to authenticated
using (
  bucket_id = 'yere-market-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.marketplace_vendeur_est_moi(((storage.foldername(name))[2])::uuid)
);

drop policy if exists yere_market_photos_delete_own on storage.objects;
create policy yere_market_photos_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'yere-market-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.marketplace_vendeur_est_moi(((storage.foldername(name))[2])::uuid)
);
