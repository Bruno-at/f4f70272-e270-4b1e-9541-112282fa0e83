/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { aLevelReportTitle, deriveCombination, pickNextTermStart, toGradeBands, DEFAULT_GRADE_BANDS } from './aLevelReportData';
import { generateALevelTemplate, aLevelSubjectRowCount } from './aLevelPdfTemplate';

const subj = (subject_name: string) => ({ subjects: { id: subject_name, subject_name, max_marks: 100, created_at: '' } });

describe('A-Level report data', () => {
  test('title does not repeat TERM', () => {
    expect(aLevelReportTitle('Term 1', 2026)).toBe('A LEVEL END OF TERM 1 REPORT CARD 2026');
    expect(aLevelReportTitle('ONE', 2026)).toBe('A LEVEL END OF TERM ONE REPORT CARD 2026');
  });
  test('combination uses principal subjects only', () => {
    expect(deriveCombination([subj('Chemistry'), subj('Physics'), subj('Mathematics'), subj('General Paper'), subj('Sub-ICT')] as any)).toBe('CHE/PHY/MAT');
  });
  test('grade scale comes from school grading rows, highest first', () => {
    const bands = toGradeBands([{ grade_name: 'E', min_percentage: 0, max_percentage: 34 }, { grade_name: 'A', min_percentage: 75, max_percentage: 100 }]);
    expect(bands.map((b) => b.grade)).toEqual(['A', 'E']);
    expect(toGradeBands([])).toEqual(DEFAULT_GRADE_BANDS);
  });
  test('next term begins is the earliest later term', () => {
    expect(pickNextTermStart('2026-04-30', [{ start_date: '2026-09-01' }, { start_date: '2026-05-30' }, { start_date: '2026-01-01' }])).toBe('2026-05-30');
    expect(pickNextTermStart('2026-04-30', [])).toBeNull();
  });
  test('default A-Level report is one A4 portrait page', () => {
    const pdf = generateALevelTemplate({
      student: { id: 's', name: 'Test Student', gender: 'Male', class_id: 'c', created_at: '', updated_at: '', classes: { id: 'c', class_name: 'S5', section: 'East', created_at: '' } },
      term: { id: 't', term_name: 'Term 1', year: 2026, start_date: '2026-02-01', end_date: '2026-04-30', is_active: true, created_at: '' },
      schoolInfo: { id: 'sc', school_name: 'School', created_at: '', updated_at: '' },
      marks: Array.from({ length: 10 }, (_, i) => ({ id: String(i), student_id: 's', subject_id: String(i), term_id: 't', created_at: '', hundred_percent: 70, ...subj('Physics') })) as any,
      reportData: { overall_average: 70, overall_grade: 'B', overall_identifier: 2, achievement_level: 'Moderate', class_teacher_comment: '', headteacher_comment: '' },
    });
    expect(pdf.getNumberOfPages()).toBe(1);
    expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(210, 0);
    expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(297, 0);
  });
  test('performance table has 4 subject rows by default', () => {
    expect(aLevelSubjectRowCount(0)).toBe(4);
    expect(aLevelSubjectRowCount(3)).toBe(4);
  });
  test('performance table adds a row for each subject beyond 4', () => {
    expect(aLevelSubjectRowCount(5)).toBe(5);
    expect(aLevelSubjectRowCount(9)).toBe(9);
  });
  test('many subjects still fit on one A4 page', () => {
    const pdf = generateALevelTemplate({
      student: { id: 's', name: 'Test Student', gender: 'Male', class_id: 'c', created_at: '', updated_at: '', classes: { id: 'c', class_name: 'S5', section: 'East', created_at: '' } },
      term: { id: 't', term_name: 'Term 1', year: 2026, start_date: '2026-02-01', end_date: '2026-04-30', is_active: true, created_at: '' },
      schoolInfo: { id: 'sc', school_name: 'School', created_at: '', updated_at: '' },
      marks: Array.from({ length: 14 }, (_, i) => ({ id: String(i), student_id: 's', subject_id: String(i), term_id: 't', created_at: '', hundred_percent: 70, ...subj('Physics') })) as any,
      reportData: { overall_average: 70, overall_grade: 'B', overall_identifier: 2, achievement_level: 'Moderate', class_teacher_comment: '', headteacher_comment: '' },
    });
    expect(pdf.getNumberOfPages()).toBe(1);
  });
});
