-- Integration checks against the isolated Supabase database created by CI.
-- All fixtures are synthetic and the transaction is rolled back.
begin;

-- Atelier profile writes are limited to editable fields; identity and currency stay server-controlled.
do $atelier_privilege_check$
begin
  if not has_column_privilege('authenticated', 'public.atelier', 'nom', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.atelier', 'telephone', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.atelier', 'ville', 'UPDATE') then
    raise exception 'FAIL: authenticated owner/manager cannot update editable atelier profile fields';
  end if;
  if has_column_privilege('authenticated', 'public.atelier', 'id', 'UPDATE')
     or has_column_privilege('authenticated', 'public.atelier', 'devise', 'UPDATE') then
    raise exception 'FAIL: authenticated users can update protected atelier identity/currency fields';
  end if;
  if not has_column_privilege('authenticated', 'public.atelier', 'id', 'INSERT')
     or not has_column_privilege('authenticated', 'public.atelier', 'nom', 'INSERT')
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
do $manager_order_finance$
declare v_count bigint;
begin
  begin
    perform * from public.create_commande_with_initial_payment(
      '20000000-0000-4000-8000-000000000001','CI-MANAGER-PRICE',
      '30000000-0000-4000-8000-000000000001','Boubou test',current_date,null,
      'a_preparer',15000,'confection',null,null,null,0,null
    );
    raise exception 'FAIL: manager created an order with a non-zero price';
  exception when insufficient_privilege then
    null;
  end;

  perform * from public.create_commande_with_initial_payment(
    '20000000-0000-4000-8000-000000000001','CI-MANAGER-ZERO',
    '30000000-0000-4000-8000-000000000001','Boubou test',current_date,null,
    'a_preparer',0,'confection',null,null,null,0,null
  );
  select count(*) into v_count from public.commande
  where atelier_id='20000000-0000-4000-8000-000000000001'
    and reference='CI-MANAGER-ZERO';
  if v_count <> 1 then
    raise exception 'FAIL: manager cannot create a work order without financial terms';
  end if;

  begin
    perform * from public.set_commande_financial_terms(
      '20000000-0000-4000-8000-000000000001',
      (select id from public.commande where reference='CI-MANAGER-ZERO'),
      17000,0,now(),null
    );
    raise exception 'FAIL: manager set financial terms on an order';
  exception when insufficient_privilege then
    null;
  end;

  -- Direct table writes must remain owner-only, not merely hidden from SELECT.
  begin
    insert into public.paiement (atelier_id,commande_id,montant_fcfa,cle_idempotence,created_by)
    values ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',1000,'ci-manager-direct-payment',auth.uid());
    raise exception 'FAIL: manager inserted a direct payment';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.depense (atelier_id,categorie,description,montant_fcfa,created_by)
    values ('20000000-0000-4000-8000-000000000001','Test','Dépense directe interdite gestionnaire',1000,auth.uid());
    raise exception 'FAIL: manager inserted a direct expense';
  exception when insufficient_privilege then
    null;
  end;
end $manager_order_finance$;

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
insert into public.commande_tache (id,atelier_id,commande_id,titre,assigne_a,created_by)
values ('60000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Préparation générale',null,auth.uid());
do $manager_task_scope$
begin
  if (select count(*) from public.commande_tache where atelier_id='20000000-0000-4000-8000-000000000001') <> 2 then
    raise exception 'FAIL: manager cannot read all workshop tasks';
  end if;
