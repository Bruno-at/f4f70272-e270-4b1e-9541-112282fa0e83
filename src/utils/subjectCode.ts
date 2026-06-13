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
  // Fallback: initials of each word if 2+ words, else first 4 letters
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.map(w => w[0]).join('').toUpperCase().slice(0, 4);
  }
  return (words[0] || '').slice(0, 4).toUpperCase() || 'SUB';
}

// Returns the subject name to display: full name when it's short/common,
// otherwise the abbreviation (manual subject_code preferred, then initials).
// Threshold defaults to 14 characters or 3+ words.
export function getDisplaySubjectName(
  name: string,
  code?: string | null,
  opts: { maxChars?: number; maxWords?: number } = {}
): string {
  const { maxChars = 14, maxWords = 3 } = opts;
  const n = (name || '').trim();
  if (!n) return '';
  const words = n.split(/\s+/);
  if (words.length < maxWords && n.length <= maxChars) return n;
  return getSubjectShortCode(n, code);
}