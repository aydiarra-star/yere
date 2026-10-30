-- Le journal des mouvements est append-only : aucune modification ni suppression côté application.
revoke update, delete on public.stock_mouvement from authenticated;
