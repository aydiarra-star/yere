-- Verified YÉRÉ Market reviews: one review per delivered order, with seller replies and abuse reports.
create table public.marketplace_avis (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null unique references public.marketplace_commande(id) on delete restrict,
  vendeur_id uuid not null references public.marketplace_vendeur(id) on delete restrict,
  acheteur_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  note smallint not null check (note between 1 and 5),
  criteres jsonb not null default '{}'::jsonb check (jsonb_typeof(criteres) = 'object'),
  commentaire text not null default '' check (char_length(commentaire) <= 1200),
  reponse_vendeur text null check (reponse_vendeur is null or char_length(reponse_vendeur) <= 1200),
  repondu_at timestamptz null,
  statut text not null default 'publiee' check (statut in ('publiee','masquee')),
  created_at timestamptz not null default now(),
  constraint marketplace_avis_response_pair check (
    (reponse_vendeur is null and repondu_at is null)
    or (reponse_vendeur is not null and repondu_at is not null)
  )
);

create index marketplace_avis_vendeur_created_idx
  on public.marketplace_avis (vendeur_id, created_at desc)
  where statut = 'publiee';
create index marketplace_avis_buyer_idx
  on public.marketplace_avis (acheteur_user_id, created_at desc);

alter table public.marketplace_avis enable row level security;

revoke all on table public.marketplace_avis from public, anon, authenticated;
grant select (id, vendeur_id, note, criteres, commentaire, reponse_vendeur, repondu_at, created_at)
  on public.marketplace_avis to anon;
grant select (id, commande_id, vendeur_id, note, criteres, commentaire, reponse_vendeur, repondu_at, created_at)
  on public.marketplace_avis to authenticated;
grant insert (commande_id, vendeur_id, note, criteres, commentaire)
  on public.marketplace_avis to authenticated;
grant update (reponse_vendeur, repondu_at)
  on public.marketplace_avis to authenticated;

create policy marketplace_avis_public_read
  on public.marketplace_avis for select to anon
  using (statut = 'publiee');

create policy marketplace_avis_authenticated_read
  on public.marketplace_avis for select to authenticated
  using (
    statut = 'publiee'
    or acheteur_user_id = (select auth.uid())
    or public.marketplace_vendeur_est_moi(vendeur_id)
  );

create policy marketplace_avis_buyer_insert_delivered_order
  on public.marketplace_avis for insert to authenticated
  with check (
    marketplace_avis.acheteur_user_id = (select auth.uid())
    and exists (
      select 1
      from public.marketplace_commande c
      join public.marketplace_vendeur v on v.id = c.vendeur_id
      where c.id = marketplace_avis.commande_id
        and c.vendeur_id = marketplace_avis.vendeur_id
        and c.acheteur_user_id = (select auth.uid())
        and c.statut = 'livree'
        and v.user_id <> (select auth.uid())
    )
  );

create policy marketplace_avis_seller_reply
  on public.marketplace_avis for update to authenticated
  using (
    statut = 'publiee'
    and public.marketplace_vendeur_est_moi(vendeur_id)
  )
  with check (
    statut = 'publiee'
    and public.marketplace_vendeur_est_moi(vendeur_id)
    and (reponse_vendeur is null or char_length(reponse_vendeur) <= 1200)
  );

create table public.marketplace_avis_signalement (
  id uuid primary key default gen_random_uuid(),
  avis_id uuid not null references public.marketplace_avis(id) on delete restrict,
  auteur_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  motif text not null check (motif in ('faux_avis','insulte','conflit_interet','autre')),
  details text not null default '' check (char_length(details) <= 800),
  created_at timestamptz not null default now(),
  unique (avis_id, auteur_user_id)
);

create index marketplace_avis_signalement_created_idx
  on public.marketplace_avis_signalement (created_at desc);

alter table public.marketplace_avis_signalement enable row level security;
revoke all on table public.marketplace_avis_signalement from public, anon, authenticated;
grant select (id, avis_id, motif, details, created_at)
  on public.marketplace_avis_signalement to authenticated;
grant insert (avis_id, motif, details)
  on public.marketplace_avis_signalement to authenticated;

create policy marketplace_avis_signalement_read_own
  on public.marketplace_avis_signalement for select to authenticated
  using (auteur_user_id = (select auth.uid()));

create policy marketplace_avis_signalement_insert_own
  on public.marketplace_avis_signalement for insert to authenticated
  with check (
    auteur_user_id = (select auth.uid())
    and exists (
      select 1 from public.marketplace_avis a
      where a.id = marketplace_avis_signalement.avis_id and a.statut = 'publiee'
    )
  );
