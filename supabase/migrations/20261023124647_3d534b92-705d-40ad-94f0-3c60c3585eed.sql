ALTER TABLE public.report_templates ALTER COLUMN level DROP DEFAULT;
ALTER TABLE public.report_templates ADD CONSTRAINT report_templates_education_level_valid CHECK (level IN ('o-level', 'a-level'));