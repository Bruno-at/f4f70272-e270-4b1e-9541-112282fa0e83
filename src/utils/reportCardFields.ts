import { supabase } from '@/integrations/supabase/client';

export type FieldType = 'text' | 'number' | 'date' | 'grade' | 'comment' | 'checkbox' | 'percentage' | 'select';
export type FieldSource = 'manual' | 'student_profile' | 'marks_entry' | 'assessment' | 'academic_settings' | 'school_profile' | 'calculated';
export type EntryLocation = 'student_registration' | 'marks_entry' | 'none';

export interface ReportCardField {
  id: string;
  school_id: string;
  field_key: string;
  label: string;
  data_type: FieldType;
  source: FieldSource;
  entry_location: EntryLocation;
  is_required: boolean;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
}

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' }, { value: 'number', label: 'Number' }, { value: 'date', label: 'Date' },
  { value: 'grade', label: 'Grade' }, { value: 'comment', label: 'Comment (long text)' },
  { value: 'checkbox', label: 'Checkbox (yes/no)' }, { value: 'percentage', label: 'Percentage' },
];

export const FIELD_SOURCES: { value: FieldSource; label: string }[] = [
  { value: 'manual', label: 'Manual input' }, { value: 'student_profile', label: 'Student Profile' },
  { value: 'marks_entry', label: 'Marks Entry' }, { value: 'assessment', label: 'Assessment' },
  { value: 'academic_settings', label: 'Academic Settings' }, { value: 'school_profile', label: 'School Profile' },
  { value: 'calculated', label: 'Calculated by system' },
];

export const ENTRY_LOCATIONS: { value: EntryLocation; label: string; hint: string }[] = [
  { value: 'student_registration', label: 'Student Registration', hint: 'One value per student (e.g. House, Club)' },
  { value: 'marks_entry', label: 'Marks Entry (per term)', hint: 'One value per student each term (e.g. Attendance, Conduct)' },
  { value: 'none', label: 'Not entered (system only)', hint: '' },
];

/** Built-in fields. Their keys map to existing records/calculations and never change. */
export const SYSTEM_FIELDS: Omit<ReportCardField, 'id' | 'school_id'>[] = ([
  ['student_name', 'Student Name', 'text', 'student_profile', 'student_registration'],
  ['gender', 'Gender', 'text', 'student_profile', 'student_registration'],
  ['age', 'Age', 'number', 'student_profile', 'student_registration'],
  ['class', 'Class', 'text', 'student_profile', 'student_registration'],
  ['house', 'House', 'text', 'student_profile', 'student_registration'],
  ['admission_number', 'Student ID', 'text', 'student_profile', 'student_registration'],
  ['a1_score', 'A1', 'number', 'assessment', 'marks_entry'],
  ['a2_score', 'A2', 'number', 'assessment', 'marks_entry'],
  ['a3_score', 'A3', 'number', 'assessment', 'marks_entry'],
  ['average_score', 'Average', 'number', 'calculated', 'none'],
  ['twenty_percent', '20%', 'number', 'calculated', 'none'],
  ['eighty_percent', '80% (Exam)', 'number', 'marks_entry', 'marks_entry'],
  ['hundred_percent', '100%', 'number', 'calculated', 'none'],
  ['identifier', 'Identifier', 'number', 'calculated', 'none'],
  ['final_grade', 'Grade', 'grade', 'calculated', 'none'],
  ['achievement_level', 'Achievement Level', 'text', 'calculated', 'none'],
  ['class_teacher_comment', "Class Teacher's Comment", 'comment', 'calculated', 'none'],
  ['headteacher_comment', "Headteacher's Comment", 'comment', 'calculated', 'none'],
  ['term', 'Term', 'text', 'academic_settings', 'none'],
  ['next_term_begins', 'Next Term Begins', 'date', 'academic_settings', 'none'],
  ['fees_balance', 'Fees Balance', 'number', 'calculated', 'none'],
  ['school_name', 'School Name', 'text', 'school_profile', 'none'],
] as const).map(([field_key, label, data_type, source, entry_location], i) => ({
  field_key, label, data_type, source, entry_location,
  is_required: false, is_active: true, is_system: true, sort_order: i,
})) as Omit<ReportCardField, 'id' | 'school_id'>[];

const db = supabase as any;

