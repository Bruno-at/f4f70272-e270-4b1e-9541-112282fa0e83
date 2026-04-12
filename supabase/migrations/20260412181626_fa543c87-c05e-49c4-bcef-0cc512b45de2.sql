
-- Fix students: allow teachers to insert
DROP POLICY IF EXISTS "Admins can insert students" ON public.students;
CREATE POLICY "Admins and teachers can insert students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = ANY (ARRAY['admin'::app_role, 'teacher'::app_role, 'headteacher'::app_role])
  )
);

-- Fix students: allow teachers to update
DROP POLICY IF EXISTS "Admins can update students" ON public.students;
CREATE POLICY "Admins and teachers can update students"
ON public.students
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = ANY (ARRAY['admin'::app_role, 'teacher'::app_role, 'headteacher'::app_role])
  )
);

-- Fix subjects: allow teachers to manage (drop ALL policy and create specific ones)
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "Staff can manage subjects"
ON public.subjects
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = ANY (ARRAY['admin'::app_role, 'teacher'::app_role, 'headteacher'::app_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = ANY (ARRAY['admin'::app_role, 'teacher'::app_role, 'headteacher'::app_role])
  )
);

-- Fix grading_systems: allow teachers to manage
DROP POLICY IF EXISTS "Admins can manage grading_systems" ON public.grading_systems;
CREATE POLICY "Staff can manage grading_systems"
ON public.grading_systems
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = ANY (ARRAY['admin'::app_role, 'teacher'::app_role, 'headteacher'::app_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = ANY (ARRAY['admin'::app_role, 'teacher'::app_role, 'headteacher'::app_role])
  )
);