end $manager_task_scope$;
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
do $tailor_order_finance$
declare v_count bigint;
begin
  begin
    perform * from public.create_commande_with_initial_payment(
      '20000000-0000-4000-8000-000000000001','CI-TAILOR-PRICE',
      '30000000-0000-4000-8000-000000000001','Chemise test',current_date,null,
      'a_preparer',12000,'confection',null,null,null,0,null
    );
    raise exception 'FAIL: tailor created an order with a non-zero price';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform * from public.create_commande_with_initial_payment(
      '20000000-0000-4000-8000-000000000001','CI-TAILOR-DEPOSIT',
      '30000000-0000-4000-8000-000000000001','Chemise test',current_date,null,
      'a_preparer',12000,'confection',null,null,null,1000,'ci-tailor-payment'
    );
    raise exception 'FAIL: tailor recorded an initial deposit';
  exception when insufficient_privilege then
    null;
  end;

  perform * from public.create_commande_with_initial_payment(
    '20000000-0000-4000-8000-000000000001','CI-TAILOR-ZERO',
    '30000000-0000-4000-8000-000000000001','Chemise test',current_date,null,
    'a_preparer',0,'confection',null,null,null,0,null
  );
  select count(*) into v_count from public.commande
  where atelier_id='20000000-0000-4000-8000-000000000001'
    and reference='CI-TAILOR-ZERO';
  if v_count <> 1 then
    raise exception 'FAIL: tailor cannot create a work order without financial terms';
  end if;

  -- Direct payment and expense inserts are forbidden for employees as well.
  begin
    insert into public.paiement (atelier_id,commande_id,montant_fcfa,cle_idempotence,created_by)
    values ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',1000,'ci-tailor-direct-payment',auth.uid());
    raise exception 'FAIL: tailor inserted a direct payment';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.depense (atelier_id,categorie,description,montant_fcfa,created_by)
    values ('20000000-0000-4000-8000-000000000001','Test','Dépense directe interdite employé',1000,auth.uid());
    raise exception 'FAIL: tailor inserted a direct expense';
  exception when insufficient_privilege then
    null;
  end;
end $tailor_order_finance$;

