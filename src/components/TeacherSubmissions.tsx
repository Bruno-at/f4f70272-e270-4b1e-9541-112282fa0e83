import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Student, Term, Subject } from '@/types/database';
import { Send, Clock, CheckCircle, XCircle } from 'lucide-react';

interface TeacherSubject {
  id: string;
  subject_id: string;
  subjects: Subject;
}

interface PendingSubmission {
  id: string;
  student_id: string;
  subject_id: string;
  term_id: string;
  marks_obtained: number;
  grade: string;
  remarks: string;
  status: string;
  submitted_at: string;
  review_comments?: string;
  students: Student;
  subjects: Subject;
  terms: Term;
}

const TeacherSubmissions = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    student_id: '',
    subject_id: '',
    term_id: '',
    marks_obtained: '',
    remarks: ''
  });

  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && profile?.role === 'teacher') {
      fetchData();
    }
  }, [user, profile]);

  const fetchData = async () => {
    try {
      const [studentsResult, termsResult, teacherSubjectsResult, submissionsResult] = await Promise.all([
        supabase.from('students').select('*, classes!students_class_id_fkey(*)').order('name'),
        supabase.from('terms').select('*').order('year', { ascending: false }),
        supabase.from('teacher_subjects').select('*, subjects!teacher_subjects_subject_id_fkey(*)').eq('teacher_id', user!.id),
        supabase.from('pending_submissions').select(`
          *,
          students!pending_submissions_student_id_fkey(*),
          subjects!pending_submissions_subject_id_fkey(*),
          terms!pending_submissions_term_id_fkey(*)
        `).eq('teacher_id', user!.id).order('submitted_at', { ascending: false })
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (termsResult.error) throw termsResult.error;
      if (teacherSubjectsResult.error) throw teacherSubjectsResult.error;
      if (submissionsResult.error) throw submissionsResult.error;

      setStudents(studentsResult.data || []);
      setTerms(termsResult.data || []);
      setTeacherSubjects(teacherSubjectsResult.data || []);
      setSubmissions(submissionsResult.data || []);

      // Set active term as default
      const activeTerm = termsResult.data?.find(term => term.is_active);
      if (activeTerm) {
        setFormData(prev => ({ ...prev, term_id: activeTerm.id }));
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

  const calculateGrade = (marks: number, maxMarks: number = 100): string => {
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    return 'F';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const marks = parseInt(formData.marks_obtained);
      const selectedSubject = teacherSubjects.find(ts => ts.subject_id === formData.subject_id);
      const maxMarks = selectedSubject?.subjects.max_marks || 100;
      const grade = calculateGrade(marks, maxMarks);

      const { error } = await supabase
        .from('pending_submissions')
        .insert([{
          teacher_id: user.id,
          student_id: formData.student_id,
          subject_id: formData.subject_id,
          term_id: formData.term_id,
          marks_obtained: marks,
          grade,
          remarks: formData.remarks
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Marks submitted for admin review"
      });

      // Reset form
      setFormData({
        student_id: '',
        subject_id: '',
        term_id: formData.term_id, // Keep the same term
        marks_obtained: '',
        remarks: ''
      });

      // Refresh submissions
      fetchData();
    } catch (error: any) {
      console.error('Error submitting marks:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit marks",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (profile?.role !== 'teacher') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            Access denied. This section is for teachers only.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Submit Student Marks
          </CardTitle>
          <CardDescription>
            Submit marks for your assigned subjects. All submissions require admin approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="term">Term *</Label>
                <Select value={formData.term_id} onValueChange={(value) => setFormData({...formData, term_id: value})}>
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
                <Label htmlFor="subject">Subject *</Label>
                <Select value={formData.subject_id} onValueChange={(value) => setFormData({...formData, subject_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherSubjects.map((ts) => (
                      <SelectItem key={ts.id} value={ts.subject_id}>
                        {ts.subjects.subject_name} (Max: {ts.subjects.max_marks})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="student">Student *</Label>
                <Select value={formData.student_id} onValueChange={(value) => setFormData({...formData, student_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} - {student.classes?.class_name}
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
                  min="0"
                  value={formData.marks_obtained}
                  onChange={(e) => setFormData({...formData, marks_obtained: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                placeholder="Enter any remarks or comments..."
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              disabled={!formData.student_id || !formData.subject_id || !formData.term_id || !formData.marks_obtained || submitting}
              className="w-full"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Submissions</CardTitle>
          <CardDescription>
            Track the status of your submitted marks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No submissions yet. Submit your first marks above.
            </p>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{submission.students.name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{submission.subjects.subject_name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{submission.terms.term_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>Marks: <strong>{submission.marks_obtained}</strong></span>
                      <span>Grade: <strong>{submission.grade}</strong></span>
                      {submission.remarks && (
                        <span className="text-muted-foreground">"{submission.remarks}"</span>
                      )}
                    </div>
                    {submission.review_comments && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Review:</strong> {submission.review_comments}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(submission.status)}
                    <Badge className={getStatusColor(submission.status)}>
                      {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherSubmissions;