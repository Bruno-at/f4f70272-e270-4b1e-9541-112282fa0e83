// Derive a short uppercase code from a subject name when subject_code is missing.
// e.g. "Mathematics" -> "MATH", "English" -> "ENG", "Christian Religious Education" -> "CRE"
const SUBJECT_CODE_OVERRIDES: Record<string, string> = {
  'mathematics': 'MATH',
  'english': 'ENG',
  'biology': 'BIO',
  'chemistry': 'CHEM',
  'physics': 'PHY',
  'geography': 'GEO',
  'history': 'HIST',
  'literature': 'LIT',
  'kiswahili': 'KIS',
  'ict': 'ICT',
  'fine art': 'ART',
  'commerce': 'COMM',
  'entrepreneurship': 'ENT',
  'christian religious education': 'CRE',
  'islamic religious education': 'IRE',
  'luganda': 'LUG',
  'physical education': 'PE',
  'agriculture': 'AGRIC',
};

export function getSubjectShortCode(name: string, code?: string | null): string {
  if (code && code.trim()) return code.trim().toUpperCase();
  const key = (name || '').trim().toLowerCase();
  if (SUBJECT_CODE_OVERRIDES[key]) return SUBJECT_CODE_OVERRIDES[key];
  // Fallback: first 4 letters of first word, uppercased
  const first = (name || '').trim().split(/\s+/)[0] || '';
  return first.slice(0, 4).toUpperCase() || 'SUB';
}