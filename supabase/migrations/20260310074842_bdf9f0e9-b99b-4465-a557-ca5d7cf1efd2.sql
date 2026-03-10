
ALTER TABLE public.school_info 
ADD COLUMN IF NOT EXISTS stamp_position_x numeric DEFAULT 75,
ADD COLUMN IF NOT EXISTS stamp_position_y numeric DEFAULT 80,
ADD COLUMN IF NOT EXISTS stamp_size numeric DEFAULT 60,
ADD COLUMN IF NOT EXISTS stamp_opacity numeric DEFAULT 70;
