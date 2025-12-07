import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Pencil, User } from 'lucide-react';
import SignaturePad from './SignaturePad';

interface Class {
  id: string;
  class_name: string;
  section: string | null;
  class_signature_url: string | null;
}

interface SchoolInfo {
  id: string;
  school_name: string;
  headteacher_signature_url: string | null;
}

const SignaturesManager = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [classesResult, schoolResult] = await Promise.all([
        supabase.from('classes').select('id, class_name, section, class_signature_url').order('class_name'),
        supabase.from('school_info').select('id, school_name, headteacher_signature_url').limit(1).maybeSingle()
      ]);

      if (classesResult.error) throw classesResult.error;
      if (schoolResult.error) throw schoolResult.error;

      setClasses(classesResult.data || []);
      setSchoolInfo(schoolResult.data);
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

  const selectedClassData = classes.find(c => c.id === selectedClass);

  const handleClassSignatureSaved = (signatureUrl: string) => {
    setClasses(prev => prev.map(c => 
      c.id === selectedClass ? { ...c, class_signature_url: signatureUrl } : c
    ));
  };

  const handleHeadteacherSignatureSaved = (signatureUrl: string) => {
    if (schoolInfo) {
      setSchoolInfo({ ...schoolInfo, headteacher_signature_url: signatureUrl });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Class Teacher Signature Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Class Teacher Signature
          </CardTitle>
          <CardDescription>
            Select a class and add a digital signature that will appear on all report cards for that class.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="class">Select Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class to manage signature" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.class_name} {cls.section ? `- ${cls.section}` : ''}
                    {cls.class_signature_url && ' ✓'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClass && selectedClassData && (
            <SignaturePad
              targetType="class"
              targetId={selectedClass}
              existingSignature={selectedClassData.class_signature_url}
              onSignatureSaved={handleClassSignatureSaved}
              title={`Signature for ${selectedClassData.class_name}`}
            />
          )}

          {!selectedClass && (
            <div className="text-center py-8 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground">
                Please select a class above to manage its signature
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Head Teacher Signature Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Head Teacher Signature
          </CardTitle>
          <CardDescription>
            Add a digital signature for the head teacher. This signature will appear on ALL report cards across the school.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schoolInfo ? (
            <SignaturePad
              targetType="headteacher"
              targetId={schoolInfo.id}
              existingSignature={schoolInfo.headteacher_signature_url}
              onSignatureSaved={handleHeadteacherSignatureSaved}
              title="Head Teacher Signature"
            />
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground">
                Please configure school information first before adding the head teacher signature.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SignaturesManager;