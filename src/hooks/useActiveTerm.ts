import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { Term } from '@/types/database';

/**
 * Returns the school's currently active term (terms.is_active = true).
 * Used so screens stop asking the user to pick a term manually.
 */
export function useActiveTerm() {
  const { schoolId } = useSchool();
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!schoolId) {
        setActiveTerm(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('terms')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .maybeSingle();
      if (!cancelled) {
        setActiveTerm((data as Term) || null);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  return { activeTerm, activeTermId: activeTerm?.id || null, loading };
}