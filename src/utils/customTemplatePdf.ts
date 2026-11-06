import { PDFDocument, PDFFont, StandardFonts, degrees, rgb } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';
import type { ReportCardData } from './pdfGenerator';
import { resolveExtraValues, type ExtraField } from './extraTemplateFields';
import { assertTemplateLevel, resolveAcademicLevel, type AcademicLevel } from './academicLevel';
import {
  TemplateField,
  IMAGE_FIELDS,
  resolveSystemFieldValue,
  resolveImageField,
} from './templateFields';

export interface StoredTemplate {
  id: string;
  school_id: string;
  name: string;
  level: string;
  file_path: string;
  mime_type: string;
  fields: TemplateField[];
  is_active: boolean;
}

/** Fetch the active uploaded template for a school & level (null when none). */
export async function fetchActiveTemplate(
  schoolId: string | null | undefined,
  level: AcademicLevel = 'o-level',
): Promise<StoredTemplate | null> {
  if (!schoolId) return null;
  const { data, error } = await supabase
    .from('report_templates')
    .select('*')
    .eq('school_id', schoolId)
    .eq('level', level)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...(data as any), fields: (data as any).fields || [] } as StoredTemplate;
}

async function fetchCustomValues(studentId: string, termId: string, schoolId: string, templateId: string) {
  const [defs, values, legacy] = await Promise.all([
    supabase.from('template_custom_fields').select('*').eq('school_id', schoolId).or(`template_id.eq.${templateId},template_id.is.null`),
    supabase.from('template_field_values').select('field_id,student_id,term_id,value').eq('school_id', schoolId).or(`student_id.eq.${studentId},student_id.is.null`).or(`term_id.eq.${termId},term_id.is.null`),
    supabase.from('student_custom_field_values').select('field_key,value,term_id').eq('school_id', schoolId).eq('student_id', studentId).or(`term_id.eq.${termId},term_id.is.null`),
  ]);
  for (const result of [defs, values, legacy]) if (result.error) throw result.error;
  return resolveExtraValues((defs.data || []) as ExtraField[], values.data || [], legacy.data || [], templateId, studentId, termId);
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  // Respect line breaks typed into multiline fields, then wrap each paragraph.
  for (const paragraph of String(text).split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth || !line) line = next;
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/**
 * Render a report card on top of the school's own uploaded template.
 * The template page (PDF page or image) is used untouched as the background so
 * its exact layout and design are preserved; values are drawn into the mapped boxes.
 */
export async function buildCustomTemplateBlob(
  template: StoredTemplate,
  data: ReportCardData,
): Promise<Blob> {
  assertTemplateLevel(template.level, resolveAcademicLevel(data.student.classes));
  const schoolId = (data.student as any).school_id || data.schoolInfo.id;
  if (template.school_id !== schoolId) throw new Error('The template does not belong to this school.');
  const { data: file, error } = await supabase.storage.from('report-templates').download(template.file_path);
  if (error || !file) throw new Error('Template file could not be loaded');
  const bytes = new Uint8Array(await file.arrayBuffer());

  const pdf = await PDFDocument.create();
  let page;

  if (template.mime_type === 'application/pdf') {
    const src = await PDFDocument.load(bytes);
    const [embedded] = await pdf.embedPdf(src, [0]);
    page = pdf.addPage([embedded.width, embedded.height]);
    page.drawPage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
  } else {
    const img = template.mime_type.includes('png')
      ? await pdf.embedPng(bytes)
      : await pdf.embedJpg(bytes);
    // A4-sized page following the image's own aspect ratio and orientation.
    const W = img.width > img.height ? 841.89 : 595.28;
    const H = (img.height / img.width) * W;
    page = pdf.addPage([W, H]);
    page.drawImage(img, { x: 0, y: 0, width: W, height: H });
  }

  const PW = page.getWidth();
  const PH = page.getHeight();

  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const BLACK = rgb(0.1, 0.1, 0.1);
  const WHITE = rgb(1, 1, 1);

  const embedDataUrl = async (dataUrl?: string | null) => {
    if (!dataUrl?.startsWith('data:image')) return null;
    const raw = dataUrl.split(',')[1];
    const buf = Uint8Array.from(atob(raw), (ch) => ch.charCodeAt(0));
    try {
      return dataUrl.includes('image/png') ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
    } catch {
      return null;
    }
  };

  // Watermark first, so template values print on top of it.
  if (data.watermarkUrl && data.watermarkConfig) {
    const wm = await embedDataUrl(data.watermarkUrl);
    if (wm) {
      const cfg = data.watermarkConfig;
      const w = ((Number(cfg.size) || 120) * 0.35 * PW) / 210;
      const h = (wm.height / wm.width) * w;
      const cx = ((Number(cfg.positionX) ?? 50) / 100) * PW;
      const cy = PH - ((Number(cfg.positionY) ?? 50) / 100) * PH;
      const rot = Number(cfg.rotation) || 0;
      const rad = (rot * Math.PI) / 180;
      const dx = (-w / 2) * Math.cos(rad) - (-h / 2) * Math.sin(rad);
      const dy = (-w / 2) * Math.sin(rad) + (-h / 2) * Math.cos(rad);
      page.drawImage(wm, {
        x: cx + dx,
        y: cy + dy,
        width: w,
        height: h,
        opacity: Math.max(0, Math.min(100, Number(cfg.opacity ?? 15))) / 100,
        rotate: degrees(rot),
      });
    }
  }

  // Uploaded templates are printed exactly as designed: no field masking or
  // mapped values. Saved mappings in report_templates.fields are kept but unused.

  // Stamp on top of everything.
  if (data.stampUrl && data.stampConfig) {
    const stamp = await embedDataUrl(data.stampUrl);
    if (stamp) {
      const cfg = data.stampConfig;
      const size = ((Number(cfg.size) || 60) * 0.35 * PW) / 210;
      const cx = ((Number(cfg.positionX) ?? 75) / 100) * PW;
      const cy = PH - ((Number(cfg.positionY) ?? 80) / 100) * PH;
      page.drawImage(stamp, {
        x: cx - size / 2,
        y: cy - size / 2,
        width: size,
        height: size,
        opacity: Math.max(0, Math.min(100, Number(cfg.opacity ?? 70))) / 100,
      });
    }
  }

  // Keep the uploaded template's own page size and orientation.
  const out = await pdf.save();
  return new Blob([out.slice().buffer as ArrayBuffer], { type: 'application/pdf' });
}
