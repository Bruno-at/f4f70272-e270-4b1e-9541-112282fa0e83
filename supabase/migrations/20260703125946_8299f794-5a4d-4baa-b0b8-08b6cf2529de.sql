
-- class_subjects: teachers may insert/update, but only admin/headteacher may delete
DROP POLICY IF EXISTS "Staff can manage class_subjects in their school" ON public.class_subjects;

CREATE POLICY "Staff can insert class_subjects in their school"
ON public.class_subjects FOR INSERT TO authenticated
WITH CHECK (
  school_id = get_user_school_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'teacher'::app_role,'headteacher'::app_role]))
);

CREATE POLICY "Staff can update class_subjects in their school"
ON public.class_subjects FOR UPDATE TO authenticated
USING (
  school_id = get_user_school_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'teacher'::app_role,'headteacher'::app_role]))
)
WITH CHECK (
  school_id = get_user_school_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'teacher'::app_role,'headteacher'::app_role]))
);

CREATE POLICY "Admins can delete class_subjects in their school"
ON public.class_subjects FOR DELETE TO authenticated
USING (
  school_id = get_user_school_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'headteacher'::app_role]))
);

-- subjects: teachers may insert/update, but only admin/headteacher may delete
DROP POLICY IF EXISTS "Staff can manage subjects in their school" ON public.subjects;

CREATE POLICY "Staff can insert subjects in their school"
ON public.subjects FOR INSERT TO authenticated
WITH CHECK (
  school_id = get_user_school_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'teacher'::app_role,'headteacher'::app_role]))
);

CREATE POLICY "Staff can update subjects in their school"
ON public.subjects FOR UPDATE TO authenticated
USING (
  school_id = get_user_school_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'teacher'::app_role,'headteacher'::app_role]))
)
WITH CHECK (
  school_id = get_user_school_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'teacher'::app_role,'headteacher'::app_role]))
);

CREATE POLICY "Admins can delete subjects in their school"
ON public.subjects FOR DELETE TO authenticated
USING (
  school_id = get_user_school_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'headteacher'::app_role]))
);

-- grading_systems: restrict all writes (insert/update/delete) to admin/headteacher only
DROP POLICY IF EXISTS "Staff can manage grading_systems in their school" ON public.grading_systems;

CREATE POLICY "Admins can manage grading_systems in their school"
ON public.grading_systems FOR ALL TO authenticated
USING (
  school_id = get_user_school_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'headteacher'::app_role]))
)
WITH CHECK (
  school_id = get_user_school_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'headteacher'::app_role]))
);
