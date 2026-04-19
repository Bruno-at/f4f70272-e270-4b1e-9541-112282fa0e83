import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const routeUser = async (s: Session) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, role')
      .eq('id', s.user.id)
      .maybeSingle();

    // No school yet → setup
    if (!profile?.school_id) {
      if (location.pathname !== '/setup-school') {
        navigate('/setup-school', { replace: true });
      }
      return;
    }

    // Admin/headteacher with no teachers → send to report-card system to add teachers
    if (profile.role === 'admin' || profile.role === 'headteacher') {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', profile.school_id)
        .eq('role', 'teacher');

      if ((count ?? 0) === 0 && location.pathname === '/') {
        // already on '/' which renders the report card system; nothing to do
      }
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) {
        navigate('/login', { replace: true });
      } else {
        routeUser(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate('/login', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) return null;

  return <>{children}</>;
};

export default AuthGuard;
