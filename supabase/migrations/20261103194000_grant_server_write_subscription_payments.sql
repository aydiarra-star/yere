-- Allow the server-only PayTech Edge Function to create and update payment attempts.
-- service_role is never exposed to the browser; owner-facing access remains protected by RLS.
GRANT INSERT, UPDATE ON TABLE public.abonnement_paiement TO service_role;
