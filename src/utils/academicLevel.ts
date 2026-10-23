/**
 * Detect academic level from class name.
 * O-Level: S.1, S.2, S.3, S.4 (or similar patterns)
 * A-Level: S.5, S.6 (or similar patterns)
 */
export type AcademicLevel = 'o-level' | 'a-level';

export const isAcademicLevel = (value: unknown): value is AcademicLevel =>
  value === 'o-level' || value === 'a-level';

/** Prefer an explicit class level when present; legacy classes have names only. */
export const resolveAcademicLevel = (klass?: { class_name?: string; education_level?: string | null; level?: string | null } | null): AcademicLevel => {
  if (isAcademicLevel(klass?.education_level)) return klass.education_level;
  if (isAcademicLevel(klass?.level)) return klass.level;
  return detectAcademicLevel(klass?.class_name || '');
};

export const assertTemplateLevel = (templateLevel: string, level: AcademicLevel) => {
  if (templateLevel !== level) throw new Error('The template education level does not match the student’s class.');
};

export const detectAcademicLevel = (className: string): AcademicLevel => {
  if (!className) return 'o-level';
  const normalized = className.toUpperCase().replace(/\s+/g, '');
  // Match S.5, S.6, S5, S6, Senior 5, Senior 6, etc.
  if (/S\.?5|S\.?6|SENIOR\s*5|SENIOR\s*6|A-LEVEL|ALEVEL/i.test(normalized)) {
    return 'a-level';
  }
  return 'o-level';
};

export const getAcademicLevelLabel = (level: AcademicLevel): string => {
  return level === 'a-level' ? 'A LEVEL' : 'O LEVEL';
};
