-- YÉRÉ marketplace + subscription integration checks.
-- Synthetic users only; this file is intended for the isolated CI database.
begin;

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('71000000-0000-4000-8000-000000000001','authenticated','authenticated','supplier-market@yere.test','',now(),'{}','{}',now(),now()),
 ('71000000-0000-4000-8000-000000000002','authenticated','authenticated','buyer-market@yere.test','',now(),'{}','{}',now(),now()),
 ('71000000-0000-4000-8000-000000000003','authenticated','authenticated','owner-sub@yere.test','',now(),'{}','{}',now(),now());

-- Independent supplier account: no atelier membership is required.
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.marketplace_vendeur(user_id,type_vendeur,atelier_id,nom_entreprise,nom_contact,telephone,ville,categorie)
values ('71000000-0000-4000-8000-000000000001','fournisseur',null,'Mercerie Test','Contact Test','770000000','Dakar','Tissus');
insert into public.marketplace_annonce(vendeur_id,titre,categorie,description,prix_fcfa,ville,mode_vente,statut,stock_disponible)
select id,'Wax test','Tissus','Annonce synthétique',2500,'Dakar','les_deux','publiee',10
from public.marketplace_vendeur where user_id='71000000-0000-4000-8000-000000000001';
reset role;

-- Public catalog can read published products; a separate authenticated buyer can place an order.
set local role anon;
do $$
begin
  if (select count(*) from public.marketplace_annonce where titre='Wax test') <> 1 then
    raise exception 'FAIL: published marketplace listing is not public';
  end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$
declare v_id uuid; v_total bigint; v_qty integer;
begin
  select public.creer_commande_marketplace(
    a.id, 2, 'Acheteur test', '771234567', 'Dakar', 'Commande test'
  ) into v_id
  from public.marketplace_annonce a where a.titre='Wax test';
  select total_fcfa into v_total from public.marketplace_commande where id=v_id;
  if v_total <> 5000 then raise exception 'FAIL: checkout did not use database listing price'; end if;
  select stock_disponible into v_qty from public.marketplace_annonce where titre='Wax test';
  if v_qty <> 8 then raise exception 'FAIL: stock was not decremented atomically'; end if;
  if (select count(*) from public.marketplace_commande where id=v_id) <> 1 then
    raise exception 'FAIL: buyer cannot read own marketplace order';
  end if;
end $$;
reset role;

-- A new atelier receives one two-month trial at the agreed 5,000 FCFA price.
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
insert into public.atelier(id,nom) values ('72000000-0000-4000-8000-000000000003','Atelier abonnement test');
do $$
declare v_price bigint; v_months integer; v_status text;
begin
  select montant_mensuel_fcfa, extract(month from age(fin_essai,debut_essai))::integer, statut
  into v_price,v_months,v_status
  from public.abonnement_atelier where atelier_id='72000000-0000-4000-8000-000000000003';
  if v_price <> 5000 or v_months <> 2 or v_status <> 'essai' then
    raise exception 'FAIL: workshop trial or price differs from approved model';
  end if;
end $$;
reset role;

rollback;
