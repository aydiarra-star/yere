-- Temporary API table grants used by the marketplace rollout.
-- The following migration 20261102093423 narrows these privileges to public/profile columns.
grant select on table public.marketplace_vendeur to anon, authenticated;
grant update on table public.marketplace_vendeur to authenticated;
