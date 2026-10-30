create or replace function public.guard_tenant_and_author()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.atelier_id is distinct from old.atelier_id then
    raise exception 'Le rattachement à un atelier est immuable' using errcode = '42501';
  end if;
  if tg_table_name in ('mensuration','commande','paiement','depense','stock_mouvement','fournisseur','achat_fournisseur','profil_fournisseur')
     and new.created_by is distinct from old.created_by then
    raise exception 'L’auteur initial est immuable' using errcode = '42501';
  end if;
  return new;
end;
$$;