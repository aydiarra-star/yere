-- YÉRÉ — caisse (dépenses) et inventaire par atelier
create table public.depense (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null references public.atelier(id) on delete cascade,
  date_depense date not null default current_date,
  categorie text not null check (length(trim(categorie)) between 1 and 80),
  description text not null check (length(trim(description)) between 1 and 240),
  montant_fcfa bigint not null check (montant_fcfa > 0),
  annulee_le date,
  motif_annulation text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  constraint depense_annulation_pair check (
    (annulee_le is null and motif_annulation is null) or
    (annulee_le is not null and motif_annulation is not null and length(trim(motif_annulation)) > 0)
  )
);
create index depense_atelier_date_idx on public.depense(atelier_id, date_depense desc);
alter table public.depense enable row level security;
create policy depense_select_member on public.depense for select to authenticated
  using (private.is_atelier_member(atelier_id));
create policy depense_insert_managers on public.depense for insert to authenticated
  with check (private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']) and (created_by is null or created_by = (select auth.uid())));
create policy depense_update_managers on public.depense for update to authenticated
  using (private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']))
  with check (private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']));
create trigger depense_guard_tenant_author before update on public.depense
  for each row execute function public.guard_tenant_and_author();
create or replace function private.guard_depense_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.annulee_le is not null
     or new.id is distinct from old.id
     or new.atelier_id is distinct from old.atelier_id
     or new.date_depense is distinct from old.date_depense
     or new.categorie is distinct from old.categorie
     or new.description is distinct from old.description
     or new.montant_fcfa is distinct from old.montant_fcfa
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
     or new.annulee_le is null
     or new.motif_annulation is null
     or length(trim(new.motif_annulation)) = 0 then
    raise exception 'Une dépense ne peut être modifiée que par une annulation motivée, une seule fois' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_depense_update() from public, anon, authenticated;
create trigger depense_append_only before update on public.depense
  for each row execute function private.guard_depense_update();

create table public.stock_article (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null references public.atelier(id) on delete cascade,
  nom text not null check (length(trim(nom)) between 1 and 120),
  unite text not null check (length(trim(unite)) between 1 and 40),
  seuil_alerte numeric(14,3) not null default 0 check (seuil_alerte >= 0),
  created_at timestamptz not null default now(),
  unique (atelier_id, id)
);
create unique index stock_article_name_unique_idx on public.stock_article(atelier_id, lower(nom));
create index stock_article_atelier_idx on public.stock_article(atelier_id);
alter table public.stock_article enable row level security;
create policy stock_article_select_member on public.stock_article for select to authenticated
  using (private.is_atelier_member(atelier_id));
create policy stock_article_insert_managers on public.stock_article for insert to authenticated
  with check (private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']));
create policy stock_article_update_managers on public.stock_article for update to authenticated
  using (private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']))
  with check (private.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']));
create trigger stock_article_guard_tenant before update on public.stock_article
  for each row execute function public.guard_tenant_and_author();

create table public.stock_mouvement (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null references public.atelier(id) on delete cascade,
  article_id uuid not null,
  type text not null check (type in ('entree','sortie')),
  quantite numeric(14,3) not null check (quantite > 0),
  date_mouvement date not null default current_date,
  note text,
  cle_idempotence text not null check (length(trim(cle_idempotence)) between 8 and 200),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  constraint stock_mouvement_article_atelier_fkey foreign key (atelier_id, article_id) references public.stock_article(atelier_id, id),
  unique (atelier_id, cle_idempotence)
);
create index stock_mouvement_article_date_idx on public.stock_mouvement(atelier_id, article_id, date_mouvement desc);
alter table public.stock_mouvement enable row level security;
create policy stock_mouvement_select_member on public.stock_mouvement for select to authenticated
  using (private.is_atelier_member(atelier_id));
create policy stock_mouvement_insert_member on public.stock_mouvement for insert to authenticated
  with check (private.is_atelier_member(atelier_id) and (created_by is null or created_by = (select auth.uid())));
create trigger stock_mouvement_guard_tenant_author before update on public.stock_mouvement
  for each row execute function public.guard_tenant_and_author();

create or replace function private.apply_stock_movement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_article public.stock_article%rowtype; v_quantity numeric(14,3);
begin
  if auth.uid() is null or not private.is_atelier_member(new.atelier_id) then
    raise exception 'Accès à cet atelier refusé' using errcode = '42501';
  end if;
  select * into v_article from public.stock_article a
    where a.id = new.article_id and a.atelier_id = new.atelier_id for update;
  if not found then raise exception 'Article introuvable dans cet atelier' using errcode = '23503'; end if;
  select coalesce(sum(case when m.type = 'entree' then m.quantite else -m.quantite end), 0)
    into v_quantity from public.stock_mouvement m
    where m.atelier_id = new.atelier_id and m.article_id = new.article_id;
  if new.type = 'sortie' and v_quantity < new.quantite then
    raise exception 'Stock insuffisant : cette sortie rendrait le stock négatif' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.apply_stock_movement() from public, anon, authenticated;
create trigger stock_mouvement_validate before insert on public.stock_mouvement
  for each row execute function private.apply_stock_movement();

create or replace function private.prevent_stock_movement_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'L’historique des mouvements de stock est immuable' using errcode = '42501'; end;
$$;
revoke all on function private.prevent_stock_movement_mutation() from public, anon, authenticated;
create trigger stock_mouvement_immutable before update or delete on public.stock_mouvement
  for each row execute function private.prevent_stock_movement_mutation();

create or replace function public.create_stock_article_with_opening(
  p_atelier_id uuid, p_nom text, p_unite text, p_seuil numeric,
  p_quantite_initiale numeric, p_date date, p_cle_idempotence text
)
returns table(article_id uuid) language plpgsql security invoker set search_path = '' as $$
declare v_article_id uuid;
begin
  insert into public.stock_article(atelier_id, nom, unite, seuil_alerte)
  values(p_atelier_id, p_nom, p_unite, p_seuil) returning id into v_article_id;
  if p_quantite_initiale > 0 then
    insert into public.stock_mouvement(atelier_id, article_id, type, quantite, date_mouvement, note, cle_idempotence)
    values(p_atelier_id, v_article_id, 'entree', p_quantite_initiale, p_date, 'Stock initial', p_cle_idempotence);
  end if;
  return query select v_article_id;
end;
$$;
revoke all on function public.create_stock_article_with_opening(uuid,text,text,numeric,numeric,date,text) from public, anon;
grant execute on function public.create_stock_article_with_opening(uuid,text,text,numeric,numeric,date,text) to authenticated;
grant select, insert, update on public.depense, public.stock_article to authenticated;
grant select, insert on public.stock_mouvement to authenticated;
revoke all on public.depense, public.stock_article, public.stock_mouvement from anon;
revoke delete on public.depense, public.stock_article, public.stock_mouvement from authenticated;
alter default privileges in schema public revoke all on tables from anon;
