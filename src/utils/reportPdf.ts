import { detectAcademicLevel } from './academicLevel';
import { buildOLevelReportBlob, OLevelPdfData } from './pdfLibOLevelTemplate';
import type { ReportCardData } from './pdfGenerator';

/**
 * Unified report card PDF builder.
 * O-Level (S1–S4) reports are rendered with pdf-lib (vector, no HTML rendering).
 * A-Level (S5–S6) reports still use the dedicated A-Level template.
 */
export const buildReportCardBlob = async (data: ReportCardData): Promise<Blob> => {
  const className = data.student.classes?.class_name || '';
  const level = detectAcademicLevel(className);

  if (level === 'a-level') {
    const [{ generateALevelTemplate }, { addStampOverlayToPdf }] = await Promise.all([
      import('./aLevelPdfTemplate'),
      import('./pdfGenerator'),
    ]);
    const pdf = generateALevelTemplate({
      student: data.student,
      term: data.term,
      schoolInfo: data.schoolInfo,
      marks: data.marks,
      reportData: data.reportData,
      reportColor: data.reportColor,
      classTeacherSignature: data.classTeacherSignature,
      headteacherSignature: data.headteacherSignature,
      feesData: data.feesData,
      template: data.template || 'classic',
    } as any);
    if (data.stampUrl && data.stampConfig) {
      addStampOverlayToPdf(pdf, data.stampUrl, data.stampConfig);
    }
    return pdf.output('blob');
  }

  return buildOLevelReportBlob(data as unknown as OLevelPdfData);
};

export const reportFileName = (data: ReportCardData) =>
  `${data.student.name.replace(/\s+/g, '_')}_Report_${data.term.term_name}_${data.term.year}.pdf`;

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
