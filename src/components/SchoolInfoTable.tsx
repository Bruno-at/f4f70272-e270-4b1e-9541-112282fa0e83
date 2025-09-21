import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SchoolInfo } from '@/types/database';
import { Edit, Plus, School } from 'lucide-react';
import SchoolInfoManager from './SchoolInfoManager';

const SchoolInfoTable = () => {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSchoolInfo();
  }, []);

  const fetchSchoolInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('school_info')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSchoolInfo(data);
    } catch (error) {
      console.error('Error fetching school info:', error);
      toast({
        title: "Error",
        description: "Failed to load school information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = () => {
    setDialogOpen(false);
    fetchSchoolInfo();
    toast({
      title: "Success",
      description: "School information updated successfully",
    });
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
                {schoolInfo ? (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add School Info
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {schoolInfo ? 'Edit School Information' : 'Add School Information'}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-6">
                <SchoolInfoManager onSuccess={handleEditSuccess} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {schoolInfo ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Field</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">School Name</TableCell>
                <TableCell>{schoolInfo.school_name}</TableCell>
              </TableRow>
              {schoolInfo.motto && (
                <TableRow>
                  <TableCell className="font-medium">Motto</TableCell>
                  <TableCell>{schoolInfo.motto}</TableCell>
                </TableRow>
              )}
              {schoolInfo.location && (
                <TableRow>
                  <TableCell className="font-medium">Location</TableCell>
                  <TableCell>{schoolInfo.location}</TableCell>
                </TableRow>
              )}
              {schoolInfo.po_box && (
                <TableRow>
                  <TableCell className="font-medium">P.O. Box</TableCell>
                  <TableCell>{schoolInfo.po_box}</TableCell>
                </TableRow>
              )}
              {schoolInfo.telephone && (
                <TableRow>
                  <TableCell className="font-medium">Telephone</TableCell>
                  <TableCell>{schoolInfo.telephone}</TableCell>
                </TableRow>
              )}
              {schoolInfo.email && (
                <TableRow>
                  <TableCell className="font-medium">Email</TableCell>
                  <TableCell>{schoolInfo.email}</TableCell>
                </TableRow>
              )}
              {schoolInfo.website && (
                <TableRow>
                  <TableCell className="font-medium">Website</TableCell>
                  <TableCell>
                    <a 
                      href={schoolInfo.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {schoolInfo.website}
                    </a>
                  </TableCell>
                </TableRow>
              )}
              {schoolInfo.logo_url && (
                <TableRow>
                  <TableCell className="font-medium">School Logo</TableCell>
                  <TableCell>
                    <img 
                      src={schoolInfo.logo_url} 
                      alt="School Logo" 
                      className="w-16 h-16 object-contain border rounded"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <School className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No school information found</p>
            <p className="text-sm text-muted-foreground">
              Click "Add School Info" to set up your school's information
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SchoolInfoTable;