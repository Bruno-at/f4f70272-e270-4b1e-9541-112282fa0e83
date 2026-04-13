import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface School {
  id: string;
  school_name: string;
  slug: string;
  logo_url?: string;
  motto?: string;
}

interface SchoolContextType {
  school: School | null;
  schoolId: string | null;
  loading: boolean;
  setSchool: (school: School | null) => void;
  refreshSchool: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType>({
  school: null,
  schoolId: null,
  loading: true,
  setSchool: () => {},
  refreshSchool: async () => {},
});

export const useSchool = () => useContext(SchoolContext);

export const SchoolProvider = ({ children }: { children: ReactNode }) => {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSchool = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSchool(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile?.school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('id, school_name, slug, logo_url, motto')
          .eq('id', profile.school_id)
          .maybeSingle();

        if (schoolData) {
          setSchool(schoolData);
        }
      }
    } catch (error) {
      console.error('Error loading school context:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSchool();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshSchool();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SchoolContext.Provider value={{
      school,
      schoolId: school?.id || null,
      loading,
      setSchool,
      refreshSchool,
    }}>
      {children}
    </SchoolContext.Provider>
  );
};
