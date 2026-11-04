create or replace function public.refund_paytech_subscription_payment(
  p_reference text, p_amount bigint, p_environment text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_payment public.abonnement_paiement%rowtype;
  v_subscription public.abonnement_atelier%rowtype;
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  if p_reference is null or length(trim(p_reference)) = 0 or p_amount <> 5000 then
    raise exception 'Remboursement invalide' using errcode = '22023';
  end if;
  select * into v_payment from public.abonnement_paiement
  where reference_interne = p_reference for update;
  if not found then raise exception 'Référence de paiement inconnue' using errcode = 'P0002'; end if;
  if v_payment.montant_fcfa <> p_amount or v_payment.devise <> 'XOF' then
    raise exception 'Montant ou devise non conforme' using errcode = '22023';
  end if;
  if v_payment.statut = 'rembourse' then return true; end if;
  if v_payment.statut <> 'confirme' then
    raise exception 'Paiement non remboursable dans son état actuel' using errcode = '22023';
  end if;
  select * into v_subscription from public.abonnement_atelier
  where id = v_payment.abonnement_id for update;
  if not found then raise exception 'Abonnement introuvable' using errcode = 'P0002'; end if;

  update public.abonnement_paiement
  set statut = 'rembourse',
      details = details || jsonb_build_object(
        'provider', 'paytech',
        'environment', coalesce(nullif(p_environment, ''), 'unknown'),
        'refund_event', 'refund_complete',
        'refunded_at', now()
      )
  where id = v_payment.id;

  select min(periode_couverte_debut), max(periode_couverte_fin)
  into v_period_start, v_period_end
  from public.abonnement_paiement
  where abonnement_id = v_payment.abonnement_id
    and statut = 'confirme'
    and periode_couverte_debut is not null
    and periode_couverte_fin > now();

  if v_period_end is not null then
    update public.abonnement_atelier set statut = 'actif',
      periode_debut = v_period_start, periode_fin = v_period_end,
      prochaine_echeance = v_period_end, updated_at = now()
    where id = v_subscription.id;
  elsif v_subscription.fin_essai > now() then
    update public.abonnement_atelier set statut = 'essai',
      periode_debut = null, periode_fin = null,
      prochaine_echeance = v_subscription.fin_essai, updated_at = now()
    where id = v_subscription.id;
  else
    update public.abonnement_atelier set statut = 'paiement_requis',
      periode_debut = null, periode_fin = null,
      prochaine_echeance = now(), updated_at = now()
    where id = v_subscription.id;
  end if;
  return true;
end;
$function$;

revoke all on function public.refund_paytech_subscription_payment(text, bigint, text) from public, anon, authenticated;
grant execute on function public.refund_paytech_subscription_payment(text, bigint, text) to service_role;