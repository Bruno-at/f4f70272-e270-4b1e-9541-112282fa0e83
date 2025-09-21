export interface SchoolInfo {
  id: string;
  school_name: string;
  motto?: string;
  location?: string;
  po_box?: string;
  telephone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Term {
  id: string;
  term_name: string;
  year: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Class {
  id: string;
  class_name: string;
  section?: string;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  gender: string;
  class_id: string;
  house?: string;
  student_id?: string;
  photo_url?: string;
  age?: number;
  created_at: string;
  updated_at: string;
  classes?: Class;
}

export interface Subject {
  id: string;
  subject_name: string;
  subject_code?: string;
  class_id: string;
  max_marks: number;
  created_at: string;
}

export interface StudentMark {
  id: string;
  student_id: string;
  subject_id: string;
  term_id: string;
  subject_code?: string;
  a1_score?: number;
  a2_score?: number;
  a3_score?: number;
  average_score?: number;
  twenty_percent?: number;
  eighty_percent?: number;
  hundred_percent?: number;
  identifier?: number;
  final_grade?: string;
  achievement_level?: string;
  teacher_initials?: string;
  created_at: string;
  subjects?: Subject;
  students?: {
    name: string;
    classes?: {
      id: string;
      class_name: string;
      section?: string;
    };
  };
}

export interface ReportCard {
  id: string;
  student_id: string;
  term_id: string;
  overall_average?: number;
  overall_grade?: string;
  overall_identifier?: number;
  achievement_level?: string;
  class_teacher_comment?: string;
  headteacher_comment?: string;
  fees_balance?: number;
  generated_at?: string;
  printed_date?: string;
  created_at: string;
  students?: Student;
  terms?: Term;
}

export interface AssessmentType {
  id: string;
  type_name: string;
  weight_percentage: number;
  description?: string;
  created_at: string;
}

export interface StudentCSVData {
  name: string;
  gender: string;
  class: string;
  section?: string;
  house?: string;
  student_id?: string;
  [subject: string]: any; // For dynamic subject marks
}