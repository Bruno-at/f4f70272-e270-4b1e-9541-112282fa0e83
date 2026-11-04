import { supabase } from '@/integrations/supabase/client';

/**
 * A student's own subject assignments (student_subjects) are the only source
 * of truth for which subjects appear on that student's report card.
 */
export async function fetchAssignedSubjectIds(studentId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('student_subjects')
    .select('subject_id')
    .eq('student_id', studentId);
  if (error) throw error;
  return new Set((data || []).map((r: any) => r.subject_id as string));
}

/** Keep only rows whose subject is assigned to the student. */
export function filterToAssigned<T>(rows: T[], assigned: Set<string>, key: (row: T) => string | null | undefined): T[] {
  return rows.filter((row) => {
    const id = key(row);
    return !!id && assigned.has(id);
  });
}

/** Loads assigned subjects (full rows) for a student. */
export async function fetchAssignedSubjects(studentId: string): Promise<any[]> {
  const ids = Array.from(await fetchAssignedSubjectIds(studentId));
  if (!ids.length) return [];
  const { data, error } = await supabase.from('subjects').select('*').in('id', ids);
  if (error) throw error;
  return data || [];
}
