-- 1. Cascade cleanup when an assignment is removed
CREATE OR REPLACE FUNCTION public.cleanup_unassigned_student_subject()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.student_marks WHERE student_id = OLD.student_id AND subject_id = OLD.subject_id;
  DELETE FROM public.pending_submissions WHERE student_id = OLD.student_id AND subject_id = OLD.subject_id;
  RETURN OLD;
END $$;
REVOKE EXECUTE ON FUNCTION public.cleanup_unassigned_student_subject() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS cleanup_unassigned_student_subject ON public.student_subjects;
CREATE TRIGGER cleanup_unassigned_student_subject
AFTER DELETE ON public.student_subjects
FOR EACH ROW EXECUTE FUNCTION public.cleanup_unassigned_student_subject();

-- 2. Block marks for subjects not assigned to the student
CREATE OR REPLACE FUNCTION public.ensure_mark_subject_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.student_subjects WHERE student_id = NEW.student_id AND subject_id = NEW.subject_id) THEN
    RAISE EXCEPTION 'This subject is not assigned to this student';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.ensure_mark_subject_assigned() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ensure_mark_subject_assigned ON public.student_marks;
CREATE TRIGGER ensure_mark_subject_assigned
BEFORE INSERT OR UPDATE OF student_id, subject_id ON public.student_marks
FOR EACH ROW EXECUTE FUNCTION public.ensure_mark_subject_assigned();

DROP TRIGGER IF EXISTS ensure_submission_subject_assigned ON public.pending_submissions;
CREATE TRIGGER ensure_submission_subject_assigned
BEFORE INSERT OR UPDATE OF student_id, subject_id ON public.pending_submissions
FOR EACH ROW EXECUTE FUNCTION public.ensure_mark_subject_assigned();

-- 3. Atomic save of a student's subject list
CREATE OR REPLACE FUNCTION public.set_student_subjects(p_student_id uuid, p_subject_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_school uuid;
  caller_role public.app_role;
  student_school uuid;
  wanted uuid[] := COALESCE(p_subject_ids, ARRAY[]::uuid[]);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT school_id, role INTO caller_school, caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_school IS NULL OR caller_role NOT IN ('admin','headteacher','teacher') THEN
    RAISE EXCEPTION 'Only school staff can change subject assignments';
  END IF;
  SELECT school_id INTO student_school FROM public.students WHERE id = p_student_id;
  IF student_school IS DISTINCT FROM caller_school THEN RAISE EXCEPTION 'Student not found'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(wanted) w(id) WHERE NOT EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = w.id AND s.school_id = caller_school)) THEN
    RAISE EXCEPTION 'Subject belongs to another school';
  END IF;

  DELETE FROM public.student_subjects WHERE student_id = p_student_id AND NOT (subject_id = ANY (wanted));

  INSERT INTO public.student_subjects (student_id, subject_id, school_id)
  SELECT p_student_id, w.id, caller_school FROM (SELECT DISTINCT unnest(wanted) AS id) w
  ON CONFLICT (student_id, subject_id) DO NOTHING;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_student_subjects(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_student_subjects(uuid, uuid[]) TO authenticated;

-- 4. Remove existing leftovers
DELETE FROM public.student_marks m
WHERE NOT EXISTS (SELECT 1 FROM public.student_subjects s WHERE s.student_id = m.student_id AND s.subject_id = m.subject_id);
DELETE FROM public.pending_submissions p
WHERE NOT EXISTS (SELECT 1 FROM public.student_subjects s WHERE s.student_id = p.student_id AND s.subject_id = p.subject_id);