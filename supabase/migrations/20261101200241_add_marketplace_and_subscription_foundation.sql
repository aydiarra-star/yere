-- YÉRÉ — fondations abonnement atelier et marketplace multi-vendeurs.
-- Additif : ne modifie ni ne supprime les données métier existantes.
-- Aucun paiement réel n'est initié par cette migration.

create table public.abonnement_atelier (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null unique references public.atelier(id) on delete restrict,
  montant_mensuel_fcfa bigint not null default 5000 check (montant_mensuel_fcfa = 5000),
  devise text not null default 'XOF' check (devise = 'XOF'),
  statut text not null default 'essai' check (statut in ('essai','actif','paiement_requis','en_retard','suspendu','resilie')),
  debut_essai timestamptz not null default now(),
  fin_essai timestamptz not null default (now() + interval '2 months'),
  periode_debut timestamptz,
  periode_fin timestamptz,
  prochaine_echeance timestamptz,
  fournisseur_paiement text,
  reference_client_paiement text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fin_essai > debut_essai),
  check (periode_fin is null or periode_debut is null or periode_fin > periode_debut)
);
create index abonnement_atelier_statut_echeance_idx
  on public.abonnement_atelier(statut, prochaine_echeance);

create table public.abonnement_paiement (
  id uuid primary key default gen_random_uuid(),
  abonnement_id uuid not null references public.abonnement_atelier(id) on delete restrict,
  montant_fcfa bigint not null check (montant_fcfa = 5000),
  devise text not null default 'XOF' check (devise = 'XOF'),
  statut text not null default 'en_attente' check (statut in ('en_attente','confirme','echec','rembourse','annule')),
  moyen_paiement text check (moyen_paiement in ('wave','orange_money','carte','autre')),
  reference_fournisseur text,
  reference_interne text not null unique,
  paye_le timestamptz,
  periode_couverte_debut timestamptz,
  periode_couverte_fin timestamptz,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  check (periode_couverte_fin is null or periode_couverte_debut is null or periode_couverte_fin > periode_couverte_debut)
);
create index abonnement_paiement_history_idx
  on public.abonnement_paiement(abonnement_id, created_at desc);

create or replace function public.initialiser_abonnement_atelier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.abonnement_atelier(atelier_id, debut_essai, fin_essai, statut)
  values (new.id, now(), now() + interval '2 months', 'essai')
  on conflict (atelier_id) do nothing;
  return new;
end;
$$;
create trigger atelier_initialiser_abonnement
  after insert on public.atelier
  for each row execute function public.initialiser_abonnement_atelier();

-- Existing workshops receive a fresh two-month evaluation window at rollout.
-- No existing workshop is blocked or charged by this migration.
insert into public.abonnement_atelier(atelier_id, debut_essai, fin_essai, statut)
select id, now(), now() + interval '2 months', 'essai'
from public.atelier
on conflict (atelier_id) do nothing;

