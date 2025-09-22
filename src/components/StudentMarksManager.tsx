import { useState, useEffect } from 'react';
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
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  
  // Form fields for new O-level assessment structure
  const [formData, setFormData] = useState({
    student_id: '',
    subject_id: '',
    term_id: '',
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
  });

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

  const calculateAverage = () => {
    const a1 = parseFloat(formData.a1_score) || 0;
    const a2 = parseFloat(formData.a2_score) || 0;
    const a3 = parseFloat(formData.a3_score) || 0;
    const avg = (a1 + a2 + a3) / 3;
    setFormData(prev => ({ ...prev, average_score: avg.toFixed(1) }));
  };

  const calculateGradeAndLevel = () => {
    const hundredPercent = parseFloat(formData.hundred_percent) || 0;
    const grade = calculateGrade(hundredPercent);
    const identifier = parseInt(formData.identifier) || 1;
    const achievementLevel = calculateAchievementLevel(identifier);
    
    setFormData(prev => ({ 
      ...prev, 
      final_grade: grade,
      achievement_level: achievementLevel
    }));
  };

  const calculateGrade = (percentage: number): string => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const markData = {
        student_id: formData.student_id,
        subject_id: formData.subject_id,
        term_id: formData.term_id,
        subject_code: formData.subject_code || null,
        a1_score: parseFloat(formData.a1_score) || null,
        a2_score: parseFloat(formData.a2_score) || null,
        a3_score: parseFloat(formData.a3_score) || null,
        average_score: parseFloat(formData.average_score) || null,
        twenty_percent: parseFloat(formData.twenty_percent) || null,
        eighty_percent: parseFloat(formData.eighty_percent) || null,
        hundred_percent: parseFloat(formData.hundred_percent) || null,
        identifier: parseInt(formData.identifier) || null,
        final_grade: formData.final_grade || null,
        achievement_level: formData.achievement_level || null,
        teacher_initials: formData.teacher_initials || null
      };

      let result;
      if (editingMark) {
        result = await supabase
          .from('student_marks')
          .update(markData)
          .eq('id', editingMark.id);
      } else {
        result = await supabase
          .from('student_marks')
          .insert([markData]);
      }

      if (result.error) throw result.error;

      toast({
        title: 'Success',
        description: `Student mark ${editingMark ? 'updated' : 'added'} successfully`,
      });

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving mark:', error);
      toast({
        title: 'Error',
        description: 'Failed to save student mark',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (mark: StudentMark) => {
    setEditingMark(mark);
    setFormData({
      student_id: mark.student_id,
      subject_id: mark.subject_id,
      term_id: mark.term_id,
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
    });
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

  const resetForm = () => {
    setFormData({
      student_id: '',
      subject_id: '',
      term_id: '',
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
    });
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
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Student Mark
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMark ? 'Edit Student Mark' : 'Add New Student Mark'}</DialogTitle>
              <DialogDescription>
                Enter the O-level assessment scores for the student
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="student_id">Student</Label>
                  <Select value={formData.student_id} onValueChange={(value) => setFormData(prev => ({...prev, student_id: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} - {student.classes?.class_name} {student.classes?.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject_id">Subject</Label>
                  <Select value={formData.subject_id} onValueChange={(value) => setFormData(prev => ({...prev, subject_id: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.subject_code} {subject.subject_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="term_id">Term</Label>
                  <Select value={formData.term_id} onValueChange={(value) => setFormData(prev => ({...prev, term_id: value}))}>
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

                <div>
                  <Label htmlFor="subject_code">Subject Code</Label>
                  <Input
                    id="subject_code"
                    value={formData.subject_code}
                    onChange={(e) => setFormData(prev => ({...prev, subject_code: e.target.value}))}
                    placeholder="e.g., 535"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="a1_score">A1 Score</Label>
                  <Input
                    id="a1_score"
                    type="number"
                    step="0.1"
                    value={formData.a1_score}
                    onChange={(e) => setFormData(prev => ({...prev, a1_score: e.target.value}))}
                    onBlur={calculateAverage}
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <Label htmlFor="a2_score">A2 Score</Label>
                  <Input
                    id="a2_score"
                    type="number"
                    step="0.1"
                    value={formData.a2_score}
                    onChange={(e) => setFormData(prev => ({...prev, a2_score: e.target.value}))}
                    onBlur={calculateAverage}
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <Label htmlFor="a3_score">A3 Score</Label>
                  <Input
                    id="a3_score"
                    type="number"
                    step="0.1"
                    value={formData.a3_score}
                    onChange={(e) => setFormData(prev => ({...prev, a3_score: e.target.value}))}
                    onBlur={calculateAverage}
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <Label htmlFor="average_score">AVG</Label>
                  <Input
                    id="average_score"
                    type="number"
                    step="0.1"
                    value={formData.average_score}
                    onChange={(e) => setFormData(prev => ({...prev, average_score: e.target.value}))}
                    placeholder="0.0"
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="twenty_percent">20% Score</Label>
                  <Input
                    id="twenty_percent"
                    type="number"
                    step="0.1"
                    value={formData.twenty_percent}
                    onChange={(e) => setFormData(prev => ({...prev, twenty_percent: e.target.value}))}
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <Label htmlFor="eighty_percent">80% Score</Label>
                  <Input
                    id="eighty_percent"
                    type="number"
                    step="0.1"
                    value={formData.eighty_percent}
                    onChange={(e) => setFormData(prev => ({...prev, eighty_percent: e.target.value}))}
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <Label htmlFor="hundred_percent">100% Score</Label>
                  <Input
                    id="hundred_percent"
                    type="number"
                    step="0.1"
                    value={formData.hundred_percent}
                    onChange={(e) => setFormData(prev => ({...prev, hundred_percent: e.target.value}))}
                    onBlur={calculateGradeAndLevel}
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="identifier">Identifier</Label>
                  <Select value={formData.identifier} onValueChange={(value) => {
                    setFormData(prev => ({...prev, identifier: value}));
                    setTimeout(calculateGradeAndLevel, 0);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Basic</SelectItem>
                      <SelectItem value="2">2 - Moderate</SelectItem>
                      <SelectItem value="3">3 - Outstanding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="final_grade">Grade (Auto-calculated)</Label>
                  <Input
                    id="final_grade"
                    value={formData.final_grade}
                    placeholder="Auto-calculated"
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="achievement_level">Achievement Level (Auto-calculated)</Label>
                  <Input
                    id="achievement_level"
                    value={formData.achievement_level}
                    placeholder="Auto-calculated"
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="teacher_initials">Teacher Initials</Label>
                  <Input
                    id="teacher_initials"
                    value={formData.teacher_initials}
                    onChange={(e) => setFormData(prev => ({...prev, teacher_initials: e.target.value}))}
                    placeholder="e.g., B.S"
                    maxLength={5}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMark ? 'Update Mark' : 'Add Mark'}
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