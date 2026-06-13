
-- Add class_id to teacher_subjects to make assignments class-specific.
ALTER TABLE public.teacher_subjects
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE;

-- Drop old unique constraints if any (teacher_id, subject_id) and create a new composite one
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.teacher_subjects'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.teacher_subjects DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS teacher_subjects_unique_assignment
  ON public.teacher_subjects (teacher_id, subject_id, class_id);

CREATE INDEX IF NOT EXISTS teacher_subjects_class_id_idx
  ON public.teacher_subjects (class_id);
