/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { filterToAssigned } from './studentSubjects';

test('an unassigned subject with marks is dropped from the report', () => {
  const marks = [
    { subject_id: 'math', hundred_percent: 80 },
    { subject_id: 'physics', hundred_percent: 65 },
  ];
  const result = filterToAssigned(marks, new Set(['math']), (m) => m.subject_id);
  expect(result.map((m) => m.subject_id)).toEqual(['math']);
});

test('a student with no assigned subjects shows no subjects', () => {
  const marks = [{ subject_id: 'math', hundred_percent: 80 }];
  expect(filterToAssigned(marks, new Set<string>(), (m) => m.subject_id)).toEqual([]);
});