do $$
begin
  if (select count(*) from public.atelier_membre where atelier_id='20000000-0000-4000-8000-000000000001') <> 3 then
    raise exception 'FAIL: tailor cannot read complete atelier workgroup';
  end if;
  if (select count(*) from public.commande_tache where id='60000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'FAIL: assigned tailor cannot read assigned task';
  end if;
  if (select count(*) from public.commande_tache where atelier_id='20000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'FAIL: tailor can read tasks not assigned to them';
  end if;
  if (select count(*) from public.commande_tache_historique where tache_id='60000000-0000-4000-8000-000000000002') <> 0 then
    raise exception 'FAIL: tailor can read history of an unassigned task';
  end if;
  insert into public.client (atelier_id, nom)
  values ('20000000-0000-4000-8000-000000000001','Client créé par tailleur CI');
  if (select count(*) from public.client where atelier_id='20000000-0000-4000-8000-000000000001' and nom='Client créé par tailleur CI') <> 1 then
    raise exception 'FAIL: tailor cannot create a client in own workshop';
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
do $employee_order_update$
declare
  v_updated_rows integer;
begin
  begin
    update public.commande set statut='livre'
    where id='40000000-0000-4000-8000-000000000001';
    get diagnostics v_updated_rows = row_count;
    if v_updated_rows <> 0 then
      raise exception 'FAIL: tailor unexpectedly changed global order status';
    end if;
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $employee_order_update$;
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
do $owner_finance$
declare
  v_finance jsonb;
  v_commande_id uuid;
begin
  v_finance := public.get_atelier_order_financials('20000000-0000-4000-8000-000000000001');
  if not exists (
    select 1 from jsonb_array_elements(v_finance) item
    where (item->>'prix_fcfa')::bigint = 25000
  ) then
    raise exception 'FAIL: owner financial RPC did not return expected order financials';
  end if;

  select id into v_commande_id from public.commande
  where atelier_id='20000000-0000-4000-8000-000000000001'
    and reference='CI-MANAGER-ZERO';
  perform * from public.set_commande_financial_terms(
    '20000000-0000-4000-8000-000000000001',v_commande_id,
    18000,5000,now(),'ci-owner-payment'
  );
  v_finance := public.get_atelier_order_financials('20000000-0000-4000-8000-000000000001');
  if not exists (
    select 1 from jsonb_array_elements(v_finance) item
    where (item->>'commande_id')::uuid = v_commande_id
      and (item->>'prix_fcfa')::bigint = 18000
      and jsonb_array_length(item->'paiements') = 1
  ) then
    raise exception 'FAIL: owner cannot set price and initial deposit after work-order creation';
  end if;

  if (select count(*) from public.client where atelier_id='20000000-0000-4000-8000-000000000002') <> 0 then
    raise exception 'FAIL: owner of workshop one can read workshop two clients';
  end if;
  if (select count(*) from public.commande_tache_historique where tache_id='60000000-0000-4000-8000-000000000001') < 3 then
    raise exception 'FAIL: task history did not record creation, status and note changes';
  end if;
end $owner_finance$;
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


-- Invitation lifecycle: owner/manager permissions, recipient identity, acceptance, decline and cancellation.
-- Synthetic accounts only; the outer transaction is rolled back.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('10000000-0000-4000-8000-000000000007','authenticated','authenticated','invitee@yere.test','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000008','authenticated','authenticated','declinee@yere.test','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000009','authenticated','authenticated','cancelled-invitee@yere.test','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000010','authenticated','authenticated','new-manager@yere.test','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000011','authenticated','authenticated','wrong-recipient@yere.test','',now(),'{}','{}',now(),now());

-- Owner can invite employees and managers; duplicate active invitations are rejected.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $owner_invites$
declare v_employee uuid; v_decline uuid; v_manager uuid;
begin
  select id into v_employee
  from public.create_atelier_invitation('20000000-0000-4000-8000-000000000001','invitee@yere.test','employe');
  perform set_config('yere.test_invite_employee',v_employee::text,true);

  begin
    perform * from public.create_atelier_invitation('20000000-0000-4000-8000-000000000001','invitee@yere.test','employe');
    raise exception 'FAIL: duplicate active invitation was accepted';
  exception when unique_violation then
    null;
  end;

  select id into v_decline
  from public.create_atelier_invitation('20000000-0000-4000-8000-000000000001','declinee@yere.test','employe');
  perform set_config('yere.test_invite_decline',v_decline::text,true);

  select id into v_manager
  from public.create_atelier_invitation('20000000-0000-4000-8000-000000000001','new-manager@yere.test','gestionnaire');
  perform set_config('yere.test_invite_manager',v_manager::text,true);

  begin
    perform * from public.create_atelier_invitation('20000000-0000-4000-8000-000000000001','owner-role@yere.test','proprietaire');
    raise exception 'FAIL: owner role was assignable through an invitation';
  exception when invalid_parameter_value then
    null;
  end;
end $owner_invites$;
reset role;

-- A manager may invite/cancel employees, but cannot appoint another manager.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $manager_invites$
declare v_cancel uuid;
begin
  begin
    perform * from public.create_atelier_invitation('20000000-0000-4000-8000-000000000001','unauthorized-manager@yere.test','gestionnaire');
    raise exception 'FAIL: manager appointed another manager';
  exception when insufficient_privilege then
    null;
  end;

  select id into v_cancel
  from public.create_atelier_invitation('20000000-0000-4000-8000-000000000001','cancelled-invitee@yere.test','employe');
  perform set_config('yere.test_invite_cancel',v_cancel::text,true);

  if public.cancel_atelier_invitation(v_cancel) is not true then
    raise exception 'FAIL: manager could not cancel an employee invitation';
  end if;
end $manager_invites$;
reset role;

-- An employee cannot create invitations.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $employee_invites$
begin
  begin
    perform * from public.create_atelier_invitation('20000000-0000-4000-8000-000000000001','employee-invite@yere.test','employe');
    raise exception 'FAIL: employee created an invitation';
  exception when insufficient_privilege then
    null;
  end;
end $employee_invites$;
reset role;

-- A different authenticated account cannot accept an invitation addressed to someone else.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000011","role":"authenticated"}',true);
do $wrong_recipient$
begin
  begin
    perform public.accept_atelier_invitation(current_setting('yere.test_invite_employee')::uuid);
    raise exception 'FAIL: invitation accepted by the wrong email account';
  exception when insufficient_privilege then
    null;
  end;
end $wrong_recipient$;
reset role;

-- The intended employee can accept; a declined invitation cannot subsequently be accepted.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000007',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000007","role":"authenticated"}',true);
do $employee_accept$
begin
  if public.accept_atelier_invitation(current_setting('yere.test_invite_employee')::uuid) <> '20000000-0000-4000-8000-000000000001'::uuid then
    raise exception 'FAIL: intended employee could not accept invitation';
  end if;
  if not exists (
    select 1 from public.atelier_membre
    where atelier_id='20000000-0000-4000-8000-000000000001'
      and user_id='10000000-0000-4000-8000-000000000007'
      and role='employe' and actif=true
  ) then
    raise exception 'FAIL: accepted invitation did not create the expected employee membership';
  end if;
end $employee_accept$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000008',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000008","role":"authenticated"}',true);
do $invite_decline$
begin
  if public.decline_atelier_invitation(current_setting('yere.test_invite_decline')::uuid) is not true then
    raise exception 'FAIL: intended recipient could not decline invitation';
  end if;
  begin
    perform public.accept_atelier_invitation(current_setting('yere.test_invite_decline')::uuid);
    raise exception 'FAIL: declined invitation was later accepted';
  exception when insufficient_privilege then
    null;
  end;
