import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Student, Subject, Term, StudentMark, Class } from '@/types/database';
import { Plus, Edit, Trash2, X, Search, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';


interface SubjectFormData {
  id: string;
  subject_id: string;
  subject_code: string;
  a1_score: string;
  a2_score: string;
  a3_score: string;
  average_score: string;
  twenty_percent: string;
  eighty_percent: string;
  hundred_percent: string;
  identifier: string;
  final_grade: string;
  achievement_level: string;
  teacher_initials: string;
}

const StudentMarksManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [filteredMarks, setFilteredMarks] = useState<StudentMark[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('all-classes');
  const [selectedTerm, setSelectedTerm] = useState<string>('all-terms');
  const [selectedSubject, setSelectedSubject] = useState<string>('all-subjects');
  const [editingMark, setEditingMark] = useState<StudentMark | null>(null);
  
  // Batch form fields
  const [batchStudentId, setBatchStudentId] = useState('');
  const [batchTermId, setBatchTermId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSort, setStudentSort] = useState<'a-z' | 'z-a' | 'new-old' | 'old-new'>('a-z');
  const [subjectForms, setSubjectForms] = useState<SubjectFormData[]>([{
    id: crypto.randomUUID(),
    subject_id: '',
    subject_code: '',
    a1_score: '',
    a2_score: '',
    a3_score: '',
    average_score: '',
    twenty_percent: '',
    eighty_percent: '',
    hundred_percent: '',
    identifier: '',
    final_grade: '',
    achievement_level: '',
    teacher_initials: ''
  }]);

  const { toast } = useToast();
  
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterMarks();
  }, [marks, selectedClass, selectedTerm, selectedSubject]);

  const fetchData = async () => {
    try {
      const [studentsRes, subjectsRes, termsRes, classesRes, marksRes] = await Promise.all([
        supabase.from('students').select('*, classes!students_class_id_fkey(*)').order('name'),
        supabase.from('subjects').select('*').order('subject_name'),
        supabase.from('terms').select('*').order('year', { ascending: false }),
        supabase.from('classes').select('*').order('class_name'),
        supabase.from('student_marks').select('*, subjects!student_marks_subject_id_fkey(*), students!student_marks_student_id_fkey(name, classes!students_class_id_fkey(id, class_name, section))').order('created_at', { ascending: false })
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (termsRes.error) throw termsRes.error;
      if (classesRes.error) throw classesRes.error;
      if (marksRes.error) throw marksRes.error;

      setStudents(studentsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setTerms(termsRes.data || []);
      setClasses(classesRes.data || []);
      setMarks(marksRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMarks = () => {
    let filtered = marks;

    if (selectedClass && selectedClass !== 'all-classes') {
      filtered = filtered.filter(mark => 
        mark.students?.classes?.id === selectedClass
      );
    }

    if (selectedTerm && selectedTerm !== 'all-terms') {
      filtered = filtered.filter(mark => mark.term_id === selectedTerm);
    }

    if (selectedSubject && selectedSubject !== 'all-subjects') {
      filtered = filtered.filter(mark => mark.subject_id === selectedSubject);
    }

    setFilteredMarks(filtered);
  };

  const getFilteredAndSortedStudents = () => {
    let filtered = students;

    // Apply search filter
    if (studentSearch.trim()) {
      const searchLower = studentSearch.toLowerCase();
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchLower) ||
        student.student_id?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (studentSort) {
      case 'a-z':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'z-a':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'new-old':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'old-new':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
    }

    return sorted;
  };

  const calculateAverageForForm = (formId: string, a1: string, a2: string, a3: string) => {
    const avg = ((parseFloat(a1) || 0) + (parseFloat(a2) || 0) + (parseFloat(a3) || 0)) / 3;
    updateSubjectForm(formId, 'average_score', avg.toFixed(1));
  };

  const [gradingSystems, setGradingSystems] = useState<any[]>([]);

  useEffect(() => {
    fetchGradingSystems();
  }, []);

  const fetchGradingSystems = async () => {
    try {
      const { data, error } = await supabase
        .from('grading_systems')
        .select('*')
        .eq('is_active', true)
        .order('min_percentage', { ascending: false });

      if (error) throw error;
      setGradingSystems(data || []);
    } catch (error) {
      console.error('Error fetching grading systems:', error);
    }
  };

  const calculateGradeAndLevelForForm = (formId: string, hundredPercent: string, identifier: string) => {
    const grade = calculateGrade(parseFloat(hundredPercent) || 0);
    const achievementLevel = calculateAchievementLevel(parseInt(identifier) || 1);
    
    setSubjectForms(prev => prev.map(form =>
      form.id === formId
        ? { ...form, final_grade: grade, achievement_level: achievementLevel }
        : form
    ));
  };

  const calculateGrade = (percentage: number): string => {
    // Use configurable grading system if available
    if (gradingSystems.length > 0) {
      const grade = gradingSystems.find(g => 
        percentage >= g.min_percentage && percentage <= g.max_percentage
      );
      return grade ? grade.grade_name : 'E';
    }
    
    // Fallback to default grading system
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 40) return 'D';
    return 'E';
  };

  const calculateAchievementLevel = (identifier: number): string => {
    if (identifier >= 2.5) return 'Outstanding';
    if (identifier >= 1.5) return 'Moderate';
    return 'Basic';
  };

  const updateSubjectForm = (formId: string, field: keyof SubjectFormData, value: string) => {
    setSubjectForms(prev => prev.map(form =>
      form.id === formId ? { ...form, [field]: value } : form
    ));
  };

  const addSubjectForm = () => {
    setSubjectForms(prev => [...prev, {
      id: crypto.randomUUID(),
      subject_id: '',
      subject_code: '',
      a1_score: '',
      a2_score: '',
      a3_score: '',
      average_score: '',
      twenty_percent: '',
      eighty_percent: '',
      hundred_percent: '',
      identifier: '',
      final_grade: '',
      achievement_level: '',
      teacher_initials: ''
    }]);
  };

  const removeSubjectForm = (formId: string) => {
    if (subjectForms.length > 1) {
      setSubjectForms(prev => prev.filter(form => form.id !== formId));
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!batchStudentId || !batchTermId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a student and term',
        variant: 'destructive',
      });
      return;
    }

    const invalidForms = subjectForms.filter(form => 
      !form.subject_id || !form.a1_score || !form.a2_score || !form.a3_score
    );

    if (invalidForms.length > 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields for each subject',
        variant: 'destructive',
      });
      return;
    }

    try {
      const marksData = subjectForms.map(form => ({
        student_id: batchStudentId,
        subject_id: form.subject_id,
        term_id: batchTermId,
        subject_code: form.subject_code || null,
        a1_score: parseFloat(form.a1_score) || null,
        a2_score: parseFloat(form.a2_score) || null,
        a3_score: parseFloat(form.a3_score) || null,
        average_score: parseFloat(form.average_score) || null,
        twenty_percent: parseFloat(form.twenty_percent) || null,
        eighty_percent: parseFloat(form.eighty_percent) || null,
        hundred_percent: parseFloat(form.hundred_percent) || null,
        identifier: parseInt(form.identifier) || null,
        final_grade: form.final_grade || null,
        achievement_level: form.achievement_level || null,
        teacher_initials: form.teacher_initials || null
      }));

      const { error } = await supabase
        .from('student_marks')
        .insert(marksData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Successfully added ${marksData.length} subject mark(s)`,
      });

      setIsDialogOpen(false);
      resetBatchForm();
      fetchData();
    } catch (error) {
      console.error('Error saving marks:', error);
      toast({
        title: 'Error',
        description: 'Failed to save student marks',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (mark: StudentMark) => {
    // Editing still uses single form mode for simplicity
    setEditingMark(mark);
    setBatchStudentId(mark.student_id);
    setBatchTermId(mark.term_id);
    setSubjectForms([{
      id: crypto.randomUUID(),
      subject_id: mark.subject_id,
      subject_code: mark.subject_code || '',
      a1_score: mark.a1_score?.toString() || '',
      a2_score: mark.a2_score?.toString() || '',
      a3_score: mark.a3_score?.toString() || '',
      average_score: mark.average_score?.toString() || '',
      twenty_percent: mark.twenty_percent?.toString() || '',
      eighty_percent: mark.eighty_percent?.toString() || '',
      hundred_percent: mark.hundred_percent?.toString() || '',
      identifier: mark.identifier?.toString() || '',
      final_grade: mark.final_grade || '',
      achievement_level: mark.achievement_level || '',
      teacher_initials: mark.teacher_initials || ''
    }]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('student_marks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Student mark deleted successfully',
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting mark:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete student mark',
        variant: 'destructive',
      });
    }
  };

  const resetBatchForm = () => {
    setBatchStudentId('');
    setBatchTermId('');
    setStudentSearch('');
    setSubjectForms([{
      id: crypto.randomUUID(),
      subject_id: '',
      subject_code: '',
      a1_score: '',
      a2_score: '',
      a3_score: '',
      average_score: '',
      twenty_percent: '',
      eighty_percent: '',
      hundred_percent: '',
      identifier: '',
      final_grade: '',
      achievement_level: '',
      teacher_initials: ''
    }]);
    setEditingMark(null);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Student Marks Management</h2>
          <p className="text-muted-foreground">Record and manage O-level student assessment marks</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetBatchForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Student Mark
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col overflow-y-auto themed-scrollbar">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-2xl font-bold tracking-wide">Add Student Marks</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleBatchSubmit} className="flex flex-col gap-6 flex-1 min-h-0 touch-pan-y touch-pan-x">
              {/* Class and Term Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.class_name} {classItem.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Term</Label>
                  <Select value={batchTermId} onValueChange={setBatchTermId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {terms.map((term) => (
                        <SelectItem key={term.id} value={term.id}>
                          {term.term_name} {term.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Student Selection */}
              <div className="space-y-2 flex-shrink-0">
                <div className="flex justify-between items-center gap-2">
                  <Label className="text-sm font-medium">Student</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const sortOrder: Array<'a-z' | 'z-a' | 'new-old' | 'old-new'> = ['a-z', 'z-a', 'new-old', 'old-new'];
                        const currentIndex = sortOrder.indexOf(studentSort);
                        const nextIndex = (currentIndex + 1) % sortOrder.length;
                        setStudentSort(sortOrder[nextIndex]);
                      }}
                      className="h-8 px-3"
                    >
                      {studentSort === 'a-z' && '↑ → Z'}
                      {studentSort === 'z-a' && '↓ → A'}
                      {studentSort === 'new-old' && 'New → Old'}
                      {studentSort === 'old-new' && 'Old → New'}
                    </Button>
                    <Button 
                      type="button" 
                      onClick={addSubjectForm} 
                      size="sm"
                      className="h-8"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      New Subject
                    </Button>
                  </div>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={batchStudentId} onValueChange={setBatchStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredAndSortedStudents().map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} - {student.classes?.class_name} {student.classes?.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject Forms Container */}
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                <h3 className="text-base font-semibold flex-shrink-0">Subject Marks</h3>
                
                <div className="flex-1 pr-2">
                  <div className="space-y-4 pb-4 pr-2">
                    {subjectForms.map((form, index) => (
                      <Card key={form.id} className="animate-in fade-in slide-in-from-top-2 duration-200">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="text-sm font-medium">Subject {index + 1}</h4>
                            {subjectForms.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSubjectForm(form.id)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="min-w-0">
                                <Label className="text-xs">Subject</Label>
                                <Select 
                                  value={form.subject_id} 
                                  onValueChange={(value) => updateSubjectForm(form.id, 'subject_id', value)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select subject" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {subjects.map((subject) => (
                                      <SelectItem key={subject.id} value={subject.id}>
                                        {subject.subject_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="min-w-0">
                                <Label className="text-xs">Subject Code</Label>
                                <Input
                                  value={form.subject_code}
                                  onChange={(e) => updateSubjectForm(form.id, 'subject_code', e.target.value)}
                                  placeholder="e.g. 535"
                                  className="h-9"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="min-w-0">
                                <Label className="text-xs">A1 Score</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={form.a1_score}
                                  onChange={(e) => updateSubjectForm(form.id, 'a1_score', e.target.value)}
                                  onBlur={() => calculateAverageForForm(form.id, form.a1_score, form.a2_score, form.a3_score)}
                                  placeholder="0.0"
                                  className="h-9"
                                />
                              </div>
                              <div className="min-w-0">
                                <Label className="text-xs">A2 Score</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={form.a2_score}
                                  onChange={(e) => updateSubjectForm(form.id, 'a2_score', e.target.value)}
                                  onBlur={() => calculateAverageForForm(form.id, form.a1_score, form.a2_score, form.a3_score)}
                                  placeholder="0.0"
                                  className="h-9"
                                />
                              </div>
                              <div className="min-w-0">
                                <Label className="text-xs">A3 Score</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={form.a3_score}
                                  onChange={(e) => updateSubjectForm(form.id, 'a3_score', e.target.value)}
                                  onBlur={() => calculateAverageForForm(form.id, form.a1_score, form.a2_score, form.a3_score)}
                                  placeholder="0.0"
                                  className="h-9"
                                />
                              </div>
                              <div className="min-w-0">
                                <Label className="text-xs">AVG</Label>
                                <Input
                                  value={form.average_score}
                                  placeholder="0.0"
                                  readOnly
                                  className="h-9 bg-muted"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="min-w-0">
                                <Label className="text-xs">20% Score</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={form.twenty_percent}
                                  onChange={(e) => updateSubjectForm(form.id, 'twenty_percent', e.target.value)}
                                  placeholder="0.0"
                                  className="h-9"
                                />
                              </div>
                              <div className="min-w-0">
                                <Label className="text-xs">80% Score</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={form.eighty_percent}
                                  onChange={(e) => updateSubjectForm(form.id, 'eighty_percent', e.target.value)}
                                  placeholder="0.0"
                                  className="h-9"
                                />
                              </div>
                              <div className="min-w-0">
                                <Label className="text-xs">100% Score</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={form.hundred_percent}
                                  onChange={(e) => updateSubjectForm(form.id, 'hundred_percent', e.target.value)}
                                  onBlur={() => calculateGradeAndLevelForForm(form.id, form.hundred_percent, form.identifier)}
                                  placeholder="0.0"
                                  className="h-9"
                                />
                              </div>
                              <div className="min-w-0">
                                <Label className="text-xs">Teacher Initials</Label>
                                <Input
                                  value={form.teacher_initials}
                                  onChange={(e) => updateSubjectForm(form.id, 'teacher_initials', e.target.value)}
                                  placeholder="e.g. B.S."
                                  maxLength={5}
                                  className="h-9"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="min-w-0">
                                <Label className="text-xs">Identifier</Label>
                                <Select 
                                  value={form.identifier} 
                                  onValueChange={(value) => {
                                    updateSubjectForm(form.id, 'identifier', value);
                                    setTimeout(() => calculateGradeAndLevelForForm(form.id, form.hundred_percent, value), 0);
                                  }}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1</SelectItem>
                                    <SelectItem value="2">2</SelectItem>
                                    <SelectItem value="3">3</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="min-w-0">
                                <Label className="text-xs">Grade (Auto-calculated)</Label>
                                <Input
                                  value={form.final_grade}
                                  placeholder="Auto"
                                  readOnly
                                  className="h-9 bg-muted"
                                />
                              </div>
                              <div className="min-w-0">
                                <Label className="text-xs">Achievement Level (Auto-calculated)</Label>
                                <Input
                                  value={form.achievement_level}
                                  placeholder="Auto"
                                  readOnly
                                  className="h-9 bg-muted"
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-start gap-3 pt-6 border-t flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <Button 
                  type="submit"
                  size="lg"
                  className="min-w-[200px]"
                >
                  Submit All Marks
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-classes">All classes</SelectItem>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.class_name} {classItem.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="All terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-terms">All terms</SelectItem>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.term_name} {term.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-subjects">All subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.subject_code} {subject.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Marks ({filteredMarks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>A1</TableHead>
                  <TableHead>A2</TableHead>
                  <TableHead>A3</TableHead>
                  <TableHead>AVG</TableHead>
                  <TableHead>20%</TableHead>
                  <TableHead>80%</TableHead>
                  <TableHead>100%</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Achievement</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMarks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground">
                      No marks found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMarks.map((mark) => (
                    <TableRow key={mark.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{mark.students?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {mark.students?.classes?.class_name} {mark.students?.classes?.section}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{mark.subject_code} {mark.subjects?.subject_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{mark.a1_score?.toFixed(1) || '-'}</TableCell>
                      <TableCell>{mark.a2_score?.toFixed(1) || '-'}</TableCell>
                      <TableCell>{mark.a3_score?.toFixed(1) || '-'}</TableCell>
                      <TableCell>{mark.average_score?.toFixed(1) || '-'}</TableCell>
                      <TableCell>{mark.twenty_percent?.toFixed(1) || '-'}</TableCell>
                      <TableCell>{mark.eighty_percent?.toFixed(1) || '-'}</TableCell>
                      <TableCell>{mark.hundred_percent?.toFixed(1) || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={mark.final_grade === 'A' ? 'default' : mark.final_grade === 'B' ? 'secondary' : 'outline'}>
                          {mark.final_grade || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={mark.achievement_level === 'Outstanding' ? 'default' : mark.achievement_level === 'Exceptional' ? 'secondary' : 'outline'}>
                          {mark.achievement_level || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(mark)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(mark.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentMarksManager;