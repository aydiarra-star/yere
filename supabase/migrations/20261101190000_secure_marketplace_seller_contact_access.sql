-- YÉRÉ — verrouillage des coordonnées vendeurs de la marketplace.
-- Correctif additif : conserve les profils et annonces, sans toucher aux données existantes.

-- Retire la lecture de ligne complète, qui exposait nom_contact et telephone.
revoke select on table public.marketplace_vendeur from public, anon, authenticated;

-- Les visiteurs et utilisateurs connectés ne lisent que les champs de vitrine.
grant select (
  id, type_vendeur, nom_entreprise, ville, categorie,
  description, statut, created_at
) on public.marketplace_vendeur to anon, authenticated;

-- Helper propriétaire : évite d'accorder la lecture de user_id aux autres utilisateurs.
create or replace function public.marketplace_vendeur_est_moi(p_vendeur_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.marketplace_vendeur v
    where v.id = p_vendeur_id
      and v.user_id = (select auth.uid())
  );
$$;

revoke all on function public.marketplace_vendeur_est_moi(uuid) from public, anon;
grant execute on function public.marketplace_vendeur_est_moi(uuid) to authenticated;

-- Les politiques existantes doivent utiliser le helper plutôt que lire user_id directement.
drop policy if exists marketplace_vendeur_self_read on public.marketplace_vendeur;
create policy marketplace_vendeur_self_read on public.marketplace_vendeur
  for select to authenticated
  using (public.marketplace_vendeur_est_moi(id));

drop policy if exists marketplace_vendeur_self_update on public.marketplace_vendeur;
create policy marketplace_vendeur_self_update on public.marketplace_vendeur
  for update to authenticated
  using (public.marketplace_vendeur_est_moi(id))
  with check (public.marketplace_vendeur_est_moi(id));

drop policy if exists marketplace_annonce_seller_read on public.marketplace_annonce;
create policy marketplace_annonce_seller_read on public.marketplace_annonce
  for select to authenticated
  using (public.marketplace_vendeur_est_moi(vendeur_id));

drop policy if exists marketplace_annonce_seller_insert on public.marketplace_annonce;
create policy marketplace_annonce_seller_insert on public.marketplace_annonce
  for insert to authenticated
  with check (
    public.marketplace_vendeur_est_moi(vendeur_id)
    and exists (
      select 1 from public.marketplace_vendeur v
      where v.id = vendeur_id and v.statut = 'actif'
    )
  );

drop policy if exists marketplace_annonce_seller_update on public.marketplace_annonce;
create policy marketplace_annonce_seller_update on public.marketplace_annonce
  for update to authenticated
  using (public.marketplace_vendeur_est_moi(vendeur_id))
  with check (public.marketplace_vendeur_est_moi(vendeur_id));

drop policy if exists marketplace_annonce_seller_delete on public.marketplace_annonce;
create policy marketplace_annonce_seller_delete on public.marketplace_annonce
  for delete to authenticated
  using (public.marketplace_vendeur_est_moi(vendeur_id));

-- Le vendeur récupère ses coordonnées par une fonction limitée à son propre compte.
create or replace function public.get_my_marketplace_seller_contact()
returns table(nom_contact text, telephone text)
language sql
stable
security definer
set search_path = ''
as $$
  select v.nom_contact, v.telephone
  from public.marketplace_vendeur v
  where v.user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function public.get_my_marketplace_seller_contact() from public, anon;
grant execute on function public.get_my_marketplace_seller_contact() to authenticated;

-- La lecture des commandes ne doit pas contourner les droits limités du profil vendeur.
drop policy if exists marketplace_commande_parties_read on public.marketplace_commande;
create policy marketplace_commande_parties_read on public.marketplace_commande
  for select to authenticated
  using (
    acheteur_user_id = (select auth.uid())
    or public.marketplace_vendeur_est_moi(vendeur_id)
  );
