-- 1) student_subjects: per-student subject assignments
CREATE TABLE IF NOT EXISTS public.student_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  school_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON public.student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_school ON public.student_subjects(school_id);

ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read student_subjects in their school"
  ON public.student_subjects FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id());

CREATE POLICY "Staff can manage student_subjects in their school"
  ON public.student_subjects FOR ALL TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND EXISTS (SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','teacher','headteacher'))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND EXISTS (SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','teacher','headteacher'))
  );

-- 2) Unique constraint on student_marks for upsert (student + subject + term)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_marks_student_subject_term_unique'
  ) THEN
    -- Remove duplicates first, keeping the most recent
    DELETE FROM public.student_marks sm
    USING public.student_marks sm2
    WHERE sm.student_id = sm2.student_id
      AND sm.subject_id = sm2.subject_id
      AND sm.term_id = sm2.term_id
      AND sm.created_at < sm2.created_at;

    ALTER TABLE public.student_marks
      ADD CONSTRAINT student_marks_student_subject_term_unique
      UNIQUE (student_id, subject_id, term_id);
  END IF;
END $$;