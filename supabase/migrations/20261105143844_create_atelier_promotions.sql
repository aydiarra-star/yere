create table if not exists public.atelier_promotion (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null references public.atelier(id) on delete cascade,
  titre text not null check (char_length(btrim(titre)) between 1 and 100),
  type_remise text not null check (type_remise in ('pourcentage', 'montant')),
  valeur integer not null check ((type_remise = 'pourcentage' and valeur between 1 and 100) or (type_remise = 'montant' and valeur > 0)),
  date_debut date not null,
  date_fin date not null check (date_fin >= date_debut),
  message text not null check (char_length(btrim(message)) between 1 and 1200),
  cible text not null check (cible in ('tous', 'anciens', 'inactifs')),
  suivi jsonb not null default '[]'::jsonb check (jsonb_typeof(suivi) = 'array'),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists atelier_promotion_atelier_created_idx on public.atelier_promotion (atelier_id, created_at desc);
alter table public.atelier_promotion enable row level security;
revoke all on public.atelier_promotion from anon;
grant select, insert, update, delete on public.atelier_promotion to authenticated;

drop policy if exists "atelier promotion manager select" on public.atelier_promotion;
create policy "atelier promotion manager select" on public.atelier_promotion for select to authenticated using (
  exists (select 1 from public.atelier_membre m where m.atelier_id = atelier_promotion.atelier_id and m.user_id = (select auth.uid()) and m.actif = true and m.role in ('proprietaire', 'gestionnaire'))
);
drop policy if exists "atelier promotion manager insert" on public.atelier_promotion;
create policy "atelier promotion manager insert" on public.atelier_promotion for insert to authenticated with check (
  created_by = (select auth.uid()) and exists (select 1 from public.atelier_membre m where m.atelier_id = atelier_promotion.atelier_id and m.user_id = (select auth.uid()) and m.actif = true and m.role in ('proprietaire', 'gestionnaire'))
);
drop policy if exists "atelier promotion manager update" on public.atelier_promotion;
create policy "atelier promotion manager update" on public.atelier_promotion for update to authenticated using (
  exists (select 1 from public.atelier_membre m where m.atelier_id = atelier_promotion.atelier_id and m.user_id = (select auth.uid()) and m.actif = true and m.role in ('proprietaire', 'gestionnaire'))
) with check (
  exists (select 1 from public.atelier_membre m where m.atelier_id = atelier_promotion.atelier_id and m.user_id = (select auth.uid()) and m.actif = true and m.role in ('proprietaire', 'gestionnaire'))
);
drop policy if exists "atelier promotion manager delete" on public.atelier_promotion;
create policy "atelier promotion manager delete" on public.atelier_promotion for delete to authenticated using (
  exists (select 1 from public.atelier_membre m where m.atelier_id = atelier_promotion.atelier_id and m.user_id = (select auth.uid()) and m.actif = true and m.role in ('proprietaire', 'gestionnaire'))
);
