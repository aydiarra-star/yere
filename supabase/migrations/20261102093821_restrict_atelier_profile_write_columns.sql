-- Only the atelier's editable profile fields may be inserted or updated by authenticated clients.
-- The UUID remains insertable for deterministic trusted workflows; currency and timestamps stay server-controlled.
revoke insert on table public.atelier from public, anon, authenticated;
grant insert (nom, telephone, ville) on table public.atelier to authenticated;

revoke update on table public.atelier from public, anon, authenticated;
grant update (nom, telephone, ville) on table public.atelier to authenticated;
