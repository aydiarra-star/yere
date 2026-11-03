-- Allow the PayTech server function to inspect pending subscription payment attempts.
-- service_role only; anonymous access remains denied and authenticated access remains owner-RLS controlled.
GRANT SELECT ON TABLE public.abonnement_paiement TO service_role;
