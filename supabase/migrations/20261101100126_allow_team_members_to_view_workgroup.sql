-- Let every active atelier member consult the workgroup roster.
-- The table contains only membership identity, role, active state and join date;
-- financial data and owner-only team-management RPCs remain unchanged.
drop policy if exists atelier_membre_select_same_atelier on public.atelier_membre;

create policy atelier_membre_select_same_atelier
  on public.atelier_membre
  for select
  to authenticated
  using (private.is_atelier_member(atelier_id));

