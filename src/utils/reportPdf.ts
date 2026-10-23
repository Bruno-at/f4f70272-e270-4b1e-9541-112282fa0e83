import { resolveAcademicLevel } from './academicLevel';
import { buildOLevelReportBlob, OLevelPdfData } from './pdfLibOLevelTemplate';
import type { ReportCardData } from './pdfGenerator';
import { fetchActiveTemplate, buildCustomTemplateBlob } from './customTemplatePdf';
import { loadReportOverlays } from './reportOverlays';
import { supabase } from '@/integrations/supabase/client';

/** Look up the class teacher (assigned on the class) and head teacher (Signatures page) names. */
const loadSignatoryNames = async (data: ReportCardData) => {
  const d = data as any;
  let classTeacherName: string | null = d.classTeacherName ?? null;
  let headteacherName: string | null = d.headteacherName ?? null;
  try {
    const classId = (data.student as any)?.class_id;
    if (!classTeacherName && classId) {
      const { data: cls } = await (supabase as any).from('classes')
        .select('profiles!classes_class_teacher_id_fkey(full_name)').eq('id', classId).maybeSingle();
      classTeacherName = cls?.profiles?.full_name || null;
    }
    const sid = schoolIdOf(data);
    if (!headteacherName && sid) {
      const { data: sch } = await (supabase as any).from('schools').select('headteacher_name').eq('id', sid).maybeSingle();
      headteacherName = sch?.headteacher_name || null;
    }
  } catch { /* names are optional */ }
  return { classTeacherName, headteacherName };
};

const schoolIdOf = (data: ReportCardData) =>
  (data.student as any)?.school_id || (data.schoolInfo as any)?.id || (data.schoolInfo as any)?.school_id || null;

/**
 * Make sure every render path (preview, print, download) uses the same
 * school-configured stamp and watermark settings.
 */
const withOverlays = async (data: ReportCardData): Promise<ReportCardData> => {
  const [overlays, names] = await Promise.all([loadReportOverlays(schoolIdOf(data)), loadSignatoryNames(data)]);
  const stampUrl = data.stampUrl === null ? null : data.stampUrl?.startsWith('data:image') ? data.stampUrl : overlays.stampUrl;
  const watermarkUrl = data.watermarkUrl === null ? null : data.watermarkUrl?.startsWith('data:image') ? data.watermarkUrl : overlays.watermarkUrl;
  return {
    ...data,
    ...names,
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
export const buildReportCardBlob = async (input: ReportCardData, options: { templateMode?: 'active' | 'default' } = {}): Promise<Blob> => {
  const data = await withOverlays(input);
  const level = resolveAcademicLevel(data.student.classes);

  // Both education levels use only their own school's active uploaded template.
  const custom = options.templateMode === 'default' ? null : await fetchActiveTemplate(schoolIdOf(data), level);
  if (custom) return buildCustomTemplateBlob(custom, data);

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
      classTeacherName: (data as any).classTeacherName,
      headteacherName: (data as any).headteacherName,
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
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
};
