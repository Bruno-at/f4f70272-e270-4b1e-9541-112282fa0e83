import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';

interface CustomField { id: string; field_key: string; label: string; default_value: string | null }

const CustomFieldValues = () => {
  const { schoolId } = useSchool();
  const { toast } = useToast();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const [f, c, t] = await Promise.all([
        supabase.from('template_custom_fields').select('*').eq('school_id', schoolId).order('label'),
        supabase.from('classes').select('id, class_name, section').eq('school_id', schoolId).order('class_name'),
        supabase.from('terms').select('id, term_name, year, is_active').eq('school_id', schoolId).order('year', { ascending: false }),
      ]);
      setFields((f.data as any) || []);
      setClasses(c.data || []);
      setTerms(t.data || []);
      const active = (t.data || []).find((x: any) => x.is_active);
      if (active) setTermId(active.id);
    })();
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !classId) { setStudents([]); return; }
    setLoading(true);
    (async () => {
      const { data: st } = await supabase
        .from('students').select('id, name').eq('school_id', schoolId).eq('class_id', classId).order('name');
      setStudents(st || []);
      const { data: vals } = await supabase
        .from('student_custom_field_values').select('student_id, field_key, value, term_id').eq('school_id', schoolId);
      const map: Record<string, string> = {};
      (vals || []).forEach((v: any) => {
        if (v.term_id && v.term_id !== termId) return;
        map[`${v.student_id}|${v.field_key}`] = v.value || '';
      });
      setValues(map);
      setLoading(false);
    })();
  }, [schoolId, classId, termId]);

  const save = async () => {
    if (!schoolId || !termId) return;
    setSaving(true);
    const rows = students.flatMap((s) =>
      fields.map((f) => ({
        school_id: schoolId,
        student_id: s.id,
        term_id: termId,
        field_key: f.field_key,
        value: values[`${s.id}|${f.field_key}`] || null,
      })),
    );
    const { error } = await supabase
      .from('student_custom_field_values')
      .upsert(rows, { onConflict: 'student_id,term_id,field_key' });
    setSaving(false);
    toast(error ? { title: 'Could not save', description: error.message, variant: 'destructive' } : { title: 'Saved', description: 'Custom field values updated.' });
  };

  if (!fields.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Extra template fields</CardTitle>
          <CardDescription>
            Fields found on an uploaded template that the system cannot fill automatically appear here so you can enter them per student.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No extra fields yet — upload and analyse a template first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extra template fields</CardTitle>
        <CardDescription>Values for fields that exist only on your uploaded template.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.class_name}{c.section ? ` ${c.section}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Term</Label>
            <Select value={termId} onValueChange={setTermId}>
              <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
              <SelectContent>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.term_name} {t.year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading students…</div>
        ) : students.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 border">Student</th>
                  {fields.map((f) => <th key={f.id} className="text-left p-2 border">{f.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="p-2 border whitespace-nowrap">{s.name}</td>
                    {fields.map((f) => (
                      <td key={f.id} className="p-1 border">
                        <Input
                          className="h-8"
                          value={values[`${s.id}|${f.field_key}`] || ''}
                          placeholder={f.default_value || ''}
                          onChange={(e) => setValues((prev) => ({ ...prev, [`${s.id}|${f.field_key}`]: e.target.value }))}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a class to enter values.</p>
        )}

        {students.length > 0 && (
          <Button onClick={save} disabled={saving || !termId}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save values
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomFieldValues;
