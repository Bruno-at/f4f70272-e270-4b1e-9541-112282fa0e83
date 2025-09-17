-- Create school_info table for static school data
CREATE TABLE public.school_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL,
  motto TEXT,
  location TEXT,
  po_box TEXT,
  telephone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create terms table
CREATE TABLE public.terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name TEXT NOT NULL,
  section TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
  class_id UUID REFERENCES public.classes(id) NOT NULL,
  house TEXT,
  student_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_name TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) NOT NULL,
  max_marks INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_marks table
CREATE TABLE public.student_marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) NOT NULL,
  term_id UUID REFERENCES public.terms(id) NOT NULL,
  marks_obtained INTEGER NOT NULL,
  grade TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, term_id)
);

-- Create report_cards table
CREATE TABLE public.report_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) NOT NULL,
  term_id UUID REFERENCES public.terms(id) NOT NULL,
  overall_average DECIMAL(5,2),
  overall_grade TEXT,
  class_teacher_comment TEXT,
  headteacher_comment TEXT,
  fees_balance DECIMAL(10,2) DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, term_id)
);

-- Enable Row Level Security
ALTER TABLE public.school_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing public access for now - can be restricted later)
CREATE POLICY "Allow all operations on school_info" ON public.school_info FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on terms" ON public.terms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on student_marks" ON public.student_marks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on report_cards" ON public.report_cards FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_school_info_updated_at
  BEFORE UPDATE ON public.school_info
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample school info
INSERT INTO public.school_info (school_name, motto, location, po_box, telephone, email, website)
VALUES (
  'Excellence Academy',
  'Excellence in Education',
  'Central District',
  'P.O. Box 1234',
  '+1-234-567-8900',
  'info@excellenceacademy.edu',
  'www.excellenceacademy.edu'
);

-- Insert sample term
INSERT INTO public.terms (term_name, year, start_date, end_date, is_active)
VALUES ('First Term', 2024, '2024-01-15', '2024-04-15', true);

-- Insert sample classes
INSERT INTO public.classes (class_name, section)
VALUES 
  ('Grade 7', 'A'),
  ('Grade 7', 'B'),
  ('Grade 8', 'A'),
  ('Grade 8', 'B');