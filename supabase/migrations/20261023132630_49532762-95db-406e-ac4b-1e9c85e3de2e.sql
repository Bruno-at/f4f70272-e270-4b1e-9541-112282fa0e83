ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS headteacher_name text;
CREATE POLICY "Teachers can update classes in their school" ON public.classes FOR UPDATE TO authenticated
USING (school_id = get_user_school_id() AND public.current_user_has_role('teacher'::app_role))
WITH CHECK (school_id = get_user_school_id());