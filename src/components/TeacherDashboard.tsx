import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SignaturePad from './SignaturePad';
import { Users, BookOpen } from 'lucide-react';

interface TeacherClass {
  id: string;
  class_name: string;
  section: string | null;
}

interface TeacherProfile {
  id: string;
  full_name: string;
  signature_url: string | null;
}

const TeacherDashboard = () => {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch teacher profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, signature_url')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profileData) {
        setProfile(profileData);

        // Fetch classes where this teacher is assigned as class teacher
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, class_name, section')
          .eq('class_teacher_id', user.id);

        if (classesError) throw classesError;
        setAssignedClasses(classesData || []);
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      toast({
        title: "Error",
        description: "Failed to load teacher data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureSaved = (signatureUrl: string) => {
    if (profile) {
      setProfile({ ...profile, signature_url: signatureUrl });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please log in to access the teacher dashboard.</p>
      </div>
    );
  }

  const isClassTeacher = assignedClasses.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Teacher Dashboard
          </CardTitle>
          <CardDescription>
            Welcome, {profile.full_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isClassTeacher ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Assigned Classes:</p>
              <div className="flex flex-wrap gap-2">
                {assignedClasses.map((cls) => (
                  <div 
                    key={cls.id} 
                    className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                  >
                    <BookOpen className="w-3 h-3" />
                    {cls.class_name}{cls.section ? ` - ${cls.section}` : ''}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              You are not currently assigned as a class teacher for any class.
            </p>
          )}
        </CardContent>
      </Card>

      {isClassTeacher && (
        <SignaturePad 
          teacherId={profile.id}
          existingSignature={profile.signature_url}
          onSignatureSaved={handleSignatureSaved}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;
