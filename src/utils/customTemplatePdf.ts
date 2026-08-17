import { PDFDocument, PDFFont, StandardFonts, degrees, rgb } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';
import type { ReportCardData } from './pdfGenerator';
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
  level: string = 'o-level',
): Promise<StoredTemplate | null> {
  if (!schoolId) return null;
  const { data, error } = await supabase
    .from('report_templates')
    .select('*')
    .eq('school_id', schoolId)
    .eq('level', level)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return { ...(data as any), fields: (data as any).fields || [] } as StoredTemplate;
}

async function fetchCustomValues(studentId: string, termId: string, schoolId: string) {
  const map: Record<string, string> = {};
  const [{ data: defs }, { data: values }] = await Promise.all([
    supabase.from('template_custom_fields').select('field_key, default_value').eq('school_id', schoolId),
    supabase
      .from('student_custom_field_values')
      .select('field_key, value, term_id')
      .eq('school_id', schoolId)
      .eq('student_id', studentId),
  ]);
  (defs || []).forEach((d: any) => { if (d.default_value) map[d.field_key] = d.default_value; });
  (values || [])
    .filter((v: any) => !v.term_id || v.term_id === termId)
    .forEach((v: any) => { if (v.value) map[v.field_key] = v.value; });
  return map;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
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
    // A4 portrait page matched to the image aspect ratio
    const W = 595.28;
    const H = (img.height / img.width) * W;
    page = pdf.addPage([W, H]);
    page.drawImage(img, { x: 0, y: 0, width: W, height: H });
  }

  const PW = page.getWidth();
  const PH = page.getHeight();

  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const BLACK = rgb(0.1, 0.1, 0.1);

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

  const customValues = await fetchCustomValues(
    data.student.id,
    data.term.id,
    (data.student as any).school_id || template.school_id,
  );

  const drawText = (text: string, f: TemplateField, font: PDFFont = reg) => {
    if (!text) return;
    const x = f.x * PW;
    const boxW = Math.max(f.w * PW, 10);
    const boxH = Math.max(f.h * PH, 8);
    const top = PH - f.y * PH;
    let size = f.fontSize || Math.min(10, Math.max(6, boxH * 0.55));
    let lines = wrap(text, font, size, boxW);
    while (lines.length * (size * 1.2) > boxH && size > 5) {
      size -= 0.5;
      lines = wrap(text, font, size, boxW);
    }
    lines.slice(0, Math.max(1, Math.floor(boxH / (size * 1.2)))).forEach((line, i) => {
      const lw = font.widthOfTextAtSize(line, size);
      const lx = f.align === 'center' ? x + (boxW - lw) / 2 : f.align === 'right' ? x + boxW - lw : x;
      page.drawText(line, { x: lx, y: top - size - i * size * 1.2, size, font, color: BLACK });
    });
  };

  const drawImage = async (dataUrl: string, f: TemplateField) => {
    if (!dataUrl?.startsWith('data:image')) return;
    const raw = dataUrl.split(',')[1];
    const buf = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    try {
      const img = dataUrl.includes('image/png')
        ? await pdf.embedPng(buf)
        : await pdf.embedJpg(buf);
      const boxW = f.w * PW;
      const boxH = f.h * PH;
      const scale = Math.min(boxW / img.width, boxH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      page.drawImage(img, {
        x: f.x * PW + (boxW - w) / 2,
        y: PH - f.y * PH - boxH + (boxH - h) / 2,
        width: w,
        height: h,
      });
    } catch {
      /* unsupported image, skip */
    }
  };

  const drawMarksTable = (f: TemplateField) => {
    const marks = data.marks || [];
    if (!marks.length) return;
    const x = f.x * PW;
    const boxW = f.w * PW;
    const boxH = f.h * PH;
    const top = PH - f.y * PH;
    const rowH = Math.min(18, boxH / (marks.length + 1));
    const cols = [0.34, 0.13, 0.13, 0.13, 0.12, 0.15];
    const headers = ['SUBJECT', '20%', '80%', '100%', 'GRADE', 'REMARK'];
    let size = Math.max(5.5, Math.min(8.5, rowH * 0.5));

    const drawRow = (cells: string[], y: number, font: PDFFont) => {
      let cx = x;
      cells.forEach((cell, i) => {
        const cw = cols[i] * boxW;
        let text = cell || '';
        while (font.widthOfTextAtSize(text, size) > cw - 4 && text.length > 1) {
          text = text.slice(0, -1);
        }
        page.drawText(text, { x: cx + 2, y, size, font, color: BLACK });
        cx += cw;
      });
    };

    drawRow(headers, top - rowH * 0.7, bold);
    marks.forEach((m: any, i) => {
      const y = top - rowH * (i + 1) - rowH * 0.7;
      if (y < top - boxH) return;
      drawRow(
        [
          m.subjects?.subject_name || '',
          m.twenty_percent != null ? String(Math.round(m.twenty_percent)) : '',
          m.eighty_percent != null ? String(Math.round(m.eighty_percent)) : '',
          m.hundred_percent != null ? String(Math.round(m.hundred_percent)) : '',
          m.final_grade || '',
          m.achievement_level || '',
        ],
        y,
        reg,
      );
    });
  };

  for (const f of template.fields || []) {
    const key = f.systemField || f.key;
    if (key === 'marks_table') {
      drawMarksTable(f);
      continue;
    }
    if (f.systemField && IMAGE_FIELDS.has(f.systemField)) {
      const src = resolveImageField(f.systemField, data);
      if (src) await drawImage(src, f);
      continue;
    }
    const value = f.systemField
      ? resolveSystemFieldValue(f.systemField, data)
      : customValues[f.key] || '';
    drawText(value, f);
  }

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

  const out = await pdf.save();
  return new Blob([out.slice().buffer as ArrayBuffer], { type: 'application/pdf' });
}
