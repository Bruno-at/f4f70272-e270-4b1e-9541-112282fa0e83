import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Mail, Lock, School, ArrowRight, ArrowLeft } from 'lucide-react';

type Step = 'school' | 'login' | 'reset';

const Login = () => {
  const [step, setStep] = useState<Step>('school');
  const [schoolCode, setSchoolCode] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSchoolLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolCode.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, school_name, slug, logo_url')
        .eq('slug', schoolCode.toLowerCase().trim())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({ title: 'School not found', description: 'Please check the school code and try again.', variant: 'destructive' });
        return;
      }

      setSchoolId(data.id);
      setSchoolName(data.school_name);
      setStep('login');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Capture schoolId before async operations to avoid stale closures
    const currentSchoolId = schoolId;
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Verify user belongs to this school using a direct query
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile query error:', profileError);
      }

      console.log('Login check - profile school_id:', profile?.school_id, 'expected:', currentSchoolId);

      if (!profile || profile.school_id !== currentSchoolId) {
        await supabase.auth.signOut();
        toast({ title: 'Access denied', description: 'Your account is not registered with this school.', variant: 'destructive' });
        return;
      }

      navigate('/');
    } catch (error: any) {
      toast({ title: 'Login failed', description: error.message || 'Invalid credentials', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: 'Error', description: 'Please enter your email address', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'Email sent', description: 'Check your inbox for the password reset link.' });
      setStep('login');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            {step === 'school' ? <School className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
            {step === 'school' ? 'School Report System' : step === 'reset' ? 'Reset Password' : schoolName}
          </CardTitle>
          <CardDescription>
            {step === 'school' && 'Enter your school code to get started'}
            {step === 'login' && 'Sign in to manage report cards'}
            {step === 'reset' && 'Enter your email to receive a reset link'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'school' && (
            <form onSubmit={handleSchoolLookup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolCode">School Code</Label>
                <div className="relative">
                  <School className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="schoolCode"
                    placeholder="e.g. my-school-name"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Looking up...' : (
                  <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
              <div className="text-center">
                <Link to="/register-school" className="text-sm text-muted-foreground hover:text-primary underline">
                  Register a new school
                </Link>
              </div>
            </form>
          )}

          {step === 'login' && (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="you@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Please wait...' : 'Sign In'}
                </Button>
              </form>
              <div className="mt-4 flex justify-between text-sm">
                <button type="button" onClick={() => { setStep('school'); setSchoolCode(''); }} className="text-muted-foreground hover:text-primary underline flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Change school
                </button>
                <button type="button" onClick={() => setStep('reset')} className="text-muted-foreground hover:text-primary underline">
                  Forgot password?
                </button>
              </div>
            </>
          )}

          {step === 'reset' && (
            <>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="resetEmail" type="email" placeholder="you@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Please wait...' : 'Send Reset Link'}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button type="button" onClick={() => setStep('login')} className="text-sm text-muted-foreground hover:text-primary underline">
                  Back to login
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
