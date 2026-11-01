-- Operational work assignments for YÉRÉ.
-- No remuneration, individual profit, price, payment or cash fields are stored here.

create table if not exists public.commande_tache (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null,
  commande_id uuid not null,
  titre text not null check (length(btrim(titre)) between 1 and 120),
  description text,
  statut text not null default 'a_faire'
    check (statut in ('a_faire', 'en_cours', 'bloquee', 'terminee')),
  assigne_a uuid,
  ordre integer not null default 0 check (ordre >= 0),
  note_avancement text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint commande_tache_atelier_commande_fkey
    foreign key (atelier_id, commande_id)
    references public.commande (atelier_id, id) on delete restrict,
  constraint commande_tache_atelier_assignee_fkey
    foreign key (atelier_id, assigne_a)
    references public.atelier_membre (atelier_id, user_id) on delete restrict,
  constraint commande_tache_atelier_creator_fkey
    foreign key (atelier_id, created_by)
    references public.atelier_membre (atelier_id, user_id) on delete restrict
);

create index if not exists commande_tache_atelier_order_idx
  on public.commande_tache (atelier_id, commande_id, ordre, created_at);
create index if not exists commande_tache_assignee_status_idx
  on public.commande_tache (atelier_id, assigne_a, statut)
  where assigne_a is not null;

