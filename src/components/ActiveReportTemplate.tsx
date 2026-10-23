import { useEffect, useState } from 'react';
import { useSchool } from '@/contexts/SchoolContext';
import { fetchActiveTemplate } from '@/utils/customTemplatePdf';
import { resolveAcademicLevel } from '@/utils/academicLevel';

export default function ActiveReportTemplate({ klass, schoolId: suppliedSchoolId }: {
  klass?: { class_name?: string; education_level?: string | null; level?: string | null } | null;
  schoolId?: string | null;
}) {
  const { schoolId } = useSchool();
  const level = resolveAcademicLevel(klass);
  const [name, setName] = useState('Loading…');
  useEffect(() => {
    let cancelled = false;
    setName('Loading…');
    fetchActiveTemplate(suppliedSchoolId || schoolId, level).then(template => {
      if (!cancelled) setName(template?.name || 'Default template');
    }).catch(() => { if (!cancelled) setName('Template unavailable'); });
    return () => { cancelled = true; };
  }, [schoolId, suppliedSchoolId, level]);
  if (!klass) return null;
  return <div className="text-sm text-muted-foreground">Report template: <span className="font-medium text-foreground">{name}</span> · {level === 'a-level' ? 'A-Level' : 'O-Level'}</div>;
}