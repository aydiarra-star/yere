-- Allow the public catalogue to read only active seller rows (RLS remains enforced).
grant select on table public.marketplace_vendeur to anon, authenticated;

-- Allow signed-in sellers to update only their own seller profile (RLS policies remain enforced).
grant update on table public.marketplace_vendeur to authenticated;
