-- YÉRÉ: atomically confirm a PayTech subscription payment.
-- Callable only by the Supabase service role from the verified IPN Edge Function.
create or replace function public.confirm_paytech_subscription_payment(
  p_reference text,
  p_provider_reference text,
  p_payment_method text,
  p_amount bigint,
  p_environment text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.abonnement_paiement%rowtype;
  v_subscription public.abonnement_atelier%rowtype;
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  if p_amount <> 5000 then
    raise exception 'Montant de paiement invalide' using errcode = '22023';
  end if;

  select * into v_payment
  from public.abonnement_paiement
  where reference_interne = p_reference
  for update;

  if not found then
    raise exception 'Référence de paiement inconnue' using errcode = 'P0002';
  end if;

  if v_payment.statut = 'confirme' then
    return true;
  end if;

  if v_payment.statut <> 'en_attente' or v_payment.montant_fcfa <> p_amount or v_payment.devise <> 'XOF' then
    raise exception 'Paiement non confirmable' using errcode = '22023';
  end if;

  select * into v_subscription
  from public.abonnement_atelier
  where id = v_payment.abonnement_id
  for update;

  if not found then
    raise exception 'Abonnement introuvable' using errcode = 'P0002';
  end if;

  v_period_start := greatest(now(), coalesce(v_subscription.periode_fin, v_subscription.fin_essai), v_subscription.fin_essai);
  v_period_end := v_period_start + interval '1 month';

  update public.abonnement_paiement
  set statut = 'confirme',
      moyen_paiement = case
        when p_payment_method in ('wave','orange_money','carte') then p_payment_method
        else 'autre'
      end,
      reference_fournisseur = nullif(p_provider_reference, ''),
      paye_le = now(),
      periode_couverte_debut = v_period_start,
      periode_couverte_fin = v_period_end,
      details = details || jsonb_build_object('provider', 'paytech', 'environment', p_environment)
  where id = v_payment.id;

  update public.abonnement_atelier
  set statut = 'actif',
      periode_debut = v_period_start,
      periode_fin = v_period_end,
      prochaine_echeance = v_period_end,
      fournisseur_paiement = 'paytech',
      updated_at = now()
  where id = v_subscription.id;

  return true;
end;
$$;

revoke all on function public.confirm_paytech_subscription_payment(text, text, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.confirm_paytech_subscription_payment(text, text, text, bigint, text)
  to service_role;
