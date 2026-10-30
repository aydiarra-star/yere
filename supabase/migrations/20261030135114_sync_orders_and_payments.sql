-- YÉRÉ — synchronisation des commandes et paiements
-- Les opérations critiques sont atomiques et les versements ne peuvent pas dépasser le prix.
alter table public.commande
  add column if not exists type_travail text not null default 'confection',
  add column if not exists etape_retouche text,
  add column if not exists mensuration_snapshot jsonb,
  add column if not exists mensuration_snapshot_date date;

alter table public.commande
  drop constraint if exists commande_type_travail_check,
  add constraint commande_type_travail_check
    check (type_travail in ('confection','retouche')),
  drop constraint if exists commande_etape_retouche_check,
  add constraint commande_etape_retouche_check
    check (etape_retouche is null or etape_retouche in ('a_examiner','en_retouches','a_essayer','correction_demandee','terminee')),
  drop constraint if exists commande_snapshot_pair_check,
  add constraint commande_snapshot_pair_check
    check ((mensuration_snapshot is null and mensuration_snapshot_date is null) or
           (mensuration_snapshot is not null and mensuration_snapshot_date is not null));

create index if not exists commande_atelier_date_idx
  on public.commande (atelier_id, date_commande desc);

create or replace function private.validate_payment_amount()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_price bigint;
  v_paid bigint;
begin
  if new.statut <> 'confirme' then return new; end if;
  select c.prix_fcfa into v_price
  from public.commande c
  where c.id = new.commande_id and c.atelier_id = new.atelier_id
  for update;
  if v_price is null then
    raise exception 'Commande introuvable dans cet atelier' using errcode = '23503';
  end if;
  select coalesce(sum(p.montant_fcfa), 0) into v_paid
  from public.paiement p
  where p.atelier_id = new.atelier_id and p.commande_id = new.commande_id and p.statut = 'confirme';
  if v_paid + new.montant_fcfa > v_price then
    raise exception 'Le versement dépasse le solde restant dû' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_payment_amount() from public, anon, authenticated;
drop trigger if exists paiement_validate_amount on public.paiement;
create trigger paiement_validate_amount
before insert on public.paiement
for each row execute function private.validate_payment_amount();

create or replace function public.create_commande_with_initial_payment(
  p_atelier_id uuid, p_reference text, p_client_id uuid, p_vetement text,
  p_date_commande date, p_date_livraison date, p_statut text, p_prix bigint,
  p_type_travail text, p_etape_retouche text, p_mensuration_snapshot jsonb,
  p_mensuration_snapshot_date date, p_acompte_initial bigint, p_payment_key text
)
returns table (commande_id uuid, reference text)
language plpgsql
security invoker
set search_path = ''
as $$
declare v_commande_id uuid;
begin
  if p_acompte_initial < 0 or p_acompte_initial > p_prix then
    raise exception 'Acompte initial invalide' using errcode = '23514';
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
$$;
revoke all on function public.create_commande_with_initial_payment(uuid,text,uuid,text,date,date,text,bigint,text,text,jsonb,date,bigint,text) from public, anon;
grant execute on function public.create_commande_with_initial_payment(uuid,text,uuid,text,date,date,text,bigint,text,text,jsonb,date,bigint,text) to authenticated;
