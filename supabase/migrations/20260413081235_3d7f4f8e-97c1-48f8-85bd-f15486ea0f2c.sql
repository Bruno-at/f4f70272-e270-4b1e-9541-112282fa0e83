
-- 1. Create schools table
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  email text,
  address text,
  location text,
  po_box text,
  telephone text,
  website text,
  motto text,
  logo_url text,
  stamp_url text,
  stamp_opacity numeric DEFAULT 70,
  stamp_size numeric DEFAULT 60,
  stamp_position_x numeric DEFAULT 75,
  stamp_position_y numeric DEFAULT 80,
  headteacher_signature_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can lookup school by slug"
ON public.schools FOR SELECT TO anon, authenticated
USING (true);

-- 2. Add school_id to ALL tables
ALTER TABLE public.profiles ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.classes ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.students ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.subjects ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.student_marks ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.report_cards ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.terms ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.comment_templates ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.grading_systems ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.assessment_types ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.fee_structures ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.fee_balance_overrides ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.student_payments ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.student_bursaries ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.fee_audit_logs ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.teacher_subjects ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.pending_submissions ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

-- 3. Now create school update policy (after profiles.school_id exists)
CREATE POLICY "School admins can update their school"
ON public.schools FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = schools.id
    AND profiles.role IN ('admin', 'headteacher')
  )
);

-- 4. Migrate existing data
INSERT INTO public.schools (id, school_name, slug, email, location, po_box, telephone, website, motto, logo_url, stamp_url, stamp_opacity, stamp_size, stamp_position_x, stamp_position_y, headteacher_signature_url)
SELECT
  gen_random_uuid(), school_name,
  lower(regexp_replace(school_name, '[^a-zA-Z0-9]', '-', 'g')),
  email, location, po_box, telephone, website, motto, logo_url, stamp_url,
  COALESCE(stamp_opacity, 70), COALESCE(stamp_size, 60),
  COALESCE(stamp_position_x, 75), COALESCE(stamp_position_y, 80),
  headteacher_signature_url
FROM public.school_info LIMIT 1;

INSERT INTO public.schools (school_name, slug)
SELECT 'Default School', 'default-school'
WHERE NOT EXISTS (SELECT 1 FROM public.schools);

-- 5. Assign all existing records to default school
DO $$
DECLARE v_school_id uuid;
BEGIN
  SELECT id INTO v_school_id FROM public.schools LIMIT 1;
  UPDATE public.profiles SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.classes SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.students SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.subjects SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.student_marks SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.report_cards SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.terms SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.comment_templates SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.grading_systems SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.assessment_types SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.fee_structures SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.fee_balance_overrides SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.student_payments SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.student_bursaries SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.fee_audit_logs SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.teacher_subjects SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.pending_submissions SET school_id = v_school_id WHERE school_id IS NULL;
END $$;

-- 6. Indexes
CREATE INDEX idx_profiles_school ON public.profiles(school_id);
CREATE INDEX idx_classes_school ON public.classes(school_id);
CREATE INDEX idx_students_school ON public.students(school_id);
CREATE INDEX idx_subjects_school ON public.subjects(school_id);
CREATE INDEX idx_student_marks_school ON public.student_marks(school_id);
CREATE INDEX idx_report_cards_school ON public.report_cards(school_id);
CREATE INDEX idx_terms_school ON public.terms(school_id);
CREATE INDEX idx_comment_templates_school ON public.comment_templates(school_id);
CREATE INDEX idx_grading_systems_school ON public.grading_systems(school_id);
CREATE INDEX idx_assessment_types_school ON public.assessment_types(school_id);
CREATE INDEX idx_fee_structures_school ON public.fee_structures(school_id);
CREATE INDEX idx_student_payments_school ON public.student_payments(school_id);

-- 7. Helper function
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1; $$;

-- 8. Update RLS policies for school isolation

-- PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles in their school"
ON public.profiles FOR SELECT TO authenticated
USING (school_id = get_user_school_id() OR id = auth.uid());