create table public.marketplace_vendeur (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  type_vendeur text not null check (type_vendeur in ('fournisseur','atelier')),
  atelier_id uuid references public.atelier(id) on delete restrict,
  nom_entreprise text not null check (length(trim(nom_entreprise)) between 2 and 160),
  nom_contact text not null default '',
  telephone text not null default '',
  ville text not null default '',
  categorie text not null default '',
  description text not null default '',
  statut text not null default 'actif' check (statut in ('actif','suspendu')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((type_vendeur = 'fournisseur' and atelier_id is null) or (type_vendeur = 'atelier' and atelier_id is not null))
);
create index marketplace_vendeur_type_city_idx
  on public.marketplace_vendeur(type_vendeur, ville) where statut = 'actif';

create table public.marketplace_annonce (
  id uuid primary key default gen_random_uuid(),
  vendeur_id uuid not null references public.marketplace_vendeur(id) on delete restrict,
  titre text not null check (length(trim(titre)) between 3 and 160),
  categorie text not null check (length(trim(categorie)) between 2 and 80),
  description text not null default '' check (length(description) <= 4000),
  prix_fcfa bigint not null check (prix_fcfa > 0),
  unite text not null default 'unite' check (unite in ('unite','metre','lot','rouleau','piece')),
  ville text not null default '',
  photos text[] not null default '{}' check (cardinality(photos) <= 5),
  mode_vente text not null default 'les_deux' check (mode_vente in ('contact_direct','commande_yere','les_deux')),
  statut text not null default 'brouillon' check (statut in ('brouillon','publiee','indisponible','archivee')),
  stock_disponible integer check (stock_disponible is null or stock_disponible >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index marketplace_annonce_public_idx
  on public.marketplace_annonce(categorie, ville, created_at desc)
  where statut = 'publiee';

create table public.marketplace_commande (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  annonce_id uuid not null references public.marketplace_annonce(id) on delete restrict,
  vendeur_id uuid not null references public.marketplace_vendeur(id) on delete restrict,
  acheteur_user_id uuid not null references auth.users(id) on delete restrict,
  quantite integer not null check (quantite between 1 and 100000),
  prix_unitaire_fcfa bigint not null check (prix_unitaire_fcfa > 0),
  total_fcfa bigint not null check (total_fcfa > 0),
  nom_acheteur text not null check (length(trim(nom_acheteur)) between 2 and 160),
  telephone_acheteur text not null check (length(trim(telephone_acheteur)) between 6 and 40),
  ville_livraison text not null default '',
  note_acheteur text not null default '' check (length(note_acheteur) <= 2000),
  statut text not null default 'recue' check (statut in ('recue','acceptee','preparee','expediee','livree','annulee')),
  paiement_statut text not null default 'non_paye' check (paiement_statut in ('non_paye','a_payer','en_attente','paye','echec','rembourse')),
  paiement_moyen text check (paiement_moyen in ('wave','orange_money','carte','autre')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_fcfa = prix_unitaire_fcfa * quantite)
);
create index marketplace_commande_acheteur_idx
  on public.marketplace_commande(acheteur_user_id, created_at desc);
create index marketplace_commande_vendeur_idx
  on public.marketplace_commande(vendeur_id, created_at desc);

-- Buyers can only place an order against a currently published listing.
-- The unit price is read from the database, never trusted from the browser.
create or replace function public.creer_commande_marketplace(
  p_annonce_id uuid,
  p_quantite integer,
  p_nom_acheteur text,
  p_telephone_acheteur text,
  p_ville_livraison text default '',
  p_note_acheteur text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_annonce public.marketplace_annonce%rowtype;
  v_reference text;
  v_commande uuid;
begin
  if v_user is null then raise exception 'Authentification requise' using errcode = '28000'; end if;
  if p_quantite is null or p_quantite < 1 or p_quantite > 100000 then
    raise exception 'Quantité invalide' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_nom_acheteur,''))) not between 2 and 160
     or length(trim(coalesce(p_telephone_acheteur,''))) not between 6 and 40 then
    raise exception 'Coordonnées acheteur invalides' using errcode = '22023';
  end if;
  select * into v_annonce from public.marketplace_annonce
  where id = p_annonce_id and statut = 'publiee'
  for update;
  if not found then raise exception 'Annonce indisponible' using errcode = 'P0002'; end if;
  if v_annonce.mode_vente not in ('commande_yere','les_deux') then
    raise exception 'Cette annonce accepte uniquement le contact direct' using errcode = '22023';
  end if;
  if v_annonce.stock_disponible is not null and v_annonce.stock_disponible < p_quantite then
    raise exception 'Stock insuffisant' using errcode = '22023';
  end if;
  v_reference := 'YM-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.marketplace_commande(
    reference, annonce_id, vendeur_id, acheteur_user_id, quantite,
    prix_unitaire_fcfa, total_fcfa, nom_acheteur, telephone_acheteur,
    ville_livraison, note_acheteur, paiement_statut
  ) values (
    v_reference, v_annonce.id, v_annonce.vendeur_id, v_user, p_quantite,
    v_annonce.prix_fcfa, v_annonce.prix_fcfa * p_quantite,
    trim(p_nom_acheteur), trim(p_telephone_acheteur),
    coalesce(trim(p_ville_livraison),''), coalesce(trim(p_note_acheteur),''),
    'a_payer'
  ) returning id into v_commande;
  if v_annonce.stock_disponible is not null then
    update public.marketplace_annonce
    set stock_disponible = stock_disponible - p_quantite
    where id = v_annonce.id;
  end if;
  return v_commande;
end;
$$;

