import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useActiveTerm } from '@/hooks/useActiveTerm';
import { Loader2 } from 'lucide-react';

interface ClassRow { id: string; class_name: string; section?: string | null }
interface SubjectRow { id: string; subject_name: string; subject_code?: string | null }
interface StudentRow { id: string; name: string; student_id?: string | null; class_id: string }

// One mark row per student for the selected subject + active term
interface MarkRow {
  id?: string;
  a1: string;
  a2: string;
  a3: string;
  avg: string; // computed
  twenty: string;
  eighty: string;
  hundred: string; // computed
  identifier: string; // computed label
  saving?: boolean;
  dirty?: boolean;
}

const computeAvg = (a1: number | null, a2: number | null, a3: number | null): number | null => {
  if (a1 == null && a2 == null && a3 == null) return null;
  const v = ((a1 || 0) + (a2 || 0) + (a3 || 0)) / 3;
  return Math.round(v * 100) / 100;
};

const computeIdentifier = (avg: number | null): string => {
  if (avg == null || isNaN(avg)) return '';
  if (avg >= 2.5) return 'Outstanding';
  if (avg >= 1.5) return 'Moderate';
  if (avg >= 0.9) return 'Basic';
  return '';
};

const identifierCode = (label: string): number | null => {
  if (label === 'Basic') return 1;
  if (label === 'Moderate') return 2;
  if (label === 'Outstanding') return 3;
  return null;
};

const computeTwenty = (a1: number | null, a2: number | null, a3: number | null): number | null => {
  if (a1 == null && a2 == null && a3 == null) return null;
  const sum = (a1 || 0) + (a2 || 0) + (a3 || 0);
  return Math.round(((sum / 9) * 20) * 10) / 10;
};

const emptyRow = (): MarkRow => ({
  a1: '', a2: '', a3: '', avg: '', twenty: '', eighty: '', hundred: '', identifier: '',
});

