-- Index marketplace foreign keys to keep joins and cascades efficient.
create index if not exists marketplace_annonce_vendeur_id_idx
  on public.marketplace_annonce (vendeur_id);

create index if not exists marketplace_commande_annonce_id_idx
  on public.marketplace_commande (annonce_id);

create index if not exists marketplace_message_expediteur_user_id_idx
  on public.marketplace_message (expediteur_user_id);

create index if not exists marketplace_vendeur_atelier_id_idx
  on public.marketplace_vendeur (atelier_id);
