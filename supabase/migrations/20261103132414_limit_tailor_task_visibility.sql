-- Limit tailors to tasks assigned to them while keeping workshop-wide access for owners/managers.
-- Client creation and zero-price order creation remain available to all active workshop members.
drop policy if exists commande_tache_select_member on public.commande_tache;
create policy commande_tache_select_manager_or_assignee
on public.commande_tache
for select
to authenticated
using (
  private.has_atelier_role(atelier_id, array['proprietaire', 'gestionnaire']::text[])
  or (
    assigne_a = (select auth.uid())
    and private.has_atelier_role(atelier_id, array['employe']::text[])
  )
);

drop policy if exists commande_tache_historique_select_member on public.commande_tache_historique;
create policy commande_tache_historique_select_manager_or_assignee
on public.commande_tache_historique
for select
to authenticated
using (
  private.has_atelier_role(atelier_id, array['proprietaire', 'gestionnaire']::text[])
  or (
    private.has_atelier_role(atelier_id, array['employe']::text[])
    and exists (
      select 1
      from public.commande_tache t
      where t.id = commande_tache_historique.tache_id
        and t.atelier_id = commande_tache_historique.atelier_id
        and t.assigne_a = (select auth.uid())
    )
  )
);

notify pgrst, 'reload schema';
