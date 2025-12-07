-- Add class_signature_url column to classes table for class-specific teacher signatures
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS class_signature_url TEXT;

-- Add headteacher_signature_url column to school_info table
ALTER TABLE public.school_info ADD COLUMN IF NOT EXISTS headteacher_signature_url TEXT;