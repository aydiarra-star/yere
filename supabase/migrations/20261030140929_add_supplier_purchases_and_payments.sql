-- YÉRÉ — fournisseurs, achats, réceptions et règlements isolés par atelier
create table public.fournisseur (
 id uuid primary key default gen_random_uuid(), atelier_id uuid not null references public.atelier(id) on delete cascade,
 nom text not null check(length(trim(nom)) between 1 and 120), contact text, telephone text, ville text, categorie text, note text,
 actif boolean not null default true, created_by uuid references auth.users(id) default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(atelier_id,id)
);
create unique index fournisseur_nom_unique_idx on public.fournisseur(atelier_id,lower(trim(nom)));
create index fournisseur_atelier_idx on public.fournisseur(atelier_id,nom);
alter table public.fournisseur enable row level security;
create policy fournisseur_select_member on public.fournisseur for select to authenticated using(private.is_atelier_member(atelier_id));
create policy fournisseur_insert_managers on public.fournisseur for insert to authenticated with check(private.has_atelier_role(atelier_id,array['proprietaire','gestionnaire']) and (created_by is null or created_by=(select auth.uid())));
create policy fournisseur_update_managers on public.fournisseur for update to authenticated using(private.has_atelier_role(atelier_id,array['proprietaire','gestionnaire'])) with check(private.has_atelier_role(atelier_id,array['proprietaire','gestionnaire']) and (created_by is null or created_by=(select auth.uid())));
create trigger fournisseur_guard_tenant_author before update on public.fournisseur for each row execute function public.guard_tenant_and_author();

create table public.achat_fournisseur (
 id uuid primary key default gen_random_uuid(), atelier_id uuid not null references public.atelier(id) on delete cascade,
 fournisseur_id uuid not null, reference text not null check(length(trim(reference)) between 1 and 100),
 date_commande date not null default current_date, statut text not null default 'a_recevoir' check(statut in ('a_recevoir','recue','annulee')),
 date_reception date, date_annulation date, motif_annulation text, note text,
 created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now(),
 unique(atelier_id,id), unique(atelier_id,reference),
 constraint achat_fournisseur_fk foreign key(atelier_id,fournisseur_id) references public.fournisseur(atelier_id,id),
 constraint achat_fournisseur_state_check check(
 (statut='a_recevoir' and date_reception is null and date_annulation is null and motif_annulation is null) or
 (statut='recue' and date_reception is not null and date_annulation is null and motif_annulation is null) or
 (statut='annulee' and date_reception is null and date_annulation is not null and length(trim(motif_annulation))>0))
);
create index achat_fournisseur_atelier_date_idx on public.achat_fournisseur(atelier_id,date_commande desc);
create index achat_fournisseur_vendor_idx on public.achat_fournisseur(atelier_id,fournisseur_id,date_commande desc);
alter table public.achat_fournisseur enable row level security;
create policy achat_fournisseur_select_member on public.achat_fournisseur for select to authenticated using(private.is_atelier_member(atelier_id));
create policy achat_fournisseur_insert_managers on public.achat_fournisseur for insert to authenticated with check(private.has_atelier_role(atelier_id,array['proprietaire','gestionnaire']) and (created_by is null or created_by=(select auth.uid())));
create policy achat_fournisseur_update_managers on public.achat_fournisseur for update to authenticated using(private.has_atelier_role(atelier_id,array['proprietaire','gestionnaire'])) with check(private.has_atelier_role(atelier_id,array['proprietaire','gestionnaire']));
create trigger achat_fournisseur_guard_tenant_author before update on public.achat_fournisseur for each row execute function public.guard_tenant_and_author();

