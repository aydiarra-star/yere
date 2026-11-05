drop policy if exists marketplace_avis_buyer_insert_delivered_order on public.marketplace_avis;
create policy marketplace_avis_buyer_insert_delivered_order
  on public.marketplace_avis for insert to authenticated
  with check (
    marketplace_avis.acheteur_user_id = (select auth.uid())
    and exists (
      select 1
      from public.marketplace_commande c
      join public.marketplace_vendeur v on v.id = c.vendeur_id
      where c.id = marketplace_avis.commande_id
        and c.vendeur_id = marketplace_avis.vendeur_id
        and c.acheteur_user_id = (select auth.uid())
        and c.statut = 'livree'
        and v.user_id <> (select auth.uid())
    )
  );
