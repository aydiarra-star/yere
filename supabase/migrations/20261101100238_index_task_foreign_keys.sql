-- Cover task foreign keys for efficient joins and member deletion checks.
create index if not exists commande_tache_atelier_creator_idx
  on public.commande_tache (atelier_id, created_by);

create index if not exists commande_tache_historique_acteur_idx
  on public.commande_tache_historique (acteur_id)
  where acteur_id is not null;
