alter table public.marketplace_commande
  add column if not exists date_livraison timestamptz;

create or replace function public.changer_statut_commande_marketplace(p_commande_id uuid, p_statut text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
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
  set statut = p_statut,
      updated_at = now(),
      date_livraison = case
        when p_statut = 'livree' then coalesce(date_livraison, now())
        else date_livraison
      end
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
$function$;
