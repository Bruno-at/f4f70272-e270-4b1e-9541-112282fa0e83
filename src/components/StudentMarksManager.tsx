import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useActiveTerm } from '@/hooks/useActiveTerm';
import { getSubjectShortCode } from '@/utils/subjectCode';
import { Settings2, Loader2 } from 'lucide-react';

interface ClassRow { id: string; class_name: string; section?: string | null }
interface SubjectRow { id: string; subject_name: string; subject_code?: string | null }
interface StudentRow { id: string; name: string; student_id?: string | null; class_id: string }

// One mark per (student, subject) — auto term
interface MarkCell {
  id?: string;
  hundred_percent: string; // string for input control
  saving?: boolean;
  dirty?: boolean;
}

const StudentMarksManager = () => {
  const { schoolId } = useSchool();
  const { activeTerm, activeTermId, loading: termLoading } = useActiveTerm();
  const { toast } = useToast();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]); // subjects assigned to selected class
  const [studentSubjects, setStudentSubjects] = useState<Record<string, Set<string>>>({}); // student_id -> set(subject_id)
  // marks keyed by `${studentId}:${subjectId}`
  const [marks, setMarks] = useState<Record<string, MarkCell>>({});
  const [loading, setLoading] = useState(false);
  const [assignSavingFor, setAssignSavingFor] = useState<string | null>(null);

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

  // Load grid data when class or term changes
  const loadGrid = useCallback(async () => {
    if (!schoolId || !selectedClass) {
      setStudents([]);
      setSubjects([]);
      setStudentSubjects({});
      setMarks({});
      return;
    }
    setLoading(true);
    try {
      // Students in class
      const { data: studs } = await supabase
        .from('students')
        .select('id, name, student_id, class_id')
        .eq('school_id', schoolId)
        .eq('class_id', selectedClass)
        .order('name');

      // Subjects assigned to this class via class_subjects
      const { data: csLinks } = await supabase
        .from('class_subjects')
        .select('subject_id, subjects:subject_id(id, subject_name, subject_code)')
        .eq('school_id', schoolId)
        .eq('class_id', selectedClass);
      const subs: SubjectRow[] = (csLinks || [])
        .map((r: any) => r.subjects)
        .filter(Boolean)
        .sort((a: SubjectRow, b: SubjectRow) => a.subject_name.localeCompare(b.subject_name));

      const studentList = studs || [];
      const subjectIds = subs.map((s) => s.id);

      // Per-student subject assignments
      let assignMap: Record<string, Set<string>> = {};
      if (studentList.length) {
        const { data: ss } = await supabase
          .from('student_subjects')
          .select('student_id, subject_id')
          .in('student_id', studentList.map((s) => s.id));
        (ss || []).forEach((r: any) => {
          if (!assignMap[r.student_id]) assignMap[r.student_id] = new Set();
          assignMap[r.student_id].add(r.subject_id);
        });

        // Default behavior: students with NO assignments get all class subjects (auto-seed)
        const needSeed = studentList.filter((s) => !assignMap[s.id] || assignMap[s.id].size === 0);
        if (needSeed.length && subjectIds.length) {
          const rows = needSeed.flatMap((s) =>
            subjectIds.map((subject_id) => ({
              student_id: s.id,
              subject_id,
              school_id: schoolId,
            })),
          );
          const { error } = await supabase
            .from('student_subjects')
            .upsert(rows, { onConflict: 'student_id,subject_id', ignoreDuplicates: true });
          if (!error) {
            needSeed.forEach((s) => {
              assignMap[s.id] = new Set(subjectIds);
            });
          }
        }
      }

      // Existing marks for active term
      let marksMap: Record<string, MarkCell> = {};
      if (activeTermId && studentList.length && subjectIds.length) {
        const { data: ms } = await supabase
          .from('student_marks')
          .select('id, student_id, subject_id, hundred_percent')
          .eq('term_id', activeTermId)
          .in('student_id', studentList.map((s) => s.id))
          .in('subject_id', subjectIds);
        (ms || []).forEach((m: any) => {
          marksMap[`${m.student_id}:${m.subject_id}`] = {
            id: m.id,
            hundred_percent: m.hundred_percent != null ? String(m.hundred_percent) : '',
          };
        });
      }

      setStudents(studentList);
      setSubjects(subs);
      setStudentSubjects(assignMap);
      setMarks(marksMap);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load marks grid', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [schoolId, selectedClass, activeTermId, toast]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  const cellKey = (sid: string, subid: string) => `${sid}:${subid}`;

  // Debounced save per cell
  const saveTimers = useRef<Record<string, any>>({});

  const saveCell = useCallback(
    async (studentId: string, subjectId: string, value: string) => {
      if (!activeTermId || !schoolId) return;
      const key = cellKey(studentId, subjectId);
      setMarks((prev) => ({ ...prev, [key]: { ...prev[key], hundred_percent: value, saving: true, dirty: false } }));

      const numeric = value.trim() === '' ? null : Number(value);
      if (numeric != null && (isNaN(numeric) || numeric < 0 || numeric > 100)) {
        setMarks((prev) => ({ ...prev, [key]: { ...prev[key], saving: false } }));
        toast({ title: 'Invalid mark', description: 'Enter a number between 0 and 100', variant: 'destructive' });
        return;
      }

      const payload: any = {
        student_id: studentId,
        subject_id: subjectId,
        term_id: activeTermId,
        school_id: schoolId,
        hundred_percent: numeric,
      };

      const { data, error } = await supabase
        .from('student_marks')
        .upsert(payload, { onConflict: 'student_id,subject_id,term_id' })
        .select('id')
        .maybeSingle();

      if (error) {
        console.error(error);
        toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
        setMarks((prev) => ({ ...prev, [key]: { ...prev[key], saving: false } }));
        return;
      }

      setMarks((prev) => ({
        ...prev,
        [key]: { id: data?.id || prev[key]?.id, hundred_percent: value, saving: false },
      }));
    },
    [activeTermId, schoolId, toast],
  );

  const onCellChange = (studentId: string, subjectId: string, value: string) => {
    const key = cellKey(studentId, subjectId);
    setMarks((prev) => ({ ...prev, [key]: { ...prev[key], hundred_percent: value, dirty: true } }));
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => saveCell(studentId, subjectId, value), 500);
  };

  const onCellBlur = (studentId: string, subjectId: string, value: string) => {
    const key = cellKey(studentId, subjectId);
    if (saveTimers.current[key]) {
      clearTimeout(saveTimers.current[key]);
      saveTimers.current[key] = null;
    }
    if (marks[key]?.dirty) saveCell(studentId, subjectId, value);
  };

  // Toggle assignment for one student/subject
  const toggleAssignment = async (studentId: string, subjectId: string, assign: boolean) => {
    if (!schoolId) return;
    setAssignSavingFor(studentId);
    try {
      if (assign) {
        const { error } = await supabase
          .from('student_subjects')
          .upsert({ student_id: studentId, subject_id: subjectId, school_id: schoolId }, {
            onConflict: 'student_id,subject_id',
            ignoreDuplicates: true,
          });
        if (error) throw error;
        setStudentSubjects((prev) => {
          const next = { ...prev };
          const set = new Set(next[studentId] || []);
          set.add(subjectId);
          next[studentId] = set;
          return next;
        });
      } else {
        const { error } = await supabase
          .from('student_subjects')
          .delete()
          .eq('student_id', studentId)
          .eq('subject_id', subjectId);
        if (error) throw error;
        setStudentSubjects((prev) => {
          const next = { ...prev };
          const set = new Set(next[studentId] || []);
          set.delete(subjectId);
          next[studentId] = set;
          return next;
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not update assignment', variant: 'destructive' });
    } finally {
      setAssignSavingFor(null);
    }
  };

  const hasClass = !!selectedClass;
  const hasStudents = students.length > 0;
  const hasSubjects = subjects.length > 0;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Student Marks Entry</h2>
            <p className="text-sm text-muted-foreground">
              Spreadsheet-style entry. Active term is used automatically.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-1 min-w-[220px]">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.class_name}{c.section ? ` ${c.section}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-[220px]">
              <Label>Term (active)</Label>
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm">
                {termLoading
                  ? 'Loading…'
                  : activeTerm
                    ? `${activeTerm.term_name} ${activeTerm.year}`
                    : 'No active term — set one in Terms'}
              </div>
            </div>
          </div>
        </div>

        {!hasClass && (
          <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
            Select a class to begin entering marks.
          </div>
        )}

        {hasClass && loading && (
          <div className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading grid…
          </div>
        )}

        {hasClass && !loading && !hasStudents && (
          <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
            No students in this class.
          </div>
        )}

        {hasClass && !loading && hasStudents && !hasSubjects && (
          <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
            No subjects assigned to this class.
          </div>
        )}

        {hasClass && !loading && hasStudents && hasSubjects && !activeTermId && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            No active term set. Open Terms and mark one as Active to enable mark entry.
          </div>
        )}

        {hasClass && !loading && hasStudents && hasSubjects && (
          <div className="border rounded-md overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="text-left font-medium px-3 py-2 border-b border-r min-w-[220px] sticky left-0 bg-muted/50 z-20">
                    Student
                  </th>
                  {subjects.map((s) => (
                    <Tooltip key={s.id}>
                      <TooltipTrigger asChild>
                        <th className="font-medium px-2 py-2 border-b border-r text-center whitespace-nowrap">
                          {getSubjectShortCode(s.subject_name, s.subject_code)}
                        </th>
                      </TooltipTrigger>
                      <TooltipContent>{s.subject_name}</TooltipContent>
                    </Tooltip>
                  ))}
                  <th className="px-2 py-2 border-b text-center w-12"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((stu, rowIdx) => {
                  const assigned = studentSubjects[stu.id] || new Set<string>();
                  return (
                    <tr key={stu.id} className={rowIdx % 2 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="px-3 py-2 border-b border-r sticky left-0 bg-inherit z-10">
                        <div className="font-medium">{stu.name}</div>
                        {stu.student_id && (
                          <div className="text-xs text-muted-foreground">{stu.student_id}</div>
                        )}
                      </td>
                      {subjects.map((sub) => {
                        const key = cellKey(stu.id, sub.id);
                        const cell = marks[key];
                        const isAssigned = assigned.has(sub.id);
                        const disabled = !isAssigned || !activeTermId;
                        const cellEl = (
                          <td
                            key={sub.id}
                            className={`p-1 border-b border-r text-center ${
                              !isAssigned ? 'bg-muted/60' : ''
                            }`}
                          >
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.1"
                              disabled={disabled}
                              value={cell?.hundred_percent ?? ''}
                              onChange={(e) => onCellChange(stu.id, sub.id, e.target.value)}
                              onBlur={(e) => onCellBlur(stu.id, sub.id, e.target.value)}
                              className={`h-9 w-20 text-center tabular-nums mx-auto ${
                                cell?.saving ? 'opacity-60' : ''
                              } ${disabled ? 'cursor-not-allowed' : ''}`}
                              placeholder={isAssigned ? '—' : ''}
                            />
                          </td>
                        );
                        if (!isAssigned) {
                          return (
                            <Tooltip key={sub.id}>
                              <TooltipTrigger asChild>{cellEl}</TooltipTrigger>
                              <TooltipContent>Subject not assigned to this student</TooltipContent>
                            </Tooltip>
                          );
                        }
                        return cellEl;
                      })}
                      <td className="border-b text-center px-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Assign subjects">
                              {assignSavingFor === stu.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Settings2 className="w-4 h-4" />
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-64 p-3">
                            <div className="font-medium text-sm mb-2">Subjects for {stu.name}</div>
                            <div className="max-h-64 overflow-auto space-y-2 pr-1">
                              {subjects.map((sub) => {
                                const checked = (studentSubjects[stu.id] || new Set()).has(sub.id);
                                return (
                                  <label key={sub.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(v) => toggleAssignment(stu.id, sub.id, !!v)}
                                    />
                                    <span className="font-mono text-xs w-12 text-muted-foreground">
                                      {getSubjectShortCode(sub.subject_name, sub.subject_code)}
                                    </span>
                                    <span>{sub.subject_name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
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