const StudentMarksManager = () => {
  const { schoolId } = useSchool();
  const { activeTerm, activeTermId, loading: termLoading } = useActiveTerm();
  const { toast } = useToast();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]); // subjects assigned to selected class
  const [assignedStudentIds, setAssignedStudentIds] = useState<Set<string>>(new Set());
  // marks keyed by studentId
  const [marks, setMarks] = useState<Record<string, MarkRow>>({});
  const [loading, setLoading] = useState(false);

  const STREAM_NONE = '__none__';

  // Derived class selectors
  const classNames = useMemo(
    () => Array.from(new Set(classes.map((c) => c.class_name))).sort(),
    [classes],
  );
  const streamsForName = useMemo(
    () => classes.filter((c) => c.class_name === selectedClassName),
    [classes, selectedClassName],
  );
  const selectedClassId = useMemo(() => {
    if (!selectedClassName) return '';
    if (streamsForName.length === 0) return '';
    if (streamsForName.length === 1) return streamsForName[0].id;
    if (!selectedStream) return '';
    return streamsForName.find(
      (c) => (c.section || STREAM_NONE) === selectedStream,
    )?.id || '';
  }, [selectedClassName, selectedStream, streamsForName]);

  // Load classes once
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const { data } = await supabase
        .from('classes')
        .select('id, class_name, section')
        .eq('school_id', schoolId)
        .order('class_name');
      setClasses(data || []);
    })();
  }, [schoolId]);

  // Reset stream/subject when class name changes
  useEffect(() => {
    setSelectedStream('');
    setSelectedSubject('');
    setSubjects([]);
    setStudents([]);
    setMarks({});
  }, [selectedClassName]);

  useEffect(() => {
    setSelectedSubject('');
    setMarks({});
  }, [selectedClassId]);

  // Load subjects assigned to the selected class
  useEffect(() => {
    if (!selectedClassId) { setSubjects([]); return; }
    (async () => {
      const { data: cs } = await supabase
        .from('class_subjects')
        .select('subject_id')
        .eq('class_id', selectedClassId);
      let ids = (cs || []).map((r: any) => r.subject_id);
      if (!ids.length) { setSubjects([]); return; }

      // If current user is a teacher, restrict to subjects assigned to them
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (prof?.role === 'teacher') {
          const { data: ts } = await supabase
            .from('teacher_subjects')
            .select('subject_id')
            .eq('teacher_id', user.id);
          const teacherIds = new Set((ts || []).map((r: any) => r.subject_id));
          ids = ids.filter((id: string) => teacherIds.has(id));
          if (!ids.length) { setSubjects([]); return; }
        }
      }

      const { data: subjData } = await supabase
        .from('subjects')
        .select('id, subject_name, subject_code')
        .in('id', ids);
      setSubjects((subjData || []).sort((a, b) => a.subject_name.localeCompare(b.subject_name)));
    })();
  }, [selectedClassId]);

  // Load students + assignments + existing marks for selected class+subject
  const loadGrid = useCallback(async () => {
    if (!schoolId || !selectedClassId || !selectedSubject) {
      setStudents([]);
      setAssignedStudentIds(new Set());
      setMarks({});
      return;
    }
    setLoading(true);
    try {
      const { data: studs } = await supabase
        .from('students')
        .select('id, name, student_id, class_id')
        .eq('school_id', schoolId)
        .eq('class_id', selectedClassId)
        .order('name');
      const studentList = studs || [];

      // Which students have this subject assigned
      let assigned = new Set<string>();
      if (studentList.length) {
        const { data: ss } = await supabase
          .from('student_subjects')
          .select('student_id')
          .eq('subject_id', selectedSubject)
          .in('student_id', studentList.map((s) => s.id));
        (ss || []).forEach((r: any) => assigned.add(r.student_id));
      }

      // Existing marks
      const marksMap: Record<string, MarkRow> = {};
      if (activeTermId && studentList.length) {
        const { data: ms } = await supabase
          .from('student_marks')
          .select('id, student_id, a1_score, a2_score, a3_score, average_score, twenty_percent, eighty_percent, hundred_percent, achievement_level')
          .eq('term_id', activeTermId)
          .eq('subject_id', selectedSubject)
          .in('student_id', studentList.map((s) => s.id));
        (ms || []).forEach((m: any) => {
          const hundred = m.hundred_percent;
          const avg = m.average_score != null
            ? m.average_score
            : computeAvg(m.a1_score, m.a2_score, m.a3_score);
          marksMap[m.student_id] = {
            id: m.id,
            a1: m.a1_score != null ? String(m.a1_score) : '',
            a2: m.a2_score != null ? String(m.a2_score) : '',
            a3: m.a3_score != null ? String(m.a3_score) : '',
            avg: avg != null ? String(avg) : '',
            twenty: m.twenty_percent != null ? String(m.twenty_percent) : '',
            eighty: m.eighty_percent != null ? String(m.eighty_percent) : '',
            hundred: hundred != null ? String(hundred) : '',
            identifier: m.achievement_level || computeIdentifier(avg),
          };
        });
      }

      setStudents(studentList);
      setAssignedStudentIds(assigned);
      setMarks(marksMap);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load marks grid', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [schoolId, selectedClassId, selectedSubject, activeTermId, toast]);

  useEffect(() => { loadGrid(); }, [loadGrid]);

  // Debounced save per row
  const saveTimers = useRef<Record<string, any>>({});

  const saveRow = useCallback(
    async (studentId: string, row: MarkRow) => {
      if (!activeTermId || !schoolId || !selectedSubject) return;
      setMarks((prev) => ({ ...prev, [studentId]: { ...prev[studentId], saving: true, dirty: false } }));

      const num = (v: string) => (v.trim() === '' ? null : Number(v));
      const a1 = num(row.a1), a2 = num(row.a2), a3 = num(row.a3);
      const eighty = num(row.eighty);
      const twenty = computeTwenty(a1, a2, a3);
      for (const [label, v] of [['A1', a1], ['A2', a2], ['A3', a3]] as const) {
        if (v != null && (isNaN(v) || v < 0 || v > 3)) {
          toast({ title: 'Invalid mark', description: `${label} must be between 0 and 3`, variant: 'destructive' });
          setMarks((prev) => ({ ...prev, [studentId]: { ...prev[studentId], saving: false } }));
          return;
        }
      }
      for (const [label, v] of [['80%', eighty]] as const) {
        if (v != null && (isNaN(v) || v < 0 || v > 100)) {
          toast({ title: 'Invalid mark', description: `${label} must be between 0 and 100`, variant: 'destructive' });
          setMarks((prev) => ({ ...prev, [studentId]: { ...prev[studentId], saving: false } }));
          return;
        }
      }
      const hundred = (twenty != null || eighty != null) ? (twenty || 0) + (eighty || 0) : null;
      const avg = computeAvg(a1, a2, a3);
      const identifier = computeIdentifier(avg);

      const payload: any = {
        student_id: studentId,
        subject_id: selectedSubject,
        term_id: activeTermId,
        school_id: schoolId,
        a1_score: a1,
        a2_score: a2,
        a3_score: a3,
        average_score: avg,
        twenty_percent: twenty,
        eighty_percent: eighty,
        hundred_percent: hundred,
        achievement_level: identifier || null,
        identifier: identifierCode(identifier),
      };

      const { data, error } = await supabase
        .from('student_marks')
        .upsert(payload, { onConflict: 'student_id,subject_id,term_id' })
        .select('id')
        .maybeSingle();

      if (error) {
        console.error(error);
        toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
        setMarks((prev) => ({ ...prev, [studentId]: { ...prev[studentId], saving: false } }));
        return;
      }
      setMarks((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          id: data?.id || prev[studentId]?.id,
          avg: avg != null ? String(avg) : '',
          twenty: twenty != null ? String(twenty) : '',
          hundred: hundred != null ? String(hundred) : '',
          identifier,
          saving: false,
        },
      }));
    },
    [activeTermId, schoolId, selectedSubject, toast],
  );

  const updateField = (studentId: string, field: keyof MarkRow, value: string) => {
    setMarks((prev) => {
      const cur = prev[studentId] || emptyRow();
      const next: MarkRow = { ...cur, [field]: value, dirty: true };
      const num = (v: string) => (v.trim() === '' ? null : Number(v));
      // Auto-compute AVG from A1/A2/A3
      const a1 = num(next.a1), a2 = num(next.a2), a3 = num(next.a3);
      const avg = computeAvg(a1, a2, a3);
      next.avg = avg != null && !isNaN(avg) ? String(avg) : '';
      next.identifier = computeIdentifier(avg);
      // Auto-compute 20% from A1/A2/A3
      const t = computeTwenty(a1, a2, a3);
      next.twenty = t != null ? String(t) : '';
      // Auto-compute 100%
      const e = num(next.eighty);
      const h = (t != null || e != null) ? (t || 0) + (e || 0) : null;
      next.hundred = h != null && !isNaN(h) ? String(h) : '';
      const updated = { ...prev, [studentId]: next };
      if (saveTimers.current[studentId]) clearTimeout(saveTimers.current[studentId]);
      saveTimers.current[studentId] = setTimeout(() => saveRow(studentId, next), 600);
      return updated;
    });
  };

  const onBlurRow = (studentId: string) => {
    if (saveTimers.current[studentId]) {
      clearTimeout(saveTimers.current[studentId]);
      saveTimers.current[studentId] = null;
    }
    const r = marks[studentId];
    if (r?.dirty) saveRow(studentId, r);
  };

  const hasSelection = !!selectedClassId && !!selectedSubject;
  const needsStream = streamsForName.length > 1;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold">Student Marks Entry</h2>
            <p className="text-sm text-muted-foreground">
              Select class, stream and subject. Active term is used automatically.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Class</Label>
              <Select value={selectedClassName} onValueChange={setSelectedClassName}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classNames.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Stream</Label>
              <Select
                value={selectedStream}
                onValueChange={setSelectedStream}
                disabled={!selectedClassName || !needsStream}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedClassName
                        ? 'Select class first'
                        : !needsStream
                          ? '— no streams —'
                          : 'Select stream'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {streamsForName.map((c) => (
                    <SelectItem key={c.id} value={c.section || STREAM_NONE}>
                      {c.section || '(no stream)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
                disabled={!selectedClassId || subjects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedClassId
                        ? 'Select class first'
                        : subjects.length === 0
                          ? 'No subjects assigned'
                          : 'Select subject'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Term (active)</Label>
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm">
                {termLoading ? 'Loading…' : activeTerm ? `${activeTerm.term_name} ${activeTerm.year}` : 'No active term'}
              </div>
            </div>
          </div>
        </div>

        {!hasSelection && (
          <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
            Select class, stream (if any) and subject to begin entering marks.
          </div>
        )}

        {hasSelection && loading && (
          <div className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading…
          </div>
        )}

        {hasSelection && !loading && students.length === 0 && (
          <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
            No students in this class.
          </div>
        )}

        {hasSelection && !loading && students.length > 0 && !activeTermId && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            No active term set. Open Terms and mark one as Active to enable mark entry.
          </div>
        )}

        {hasSelection && !loading && students.length > 0 && (
          <div className="border rounded-md overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="text-left font-medium px-3 py-2 border-b border-r min-w-[220px]">Student</th>
                  {['A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'Identifier'].map((h) => (
                    <th key={h} className="font-medium px-2 py-2 border-b border-r text-center whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((stu, rowIdx) => {
                  const row = marks[stu.id] || emptyRow();
                  const isAssigned = assignedStudentIds.has(stu.id);
                  const disabled = !isAssigned || !activeTermId;
                  const inputCell = (
                    field: keyof MarkRow,
                    opts: { readOnly?: boolean; min?: number; max?: number; step?: string } = {},
                  ) => {
                    const { readOnly = false, min = 0, max = 100, step = '0.1' } = opts;
                    const el = (
                      <Input
                        type="number"
                        min={min}
                        max={max}
                        step={step}
                        disabled={disabled || readOnly}
                        readOnly={readOnly}
                        value={(row as any)[field] ?? ''}
                        onChange={(e) => updateField(stu.id, field, e.target.value)}
                        onBlur={() => onBlurRow(stu.id)}
                        className={`h-9 w-20 text-center tabular-nums mx-auto ${
                          row.saving ? 'opacity-60' : ''
                        } ${readOnly ? 'bg-muted' : ''}`}
                      />
                    );
                    if (!isAssigned) {
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild><span className="inline-block">{el}</span></TooltipTrigger>
                          <TooltipContent>Subject not assigned to this student</TooltipContent>
                        </Tooltip>
                      );
                    }
                    return el;
                  };
                  return (
                    <tr key={stu.id} className={`${rowIdx % 2 ? 'bg-background' : 'bg-muted/20'} ${!isAssigned ? 'bg-muted/60' : ''}`}>
                      <td className="px-3 py-2 border-b border-r">
                        <div className="font-medium">{stu.name}</div>
                        {stu.student_id && (
                          <div className="text-xs text-muted-foreground">{stu.student_id}</div>
                        )}
                      </td>
                      <td className="p-1 border-b border-r text-center">{inputCell('a1', { min: 0, max: 3, step: '0.01' })}</td>
                      <td className="p-1 border-b border-r text-center">{inputCell('a2', { min: 0, max: 3, step: '0.01' })}</td>
                      <td className="p-1 border-b border-r text-center">{inputCell('a3', { min: 0, max: 3, step: '0.01' })}</td>
                      <td className="p-1 border-b border-r text-center">{inputCell('avg', { readOnly: true, min: 0, max: 3, step: '0.01' })}</td>
                      <td className="p-1 border-b border-r text-center">{inputCell('twenty', { readOnly: true })}</td>
                      <td className="p-1 border-b border-r text-center">{inputCell('eighty')}</td>
                      <td className="p-1 border-b border-r text-center">{inputCell('hundred', { readOnly: true })}</td>
                      <td className="p-1 border-b text-center text-sm font-medium">
                        {isAssigned ? (row.identifier || '—') : (
                          <Tooltip>
                            <TooltipTrigger asChild><span>—</span></TooltipTrigger>
                            <TooltipContent>Subject not assigned to this student</TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default StudentMarksManager;
