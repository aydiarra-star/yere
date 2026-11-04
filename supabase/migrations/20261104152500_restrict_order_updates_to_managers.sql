-- Keep the global order workflow under owner/manager control.
-- Employees update only the tasks assigned to them through commande_tache.
drop policy if exists commande_update_member on public.commande;

create policy commande_update_managers
on public.commande
for update
to authenticated
using (
  private.has_atelier_role(
    atelier_id,
    array['proprietaire', 'gestionnaire']::text[]
  )
)
with check (
  private.has_atelier_role(
    atelier_id,
    array['proprietaire', 'gestionnaire']::text[]
  )
);