create table public.ligne_achat_fournisseur (
 id uuid primary key default gen_random_uuid(), atelier_id uuid not null, achat_id uuid not null, article_id uuid not null,
 nom_article text not null check(length(trim(nom_article)) between 1 and 120), unite text not null check(length(trim(unite)) between 1 and 40),
 quantite numeric(14,3) not null check(quantite>0), cout_unitaire_fcfa bigint not null check(cout_unitaire_fcfa>=0),
 created_at timestamptz not null default now(),
 constraint ligne_achat_parent_fk foreign key(atelier_id,achat_id) references public.achat_fournisseur(atelier_id,id) on delete cascade,
 constraint ligne_achat_article_fk foreign key(atelier_id,article_id) references public.stock_article(atelier_id,id), unique(achat_id,article_id)
);
create index ligne_achat_atelier_achat_idx on public.ligne_achat_fournisseur(atelier_id,achat_id);
alter table public.ligne_achat_fournisseur enable row level security;
create policy ligne_achat_select_member on public.ligne_achat_fournisseur for select to authenticated using(private.is_atelier_member(atelier_id));
create policy ligne_achat_insert_managers on public.ligne_achat_fournisseur for insert to authenticated with check(private.has_atelier_role(atelier_id,array['proprietaire','gestionnaire']));
revoke update,delete on public.ligne_achat_fournisseur from authenticated;

create table public.paiement_fournisseur (
 id uuid primary key default gen_random_uuid(), atelier_id uuid not null, achat_id uuid not null,
 date_paiement date not null default current_date, montant_fcfa bigint not null check(montant_fcfa>0), note text,
 cle_idempotence text not null check(length(trim(cle_idempotence)) between 8 and 200),
 created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now(),
 constraint paiement_fournisseur_achat_fk foreign key(atelier_id,achat_id) references public.achat_fournisseur(atelier_id,id),
 unique(atelier_id,cle_idempotence)
);
create index paiement_fournisseur_achat_date_idx on public.paiement_fournisseur(atelier_id,achat_id,date_paiement desc);
alter table public.paiement_fournisseur enable row level security;
create policy paiement_fournisseur_select_member on public.paiement_fournisseur for select to authenticated using(private.is_atelier_member(atelier_id));
create policy paiement_fournisseur_insert_managers on public.paiement_fournisseur for insert to authenticated with check(private.has_atelier_role(atelier_id,array['proprietaire','gestionnaire']) and (created_by is null or created_by=(select auth.uid())));
revoke update,delete on public.paiement_fournisseur from authenticated;

create or replace function private.validate_supplier_payment() returns trigger language plpgsql security definer set search_path='' as $$
declare v_purchase public.achat_fournisseur%rowtype; v_total bigint; v_paid bigint;
begin
 if auth.uid() is null or not private.has_atelier_role(new.atelier_id,array['proprietaire','gestionnaire']) then raise exception 'Accès à cet atelier refusé' using errcode='42501'; end if;
 select * into v_purchase from public.achat_fournisseur where id=new.achat_id and atelier_id=new.atelier_id for update;
 if not found or v_purchase.statut='annulee' then raise exception 'Achat introuvable ou annulé' using errcode='23514'; end if;
 select coalesce(sum(round(quantite*cout_unitaire_fcfa)::bigint),0) into v_total from public.ligne_achat_fournisseur where atelier_id=new.atelier_id and achat_id=new.achat_id;
 select coalesce(sum(montant_fcfa),0) into v_paid from public.paiement_fournisseur where atelier_id=new.atelier_id and achat_id=new.achat_id;
 if v_total-v_paid<new.montant_fcfa then raise exception 'Le règlement dépasse le solde fournisseur restant' using errcode='23514'; end if;
 return new;
end; $$;
revoke all on function private.validate_supplier_payment() from public,anon,authenticated;
create trigger paiement_fournisseur_validate before insert on public.paiement_fournisseur for each row execute function private.validate_supplier_payment();

create or replace function private.guard_supplier_purchase_update() returns trigger language plpgsql set search_path='' as $$
begin
 if new.id is distinct from old.id or new.atelier_id is distinct from old.atelier_id or new.fournisseur_id is distinct from old.fournisseur_id
 or new.reference is distinct from old.reference or new.date_commande is distinct from old.date_commande or new.note is distinct from old.note
 or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at or old.statut<>'a_recevoir'
 or not ((new.statut='recue' and new.date_reception is not null and new.date_annulation is null and new.motif_annulation is null)
 or (new.statut='annulee' and new.date_reception is null and new.date_annulation is not null and length(trim(new.motif_annulation))>0))
 then raise exception 'Un achat ne peut changer qu’une seule fois vers reçu ou annulé avec motif' using errcode='42501'; end if;
 if new.statut='annulee' and exists(select 1 from public.paiement_fournisseur p where p.atelier_id=old.atelier_id and p.achat_id=old.id)
 then raise exception 'Un achat déjà réglé ne peut pas être annulé' using errcode='23514'; end if;
 return new;
