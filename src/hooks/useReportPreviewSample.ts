import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { resolveImageDataUrl } from '@/utils/photoUrl';
import { enrichMarksForReport } from '@/utils/reportEnrichment';

export interface ReportPreviewSample {
  student: any;
  term: any;
  schoolInfo: any;
  marks: any[];
  subjects: any[];
  reportData: {
    overall_average: number;
    overall_grade: string;
    overall_identifier: number;
    achievement_level: string;
    class_teacher_comment: string;
    headteacher_comment: string;
  };
  classTeacherSignature?: string | null;
  headteacherSignature?: string | null;
  feesData: { feesBalance: number; feesNextTerm: number; otherRequirements: string };
}

const fallbackTerm = {
  id: 'sample-term',
  term_name: 'Term 1',
  year: new Date().getFullYear(),
  start_date: new Date().toISOString(),
  end_date: new Date().toISOString(),
};

const fallbackStudent = {
  id: 'sample-student',
  name: 'Sample Student',
  gender: 'Female',
  age: 15,
  house: 'Blue',
  student_id: 'STD-0001',
  class_id: 'sample-class',
  classes: { class_name: 'S2', section: 'A' },
};

/**
 * Loads a real report-card-shaped sample for the current school so admins can
 * position the stamp and watermark against the actual template layout.
 */
export const useReportPreviewSample = () => {
  const { schoolId } = useSchool();
  const [sample, setSample] = useState<ReportPreviewSample | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const schoolQuery = schoolId
        ? supabase.from('schools').select('*').eq('id', schoolId).maybeSingle()
        : supabase.from('schools').select('*').limit(1).maybeSingle();
      const { data: school } = await schoolQuery;

      const { data: term } =
        (await supabase.from('terms').select('*').order('is_active', { ascending: false }).limit(1).maybeSingle()) || {};

      const { data: student } = await supabase
        .from('students')
        .select('*, classes!students_class_id_fkey(*)')
        .order('name')
        .limit(1)
        .maybeSingle();

      let marks: any[] = [];
      let subjects: any[] = [];
      if (student && term) {
        const { data: rawMarks } = await supabase
          .from('student_marks')
          .select('*, subjects!student_marks_subject_id_fkey(*)')
          .eq('student_id', student.id)
          .eq('term_id', term.id);
        marks = await enrichMarksForReport(rawMarks || [], {
          classId: student.class_id,
          schoolId: (student as any).school_id || schoolId,
        });

        const { data: links } = await supabase.from('class_subjects').select('subject_id').eq('class_id', student.class_id);
        const ids = (links || []).map((l: any) => l.subject_id);
        if (ids.length) {
          const { data: subs } = await supabase.from('subjects').select('*').in('id', ids);
          subjects = subs || [];
        }
      }

      const schoolInfo: any = { ...(school || { school_name: 'Your School' }) };
      const logo = await resolveImageDataUrl(schoolInfo.logo_url, 'student-photos');
      if (logo) schoolInfo.logo_url = logo;

      const previewStudent: any = { ...(student || fallbackStudent) };
      const photo = await resolveImageDataUrl(previewStudent.photo_url, 'student-photos');
      if (photo) previewStudent.photo_url = photo;

      const average = marks.length
        ? marks.reduce((s: number, m: any) => s + (m.hundred_percent || 0), 0) / marks.length
        : 76;

      setSample({
        student: previewStudent,
        term: term || fallbackTerm,
        schoolInfo,
        marks,
        subjects,
        reportData: {
          overall_average: average,
          overall_grade: average >= 80 ? 'A' : average >= 70 ? 'B' : average >= 60 ? 'C' : 'D',
          overall_identifier: 2,
          achievement_level: 'Moderate',
          class_teacher_comment: 'Good work this term — keep it up.',
          headteacher_comment: 'A promising performance. Aim higher next term.',
        },
        classTeacherSignature: await resolveImageDataUrl(previewStudent.classes?.class_signature_url, 'student-photos'),
        headteacherSignature: await resolveImageDataUrl(schoolInfo.headteacher_signature_url, 'student-photos'),
        feesData: { feesBalance: 0, feesNextTerm: 0, otherRequirements: '' },
      });
    } catch (e) {
      console.error('Could not build report preview sample', e);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  return { sample, loading, reload: load };
};