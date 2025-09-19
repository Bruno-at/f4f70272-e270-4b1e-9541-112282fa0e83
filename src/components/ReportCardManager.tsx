import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Student, Term, Class, ReportCard } from '@/types/database';
import { FileText, Eye, Edit, Trash2, Printer, Download, Archive } from 'lucide-react';

interface ReportCardWithRelations extends ReportCard {
  students: Student & { classes: Class };
  terms: Term;
}

const templates = [
  { value: 'classic', label: 'Classic Template' },
  { value: 'modern', label: 'Modern Template' },
  { value: 'elegant', label: 'Elegant Template' },
  { value: 'professional', label: 'Professional Template' }
];

const ReportCardManager = () => {
  const [reportCards, setReportCards] = useState<ReportCardWithRelations[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const [reportCardsResult, termsResult, classesResult] = await Promise.all([
        supabase
          .from('report_cards')
          .select(`
            *,
            students!report_cards_student_id_fkey(*, classes!students_class_id_fkey(*)),
            terms!report_cards_term_id_fkey(*)
          `)
          .order('generated_at', { ascending: false }),
        supabase.from('terms').select('*').order('year', { ascending: false }),
        supabase.from('classes').select('*').order('class_name')
      ]);

      if (reportCardsResult.error) throw reportCardsResult.error;
      if (termsResult.error) throw termsResult.error;
      if (classesResult.error) throw classesResult.error;

      setReportCards((reportCardsResult.data || []) as ReportCardWithRelations[]);
      setTerms(termsResult.data || []);
      setClasses(classesResult.data || []);
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

  const handleDelete = async (reportCardId: string) => {
    try {
      const { error } = await supabase
        .from('report_cards')
        .delete()
        .eq('id', reportCardId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report card deleted successfully"
      });

      fetchData();
    } catch (error: any) {
      console.error('Error deleting report card:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete report card",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (reportCardId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('report_cards')
        .update({ status: newStatus })
        .eq('id', reportCardId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Report card status updated to ${newStatus}`
      });

      fetchData();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const handleTemplateChange = async (reportCardId: string, newTemplate: 'classic' | 'modern' | 'elegant' | 'professional') => {
    try {
      const { error } = await supabase
        .from('report_cards')
        .update({ template: newTemplate })
        .eq('id', reportCardId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Template updated to ${newTemplate}`
      });

      fetchData();
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive"
      });
    }
  };

  const filteredReportCards = reportCards.filter(card => {
    const termMatch = selectedTerm === 'all' || card.term_id === selectedTerm;
    const classMatch = selectedClass === 'all' || card.students.class_id === selectedClass;
    const statusMatch = selectedStatus === 'all' || (card.status || 'draft') === selectedStatus;
    return termMatch && classMatch && statusMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'final':
        return 'bg-blue-100 text-blue-800';
      case 'locked':
        return 'bg-green-100 text-green-800';
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Report Card Management
          </CardTitle>
          <CardDescription>
            Manage generated report cards with preview, edit, and template options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.term_name} {term.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue />
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
              <label className="text-sm font-medium mb-2 block">Filter by Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredReportCards.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No report cards found with the current filters.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredReportCards.map((card) => (
                <div key={card.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{card.students.name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        {card.students.classes.class_name} {card.students.classes.section ? `- ${card.students.classes.section}` : ''}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{card.terms.term_name} {card.terms.year}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>Average: <strong>{card.overall_average?.toFixed(1) || 'N/A'}</strong></span>
                      <span>Grade: <strong>{card.overall_grade || 'N/A'}</strong></span>
                      <span>Template: <strong>{card.template}</strong></span>
                    </div>
                    {card.generated_at && (
                      <p className="text-xs text-muted-foreground">
                        Generated: {new Date(card.generated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(card.status || 'draft')}>
                      {(card.status || 'draft').charAt(0).toUpperCase() + (card.status || 'draft').slice(1)}
                    </Badge>
                    
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" title="Preview">
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" title="Edit">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Report Card</DialogTitle>
                            <DialogDescription>
                              Modify report card settings and template
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Status</label>
                              <Select 
                                value={card.status || 'draft'} 
                                onValueChange={(value) => handleStatusChange(card.id, value)}
                                disabled={card.status === 'locked'}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="final">Final</SelectItem>
                                  <SelectItem value="locked">Locked</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium mb-2 block">Template</label>
                              <Select 
                                value={card.template || 'classic'} 
                                onValueChange={(value) => handleTemplateChange(card.id, value as 'classic' | 'modern' | 'elegant' | 'professional')}
                                disabled={card.status === 'locked'}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {templates.map((template) => (
                                    <SelectItem key={template.value} value={template.value}>
                                      {template.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button variant="outline" size="sm" title="Print">
                        <Printer className="w-4 h-4" />
                      </Button>
                      
                      <Button variant="outline" size="sm" title="Download">
                        <Download className="w-4 h-4" />
                      </Button>
                      
                      {card.status !== 'locked' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Report Card</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete this report card? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline">Cancel</Button>
                              <Button 
                                variant="destructive" 
                                onClick={() => handleDelete(card.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
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

export default ReportCardManager;