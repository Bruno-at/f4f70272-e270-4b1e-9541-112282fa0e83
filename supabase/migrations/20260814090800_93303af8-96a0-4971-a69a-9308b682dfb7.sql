-- Report templates uploaded by schools
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'o-level',
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  page_width_mm NUMERIC NOT NULL DEFAULT 210,
  page_height_mm NUMERIC NOT NULL DEFAULT 297,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_templates TO authenticated;
GRANT ALL ON public.report_templates TO service_role;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can read templates" ON public.report_templates
FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Staff can insert templates" ON public.report_templates
FOR INSERT TO authenticated WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','headteacher','teacher')));
CREATE POLICY "Staff can update templates" ON public.report_templates
FOR UPDATE TO authenticated USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','headteacher','teacher')));
CREATE POLICY "Admins can delete templates" ON public.report_templates
FOR DELETE TO authenticated USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','headteacher')));

-- Custom fields discovered on uploaded templates that the system has no source for
CREATE TABLE public.template_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'student',
  default_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, field_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_custom_fields TO authenticated;
GRANT ALL ON public.template_custom_fields TO service_role;
ALTER TABLE public.template_custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School members can read custom fields" ON public.template_custom_fields
FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Staff can write custom fields" ON public.template_custom_fields
FOR ALL TO authenticated USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','headteacher','teacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','headteacher','teacher')));

-- Per-student (optionally per-term) values for those custom fields
CREATE TABLE public.student_custom_field_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID,
  field_key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, term_id, field_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_custom_field_values TO authenticated;
GRANT ALL ON public.student_custom_field_values TO service_role;
ALTER TABLE public.student_custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School members can read custom values" ON public.student_custom_field_values
FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Staff can write custom values" ON public.student_custom_field_values
FOR ALL TO authenticated USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','headteacher','teacher')))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','headteacher','teacher')));

CREATE INDEX idx_report_templates_school ON public.report_templates(school_id);
CREATE INDEX idx_custom_values_student ON public.student_custom_field_values(student_id);

-- Only one active template per school + level
CREATE UNIQUE INDEX idx_one_active_template ON public.report_templates(school_id, level) WHERE is_active;

CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON public.report_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();