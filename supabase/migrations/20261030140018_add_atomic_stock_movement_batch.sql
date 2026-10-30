
create or replace function public.create_stock_movements_batch(
  p_atelier_id uuid,
  p_movements jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare v_item jsonb; v_count integer := 0;
begin
  if jsonb_typeof(p_movements) <> 'array' or jsonb_array_length(p_movements) = 0 then
    raise exception 'La liste des mouvements est vide ou invalide' using errcode = '22023';
  end if;
  if jsonb_array_length(p_movements) > 100 then
    raise exception 'Trop de mouvements dans une seule opération' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_movements)
  loop
    insert into public.stock_mouvement(
      atelier_id, article_id, type, quantite, date_mouvement, note, cle_idempotence
    ) values (
      p_atelier_id,
      (v_item->>'article_id')::uuid,
      v_item->>'type',
      (v_item->>'quantite')::numeric,
      (v_item->>'date_mouvement')::date,
      nullif(v_item->>'note',''),
      v_item->>'cle_idempotence'
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.create_stock_movements_batch(uuid,jsonb) from public, anon;
grant execute on function public.create_stock_movements_batch(uuid,jsonb) to authenticated;
