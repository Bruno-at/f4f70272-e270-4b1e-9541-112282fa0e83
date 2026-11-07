CREATE TABLE public.report_card_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  data_type text NOT NULL DEFAULT 'text',
  source text NOT NULL DEFAULT 'manual',
  entry_location text NOT NULL DEFAULT 'student_registration',
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, field_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_card_fields TO authenticated;
GRANT ALL ON public.report_card_fields TO service_role;
ALTER TABLE public.report_card_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view school fields" ON public.report_card_fields FOR SELECT TO authenticated USING (school_id = public.get_user_school_id());
CREATE POLICY "Admins insert fields" ON public.report_card_fields FOR INSERT TO authenticated WITH CHECK (school_id = public.get_user_school_id() AND (public.current_user_has_role('admin') OR public.current_user_has_role('headteacher')));
CREATE POLICY "Admins update fields" ON public.report_card_fields FOR UPDATE TO authenticated USING (school_id = public.get_user_school_id() AND (public.current_user_has_role('admin') OR public.current_user_has_role('headteacher'))) WITH CHECK (school_id = public.get_user_school_id());
CREATE POLICY "Admins delete custom fields" ON public.report_card_fields FOR DELETE TO authenticated USING (school_id = public.get_user_school_id() AND is_system = false AND (public.current_user_has_role('admin') OR public.current_user_has_role('headteacher')));

CREATE TABLE public.report_card_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.report_card_fields(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id uuid REFERENCES public.terms(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX report_card_field_values_uniq ON public.report_card_field_values (field_id, student_id, COALESCE(term_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_card_field_values TO authenticated;
GRANT ALL ON public.report_card_field_values TO service_role;
ALTER TABLE public.report_card_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage school field values" ON public.report_card_field_values FOR ALL TO authenticated USING (school_id = public.get_user_school_id()) WITH CHECK (school_id = public.get_user_school_id());

CREATE OR REPLACE FUNCTION public.validate_report_card_field()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN RAISE EXCEPTION 'System fields cannot be deleted; deactivate them instead'; END IF;
    RETURN OLD;
  END IF;
  NEW.label := btrim(NEW.label);
  IF length(NEW.label) = 0 OR length(NEW.label) > 120 THEN RAISE EXCEPTION 'Label is required (max 120 characters)'; END IF;
  IF NEW.field_key !~ '^[a-z][a-z0-9_]{0,59}$' THEN RAISE EXCEPTION 'Field name must use lowercase letters, numbers and underscores'; END IF;
  IF NEW.data_type NOT IN ('text','number','date','grade','comment','checkbox','percentage','select') THEN RAISE EXCEPTION 'Invalid field type'; END IF;
  IF NEW.source NOT IN ('manual','student_profile','marks_entry','assessment','academic_settings','school_profile','calculated') THEN RAISE EXCEPTION 'Invalid data source'; END IF;
  IF NEW.entry_location NOT IN ('student_registration','marks_entry','none') THEN RAISE EXCEPTION 'Invalid entry location'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_system AND (NEW.field_key <> OLD.field_key OR NEW.data_type <> OLD.data_type OR NEW.source <> OLD.source OR NEW.entry_location <> OLD.entry_location OR NOT NEW.is_system) THEN
      RAISE EXCEPTION 'Only the label, required and active settings of a system field can change';
    END IF;
    IF NOT OLD.is_system AND NEW.is_system THEN RAISE EXCEPTION 'Custom fields cannot become system fields'; END IF;
    IF NEW.field_key <> OLD.field_key THEN RAISE EXCEPTION 'Field name cannot change after creation'; END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER validate_report_card_field BEFORE INSERT OR UPDATE OR DELETE ON public.report_card_fields FOR EACH ROW EXECUTE FUNCTION public.validate_report_card_field();

CREATE OR REPLACE FUNCTION public.validate_report_card_field_value()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE f public.report_card_fields;
BEGIN
  SELECT * INTO f FROM public.report_card_fields WHERE id = NEW.field_id AND school_id = NEW.school_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Field belongs to another school'; END IF;
  IF f.is_system THEN RAISE EXCEPTION 'System field values come from their own records'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = NEW.student_id AND school_id = NEW.school_id) THEN RAISE EXCEPTION 'Student belongs to another school'; END IF;
  IF NEW.term_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.terms WHERE id = NEW.term_id AND school_id = NEW.school_id) THEN RAISE EXCEPTION 'Term belongs to another school'; END IF;
  IF NEW.value IS NOT NULL AND NEW.value <> '' THEN
    IF f.data_type = 'number' THEN PERFORM NEW.value::numeric;
    ELSIF f.data_type = 'percentage' AND (NEW.value::numeric < 0 OR NEW.value::numeric > 100) THEN RAISE EXCEPTION 'Percentage must be between 0 and 100';
    ELSIF f.data_type = 'date' THEN PERFORM NEW.value::date;
    ELSIF f.data_type = 'checkbox' AND NEW.value NOT IN ('true','false') THEN RAISE EXCEPTION 'Checkbox must be yes or no';
    END IF;
    IF length(NEW.value) > 2000 THEN RAISE EXCEPTION 'Value is too long'; END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER validate_report_card_field_value BEFORE INSERT OR UPDATE ON public.report_card_field_values FOR EACH ROW EXECUTE FUNCTION public.validate_report_card_field_value();