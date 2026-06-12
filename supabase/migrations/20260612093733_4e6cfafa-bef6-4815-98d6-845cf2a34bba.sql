CREATE OR REPLACE FUNCTION public.remove_school_member(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_school_id uuid;
  caller_role public.app_role;
  affected_rows integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot remove your own account';
  END IF;

  SELECT school_id, role INTO caller_school_id, caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_school_id IS NULL OR caller_role NOT IN ('admin'::public.app_role, 'headteacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only school administrators can remove staff';
  END IF;

  UPDATE public.profiles
  SET school_id = NULL,
      role = 'teacher'::public.app_role,
      updated_at = now()
  WHERE id = p_user_id
    AND school_id = caller_school_id;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Unable to remove this staff member';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_school_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_school_member(uuid) TO authenticated, service_role;