/** Turn a label into a stable lowercase field name. */
export const toFieldKey = (label: string) => {
  const k = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return /^[a-z]/.test(k) ? k : `field_${k}`.slice(0, 60);
};

/** Load school fields, creating missing system rows when the user is allowed to. */
export const loadReportCardFields = async (schoolId: string, ensureSystem = false): Promise<ReportCardField[]> => {
  if (ensureSystem) {
    await db.from('report_card_fields').upsert(
      SYSTEM_FIELDS.map((f) => ({ ...f, school_id: schoolId })),
      { onConflict: 'school_id,field_key', ignoreDuplicates: true },
    );
  }
  const { data, error } = await db.from('report_card_fields').select('*').eq('school_id', schoolId).order('sort_order').order('created_at');
  if (error) throw error;
  return data || [];
};

/** Active custom fields that are entered on a given screen. */
export const loadEntryFields = async (schoolId: string, location: EntryLocation) => {
  const { data } = await db.from('report_card_fields').select('*').eq('school_id', schoolId)
    .eq('is_system', false).eq('is_active', true).eq('entry_location', location).order('sort_order').order('created_at');
  return (data || []) as ReportCardField[];
};

export const missingRequired = (fields: ReportCardField[], values: Record<string, string>) =>
  fields.filter((f) => f.is_required && f.data_type !== 'checkbox' && !(values[f.id] ?? '').trim()).map((f) => f.label);

/** Validate a single value against its field type; returns an error message or null. */
export const validateFieldValue = (f: Pick<ReportCardField, 'data_type' | 'label'>, v: string): string | null => {
  if (!v) return null;
  if ((f.data_type === 'number' || f.data_type === 'percentage') && isNaN(Number(v))) return `${f.label} must be a number`;
  if (f.data_type === 'percentage' && (Number(v) < 0 || Number(v) > 100)) return `${f.label} must be between 0 and 100`;
  if (f.data_type === 'checkbox' && v !== 'true' && v !== 'false') return `${f.label} must be yes or no`;
  return null;
};

export const loadFieldValues = async (fieldIds: string[], studentIds: string[], termId: string | null) => {
  if (!fieldIds.length || !studentIds.length) return [] as { field_id: string; student_id: string; value: string | null }[];
  let q = db.from('report_card_field_values').select('field_id,student_id,value').in('field_id', fieldIds).in('student_id', studentIds);
  q = termId ? q.eq('term_id', termId) : q.is('term_id', null);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
};

/** Save values for one student (term null for registration fields). */
export const saveFieldValues = async (schoolId: string, studentId: string, termId: string | null, values: Record<string, string>) => {
  for (const [fieldId, value] of Object.entries(values)) {
    let q = db.from('report_card_field_values').select('id').eq('field_id', fieldId).eq('student_id', studentId);
    q = termId ? q.eq('term_id', termId) : q.is('term_id', null);
    const { data: existing } = await q.maybeSingle();
    const res = existing
      ? await db.from('report_card_field_values').update({ value }).eq('id', existing.id)
      : await db.from('report_card_field_values').insert({ school_id: schoolId, field_id: fieldId, student_id: studentId, term_id: termId, value });
    if (res.error) throw res.error;
  }
};

/**
 * Custom field values for report generation, keyed by field_key.
 * Term-specific values override all-term (registration) values.
 */
export const loadReportCustomFields = async (schoolId: string | null, studentId: string, termId: string | null) => {
  const out: Record<string, { label: string; value: string }> = {};
  if (!schoolId || !studentId) return out;
  try {
    const { data: fields } = await db.from('report_card_fields').select('id,field_key,label').eq('school_id', schoolId).eq('is_system', false).eq('is_active', true);
    if (!fields?.length) return out;
    const { data: values } = await db.from('report_card_field_values').select('field_id,term_id,value')
      .eq('student_id', studentId).in('field_id', fields.map((f: any) => f.id));
    const byId = new Map(fields.map((f: any) => [f.id, f]));
    const sorted = (values || []).filter((v: any) => !v.term_id || v.term_id === termId).sort((a: any) => (a.term_id ? 1 : -1));
    for (const f of fields) out[f.field_key] = { label: f.label, value: '' };
    for (const v of sorted) { const f: any = byId.get(v.field_id); if (f) out[f.field_key] = { label: f.label, value: v.value ?? '' }; }
  } catch { /* optional */ }
  return out;
};
