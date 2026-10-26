/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { normalizeDetectedFields, resolveExtraValues, validateExtraValue, type ExtraField } from './extraTemplateFields';
import { fieldsFromText } from './templateTextDetection';

const field = (patch: Partial<ExtraField> = {}): ExtraField => ({ id: 'attendance', school_id: 'school', template_id: 'template', field_key: 'attendance', label: 'Attendance', scope: 'student', data_type: 'number', default_value: '0', is_active: true, ...patch });
test('student period values override all periods without using another student or template', () => {
  expect(resolveExtraValues([field(), field({ id: 'other-field', template_id: 'other' })], [
    { field_id: 'attendance', student_id: 'student', term_id: null, value: '70' },
    { field_id: 'attendance', student_id: 'other', term_id: 'term', value: '20' },
    { field_id: 'attendance', student_id: 'student', term_id: 'term', value: '95' },
    { field_id: 'other-field', student_id: 'student', term_id: 'term', value: '10' },
  ], [], 'template', 'student', 'term').attendance).toBe('95');
});
test('school-wide values apply to each student and selected period', () => {
  const defs = [field({ scope: 'school', field_key: 'motto', data_type: 'text' })];
  const values = [{ field_id: 'attendance', student_id: null, term_id: null, value: 'Together we learn' }];
  expect(resolveExtraValues(defs, values, [], 'template', 'student-a', 'term').motto).toBe('Together we learn');
  expect(resolveExtraValues(defs, values, [], 'template', 'student-b', 'term').motto).toBe('Together we learn');
});
test('legacy student values remain available with deterministic period precedence', () => {
  expect(resolveExtraValues([field({ template_id: null })], [], [{ field_key: 'attendance', term_id: 'term', value: '90' }, { field_key: 'attendance', term_id: null, value: '80' }], 'template', 'student', 'term').attendance).toBe('90');
});
test('explicit blank values clear fallback and removed fields stay hidden', () => {
  expect(resolveExtraValues([field()], [{ field_id: 'attendance', student_id: 'student', term_id: 'term', value: '' }], [], 'template', 'student', 'term').attendance).toBe('');
  expect(resolveExtraValues([field({ is_active: false })], [], [], 'template', 'student', 'term').attendance).toBe('');
});
test('known school motto and house labels map to existing data; uncertain extras remain custom', () => {
  const detected = normalizeDetectedFields(['Motto','House','Attendance','Conduct','Position'].map(label => ({ key: label, label, systemField: null, x: .2, y: .2, w: .2, h: .03 })));
  expect(detected.map(f => f.systemField)).toEqual(['school_motto','student_house',null,null,null]);
  expect(detected[2].needsReview).toBe(true);
});
test('manual mapping corrections remain custom and duplicate keys are unique', () => {
  const input = { key: 'motto', label: 'Motto', systemField: null, needsReview: false, x: .9, y: .9, w: .3, h: .3 };
  const result = normalizeDetectedFields([input, input]);
  expect(result.map(f => f.key)).toEqual(['motto','motto_2']);
  expect(result[0].systemField).toBeNull();
  expect(result[0].x + result[0].w).toBeLessThanOrEqual(1);
});
test('OCR labels and placeholders produce reviewable extra fields', () => {
  const fields = fieldsFromText([{ text: 'Attendance: ........', x: .1, y: .5, w: .4, h: .02 }, { text: 'Conduct ____', x: .1, y: .6, w: .4, h: .02 }]);
  expect(fields.map(f => f.label)).toEqual(['Attendance','Conduct']);
  expect(fields.every(f => f.needsReview)).toBe(true);
});
test('number date and boolean field types reject invalid values', () => {
  expect(validateExtraValue('number','95')).toBe(true);
  expect(validateExtraValue('number','absent')).toBe(false);
  expect(validateExtraValue('date','2026-10-24')).toBe(true);
  expect(validateExtraValue('date','tomorrow')).toBe(false);
  expect(validateExtraValue('boolean','true')).toBe(true);
  expect(validateExtraValue('boolean','sometimes')).toBe(false);
});