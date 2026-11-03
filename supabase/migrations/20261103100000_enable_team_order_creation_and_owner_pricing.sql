-- Allow every active atelier member to create a work order without exposing finance.
-- The owner alone can later set the price and record an initial deposit.
create or replace function private.set_commande_financial_terms(
  p_atelier_id uuid,
  p_commande_id uuid,
  p_prix bigint,
  p_acompte_initial bigint,
  p_date_paiement timestamptz,
  p_payment_key text
)
returns table(commande_id uuid)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_price bigint;
  v_paid bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if p_atelier_id is null
     or not private.has_atelier_role(p_atelier_id, array['proprietaire']::text[]) then
    raise exception 'Seul le propriétaire peut définir les conditions financières' using errcode = '42501';
  end if;
  if p_prix is null or p_prix <= 0
     or p_acompte_initial is null or p_acompte_initial < 0
     or p_acompte_initial > p_prix then
    raise exception 'Prix ou acompte invalide' using errcode = '23514';
  end if;

  select c.prix_fcfa into v_price
  from public.commande c
  where c.id = p_commande_id and c.atelier_id = p_atelier_id
  for update;
  if not found then
    raise exception 'Commande introuvable dans cet atelier' using errcode = '23503';
  end if;
  if v_price <> 0 then
    raise exception 'Les conditions financières de cette commande sont déjà définies' using errcode = '23514';
  end if;
  select coalesce(sum(p.montant_fcfa), 0) into v_paid
  from public.paiement p
  where p.atelier_id = p_atelier_id and p.commande_id = p_commande_id and p.statut = 'confirme';
  if v_paid <> 0 then
    raise exception 'Un versement existe déjà pour cette commande' using errcode = '23514';
  end if;

  update public.commande
  set prix_fcfa = p_prix
  where id = p_commande_id and atelier_id = p_atelier_id;

  if p_acompte_initial > 0 then
    if p_payment_key is null or length(btrim(p_payment_key)) < 8 or length(btrim(p_payment_key)) > 200 then
      raise exception 'Clé de paiement invalide' using errcode = '23514';
    end if;
    insert into public.paiement (
      atelier_id, commande_id, montant_fcfa, date_paiement, statut, cle_idempotence, note
    ) values (
      p_atelier_id, p_commande_id, p_acompte_initial,
      coalesce(p_date_paiement, now()), 'confirme', p_payment_key, 'Acompte initial'
    );
  end if;
  return query select p_commande_id;
end;
$function$;

revoke all on function private.set_commande_financial_terms(uuid, uuid, bigint, bigint, timestamptz, text) from public, anon;
grant execute on function private.set_commande_financial_terms(uuid, uuid, bigint, bigint, timestamptz, text) to authenticated;

create or replace function public.set_commande_financial_terms(
  p_atelier_id uuid,
  p_commande_id uuid,
  p_prix bigint,
  p_acompte_initial bigint,
  p_date_paiement timestamptz,
  p_payment_key text
)
returns table(commande_id uuid)
language sql
security invoker
set search_path = ''
as $function$
  select * from private.set_commande_financial_terms(
    p_atelier_id, p_commande_id, p_prix, p_acompte_initial, p_date_paiement, p_payment_key
  );
$function$;

revoke all on function public.set_commande_financial_terms(uuid, uuid, bigint, bigint, timestamptz, text) from public, anon;
grant execute on function public.set_commande_financial_terms(uuid, uuid, bigint, bigint, timestamptz, text) to authenticated;

notify pgrst, 'reload schema';
