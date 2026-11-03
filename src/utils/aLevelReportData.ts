import type { StudentMark } from '@/types/database';

export interface GradeBand { grade: string; min: number; max: number }

/** Same fallback bands used when a school has no grading rows (see gradeFromScore). */
export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { grade: 'A', min: 80, max: 100 },
  { grade: 'B', min: 70, max: 79 },
  { grade: 'C', min: 60, max: 69 },
  { grade: 'D', min: 50, max: 59 },
  { grade: 'E', min: 0, max: 49 },
];

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

/** School grading rows → bands sorted highest first; falls back to default bands. */
export const toGradeBands = (rows?: { grade_name: string; min_percentage: number; max_percentage: number }[] | null): GradeBand[] => {
  const bands = (rows || [])
    .filter((r) => r && r.grade_name)
    .map((r) => ({ grade: r.grade_name, min: Number(r.min_percentage), max: Number(r.max_percentage) }))
    .sort((a, b) => b.min - a.min);
  return bands.length ? bands : DEFAULT_GRADE_BANDS;
};

export const gradeBandRange = (b: GradeBand) => `${fmtNum(b.min)}-${fmtNum(b.max)}`;

/** "A LEVEL END OF TERM 1 REPORT CARD 2026" without a duplicated "TERM". */
export const aLevelReportTitle = (termName: string, year: number | string) => {
  const t = (termName || '').trim().toUpperCase().replace(/^TERM\s*/, '');
  return `A LEVEL END OF TERM ${t} REPORT CARD ${year}`.replace(/\s+/g, ' ').trim();
};

const SUBSIDIARY = /(general\s*paper|^gp$|subsidiary|^sub[\s.-]|sub[\s.-]?(math|ict)|^s\/?(math|ict))/i;

/** Principal-subject combination (e.g. CHE/PHY/MAT) from the student's own subjects. */
export const deriveCombination = (marks: Pick<StudentMark, 'subjects'>[]): string => {
  const names = marks
    .map((m) => (m.subjects?.subject_name || '').trim())
    .filter((n) => n && !SUBSIDIARY.test(n));
  const codes = names.map((n) => n.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase()).filter(Boolean);
  return Array.from(new Set(codes)).join('/');
};

/** Start date of the school's next term after this one; null when none is recorded. */
export const pickNextTermStart = (
  currentEnd: string | null | undefined,
  terms: { start_date: string }[] | null | undefined,
): string | null => {
  if (!currentEnd) return null;
  const end = new Date(currentEnd).getTime();
  const next = (terms || [])
    .map((t) => t.start_date)
    .filter((d) => d && new Date(d).getTime() > end)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return next[0] || null;
};
