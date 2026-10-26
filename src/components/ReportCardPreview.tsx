import { useEffect, useState } from 'react';
import { Student, Term, SchoolInfo, StudentMark, Subject } from '@/types/database';
import { StampConfig } from './StampConfigurator';
import type { OverlayConfig } from '@/utils/reportOverlays';
import { buildReportCardBlob } from '@/utils/reportPdf';
import PdfPagePreview from './PdfPagePreview';

export type StampPosition = 'bottom-right' | 'bottom-center' | 'over-signatures' | 'center';

interface ReportCardPreviewProps {
  templateMode?: 'active' | 'default';
  templateId?: string;
  student: Student;
  term: Term;
  schoolInfo: SchoolInfo;
  marks: StudentMark[];
  subjects: Subject[];
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
  stampUrl?: string | null;
  stampPosition?: StampPosition;
  stampConfig?: StampConfig | null;
  watermarkUrl?: string | null;
  watermarkConfig?: OverlayConfig | null;
  feesData?: {
    feesBalance: number;
    feesNextTerm: number;
    otherRequirements: string;
  } | null;
}

const ReportCardPreview = (props: ReportCardPreviewProps) => {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const { student, term, schoolInfo, marks, subjects, reportData, classTeacherSignature,
     headteacherSignature, stampUrl, stampConfig, watermarkUrl, watermarkConfig, feesData, templateMode, templateId } = props;
  useEffect(() => {
    let cancelled = false;
    setBlob(null);
    setError('');
    buildReportCardBlob({ student, term, schoolInfo, marks, subjects, reportData,
      classTeacherSignature, headteacherSignature, stampUrl, stampConfig,
      watermarkUrl, watermarkConfig, feesData: feesData || undefined,
    }, { templateMode, templateId }).then(result => {
      if (!cancelled) setBlob(result);
    }).catch(() => { if (!cancelled) setError('Could not generate the report card preview.'); });
    return () => { cancelled = true; };
  }, [student, term, schoolInfo, marks, subjects, reportData, classTeacherSignature,
    headteacherSignature, stampUrl, stampConfig, watermarkUrl, watermarkConfig, feesData, templateMode, templateId]);
  return error ? <p role="alert" className="py-12 text-center text-destructive">{error}</p> : <PdfPagePreview blob={blob} />;
};

export default ReportCardPreview;