create table if not exists public.commande_tache_historique (
  id bigint generated always as identity primary key,
  atelier_id uuid not null,
  tache_id uuid not null references public.commande_tache(id) on delete restrict,
  acteur_id uuid references auth.users(id) on delete set null,
  evenement text not null
    check (evenement in ('creation', 'attribution', 'changement_statut', 'note_avancement')),
  ancien_statut text,
  nouveau_statut text,
  ancienne_attribution uuid,
  nouvelle_attribution uuid,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists commande_tache_historique_task_date_idx
  on public.commande_tache_historique (tache_id, created_at desc);

alter table public.commande_tache enable row level security;
alter table public.commande_tache_historique enable row level security;

revoke all on table public.commande_tache from anon, authenticated;
revoke all on table public.commande_tache_historique from anon, authenticated;
grant select, insert, update on table public.commande_tache to authenticated;
grant select on table public.commande_tache_historique to authenticated;
revoke all on sequence public.commande_tache_historique_id_seq from anon, authenticated;

drop policy if exists commande_tache_select_member on public.commande_tache;
create policy commande_tache_select_member
  on public.commande_tache for select to authenticated
  using (private.is_atelier_member(atelier_id));

drop policy if exists commande_tache_insert_managers on public.commande_tache;
create policy commande_tache_insert_managers
  on public.commande_tache for insert to authenticated
  with check (
    private.has_atelier_role(atelier_id, array['proprietaire', 'gestionnaire']::text[])
    and created_by = (select auth.uid())
    and (
      assigne_a is null
      or exists (
        select 1 from public.atelier_membre m
        where m.atelier_id = commande_tache.atelier_id
          and m.user_id = commande_tache.assigne_a
          and m.actif = true
          and m.role = 'employe'
      )
    )
  );

drop policy if exists commande_tache_update_manager_or_assignee on public.commande_tache;
create policy commande_tache_update_manager_or_assignee
  on public.commande_tache for update to authenticated
  using (
    private.has_atelier_role(atelier_id, array['proprietaire', 'gestionnaire']::text[])
    or (
      assigne_a = (select auth.uid())
      and private.has_atelier_role(atelier_id, array['employe']::text[])
    )
  )
  with check (
    private.has_atelier_role(atelier_id, array['proprietaire', 'gestionnaire']::text[])
    or (
      assigne_a = (select auth.uid())
      and private.has_atelier_role(atelier_id, array['employe']::text[])
    )
  );

drop policy if exists commande_tache_historique_select_member on public.commande_tache_historique;
create policy commande_tache_historique_select_member
  on public.commande_tache_historique for select to authenticated
  using (private.is_atelier_member(atelier_id));

create or replace function private.guard_commande_tache_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_is_manager boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  v_is_manager := private.has_atelier_role(
    new.atelier_id, array['proprietaire', 'gestionnaire']::text[]
  );

  if tg_op = 'INSERT' then
    if new.statut <> 'a_faire' then
      raise exception 'Une tâche doit commencer au statut À faire' using errcode = '23514';
    end if;
    if not v_is_manager then
      raise exception 'Seul le propriétaire ou le gestionnaire peut créer et attribuer une tâche'
        using errcode = '42501';
    end if;
    if new.created_by is distinct from auth.uid() then
      raise exception 'Auteur de tâche invalide' using errcode = '42501';
    end if;
    if new.assigne_a is not null and not exists (
      select 1 from public.atelier_membre m
      where m.atelier_id = new.atelier_id
        and m.user_id = new.assigne_a
        and m.actif = true and m.role = 'employe'
    ) then
      raise exception 'La tâche doit être attribuée à un tailleur actif de cet atelier'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if row(new.id, new.atelier_id, new.commande_id, new.created_by, new.created_at,
         new.updated_at, new.started_at, new.completed_at)
       is distinct from
     row(old.id, old.atelier_id, old.commande_id, old.created_by, old.created_at,
         old.updated_at, old.started_at, old.completed_at) then
    raise exception 'Les identifiants et la création initiale d’une tâche sont immuables'
      using errcode = '42501';
  end if;

  if v_is_manager then
    if new.assigne_a is not null and not exists (
      select 1 from public.atelier_membre m
      where m.atelier_id = new.atelier_id
        and m.user_id = new.assigne_a
        and m.actif = true and m.role = 'employe'
    ) then
      raise exception 'La tâche doit être attribuée à un tailleur actif de cet atelier'
        using errcode = '23514';
    end if;
  else
    if not private.has_atelier_role(new.atelier_id, array['employe']::text[])
       or old.assigne_a is distinct from auth.uid()
       or new.assigne_a is distinct from old.assigne_a
       or row(new.atelier_id, new.commande_id, new.titre, new.description,
              new.ordre, new.created_by, new.created_at,
              new.started_at, new.completed_at)
          is distinct from
          row(old.atelier_id, old.commande_id, old.titre, old.description,
              old.ordre, old.created_by, old.created_at,
              old.started_at, old.completed_at) then
      raise exception 'Un tailleur peut uniquement actualiser une tâche qui lui est attribuée'
        using errcode = '42501';
    end if;
  end if;

  if new.statut is distinct from old.statut
     and not (
       (old.statut = 'a_faire' and new.statut in ('en_cours', 'bloquee'))
       or (old.statut = 'en_cours' and new.statut in ('bloquee', 'terminee', 'a_faire'))
       or (old.statut = 'bloquee' and new.statut in ('en_cours', 'a_faire'))
       or (old.statut = 'terminee' and new.statut = 'en_cours')
     ) then
    raise exception 'Transition de statut de tâche non autorisée' using errcode = '23514';
  end if;

  new.updated_at := now();
  if new.statut = 'en_cours' and old.statut <> 'en_cours' then
    new.started_at := coalesce(new.started_at, now());
  end if;
  if new.statut = 'terminee' and old.statut <> 'terminee' then
    new.completed_at := now();
  elsif new.statut <> 'terminee' then
    new.completed_at := null;
  end if;
  return new;
end;
$function$;

create or replace function private.log_commande_tache_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    insert into public.commande_tache_historique
      (atelier_id, tache_id, acteur_id, evenement, nouveau_statut,
       nouvelle_attribution, note)
    values
      (new.atelier_id, new.id, auth.uid(), 'creation', new.statut,
       new.assigne_a, new.note_avancement);
    return new;
  end if;

  if new.assigne_a is distinct from old.assigne_a then
    insert into public.commande_tache_historique
      (atelier_id, tache_id, acteur_id, evenement, ancien_statut,
       nouveau_statut, ancienne_attribution, nouvelle_attribution, note)
    values
      (new.atelier_id, new.id, auth.uid(), 'attribution', old.statut,
       new.statut, old.assigne_a, new.assigne_a, new.note_avancement);
  end if;

  if new.statut is distinct from old.statut then
    insert into public.commande_tache_historique
      (atelier_id, tache_id, acteur_id, evenement, ancien_statut,
       nouveau_statut, ancienne_attribution, nouvelle_attribution, note)
    values
      (new.atelier_id, new.id, auth.uid(), 'changement_statut', old.statut,
       new.statut, old.assigne_a, new.assigne_a, new.note_avancement);
  end if;

  if new.note_avancement is distinct from old.note_avancement then
    insert into public.commande_tache_historique
      (atelier_id, tache_id, acteur_id, evenement, ancien_statut,
       nouveau_statut, ancienne_attribution, nouvelle_attribution, note)
    values
      (new.atelier_id, new.id, auth.uid(), 'note_avancement', old.statut,
       new.statut, old.assigne_a, new.assigne_a, new.note_avancement);
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_commande_tache_write() from public, anon, authenticated;
revoke all on function private.log_commande_tache_change() from public, anon, authenticated;

drop trigger if exists commande_tache_guard_write on public.commande_tache;
create trigger commande_tache_guard_write
  before insert or update on public.commande_tache
  for each row execute function private.guard_commande_tache_write();

drop trigger if exists commande_tache_audit_insert on public.commande_tache;
create trigger commande_tache_audit_insert
  after insert on public.commande_tache
  for each row execute function private.log_commande_tache_change();

drop trigger if exists commande_tache_audit_update on public.commande_tache;
create trigger commande_tache_audit_update
  after update on public.commande_tache
  for each row execute function private.log_commande_tache_change();



-- Employees must update their assigned work tasks, not the global order record.
-- Internal task-status synchronization is the sole exception.
create or replace function private.guard_employee_order_update()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if private.has_atelier_role(old.atelier_id, array['proprietaire', 'gestionnaire']::text[]) then
    return new;
  end if;

  if current_setting('yere.task_status_sync', true) = 'on' then
    return new;
  end if;

  if not private.has_atelier_role(old.atelier_id, array['employe']::text[]) then
    raise exception 'Accès refusé pour modifier cette commande'
      using errcode = '42501';
  end if;

  raise exception 'Un tailleur peut uniquement actualiser les tâches qui lui sont attribuées'
    using errcode = '42501';
end;
$function$;

-- Keep the global order status consistent with its detailed work tasks.
-- Orders without detailed tasks retain the existing manual workflow.
create or replace function private.guard_order_completion_requires_tasks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (new.statut in ('pret', 'livre') or new.etape_retouche = 'terminee')
     and exists (
       select 1
       from public.commande_tache t
       where t.atelier_id = new.atelier_id
         and t.commande_id = new.id
         and t.statut <> 'terminee'
     ) then
    raise exception 'Cette commande ne peut pas être marquée prête ou livrée : des tâches restent à terminer'
      using errcode = '23514';
  end if;
  return new;
end;
$function$;

create or replace function private.sync_order_status_from_tasks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_atelier_id uuid;
  v_commande_id uuid;
  v_all_done boolean;
begin
  if tg_op = 'DELETE' then
    v_atelier_id := old.atelier_id;
    v_commande_id := old.commande_id;
  else
    v_atelier_id := new.atelier_id;
    v_commande_id := new.commande_id;
  end if;

  -- Serialize completion/reopening for tasks belonging to the same order.
  perform 1
  from public.commande c
  where c.atelier_id = v_atelier_id
    and c.id = v_commande_id
  for update;

  select bool_and(t.statut = 'terminee')
    into v_all_done
  from public.commande_tache t
  where t.atelier_id = v_atelier_id
    and t.commande_id = v_commande_id;

  perform set_config('yere.task_status_sync', 'on', true);

  if v_all_done is true then
    update public.commande c
       set statut = 'pret',
           etape_retouche = case when c.type_travail = 'retouche' then 'terminee' else c.etape_retouche end
     where c.atelier_id = v_atelier_id
       and c.id = v_commande_id
       and c.statut <> 'livre'
       and c.statut <> 'pret';
  else
    update public.commande c
       set statut = 'en_confection',
           etape_retouche = case when c.type_travail = 'retouche' and c.etape_retouche = 'terminee' then 'en_retouches' else c.etape_retouche end
     where c.atelier_id = v_atelier_id
       and c.id = v_commande_id
       and c.statut in ('a_preparer', 'pret');
  end if;

  perform set_config('yere.task_status_sync', 'off', true);
  return null;
end;
$function$;

create or replace function private.guard_task_order_not_delivered()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order_status text;
begin
  select c.statut into v_order_status
  from public.commande c
  where c.atelier_id = new.atelier_id
    and c.id = new.commande_id;

  if v_order_status in ('livre', 'annule') then
    raise exception 'Une commande livrée ou annulée ne peut plus recevoir de modification de tâche'
      using errcode = '23514';
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_order_completion_requires_tasks() from public, anon, authenticated;
revoke all on function private.sync_order_status_from_tasks() from public, anon, authenticated;
revoke all on function private.guard_task_order_not_delivered() from public, anon, authenticated;

drop trigger if exists commande_completion_requires_tasks on public.commande;
create trigger commande_completion_requires_tasks
  before update of statut, etape_retouche on public.commande
  for each row execute function private.guard_order_completion_requires_tasks();

drop trigger if exists commande_task_order_not_delivered on public.commande_tache;
create trigger commande_task_order_not_delivered
  before insert or update on public.commande_tache
  for each row execute function private.guard_task_order_not_delivered();

drop trigger if exists commande_task_sync_order_status on public.commande_tache;
create trigger commande_task_sync_order_status
  after insert or update on public.commande_tache
  for each row execute function private.sync_order_status_from_tasks();

notify pgrst, 'reload schema';
