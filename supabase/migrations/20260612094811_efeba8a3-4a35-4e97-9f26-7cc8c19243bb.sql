
-- 1. Lock down direct INSERT/DELETE on schools (force register_school RPC)
DROP POLICY IF EXISTS "Deny direct insert on schools" ON public.schools;
CREATE POLICY "Deny direct insert on schools"
  ON public.schools FOR INSERT TO authenticated, anon
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct delete on schools" ON public.schools;
CREATE POLICY "Deny direct delete on schools"
  ON public.schools FOR DELETE TO authenticated, anon
  USING (false);

-- 2. Tighten storage SELECT policy on student-photos bucket
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (policyname ILIKE '%student-photos%select%' OR policyname ILIKE '%student photos%select%' OR policyname ILIKE '%student-photos%read%')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "student-photos school-scoped select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-photos'
    AND (storage.foldername(name))[1] = public.get_user_school_id()::text
  );

-- 3. Restrict has_role to caller only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

CREATE OR REPLACE FUNCTION public.current_user_has_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_has_role(public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(public.app_role) TO authenticated, service_role;
