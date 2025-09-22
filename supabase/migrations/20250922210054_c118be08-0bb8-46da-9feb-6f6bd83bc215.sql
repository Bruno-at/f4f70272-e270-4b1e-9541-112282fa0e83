-- Create grading_systems table
CREATE TABLE public.grading_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade_name TEXT NOT NULL,
  min_percentage NUMERIC NOT NULL,
  max_percentage NUMERIC NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comment_templates table
CREATE TABLE public.comment_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_type TEXT NOT NULL CHECK (comment_type IN ('class_teacher', 'headteacher')),
  min_average NUMERIC NOT NULL,
  max_average NUMERIC NOT NULL,
  comment_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on grading_systems" 
ON public.grading_systems 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on comment_templates" 
ON public.comment_templates 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Insert default grading system
INSERT INTO public.grading_systems (grade_name, min_percentage, max_percentage, description) VALUES
('A', 80, 100, 'Excellent'),
('B', 70, 79, 'Good'),
('C', 60, 69, 'Satisfactory'),
('D', 50, 59, 'Fair'),
('E', 0, 49, 'Poor');

-- Insert default comment templates for class teacher
INSERT INTO public.comment_templates (comment_type, min_average, max_average, comment_text) VALUES
('class_teacher', 80, 100, 'Excellent performance! Keep up the outstanding work.'),
('class_teacher', 70, 79, 'Good work shown. Continue to strive for excellence.'),
('class_teacher', 60, 69, 'Satisfactory performance. There is room for improvement.'),
('class_teacher', 50, 59, 'Fair performance. More effort needed to improve.'),
('class_teacher', 0, 49, 'Poor performance. Serious improvement needed.');

-- Insert default comment templates for headteacher
INSERT INTO public.comment_templates (comment_type, min_average, max_average, comment_text) VALUES
('headteacher', 80, 100, 'Congratulations on your excellent academic achievement. You are a role model for other students.'),
('headteacher', 70, 79, 'Well done on your good performance. Continue working hard to achieve even better results.'),
('headteacher', 60, 69, 'Your performance is satisfactory. I encourage you to put in more effort to reach your full potential.'),
('headteacher', 50, 59, 'Your performance needs improvement. Please seek help from your teachers and work harder.'),
('headteacher', 0, 49, 'Your performance is concerning. Please meet with your teachers and parents to discuss improvement strategies.');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_grading_systems_updated_at
BEFORE UPDATE ON public.grading_systems
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comment_templates_updated_at
BEFORE UPDATE ON public.comment_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();