create or replace function public.changer_statut_commande_marketplace(
  p_commande_id uuid,
  p_statut text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_commande public.marketplace_commande%rowtype;
  v_is_seller boolean;
begin
  if v_user is null then raise exception 'Authentification requise' using errcode = '28000'; end if;
  if p_statut not in ('acceptee','preparee','expediee','livree','annulee') then
    raise exception 'Statut invalide' using errcode = '22023';
  end if;
  select c.* into v_commande
  from public.marketplace_commande c
  where c.id = p_commande_id
  for update;
  if not found then return false; end if;
  select exists (
    select 1 from public.marketplace_vendeur v
    where v.id = v_commande.vendeur_id and v.user_id = v_user
  ) into v_is_seller;

  if v_is_seller then
    if p_statut = 'annulee' and v_commande.statut not in ('recue','acceptee') then
      raise exception 'Cette commande ne peut plus être annulée par le vendeur' using errcode = '22023';
    elsif p_statut <> 'annulee' and not (
      (v_commande.statut = 'recue' and p_statut = 'acceptee')
      or (v_commande.statut = 'acceptee' and p_statut = 'preparee')
      or (v_commande.statut = 'preparee' and p_statut = 'expediee')
      or (v_commande.statut = 'expediee' and p_statut = 'livree')
    ) then
      raise exception 'Transition de commande invalide' using errcode = '22023';
    end if;
  elsif not (
    v_commande.acheteur_user_id = v_user
    and p_statut = 'annulee'
    and v_commande.statut = 'recue'
  ) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  update public.marketplace_commande
  set statut = p_statut, updated_at = now()
  where id = p_commande_id;

  if p_statut = 'annulee' and v_commande.statut <> 'annulee'
     and v_commande.paiement_statut in ('non_paye','a_payer','echec') then
    update public.marketplace_annonce
    set stock_disponible = stock_disponible + v_commande.quantite
    where id = v_commande.annonce_id and stock_disponible is not null;
  end if;
  return true;
end;
$$;

alter table public.abonnement_atelier enable row level security;
alter table public.abonnement_paiement enable row level security;
alter table public.marketplace_vendeur enable row level security;
alter table public.marketplace_annonce enable row level security;
alter table public.marketplace_commande enable row level security;

create policy abonnement_atelier_owner_read on public.abonnement_atelier
  for select to authenticated using (private.has_atelier_role(atelier_id, array['proprietaire']));
create policy abonnement_paiement_owner_read on public.abonnement_paiement
  for select to authenticated using (
    exists (select 1 from public.abonnement_atelier a
      where a.id = abonnement_id and private.has_atelier_role(a.atelier_id, array['proprietaire']))
  );

create policy marketplace_vendeur_public_read on public.marketplace_vendeur
  for select to anon, authenticated using (statut = 'actif');
create policy marketplace_vendeur_self_read on public.marketplace_vendeur
  for select to authenticated using (user_id = (select auth.uid()));
create policy marketplace_vendeur_self_insert on public.marketplace_vendeur
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and ((type_vendeur = 'fournisseur' and atelier_id is null)
      or (type_vendeur = 'atelier' and private.has_atelier_role(atelier_id, array['proprietaire'])))
  );
create policy marketplace_vendeur_self_update on public.marketplace_vendeur
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy marketplace_annonce_public_read on public.marketplace_annonce
  for select to anon, authenticated using (
    statut = 'publiee' and exists (
      select 1 from public.marketplace_vendeur v where v.id = vendeur_id and v.statut = 'actif'
    )
  );
create policy marketplace_annonce_seller_read on public.marketplace_annonce
  for select to authenticated using (
    exists (select 1 from public.marketplace_vendeur v where v.id = vendeur_id and v.user_id = (select auth.uid()))
  );
create policy marketplace_annonce_seller_insert on public.marketplace_annonce
  for insert to authenticated with check (
    exists (select 1 from public.marketplace_vendeur v
      where v.id = vendeur_id and v.user_id = (select auth.uid()) and v.statut = 'actif')
  );
create policy marketplace_annonce_seller_update on public.marketplace_annonce
  for update to authenticated using (
    exists (select 1 from public.marketplace_vendeur v where v.id = vendeur_id and v.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.marketplace_vendeur v where v.id = vendeur_id and v.user_id = (select auth.uid()))
  );
create policy marketplace_annonce_seller_delete on public.marketplace_annonce
  for delete to authenticated using (
    exists (select 1 from public.marketplace_vendeur v where v.id = vendeur_id and v.user_id = (select auth.uid()))
  );

create policy marketplace_commande_parties_read on public.marketplace_commande
  for select to authenticated using (
    acheteur_user_id = (select auth.uid())
    or exists (select 1 from public.marketplace_vendeur v where v.id = vendeur_id and v.user_id = (select auth.uid()))
  );

grant select on public.abonnement_atelier, public.abonnement_paiement to authenticated;
grant select on public.marketplace_vendeur, public.marketplace_annonce to anon, authenticated;
grant insert on public.marketplace_vendeur to authenticated;
grant update (nom_entreprise, nom_contact, telephone, ville, categorie, description) on public.marketplace_vendeur to authenticated;
grant select, insert, update, delete on public.marketplace_annonce to authenticated;
grant select on public.marketplace_commande to authenticated;
grant execute on function public.creer_commande_marketplace(uuid, integer, text, text, text, text) to authenticated;
grant execute on function public.changer_statut_commande_marketplace(uuid, text) to authenticated;

revoke all on function public.initialiser_abonnement_atelier() from public, anon, authenticated;
revoke all on function public.creer_commande_marketplace(uuid, integer, text, text, text, text) from public, anon;
revoke all on function public.changer_statut_commande_marketplace(uuid, text) from public, anon;

-- Payment confirmations are intentionally not writable from the browser.
-- A trusted payment-provider webhook will be the only future writer.
revoke all on public.abonnement_paiement from anon, authenticated;
grant select on public.abonnement_paiement to authenticated;
revoke insert, update, delete on public.abonnement_atelier from anon, authenticated;
revoke insert, update, delete on public.marketplace_commande from anon, authenticated;
