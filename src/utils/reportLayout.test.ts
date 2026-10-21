import { describe, expect, test } from 'bun:test';
import { PDFDocument } from 'pdf-lib';
import { buildOLevelReportPdf, type OLevelPdfData } from './pdfLibOLevelTemplate';

export const layoutSample: OLevelPdfData = {
  student: { id: 'student', name: 'VICTORIA RWAKYOT', gender: 'Female', class_id: 'class', student_id: 'STU002', created_at: '', updated_at: '', classes: { id: 'class', class_name: 'S.1', section: 'A', created_at: '' } },
  schoolInfo: { id: 'school', school_name: 'EXCELLENCE ACADEMY HIGH SCHOOL NAKASONGOLA', motto: 'Education is not the key to success', po_box: '1234', location: 'Nakasongola', created_at: '', updated_at: '' },
  term: { id: 'term', term_name: 'ONE', year: 2026, start_date: '2026-02-01', end_date: '2026-04-30', is_active: true, created_at: '' },
  marks: Array.from({ length: 17 }, (_, i) => ({ id: String(i), student_id: 'student', subject_id: String(i), term_id: 'term', created_at: '', a1_score: 2.1, a2_score: 2.2, a3_score: 2.5, average_score: 2.3, twenty_percent: 15.3, eighty_percent: 64, hundred_percent: 79.3, identifier: 2, final_grade: 'B', achievement_level: 'Moderate', teacher_initials: 'NA', subjects: { id: String(i), subject_name: ['Chemistry', 'English Language', 'Entrepreneurship', 'History', 'Mathematics'][i % 5], subject_code: 'CHE', max_marks: 100, created_at: '' } })),
  reportData: { overall_average: 74, overall_grade: 'B', overall_identifier: 2, achievement_level: 'Good', class_teacher_comment: 'Satisfactory performance. Keep improving your work next term.', headteacher_comment: 'Your performance is satisfactory. Improve your weak areas next term.' },
};

describe('Report paper dimensions', () => {
  test('O-Level output is one A4 portrait page', async () => {
    const doc = await PDFDocument.load(await buildOLevelReportPdf(layoutSample));
    expect(doc.getPageCount()).toBe(1);
    const page = doc.getPage(0);
    expect(page.getWidth()).toBeCloseTo(595.28, 1);
    expect(page.getHeight()).toBeCloseTo(841.89, 1);
    expect(page.getWidth()).toBeLessThan(page.getHeight());
  });
});