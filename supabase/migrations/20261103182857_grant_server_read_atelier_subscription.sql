-- Allow the server-side PayTech Edge Function to read atelier subscription state.
-- This grant is restricted to service_role; owner-only RLS remains unchanged for authenticated users.
GRANT SELECT ON TABLE public.abonnement_atelier TO service_role;
