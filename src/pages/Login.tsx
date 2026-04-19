import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Mail, Lock, School, ArrowLeft } from 'lucide-react';

type Step = 'login' | 'reset';
type AppRole = 'admin' | 'teacher' | 'student' | 'headteacher';
type ProfileRecord = {
  school_id: string | null;
  role: AppRole;
};

const REMEMBERED_SCHOOL_CODE_KEY = 'remembered-school-code';
const VALID_ROLES: AppRole[] = ['admin', 'teacher', 'student', 'headteacher'];

const normalizeSchoolCode = (value: string) => value.trim().toLowerCase();

const getProfileSeedData = (user: User) => {
  const metadata = user.user_metadata ?? {};
  const role = VALID_ROLES.includes(metadata.role as AppRole) ? (metadata.role as AppRole) : 'teacher';
  const schoolId = typeof metadata.school_id === 'string' ? metadata.school_id : null;
  const fullName = typeof metadata.full_name === 'string' && metadata.full_name.trim().length > 0
    ? metadata.full_name.trim()
    : user.email ?? 'User';

  return { fullName, role, schoolId };
};

const ensureUserProfile = async (user: User): Promise<ProfileRecord | null> => {
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (existingProfile?.school_id) return existingProfile;

  const { fullName, role, schoolId } = getProfileSeedData(user);
  if (!schoolId) {
    return existingProfile ?? null;
  }

  if (existingProfile) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, role, school_id: schoolId })
      .eq('id', user.id);

    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({ id: user.id, full_name: fullName, role, school_id: schoolId });

    if (insertError) throw insertError;
  }

  const { data: repairedProfile, error: repairedProfileError } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (repairedProfileError) throw repairedProfileError;
  return repairedProfile;
};

const Login = () => {
  const [step, setStep] = useState<Step>('login');
  const [schoolCode, setSchoolCode] = useState('');
  const [rememberSchoolCode, setRememberSchoolCode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const isManualLoginInProgress = useRef(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshSchool } = useSchool();

  useEffect(() => {
    const rememberedSchoolCode = window.localStorage.getItem(REMEMBERED_SCHOOL_CODE_KEY);
    if (rememberedSchoolCode) {
      setSchoolCode(rememberedSchoolCode);
      setRememberSchoolCode(true);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const bootstrapSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !isActive) return;

      try {
        const profile = await ensureUserProfile(session.user);
        if (!isActive || !profile?.school_id) return;
        await refreshSchool();
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Failed to bootstrap login session:', error);
      }
    };

    bootstrapSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isManualLoginInProgress.current) return;
      if (!session || !isActive) return;

      setTimeout(async () => {
        if (!isActive) return;

        try {
          const profile = await ensureUserProfile(session.user);
          if (!isActive || !profile?.school_id) return;
          await refreshSchool();
          navigate('/', { replace: true });
        } catch (error) {
          console.error('Failed to finish login session setup:', error);
        }
      }, 200);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [navigate, refreshSchool]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedSchoolCode = normalizeSchoolCode(schoolCode);
    if (!normalizedSchoolCode) {
      toast({ title: 'School code required', description: 'Enter your school code to continue.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    isManualLoginInProgress.current = true;
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        toast({
          title: 'Login failed',
          description: authError.message.toLowerCase().includes('email not confirmed')
            ? 'Please confirm your email before logging in.'
            : 'Invalid email or password.',
          variant: 'destructive',
        });
        return;
      }

      const profile = await ensureUserProfile(authData.user);
      if (!profile?.school_id) {
        await supabase.auth.signOut();
        toast({
          title: 'Account setup incomplete',
          description: 'We could not load your school account. Please contact support.',
          variant: 'destructive',
        });
        return;
      }

      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('slug', normalizedSchoolCode)
        .maybeSingle();

      if (schoolError) throw schoolError;

      if (!school || school.id !== profile.school_id) {
        await supabase.auth.signOut();
        toast({
          title: 'Invalid school code',
          description: 'Invalid school code for this account.',
          variant: 'destructive',
        });
        return;
      }

      if (rememberSchoolCode) {
        window.localStorage.setItem(REMEMBERED_SCHOOL_CODE_KEY, normalizedSchoolCode);
      } else {
        window.localStorage.removeItem(REMEMBERED_SCHOOL_CODE_KEY);
      }

      await refreshSchool();
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Unable to complete login right now.',
        variant: 'destructive',
      });
    } finally {
      isManualLoginInProgress.current = false;
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
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
            {step === 'reset' ? <Mail className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
            {step === 'reset' ? 'Reset Password' : 'School Admin Login'}
          </CardTitle>
          <CardDescription>
            {step === 'reset'
              ? 'Enter your admin email to receive a password reset link'
              : 'Use your school code, admin email, and password to access your dashboard'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'login' && (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
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
                      autoComplete="organization"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Admin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={rememberSchoolCode}
                    onChange={(e) => setRememberSchoolCode(e.target.checked)}
                    className="h-4 w-4 rounded border-input bg-background accent-primary"
                  />
                  Remember school code
                </label>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-4 flex justify-between text-sm">
                <Link to="/register-school" className="text-muted-foreground hover:text-primary underline">
                  Register a new school
                </Link>
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
                  <Label htmlFor="resetEmail">Admin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="admin@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Please wait...' : 'Send Reset Link'}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button type="button" onClick={() => setStep('login')} className="text-sm text-muted-foreground hover:text-primary underline inline-flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Back to login
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
