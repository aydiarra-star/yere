-- YÉRÉ Market — messagerie interne acheteur/vendeur.
-- Aucun téléphone ni e-mail n'est partagé : les participants échangent dans YÉRÉ.

create table public.marketplace_conversation (
  id uuid primary key default gen_random_uuid(),
  annonce_id uuid not null references public.marketplace_annonce(id) on delete restrict,
  vendeur_id uuid not null references public.marketplace_vendeur(id) on delete restrict,
  acheteur_user_id uuid not null references auth.users(id) on delete restrict,
  titre_annonce text not null,
  nom_vendeur text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (annonce_id, acheteur_user_id)
);
create index marketplace_conversation_buyer_updated_idx
  on public.marketplace_conversation(acheteur_user_id, updated_at desc);
create index marketplace_conversation_seller_updated_idx
  on public.marketplace_conversation(vendeur_id, updated_at desc);

create table public.marketplace_message (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.marketplace_conversation(id) on delete cascade,
  expediteur_user_id uuid not null references auth.users(id) on delete restrict,
  contenu text not null check (length(trim(contenu)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index marketplace_message_conversation_created_idx
  on public.marketplace_message(conversation_id, created_at);

alter table public.marketplace_conversation enable row level security;
alter table public.marketplace_message enable row level security;

create policy marketplace_conversation_participants_read
on public.marketplace_conversation for select to authenticated
using (
  acheteur_user_id = (select auth.uid())
  or public.marketplace_vendeur_est_moi(vendeur_id)
);

create policy marketplace_message_participants_read
on public.marketplace_message for select to authenticated
using (
  exists (
    select 1 from public.marketplace_conversation c
    where c.id = conversation_id
      and (
        c.acheteur_user_id = (select auth.uid())
        or public.marketplace_vendeur_est_moi(c.vendeur_id)
      )
  )
);

grant select on public.marketplace_conversation, public.marketplace_message to authenticated;
revoke insert, update, delete on public.marketplace_conversation, public.marketplace_message from public, anon, authenticated;

create or replace function public.ouvrir_conversation_marketplace(
  p_annonce_id uuid,
  p_message_initial text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_annonce record;
  v_conversation uuid;
  v_message text := trim(coalesce(p_message_initial, ''));
begin
  if v_user is null then raise exception 'Authentification requise' using errcode = '28000'; end if;
  if length(v_message) < 1 or length(v_message) > 2000 then
    raise exception 'Le message doit contenir entre 1 et 2 000 caractères' using errcode = '22023';
  end if;

  select a.vendeur_id, a.titre, a.statut, v.nom_entreprise, v.statut as vendeur_statut
  into v_annonce
  from public.marketplace_annonce a
  join public.marketplace_vendeur v on v.id = a.vendeur_id
  where a.id = p_annonce_id;

  if not found or v_annonce.statut <> 'publiee' or v_annonce.vendeur_statut <> 'actif' then
    raise exception 'Cette annonce n’est plus disponible' using errcode = '22023';
  end if;
  if public.marketplace_vendeur_est_moi(v_annonce.vendeur_id) then
    raise exception 'Vous ne pouvez pas contacter votre propre boutique' using errcode = '42501';
  end if;

  insert into public.marketplace_conversation (
    annonce_id, vendeur_id, acheteur_user_id, titre_annonce, nom_vendeur
  ) values (
    p_annonce_id, v_annonce.vendeur_id, v_user, v_annonce.titre, v_annonce.nom_entreprise
  )
  on conflict (annonce_id, acheteur_user_id) do update
    set updated_at = now(),
        titre_annonce = excluded.titre_annonce,
        nom_vendeur = excluded.nom_vendeur
  returning id into v_conversation;

  insert into public.marketplace_message(conversation_id, expediteur_user_id, contenu)
  values (v_conversation, v_user, v_message);

  update public.marketplace_conversation set updated_at = now() where id = v_conversation;
  return v_conversation;
end;
$$;

create or replace function public.envoyer_message_marketplace(
  p_conversation_id uuid,
  p_contenu text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_conversation public.marketplace_conversation%rowtype;
  v_message text := trim(coalesce(p_contenu, ''));
begin
  if v_user is null then raise exception 'Authentification requise' using errcode = '28000'; end if;
  if length(v_message) < 1 or length(v_message) > 2000 then
    raise exception 'Le message doit contenir entre 1 et 2 000 caractères' using errcode = '22023';
  end if;

  select * into v_conversation
  from public.marketplace_conversation
  where id = p_conversation_id
  for update;

  if not found then return false; end if;
  if v_conversation.acheteur_user_id <> v_user
     and not public.marketplace_vendeur_est_moi(v_conversation.vendeur_id) then
    raise exception 'Accès refusé à cette conversation' using errcode = '42501';
  end if;

  insert into public.marketplace_message(conversation_id, expediteur_user_id, contenu)
  values (v_conversation.id, v_user, v_message);
  update public.marketplace_conversation set updated_at = now() where id = v_conversation.id;
  return true;
end;
$$;

revoke all on function public.ouvrir_conversation_marketplace(uuid, text) from public, anon;
revoke all on function public.envoyer_message_marketplace(uuid, text) from public, anon;
grant execute on function public.ouvrir_conversation_marketplace(uuid, text) to authenticated;
grant execute on function public.envoyer_message_marketplace(uuid, text) to authenticated;
