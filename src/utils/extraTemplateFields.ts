import { SYSTEM_FIELDS, type TemplateField } from './templateFields';

export interface ExtraField {
  id: string; school_id: string; template_id: string | null; field_key: string;
  label: string; scope: string; data_type: string; default_value: string | null; is_active: boolean;
}
export interface ExtraValue { field_id: string; student_id: string | null; term_id: string | null; value: string | null }

export function resolveExtraValues(defs: ExtraField[], values: ExtraValue[], legacy: { field_key: string; term_id: string | null; value: string | null }[], templateId: string, studentId: string, termId: string) {
  const map: Record<string, string> = {};
  const selected = new Map<string, ExtraField>();
  for (const d of defs.filter(d => d.template_id === null)) selected.set(d.field_key, d);
  for (const d of defs.filter(d => d.template_id === templateId)) selected.set(d.field_key, d);
  for (const [key, d] of selected) {
    if (!d.is_active) { map[key] = ''; continue; }
    let value = d.default_value ?? '';
    if (!d.template_id && d.scope === 'student') {
      for (const period of [null, termId]) {
        const v = legacy.find(v => v.field_key === key && v.term_id === period);
        if (v) value = v.value ?? '';
      }
    }
    for (const period of [null, termId]) {
      const v = values.find(v => v.field_id === d.id && v.term_id === period && v.student_id === (d.scope === 'school' ? null : studentId));
      if (v) value = v.value ?? '';
    }
    map[key] = d.data_type === 'boolean' ? value === 'true' ? 'Yes' : value === 'false' ? 'No' : '' : value;
  }
  return map;
}

export function validateExtraValue(type: string, value: string): boolean {
  if (!value) return true;
  if (type === 'number') return Number.isFinite(Number(value));
  if (type === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
  if (type === 'boolean') return value === 'true' || value === 'false';
  return value.length <= 4000;
}

export async function syncExtraDefinitions(schoolId: string, templateId: string, fields: TemplateField[]) {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data, error } = await supabase.from('template_custom_fields').select('*').eq('school_id', schoolId).eq('template_id', templateId);
  if (error) throw error;
  const existing = data || [];
  const custom = fields.filter(f => !f.systemField);
  for (const f of custom) {
    const old = existing.find(d => d.field_key === f.key);
    const row = { school_id: schoolId, template_id: templateId, field_key: f.key, label: f.label, scope: old?.scope || f.scope || 'student', data_type: old?.data_type || f.dataType || 'text', is_active: old?.is_active ?? true };
    const result = old ? await supabase.from('template_custom_fields').update(row).eq('id', old.id).eq('school_id', schoolId) : await supabase.from('template_custom_fields').insert(row);
    if (result.error) throw result.error;
  }
  const removed = existing.filter(d => !custom.some(f => f.key === d.field_key)).map(d => d.id);
  if (removed.length) {
    const result = await supabase.from('template_custom_fields').update({ is_active: false }).in('id', removed).eq('school_id', schoolId);
    if (result.error) throw result.error;
  }
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const aliases: Record<string, string> = { motto: 'school_motto', house: 'student_house', conduct: '', attendance: '', position: '', name_of_student: 'student_name', student_number: 'student_id', head_teacher_name: 'headteacher_name', class_teacher_name: 'class_teacher_name' };
export function normalizeDetectedFields(input: TemplateField[]): TemplateField[] {
  const used = new Set<string>();
  return input.map((f, i) => {
    const labelKey = normalize(f.label);
    const known = SYSTEM_FIELDS.find(s => normalize(s.label.replace(/\s*\(.*\)/, '')) === labelKey || s.key === labelKey);
    const matched = known?.key || aliases[labelKey] || null;
    const source = f.systemField === null && f.needsReview === false ? null : SYSTEM_FIELDS.some(s => s.key === f.systemField) ? f.systemField : matched;
    const base = normalize(f.key || f.label) || `field_${i + 1}`;
    let key = base; let n = 2;
    while (used.has(key)) key = `${base}_${n++}`;
    used.add(key);
    const x = Math.max(0, Math.min(.98, Number(f.x) || 0));
    const y = Math.max(0, Math.min(.98, Number(f.y) || 0));
    return { ...f, key, systemField: source, x, y, w: Math.min(1-x, Math.max(.02, Number(f.w) || .2)), h: Math.min(1-y, Math.max(.01, Number(f.h) || .03)), needsReview: f.needsReview ?? (!source || (f.confidence ?? 1) < .8) };
  });
}