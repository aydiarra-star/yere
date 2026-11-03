CREATE OR REPLACE FUNCTION private.reactivate_atelier_member_impl(p_atelier_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_target_role text;
  v_active boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentification requise' USING errcode = '28000';
  END IF;
  IF NOT private.has_atelier_role(p_atelier_id, ARRAY['proprietaire']) THEN
    RAISE EXCEPTION 'Seul le propriétaire peut rétablir un membre' USING errcode = '42501';
  END IF;
  IF p_user_id = v_actor THEN
    RAISE EXCEPTION 'Le propriétaire ne peut pas modifier son propre accès' USING errcode = '42501';
  END IF;

  SELECT m.role, m.actif INTO v_target_role, v_active
  FROM public.atelier_membre m
  WHERE m.atelier_id = p_atelier_id AND m.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membre introuvable dans cet atelier' USING errcode = 'P0002';
  END IF;
  IF v_target_role = 'proprietaire' THEN
    RAISE EXCEPTION 'Le propriétaire ne peut pas être réactivé comme collaborateur' USING errcode = '42501';
  END IF;
  IF v_active THEN
    RAISE EXCEPTION 'Ce membre est déjà actif' USING errcode = '22023';
  END IF;

  UPDATE public.atelier_membre
  SET actif = true
  WHERE atelier_id = p_atelier_id AND user_id = p_user_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reactivate_atelier_member(p_atelier_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SET search_path TO ''
AS $function$
  SELECT private.reactivate_atelier_member_impl(p_atelier_id, p_user_id);
$function$;

REVOKE ALL ON FUNCTION public.reactivate_atelier_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reactivate_atelier_member(uuid, uuid) TO authenticated;
