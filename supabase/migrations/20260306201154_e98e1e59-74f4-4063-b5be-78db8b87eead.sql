
-- Fix RLS policies on student_marks
DROP POLICY IF EXISTS "Allow all operations on student_marks" ON public.student_marks;

CREATE POLICY "Authenticated users can read student_marks"
  ON public.student_marks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and teachers can insert student_marks"
  ON public.student_marks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'headteacher'))
  );

CREATE POLICY "Admins and teachers can update student_marks"
  ON public.student_marks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'headteacher'))
  );

CREATE POLICY "Admins can delete student_marks"
  ON public.student_marks FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  );

-- Fix RLS policies on report_cards
DROP POLICY IF EXISTS "Allow all operations on report_cards" ON public.report_cards;

CREATE POLICY "Authenticated users can read report_cards"
  ON public.report_cards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and teachers can insert report_cards"
  ON public.report_cards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'headteacher'))
  );

CREATE POLICY "Admins and teachers can update report_cards"
  ON public.report_cards FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'headteacher'))
  );

CREATE POLICY "Admins can delete report_cards"
  ON public.report_cards FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  );

-- Fix RLS policies on students
DROP POLICY IF EXISTS "Allow all operations on students" ON public.students;

CREATE POLICY "Authenticated users can read students"
  ON public.students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  );

CREATE POLICY "Admins can update students"
  ON public.students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  );

CREATE POLICY "Admins can delete students"
  ON public.students FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  );

-- Fix RLS policies on classes
DROP POLICY IF EXISTS "Allow all operations on classes" ON public.classes;

CREATE POLICY "Authenticated users can read classes"
  ON public.classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage classes"
  ON public.classes FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  );

-- Fix RLS policies on terms
DROP POLICY IF EXISTS "Allow all operations on terms" ON public.terms;

CREATE POLICY "Authenticated users can read terms"
  ON public.terms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage terms"
  ON public.terms FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  );

-- Fix RLS policies on subjects
DROP POLICY IF EXISTS "Allow all operations on subjects" ON public.subjects;

CREATE POLICY "Authenticated users can read subjects"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage subjects"
  ON public.subjects FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  );

-- Fix RLS policies on school_info
DROP POLICY IF EXISTS "Allow all operations on school_info" ON public.school_info;

CREATE POLICY "Authenticated users can read school_info"
  ON public.school_info FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage school_info"
  ON public.school_info FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  );

-- Fix RLS policies on comment_templates
DROP POLICY IF EXISTS "Allow all operations on comment_templates" ON public.comment_templates;

CREATE POLICY "Authenticated users can read comment_templates"
  ON public.comment_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage comment_templates"
  ON public.comment_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  );

-- Fix RLS policies on grading_systems
DROP POLICY IF EXISTS "Allow all operations on grading_systems" ON public.grading_systems;

CREATE POLICY "Authenticated users can read grading_systems"
  ON public.grading_systems FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage grading_systems"
  ON public.grading_systems FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  );

-- Fix RLS policies on assessment_types
DROP POLICY IF EXISTS "Allow all operations on assessment_types" ON public.assessment_types;

CREATE POLICY "Authenticated users can read assessment_types"
  ON public.assessment_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage assessment_types"
  ON public.assessment_types FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'headteacher'))
  );

-- Fix storage: make student-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'student-photos';

-- Fix storage policies: drop and recreate with auth checks
DROP POLICY IF EXISTS "Authenticated users can upload student photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update student photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete student photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view student photos" ON storage.objects;

CREATE POLICY "Authenticated users can upload student photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "Authenticated users can update student photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'student-photos');

CREATE POLICY "Authenticated users can delete student photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'student-photos');

CREATE POLICY "Authenticated users can view student photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'student-photos');
