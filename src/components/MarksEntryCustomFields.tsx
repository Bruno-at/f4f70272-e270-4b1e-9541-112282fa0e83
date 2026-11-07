import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CustomFieldInput from '@/components/CustomFieldInput';
import { loadEntryFields, loadFieldValues, saveFieldValues, validateFieldValue, type ReportCardField } from '@/utils/reportCardFields';

interface Props { schoolId: string | null; termId: string | null; students: { id: string; name: string }[] }

/** Per-term custom report card fields (e.g. Attendance, Conduct) for the students shown in Marks Entry. */
const MarksEntryCustomFields = ({ schoolId, termId, students }: Props) => {
  const { toast } = useToast();
  const [fields, setFields] = useState<ReportCardField[]>([]);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const ids = students.map((s) => s.id).join(',');

  useEffect(() => {
    if (!schoolId || !termId || !students.length) { setFields([]); return; }
    let cancelled = false;
    (async () => {
      const f = await loadEntryFields(schoolId, 'marks_entry');
      const rows = await loadFieldValues(f.map((x) => x.id), students.map((s) => s.id), termId).catch(() => []);
      if (cancelled) return;
      const map: Record<string, Record<string, string>> = {};
      rows.forEach((r) => { (map[r.student_id] ||= {})[r.field_id] = r.value ?? ''; });
      setFields(f); setValues(map); setDirty(new Set());
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, termId, ids]);

  if (!fields.length) return null;

  const set = (sid: string, fid: string, v: string) => {
    setValues((p) => ({ ...p, [sid]: { ...(p[sid] || {}), [fid]: v } }));
    setDirty((p) => new Set(p).add(sid));
  };

  const save = async () => {
    if (!schoolId || !termId) return;
    for (const sid of dirty) for (const f of fields) {
      const err = validateFieldValue(f, values[sid]?.[f.id] ?? '');
      if (err) return toast({ title: 'Check values', description: err, variant: 'destructive' });
    }
    setSaving(true);
    try {
      for (const sid of dirty) {
        const v = values[sid] || {};
        await saveFieldValues(schoolId, sid, termId, Object.fromEntries(fields.map((f) => [f.id, v[f.id] ?? ''])));
      }
      setDirty(new Set());
      toast({ title: 'Term details saved' });
    } catch (e: any) { toast({ title: 'Could not save', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-2 mt-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Term details for report cards</h3>
        <Button size="sm" onClick={save} disabled={saving || !dirty.size} className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save details
        </Button>
      </div>
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="p-2 text-left">Student</th>
            {fields.map((f) => <th key={f.id} className="p-2 text-left">{f.label}{f.is_required && ' *'}</th>)}
          </tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{s.name}</td>
                {fields.map((f) => (
                  <td key={f.id} className="p-1 min-w-[120px]">
                    <CustomFieldInput compact field={f} value={values[s.id]?.[f.id] ?? ''} onChange={(v) => set(s.id, f.id, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarksEntryCustomFields;
