-- Keep employee order updates operational and prevent employees from recording deposits.
-- Employees may create orders with no initial payment; financial roles record payments separately.

create or replace function private.guard_employee_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.has_atelier_role(old.atelier_id, array['proprietaire', 'gestionnaire']) then
    return new;
  end if;

  if not private.has_atelier_role(old.atelier_id, array['employe']) then
    raise exception 'Accès refusé pour modifier cette commande'
      using errcode = '42501';
  end if;

  if row(
    new.atelier_id,
    new.client_id,
    new.reference,
    new.vetement,
    new.date_commande,
    new.prix_fcfa,
    new.created_by,
    new.created_at,
    new.type_travail,
    new.mensuration_snapshot,
    new.mensuration_snapshot_date
  ) is distinct from row(
    old.atelier_id,
    old.client_id,
    old.reference,
    old.vetement,
    old.date_commande,
    old.prix_fcfa,
    old.created_by,
    old.created_at,
    old.type_travail,
    old.mensuration_snapshot,
    old.mensuration_snapshot_date
  ) then
    raise exception 'Un employé peut uniquement modifier le statut, la date de livraison et l’étape de retouche'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists commande_employee_update_guard on public.commande;
create trigger commande_employee_update_guard
before update on public.commande
for each row
execute function private.guard_employee_order_update();

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
language plpgsql
set search_path to ''
as $function$
declare
  v_commande_id uuid;
begin
  if p_acompte_initial is null or p_acompte_initial < 0 or p_acompte_initial > p_prix then
    raise exception 'Acompte initial invalide' using errcode = '23514';
  end if;

  if p_acompte_initial > 0
     and not private.has_atelier_role(p_atelier_id, array['proprietaire', 'gestionnaire']) then
    raise exception 'Seul le propriétaire ou le gestionnaire peut enregistrer un acompte initial'
      using errcode = '42501';
  end if;

  insert into public.commande (
    atelier_id, client_id, reference, vetement, date_commande, date_livraison,
    statut, prix_fcfa, type_travail, etape_retouche, mensuration_snapshot, mensuration_snapshot_date
  ) values (
    p_atelier_id, p_client_id, p_reference, p_vetement, p_date_commande, p_date_livraison,
    p_statut, p_prix, p_type_travail, p_etape_retouche, p_mensuration_snapshot, p_mensuration_snapshot_date
  ) returning id into v_commande_id;

  if p_acompte_initial > 0 then
    insert into public.paiement (
      atelier_id, commande_id, montant_fcfa, date_paiement, statut, cle_idempotence, note
    ) values (
      p_atelier_id, v_commande_id, p_acompte_initial, p_date_commande::timestamptz,
      'confirme', p_payment_key, 'Acompte initial'
    );
  end if;

  return query select v_commande_id, p_reference;
end;
$function$;