-- CLASSES
DROP POLICY IF EXISTS "Authenticated users can read classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
CREATE POLICY "Users can read classes in their school"
ON public.classes FOR SELECT TO authenticated
USING (school_id = get_user_school_id());
CREATE POLICY "Admins can manage classes in their school"
ON public.classes FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

-- STUDENTS
DROP POLICY IF EXISTS "Authenticated users can read students" ON public.students;
DROP POLICY IF EXISTS "Admins and teachers can insert students" ON public.students;
DROP POLICY IF EXISTS "Admins and teachers can update students" ON public.students;
DROP POLICY IF EXISTS "Admins can delete students" ON public.students;
CREATE POLICY "Users can read students in their school" ON public.students FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Staff can insert students in their school" ON public.students FOR INSERT TO authenticated WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher', 'headteacher')));
CREATE POLICY "Staff can update students in their school" ON public.students FOR UPDATE TO authenticated USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher', 'headteacher')));
CREATE POLICY "Admins can delete students in their school" ON public.students FOR DELETE TO authenticated USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

-- SUBJECTS
DROP POLICY IF EXISTS "Authenticated users can read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Staff can manage subjects" ON public.subjects;
CREATE POLICY "Users can read subjects in their school" ON public.subjects FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Staff can manage subjects in their school" ON public.subjects FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher', 'headteacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher', 'headteacher')));

-- STUDENT_MARKS
DROP POLICY IF EXISTS "Authenticated users can read student_marks" ON public.student_marks;
DROP POLICY IF EXISTS "Admins and teachers can insert student_marks" ON public.student_marks;
DROP POLICY IF EXISTS "Admins and teachers can update student_marks" ON public.student_marks;
DROP POLICY IF EXISTS "Admins can delete student_marks" ON public.student_marks;
CREATE POLICY "Users can read marks in their school" ON public.student_marks FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Staff can insert marks in their school" ON public.student_marks FOR INSERT TO authenticated WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher', 'headteacher')));
CREATE POLICY "Staff can update marks in their school" ON public.student_marks FOR UPDATE TO authenticated USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher', 'headteacher')));
CREATE POLICY "Admins can delete marks in their school" ON public.student_marks FOR DELETE TO authenticated USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

-- REPORT_CARDS
DROP POLICY IF EXISTS "Authenticated users can read report_cards" ON public.report_cards;
DROP POLICY IF EXISTS "Admins and teachers can insert report_cards" ON public.report_cards;
DROP POLICY IF EXISTS "Admins and teachers can update report_cards" ON public.report_cards;
DROP POLICY IF EXISTS "Admins can delete report_cards" ON public.report_cards;
CREATE POLICY "Users can read report_cards in their school" ON public.report_cards FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Staff can insert report_cards in their school" ON public.report_cards FOR INSERT TO authenticated WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher', 'headteacher')));
CREATE POLICY "Staff can update report_cards in their school" ON public.report_cards FOR UPDATE TO authenticated USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher', 'headteacher')));
CREATE POLICY "Admins can delete report_cards in their school" ON public.report_cards FOR DELETE TO authenticated USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

-- TERMS
DROP POLICY IF EXISTS "Authenticated users can read terms" ON public.terms;
DROP POLICY IF EXISTS "Admins can manage terms" ON public.terms;
CREATE POLICY "Users can read terms in their school" ON public.terms FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Admins can manage terms in their school" ON public.terms FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

-- COMMENT_TEMPLATES
DROP POLICY IF EXISTS "Authenticated users can read comment_templates" ON public.comment_templates;
DROP POLICY IF EXISTS "Admins can manage comment_templates" ON public.comment_templates;
CREATE POLICY "Users can read comment_templates in their school" ON public.comment_templates FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Admins can manage comment_templates in their school" ON public.comment_templates FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

-- GRADING_SYSTEMS
DROP POLICY IF EXISTS "Authenticated users can read grading_systems" ON public.grading_systems;
DROP POLICY IF EXISTS "Staff can manage grading_systems" ON public.grading_systems;
CREATE POLICY "Users can read grading_systems in their school" ON public.grading_systems FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Staff can manage grading_systems in their school" ON public.grading_systems FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher', 'headteacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher', 'headteacher')));

