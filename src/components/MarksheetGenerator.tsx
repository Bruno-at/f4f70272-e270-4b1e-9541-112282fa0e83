import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { Download, FileSpreadsheet, Printer, FileText } from 'lucide-react';
import { getSubjectShortCode } from '@/utils/subjectCode';
import { gradeFromScore, type GradingRow } from '@/utils/reportEnrichment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ClassRow { id: string; class_name: string; section?: string | null }
interface TermRow { id: string; term_name: string; year: number; is_active: boolean }
interface SubjectRow { id: string; subject_name: string; subject_code?: string | null }
interface StudentRow { id: string; name: string; class_id: string }
interface MarkRow { student_id: string; subject_id: string; hundred_percent: number | null; eighty_percent: number | null; average_score: number | null; final_grade: string | null }
interface SchoolRow { id: string; school_name: string; logo_url?: string | null }

const MarksheetGenerator = () => {
  const { schoolId, loading: schoolLoading } = useSchool();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [grading, setGrading] = useState<GradingRow[]>([]);
  const [gradingFull, setGradingFull] = useState<Array<GradingRow & { description?: string | null }>>([]);

  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [usesIndividualSubjectAssignments, setUsesIndividualSubjectAssignments] = useState(false);
  const [studentSubjectIdsByStudent, setStudentSubjectIdsByStudent] = useState<Record<string, string[]>>({});
  const [loadingSheet, setLoadingSheet] = useState(false);

  useEffect(() => {
    if (!schoolId) {
      setTerms([]);
      setClasses([]);
      setSchool(null);
      setGrading([]);
      setGradingFull([]);
      setTermId('');
      setClassId('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [t, c, s, g] = await Promise.all([
          supabase.from('terms').select('id,term_name,year,is_active').eq('school_id', schoolId).order('year', { ascending: false }),
          supabase.from('classes').select('id,class_name,section').eq('school_id', schoolId).order('class_name'),
          supabase.from('schools').select('id,school_name,logo_url').eq('id', schoolId).maybeSingle(),
          supabase.from('grading_systems').select('grade_name,min_percentage,max_percentage,description').eq('school_id', schoolId).eq('is_active', true).order('min_percentage', { ascending: false }),
        ]);
        if (t.error) throw t.error;
        if (c.error) throw c.error;
        if (s.error) throw s.error;
        if (g.error) throw g.error;
        if (cancelled) return;

        setTerms((t.data as any) || []);
        setClasses((c.data as any) || []);
        setSchool((s.data as any) || null);
        setGradingFull((g.data as any) || []);
        setGrading((g.data as any) || []);
        const active = (t.data as any[])?.find(x => x.is_active);
        setTermId(active?.id || '');
      } catch (e) {
        console.error(e);
        toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, toast]);

  useEffect(() => {
    if (!termId || !classId) return;
    loadSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termId, classId]);

  const loadSheet = async () => {
    if (!schoolId) return;
    setLoadingSheet(true);
    try {
      const debugOutput: Record<string, unknown> = {
        selected_class_id: classId,
        selected_term_id: termId,
      };

      const { data: selectedClass, error: classError } = await supabase
        .from('classes')
        .select('id, class_name, section, school_id')
        .eq('school_id', schoolId)
        .eq('id', classId)
        .maybeSingle();
      if (classError) throw classError;
      if (!selectedClass) throw new Error('Selected class was not found for this school');
      debugOutput.selected_class = selectedClass;

      // Step 1: read the class → subject junction directly.
      // Do not use embedded joins here because class_subjects has no FK relationship
      // exposed in the PostgREST schema cache in this project.
      const { data: classSubjectLinks, error: classSubjectsError } = await supabase
        .from('class_subjects')
        .select('class_id, subject_id, school_id')
        .eq('school_id', schoolId)
        .eq('class_id', classId);
      if (classSubjectsError) throw classSubjectsError;
      const classSubjectIds = Array.from(new Set(((classSubjectLinks || []) as any[]).map((l) => l.subject_id).filter(Boolean)));
      debugOutput.class_subjects_records = classSubjectLinks || [];

      const { data: studs, error: studentsError } = await supabase
        .from('students')
        .select('id,name,class_id')
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .order('name');
      if (studentsError) throw studentsError;
      const studentRows: StudentRow[] = (studs as any) || [];
      setStudents(studentRows);
      debugOutput.students_returned = studentRows;
      debugOutput.number_of_students_returned = studentRows.length;

      // Step 2: if individual student subject assignments exist for this class,
      // use their union for the columns; otherwise use all class subjects.
      let studentSubjectRows: Array<{ student_id: string; subject_id: string; school_id: string | null }> = [];
      if (studentRows.length > 0) {
        const { data: ss, error: studentSubjectsError } = await supabase
          .from('student_subjects')
          .select('student_id, subject_id, school_id')
          .eq('school_id', schoolId)
          .in('student_id', studentRows.map((s) => s.id));
        if (studentSubjectsError) throw studentSubjectsError;
        studentSubjectRows = (ss as any) || [];
      }

      const perStudentAssignments: Record<string, string[]> = {};
      studentSubjectRows.forEach((row) => {
        perStudentAssignments[row.student_id] = [
          ...(perStudentAssignments[row.student_id] || []),
          row.subject_id,
        ];
      });
      const studentSubjectIds = Array.from(new Set(studentSubjectRows.map((row) => row.subject_id).filter(Boolean)));
      const hasIndividualAssignments = studentSubjectIds.length > 0;
      const subjectIds = hasIndividualAssignments ? studentSubjectIds : classSubjectIds;

      setUsesIndividualSubjectAssignments(hasIndividualAssignments);
      setStudentSubjectIdsByStudent(perStudentAssignments);
      debugOutput.student_subject_assignments_records = studentSubjectRows;
      debugOutput.subject_assignment_mode = hasIndividualAssignments ? 'student_subjects' : 'class_subjects';
      debugOutput.subject_ids = subjectIds;

      let subs: SubjectRow[] = [];
      if (subjectIds.length > 0) {
        const { data: subjData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, subject_name, subject_code')
          .eq('school_id', schoolId)
          .in('id', subjectIds);
        if (subjectsError) throw subjectsError;
        subs = ((subjData as any) || []).sort((a: any, b: any) => a.subject_name.localeCompare(b.subject_name));
      }
      setSubjects(subs);
      debugOutput.subjects_returned = subs;
      debugOutput.number_of_subjects_returned = subs.length;

      if (studentRows.length === 0 || subs.length === 0) {
        setMarks([]);
        debugOutput.marks_returned = [];
        debugOutput.number_of_marks_returned = 0;
        console.info('[Marksheet data flow]', debugOutput);
        return;
      }

      const { data: mk, error: marksError } = await supabase
        .from('student_marks')
        .select('student_id, subject_id, hundred_percent, eighty_percent, average_score, final_grade')
        .eq('school_id', schoolId)
        .eq('term_id', termId)
        .in('student_id', studentRows.map(s => s.id))
        .in('subject_id', subs.map(s => s.id));
      if (marksError) throw marksError;
      const markRows: MarkRow[] = (mk as any) || [];
      setMarks(markRows);
      debugOutput.marks_returned = markRows;
      debugOutput.number_of_marks_returned = markRows.length;
      console.info('[Marksheet data flow]', debugOutput);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to build marksheet', variant: 'destructive' });
    } finally {
      setLoadingSheet(false);
    }
  };

  const term = terms.find(t => t.id === termId) || null;
  const klass = classes.find(c => c.id === classId) || null;

  // Build matrix [studentId][subjectId] = score
  const marksIndex = useMemo(() => {
    const map = new Map<string, MarkRow>();
    marks.forEach(m => map.set(`${m.student_id}::${m.subject_id}`, m));
    return map;
  }, [marks]);

  const scoreOf = (sid: string, subId: string): number | null => {
    const m = marksIndex.get(`${sid}::${subId}`);
    if (!m) return null;
    const raw = m.hundred_percent ?? m.eighty_percent ?? m.average_score;
    if (raw === null || raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const rows = useMemo(() => {
    return students.map((st, idx) => {
      const assignedSubjectIds = studentSubjectIdsByStudent[st.id] || [];
      const scores = subjects.map(sub => {
        if (usesIndividualSubjectAssignments && !assignedSubjectIds.includes(sub.id)) return null;
        return scoreOf(st.id, sub.id);
      });
      const valid = scores.filter((v): v is number => v != null);
      const total = valid.reduce((a, b) => a + b, 0);
      const avg = valid.length ? total / valid.length : 0;
      const grade = valid.length ? gradeFromScore(avg, grading) : '';
      return { no: idx + 1, student: st, scores, total, avg, grade };
    });
  }, [students, subjects, marks, grading, usesIndividualSubjectAssignments, studentSubjectIdsByStudent]);

  const totalMax = subjects.length * 100;

  const gradeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    gradingFull.forEach(g => { map[g.grade_name] = 0; });
    rows.forEach(r => { if (r.grade) map[r.grade] = (map[r.grade] || 0) + 1; });
    return map;
  }, [rows, gradingFull]);

  const stats = useMemo(() => {
    if (rows.length === 0) return null;
    const totals = rows.map(r => r.total);
    const hi = Math.max(...totals);
    const lo = Math.min(...totals);
    const hiStudent = rows.find(r => r.total === hi)?.student.name || '';
    const loStudent = rows.find(r => r.total === lo)?.student.name || '';
    const classAvg = totals.reduce((a, b) => a + b, 0) / rows.length;
    return { hi, lo, hiStudent, loStudent, classAvg };
  }, [rows]);

  // ---------- Exports ----------
  const exportExcel = () => {
    if (!klass || !term) return;
    const header = ['No.', 'Student Name', ...subjects.map(s => `${s.subject_name} (${getSubjectShortCode(s.subject_name, s.subject_code)})`), `Total (${totalMax})`, 'Average (100)', 'Grade'];
    const body = rows.map(r => [r.no, r.student.name, ...r.scores.map(v => v == null ? '' : v), r.total, Number(r.avg.toFixed(2)), r.grade]);
    const ws = XLSX.utils.aoa_to_sheet([
      [school?.school_name || ''],
      [`${term.term_name.toUpperCase()} MARKSHEET ${term.year}`],
      [`Class: ${klass.class_name}${klass.section ? ' ' + klass.section : ''}`, '', `Stream: ${klass.section || '-'}`],
      [],
      header,
      ...body,
      [],
      ['SUMMARY OF GRADES'],
      ['Grade', ...gradingFull.map(g => g.grade_name), 'Total Students'],
      ['Number of Students', ...gradingFull.map(g => gradeCounts[g.grade_name] || 0), rows.length],
      ['Percentage (%)', ...gradingFull.map(g => rows.length ? `${(((gradeCounts[g.grade_name] || 0) / rows.length) * 100).toFixed(2)}%` : '0%'), '100%'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marksheet');
    XLSX.writeFile(wb, `Marksheet_${klass.class_name}_${term.term_name}_${term.year}.xlsx`);
  };

  const exportPDF = async () => {
    if (!klass || !term) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    // Logo box
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.6);
    doc.rect(8, 8, 24, 24);
    if (school?.logo_url) {
      try {
        const dataUrl = await urlToDataUrl(school.logo_url);
        if (dataUrl) doc.addImage(dataUrl, 'PNG', 9, 9, 22, 22);
      } catch {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(24);
    doc.text(school?.school_name?.toUpperCase() || 'SCHOOL', pageW / 2, 17, { align: 'center' });
    doc.setFontSize(15);
    doc.setTextColor(37, 99, 235);
    doc.text(`${term.term_name.toUpperCase()} MARKSHEET ${term.year}`, pageW / 2, 25, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Class: ${klass.class_name}${klass.section ? ' ' + klass.section : ''}`, pageW / 2 - 35, 32);
    doc.text(`Stream: ${klass.section || '-'}`, pageW / 2 + 20, 32);
    const cursorY = 36;

    const head = [[
      'No.', 'Student Name',
      ...subjects.map(s => `${s.subject_name}\n(${getSubjectShortCode(s.subject_name, s.subject_code)})`),
      `Total\n(${totalMax})`, 'Average\n(100)', 'Grade'
    ]];
    const body = rows.map(r => [
      r.no, r.student.name,
      ...r.scores.map(v => v == null ? '-' : String(v)),
      r.total, r.avg.toFixed(2), r.grade,
    ]);

    autoTable(doc, {
      head, body, startY: cursorY,
      styles: { fontSize: 8, halign: 'center', cellPadding: 1.5, lineColor: [30, 58, 138], lineWidth: 0.2 },
      headStyles: { fillColor: [239, 246, 255], textColor: [30, 58, 138], fontStyle: 'bold', lineColor: [30, 58, 138], lineWidth: 0.3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 8 }, 1: { halign: 'left', cellWidth: 42, fontStyle: 'normal' } },
      margin: { left: 6, right: 6 },
      theme: 'grid',
    });

    let y = (doc as any).lastAutoTable.finalY + 4;

    // Summary of grades
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 58, 138);
    doc.text('SUMMARY OF GRADES', pageW / 2, y, { align: 'center' });
    y += 2;
    const sumHead = [['Grade', ...gradingFull.map(g => g.grade_name), 'Total Students']];
    const sumBody = [
      ['Number of Students', ...gradingFull.map(g => String(gradeCounts[g.grade_name] || 0)), String(rows.length)],
      ['Percentage (%)', ...gradingFull.map(g => rows.length ? `${(((gradeCounts[g.grade_name] || 0) / rows.length) * 100).toFixed(2)}%` : '0%'), '100%'],
    ];
    autoTable(doc, {
      head: sumHead, body: sumBody, startY: y + 1,
      styles: { fontSize: 8, halign: 'center', cellPadding: 1.5, lineColor: [30, 58, 138], lineWidth: 0.2 },
      headStyles: { fillColor: [239, 246, 255], textColor: [30, 58, 138], fontStyle: 'bold', lineColor: [30, 58, 138], lineWidth: 0.3 },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 58, 138] } },
      margin: { left: 6, right: 6 },
      theme: 'grid',
    });

    y = (doc as any).lastAutoTable.finalY + 4;

    // Stats & grading scale side by side
    const statsLines = stats ? [
      `Highest Score : ${stats.hi} (${stats.hiStudent})`,
      `Lowest Score  : ${stats.lo} (${stats.loStudent})`,
      `Class Average : ${stats.classAvg.toFixed(2)}`,
      `Total Students: ${rows.length}`,
      `Total Subjects: ${subjects.length}`,
    ] : [];

    doc.setFontSize(9); doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold');
    doc.text('CLASS STATISTICS', 10, y + 4);
    doc.setFont('helvetica', 'normal');
    statsLines.forEach((ln, i) => doc.text(ln, 10, y + 9 + i * 5));

    autoTable(doc, {
      head: [['Grade', 'Range (%)', 'Description']],
      body: gradingFull.map(g => [g.grade_name, `${g.min_percentage}% - ${g.max_percentage}%`, g.description || '']),
      startY: y,
      styles: { fontSize: 8, cellPadding: 1.2, lineColor: [30, 58, 138], lineWidth: 0.2 },
      headStyles: { fillColor: [239, 246, 255], textColor: [30, 58, 138], fontStyle: 'bold', halign: 'center', lineColor: [30, 58, 138], lineWidth: 0.3 },
      margin: { left: 95, right: pageW - 95 - 110 },
      tableWidth: 110,
      theme: 'grid',
    });

    doc.save(`Marksheet_${klass.class_name}_${term.term_name}_${term.year}.pdf`);
  };

  const urlToDataUrl = async (url: string): Promise<string> => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  };

  const printSheet = () => window.print();

  if (loading || schoolLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div>
          <Label>Active Term</Label>
          <Select value={termId} onValueChange={setTermId}>
            <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
            <SelectContent>
              {terms.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.term_name} {t.year}{t.is_active ? ' (Active)' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Class / Stream</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.class_name}{c.section ? ` ${c.section}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <Button onClick={exportPDF} disabled={!classId || !termId || rows.length === 0}>
            <Download className="w-4 h-4 mr-2" />PDF
          </Button>
          <Button onClick={exportExcel} variant="secondary" disabled={!classId || !termId || rows.length === 0}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
          </Button>
          <Button onClick={printSheet} variant="outline" disabled={!classId || !termId || rows.length === 0}>
            <Printer className="w-4 h-4 mr-2" />Print
          </Button>
        </div>
      </div>

      {!classId || !termId ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-60" />
          Select a term and class to generate the marksheet.
        </CardContent></Card>
      ) : loadingSheet ? (
        <div className="p-6">Building marksheet...</div>
      ) : (
        <div id="marksheet-print" className="bg-white text-black overflow-auto p-4 print:p-0">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr] items-center gap-4 mb-3">
            <div className="w-24 h-24 border-2 border-[#1e3a8a] flex items-center justify-center bg-white">
              {school?.logo_url ? (
                <img src={school.logo_url} alt="logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-[10px] text-slate-500">LOGO</span>
              )}
            </div>
            <div className="text-center">
              <h2 className="text-4xl font-extrabold text-[#1e3a8a] tracking-wide leading-tight">
                {school?.school_name?.toUpperCase()}
              </h2>
              <p className="text-2xl font-bold text-[#2563eb] mt-1">
                {term?.term_name.toUpperCase()} MARKSHEET {term?.year}
              </p>
              <p className="text-lg font-semibold mt-2">
                <span>Class: {klass?.class_name}{klass?.section ? ` ${klass?.section}` : ''}</span>
                <span className="inline-block w-16" />
                <span>Stream: {klass?.section || '-'}</span>
              </p>
            </div>
          </div>

          {/* Marks Table */}
          <table className="w-full border-collapse text-[12px] border border-slate-400 bg-white">
            <thead>
              <tr className="bg-[#dbeafe] text-[#1e3a8a]">
                <th className="border border-slate-400 px-2 py-2 w-10 font-bold">No.</th>
                <th className="border border-slate-400 px-3 py-2 text-left font-bold">Student Name</th>
                {subjects.map(s => (
                  <th key={s.id} className="border border-slate-400 px-2 py-2">
                    <div className="font-bold">{s.subject_name}</div>
                    <div className="text-[11px] font-bold">({getSubjectShortCode(s.subject_name, s.subject_code)})</div>
                  </th>
                ))}
                <th className="border border-slate-400 px-2 py-2 font-bold">Total<br/>({totalMax})</th>
                <th className="border border-slate-400 px-2 py-2 font-bold">Average<br/>(100)</th>
                <th className="border border-slate-400 px-2 py-2 font-bold">Grade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.student.id} className="bg-white">
                  <td className="border border-slate-400 px-2 py-2 text-center">{r.no}</td>
                  <td className="border border-slate-400 px-3 py-2">{r.student.name}</td>
                  {r.scores.map((v, i) => (
                    <td key={i} className="border border-slate-400 px-2 py-2 text-center">{v == null ? '-' : v}</td>
                  ))}
                  <td className="border border-slate-400 px-2 py-2 text-center">{r.total}</td>
                  <td className="border border-slate-400 px-2 py-2 text-center">{r.avg.toFixed(2)}</td>
                  <td className="border border-slate-400 px-2 py-2 text-center">{r.grade}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={subjects.length + 5} className="text-center p-4 text-muted-foreground">
                  {subjects.length === 0 ? 'No subjects assigned to this class.' : 'No students in this class.'}
                </td></tr>
              )}
            </tbody>
          </table>

          {/* Summary of grades */}
          <div className="text-center font-bold text-[#1e3a8a] mt-4 mb-1 text-base">SUMMARY OF GRADES</div>
          <table className="w-full border-collapse text-[11px] border-2 border-[#1e3a8a]">
            <thead>
              <tr className="bg-[#eff6ff] text-[#1e3a8a]">
                <th className="border border-[#1e3a8a] px-2 py-1.5 text-left w-56">GRADE</th>
                {gradingFull.map(g => <th key={g.grade_name} className="border border-[#1e3a8a] px-2 py-1.5">{g.grade_name}</th>)}
                <th className="border border-[#1e3a8a] px-2 py-1.5 bg-[#dbeafe]">TOTAL STUDENTS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-[#1e3a8a] px-2 py-1.5 font-semibold bg-[#eff6ff] text-[#1e3a8a]">NUMBER OF STUDENTS</td>
                {gradingFull.map(g => <td key={g.grade_name} className="border border-[#1e3a8a] px-2 py-1.5 text-center">{gradeCounts[g.grade_name] || 0}</td>)}
                <td className="border border-[#1e3a8a] px-2 py-1.5 text-center font-semibold">{rows.length}</td>
              </tr>
              <tr>
                <td className="border border-[#1e3a8a] px-2 py-1.5 font-semibold bg-[#eff6ff] text-[#1e3a8a]">PERCENTAGE (%)</td>
                {gradingFull.map(g => (
                  <td key={g.grade_name} className="border border-[#1e3a8a] px-2 py-1.5 text-center">
                    {rows.length ? `${(((gradeCounts[g.grade_name] || 0) / rows.length) * 100).toFixed(2)}%` : '0%'}
                  </td>
                ))}
                <td className="border border-[#1e3a8a] px-2 py-1.5 text-center font-semibold">100%</td>
              </tr>
            </tbody>
          </table>

          {/* Stats + grading scale + comment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-[11px]">
            <div className="border-2 border-[#1e3a8a]">
              <div className="text-center font-bold text-[#1e3a8a] bg-[#eff6ff] py-1.5 border-b-2 border-[#1e3a8a]">CLASS STATISTICS</div>
              {stats && (
                <div className="p-3 space-y-1">
                  <div className="flex"><span className="w-32">Highest Score</span><span>: <span className="font-semibold">{stats.hi}</span> ({stats.hiStudent})</span></div>
                  <div className="flex"><span className="w-32">Lowest Score</span><span>: <span className="font-semibold">{stats.lo}</span> ({stats.loStudent})</span></div>
                  <div className="flex"><span className="w-32">Class Average</span><span>: <span className="font-semibold">{stats.classAvg.toFixed(2)}</span></span></div>
                  <div className="flex"><span className="w-32">Total Students</span><span>: <span className="font-semibold">{rows.length}</span></span></div>
                  <div className="flex"><span className="w-32">Total Subjects</span><span>: <span className="font-semibold">{subjects.length}</span></span></div>
                </div>
              )}
            </div>
            <div className="border-2 border-[#1e3a8a]">
              <div className="text-center font-bold text-[#1e3a8a] bg-[#eff6ff] py-1.5 border-b-2 border-[#1e3a8a]">GRADING SCALE</div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-[#1e3a8a] px-2 py-1">Grade</th>
                    <th className="border border-[#1e3a8a] px-2 py-1">Range (%)</th>
                    <th className="border border-[#1e3a8a] px-2 py-1">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {gradingFull.map(g => (
                    <tr key={g.grade_name}>
                      <td className="border border-[#1e3a8a] px-2 py-1 text-center font-semibold">{g.grade_name}</td>
                      <td className="border border-[#1e3a8a] px-2 py-1 text-center">{g.min_percentage}% - {g.max_percentage}%</td>
                      <td className="border border-[#1e3a8a] px-2 py-1">{g.description || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-2 border-[#1e3a8a] p-3">
              <div className="font-semibold mb-2">Class Teacher's Comment: <span className="inline-block border-b border-slate-500 w-56 align-bottom" /></div>
              <div className="border-b border-slate-500 h-5 mt-3" />
              <div className="flex gap-6 mt-8 text-[11px]">
                <div className="flex-1">Signature: <span className="inline-block border-b border-slate-500 w-40 align-bottom" /></div>
                <div>Date: <span className="inline-block border-b border-slate-500 w-24 align-bottom" /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #marksheet-print, #marksheet-print * { visibility: visible; }
          #marksheet-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 8mm; }
        }
      `}</style>
    </div>
  );
};

export default MarksheetGenerator;