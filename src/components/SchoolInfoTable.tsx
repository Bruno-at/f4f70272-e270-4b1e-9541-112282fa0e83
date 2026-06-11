import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { Edit, School } from 'lucide-react';
import SchoolInfoManager from './SchoolInfoManager';

const SchoolInfoTable = () => {
  const { school, schoolId } = useSchool();
  const [schoolData, setSchoolData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (schoolId) fetchSchoolInfo();
    else setLoading(false);
  }, [schoolId]);

  const fetchSchoolInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId!)
        .maybeSingle();
      if (error) throw error;
      setSchoolData(data);
    } catch (error) {
      console.error('Error fetching school info:', error);
      toast({ title: "Error", description: "Failed to load school information", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = () => {
    setDialogOpen(false);
    fetchSchoolInfo();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-8">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Loading school information...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <School className="w-5 h-5" />
            School Information
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit School Information</DialogTitle>
              </DialogHeader>
              <div className="mt-6">
                <SchoolInfoManager onSuccess={handleEditSuccess} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {schoolData ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Field</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell className="font-medium">School Name</TableCell><TableCell>{schoolData.school_name}</TableCell></TableRow>
              <TableRow><TableCell className="font-medium">School Code</TableCell><TableCell>{schoolData.slug}</TableCell></TableRow>
              {schoolData.motto && <TableRow><TableCell className="font-medium">Motto</TableCell><TableCell>{schoolData.motto}</TableCell></TableRow>}
              {schoolData.location && <TableRow><TableCell className="font-medium">Location</TableCell><TableCell>{schoolData.location}</TableCell></TableRow>}
              {schoolData.po_box && <TableRow><TableCell className="font-medium">P.O. Box</TableCell><TableCell>{schoolData.po_box}</TableCell></TableRow>}
              {schoolData.telephone && <TableRow><TableCell className="font-medium">Telephone</TableCell><TableCell>{schoolData.telephone}</TableCell></TableRow>}
              {schoolData.email && <TableRow><TableCell className="font-medium">Email</TableCell><TableCell>{schoolData.email}</TableCell></TableRow>}
              {schoolData.website && <TableRow><TableCell className="font-medium">Website</TableCell><TableCell><a href={schoolData.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{schoolData.website}</a></TableCell></TableRow>}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <School className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No school information found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SchoolInfoTable;
