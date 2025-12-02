import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ReportCard, Student, Term, SchoolInfo, StudentMark, Subject } from '@/types/database';
import { Eye, Pencil, Printer, Download, Share2, Trash2, ArrowLeft, FileText, Loader2 } from 'lucide-react';
import ReportCardPreview from '@/components/ReportCardPreview';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { generateReportCardPDF } from '@/utils/pdfGenerator';

interface ReportCardWithDetails {
  id: string;
  student_id: string;
  term_id: string;
  overall_average?: number;
  overall_grade?: string;
  overall_identifier?: number;
  achievement_level?: string;
  class_teacher_comment?: string;
  headteacher_comment?: string;
  fees_balance?: number;
  generated_at?: string;
  printed_date?: string;
  created_at: string;
  template?: string;
  pdf_url?: string;
  status?: string;
  students?: {
    name: string;
    student_id?: string;
    classes?: {
      class_name: string;
      section?: string;
    };
  };
  terms?: {
    term_name: string;
    year: number;
    end_date?: string;
    start_date?: string;
  };
}

const ReportCardManagement = () => {
  const [reportCards, setReportCards] = useState<ReportCardWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportCardWithDetails | null>(null);
  const [editedData, setEditedData] = useState({
    status: '',
    term_ended_on: undefined as Date | undefined,
    next_term_begins: undefined as Date | undefined,
    fees_balance: 0,
    fees_next_term: 0,
    class_teacher_comment: '',
    headteacher_comment: '',
    achievement_level: '',
    other_requirements: ''
  });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    student: Student;
    term: Term;
    schoolInfo: SchoolInfo;
    marks: StudentMark[];
    subjects: Subject[];
    reportData: {
      overall_average: number;
      overall_grade: string;
      overall_identifier: number;
      achievement_level: string;
      class_teacher_comment: string;
      headteacher_comment: string;
    };
  } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchReportCards();
  }, []);

  const fetchReportCards = async () => {
    try {
      const { data, error } = await supabase
        .from('report_cards')
        .select(`
          *,
          students!report_cards_student_id_fkey (
            name,
            student_id,
            classes!students_class_id_fkey (
              class_name,
              section
            )
          ),
          terms!report_cards_term_id_fkey (
            term_name,
            year,
            start_date,
            end_date
          )
        `)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setReportCards(data as any || []);
    } catch (error) {
      console.error('Error fetching report cards:', error);
      toast({
        title: "Error",
        description: "Failed to load report cards",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (reportId: string) => {
    const report = reportCards.find(r => r.id === reportId);
    if (report) {
      setSelectedReport(report);
      setViewDialogOpen(true);
      setPreviewLoading(true);
      setPreviewData(null);
      
      try {
        const data = await fetchFullReportData(reportId);
        if (data) {
          setPreviewData(data);
        }
      } catch (error) {
        console.error('Error loading preview data:', error);
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const handleEdit = (reportId: string) => {
    const report = reportCards.find(r => r.id === reportId);
    if (report) {
      setSelectedReport(report);
      setEditedData({
        status: report.status || 'draft',
        term_ended_on: report.terms?.end_date ? new Date(report.terms.end_date) : undefined,
        next_term_begins: undefined, // Will be added to DB
        fees_balance: report.fees_balance || 0,
        fees_next_term: 0, // Will be added to DB
        class_teacher_comment: report.class_teacher_comment || '',
        headteacher_comment: report.headteacher_comment || '',
        achievement_level: report.achievement_level || '',
        other_requirements: '' // Will be added to DB
      });
      setEditDialogOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedReport) return;

    try {
      const { error } = await supabase
        .from('report_cards')
        .update({
          status: editedData.status,
          fees_balance: editedData.fees_balance,
          class_teacher_comment: editedData.class_teacher_comment,
          headteacher_comment: editedData.headteacher_comment,
          achievement_level: editedData.achievement_level
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report card updated successfully"
      });

      setEditDialogOpen(false);
      fetchReportCards();
    } catch (error) {
      console.error('Error updating report card:', error);
      toast({
        title: "Error",
        description: "Failed to update report card",
        variant: "destructive"
      });
    }
  };

  const handlePrint = async (reportId: string) => {
    try {
      const reportData = await fetchFullReportData(reportId);
      if (!reportData) return;

      // Generate PDF and open in new window for printing
      const { generateClassicTemplate } = await import('@/utils/pdfTemplates');
      const pdf = generateClassicTemplate(reportData);
      window.open(pdf.output('bloburl'), '_blank');

      toast({
        title: "Success",
        description: "Opening print preview..."
      });
    } catch (error) {
      console.error('Error printing report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report for printing",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (reportId: string) => {
    try {
      const reportData = await fetchFullReportData(reportId);
      if (!reportData) return;

      await generateReportCardPDF(reportData);

      toast({
        title: "Success",
        description: "Report card downloaded successfully"
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Error",
        description: "Failed to download report card",
        variant: "destructive"
      });
    }
  };

  const handleShare = async (reportId: string) => {
    const report = reportCards.find(r => r.id === reportId);
    if (!report) return;

    const shareText = `Report Card - ${report.students?.name}\nTerm: ${report.terms?.term_name} ${report.terms?.year}\nAverage: ${report.overall_average?.toFixed(1)}%\nGrade: ${report.overall_grade}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Report Card',
          text: shareText
        });
        toast({
          title: "Success",
          description: "Report card shared successfully"
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to Clipboard",
          description: "Report card details copied successfully"
        });
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        toast({
          title: "Error",
          description: "Failed to share report card",
          variant: "destructive"
        });
      }
    }
  };

  const fetchFullReportData = async (reportId: string) => {
    try {
      const report = reportCards.find(r => r.id === reportId);
      if (!report) {
        toast({
          title: "Error",
          description: "Report card not found",
          variant: "destructive"
        });
        return null;
      }

      // Fetch student with class info
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*, classes!students_class_id_fkey(*)')
        .eq('id', report.student_id)
        .single();

      if (studentError) throw studentError;

      // Fetch term
      const { data: termData, error: termError } = await supabase
        .from('terms')
        .select('*')
        .eq('id', report.term_id)
        .single();

      if (termError) throw termError;

      // Fetch school info
      const { data: schoolData, error: schoolError } = await supabase
        .from('school_info')
        .select('*')
        .limit(1)
        .single();

      if (schoolError) throw schoolError;

      // Fetch marks with subjects
      const { data: marksData, error: marksError } = await supabase
        .from('student_marks')
        .select('*, subjects!student_marks_subject_id_fkey(*)')
        .eq('student_id', report.student_id)
        .eq('term_id', report.term_id);

      if (marksError) throw marksError;

      // Fetch all subjects for the class
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('class_id', studentData.class_id);

      if (subjectsError) throw subjectsError;

      return {
        student: studentData,
        term: termData,
        schoolInfo: schoolData,
        marks: marksData,
        subjects: subjectsData,
        reportData: {
          overall_average: report.overall_average || 0,
          overall_grade: report.overall_grade || '',
          overall_identifier: report.overall_identifier || 0,
          achievement_level: report.achievement_level || '',
          class_teacher_comment: report.class_teacher_comment || '',
          headteacher_comment: report.headteacher_comment || ''
        },
        template: report.template as 'classic' | 'modern' | 'professional' | 'minimal'
      };
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch report data",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleDeleteClick = (reportId: string) => {
    setSelectedReportId(reportId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedReportId) return;

    try {
      const { error } = await supabase
        .from('report_cards')
        .delete()
        .eq('id', selectedReportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report card deleted successfully"
      });

      fetchReportCards();
    } catch (error) {
      console.error('Error deleting report card:', error);
      toast({
        title: "Error",
        description: "Failed to delete report card",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedReportId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading report cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-semibold">Report Card Management</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-slate-900 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Generated Report Cards</h2>
            <div className="flex items-center gap-2 text-slate-300">
              <FileText className="w-4 h-4" />
              <span className="text-sm">{reportCards.length} total</span>
            </div>
          </div>

          {reportCards.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 mb-2">No report cards generated yet</p>
              <p className="text-slate-500 text-sm">Generate your first report card from the Reports section</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Student</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Student Number</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Class</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Term</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Average</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Grade</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Generated</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCards.map((report) => (
                    <tr key={report.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4">
                        <span className="text-white font-medium">{report.students?.name || 'N/A'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-slate-300">{report.students?.student_id || 'N/A'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-slate-300">
                          {report.students?.classes?.class_name}
                          {report.students?.classes?.section && ` ${report.students.classes.section}`}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-slate-300">
                          {report.terms?.term_name} {report.terms?.year}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-slate-300">
                          {report.overall_average ? `${report.overall_average.toFixed(1)}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white font-semibold">{report.overall_grade || 'N/A'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="secondary" className="bg-slate-700 text-slate-200 hover:bg-slate-600">
                          {report.status || 'generated'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-slate-300 text-sm">{formatDate(report.generated_at)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(report.id)}
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(report.id)}
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrint(report.id)}
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(report.id)}
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleShare(report.id)}
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(report.id)}
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report card? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Card Preview</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading report card...</span>
            </div>
          ) : previewData ? (
            <div className="border rounded-lg overflow-hidden">
              <ReportCardPreview
                student={previewData.student}
                term={previewData.term}
                schoolInfo={previewData.schoolInfo}
                marks={previewData.marks}
                subjects={previewData.subjects}
                reportData={previewData.reportData}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Failed to load report card data
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {selectedReport && (
              <>
                <Button variant="outline" onClick={() => handlePrint(selectedReport.id)}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button onClick={() => handleDownload(selectedReport.id)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Report Card</DialogTitle>
            <p className="text-sm text-muted-foreground">Update report card details, comments, and status</p>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              {/* Student Info - Read Only */}
              <div>
                <Label className="text-sm text-muted-foreground">Student</Label>
                <Input 
                  value={`${selectedReport.students?.name} (${selectedReport.students?.student_id || 'N/A'})`}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Class - Read Only */}
              <div>
                <Label className="text-sm text-muted-foreground">Class</Label>
                <Input 
                  value={`${selectedReport.students?.classes?.class_name}${selectedReport.students?.classes?.section ? ' ' + selectedReport.students.classes.section : ''}`}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editedData.status}
                  onValueChange={(value) => setEditedData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="printed">Printed</SelectItem>
                    <SelectItem value="distributed">Distributed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Term Ended On</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editedData.term_ended_on && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedData.term_ended_on ? format(editedData.term_ended_on, "PPP") : <span>mm/dd/yyyy</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editedData.term_ended_on}
                        onSelect={(date) => setEditedData(prev => ({ ...prev, term_ended_on: date }))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Next Term Begins</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editedData.next_term_begins && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedData.next_term_begins ? format(editedData.next_term_begins, "PPP") : <span>mm/dd/yyyy</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editedData.next_term_begins}
                        onSelect={(date) => setEditedData(prev => ({ ...prev, next_term_begins: date }))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Fees Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fees_balance">Fees Balance</Label>
                  <Input
                    id="fees_balance"
                    type="number"
                    step="0.01"
                    value={editedData.fees_balance}
                    onChange={(e) => setEditedData(prev => ({ ...prev, fees_balance: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="fees_next_term">Fees Next Term</Label>
                  <Input
                    id="fees_next_term"
                    type="number"
                    step="0.01"
                    value={editedData.fees_next_term}
                    onChange={(e) => setEditedData(prev => ({ ...prev, fees_next_term: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Class Teacher's Comment */}
              <div>
                <Label htmlFor="class_teacher_comment">Class Teacher's Comment</Label>
                <Textarea
                  id="class_teacher_comment"
                  value={editedData.class_teacher_comment}
                  onChange={(e) => setEditedData(prev => ({ ...prev, class_teacher_comment: e.target.value }))}
                  rows={3}
                  placeholder="Enter class teacher comment..."
                />
              </div>

              {/* Head Teacher's Comment */}
              <div>
                <Label htmlFor="headteacher_comment">Head Teacher's Comment</Label>
                <Textarea
                  id="headteacher_comment"
                  value={editedData.headteacher_comment}
                  onChange={(e) => setEditedData(prev => ({ ...prev, headteacher_comment: e.target.value }))}
                  rows={3}
                  placeholder="Enter head teacher comment..."
                />
              </div>

              {/* Overall Achievement */}
              <div>
                <Label htmlFor="achievement_level">Overall Achievement</Label>
                <Textarea
                  id="achievement_level"
                  value={editedData.achievement_level}
                  onChange={(e) => setEditedData(prev => ({ ...prev, achievement_level: e.target.value }))}
                  rows={3}
                  placeholder="Enter overall achievement..."
                />
              </div>

              {/* Other Requirements */}
              <div>
                <Label htmlFor="other_requirements">Other Requirements</Label>
                <Textarea
                  id="other_requirements"
                  value={editedData.other_requirements}
                  onChange={(e) => setEditedData(prev => ({ ...prev, other_requirements: e.target.value }))}
                  rows={3}
                  placeholder="Enter other requirements..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportCardManagement;
