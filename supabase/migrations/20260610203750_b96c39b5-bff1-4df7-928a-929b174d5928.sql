ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS teacher_code text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS email text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_school_teacher_code_unique
  ON public.profiles (school_id, teacher_code)
  WHERE teacher_code IS NOT NULL;