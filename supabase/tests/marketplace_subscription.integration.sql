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
do $$
declare v_seller_id uuid;
begin
  insert into public.marketplace_vendeur(user_id,type_vendeur,atelier_id,nom_entreprise,nom_contact,telephone,ville,categorie)
  values ('71000000-0000-4000-8000-000000000001','fournisseur',null,'Mercerie Test','Contact Test','770000000','Dakar','Tissus')
  returning id into v_seller_id;
  insert into public.marketplace_annonce(vendeur_id,titre,categorie,description,prix_fcfa,ville,mode_vente,statut,stock_disponible)
  values (v_seller_id,'Wax test','Tissus','Annonce synthétique',2500,'Dakar','les_deux','publiee',10);
  if not exists (
    select 1 from public.get_my_marketplace_seller_contact()
    where nom_contact='Contact Test' and telephone='770000000'
  ) then
    raise exception 'FAIL: seller cannot read their own contact through the secure RPC';
  end if;
end $$;
reset role;

-- Public catalog can read published products; a separate authenticated buyer can place an order.
set local role anon;
do $$
begin
  if (select count(*) from public.marketplace_annonce where titre='Wax test') <> 1 then
    raise exception 'FAIL: published marketplace listing is not public';
  end if;
  begin
    execute 'select telephone from public.marketplace_vendeur limit 1';
    raise exception 'FAIL: anonymous role can read seller telephone';
  exception when insufficient_privilege then
    null;
  end;
  begin
    execute 'select nom_contact from public.marketplace_vendeur limit 1';
    raise exception 'FAIL: anonymous role can read seller contact name';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$
begin
  if (select count(*) from public.get_my_marketplace_seller_contact()) <> 0 then
    raise exception 'FAIL: buyer can read another seller contact';
  end if;
  begin
    execute 'select telephone from public.marketplace_vendeur limit 1';
    raise exception 'FAIL: authenticated buyer can read seller telephone';
  exception when insufficient_privilege then
    null;
  end;
  begin
    execute 'select nom_contact from public.marketplace_vendeur limit 1';
    raise exception 'FAIL: authenticated buyer can read seller contact name';
  exception when insufficient_privilege then
    null;
  end;
  begin
    execute 'select user_id from public.marketplace_vendeur limit 1';
    raise exception 'FAIL: authenticated buyer can read seller account identifier';
  exception when insufficient_privilege then
    null;
  end;
end $$;
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

-- Private marketplace photo storage: bucket remains private and has owner-scoped policies.
do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'yere-market-photos' and public = false
      and file_size_limit = 5242880
      and allowed_mime_types = array['image/jpeg','image/png','image/webp']::text[]
  ) then
    raise exception 'FAIL: marketplace photo bucket is missing or not private/restricted';
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='yere_market_photos_insert_own')
     or not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='yere_market_photos_read_own')
     or not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='yere_market_photos_delete_own')
     or not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='yere_market_photos_read_published') then
    raise exception 'FAIL: marketplace photo ownership policies are incomplete';
  end if;
end $$;

-- In-app messaging: only the buyer and seller can read or send messages.
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$
declare v_conversation uuid;
begin
  select id into v_conversation from public.marketplace_conversation
  where annonce_id = (select id from public.marketplace_annonce where titre='Wax test')
    and acheteur_user_id='71000000-0000-4000-8000-000000000002';
  if v_conversation is not null then raise exception 'FAIL: conversation should not exist before first contact'; end if;
  select public.ouvrir_conversation_marketplace(
    (select id from public.marketplace_annonce where titre='Wax test'),
    'Bonjour, cet article est-il disponible ?'
  ) into v_conversation;
  if (select count(*) from public.marketplace_message where conversation_id=v_conversation) <> 1 then
    raise exception 'FAIL: initial message was not stored';
  end if;
  if public.envoyer_message_marketplace(v_conversation,'Merci pour votre réponse.') is not true then
    raise exception 'FAIL: buyer could not send a follow-up';
  end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$
declare v_conversation uuid;
begin
  select id into v_conversation from public.marketplace_conversation
  where annonce_id = (select id from public.marketplace_annonce where titre='Wax test')
    and acheteur_user_id='71000000-0000-4000-8000-000000000002';
  if v_conversation is null or (select count(*) from public.marketplace_message where conversation_id=v_conversation) <> 2 then
    raise exception 'FAIL: seller cannot read buyer conversation history';
  end if;
  if public.envoyer_message_marketplace(v_conversation,'Bonjour, oui, cet article est disponible.') is not true then
    raise exception 'FAIL: seller could not reply';
  end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$
begin
  if (select count(*) from public.marketplace_conversation) <> 0 then
    raise exception 'FAIL: unrelated account can read marketplace conversations';
  end if;
  if (select count(*) from public.marketplace_message) <> 0 then
    raise exception 'FAIL: unrelated account can read marketplace messages';
  end if;
end $$;
reset role;

rollback;
