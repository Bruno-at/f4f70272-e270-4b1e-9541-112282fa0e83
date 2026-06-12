CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, school_id)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), ''), NEW.email, 'User'),
    'teacher'::public.app_role,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_school(
  p_school_name text,
  p_slug text,
  p_email text DEFAULT NULL,
  p_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_school_id uuid;
  caller_id uuid := auth.uid();
  caller_school_id uuid;
  assigned_school_id uuid;
  normalized_school_name text := NULLIF(BTRIM(p_school_name), '');
  normalized_slug text := lower(NULLIF(BTRIM(p_slug), ''));
  caller_full_name text := COALESCE(
    NULLIF(BTRIM(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    NULLIF(BTRIM(auth.jwt() ->> 'email'), ''),
    'School administrator'
  );
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to register a school';
  END IF;

  IF normalized_school_name IS NULL OR length(normalized_school_name) > 160 THEN
    RAISE EXCEPTION 'School name is required and must be 160 characters or fewer';
  END IF;

  IF normalized_slug IS NULL OR normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(normalized_slug) > 80 THEN
    RAISE EXCEPTION 'School code must use lowercase letters, numbers, and single hyphens only';
  END IF;

  SELECT school_id INTO caller_school_id
  FROM public.profiles
  WHERE id = caller_id;

  IF caller_school_id IS NOT NULL THEN
    RAISE EXCEPTION 'This account is already linked to a school';
  END IF;

  INSERT INTO public.schools (school_name, slug, email, address)
  VALUES (
    normalized_school_name,
    normalized_slug,
    NULLIF(BTRIM(p_email), ''),
    NULLIF(BTRIM(p_address), '')
  )
  RETURNING id INTO new_school_id;

  INSERT INTO public.profiles (id, full_name, role, school_id)
  VALUES (caller_id, caller_full_name, 'admin'::public.app_role, new_school_id)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(NULLIF(BTRIM(public.profiles.full_name), ''), EXCLUDED.full_name),
    role = 'admin'::public.app_role,
    school_id = EXCLUDED.school_id,
    updated_at = now()
  WHERE public.profiles.id = caller_id
    AND public.profiles.school_id IS NULL;

  SELECT school_id INTO assigned_school_id
  FROM public.profiles
  WHERE id = caller_id;

  IF assigned_school_id IS DISTINCT FROM new_school_id THEN
    RAISE EXCEPTION 'Unable to link this account to the new school';
  END IF;

  RETURN new_school_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_teacher_to_school(
  p_user_id uuid,
  p_full_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_school_id uuid;
  caller_role public.app_role;
  affected_rows integer;
  normalized_full_name text := COALESCE(NULLIF(BTRIM(p_full_name), ''), 'Teacher');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT school_id, role INTO caller_school_id, caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_school_id IS NULL OR caller_role NOT IN ('admin'::public.app_role, 'headteacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only school administrators can add teachers';
  END IF;

  INSERT INTO public.profiles (id, full_name, role, school_id)
  VALUES (p_user_id, normalized_full_name, 'teacher'::public.app_role, caller_school_id)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    role = 'teacher'::public.app_role,
    school_id = caller_school_id,
    updated_at = now()
  WHERE public.profiles.id = p_user_id
    AND public.profiles.role = 'teacher'::public.app_role
    AND (public.profiles.school_id IS NULL OR public.profiles.school_id = caller_school_id);

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Unable to assign this teacher to your school';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_school_member_profile(
  p_user_id uuid,
  p_full_name text,
  p_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_school_id uuid;
  caller_role public.app_role;
  affected_rows integer;
  normalized_full_name text := COALESCE(NULLIF(BTRIM(p_full_name), ''), 'Staff member');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_role NOT IN ('admin'::public.app_role, 'teacher'::public.app_role, 'headteacher'::public.app_role) THEN
    RAISE EXCEPTION 'Invalid staff role';
  END IF;

  SELECT school_id, role INTO caller_school_id, caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_school_id IS NULL OR caller_role NOT IN ('admin'::public.app_role, 'headteacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only school administrators can edit staff';
  END IF;

  UPDATE public.profiles
  SET
    full_name = normalized_full_name,
    role = p_role,
    updated_at = now()
  WHERE id = p_user_id
    AND school_id = caller_school_id;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Unable to update this staff member';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Users can self-insert teacher profile" ON public.profiles;
CREATE POLICY "Users can self-insert teacher profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND role = 'teacher'::public.app_role
  AND school_id IS NULL
);

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE ALL ON FUNCTION public.register_school(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_school(text, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.assign_teacher_to_school(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_teacher_to_school(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_school_member_profile(uuid, text, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_school_member_profile(uuid, text, public.app_role) TO authenticated, service_role;