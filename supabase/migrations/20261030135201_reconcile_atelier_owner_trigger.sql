-- YÉRÉ — attribution privée du propriétaire lors de la création d'un atelier
create schema if not exists private;
create or replace function private.attach_owner_to_new_atelier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;
  insert into public.atelier_membre(atelier_id, user_id, role, actif)
  values (new.id, v_user_id, 'proprietaire', true);
  return new;
end;
$$;
revoke all on function private.attach_owner_to_new_atelier() from public, anon, authenticated;
drop function if exists public.create_atelier(text, text, text);
drop policy if exists atelier_insert_authenticated on public.atelier;
create policy atelier_insert_authenticated on public.atelier
for insert to authenticated
with check ((select auth.uid()) is not null);
grant insert on public.atelier to authenticated;
drop trigger if exists atelier_attach_owner_after_insert on public.atelier;
create trigger atelier_attach_owner_after_insert
after insert on public.atelier
for each row execute function private.attach_owner_to_new_atelier();