end; $$;
revoke all on function private.guard_supplier_purchase_update() from public,anon,authenticated;
create trigger achat_fournisseur_state_guard before update on public.achat_fournisseur for each row execute function private.guard_supplier_purchase_update();

create or replace function public.create_supplier_purchase(p_atelier_id uuid,p_fournisseur_id uuid,p_reference text,p_date_commande date,p_note text,p_lignes jsonb)
returns table(achat_id uuid) language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_line jsonb; v_article public.stock_article%rowtype;
begin
 if not private.has_atelier_role(p_atelier_id,array['proprietaire','gestionnaire']) then raise exception 'Accès à cet atelier refusé' using errcode='42501'; end if;
 if jsonb_typeof(p_lignes)<>'array' or jsonb_array_length(p_lignes)=0 or jsonb_array_length(p_lignes)>100 then raise exception 'Un achat doit contenir entre 1 et 100 lignes' using errcode='22023'; end if;
 insert into public.achat_fournisseur(atelier_id,fournisseur_id,reference,date_commande,note) values(p_atelier_id,p_fournisseur_id,p_reference,p_date_commande,nullif(trim(p_note),'')) returning id into v_id;
 for v_line in select value from jsonb_array_elements(p_lignes) loop
  select * into v_article from public.stock_article where id=(v_line->>'article_id')::uuid and atelier_id=p_atelier_id;
  if not found then raise exception 'Article de stock introuvable dans cet atelier' using errcode='23503'; end if;
  insert into public.ligne_achat_fournisseur(atelier_id,achat_id,article_id,nom_article,unite,quantite,cout_unitaire_fcfa)
  values(p_atelier_id,v_id,v_article.id,v_article.nom,v_article.unite,(v_line->>'quantite')::numeric,(v_line->>'cout_unitaire_fcfa')::bigint);
 end loop;
 return query select v_id;
end; $$;
revoke all on function public.create_supplier_purchase(uuid,uuid,text,date,text,jsonb) from public,anon;
grant execute on function public.create_supplier_purchase(uuid,uuid,text,date,text,jsonb) to authenticated;

create or replace function public.receive_supplier_purchase(p_atelier_id uuid,p_achat_id uuid,p_date_reception date)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_purchase public.achat_fournisseur%rowtype; v_line public.ligne_achat_fournisseur%rowtype; v_count integer:=0;
begin
 if not private.has_atelier_role(p_atelier_id,array['proprietaire','gestionnaire']) then raise exception 'Accès à cet atelier refusé' using errcode='42501'; end if;
 select * into v_purchase from public.achat_fournisseur where id=p_achat_id and atelier_id=p_atelier_id for update;
 if not found or v_purchase.statut<>'a_recevoir' then raise exception 'Achat introuvable ou déjà traité' using errcode='23514'; end if;
 for v_line in select * from public.ligne_achat_fournisseur where atelier_id=p_atelier_id and achat_id=p_achat_id order by id loop
  insert into public.stock_mouvement(atelier_id,article_id,type,quantite,date_mouvement,note,cle_idempotence)
  values(p_atelier_id,v_line.article_id,'entree',v_line.quantite,p_date_reception,'Réception achat '||v_purchase.reference,'supplier-purchase-'||v_line.id::text);
  v_count:=v_count+1;
 end loop;
 update public.achat_fournisseur set statut='recue',date_reception=p_date_reception where id=p_achat_id and atelier_id=p_atelier_id;
 return v_count;
end; $$;
revoke all on function public.receive_supplier_purchase(uuid,uuid,date) from public,anon;
grant execute on function public.receive_supplier_purchase(uuid,uuid,date) to authenticated;

grant select,insert,update on public.fournisseur,public.achat_fournisseur to authenticated;
grant select,insert on public.ligne_achat_fournisseur,public.paiement_fournisseur to authenticated;
revoke all on public.fournisseur,public.achat_fournisseur,public.ligne_achat_fournisseur,public.paiement_fournisseur from anon;
revoke delete on public.fournisseur,public.achat_fournisseur,public.ligne_achat_fournisseur,public.paiement_fournisseur from authenticated;
alter default privileges in schema public revoke all on tables from anon;
