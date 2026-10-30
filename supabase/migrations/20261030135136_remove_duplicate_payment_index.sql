-- Nettoyage de l'index redondant sur les versements.
drop index if exists public.paiement_atelier_commande_date_idx;
