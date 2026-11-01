-- Keep privileged finance access code out of the exposed Data API schema.
-- The public RPC is SECURITY INVOKER; it delegates to a private, narrowly
-- permissioned SECURITY DEFINER implementation with an explicit owner check.

create or replace function private.get_atelier_order_financials_impl(p_atelier_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null or not exists (
    select 1 from public.atelier_membre m
    where m.atelier_id = p_atelier_id
      and m.user_id = v_user_id
      and m.actif = true
      and m.role = 'proprietaire'
  ) then
    raise exception 'Accès financier réservé au propriétaire de cet atelier'
      using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'commande_id', c.id,
        'prix_fcfa', c.prix_fcfa,
        'paiements', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'commande_id', p.commande_id,
              'montant_fcfa', p.montant_fcfa,
              'date_paiement', p.date_paiement,
              'note', p.note
            ) order by p.date_paiement asc, p.created_at asc
          )
          from public.paiement p
          where p.atelier_id = p_atelier_id
            and p.commande_id = c.id
            and p.statut = 'confirme'
        ), '[]'::jsonb)
      ) order by c.date_commande desc, c.created_at desc
    ),
    '[]'::jsonb
  ) into v_result
  from public.commande c
  where c.atelier_id = p_atelier_id;

  return v_result;
end;
$function$;

revoke all on function private.get_atelier_order_financials_impl(uuid) from public, anon;
grant execute on function private.get_atelier_order_financials_impl(uuid) to authenticated;

create or replace function public.get_atelier_order_financials(p_atelier_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.get_atelier_order_financials_impl(p_atelier_id);
$function$;

revoke all on function public.get_atelier_order_financials(uuid) from public, anon;
grant execute on function public.get_atelier_order_financials(uuid) to authenticated;

notify pgrst, 'reload schema';