-- ASSESSMENT_TYPES
DROP POLICY IF EXISTS "Authenticated users can read assessment_types" ON public.assessment_types;
DROP POLICY IF EXISTS "Admins can manage assessment_types" ON public.assessment_types;
CREATE POLICY "Users can read assessment_types in their school" ON public.assessment_types FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Admins can manage assessment_types in their school" ON public.assessment_types FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

-- FEE_STRUCTURES
DROP POLICY IF EXISTS "Authenticated users can read fee_structures" ON public.fee_structures;
DROP POLICY IF EXISTS "Admins can manage fee_structures" ON public.fee_structures;
CREATE POLICY "Users can read fee_structures in their school" ON public.fee_structures FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Admins can manage fee_structures in their school" ON public.fee_structures FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

-- FEE_BALANCE_OVERRIDES
DROP POLICY IF EXISTS "Authenticated users can read fee_balance_overrides" ON public.fee_balance_overrides;
DROP POLICY IF EXISTS "Admins can manage fee_balance_overrides" ON public.fee_balance_overrides;
CREATE POLICY "Users can read fee_balance_overrides in their school" ON public.fee_balance_overrides FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Admins can manage fee_balance_overrides in their school" ON public.fee_balance_overrides FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

-- STUDENT_PAYMENTS
DROP POLICY IF EXISTS "Admins and headteachers can read student_payments" ON public.student_payments;
DROP POLICY IF EXISTS "Admins can manage student_payments" ON public.student_payments;
CREATE POLICY "Admins can read student_payments in their school" ON public.student_payments FOR SELECT TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));
CREATE POLICY "Admins can manage student_payments in their school" ON public.student_payments FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

-- STUDENT_BURSARIES
DROP POLICY IF EXISTS "Authenticated users can read student_bursaries" ON public.student_bursaries;
DROP POLICY IF EXISTS "Admins can manage student_bursaries" ON public.student_bursaries;
CREATE POLICY "Users can read student_bursaries in their school" ON public.student_bursaries FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Admins can manage student_bursaries in their school" ON public.student_bursaries FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

-- FEE_AUDIT_LOGS
DROP POLICY IF EXISTS "Authenticated users can read fee_audit_logs" ON public.fee_audit_logs;
DROP POLICY IF EXISTS "Admins can manage fee_audit_logs" ON public.fee_audit_logs;
CREATE POLICY "Users can read fee_audit_logs in their school" ON public.fee_audit_logs FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Admins can manage fee_audit_logs in their school" ON public.fee_audit_logs FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

-- TEACHER_SUBJECTS
DROP POLICY IF EXISTS "Admins can manage all teacher subjects" ON public.teacher_subjects;
DROP POLICY IF EXISTS "Teachers can view their assigned subjects" ON public.teacher_subjects;
CREATE POLICY "Users can read teacher_subjects in their school" ON public.teacher_subjects FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Admins can manage teacher_subjects in their school" ON public.teacher_subjects FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

-- PENDING_SUBMISSIONS
DROP POLICY IF EXISTS "Admins can manage all submissions" ON public.pending_submissions;
DROP POLICY IF EXISTS "Teachers can create submissions for their subjects" ON public.pending_submissions;
DROP POLICY IF EXISTS "Teachers can update their pending submissions" ON public.pending_submissions;
DROP POLICY IF EXISTS "Teachers can view their own submissions" ON public.pending_submissions;
CREATE POLICY "Users can read submissions in their school" ON public.pending_submissions FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Staff can manage submissions in their school" ON public.pending_submissions FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher', 'headteacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher', 'headteacher')));

-- 9. Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, school_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'teacher'),
    (NEW.raw_user_meta_data ->> 'school_id')::uuid
  );
  RETURN NEW;
END;
$$;

-- 10. School registration function
CREATE OR REPLACE FUNCTION public.register_school(
  p_school_name text, p_slug text, p_email text DEFAULT NULL, p_address text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_school_id uuid;
BEGIN
  INSERT INTO public.schools (school_name, slug, email, address)
  VALUES (p_school_name, lower(p_slug), p_email, p_address)
  RETURNING id INTO new_school_id;
  RETURN new_school_id;
END;
$$;
