import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Student, Term, Subject } from '@/types/database';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

interface PendingSubmission {
  id: string;
  teacher_id: string;
  student_id: string;
  subject_id: string;
  term_id: string;
  marks_obtained: number;
  grade: string;
  remarks: string;
  status: string;
  submitted_at: string;
  students: Student;
  subjects: Subject;
  terms: Term;
  profiles: Profile;
}

const AdminApproval = () => {
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<PendingSubmission | null>(null);

  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchSubmissions();
    }
  }, [user, profile]);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_submissions')
        .select(`
          *,
          students!pending_submissions_student_id_fkey(*),
          subjects!pending_submissions_subject_id_fkey(*),
          terms!pending_submissions_term_id_fkey(*),
          profiles!pending_submissions_teacher_id_fkey(*)
        `)
        .order('submitted_at', { ascending: true });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processSubmission = async (submissionId: string, action: 'approve' | 'reject', comments: string = '') => {
    if (!user) return;

    setProcessingId(submissionId);
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) throw new Error('Submission not found');

      // Update submission status
      const { error: updateError } = await supabase
        .from('pending_submissions')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          review_comments: comments
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      // If approved, create or update student_marks record
      if (action === 'approve') {
        // Check if marks already exist for this student/subject/term
        const { data: existingMark } = await supabase
          .from('student_marks')
          .select('id')
          .eq('student_id', submission.student_id)
          .eq('subject_id', submission.subject_id)
          .eq('term_id', submission.term_id)
          .maybeSingle();

        if (existingMark) {
          // Update existing mark
          const { error: updateMarkError } = await supabase
            .from('student_marks')
            .update({
              marks_obtained: submission.marks_obtained,
              grade: submission.grade,
              remarks: submission.remarks
            })
            .eq('id', existingMark.id);

          if (updateMarkError) throw updateMarkError;
        } else {
          // Create new mark
          const { error: insertMarkError } = await supabase
            .from('student_marks')
            .insert([{
              student_id: submission.student_id,
              subject_id: submission.subject_id,
              term_id: submission.term_id,
              marks_obtained: submission.marks_obtained,
              grade: submission.grade,
              remarks: submission.remarks
            }]);

          if (insertMarkError) throw insertMarkError;
        }

        // Generate report card in background
        generateReportCard(submission.student_id, submission.term_id);
      }

      toast({
        title: "Success",
        description: `Submission ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });

      // Refresh submissions
      fetchSubmissions();
      setSelectedSubmission(null);
      setReviewComments('');
    } catch (error: any) {
      console.error('Error processing submission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process submission",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const generateReportCard = async (studentId: string, termId: string) => {
    try {
      // Check if report card already exists
      const { data: existingReport } = await supabase
        .from('report_cards')
        .select('id')
        .eq('student_id', studentId)
        .eq('term_id', termId)
        .maybeSingle();

      // Get all marks for this student and term
      const { data: marks } = await supabase
        .from('student_marks')
        .select('marks_obtained')
        .eq('student_id', studentId)
        .eq('term_id', termId);

      const overall_average = marks && marks.length > 0 
        ? marks.reduce((sum, mark) => sum + mark.marks_obtained, 0) / marks.length 
        : 0;

      const overall_grade = calculateGrade(overall_average);

      const reportData = {
        student_id: studentId,
        term_id: termId,
        overall_average,
        overall_grade,
        class_teacher_comment: 'Good work, keep it up!',
        headteacher_comment: 'Excellent progress this term.',
        generated_at: new Date().toISOString(),
        status: 'draft'
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
    } catch (error) {
      console.error('Error generating report card:', error);
    }
  };

  const calculateGrade = (average: number): string => {
    if (average >= 90) return 'A+';
    if (average >= 80) return 'A';
    if (average >= 70) return 'B+';
    if (average >= 60) return 'B';
    if (average >= 50) return 'C+';
    if (average >= 40) return 'C';
    return 'F';
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

  if (profile?.role !== 'admin') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            Access denied. This section is for administrators only.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const processedSubmissions = submissions.filter(s => s.status !== 'pending');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Pending Submissions ({pendingSubmissions.length})
          </CardTitle>
          <CardDescription>
            Review and approve teacher submissions for student marks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingSubmissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No pending submissions to review.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
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
                      <span>Teacher: <strong>{submission.profiles.full_name}</strong></span>
                    </div>
                    {submission.remarks && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Remarks:</strong> {submission.remarks}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Submitted: {new Date(submission.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSubmission(submission)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Review Submission</DialogTitle>
                          <DialogDescription>
                            Review and approve or reject this marks submission
                          </DialogDescription>
                        </DialogHeader>
                        {selectedSubmission && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <strong>Student:</strong> {selectedSubmission.students.name}
                              </div>
                              <div>
                                <strong>Subject:</strong> {selectedSubmission.subjects.subject_name}
                              </div>
                              <div>
                                <strong>Term:</strong> {selectedSubmission.terms.term_name}
                              </div>
                              <div>
                                <strong>Teacher:</strong> {selectedSubmission.profiles.full_name}
                              </div>
                              <div>
                                <strong>Marks:</strong> {selectedSubmission.marks_obtained}
                              </div>
                              <div>
                                <strong>Grade:</strong> {selectedSubmission.grade}
                              </div>
                            </div>
                            {selectedSubmission.remarks && (
                              <div>
                                <strong>Teacher Remarks:</strong>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {selectedSubmission.remarks}
                                </p>
                              </div>
                            )}
                            <div>
                              <label className="text-sm font-medium">Review Comments (Optional)</label>
                              <Textarea
                                value={reviewComments}
                                onChange={(e) => setReviewComments(e.target.value)}
                                placeholder="Add your review comments..."
                                className="mt-1"
                              />
                            </div>
                          </div>
                        )}
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => selectedSubmission && processSubmission(selectedSubmission.id, 'reject', reviewComments)}
                            disabled={processingId === selectedSubmission?.id}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            onClick={() => selectedSubmission && processSubmission(selectedSubmission.id, 'approve', reviewComments)}
                            disabled={processingId === selectedSubmission?.id}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {processedSubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
            <CardDescription>
              Previously reviewed submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processedSubmissions.slice(0, 10).map((submission) => (
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
                      <span>Teacher: <strong>{submission.profiles.full_name}</strong></span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(submission.status)}>
                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminApproval;