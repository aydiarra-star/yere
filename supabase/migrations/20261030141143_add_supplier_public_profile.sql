-- Profil public fournisseur propre à chaque atelier, distinct du carnet de fournisseurs
create table public.profil_fournisseur (
 atelier_id uuid primary key references public.atelier(id) on delete cascade,
 nom_entreprise text not null check(length(trim(nom_entreprise)) between 1 and 160),
 nom_contact text not null default '',
 telephone text not null default '',
 ville text not null default '',
 categorie text not null default '',
 nom_boutique text not null default '',
 description text not null default '',
 created_by uuid references auth.users(id) default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.profil_fournisseur enable row level security;
create policy profil_fournisseur_select_member on public.profil_fournisseur for select to authenticated using(private.is_atelier_member(atelier_id));
create policy profil_fournisseur_insert_managers on public.profil_fournisseur for insert to authenticated
 with check(private.has_atelier_role(atelier_id,array['proprietaire','gestionnaire']) and (created_by is null or created_by=(select auth.uid())));
create policy profil_fournisseur_update_managers on public.profil_fournisseur for update to authenticated
 using(private.has_atelier_role(atelier_id,array['proprietaire','gestionnaire']))
 with check(private.has_atelier_role(atelier_id,array['proprietaire','gestionnaire']) and (created_by is null or created_by=(select auth.uid())));
create trigger profil_fournisseur_guard_tenant_author before update on public.profil_fournisseur for each row execute function public.guard_tenant_and_author();
grant select,insert,update on public.profil_fournisseur to authenticated;
revoke all on public.profil_fournisseur from anon;
revoke delete on public.profil_fournisseur from authenticated;