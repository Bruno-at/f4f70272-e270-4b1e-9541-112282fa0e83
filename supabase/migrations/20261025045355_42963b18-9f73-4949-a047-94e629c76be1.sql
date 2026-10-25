ALTER TABLE public.template_custom_fields ADD COLUMN template_id uuid REFERENCES public.report_templates(id) ON DELETE CASCADE, ADD COLUMN data_type text NOT NULL DEFAULT 'text', ADD COLUMN is_active boolean NOT NULL DEFAULT true, ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.template_custom_fields DROP CONSTRAINT template_custom_fields_school_id_field_key_key;
CREATE UNIQUE INDEX custom_fields_legacy_key ON public.template_custom_fields(school_id,field_key) WHERE template_id IS NULL;
CREATE UNIQUE INDEX custom_fields_template_key ON public.template_custom_fields(template_id,field_key);
CREATE TABLE public.template_field_values (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE, field_id uuid NOT NULL REFERENCES public.template_custom_fields(id) ON DELETE CASCADE, term_id uuid REFERENCES public.terms(id) ON DELETE CASCADE, student_id uuid REFERENCES public.students(id) ON DELETE CASCADE, value text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE NULLS NOT DISTINCT(field_id,term_id,student_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.template_field_values TO authenticated;
GRANT ALL ON public.template_field_values TO service_role;
ALTER TABLE public.template_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School members read template values" ON public.template_field_values FOR SELECT TO authenticated USING (school_id=public.get_user_school_id());
CREATE POLICY "School staff manage template values" ON public.template_field_values FOR ALL TO authenticated USING (school_id=public.get_user_school_id() AND (public.current_user_has_role('admin') OR public.current_user_has_role('headteacher') OR public.current_user_has_role('teacher'))) WITH CHECK (school_id=public.get_user_school_id() AND (public.current_user_has_role('admin') OR public.current_user_has_role('headteacher') OR public.current_user_has_role('teacher')));
CREATE FUNCTION public.validate_template_extra_field() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE def public.template_custom_fields;
BEGIN
 IF TG_TABLE_NAME='template_custom_fields' THEN
  IF NEW.data_type NOT IN ('text','number','date','boolean') OR NEW.scope NOT IN ('school','student') OR length(trim(NEW.label))=0 THEN RAISE EXCEPTION 'Invalid field configuration'; END IF;
  IF NEW.template_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.report_templates WHERE id=NEW.template_id AND school_id=NEW.school_id) THEN RAISE EXCEPTION 'Template belongs to another school'; END IF;
 ELSE
  SELECT * INTO def FROM public.template_custom_fields WHERE id=NEW.field_id AND school_id=NEW.school_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Field belongs to another school'; END IF;
  IF (def.scope='school' AND NEW.student_id IS NOT NULL) OR (def.scope='student' AND NEW.student_id IS NULL) THEN RAISE EXCEPTION 'Value does not match field scope'; END IF;
  IF NEW.student_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.students WHERE id=NEW.student_id AND school_id=NEW.school_id) THEN RAISE EXCEPTION 'Student belongs to another school'; END IF;
  IF NEW.term_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.terms WHERE id=NEW.term_id AND school_id=NEW.school_id) THEN RAISE EXCEPTION 'Period belongs to another school'; END IF;
  IF NEW.value IS NOT NULL AND NEW.value<>'' THEN
   IF def.data_type='number' THEN PERFORM NEW.value::numeric;
   ELSIF def.data_type='date' THEN PERFORM NEW.value::date;
   ELSIF def.data_type='boolean' AND NEW.value NOT IN ('true','false') THEN RAISE EXCEPTION 'Use yes or no'; END IF;
  END IF;
 END IF;
 NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER validate_extra_field BEFORE INSERT OR UPDATE ON public.template_custom_fields FOR EACH ROW EXECUTE FUNCTION public.validate_template_extra_field();
CREATE TRIGGER validate_extra_value BEFORE INSERT OR UPDATE ON public.template_field_values FOR EACH ROW EXECUTE FUNCTION public.validate_template_extra_field();