end $invite_decline$;
reset role;

-- Owners can verify the final invitation states after recipients have responded.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $owner_invitation_states$
begin
  if not exists (
    select 1 from public.invitation_atelier
    where id=current_setting('yere.test_invite_employee')::uuid and accepted_at is not null
  ) then
    raise exception 'FAIL: accepted invitation was not marked as accepted';
  end if;
  if not exists (
    select 1 from public.invitation_atelier
    where id=current_setting('yere.test_invite_decline')::uuid and declined_at is not null
  ) then
    raise exception 'FAIL: declined invitation was not marked as declined';
  end if;
  if not exists (
    select 1 from public.invitation_atelier
    where id=current_setting('yere.test_invite_cancel')::uuid and cancelled_at is not null
  ) then
    raise exception 'FAIL: cancelled invitation was not marked as cancelled';
  end if;
end $owner_invitation_states$;
reset role;

-- A cancelled invitation cannot be accepted by its intended recipient.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000009',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000009","role":"authenticated"}',true);
do $cancelled_invite$
begin
  begin
    perform public.accept_atelier_invitation(current_setting('yere.test_invite_cancel')::uuid);
    raise exception 'FAIL: cancelled invitation was accepted';
  exception when insufficient_privilege then
    null;
  end;
end $cancelled_invite$;
reset role;

-- Only the owner can appoint a new manager; acceptance demotes the previous manager.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000010',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000010","role":"authenticated"}',true);
do $manager_accept$
begin
  perform public.accept_atelier_invitation(current_setting('yere.test_invite_manager')::uuid);
  if not exists (
    select 1 from public.atelier_membre
    where atelier_id='20000000-0000-4000-8000-000000000001'
      and user_id='10000000-0000-4000-8000-000000000010'
      and role='gestionnaire' and actif=true
  ) then
    raise exception 'FAIL: invited manager did not receive manager membership';
  end if;
  if not exists (
    select 1 from public.atelier_membre
    where atelier_id='20000000-0000-4000-8000-000000000001'
      and user_id='10000000-0000-4000-8000-000000000002'
      and role='employe' and actif=true
  ) then
    raise exception 'FAIL: previous manager was not safely demoted after replacement';
  end if;
end $manager_accept$;
reset role;

rollback;