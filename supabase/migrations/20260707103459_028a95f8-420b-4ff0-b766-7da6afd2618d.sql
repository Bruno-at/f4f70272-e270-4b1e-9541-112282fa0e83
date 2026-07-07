ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS report_font text NOT NULL DEFAULT 'helvetica',
  ADD COLUMN IF NOT EXISTS o_level_template public.template_type NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS a_level_template public.template_type NOT NULL DEFAULT 'classic';