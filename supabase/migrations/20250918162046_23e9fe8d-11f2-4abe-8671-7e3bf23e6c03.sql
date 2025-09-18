-- Add proper foreign key relationships and fix database issues

-- First, let's add foreign key constraints to ensure data integrity
ALTER TABLE students 
ADD CONSTRAINT fk_students_class_id 
FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT;

ALTER TABLE subjects 
ADD CONSTRAINT fk_subjects_class_id 
FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT;

ALTER TABLE student_marks 
ADD CONSTRAINT fk_student_marks_student_id 
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE student_marks 
ADD CONSTRAINT fk_student_marks_subject_id 
FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE student_marks 
ADD CONSTRAINT fk_student_marks_term_id 
FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE;

ALTER TABLE report_cards 
ADD CONSTRAINT fk_report_cards_student_id 
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE report_cards 
ADD CONSTRAINT fk_report_cards_term_id 
FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE;

-- Add some sample subjects for the existing classes
INSERT INTO subjects (subject_name, class_id, max_marks) VALUES
('Mathematics', (SELECT id FROM classes WHERE class_name = 'Grade 7' LIMIT 1), 100),
('English', (SELECT id FROM classes WHERE class_name = 'Grade 7' LIMIT 1), 100),
('Science', (SELECT id FROM classes WHERE class_name = 'Grade 7' LIMIT 1), 100),
('Social Studies', (SELECT id FROM classes WHERE class_name = 'Grade 7' LIMIT 1), 100),
('Art', (SELECT id FROM classes WHERE class_name = 'Grade 7' LIMIT 1), 50),
('Physical Education', (SELECT id FROM classes WHERE class_name = 'Grade 7' LIMIT 1), 50),

('Mathematics', (SELECT id FROM classes WHERE class_name = 'Grade 8' LIMIT 1), 100),
('English', (SELECT id FROM classes WHERE class_name = 'Grade 8' LIMIT 1), 100),
('Science', (SELECT id FROM classes WHERE class_name = 'Grade 8' LIMIT 1), 100),
('Social Studies', (SELECT id FROM classes WHERE class_name = 'Grade 8' LIMIT 1), 100),
('Art', (SELECT id FROM classes WHERE class_name = 'Grade 8' LIMIT 1), 50),
('Physical Education', (SELECT id FROM classes WHERE class_name = 'Grade 8' LIMIT 1), 50);