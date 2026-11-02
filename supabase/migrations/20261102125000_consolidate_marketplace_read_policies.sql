-- Keep public catalog reads separate for guests and combine the two
-- authenticated read paths so RLS evaluates only one permissive policy.
drop policy if exists marketplace_annonce_public_read on public.marketplace_annonce;
drop policy if exists marketplace_annonce_seller_read on public.marketplace_annonce;
create policy marketplace_annonce_public_read_anon
  on public.marketplace_annonce for select to anon
  using (
    statut = 'publiee'
    and exists (
      select 1 from public.marketplace_vendeur v
      where v.id = marketplace_annonce.vendeur_id and v.statut = 'actif'
    )
  );
create policy marketplace_annonce_read_authenticated
  on public.marketplace_annonce for select to authenticated
  using (
    public.marketplace_vendeur_est_moi(vendeur_id)
    or (
      statut = 'publiee'
      and exists (
        select 1 from public.marketplace_vendeur v
        where v.id = marketplace_annonce.vendeur_id and v.statut = 'actif'
      )
    )
  );

drop policy if exists marketplace_vendeur_public_read on public.marketplace_vendeur;
drop policy if exists marketplace_vendeur_self_read on public.marketplace_vendeur;
create policy marketplace_vendeur_public_read_anon
  on public.marketplace_vendeur for select to anon
  using (statut = 'actif');
create policy marketplace_vendeur_read_authenticated
  on public.marketplace_vendeur for select to authenticated
  using (statut = 'actif' or public.marketplace_vendeur_est_moi(id));
