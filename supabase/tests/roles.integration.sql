-- Integration checks against the isolated Supabase database created by CI.
-- All fixtures are synthetic and the transaction is rolled back.
begin;

-- Atelier profile writes are limited to editable fields; identity and currency stay server-controlled.
do $atelier_privilege_check$
begin
  if not has_column_privilege('authenticated', 'public.atelier', 'nom', 'UPDATE') then
    raise exception 'FAIL: authenticated owner/manager cannot update atelier name';
  end if;
  if has_column_privilege('authenticated', 'public.atelier', 'id', 'UPDATE')
     or has_column_privilege('authenticated', 'public.atelier', 'devise', 'UPDATE') then
    raise exception 'FAIL: authenticated users can update protected atelier identity/currency fields';
  end if;
  if not has_column_privilege('authenticated', 'public.atelier', 'id', 'INSERT')
     or has_column_privilege('authenticated', 'public.atelier', 'devise', 'INSERT') then
    raise exception 'FAIL: atelier insert privileges are broader or narrower than intended';
  end if;
end $atelier_privilege_check$;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('10000000-0000-4000-8000-000000000001','authenticated','authenticated','owner@yere.test','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000002','authenticated','authenticated','manager@yere.test','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000003','authenticated','authenticated','tailor@yere.test','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000004','authenticated','authenticated','owner2@yere.test','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000005','authenticated','authenticated','manager2@yere.test','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000006','authenticated','authenticated','tailor2@yere.test','',now(),'{}','{}',now(),now());

-- Atelier creation must run as the authenticated owner: its trigger creates the owner membership.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.atelier (id, nom) values ('20000000-0000-4000-8000-000000000001','Atelier CI');
reset role;

insert into public.atelier_membre (atelier_id,user_id,role,actif) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','gestionnaire',true),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','employe',true);

-- A second, fully separate workshop has its own owner, manager, tailor and records.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
insert into public.atelier (id, nom) values ('20000000-0000-4000-8000-000000000002','Atelier CI Deux');
reset role;

insert into public.atelier_membre (atelier_id,user_id,role,actif) values
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000005','gestionnaire',true),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000006','employe',true);
insert into public.client (id,atelier_id,nom) values
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Client test atelier deux');
insert into public.commande (id,atelier_id,client_id,reference,vetement,date_commande,statut,prix_fcfa,created_by)
values
 ('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','CI-002','Boubou test deux',current_date,'a_preparer',35000,'10000000-0000-4000-8000-000000000004');
insert into public.depense (id,atelier_id,categorie,description,montant_fcfa,created_by)
values ('50000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Test','Fixture CI atelier deux',1500,'10000000-0000-4000-8000-000000000004');
insert into public.paiement (atelier_id,commande_id,montant_fcfa,cle_idempotence,created_by)
values ('20000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002',7000,'ci-payment-0002','10000000-0000-4000-8000-000000000004');

insert into public.client (id,atelier_id,nom) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Client test');
insert into public.commande (id,atelier_id,client_id,reference,vetement,date_commande,statut,prix_fcfa,created_by)
values
 ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','CI-001','Boubou test',current_date,'a_preparer',25000,'10000000-0000-4000-8000-000000000001');
insert into public.depense (id,atelier_id,categorie,description,montant_fcfa,created_by)
values ('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Test','Fixture CI',1000,'10000000-0000-4000-8000-000000000001');
insert into public.paiement (atelier_id,commande_id,montant_fcfa,cle_idempotence,created_by)
values ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',5000,'ci-payment-0001','10000000-0000-4000-8000-000000000001');

-- Managers can create and assign work, but cannot access finance or edit tailor profiles.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $manager$
declare v_count bigint;
begin
  -- Test effective row visibility, not raw table grants: RLS may intentionally
  -- allow SELECT while returning no financial rows to non-owners.
  select count(*) into v_count from public.paiement;
  if v_count <> 0 then raise exception 'FAIL: manager can read payment rows'; end if;
  select count(*) into v_count from public.depense;
  if v_count <> 0 then raise exception 'FAIL: manager can read expense rows'; end if;
  select count(*) into v_count from public.client where atelier_id='20000000-0000-4000-8000-000000000002';
  if v_count <> 0 then raise exception 'FAIL: manager of workshop one can read workshop two clients'; end if;
  begin
    insert into public.client (atelier_id,nom) values ('20000000-0000-4000-8000-000000000002','Cross-tenant forbidden');
    raise exception 'FAIL: manager inserted a client into another workshop';
  exception when insufficient_privilege then
    null;
  end;
  begin
    select count(prix_fcfa) into v_count from public.commande;
    if v_count <> 0 then raise exception 'FAIL: manager can read order prices'; end if;
  exception when insufficient_privilege then
    null;
  end;
