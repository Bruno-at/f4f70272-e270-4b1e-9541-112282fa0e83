ALTER TABLE public.template_custom_fields ADD COLUMN IF NOT EXISTS description text;
CREATE OR REPLACE FUNCTION public.validate_template_extra_field() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE def public.template_custom_fields;
BEGIN
 IF TG_TABLE_NAME='template_custom_fields' THEN
  IF NEW.data_type NOT IN ('text','number','date','boolean','multiline','percentage') OR NEW.scope NOT IN ('school','student') OR length(trim(NEW.label))=0 THEN RAISE EXCEPTION 'Invalid field configuration'; END IF;
  IF NEW.description IS NOT NULL AND length(NEW.description) > 500 THEN RAISE EXCEPTION 'Description is too long'; END IF;
  IF NEW.template_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.report_templates WHERE id=NEW.template_id AND school_id=NEW.school_id) THEN RAISE EXCEPTION 'Template belongs to another school'; END IF;
 ELSE
  SELECT * INTO def FROM public.template_custom_fields WHERE id=NEW.field_id AND school_id=NEW.school_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Field belongs to another school'; END IF;
  IF (def.scope='school' AND NEW.student_id IS NOT NULL) OR (def.scope='student' AND NEW.student_id IS NULL) THEN RAISE EXCEPTION 'Value does not match field scope'; END IF;
  IF NEW.student_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.students WHERE id=NEW.student_id AND school_id=NEW.school_id) THEN RAISE EXCEPTION 'Student belongs to another school'; END IF;
  IF NEW.term_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.terms WHERE id=NEW.term_id AND school_id=NEW.school_id) THEN RAISE EXCEPTION 'Period belongs to another school'; END IF;
  IF NEW.value IS NOT NULL AND NEW.value<>'' THEN
   IF def.data_type='number' THEN PERFORM NEW.value::numeric;
   ELSIF def.data_type='percentage' THEN
     IF NEW.value::numeric < 0 OR NEW.value::numeric > 100 THEN RAISE EXCEPTION 'Percentage must be between 0 and 100'; END IF;
   ELSIF def.data_type='date' THEN PERFORM NEW.value::date;
   ELSIF def.data_type='boolean' AND NEW.value NOT IN ('true','false') THEN RAISE EXCEPTION 'Use yes or no'; END IF;
  END IF;
 END IF;
 NEW.updated_at=now(); RETURN NEW;
END $$;