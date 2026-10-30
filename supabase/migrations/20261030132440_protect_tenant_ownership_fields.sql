-- YÉRÉ — protection contre le déplacement inter-ateliers et la falsification de l'auteur
create or replace function public.guard_tenant_and_author()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.atelier_id is distinct from old.atelier_id then
    raise exception 'Le rattachement à un atelier est immuable' using errcode = '42501';
  end if;
  if tg_table_name in ('mensuration', 'commande', 'paiement')
     and new.created_by is distinct from old.created_by then
    raise exception 'L’auteur initial est immuable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger client_guard_tenant
before update on public.client
for each row execute function public.guard_tenant_and_author();
create trigger mensuration_guard_tenant_author
before update on public.mensuration
for each row execute function public.guard_tenant_and_author();
create trigger commande_guard_tenant_author
before update on public.commande
for each row execute function public.guard_tenant_and_author();
create trigger paiement_guard_tenant_author
before update on public.paiement
for each row execute function public.guard_tenant_and_author();

revoke all on function public.guard_tenant_and_author() from public, anon, authenticated;
