import { supabase } from '@/integrations/supabase/client';

export interface SeedResult {
  classes: number;
  terms: number;
  subjects: number;
  grades: number;
  comments: number;
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

export const seedSchoolDefaults = async (schoolId: string): Promise<SeedResult> => {
  if (!schoolId) throw new Error('No school selected');

  const result: SeedResult = { classes: 0, terms: 0, subjects: 0, grades: 0, comments: 0 };

  // CLASSES
  const { data: existingClasses } = await supabase
    .from('classes').select('class_name').eq('school_id', schoolId);
  const existingClassNames = new Set((existingClasses || []).map((c: any) => c.class_name));
  const classesToInsert = DEFAULT_CLASSES
    .filter(name => !existingClassNames.has(name))
    .map(class_name => ({ class_name, school_id: schoolId }));
  if (classesToInsert.length) {
    const { error } = await supabase.from('classes').insert(classesToInsert);
    if (error) throw error;
    result.classes = classesToInsert.length;
  }

  // TERMS
  const year = new Date().getFullYear();
  const { data: existingTerms } = await supabase
    .from('terms').select('term_name, year').eq('school_id', schoolId).eq('year', year);
  const existingTermNames = new Set((existingTerms || []).map((t: any) => t.term_name));
  const defaultTerms = [
    { term_name: 'Term 1', start_date: `${year}-02-01`, end_date: `${year}-04-30` },
    { term_name: 'Term 2', start_date: `${year}-05-15`, end_date: `${year}-08-15` },
    { term_name: 'Term 3', start_date: `${year}-09-01`, end_date: `${year}-12-05` },
  ];
  const termsToInsert = defaultTerms
    .filter(t => !existingTermNames.has(t.term_name))
    .map(t => ({ ...t, year, school_id: schoolId, is_active: false }));
  if (termsToInsert.length) {
    const { error } = await supabase.from('terms').insert(termsToInsert);
    if (error) throw error;
    result.terms = termsToInsert.length;
  }

  // SUBJECTS — one set per class
  const { data: allClasses } = await supabase
    .from('classes').select('id, class_name').eq('school_id', schoolId);
  const { data: existingSubjects } = await supabase
    .from('subjects').select('subject_name, class_id').eq('school_id', schoolId);
  const existingSubjKey = new Set(
    (existingSubjects || []).map((s: any) => `${s.class_id}:${s.subject_name}`)
  );
  const subjectsToInsert: any[] = [];
  for (const cls of allClasses || []) {
    for (const subject_name of DEFAULT_SUBJECTS) {
      const key = `${cls.id}:${subject_name}`;
      if (!existingSubjKey.has(key)) {
        subjectsToInsert.push({
          subject_name,
          class_id: cls.id,
          school_id: schoolId,
          max_marks: 100,
        });
      }
    }
  }
  if (subjectsToInsert.length) {
    const { error } = await supabase.from('subjects').insert(subjectsToInsert);
    if (error) throw error;
    result.subjects = subjectsToInsert.length;
  }

  // GRADES
  const { data: existingGrades } = await supabase
    .from('grading_systems').select('grade_name').eq('school_id', schoolId);
  const existingGradeNames = new Set((existingGrades || []).map((g: any) => g.grade_name));
  const gradesToInsert = DEFAULT_GRADES
    .filter(g => !existingGradeNames.has(g.grade_name))
    .map(g => ({ ...g, school_id: schoolId, is_active: true }));
  if (gradesToInsert.length) {
    const { error } = await supabase.from('grading_systems').insert(gradesToInsert);
    if (error) throw error;
    result.grades = gradesToInsert.length;
  }

  // COMMENTS
  const { data: existingComments } = await supabase
    .from('comment_templates').select('comment_type, min_average, max_average').eq('school_id', schoolId);
  const existingCommentKey = new Set(
    (existingComments || []).map((c: any) => `${c.comment_type}:${c.min_average}:${c.max_average}`)
  );
  const commentsToInsert: any[] = [];
  for (const c of DEFAULT_TEACHER_COMMENTS) {
    const key = `teacher:${c.min}:${c.max}`;
    if (!existingCommentKey.has(key)) {
      commentsToInsert.push({
        comment_type: 'teacher', min_average: c.min, max_average: c.max,
        comment_text: c.text, school_id: schoolId, is_active: true,
      });
    }
  }
  for (const c of DEFAULT_HEAD_COMMENTS) {
    const key = `headteacher:${c.min}:${c.max}`;
    if (!existingCommentKey.has(key)) {
      commentsToInsert.push({
        comment_type: 'headteacher', min_average: c.min, max_average: c.max,
        comment_text: c.text, school_id: schoolId, is_active: true,
      });
    }
  }
  if (commentsToInsert.length) {
    const { error } = await supabase.from('comment_templates').insert(commentsToInsert);
    if (error) throw error;
    result.comments = commentsToInsert.length;
  }

  return result;
};
