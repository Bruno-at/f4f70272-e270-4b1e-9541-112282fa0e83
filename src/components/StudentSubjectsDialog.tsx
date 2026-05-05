import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { useToast } from '@/hooks/use-toast';
import { Student } from '@/types/database';

interface SubjectRow { id: string; subject_name: string; subject_code?: string | null }

interface Props {
  student: Student | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const StudentSubjectsDialog = ({ student, open, onOpenChange }: Props) => {
  const { schoolId } = useSchool();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !student || !schoolId) return;
    (async () => {
      setLoading(true);
      try {
        // Subjects assigned to the student's class via class_subjects
        const { data: cs, error: csErr } = await supabase
          .from('class_subjects')
          .select('subject_id, subjects:subject_id(id, subject_name, subject_code)')
          .eq('school_id', schoolId)
          .eq('class_id', student.class_id);
        if (csErr) throw csErr;
        const subs: SubjectRow[] = (cs || [])
          .map((r: any) => r.subjects)
          .filter(Boolean)
          .sort((a: SubjectRow, b: SubjectRow) => a.subject_name.localeCompare(b.subject_name));
        setSubjects(subs);

        // Existing student_subjects assignments
        const { data: ss, error: ssErr } = await supabase
          .from('student_subjects')
          .select('subject_id')
          .eq('student_id', student.id);
        if (ssErr) throw ssErr;
        setSelected(new Set((ss || []).map((r: any) => r.subject_id)));
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'Failed to load subjects', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, student, schoolId, toast]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(subjects.map((s) => s.id)));
  const clearAll = () => setSelected(new Set());

  const save = async () => {
    if (!student || !schoolId) return;
    setSaving(true);
    try {
      // Replace existing assignments
      const { error: delErr } = await supabase
        .from('student_subjects')
        .delete()
        .eq('student_id', student.id);
      if (delErr) throw delErr;

      const rows = Array.from(selected).map((subject_id) => ({
        student_id: student.id,
        subject_id,
        school_id: schoolId,
      }));
      if (rows.length) {
        const { error: insErr } = await supabase
          .from('student_subjects')
          .upsert(rows, { onConflict: 'student_id,subject_id', ignoreDuplicates: true });
        if (insErr) throw insErr;
      }
      toast({ title: 'Saved', description: `Updated subjects for ${student.name}` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Subjects</DialogTitle>
          <DialogDescription>
            {student ? `Select subjects for ${student.name}` : ''}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
          </div>
        ) : subjects.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No subjects assigned to this class yet.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{selected.size} of {subjects.length} selected</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={selectAll}>Select all</Button>
                <Button type="button" size="sm" variant="ghost" onClick={clearAll}>Clear</Button>
              </div>
            </div>
            <div className="max-h-72 overflow-auto space-y-2 pr-1 border rounded-md p-3">
              {subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selected.has(s.id)}
                    onCheckedChange={(v) => toggle(s.id, !!v)}
                  />
                  <span>{s.subject_name}</span>
                </label>
              ))}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading || subjects.length === 0}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentSubjectsDialog;