import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Student, Term, Class, Subject, StudentMark } from '@/types/database';
import { Plus, BookOpen, User, FileText } from 'lucide-react';

const StudentMarksManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [formData, setFormData] = useState({
    marks_obtained: '',
    grade: '',
    remarks: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedStudent && selectedTerm) {
      fetchStudentMarks();
    }
  }, [selectedStudent, selectedTerm]);

  const fetchData = async () => {
    try {
      const [studentsResult, termsResult, classesResult] = await Promise.all([
        supabase.from('students').select('*, classes!students_class_id_fkey(*)').order('name'),
        supabase.from('terms').select('*').order('year', { ascending: false }),
        supabase.from('classes').select('*').order('class_name')
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (termsResult.error) throw termsResult.error;
      if (classesResult.error) throw classesResult.error;

      setStudents(studentsResult.data || []);
      setTerms(termsResult.data || []);
      setClasses(classesResult.data || []);

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

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('class_id', selectedClass)
        .order('subject_name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchStudentMarks = async () => {
    try {
      const { data, error } = await supabase
        .from('student_marks')
        .select(`
          *,
          subjects!student_marks_subject_id_fkey(subject_name, max_marks)
        `)
        .eq('student_id', selectedStudent)
        .eq('term_id', selectedTerm)
        .order('created_at');

      if (error) throw error;
      setMarks((data as any) || []);
    } catch (error) {
      console.error('Error fetching student marks:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent || !selectedTerm || !selectedSubject || !formData.marks_obtained) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const subject = subjects.find(s => s.id === selectedSubject);
      const marksObtained = parseInt(formData.marks_obtained);
      const maxMarks = subject?.max_marks || 100;
      const percentage = (marksObtained / maxMarks) * 100;

      // Auto-calculate grade if not provided
      const grade = formData.grade || calculateGrade(percentage);

      const markData = {
        student_id: selectedStudent,
        term_id: selectedTerm,
        subject_id: selectedSubject,
        marks_obtained: marksObtained,
        grade,
        remarks: formData.remarks || 'Good'
      };

      // Check if mark already exists
      const existingMark = marks.find(m => m.subject_id === selectedSubject);
      
      if (existingMark) {
        const { error } = await supabase
          .from('student_marks')
          .update(markData)
          .eq('id', existingMark.id);

        if (error) throw error;
        toast({ title: "Success", description: "Mark updated successfully" });
      } else {
        const { error } = await supabase
          .from('student_marks')
          .insert([markData]);

        if (error) throw error;
        toast({ title: "Success", description: "Mark added successfully" });
      }

      setFormData({
        marks_obtained: '',
        grade: '',
        remarks: ''
      });
      setSelectedSubject('');
      await fetchStudentMarks();
    } catch (error) {
      console.error('Error saving mark:', error);
      toast({
        title: "Error",
        description: "Failed to save mark",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    return 'F';
  };

  const filteredStudents = selectedClass && selectedClass !== 'all'
    ? students.filter(student => student.class_id === selectedClass)
    : students;

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Add Student Marks
          </CardTitle>
          <CardDescription>
            Record marks for students in different subjects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Label htmlFor="class">Filter by Class</Label>
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
                <Label htmlFor="student">Select Student *</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mark Entry Form */}
            {selectedStudent && selectedTerm && (
              <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="subject">Subject *</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.subject_name} (Max: {subject.max_marks})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="marks">Marks Obtained *</Label>
                    <Input
                      id="marks"
                      type="number"
                      value={formData.marks_obtained}
                      onChange={(e) => setFormData(prev => ({ ...prev, marks_obtained: e.target.value }))}
                      placeholder="Enter marks"
                      min="0"
                      max={subjects.find(s => s.id === selectedSubject)?.max_marks || 100}
                    />
                  </div>

                  <div>
                    <Label htmlFor="grade">Grade (Auto-calculated)</Label>
                    <Input
                      id="grade"
                      value={formData.grade}
                      onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                      placeholder="Auto-calculated"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea
                      id="remarks"
                      value={formData.remarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Enter remarks (optional)"
                      rows={2}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add/Update Mark
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Marks */}
      {selectedStudent && selectedTerm && marks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Existing Marks</CardTitle>
            <CardDescription>
              Current marks for selected student and term
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {marks.map((mark) => {
                const subject = mark.subjects as any;
                const percentage = ((mark.marks_obtained / (subject?.max_marks || 100)) * 100).toFixed(1);
                
                return (
                  <div key={mark.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{subject?.subject_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {mark.marks_obtained}/{subject?.max_marks || 100} ({percentage}%)
                      </p>
                      {mark.remarks && (
                        <p className="text-sm text-muted-foreground italic">
                          "{mark.remarks}"
                        </p>
                      )}
                    </div>
                    <Badge variant={mark.grade === 'F' ? 'destructive' : 'default'}>
                      {mark.grade}
                    </Badge>
                  </div>
                );
              })}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Average:</span>
                  <span className="font-bold">
                    {marks.length > 0 
                      ? (marks.reduce((sum, mark) => sum + mark.marks_obtained, 0) / marks.length).toFixed(1)
                      : '0'}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentMarksManager;
