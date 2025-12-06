-- Add class_teacher_id to classes table to assign a teacher to each class
ALTER TABLE public.classes 
ADD COLUMN class_teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add signature_url to profiles table to store teacher's digital signature
ALTER TABLE public.profiles 
ADD COLUMN signature_url text;

-- Create index for faster lookups
CREATE INDEX idx_classes_class_teacher_id ON public.classes(class_teacher_id);