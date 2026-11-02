-- Keep deterministic atelier IDs available to authenticated creation workflows and CI fixtures.
-- Currency and timestamps remain non-insertable; RLS still requires an authenticated identity.
grant insert (id) on table public.atelier to authenticated;
