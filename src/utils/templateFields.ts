import type { ReportCardData } from './pdfGenerator';
import { formatSchoolAddress } from './schoolAddress';

export interface TemplateField {
  key: string;
  label: string;
  systemField: string | null;
  /** normalised 0..1, top-left origin */
  x: number;
  y: number;
  w: number;
  h: number;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
}

/** Fields the system can already supply from its own data. */
export const SYSTEM_FIELDS: { key: string; label: string }[] = [
  { key: 'school_name', label: 'School name' },
  { key: 'school_motto', label: 'School motto' },
  { key: 'school_address', label: 'School address (P.O. Box, Location)' },
  { key: 'school_telephone', label: 'School telephone' },
  { key: 'school_email', label: 'School email' },
  { key: 'school_website', label: 'School website' },
  { key: 'school_logo', label: 'School logo (image)' },
  { key: 'student_photo', label: 'Student photo (image)' },
  { key: 'student_name', label: 'Student name' },
  { key: 'student_id', label: 'Student number / ID' },
  { key: 'student_gender', label: 'Student gender' },
  { key: 'student_age', label: 'Student age' },
  { key: 'student_house', label: 'Student house' },
  { key: 'class_name', label: 'Class' },
  { key: 'section', label: 'Stream / section' },
  { key: 'term_name', label: 'Term' },
  { key: 'year', label: 'Year' },
  { key: 'term_start', label: 'Term start date' },
  { key: 'term_end', label: 'Term end date' },
  { key: 'marks_table', label: 'Subject marks table' },
  { key: 'overall_average', label: 'Overall average' },
  { key: 'overall_grade', label: 'Overall grade' },
  { key: 'achievement_level', label: 'Achievement level' },
  { key: 'class_teacher_comment', label: "Class teacher's comment" },
  { key: 'headteacher_comment', label: "Headteacher's comment" },
  { key: 'class_teacher_signature', label: 'Class teacher signature (image)' },
  { key: 'headteacher_signature', label: 'Headteacher signature (image)' },
  { key: 'school_stamp', label: 'School stamp (image)' },
  { key: 'fees_balance', label: 'Fees balance' },
  { key: 'other_requirements', label: 'Other requirements' },
  { key: 'printed_date', label: 'Date printed' },
];

export const IMAGE_FIELDS = new Set([
  'school_logo',
  'student_photo',
  'class_teacher_signature',
  'headteacher_signature',
  'school_stamp',
]);

const stripTermPrefix = (name?: string | null) =>
  String(name || '').replace(/^\s*term\s*/i, '').trim();

const fmtDate = (d?: string | null) => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB');
};

/** Resolve a system field key to its printable text value. */
export function resolveSystemFieldValue(key: string, data: ReportCardData): string {
  const s = data.schoolInfo || ({} as any);
  const st = data.student || ({} as any);
  const t = data.term || ({} as any);
  const r = data.reportData || ({} as any);

  switch (key) {
    case 'school_name': return s.school_name || '';
    case 'school_motto': return s.motto || '';
    case 'school_address': return formatSchoolAddress(s.po_box, s.location) || '';
    case 'school_telephone': return s.telephone || '';
    case 'school_email': return s.email || '';
    case 'school_website': return s.website || '';
    case 'student_name': return st.name || '';
    case 'student_id': return st.student_id || '';
    case 'student_gender': return st.gender || '';
    case 'student_age': return st.age ? String(st.age) : '';
    case 'student_house': return st.house || '';
    case 'class_name': return st.classes?.class_name || '';
    case 'section': return st.classes?.section || '';
    case 'term_name': return stripTermPrefix(t.term_name);
    case 'year': return t.year ? String(t.year) : '';
    case 'term_start': return fmtDate(t.start_date);
    case 'term_end': return fmtDate(t.end_date);
    case 'overall_average': return r.overall_average != null ? `${Number(r.overall_average).toFixed(1)}%` : '';
    case 'overall_grade': return r.overall_grade || '';
    case 'achievement_level': return r.achievement_level || '';
    case 'class_teacher_comment': return r.class_teacher_comment || '';
    case 'headteacher_comment': return r.headteacher_comment || '';
    case 'fees_balance': return data.feesData ? `UGX ${Number(data.feesData.feesBalance || 0).toLocaleString()}` : '';
    case 'other_requirements': return data.feesData?.otherRequirements || '';
    case 'printed_date': return new Date().toLocaleDateString('en-GB');
    default: return '';
  }
}

/** Resolve an image field key to a data URI already present on the report data. */
export function resolveImageField(key: string, data: ReportCardData): string | null {
  switch (key) {
    case 'school_logo': return (data.schoolInfo as any)?.logo_url || null;
    case 'student_photo': return (data.student as any)?.photo_url || null;
    case 'class_teacher_signature': return data.classTeacherSignature || null;
    case 'headteacher_signature': return data.headteacherSignature || null;
    case 'school_stamp': return data.stampUrl || null;
    default: return null;
  }
}
