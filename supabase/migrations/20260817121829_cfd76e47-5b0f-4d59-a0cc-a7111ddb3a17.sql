ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS watermark_url text,
  ADD COLUMN IF NOT EXISTS watermark_position_x numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS watermark_position_y numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS watermark_size numeric NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS watermark_opacity numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS watermark_rotation numeric NOT NULL DEFAULT 0;