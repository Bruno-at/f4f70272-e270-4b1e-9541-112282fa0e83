import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { School, ArrowLeft } from 'lucide-react';

const RegisterSchool = () => {
  const [schoolName, setSchoolName] = useState('');
  const [slug, setSlug] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [address, setAddress] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleSchoolNameChange = (value: string) => {
    setSchoolName(value);
    setSlug(generateSlug(value));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // 1. Register school
      const { data: newSchoolId, error: schoolError } = await supabase
        .rpc('register_school', {
          p_school_name: schoolName,
          p_slug: slug,
          p_email: schoolEmail || null,
          p_address: address || null,
        });

      if (schoolError) {
        if (schoolError.message.includes('duplicate key')) {
          toast({ title: 'Error', description: 'This school code is already taken. Please choose a different one.', variant: 'destructive' });
          return;
        }
        throw schoolError;
      }

      // 2. Create admin user
      const { error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            full_name: adminName,
            role: 'admin',
            school_id: newSchoolId,
          },
        },
      });

      if (signUpError) throw signUpError;

      toast({
        title: 'School registered!',
        description: `Your school code is "${slug}". Use it to log in. Check your email to verify your account.`,
      });

      navigate('/login');
    } catch (error: any) {
      toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <School className="w-6 h-6" />
            Register Your School
          </CardTitle>
          <CardDescription>Create a new school account and admin user</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name *</Label>
              <Input id="schoolName" value={schoolName} onChange={(e) => handleSchoolNameChange(e.target.value)} placeholder="e.g. St. Mary's Secondary School" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">School Code *</Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="e.g. st-marys-secondary" required />
              <p className="text-xs text-muted-foreground">This code is used to log in. Only lowercase letters, numbers, and hyphens.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schoolEmail">School Email</Label>
                <Input id="schoolEmail" type="email" value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} placeholder="info@school.edu" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, Country" />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">Admin Account</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Full Name *</Label>
                  <Input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Admin full name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email *</Label>
                  <Input id="adminEmail" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@school.edu" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Password *</Label>
                  <Input id="adminPassword" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating school...' : 'Register School'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary underline flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterSchool;
