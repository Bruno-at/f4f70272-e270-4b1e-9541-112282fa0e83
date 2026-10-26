import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { resolveExtraValues, validateExtraValue, type ExtraField } from '@/utils/extraTemplateFields';
import { resolveAcademicLevel } from '@/utils/academicLevel';

type Choice = { id: string; name: string; level: string; fields: { key: string; systemField: string | null }[] };
interface Props { templates: Choice[]; revision: number; onEdit: (id: string) => void }
const ALL = '__all__';
export default function CustomFieldValues({ templates, revision, onEdit }: Props) {
  const { schoolId } = useSchool();
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState('');
  const [fields, setFields] = useState<ExtraField[]>([]);
  const [classes, setClasses] = useState<{ id: string; class_name: string; section: string | null }[]>([]);
  const [terms, setTerms] = useState<{ id: string; term_name: string; year: number }[]>([]);
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState(ALL);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const reportError = (e: unknown) => toast({ title: 'Could not save fields', description: e instanceof Error ? e.message : (e as { message?: string })?.message || 'Please retry.', variant: 'destructive' });
  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    Promise.all([
      supabase.from('classes').select('id,class_name,section').eq('school_id', schoolId).order('class_name'),
      supabase.from('terms').select('id,term_name,year').eq('school_id', schoolId).order('year', { ascending: false }),
    ]).then(([c,t]) => { if (!cancelled) { setClasses(c.data || []); setTerms(t.data || []); } });
    return () => { cancelled = true; };
  }, [schoolId]);
  useEffect(() => {
    if (!templates.some(t => t.id === templateId)) {
      setTemplateId(templates[0]?.id || '');
      setFields([]); setStudents([]); setValues({});
    }
  }, [templates, templateId]);
  useEffect(() => {
    if (!schoolId || !templateId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [f, v, st, legacy] = await Promise.all([
          supabase.from('template_custom_fields').select('*').eq('school_id', schoolId).or(`template_id.eq.${templateId},template_id.is.null`).order('label'),
          supabase.from('template_field_values').select('*').eq('school_id', schoolId),
          classId ? supabase.from('students').select('id,name').eq('school_id', schoolId).eq('class_id', classId).order('name') : Promise.resolve({ data: [], error: null }),
          supabase.from('student_custom_field_values').select('student_id,field_key,term_id,value').eq('school_id', schoolId),
        ]);
        for (const r of [f,v,st,legacy]) if (r.error) throw r.error;
        const selected = new Map<string, ExtraField>();
        const keys = templates.find(t => t.id === templateId)?.fields.filter(f => !f.systemField).map(f => f.key) || [];
        const definitions = ((f.data || []) as ExtraField[]).filter(d => keys.includes(d.field_key));
        definitions.filter(d => !d.template_id).forEach(d => selected.set(d.field_key, d));
        definitions.filter(d => d.template_id === templateId).forEach(d => selected.set(d.field_key, d));
        const active = [...selected.values()].filter(d => d.is_active);
        const map: Record<string,string> = {};
        for (const s of [{ id: '__school__', name: '' }, ...(st.data || [])]) {
          const resolved = resolveExtraValues(definitions, v.data || [], (legacy.data || []).filter(l => l.student_id === s.id), templateId, s.id, termId === ALL ? '' : termId);
          active.forEach(d => {
            const printed = resolved[d.field_key] || '';
            map[`${s.id}|${d.id}`] = d.data_type === 'boolean' ? printed === 'Yes' ? 'true' : printed === 'No' ? 'false' : '' : printed;
          });
        }
        if (!cancelled) { setFields(active); setStudents(st.data || []); setValues(map); }
      } catch (e) { if (!cancelled) reportError(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [schoolId, templateId, classId, termId, revision, reload, templates]);
  const configure = async (field: ExtraField, patch: Partial<ExtraField>) => {
    if (!schoolId) return;
    setSaving(true);
    try {
      // Do not change a legacy definition shared by other templates.
      if (!field.template_id) {
        const { error } = await supabase.from('template_custom_fields').insert({ school_id: schoolId, template_id: templateId, field_key: field.field_key, label: field.label, scope: field.scope, data_type: field.data_type, default_value: field.default_value, ...patch });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('template_custom_fields').update(patch).eq('id', field.id).eq('school_id', schoolId);
        if (error) throw error;
      }
      setReload(r => r+1);
    } catch (e) { reportError(e); } finally { setSaving(false); }
  };
  const save = async () => {
    if (!schoolId) return;
    setSaving(true);
    try {
      const rows = fields.flatMap(f => (f.scope === 'school' ? [{ id: '__school__' }] : students).map(s => {
        const value = values[`${s.id}|${f.id}`] ?? '';
        if (!validateExtraValue(f.data_type, value)) throw new Error(`Invalid ${f.data_type} value for ${f.label}.`);
        return { school_id: schoolId, field_id: f.id, student_id: f.scope === 'school' ? null : s.id, term_id: termId === ALL ? null : termId, value };
      }));
      if (rows.length) {
        const { error } = await supabase.from('template_field_values').upsert(rows, { onConflict: 'field_id,term_id,student_id' });
        if (error) throw error;
      }
      toast({ title: 'Values saved' });
    } catch (e) { reportError(e); } finally { setSaving(false); }
  };
  const valueInput = (f: ExtraField, studentId: string) => {
    const key = `${studentId}|${f.id}`;
    return f.data_type === 'boolean' ? <Select value={values[key] || '__empty__'} onValueChange={v => setValues(p => ({ ...p, [key]: v === '__empty__' ? '' : v }))}><SelectTrigger aria-label={`${f.label} value`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__empty__">—</SelectItem><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select> : <Input aria-label={`${f.label} value`} type={f.data_type === 'number' ? 'number' : f.data_type === 'date' ? 'date' : 'text'} step="any" maxLength={4000} value={values[key] || ''} onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))} />;
  };
  const level = templates.find(t => t.id === templateId)?.level;
  const studentFields = fields.filter(f => f.scope === 'student');
  return <Card><CardHeader><CardTitle>Extra Template Fields</CardTitle></CardHeader><CardContent className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label>Template</Label><Select value={templateId} onValueChange={id => { setTemplateId(id); setClassId(''); }}><SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger><SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} · {t.level === 'a-level' ? 'A-Level' : 'O-Level'}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Academic period</Label><Select value={termId} onValueChange={setTermId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>All periods</SelectItem>{terms.map(t => <SelectItem key={t.id} value={t.id}>{t.term_name} {t.year}</SelectItem>)}</SelectContent></Select></div>
    </div>
    {templateId && <Button variant="outline" onClick={() => onEdit(templateId)}>Edit positions / Add field</Button>}
    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : !fields.length ? <p className="text-sm text-muted-foreground">No extra fields for this template.</p> : <>
      <div className="space-y-3">{fields.map(f => <div key={f.id} className="border-b pb-4 space-y-2">
        <div className="flex gap-2"><Input aria-label="Field label" defaultValue={f.label} key={`${f.id}-${f.label}`} onBlur={e => { if (e.target.value.trim() && e.target.value !== f.label) void configure(f, { label: e.target.value.trim() }); }} /><Button aria-label={`Remove ${f.label}`} variant="ghost" size="icon" disabled={saving} onClick={() => { if (window.confirm(`Remove ${f.label} from this template? Saved values will be retained.`)) void configure(f, { is_active: false }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
        <div className="grid gap-3 sm:grid-cols-2"><div><Label>Data type</Label><Select value={f.data_type} disabled={saving} onValueChange={data_type => void configure(f, { data_type })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['text','number','date','boolean'].map(t => <SelectItem key={t} value={t}>{t === 'boolean' ? 'Yes / No' : t[0].toUpperCase()+t.slice(1)}</SelectItem>)}</SelectContent></Select></div><div><Label>Value applies to</Label><Select value={f.scope} disabled={saving} onValueChange={scope => void configure(f, { scope })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="school">Whole school</SelectItem><SelectItem value="student">Each student</SelectItem></SelectContent></Select></div></div>
        {f.scope === 'school' && <div><Label>{f.label}</Label>{valueInput(f,'__school__')}</div>}
      </div>)}</div>
      {!!studentFields.length && <><div><Label>Class</Label><Select value={classId} onValueChange={setClassId}><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent>{classes.filter(c => resolveAcademicLevel(c) === level).map(c => <SelectItem key={c.id} value={c.id}>{c.class_name} {c.section}</SelectItem>)}</SelectContent></Select></div><div className="overflow-x-auto"><table className="w-full text-sm border"><thead className="bg-muted"><tr><th className="p-2 text-left border">Student</th>{studentFields.map(f => <th className="p-2 text-left border" key={f.id}>{f.label}</th>)}</tr></thead><tbody>{students.map(s => <tr key={s.id}><td className="p-2 border whitespace-nowrap">{s.name}</td>{studentFields.map(f => <td key={f.id} className="p-2 border min-w-40">{valueInput(f,s.id)}</td>)}</tr>)}</tbody></table></div></>}
      <Button disabled={saving || loading} onClick={save}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save values</Button>
    </>}
  </CardContent></Card>;
}
