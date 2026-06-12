
-- =========================================================
-- 1. Fix PRIVILEGE_ESCALATION on profiles INSERT policy
--    Only allow self-insert with role = 'teacher' from client.
--    Admin/headteacher profiles are created server-side by the
--    handle_new_user() trigger (SECURITY DEFINER bypasses RLS).
-- =========================================================
DROP POLICY IF EXISTS "Allow insert for new users" ON public.profiles;
CREATE POLICY "Users can self-insert teacher profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id AND role = 'teacher'::app_role);

-- Prevent users from escalating their role via UPDATE.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile (no role change)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  AND school_id IS NOT DISTINCT FROM (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- =========================================================
-- 2. Fix OVERLY_PERMISSIVE_STORAGE on student-photos bucket
--    Scope CRUD by first path segment = user's school_id.
--    SELECT remains permissive for authenticated users so that
--    existing photos (uploaded without school prefix) and shared
--    signed URLs continue to display; modification is now locked
--    to the owning school.
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can upload student photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update student photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete student photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view student photos"   ON storage.objects;

CREATE POLICY "School members can view their school's photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-photos'
  AND (
    -- New, school-scoped uploads
    (storage.foldername(name))[1] = public.get_user_school_id()::text
    -- Legacy photos that pre-date school scoping (no folder prefix or 'school/' prefix)
    OR (storage.foldername(name))[1] IN ('school')
    OR position('/' in name) = 0
  )
);

CREATE POLICY "School members can upload to their school folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-photos'
  AND (storage.foldername(name))[1] = public.get_user_school_id()::text
);

CREATE POLICY "School members can update their school's photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'student-photos'
  AND (storage.foldername(name))[1] = public.get_user_school_id()::text
)
WITH CHECK (
  bucket_id = 'student-photos'
  AND (storage.foldername(name))[1] = public.get_user_school_id()::text
);

CREATE POLICY "School members can delete their school's photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-photos'
  AND (storage.foldername(name))[1] = public.get_user_school_id()::text
);

-- =========================================================
-- 3. Lock down SECURITY DEFINER functions that should not be
--    callable as RPC by anon/authenticated. Trigger functions
--    and RLS-helper functions don't need EXECUTE permissions
--    for inline use in triggers/policies.
--    register_school and lookup_school_id_by_slug remain
--    callable (used during the public signup/login flow).
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_school_id()       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)   FROM PUBLIC, anon;
