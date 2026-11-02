-- Harden Marketplace RPC authorization without changing the public API.
-- SECURITY DEFINER is retained because these RPCs perform controlled writes
-- across RLS-protected tables; every entry point validates auth.uid().

create or replace function public.creer_commande_marketplace(
  p_annonce_id uuid,
  p_quantite integer,
  p_nom_acheteur text,
  p_telephone_acheteur text,
  p_ville_livraison text,
  p_note_acheteur text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_annonce public.marketplace_annonce%rowtype;
  v_vendeur public.marketplace_vendeur%rowtype;
  v_reference text;
  v_commande uuid;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;
  if p_quantite is null or p_quantite < 1 or p_quantite > 100000 then
    raise exception 'Quantité invalide' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_nom_acheteur,''))) not between 2 and 160
     or length(trim(coalesce(p_telephone_acheteur,''))) not between 6 and 40 then
    raise exception 'Coordonnées acheteur invalides' using errcode = '22023';
  end if;

  select a.* into v_annonce
  from public.marketplace_annonce a
  where a.id = p_annonce_id and a.statut = 'publiee'
  for update;
  if not found then
    raise exception 'Annonce indisponible' using errcode = 'P0002';
  end if;

  select v.* into v_vendeur
  from public.marketplace_vendeur v
  where v.id = v_annonce.vendeur_id
  for share;
  if not found or v_vendeur.statut <> 'actif' then
    raise exception 'Vendeur indisponible' using errcode = '22023';
  end if;
  if v_vendeur.user_id = v_user then
    raise exception 'Vous ne pouvez pas commander votre propre annonce' using errcode = '42501';
  end if;
  if v_annonce.mode_vente not in ('commande_yere','les_deux') then
    raise exception 'Cette annonce accepte uniquement le contact direct' using errcode = '22023';
  end if;
  if v_annonce.stock_disponible is not null and v_annonce.stock_disponible < p_quantite then
    raise exception 'Stock insuffisant' using errcode = '22023';
  end if;

  v_reference := 'YM-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.marketplace_commande(
    reference, annonce_id, vendeur_id, acheteur_user_id, quantite, prix_unitaire_fcfa,
    total_fcfa, nom_acheteur, telephone_acheteur, ville_livraison, note_acheteur, paiement_statut
  )
  values (
    v_reference, v_annonce.id, v_annonce.vendeur_id, v_user, p_quantite, v_annonce.prix_fcfa,
    v_annonce.prix_fcfa * p_quantite, trim(p_nom_acheteur), trim(p_telephone_acheteur),
    coalesce(trim(p_ville_livraison),''), coalesce(trim(p_note_acheteur),''), 'a_payer'
  )
  returning id into v_commande;

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
  v_is_active_seller boolean;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;
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
    where v.id = v_commande.vendeur_id
      and v.user_id = v_user
      and v.statut = 'actif'
  ) into v_is_active_seller;

  if v_is_active_seller then
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

  if p_statut = 'annulee'
     and v_commande.statut <> 'annulee'
     and v_commande.paiement_statut in ('non_paye','a_payer','echec') then
    update public.marketplace_annonce
    set stock_disponible = stock_disponible + v_commande.quantite
    where id = v_commande.annonce_id and stock_disponible is not null;
  end if;
  return true;
end;
$$;

-- Keep RPCs available to signed-in users only; never expose them to guests.
revoke all on function public.creer_commande_marketplace(uuid, integer, text, text, text, text) from public, anon;
grant execute on function public.creer_commande_marketplace(uuid, integer, text, text, text, text) to authenticated;
revoke all on function public.changer_statut_commande_marketplace(uuid, text) from public, anon;
grant execute on function public.changer_statut_commande_marketplace(uuid, text) to authenticated;
