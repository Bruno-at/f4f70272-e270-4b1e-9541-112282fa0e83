
-- Restrict schools SELECT and add SECURITY DEFINER slug lookup for pre-auth use
DROP POLICY IF EXISTS "Anyone can lookup school by slug" ON public.schools;

CREATE POLICY "Authenticated users can read their school"
ON public.schools
FOR SELECT
TO authenticated
USING (id = public.get_user_school_id());

CREATE OR REPLACE FUNCTION public.lookup_school_id_by_slug(p_slug text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.schools WHERE slug = lower(p_slug) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_school_id_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_school_id_by_slug(text) TO anon, authenticated;

-- Restrict school_info SELECT to user's own school
DROP POLICY IF EXISTS "Authenticated users can read school_info" ON public.school_info;
CREATE POLICY "Users can read their school's school_info"
ON public.school_info
FOR SELECT
TO authenticated
USING (id = public.get_user_school_id());

-- Add school_id constraint to school_info admin policy: scope updates to own school only
DROP POLICY IF EXISTS "Admins can manage school_info" ON public.school_info;
CREATE POLICY "Admins can manage their school's school_info"
ON public.school_info
FOR ALL
TO authenticated
USING (
  id = public.get_user_school_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'headteacher'))
)
WITH CHECK (
  id = public.get_user_school_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'headteacher'))
);

-- Remove broad teacher-readable SELECT policies on financial tables; admin/headteacher ALL policies remain
DROP POLICY IF EXISTS "Users can read fee_audit_logs in their school" ON public.fee_audit_logs;
DROP POLICY IF EXISTS "Users can read fee_balance_overrides in their school" ON public.fee_balance_overrides;
DROP POLICY IF EXISTS "Users can read student_bursaries in their school" ON public.student_bursaries;
