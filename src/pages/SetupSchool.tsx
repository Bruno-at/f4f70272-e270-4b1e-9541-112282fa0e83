import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { School, LogOut } from 'lucide-react';

const SetupSchool = () => {
  const [schoolName, setSchoolName] = useState('');
  const [slug, setSlug] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshSchool } = useSchool();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login', { replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', session.user.id)
        .maybeSingle();
      if (profile?.school_id) {
        navigate('/', { replace: true });
        return;
      }
      setChecking(false);
    })();
  }, [navigate]);

  const handleSchoolNameChange = (value: string) => {
    setSchoolName(value);
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: newSchoolId, error: schoolError } = await supabase.rpc('register_school', {
        p_school_name: schoolName,
        p_slug: slug,
        p_email: schoolEmail || null,
        p_address: address || null,
      });
      if (schoolError) {
        if (schoolError.message.includes('duplicate key')) {
          toast({ title: 'Code taken', description: 'That school code is already in use.', variant: 'destructive' });
          return;
        }
        throw schoolError;
      }

      // Attach this user as admin of the new school
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ school_id: newSchoolId, role: 'admin' })
        .eq('id', session.user.id);
      if (profileError) throw profileError;

      toast({ title: 'School created', description: `Your school code is "${slug}".` });
      await refreshSchool();
      navigate('/', { replace: true });
    } catch (error: any) {
      toast({ title: 'Setup failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <School className="w-6 h-6" />
            Set Up Your School
          </CardTitle>
          <CardDescription>You're signed in but no school is linked to your account yet. Create one to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name *</Label>
              <Input id="schoolName" value={schoolName} onChange={(e) => handleSchoolNameChange(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">School Code *</Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} required />
              <p className="text-xs text-muted-foreground">Used to log in. Lowercase letters, numbers, and hyphens.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schoolEmail">School Email</Label>
                <Input id="schoolEmail" type="email" value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating school...' : 'Create School'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button type="button" onClick={handleSignOut} className="text-sm text-muted-foreground hover:text-primary underline inline-flex items-center gap-1">
              <LogOut className="w-3 h-3" /> Sign out
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupSchool;
