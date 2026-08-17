import { detectAcademicLevel } from './academicLevel';
import { buildOLevelReportBlob, OLevelPdfData } from './pdfLibOLevelTemplate';
import type { ReportCardData } from './pdfGenerator';
import { fetchActiveTemplate, buildCustomTemplateBlob } from './customTemplatePdf';
import { loadReportOverlays } from './reportOverlays';

const schoolIdOf = (data: ReportCardData) =>
  (data.student as any)?.school_id || (data.schoolInfo as any)?.id || (data.schoolInfo as any)?.school_id || null;

/**
 * Make sure every render path (preview, print, download) uses the same
 * school-configured stamp and watermark settings.
 */
const withOverlays = async (data: ReportCardData): Promise<ReportCardData> => {
  const overlays = await loadReportOverlays(schoolIdOf(data));
  const stampUrl = data.stampUrl?.startsWith('data:image') ? data.stampUrl : overlays.stampUrl;
  const watermarkUrl = data.watermarkUrl?.startsWith('data:image') ? data.watermarkUrl : overlays.watermarkUrl;
  return {
    ...data,
    stampUrl,
    stampConfig: data.stampConfig || overlays.stampConfig,
    watermarkUrl,
    watermarkConfig: data.watermarkConfig || overlays.watermarkConfig,
  };
};

/**
 * Unified report card PDF builder.
 * O-Level (S1–S4) reports are rendered with pdf-lib (vector, no HTML rendering).
 * A-Level (S5–S6) reports still use the dedicated A-Level template.
 */
export const buildReportCardBlob = async (input: ReportCardData): Promise<Blob> => {
  const data = await withOverlays(input);
  const className = data.student.classes?.class_name || '';
  const level = detectAcademicLevel(className);

  if (level === 'a-level') {
    const [{ generateALevelTemplate }, { addStampOverlayToPdf, addWatermarkOverlayToPdf }] = await Promise.all([
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
    if (data.watermarkUrl && data.watermarkConfig) {
      addWatermarkOverlayToPdf(pdf, data.watermarkUrl, data.watermarkConfig);
    }
    if (data.stampUrl && data.stampConfig) {
      addStampOverlayToPdf(pdf, data.stampUrl, data.stampConfig);
    }
    return pdf.output('blob');
  }

  // A school may upload its own O-Level template. When one is active it is used
  // as-is (layout and design preserved) with values drawn into its mapped fields.
  try {
    const schoolId = schoolIdOf(data);
    const custom = await fetchActiveTemplate(schoolId, 'o-level');
    if (custom) return await buildCustomTemplateBlob(custom, data);
  } catch (e) {
    console.error('Custom template failed, falling back to the default template', e);
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
