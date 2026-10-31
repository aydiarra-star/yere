-- Keep the PostgREST RPC as SECURITY INVOKER. Move only the narrowly
-- validated writes into a non-exposed private SECURITY DEFINER function.
create or replace function private.create_commande_with_initial_payment(
  p_atelier_id uuid,
  p_reference text,
  p_client_id uuid,
  p_vetement text,
  p_date_commande date,
  p_date_livraison date,
  p_statut text,
  p_prix bigint,
  p_type_travail text,
  p_etape_retouche text,
  p_mensuration_snapshot jsonb,
  p_mensuration_snapshot_date date,
  p_acompte_initial bigint,
  p_payment_key text
)
returns table(commande_id uuid, reference text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_commande_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  if p_atelier_id is null
     or not private.has_atelier_role(
       p_atelier_id,
       array['proprietaire', 'gestionnaire', 'employe']::text[]
     ) then
    raise exception 'Accès refusé à cet atelier' using errcode = '42501';
  end if;

  if p_prix is null or p_prix < 0
     or p_acompte_initial is null
     or p_acompte_initial < 0
     or p_acompte_initial > p_prix then
    raise exception 'Montant de commande ou acompte invalide' using errcode = '23514';
  end if;

  if p_client_id is null or not exists (
    select 1 from public.client c
    where c.id = p_client_id and c.atelier_id = p_atelier_id
  ) then
    raise exception 'Client introuvable dans cet atelier' using errcode = '23503';
  end if;

  if p_acompte_initial > 0 then
    if not private.has_atelier_role(
      p_atelier_id, array['proprietaire', 'gestionnaire']::text[]
    ) then
      raise exception 'Seul le propriétaire ou le gestionnaire peut enregistrer un acompte initial'
        using errcode = '42501';
    end if;
    if p_payment_key is null
       or length(btrim(p_payment_key)) < 8
       or length(btrim(p_payment_key)) > 200 then
      raise exception 'La clé de paiement doit contenir entre 8 et 200 caractères'
        using errcode = '23514';
    end if;
  end if;

  insert into public.commande (
    atelier_id, client_id, reference, vetement, date_commande, date_livraison,
    statut, prix_fcfa, type_travail, etape_retouche, mensuration_snapshot,
    mensuration_snapshot_date
  ) values (
    p_atelier_id, p_client_id, p_reference, p_vetement, p_date_commande,
    p_date_livraison, p_statut, p_prix, p_type_travail, p_etape_retouche,
    p_mensuration_snapshot, p_mensuration_snapshot_date
  ) returning id into v_commande_id;

  if p_acompte_initial > 0 then
    insert into public.paiement (
      atelier_id, commande_id, montant_fcfa, date_paiement, statut,
      cle_idempotence, note
    ) values (
      p_atelier_id, v_commande_id, p_acompte_initial,
      p_date_commande::timestamptz, 'confirme', p_payment_key,
      'Acompte initial'
    );
  end if;

  return query select v_commande_id, p_reference;
end;
$function$;

revoke all on function private.create_commande_with_initial_payment(
  uuid, text, uuid, text, date, date, text, bigint, text, text, jsonb, date, bigint, text
) from public, anon;
grant execute on function private.create_commande_with_initial_payment(
  uuid, text, uuid, text, date, date, text, bigint, text, text, jsonb, date, bigint, text
) to authenticated;

-- Public API entry point: invoker rights only, forwarding to the guarded worker.
create or replace function public.create_commande_with_initial_payment(
  p_atelier_id uuid,
  p_reference text,
  p_client_id uuid,
  p_vetement text,
  p_date_commande date,
  p_date_livraison date,
  p_statut text,
  p_prix bigint,
  p_type_travail text,
  p_etape_retouche text,
  p_mensuration_snapshot jsonb,
  p_mensuration_snapshot_date date,
  p_acompte_initial bigint,
  p_payment_key text
)
returns table(commande_id uuid, reference text)
language sql
security invoker
set search_path = ''
as $function$
  select * from private.create_commande_with_initial_payment(
    p_atelier_id, p_reference, p_client_id, p_vetement, p_date_commande,
    p_date_livraison, p_statut, p_prix, p_type_travail, p_etape_retouche,
    p_mensuration_snapshot, p_mensuration_snapshot_date, p_acompte_initial,
    p_payment_key
  );
$function$;

revoke all on function public.create_commande_with_initial_payment(
  uuid, text, uuid, text, date, date, text, bigint, text, text, jsonb, date, bigint, text
) from public, anon;
grant execute on function public.create_commande_with_initial_payment(
  uuid, text, uuid, text, date, date, text, bigint, text, text, jsonb, date, bigint, text
) to authenticated;

notify pgrst, 'reload schema';
