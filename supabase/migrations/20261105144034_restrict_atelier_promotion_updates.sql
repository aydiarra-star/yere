revoke insert, update on public.atelier_promotion from authenticated;
grant insert (atelier_id, titre, type_remise, valeur, date_debut, date_fin, message, cible, suivi) on public.atelier_promotion to authenticated;
grant update (suivi) on public.atelier_promotion to authenticated;