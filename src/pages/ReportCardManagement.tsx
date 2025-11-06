import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ReportCard } from '@/types/database';
import { Eye, Pencil, Printer, Download, Share2, Trash2, ArrowLeft, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
  };
}

const ReportCardManagement = () => {
  const [reportCards, setReportCards] = useState<ReportCardWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
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
            year
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

  const handleView = (reportId: string) => {
    // Implement view functionality
    toast({
      title: "View Report",
      description: "View functionality coming soon"
    });
  };

  const handleEdit = (reportId: string) => {
    // Implement edit functionality
    toast({
      title: "Edit Report",
      description: "Edit functionality coming soon"
    });
  };

  const handlePrint = async (reportId: string) => {
    // Implement print functionality
    toast({
      title: "Print Report",
      description: "Print functionality coming soon"
    });
  };

  const handleDownload = async (reportId: string) => {
    // Implement download functionality
    toast({
      title: "Download Report",
      description: "Download functionality coming soon"
    });
  };

  const handleShare = (reportId: string) => {
    // Implement share functionality
    toast({
      title: "Share Report",
      description: "Share functionality coming soon"
    });
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
    </div>
  );
};

export default ReportCardManagement;
