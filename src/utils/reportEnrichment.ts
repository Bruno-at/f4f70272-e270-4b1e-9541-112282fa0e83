import { supabase } from '@/integrations/supabase/client';
import { getSubjectShortCode } from './subjectCode';

// Build teacher initials like "Bruno George" -> "B.G", "John Peter Okello" -> "J.P.O"
export function toTeacherInitials(name?: string | null): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase())
    .join('.');
}

export interface GradingRow {
  grade_name: string;
  min_percentage: number;
  max_percentage: number;
}

// Compute letter grade from a 0–100 score using grading rows (highest match wins).
export function gradeFromScore(score: number | null | undefined, rows: GradingRow[]): string {
  if (score === null || score === undefined || isNaN(Number(score))) return '';
  const s = Number(score);
  // Sort rows by min_percentage descending so highest band matches first
  const sorted = [...rows].sort((a, b) => Number(b.min_percentage) - Number(a.min_percentage));
  for (const r of sorted) {
    if (s >= Number(r.min_percentage) && s <= Number(r.max_percentage)) return r.grade_name;
  }
  // Fallback default scale if no grading_systems configured
  if (s >= 80) return 'A';
  if (s >= 70) return 'B';
  if (s >= 60) return 'C';
  if (s >= 50) return 'D';
  return 'E';
}

export interface EnrichOptions {
  classId?: string | null;
  schoolId?: string | null;
}

// Auto-fills subject_code (DB → abbreviation fallback), teacher_initials (class+subject teacher),
// and final_grade (computed from grading_systems when missing) on each mark.
export async function enrichMarksForReport<T extends any>(marks: T[], opts: EnrichOptions = {}): Promise<T[]> {
  if (!marks || marks.length === 0) return marks;

  // 1) Load grading rows for this school (or any active rows)
  let gradingQuery = supabase
    .from('grading_systems')
    .select('grade_name, min_percentage, max_percentage, school_id')
    .eq('is_active', true);
  if (opts.schoolId) gradingQuery = gradingQuery.eq('school_id', opts.schoolId);
  const { data: gradingRows } = await gradingQuery;
  const grading: GradingRow[] = (gradingRows || []) as any;

  // 2) Load teacher assignments (prefer matching the class, fall back to any)
  const subjectIds = Array.from(new Set(marks.map((m: any) => m.subject_id).filter(Boolean)));
  let teacherLinks: any[] = [];
  if (subjectIds.length > 0) {
    let q = supabase
      .from('teacher_subjects')
      .select('subject_id, class_id, teacher_id, profiles!teacher_subjects_teacher_id_fkey(full_name)')
      .in('subject_id', subjectIds);
    const { data } = await q;
    teacherLinks = data || [];
  }

  const initialsByKey = (subjectId: string): string => {
    // Prefer class-specific assignment
    const exact = teacherLinks.find(
      (l) => l.subject_id === subjectId && opts.classId && l.class_id === opts.classId
    );
    const link = exact || teacherLinks.find((l) => l.subject_id === subjectId);
    return toTeacherInitials(link?.profiles?.full_name);
  };

  return marks.map((m: any) => {
    const subjName = m.subjects?.subject_name || '';
    const rawCode = m.subjects?.subject_code || m.subject_code || '';
    const code = getSubjectShortCode(subjName, rawCode);
    const initials = m.teacher_initials && m.teacher_initials.length > 1
      ? m.teacher_initials
      : initialsByKey(m.subject_id) || toTeacherInitials(m.teacher_initials);
    const grade = m.final_grade && m.final_grade.trim()
      ? m.final_grade
      : gradeFromScore(m.hundred_percent ?? m.eighty_percent ?? m.average_score, grading);
    return {
      ...m,
      subject_code: code,
      teacher_initials: initials || '',
      final_grade: grade,
      subjects: m.subjects ? { ...m.subjects, subject_code: code } : m.subjects,
    } as T;
  });
}