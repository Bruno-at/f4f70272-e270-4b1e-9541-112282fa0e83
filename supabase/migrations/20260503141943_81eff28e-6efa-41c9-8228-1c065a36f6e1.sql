
-- Step 1: Build canonical subject mapping (one subject per school_id + subject_name)
CREATE TEMP TABLE _subject_canon AS
SELECT s.id AS old_id,
       (SELECT s2.id FROM public.subjects s2
         WHERE s2.school_id IS NOT DISTINCT FROM s.school_id
           AND s2.subject_name = s.subject_name
         ORDER BY s2.created_at ASC, s2.id ASC LIMIT 1) AS canon_id,
       s.class_id, s.school_id
FROM public.subjects s;

-- Step 2: Re-point student_marks to canonical subject, then dedupe
UPDATE public.student_marks sm
SET subject_id = m.canon_id
FROM _subject_canon m
WHERE sm.subject_id = m.old_id AND sm.subject_id <> m.canon_id;

DELETE FROM public.student_marks a
USING public.student_marks b
WHERE a.ctid < b.ctid
  AND a.student_id = b.student_id
  AND a.subject_id = b.subject_id
  AND a.term_id = b.term_id;

-- Step 3: Re-point teacher_subjects, then dedupe
UPDATE public.teacher_subjects ts
SET subject_id = m.canon_id
FROM _subject_canon m
WHERE ts.subject_id = m.old_id AND ts.subject_id <> m.canon_id;

DELETE FROM public.teacher_subjects a
USING public.teacher_subjects b
WHERE a.ctid < b.ctid
  AND a.teacher_id = b.teacher_id
  AND a.subject_id = b.subject_id;

-- Step 4: Create class_subjects relation table
CREATE TABLE public.class_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  school_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, subject_id)
);

ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read class_subjects in their school"
ON public.class_subjects FOR SELECT TO authenticated
USING (school_id = public.get_user_school_id());

CREATE POLICY "Staff can manage class_subjects in their school"
ON public.class_subjects FOR ALL TO authenticated
USING (school_id = public.get_user_school_id() AND EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid()
    AND role = ANY (ARRAY['admin'::app_role, 'teacher'::app_role, 'headteacher'::app_role])))
WITH CHECK (school_id = public.get_user_school_id() AND EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid()
    AND role = ANY (ARRAY['admin'::app_role, 'teacher'::app_role, 'headteacher'::app_role])));

-- Step 5: Populate class_subjects from existing rows
INSERT INTO public.class_subjects (class_id, subject_id, school_id)
SELECT DISTINCT m.class_id, m.canon_id, m.school_id
FROM _subject_canon m
WHERE m.class_id IS NOT NULL
ON CONFLICT (class_id, subject_id) DO NOTHING;

-- Step 6: Delete duplicate (non-canonical) subjects
DELETE FROM public.subjects s
WHERE s.id IN (SELECT old_id FROM _subject_canon WHERE old_id <> canon_id);

-- Step 7: Drop class_id from subjects, add uniqueness
ALTER TABLE public.subjects DROP COLUMN class_id;
ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_school_name_unique UNIQUE (school_id, subject_name);
