-- Indexes for supplier foreign keys and creator lookups
create index fournisseur_created_by_idx on public.fournisseur(created_by) where created_by is not null;
create index achat_fournisseur_created_by_idx on public.achat_fournisseur(created_by) where created_by is not null;
create index ligne_achat_article_fk_idx on public.ligne_achat_fournisseur(atelier_id,article_id);
create index paiement_fournisseur_created_by_idx on public.paiement_fournisseur(created_by) where created_by is not null;