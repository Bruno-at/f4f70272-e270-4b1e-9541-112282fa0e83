/**
 * Detect academic level from class name.
 * O-Level: S.1, S.2, S.3, S.4 (or similar patterns)
 * A-Level: S.5, S.6 (or similar patterns)
 */
export type AcademicLevel = 'o-level' | 'a-level';

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
