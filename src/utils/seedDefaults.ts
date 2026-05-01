import { supabase } from '@/integrations/supabase/client';

export type SeedSection = 'classes' | 'terms' | 'subjects' | 'grades' | 'comments';

export interface SeedSectionResult {
  inserted: number;
  alreadyComplete: boolean;
}

const DEFAULT_CLASSES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const DEFAULT_SUBJECTS = [
  'Mathematics', 'English', 'Biology', 'Chemistry', 'Physics',
  'Geography', 'History', 'Literature', 'Kiswahili', 'ICT',
  'Fine Art', 'Commerce', 'Entrepreneurship',
  'Christian Religious Education', 'Islamic Religious Education',
  'Luganda', 'Physical Education', 'Agriculture'
];
const DEFAULT_GRADES = [
  { grade_name: 'A', min_percentage: 80, max_percentage: 100, description: 'Excellent' },
  { grade_name: 'B', min_percentage: 70, max_percentage: 79, description: 'Very Good' },
  { grade_name: 'C', min_percentage: 60, max_percentage: 69, description: 'Good' },
  { grade_name: 'D', min_percentage: 50, max_percentage: 59, description: 'Pass' },
  { grade_name: 'F', min_percentage: 0, max_percentage: 49, description: 'Fail' },
];
const DEFAULT_TEACHER_COMMENTS = [
  { min: 80, max: 100, text: 'Outstanding performance. Keep up the excellent work!' },
  { min: 70, max: 79, text: 'Very good effort. Continue working hard.' },
  { min: 60, max: 69, text: 'Good performance. Aim higher next term.' },
  { min: 50, max: 59, text: 'Fair performance. More effort is required.' },
  { min: 0, max: 49, text: 'Needs serious improvement. Please consult your teachers.' },
];
const DEFAULT_HEAD_COMMENTS = [
  { min: 80, max: 100, text: 'Excellent results. Congratulations from the Head Teacher.' },
  { min: 70, max: 79, text: 'Very good performance. Keep striving for excellence.' },
  { min: 60, max: 69, text: 'Good work. Push harder for top grades.' },
  { min: 50, max: 59, text: 'Average performance. We expect improvement next term.' },
  { min: 0, max: 49, text: 'Performance is below expectation. Extra support recommended.' },
];

const requireSchool = (schoolId: string | null | undefined) => {
  if (!schoolId) throw new Error('No school selected');
};

// ---------- CLASSES ----------
export const seedClasses = async (schoolId: string): Promise<SeedSectionResult> => {
  requireSchool(schoolId);
  const { data: existing } = await supabase
    .from('classes').select('class_name').eq('school_id', schoolId);
  const existingNames = new Set((existing || []).map((c: any) => c.class_name));
  const toInsert = DEFAULT_CLASSES
    .filter(n => !existingNames.has(n))
    .map(class_name => ({ class_name, school_id: schoolId }));
  if (!toInsert.length) return { inserted: 0, alreadyComplete: true };
  const { error } = await supabase.from('classes').insert(toInsert);
  if (error) throw error;
  return { inserted: toInsert.length, alreadyComplete: false };
};

export const checkClassesComplete = async (schoolId: string): Promise<boolean> => {
  if (!schoolId) return false;
  const { data } = await supabase
    .from('classes').select('class_name').eq('school_id', schoolId);
  const names = new Set((data || []).map((c: any) => c.class_name));
  return DEFAULT_CLASSES.every(n => names.has(n));
};

// ---------- TERMS ----------
export const seedTerms = async (schoolId: string): Promise<SeedSectionResult> => {
  requireSchool(schoolId);
  const year = new Date().getFullYear();
  const { data: existing } = await supabase
    .from('terms').select('term_name').eq('school_id', schoolId).eq('year', year);
  const existingNames = new Set((existing || []).map((t: any) => t.term_name));
  const defaults = [
    { term_name: 'Term 1', start_date: `${year}-02-01`, end_date: `${year}-04-30` },
    { term_name: 'Term 2', start_date: `${year}-05-15`, end_date: `${year}-08-15` },
    { term_name: 'Term 3', start_date: `${year}-09-01`, end_date: `${year}-12-05` },
  ];
  const toInsert = defaults
    .filter(t => !existingNames.has(t.term_name))
    .map(t => ({ ...t, year, school_id: schoolId, is_active: false }));
  if (!toInsert.length) return { inserted: 0, alreadyComplete: true };
  const { error } = await supabase.from('terms').insert(toInsert);
  if (error) throw error;
  return { inserted: toInsert.length, alreadyComplete: false };
};

export const checkTermsComplete = async (schoolId: string): Promise<boolean> => {
  if (!schoolId) return false;
  const year = new Date().getFullYear();
  const { data } = await supabase
    .from('terms').select('term_name').eq('school_id', schoolId).eq('year', year);
  const names = new Set((data || []).map((t: any) => t.term_name));
  return ['Term 1', 'Term 2', 'Term 3'].every(n => names.has(n));
};

