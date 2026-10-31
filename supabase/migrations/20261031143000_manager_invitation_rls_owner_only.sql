-- Managers may invite employees, but only atelier owners may invite managers.
drop policy if exists invitation_insert_managers on public.invitation_atelier;

create policy invitation_insert_authorized_roles
on public.invitation_atelier
for insert
to authenticated
with check (
  private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire'])
  and invited_by = (select auth.uid())
  and role = any (array['gestionnaire','employe'])
  and (
    role = 'employe'
    or private.has_atelier_role(atelier_id, array['proprietaire'])
  )
  and accepted_at is null
  and cancelled_at is null
);