end $manager$;
insert into public.commande_tache (id,atelier_id,commande_id,titre,assigne_a,created_by)
values ('60000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Assemblage','10000000-0000-4000-8000-000000000003',auth.uid());
do $$
begin
  begin
    perform public.update_atelier_member_profile(
      '20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003',
      'Profil interdit',array['Couture'], 'experimente','test'
    );
    raise exception 'FAIL: manager unexpectedly edited tailor profile';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.get_atelier_order_financials('20000000-0000-4000-8000-000000000001');
    raise exception 'FAIL: manager unexpectedly read financial RPC';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

-- Assigned tailor can read the workgroup and update own task progress, not the order or finances.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$
begin
  if (select count(*) from public.atelier_membre where atelier_id='20000000-0000-4000-8000-000000000001') <> 3 then
    raise exception 'FAIL: tailor cannot read complete atelier workgroup';
  end if;
  if (select count(*) from public.commande_tache where id='60000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'FAIL: assigned tailor cannot read assigned task';
  end if;
  -- Verify effective RLS visibility rather than catalog grants.
  if (select count(*) from public.paiement) <> 0 then
    raise exception 'FAIL: tailor can read payment rows';
  end if;
  if (select count(*) from public.depense) <> 0 then
    raise exception 'FAIL: tailor can read expense rows';
  end if;
  if (select count(*) from public.client where atelier_id='20000000-0000-4000-8000-000000000002') <> 0 then
    raise exception 'FAIL: tailor of workshop one can read workshop two clients';
  end if;
  begin
    if (select count(prix_fcfa) from public.commande) <> 0 then
      raise exception 'FAIL: tailor can read order prices';
    end if;
  exception when insufficient_privilege then
    null;
  end;
end $$;
update public.commande_tache set statut='en_cours', note_avancement='Début du travail'
where id='60000000-0000-4000-8000-000000000001';
do $$
begin
  begin
    update public.commande set statut='livre'
    where id='40000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: tailor unexpectedly changed global order status';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;
update public.commande_tache set statut='terminee', note_avancement='Travail terminé'
where id='60000000-0000-4000-8000-000000000001';
reset role;

-- The second workshop's manager and tailor are subject to the same restrictions.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
do $manager_two$
begin
  if (select count(*) from public.client where atelier_id='20000000-0000-4000-8000-000000000002') <> 1 then
    raise exception 'FAIL: workshop two manager cannot read own workshop clients';
  end if;
  if (select count(*) from public.client where atelier_id='20000000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'FAIL: workshop two manager can read workshop one clients';
  end if;
  if (select count(*) from public.paiement) <> 0 then
    raise exception 'FAIL: workshop two manager can read payments';
  end if;
  if (select count(*) from public.depense) <> 0 then
    raise exception 'FAIL: workshop two manager can read expenses';
  end if;
end $manager_two$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000006',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
do $tailor_two$
begin
  if (select count(*) from public.client where atelier_id='20000000-0000-4000-8000-000000000002') <> 1 then
    raise exception 'FAIL: workshop two tailor cannot read own workshop clients';
  end if;
  if (select count(*) from public.client where atelier_id='20000000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'FAIL: workshop two tailor can read workshop one clients';
  end if;
  if (select count(*) from public.paiement) <> 0 then
    raise exception 'FAIL: workshop two tailor can read payments';
  end if;
  if (select count(*) from public.depense) <> 0 then
    raise exception 'FAIL: workshop two tailor can read expenses';
  end if;
end $tailor_two$;
reset role;

-- Owner alone can read financial details and manage tailor profiles.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$
declare v_finance jsonb;
begin
  v_finance := public.get_atelier_order_financials('20000000-0000-4000-8000-000000000001');
  if jsonb_array_length(v_finance) <> 1
     or (v_finance->0->>'prix_fcfa')::bigint <> 25000 then
    raise exception 'FAIL: owner financial RPC did not return expected order financials';
  end if;
  if (select count(*) from public.client where atelier_id='20000000-0000-4000-8000-000000000002') <> 0 then
    raise exception 'FAIL: owner of workshop one can read workshop two clients';
  end if;
  if (select count(*) from public.commande_tache_historique where tache_id='60000000-0000-4000-8000-000000000001') < 3 then
    raise exception 'FAIL: task history did not record creation, status and note changes';
  end if;
end $$;
select public.update_atelier_member_profile(
 '20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003',
 'Tailleur CI',array['Couture','Broderie'], 'experimente','Profil de test'
);
reset role;

-- The second owner can read only the second workshop's financials.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
do $owner_two$
declare v_finance jsonb;
begin
  v_finance := public.get_atelier_order_financials('20000000-0000-4000-8000-000000000002');
  if (select count(*) from public.client where atelier_id='20000000-0000-4000-8000-000000000002') <> 1 then
    raise exception 'FAIL: owner of workshop two cannot read own workshop clients';
  end if;
  if jsonb_array_length(v_finance) <> 1
     or (v_finance->0->>'prix_fcfa')::bigint <> 35000 then
    raise exception 'FAIL: second owner cannot read own workshop financials';
  end if;
  if (select count(*) from public.client where atelier_id='20000000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'FAIL: owner of workshop two can read workshop one clients';
  end if;
end $owner_two$;
reset role;

rollback;
