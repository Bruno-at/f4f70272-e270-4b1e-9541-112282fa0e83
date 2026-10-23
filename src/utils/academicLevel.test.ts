/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { assertTemplateLevel, resolveAcademicLevel } from './academicLevel';

test('legacy O-Level classes resolve to O-Level', () => {
  for (const class_name of ['S1', 'S.2', 'Senior 3', 'S4']) {
    expect(resolveAcademicLevel({ class_name })).toBe('o-level');
  }
});
test('legacy A-Level classes resolve to A-Level', () => {
  for (const class_name of ['S5', 'S.6', 'Senior 5', 'Senior 6']) {
    expect(resolveAcademicLevel({ class_name })).toBe('a-level');
  }
});
test('explicit class education level overrides class name', () => {
  expect(resolveAcademicLevel({ class_name: 'S1', education_level: 'a-level' })).toBe('a-level');
  expect(resolveAcademicLevel({ class_name: 'S5', education_level: 'o-level' })).toBe('o-level');
});
test('O-Level templates cannot generate A-Level reports', () => {
  expect(() => assertTemplateLevel('o-level', 'a-level')).toThrow();
  expect(() => assertTemplateLevel('o-level', 'o-level')).not.toThrow();
});
test('A-Level templates cannot generate O-Level reports', () => {
  expect(() => assertTemplateLevel('a-level', 'o-level')).toThrow();
  expect(() => assertTemplateLevel('a-level', 'a-level')).not.toThrow();
});