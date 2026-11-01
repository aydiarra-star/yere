-- Enforce owner-only financial access per atelier.
-- Membership remains account-scoped and role checks remain tenant-scoped.

-- Orders remain visible to atelier members, but only owners can create them.
drop policy if exists commande_insert_member on public.commande;
drop policy if exists commande_insert_owner on public.commande;
create policy commande_insert_owner
  on public.commande for insert to authenticated
  with check (
    private.has_atelier_role(atelier_id, array['proprietaire']::text[])
    and (created_by is null or created_by = (select auth.uid()))
  );

-- Restrict order reads to operational columns. Prices are returned only by the
-- owner-checked RPC below; table-level SELECT would override column restrictions.
revoke select on table public.commande from anon, authenticated;
grant select (
  id, atelier_id, client_id, reference, vetement, date_commande, date_livraison,
  statut, created_by, created_at, updated_at, type_travail, etape_retouche,
  mensuration_snapshot, mensuration_snapshot_date
) on public.commande to authenticated;

-- Members may update production status only, never price or other order data.
revoke update on table public.commande from anon, authenticated;
grant update (statut, date_livraison, etape_retouche) on public.commande to authenticated;

-- Customer payments: owner only for reading and recording.
drop policy if exists paiement_select_member on public.paiement;
drop policy if exists paiement_select_owner on public.paiement;
create policy paiement_select_owner on public.paiement
  for select to authenticated
  using (private.has_atelier_role(atelier_id, array['proprietaire']::text[]));
drop policy if exists paiement_insert_managers on public.paiement;
drop policy if exists paiement_insert_owner on public.paiement;
create policy paiement_insert_owner on public.paiement
  for insert to authenticated
  with check (
    private.has_atelier_role(atelier_id, array['proprietaire']::text[])
    and (created_by is null or created_by = (select auth.uid()))
  );

-- Cash expenses: owner only for all financial operations.
drop policy if exists depense_select_member on public.depense;
drop policy if exists depense_select_owner on public.depense;
create policy depense_select_owner on public.depense
  for select to authenticated
  using (private.has_atelier_role(atelier_id, array['proprietaire']::text[]));
drop policy if exists depense_insert_managers on public.depense;
drop policy if exists depense_insert_owner on public.depense;
create policy depense_insert_owner on public.depense
  for insert to authenticated
  with check (
    private.has_atelier_role(atelier_id, array['proprietaire']::text[])
    and (created_by is null or created_by = (select auth.uid()))
  );
drop policy if exists depense_update_managers on public.depense;
drop policy if exists depense_update_owner on public.depense;
create policy depense_update_owner on public.depense
  for update to authenticated
  using (private.has_atelier_role(atelier_id, array['proprietaire']::text[]))
  with check (private.has_atelier_role(atelier_id, array['proprietaire']::text[]));

-- Supplier purchase headers, item costs and supplier payments are financial.
drop policy if exists achat_fournisseur_select_member on public.achat_fournisseur;
drop policy if exists achat_fournisseur_select_owner on public.achat_fournisseur;
create policy achat_fournisseur_select_owner on public.achat_fournisseur
  for select to authenticated
  using (private.has_atelier_role(atelier_id, array['proprietaire']::text[]));
drop policy if exists achat_fournisseur_insert_managers on public.achat_fournisseur;
drop policy if exists achat_fournisseur_insert_owner on public.achat_fournisseur;
create policy achat_fournisseur_insert_owner on public.achat_fournisseur
  for insert to authenticated
  with check (
    private.has_atelier_role(atelier_id, array['proprietaire']::text[])
    and (created_by is null or created_by = (select auth.uid()))
  );
drop policy if exists achat_fournisseur_update_managers on public.achat_fournisseur;
drop policy if exists achat_fournisseur_update_owner on public.achat_fournisseur;
create policy achat_fournisseur_update_owner on public.achat_fournisseur
  for update to authenticated
  using (private.has_atelier_role(atelier_id, array['proprietaire']::text[]))
  with check (private.has_atelier_role(atelier_id, array['proprietaire']::text[]));

drop policy if exists ligne_achat_select_member on public.ligne_achat_fournisseur;
drop policy if exists ligne_achat_select_owner on public.ligne_achat_fournisseur;
create policy ligne_achat_select_owner on public.ligne_achat_fournisseur
  for select to authenticated
  using (private.has_atelier_role(atelier_id, array['proprietaire']::text[]));
drop policy if exists ligne_achat_insert_managers on public.ligne_achat_fournisseur;
drop policy if exists ligne_achat_insert_owner on public.ligne_achat_fournisseur;
create policy ligne_achat_insert_owner on public.ligne_achat_fournisseur
  for insert to authenticated
  with check (private.has_atelier_role(atelier_id, array['proprietaire']::text[]));

drop policy if exists paiement_fournisseur_select_member on public.paiement_fournisseur;
drop policy if exists paiement_fournisseur_select_owner on public.paiement_fournisseur;
create policy paiement_fournisseur_select_owner on public.paiement_fournisseur
  for select to authenticated
  using (private.has_atelier_role(atelier_id, array['proprietaire']::text[]));
drop policy if exists paiement_fournisseur_insert_managers on public.paiement_fournisseur;
drop policy if exists paiement_fournisseur_insert_owner on public.paiement_fournisseur;
create policy paiement_fournisseur_insert_owner on public.paiement_fournisseur
  for insert to authenticated
  with check (
    private.has_atelier_role(atelier_id, array['proprietaire']::text[])
    and (created_by is null or created_by = (select auth.uid()))
  );

-- The only route to order prices is this narrowly scoped RPC. It validates the
-- active owner membership on every call and never accepts a user ID from the client.
create or replace function public.get_atelier_order_financials(p_atelier_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null or not exists (
    select 1
    from public.atelier_membre m
    where m.atelier_id = p_atelier_id
      and m.user_id = v_user_id
      and m.actif = true
      and m.role = 'proprietaire'
  ) then
    raise exception 'Accès financier réservé au propriétaire de cet atelier'
      using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'commande_id', c.id,
        'prix_fcfa', c.prix_fcfa,
        'paiements', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'commande_id', p.commande_id,
              'montant_fcfa', p.montant_fcfa,
              'date_paiement', p.date_paiement,
              'note', p.note
            ) order by p.date_paiement asc, p.created_at asc
          )
          from public.paiement p
          where p.atelier_id = p_atelier_id
            and p.commande_id = c.id
            and p.statut = 'confirme'
        ), '[]'::jsonb)
      ) order by c.date_commande desc, c.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.commande c
  where c.atelier_id = p_atelier_id;

  return v_result;
end;
$function$;

revoke all on function public.get_atelier_order_financials(uuid) from public, anon;
grant execute on function public.get_atelier_order_financials(uuid) to authenticated;

notify pgrst, 'reload schema';
