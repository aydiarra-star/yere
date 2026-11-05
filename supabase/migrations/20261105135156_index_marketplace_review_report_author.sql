create index marketplace_avis_signalement_author_idx
  on public.marketplace_avis_signalement (auteur_user_id, created_at desc);