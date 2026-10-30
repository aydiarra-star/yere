-- YÉRÉ — durcissement du schéma privé des helpers et index FK
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_atelier_member(p_atelier_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.atelier_membre m where m.atelier_id = p_atelier_id and m.user_id = (select auth.uid()) and m.actif = true);
$$;
create or replace function private.has_atelier_role(p_atelier_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.atelier_membre m where m.atelier_id = p_atelier_id and m.user_id = (select auth.uid()) and m.actif = true and m.role = any(p_roles));
$$;
revoke all on function private.is_atelier_member(uuid) from public, anon;
revoke all on function private.has_atelier_role(uuid, text[]) from public, anon;
grant execute on function private.is_atelier_member(uuid) to authenticated;
grant execute on function private.has_atelier_role(uuid, text[]) to authenticated;

drop policy atelier_select_member on public.atelier;
drop policy atelier_update_managers on public.atelier;
drop policy atelier_membre_select_same_atelier on public.atelier_membre;
drop policy client_select_member on public.client;
drop policy client_insert_member on public.client;
drop policy client_update_member on public.client;
drop policy client_delete_managers on public.client;
drop policy mensuration_select_member on public.mensuration;
drop policy mensuration_insert_member on public.mensuration;
drop policy mensuration_update_member on public.mensuration;
drop policy mensuration_delete_managers on public.mensuration;
drop policy commande_select_member on public.commande;
drop policy commande_insert_member on public.commande;
drop policy commande_update_member on public.commande;
drop policy commande_delete_managers on public.commande;
drop policy paiement_select_member on public.paiement;
drop policy paiement_insert_managers on public.paiement;

drop function public.is_atelier_member(uuid);
drop function public.has_atelier_role(uuid, text[]);

create policy atelier_select_member on public.atelier for select to authenticated using (private.is_atelier_member(id));
create policy atelier_update_managers on public.atelier for update to authenticated using (private.has_atelier_role(id, array['proprietaire','gestionnaire'])) with check (private.has_atelier_role(id, array['proprietaire','gestionnaire']));
create policy atelier_membre_select_same_atelier on public.atelier_membre for select to authenticated using (user_id = (select auth.uid()) or private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']));
create policy client_select_member on public.client for select to authenticated using (private.is_atelier_member(atelier_id));
create policy client_insert_member on public.client for insert to authenticated with check (private.is_atelier_member(atelier_id));
create policy client_update_member on public.client for update to authenticated using (private.is_atelier_member(atelier_id)) with check (private.is_atelier_member(atelier_id));
create policy client_delete_managers on public.client for delete to authenticated using (private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']));
create policy mensuration_select_member on public.mensuration for select to authenticated using (private.is_atelier_member(atelier_id));
create policy mensuration_insert_member on public.mensuration for insert to authenticated with check (private.is_atelier_member(atelier_id) and (created_by is null or created_by = (select auth.uid())));
create policy mensuration_update_member on public.mensuration for update to authenticated using (private.is_atelier_member(atelier_id)) with check (private.is_atelier_member(atelier_id));
create policy mensuration_delete_managers on public.mensuration for delete to authenticated using (private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']));
create policy commande_select_member on public.commande for select to authenticated using (private.is_atelier_member(atelier_id));
create policy commande_insert_member on public.commande for insert to authenticated with check (private.is_atelier_member(atelier_id) and (created_by is null or created_by = (select auth.uid())));
create policy commande_update_member on public.commande for update to authenticated using (private.is_atelier_member(atelier_id)) with check (private.is_atelier_member(atelier_id));
create policy commande_delete_managers on public.commande for delete to authenticated using (private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']));
create policy paiement_select_member on public.paiement for select to authenticated using (private.is_atelier_member(atelier_id));
create policy paiement_insert_managers on public.paiement for insert to authenticated with check (private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']) and (created_by is null or created_by = (select auth.uid())));

create index if not exists commande_atelier_client_idx on public.commande(atelier_id, client_id);
create index if not exists commande_created_by_idx on public.commande(created_by);
create index if not exists mensuration_created_by_idx on public.mensuration(created_by);
create index if not exists paiement_created_by_idx on public.paiement(created_by);
