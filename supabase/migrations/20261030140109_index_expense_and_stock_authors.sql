-- Indexer les clés étrangères vers les auteurs des écritures de caisse et de stock.
create index if not exists depense_created_by_idx on public.depense(created_by) where created_by is not null;
create index if not exists stock_mouvement_created_by_idx on public.stock_mouvement(created_by) where created_by is not null;
