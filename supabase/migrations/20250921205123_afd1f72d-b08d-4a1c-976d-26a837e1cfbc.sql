-- Add student photo support to students table
ALTER TABLE students ADD COLUMN photo_url TEXT;
ALTER TABLE students ADD COLUMN age INTEGER;

-- Update student_marks table to support detailed O-level assessment structure
ALTER TABLE student_marks DROP COLUMN marks_obtained;
ALTER TABLE student_marks DROP COLUMN grade;
ALTER TABLE student_marks DROP COLUMN remarks;

-- Add new assessment columns
ALTER TABLE student_marks ADD COLUMN a1_score DECIMAL(3,1);
ALTER TABLE student_marks ADD COLUMN a2_score DECIMAL(3,1);
ALTER TABLE student_marks ADD COLUMN a3_score DECIMAL(3,1);
ALTER TABLE student_marks ADD COLUMN average_score DECIMAL(3,1);
ALTER TABLE student_marks ADD COLUMN twenty_percent DECIMAL(4,1);
ALTER TABLE student_marks ADD COLUMN eighty_percent DECIMAL(4,1);
ALTER TABLE student_marks ADD COLUMN hundred_percent DECIMAL(4,1);
ALTER TABLE student_marks ADD COLUMN identifier INTEGER;
ALTER TABLE student_marks ADD COLUMN final_grade TEXT;
ALTER TABLE student_marks ADD COLUMN achievement_level TEXT;
ALTER TABLE student_marks ADD COLUMN teacher_initials TEXT;
ALTER TABLE student_marks ADD COLUMN subject_code TEXT;

-- Add subject codes to subjects table
ALTER TABLE subjects ADD COLUMN subject_code TEXT;

-- Update report_cards table to support new fields
ALTER TABLE report_cards ADD COLUMN overall_identifier INTEGER;
ALTER TABLE report_cards ADD COLUMN achievement_level TEXT;
ALTER TABLE report_cards ADD COLUMN printed_date DATE DEFAULT CURRENT_DATE;

-- Create assessment_types table for flexibility
CREATE TABLE assessment_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_name TEXT NOT NULL,
  weight_percentage INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default assessment types
INSERT INTO assessment_types (type_name, weight_percentage, description) VALUES
('A1', 0, 'Average Chapter Assessment'),
('A2', 0, 'Coursework Assessment'),
('A3', 0, 'Project Assessment'),
('20%', 20, 'Continuous Assessment'),
('80%', 80, 'End of Term Assessment'),
('100%', 100, 'Final Assessment');

-- Enable RLS on new table
ALTER TABLE assessment_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for assessment_types
CREATE POLICY "Allow all operations on assessment_types" 
ON assessment_types 
FOR ALL 
USING (true) 
WITH CHECK (true);