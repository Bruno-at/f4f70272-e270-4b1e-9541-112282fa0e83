import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Student, Term, Class, Subject, SchoolInfo } from '@/types/database';
import { Download, FileText, Users } from 'lucide-react';
import { generateReportCardPDF } from '@/utils/pdfGenerator';

const ReportGenerator = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [teacherComment, setTeacherComment] = useState('');
  const [headteacherComment, setHeadteacherComment] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsResult, termsResult, classesResult, subjectsResult, schoolResult] = await Promise.all([
        supabase.from('students').select('*, classes!students_class_id_fkey(*)').order('name'),
        supabase.from('terms').select('*').order('year', { ascending: false }),
        supabase.from('classes').select('*').order('class_name'),
        supabase.from('subjects').select('*').order('subject_name'),
        supabase.from('school_info').select('*').limit(1).maybeSingle()
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (termsResult.error) throw termsResult.error;
      if (classesResult.error) throw classesResult.error;
      if (subjectsResult.error) throw subjectsResult.error;
      if (schoolResult.error) throw schoolResult.error;

      setStudents(studentsResult.data || []);
      setTerms(termsResult.data || []);
      setClasses(classesResult.data || []);
      setSubjects(subjectsResult.data || []);
      setSchoolInfo(schoolResult.data);

      // Set active term as default
      const activeTerm = termsResult.data?.find(term => term.is_active);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = selectedClass && selectedClass !== 'all'
    ? students.filter(student => student.class_id === selectedClass)
    : students;

  const generateSingleReport = async () => {
    if (!selectedStudent || !selectedTerm || !schoolInfo) {
      toast({
        title: "Error",
        description: "Please select a student, term, and ensure school info is configured",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      await generateReportForStudent(selectedStudent);
      toast({
        title: "Success",
        description: "Report card generated successfully"
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report card",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateBulkReports = async () => {
    if (!selectedTerm || !schoolInfo || filteredStudents.length === 0) {
      toast({
        title: "Error",
        description: "Please select a term and ensure students are available",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      for (const student of filteredStudents) {
        await generateReportForStudent(student.id);
      }
      
      toast({
        title: "Success",
        description: `${filteredStudents.length} report cards generated successfully`
      });
    } catch (error) {
      console.error('Error generating bulk reports:', error);
      toast({
        title: "Error",
        description: "Failed to generate bulk report cards",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateReportForStudent = async (studentId: string) => {
    // Fetch student marks for the selected term
    const { data: marks, error: marksError } = await supabase
      .from('student_marks')
      .select(`
        *,
        subjects!student_marks_subject_id_fkey(*)
      `)
      .eq('student_id', studentId)
      .eq('term_id', selectedTerm);

    if (marksError) throw marksError;

    // Find the student
    const student = students.find(s => s.id === studentId);
    if (!student) throw new Error('Student not found');

    // Find the term
    const term = terms.find(t => t.id === selectedTerm);
    if (!term) throw new Error('Term not found');

    // Generate or update report card record
    const { data: existingReport } = await supabase
      .from('report_cards')
      .select('*')
      .eq('student_id', studentId)
      .eq('term_id', selectedTerm)
      .maybeSingle();

    const overallAverage = marks && marks.length > 0 ? 
      marks.reduce((sum, mark) => sum + (mark.hundred_percent || 0), 0) / marks.length : 0;

    // Auto-generate comments based on overall average
    let autoClassTeacherComment = teacherComment || 'Good work, keep it up!';
    let autoHeadteacherComment = headteacherComment || 'Excellent progress this term.';

    if (overallAverage > 0) {
      const { data: classTeacherCommentTemplate } = await supabase
        .from('comment_templates')
        .select('comment_text')
        .eq('comment_type', 'class_teacher')
        .eq('is_active', true)
        .lte('min_average', overallAverage)
        .gte('max_average', overallAverage)
        .maybeSingle();

      const { data: headteacherCommentTemplate } = await supabase
        .from('comment_templates')
        .select('comment_text')
        .eq('comment_type', 'headteacher')
        .eq('is_active', true)
        .lte('min_average', overallAverage)
        .gte('max_average', overallAverage)
        .maybeSingle();

      if (classTeacherCommentTemplate) {
        autoClassTeacherComment = classTeacherCommentTemplate.comment_text;
      }
      if (headteacherCommentTemplate) {
        autoHeadteacherComment = headteacherCommentTemplate.comment_text;
      }
    }

    const reportData = {
      student_id: studentId,
      term_id: selectedTerm,
      class_teacher_comment: autoClassTeacherComment,
      headteacher_comment: autoHeadteacherComment,
      overall_average: overallAverage,
      overall_grade: calculateGrade(overallAverage),
      overall_identifier: marks && marks.length > 0 ?
        Math.round(marks.reduce((sum, mark) => sum + (mark.identifier || 2), 0) / marks.length) : 2,
      achievement_level: calculateAchievementLevel(marks && marks.length > 0 ?
        Math.round(marks.reduce((sum, mark) => sum + (mark.identifier || 2), 0) / marks.length) : 2),
      generated_at: new Date().toISOString()
    };

    if (existingReport) {
      await supabase
        .from('report_cards')
        .update(reportData)
        .eq('id', existingReport.id);
    } else {
      await supabase
        .from('report_cards')
        .insert([reportData]);
    }

    // Generate PDF
    await generateReportCardPDF({
      student,
      term,
      schoolInfo: schoolInfo!,
      marks: marks || [],
      reportData: {
        overall_average: reportData.overall_average,
        overall_grade: reportData.overall_grade,
        overall_identifier: reportData.overall_identifier,
        achievement_level: reportData.achievement_level,
        class_teacher_comment: reportData.class_teacher_comment,
        headteacher_comment: reportData.headteacher_comment,
      },
      subjects
    });
  };

  const calculateGrade = (average: number): string => {
    if (average >= 80) return 'A';
    if (average >= 70) return 'B';
    if (average >= 60) return 'C';
    if (average >= 40) return 'D';
    return 'E';
  };

  const calculateAchievementLevel = (identifier: number): string => {
    if (identifier >= 2.5) return 'Outstanding';
    if (identifier >= 1.5) return 'Moderate';
    return 'Basic';
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!schoolInfo) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Please configure school information first before generating reports.
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="term">Select Term *</Label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger>
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              {terms.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.term_name} {term.year}
                  {term.is_active && ' (Active)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="class">Filter by Class (Optional)</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.class_name} {cls.section ? `- ${cls.section}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="student">Individual Student (Optional)</Label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger>
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Select for single report</SelectItem>
              {filteredStudents.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="teacher-comment">Class Teacher's Comment</Label>
          <Textarea
            id="teacher-comment"
            value={teacherComment}
            onChange={(e) => setTeacherComment(e.target.value)}
            placeholder="Enter class teacher's comment..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="headteacher-comment">Headteacher's Comment</Label>
          <Textarea
            id="headteacher-comment"
            value={headteacherComment}
            onChange={(e) => setHeadteacherComment(e.target.value)}
            placeholder="Enter headteacher's comment..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Individual Report
            </CardTitle>
            <CardDescription>
              Generate a report card for a single student
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={generateSingleReport}
              disabled={!selectedStudent || !selectedTerm || generating}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Generate Single Report'}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Bulk Reports
            </CardTitle>
            <CardDescription>
              Generate report cards for {filteredStudents.length} student(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={generateBulkReports}
              disabled={!selectedTerm || filteredStudents.length === 0 || generating}
              className="w-full"
              variant="secondary"
            >
              <Download className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : `Generate ${filteredStudents.length} Reports`}
            </Button>
          </CardContent>
        </Card>
      </div>

      {!selectedTerm && (
        <Card className="border-warning">
          <CardContent className="p-4">
            <p className="text-warning-foreground text-sm">
              ⚠️ Please select a term to enable report generation
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportGenerator;