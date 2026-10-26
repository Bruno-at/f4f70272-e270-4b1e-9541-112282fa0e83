CREATE TABLE public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  year integer NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, year)
);
CREATE UNIQUE INDEX academic_years_one_active ON public.academic_years(school_id) WHERE is_active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_years TO authenticated;
GRANT ALL ON public.academic_years TO service_role;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read academic years in their school" ON public.academic_years FOR SELECT TO authenticated USING (school_id = get_user_school_id());
CREATE POLICY "Admins can manage academic years in their school" ON public.academic_years FOR ALL TO authenticated
USING (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin'::app_role,'headteacher'::app_role])))
WITH CHECK (school_id = get_user_school_id() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin'::app_role,'headteacher'::app_role])));
CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON public.academic_years FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Preserve existing records: create a year row for every year already used by terms
INSERT INTO public.academic_years (school_id, year)
SELECT DISTINCT school_id, year FROM public.terms WHERE school_id IS NOT NULL ON CONFLICT DO NOTHING;
UPDATE public.academic_years ay SET is_active = true
FROM public.terms t WHERE t.school_id = ay.school_id AND t.year = ay.year AND t.is_active;