// ---------- SUBJECTS ----------
export const seedSubjects = async (schoolId: string): Promise<SeedSectionResult> => {
  requireSchool(schoolId);
  const { data: allClasses } = await supabase
    .from('classes').select('id, class_name').eq('school_id', schoolId);
  if (!allClasses || allClasses.length === 0) {
    throw new Error('Add classes first before seeding subjects.');
  }
  const { data: existing } = await supabase
    .from('subjects').select('subject_name, class_id').eq('school_id', schoolId);
  const existingKey = new Set((existing || []).map((s: any) => `${s.class_id}:${s.subject_name}`));
  const toInsert: any[] = [];
  for (const cls of allClasses) {
    for (const subject_name of DEFAULT_SUBJECTS) {
      const key = `${cls.id}:${subject_name}`;
      if (!existingKey.has(key)) {
        toInsert.push({ subject_name, class_id: cls.id, school_id: schoolId, max_marks: 100 });
      }
    }
  }
  if (!toInsert.length) return { inserted: 0, alreadyComplete: true };
  const { error } = await supabase.from('subjects').insert(toInsert);
  if (error) throw error;
  return { inserted: toInsert.length, alreadyComplete: false };
};

export const checkSubjectsComplete = async (schoolId: string): Promise<boolean> => {
  if (!schoolId) return false;
  const { data: allClasses } = await supabase
    .from('classes').select('id').eq('school_id', schoolId);
  if (!allClasses || allClasses.length === 0) return false;
  const { data: existing } = await supabase
    .from('subjects').select('subject_name, class_id').eq('school_id', schoolId);
  const existingKey = new Set((existing || []).map((s: any) => `${s.class_id}:${s.subject_name}`));
  for (const cls of allClasses) {
    for (const s of DEFAULT_SUBJECTS) {
      if (!existingKey.has(`${cls.id}:${s}`)) return false;
    }
  }
  return true;
};

// ---------- GRADES ----------
export const seedGrades = async (schoolId: string): Promise<SeedSectionResult> => {
  requireSchool(schoolId);
  const { data: existing } = await supabase
    .from('grading_systems').select('grade_name').eq('school_id', schoolId);
  const existingNames = new Set((existing || []).map((g: any) => g.grade_name));
  const toInsert = DEFAULT_GRADES
    .filter(g => !existingNames.has(g.grade_name))
    .map(g => ({ ...g, school_id: schoolId, is_active: true }));
  if (!toInsert.length) return { inserted: 0, alreadyComplete: true };
  const { error } = await supabase.from('grading_systems').insert(toInsert);
  if (error) throw error;
  return { inserted: toInsert.length, alreadyComplete: false };
};

export const checkGradesComplete = async (schoolId: string): Promise<boolean> => {
  if (!schoolId) return false;
  const { data } = await supabase
    .from('grading_systems').select('grade_name').eq('school_id', schoolId);
  const names = new Set((data || []).map((g: any) => g.grade_name));
  return DEFAULT_GRADES.every(g => names.has(g.grade_name));
};

// ---------- COMMENTS ----------
export const seedComments = async (schoolId: string): Promise<SeedSectionResult> => {
  requireSchool(schoolId);
  const { data: existing } = await supabase
    .from('comment_templates')
    .select('comment_type, min_average, max_average')
    .eq('school_id', schoolId);
  const existingKey = new Set(
    (existing || []).map((c: any) => `${c.comment_type}:${c.min_average}:${c.max_average}`)
  );
  const toInsert: any[] = [];
  for (const c of DEFAULT_TEACHER_COMMENTS) {
    const key = `class_teacher:${c.min}:${c.max}`;
    if (!existingKey.has(key)) {
      toInsert.push({
        comment_type: 'class_teacher', min_average: c.min, max_average: c.max,
        comment_text: c.text, school_id: schoolId, is_active: true,
      });
    }
  }
  for (const c of DEFAULT_HEAD_COMMENTS) {
    const key = `headteacher:${c.min}:${c.max}`;
    if (!existingKey.has(key)) {
      toInsert.push({
        comment_type: 'headteacher', min_average: c.min, max_average: c.max,
        comment_text: c.text, school_id: schoolId, is_active: true,
      });
    }
  }
  if (!toInsert.length) return { inserted: 0, alreadyComplete: true };
  const { error } = await supabase.from('comment_templates').insert(toInsert);
  if (error) throw error;
  return { inserted: toInsert.length, alreadyComplete: false };
};

export const checkCommentsComplete = async (schoolId: string): Promise<boolean> => {
  if (!schoolId) return false;
  const { data } = await supabase
    .from('comment_templates')
    .select('comment_type, min_average, max_average')
    .eq('school_id', schoolId);
  const existingKey = new Set(
    (data || []).map((c: any) => `${c.comment_type}:${c.min_average}:${c.max_average}`)
  );
  for (const c of DEFAULT_TEACHER_COMMENTS) {
    if (!existingKey.has(`class_teacher:${c.min}:${c.max}`)) return false;
  }
  for (const c of DEFAULT_HEAD_COMMENTS) {
    if (!existingKey.has(`headteacher:${c.min}:${c.max}`)) return false;
  }
  return true;
};

// Generic dispatcher
export const SECTION_RUNNERS: Record<SeedSection, {
  seed: (schoolId: string) => Promise<SeedSectionResult>;
  check: (schoolId: string) => Promise<boolean>;
  label: string;
}> = {
  classes: { seed: seedClasses, check: checkClassesComplete, label: 'classes' },
  terms: { seed: seedTerms, check: checkTermsComplete, label: 'terms' },
  subjects: { seed: seedSubjects, check: checkSubjectsComplete, label: 'subjects' },
  grades: { seed: seedGrades, check: checkGradesComplete, label: 'grades' },
  comments: { seed: seedComments, check: checkCommentsComplete, label: 'comment templates' },
};
