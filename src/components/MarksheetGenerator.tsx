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
  const { schoolId } = useSchool();
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
  const [loadingSheet, setLoadingSheet] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, c, s, g] = await Promise.all([
          supabase.from('terms').select('id,term_name,year,is_active').order('year', { ascending: false }),
          supabase.from('classes').select('id,class_name,section').order('class_name'),
          supabase.from('schools').select('id,school_name,logo_url').limit(1).maybeSingle(),
          supabase.from('grading_systems').select('grade_name,min_percentage,max_percentage,description').eq('is_active', true).order('min_percentage', { ascending: false }),
        ]);
        setTerms((t.data as any) || []);
        setClasses((c.data as any) || []);
        setSchool((s.data as any) || null);
        setGradingFull((g.data as any) || []);
        setGrading((g.data as any) || []);
        const active = (t.data as any[])?.find(x => x.is_active);
        if (active) setTermId(active.id);
      } catch (e) {
        console.error(e);
        toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!termId || !classId) return;
    loadSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termId, classId]);

  const loadSheet = async () => {
    setLoadingSheet(true);
    try {
      // Subjects for this class
      const { data: csLinks } = await supabase
        .from('class_subjects')
        .select('subject_id, subjects!class_subjects_subject_id_fkey(id, subject_name, subject_code)')
        .eq('class_id', classId);
      const subs: SubjectRow[] = ((csLinks || []) as any[])
        .map((l) => l.subjects)
        .filter(Boolean)
        .sort((a: any, b: any) => a.subject_name.localeCompare(b.subject_name));
      setSubjects(subs);

      const { data: studs } = await supabase
        .from('students')
        .select('id,name,class_id')
        .eq('class_id', classId)
        .order('name');
      const studentRows: StudentRow[] = (studs as any) || [];
      setStudents(studentRows);

      if (studentRows.length === 0 || subs.length === 0) {
        setMarks([]);
        return;
      }

      const { data: mk } = await supabase
        .from('student_marks')
        .select('student_id, subject_id, hundred_percent, eighty_percent, average_score, final_grade')
        .eq('term_id', termId)
        .in('student_id', studentRows.map(s => s.id))
        .in('subject_id', subs.map(s => s.id));
      setMarks((mk as any) || []);
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
  const scoreOf = (sid: string, subId: string): number | null => {
    const m = marks.find(x => x.student_id === sid && x.subject_id === subId);
    if (!m) return null;
    const v = m.hundred_percent ?? m.eighty_percent ?? m.average_score;
    return v == null ? null : Number(v);
  };

  const rows = useMemo(() => {
    return students.map((st, idx) => {
      const scores = subjects.map(sub => scoreOf(st.id, sub.id));
      const valid = scores.filter((v): v is number => v != null);
      const total = valid.reduce((a, b) => a + b, 0);
      const avg = valid.length ? total / valid.length : 0;
      const grade = valid.length ? gradeFromScore(avg, grading) : '';
      return { no: idx + 1, student: st, scores, total, avg, grade };
    });
  }, [students, subjects, marks, grading]);

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
    let cursorY = 10;

    // Logo
    if (school?.logo_url) {
      try {
        const dataUrl = await urlToDataUrl(school.logo_url);
        if (dataUrl) doc.addImage(dataUrl, 'PNG', 10, 8, 22, 22);
      } catch {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 40, 120);
    doc.setFontSize(20);
    doc.text(school?.school_name?.toUpperCase() || 'SCHOOL', pageW / 2, 15, { align: 'center' });
    doc.setFontSize(13);
    doc.text(`${term.term_name.toUpperCase()} MARKSHEET ${term.year}`, pageW / 2, 22, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Class: ${klass.class_name}${klass.section ? ' ' + klass.section : ''}`, pageW / 2 - 40, 29);
    doc.text(`Stream: ${klass.section || '-'}`, pageW / 2 + 20, 29);
    cursorY = 33;

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
      styles: { fontSize: 8, halign: 'center', cellPadding: 1.5, lineColor: [120, 140, 180], lineWidth: 0.2 },
      headStyles: { fillColor: [220, 230, 245], textColor: [20, 40, 120], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 8 }, 1: { halign: 'left', cellWidth: 38 } },
      margin: { left: 6, right: 6 },
      theme: 'grid',
    });

    let y = (doc as any).lastAutoTable.finalY + 4;

    // Summary of grades
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 40, 120);
    doc.text('SUMMARY OF GRADES', pageW / 2, y, { align: 'center' });
    y += 2;
    const sumHead = [['Grade', ...gradingFull.map(g => g.grade_name), 'Total Students']];
    const sumBody = [
      ['Number of Students', ...gradingFull.map(g => String(gradeCounts[g.grade_name] || 0)), String(rows.length)],
      ['Percentage (%)', ...gradingFull.map(g => rows.length ? `${(((gradeCounts[g.grade_name] || 0) / rows.length) * 100).toFixed(2)}%` : '0%'), '100%'],
    ];
    autoTable(doc, {
      head: sumHead, body: sumBody, startY: y + 1,
      styles: { fontSize: 8, halign: 'center', cellPadding: 1.5, lineColor: [120, 140, 180], lineWidth: 0.2 },
      headStyles: { fillColor: [220, 230, 245], textColor: [20, 40, 120], fontStyle: 'bold' },
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
      styles: { fontSize: 8, cellPadding: 1.2, lineColor: [120, 140, 180], lineWidth: 0.2 },
      headStyles: { fillColor: [220, 230, 245], textColor: [20, 40, 120], fontStyle: 'bold', halign: 'center' },
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

  if (loading) return <div className="p-6">Loading...</div>;

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
          <table className="w-full border-collapse text-[11px] border-2 border-[#1e3a8a]">
            <thead>
              <tr className="bg-[#eff6ff] text-[#1e3a8a]">
                <th className="border border-[#1e3a8a] px-1 py-2 w-10">No.</th>
                <th className="border border-[#1e3a8a] px-2 py-2 text-left">Student Name</th>
                {subjects.map(s => (
                  <th key={s.id} className="border border-[#1e3a8a] px-1 py-2">
                    <div className="font-bold">{s.subject_name}</div>
                    <div className="text-[10px] font-semibold">({getSubjectShortCode(s.subject_name, s.subject_code)})</div>
                  </th>
                ))}
                <th className="border border-[#1e3a8a] px-1 py-2">Total<br/>({totalMax})</th>
                <th className="border border-[#1e3a8a] px-1 py-2">Average<br/>(100)</th>
                <th className="border border-[#1e3a8a] px-1 py-2">Grade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.student.id} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-[#1e3a8a] px-1 py-1.5 text-center">{r.no}</td>
                  <td className="border border-[#1e3a8a] px-2 py-1.5">{r.student.name}</td>
                  {r.scores.map((v, i) => (
                    <td key={i} className="border border-[#1e3a8a] px-1 py-1.5 text-center">{v == null ? '-' : v}</td>
                  ))}
                  <td className="border border-[#1e3a8a] px-1 py-1.5 text-center font-semibold">{r.total}</td>
                  <td className="border border-[#1e3a8a] px-1 py-1.5 text-center">{r.avg.toFixed(2)}</td>
                  <td className="border border-[#1e3a8a] px-1 py-1.5 text-center font-bold">{r.grade}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={subjects.length + 5} className="text-center p-4 text-muted-foreground">No students in this class.</td></tr>
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