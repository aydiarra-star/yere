-- YÉRÉ — fondation PostgreSQL + Auth + isolation multi-ateliers
-- Migration initiale. Les données réelles restent interdites jusqu'aux tests d'acceptation.
create extension if not exists pgcrypto with schema extensions;

create table public.atelier (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(trim(nom)) between 1 and 120),
  telephone text,
  ville text,
  devise text not null default 'XOF' check (devise = 'XOF'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.atelier_membre (
  atelier_id uuid not null references public.atelier(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('proprietaire', 'gestionnaire', 'employe')),
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (atelier_id, user_id)
);
create index atelier_membre_user_active_idx on public.atelier_membre(user_id, actif, atelier_id);
create table public.client (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null references public.atelier(id) on delete restrict,
  nom text not null check (length(trim(nom)) between 1 and 160),
  telephone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (atelier_id, id)
);
create index client_atelier_nom_idx on public.client(atelier_id, lower(nom));
create index client_atelier_telephone_idx on public.client(atelier_id, telephone);
create table public.mensuration (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null,
  client_id uuid not null,
  date_mesure date not null,
  valeurs jsonb not null check (jsonb_typeof(valeurs) = 'object'),
  note text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (atelier_id, id),
  foreign key (atelier_id, client_id) references public.client(atelier_id, id) on delete restrict
);
create index mensuration_client_date_idx on public.mensuration(atelier_id, client_id, date_mesure desc);
create table public.commande (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null,
  client_id uuid not null,
  reference text not null check (length(trim(reference)) between 1 and 80),
  vetement text not null check (length(trim(vetement)) between 1 and 200),
  date_commande date not null default current_date,
  date_livraison date,
  statut text not null default 'a_preparer' check (statut in ('a_preparer', 'en_confection', 'pret', 'livre', 'annule')),
  prix_fcfa bigint not null check (prix_fcfa >= 0),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (atelier_id, id),
  unique (atelier_id, reference),
  foreign key (atelier_id, client_id) references public.client(atelier_id, id) on delete restrict,
  check (date_livraison is null or date_livraison >= date_commande)
);
create index commande_atelier_statut_date_idx on public.commande(atelier_id, statut, date_livraison);
create table public.paiement (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null,
  commande_id uuid not null,
  montant_fcfa bigint not null check (montant_fcfa > 0),
  date_paiement timestamptz not null default now(),
  statut text not null default 'confirme' check (statut in ('confirme', 'annule')),
  cle_idempotence text not null check (length(trim(cle_idempotence)) between 8 and 200),
  note text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (atelier_id, id),
  unique (atelier_id, cle_idempotence),
  foreign key (atelier_id, commande_id) references public.commande(atelier_id, id) on delete restrict
);
create index paiement_commande_date_idx on public.paiement(atelier_id, commande_id, date_paiement desc);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger atelier_set_updated_at before update on public.atelier for each row execute function public.set_updated_at();
create trigger client_set_updated_at before update on public.client for each row execute function public.set_updated_at();
create trigger commande_set_updated_at before update on public.commande for each row execute function public.set_updated_at();

create or replace function public.is_atelier_member(p_atelier_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.atelier_membre m where m.atelier_id = p_atelier_id and m.user_id = (select auth.uid()) and m.actif = true);
$$;
create or replace function public.has_atelier_role(p_atelier_id uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.atelier_membre m where m.atelier_id = p_atelier_id and m.user_id = (select auth.uid()) and m.actif = true and m.role = any(p_roles));
$$;
create or replace function public.create_atelier(p_nom text, p_telephone text default null, p_ville text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_atelier_id uuid;
begin
  if v_user_id is null then raise exception 'Authentification requise' using errcode = '28000'; end if;
  if p_nom is null or length(trim(p_nom)) not between 1 and 120 then raise exception 'Nom d’atelier invalide' using errcode = '22023'; end if;
  insert into public.atelier(nom, telephone, ville) values (trim(p_nom), nullif(trim(p_telephone), ''), nullif(trim(p_ville), '')) returning id into v_atelier_id;
  insert into public.atelier_membre(atelier_id, user_id, role, actif) values (v_atelier_id, v_user_id, 'proprietaire', true);
  return v_atelier_id;
end;
$$;

alter table public.atelier enable row level security;
alter table public.atelier_membre enable row level security;
alter table public.client enable row level security;
alter table public.mensuration enable row level security;
alter table public.commande enable row level security;
alter table public.paiement enable row level security;

create policy atelier_select_member on public.atelier for select to authenticated using (public.is_atelier_member(id));
create policy atelier_update_managers on public.atelier for update to authenticated using (public.has_atelier_role(id, array['proprietaire','gestionnaire'])) with check (public.has_atelier_role(id, array['proprietaire','gestionnaire']));
create policy atelier_membre_select_same_atelier on public.atelier_membre for select to authenticated using (user_id = (select auth.uid()) or public.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']));

create policy client_select_member on public.client for select to authenticated using (public.is_atelier_member(atelier_id));
create policy client_insert_member on public.client for insert to authenticated with check (public.is_atelier_member(atelier_id));
create policy client_update_member on public.client for update to authenticated using (public.is_atelier_member(atelier_id)) with check (public.is_atelier_member(atelier_id));
create policy client_delete_managers on public.client for delete to authenticated using (public.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']));

create policy mensuration_select_member on public.mensuration for select to authenticated using (public.is_atelier_member(atelier_id));
create policy mensuration_insert_member on public.mensuration for insert to authenticated with check (public.is_atelier_member(atelier_id) and (created_by is null or created_by = (select auth.uid())));
create policy mensuration_update_member on public.mensuration for update to authenticated using (public.is_atelier_member(atelier_id)) with check (public.is_atelier_member(atelier_id));
create policy mensuration_delete_managers on public.mensuration for delete to authenticated using (public.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']));

create policy commande_select_member on public.commande for select to authenticated using (public.is_atelier_member(atelier_id));
create policy commande_insert_member on public.commande for insert to authenticated with check (public.is_atelier_member(atelier_id) and (created_by is null or created_by = (select auth.uid())));
create policy commande_update_member on public.commande for update to authenticated using (public.is_atelier_member(atelier_id)) with check (public.is_atelier_member(atelier_id));
create policy commande_delete_managers on public.commande for delete to authenticated using (public.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']));

create policy paiement_select_member on public.paiement for select to authenticated using (public.is_atelier_member(atelier_id));
create policy paiement_insert_managers on public.paiement for insert to authenticated with check (public.has_atelier_role(atelier_id, array['proprietaire','gestionnaire']) and (created_by is null or created_by = (select auth.uid())));
-- Pas de policy UPDATE/DELETE : un paiement enregistré est immuable via l'accès direct.

grant usage on schema public to authenticated;
grant select, update on public.atelier to authenticated;
grant select on public.atelier_membre to authenticated;
grant select, insert, update, delete on public.client to authenticated;
grant select, insert, update, delete on public.mensuration to authenticated;
grant select, insert, update, delete on public.commande to authenticated;
grant select, insert on public.paiement to authenticated;
revoke all on function public.is_atelier_member(uuid) from public, anon;
revoke all on function public.has_atelier_role(uuid, text[]) from public, anon;
revoke all on function public.create_atelier(text, text, text) from public, anon;
grant execute on function public.is_atelier_member(uuid) to authenticated;
grant execute on function public.has_atelier_role(uuid, text[]) to authenticated;
grant execute on function public.create_atelier(text, text, text) to authenticated;
