-- Allow authenticated users to create their first atelier.
-- RLS policy atelier_insert_authenticated still requires auth.uid() IS NOT NULL.
-- Anonymous users remain without INSERT privileges.
GRANT INSERT ON TABLE public.atelier TO authenticated;
