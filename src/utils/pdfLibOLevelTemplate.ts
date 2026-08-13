import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, RGB, degrees } from 'pdf-lib';
import { Student, Term, SchoolInfo, StudentMark } from '@/types/database';
import { formatSchoolAddress } from './schoolAddress';

/* ------------------------------------------------------------------ */
/* Units & palette                                                      */
/* ------------------------------------------------------------------ */

const MM = 2.834645669; // 1mm in pt
const PAGE_W = 210 * MM;
const PAGE_H = 297 * MM;

const NAVY = rgb(0.117, 0.227, 0.541);   // #1E3A8A
const BLUE = rgb(0.113, 0.306, 0.847);   // #1D4ED8
const LIGHT = rgb(0.878, 0.918, 0.98);   // #E0EAFA
const LINE = rgb(0.72, 0.78, 0.88);
const BLACK = rgb(0.1, 0.1, 0.1);
const GREY = rgb(0.35, 0.35, 0.35);
const RED = rgb(0.72, 0.11, 0.11);
const WHITE = rgb(1, 1, 1);

export type ReportColor = 'white' | 'green' | 'blue' | 'pink' | 'yellow' | 'gray';

const bgHex: Record<ReportColor, [number, number, number]> = {
  white: [1, 1, 1],
  green: [0.863, 0.988, 0.906],
  blue: [0.859, 0.918, 0.996],
  pink: [0.988, 0.906, 0.953],
  yellow: [0.996, 0.976, 0.765],
  gray: [0.953, 0.957, 0.965],
};

export interface OLevelPdfData {
  student: Student;
  term: Term;
  schoolInfo: SchoolInfo;
  marks: StudentMark[];
  reportData: {
    overall_average: number;
    overall_grade: string;
    overall_identifier: number;
    achievement_level: string;
    class_teacher_comment: string;
    headteacher_comment: string;
  };
  reportColor?: ReportColor;
  classTeacherSignature?: string | null;
  headteacherSignature?: string | null;
  stampUrl?: string | null;
  stampConfig?: { positionX: number; positionY: number; size: number; opacity: number } | null;
  feesData?: { feesBalance: number; feesNextTerm: number; otherRequirements: string };
}

const stripTermPrefix = (name?: string | null) =>
  String(name || '').replace(/^\s*term\s*/i, '').trim();

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB');
};

/* ------------------------------------------------------------------ */
/* Drawing primitives (top-left origin, millimetres)                    */
/* ------------------------------------------------------------------ */

class Canvas {
  constructor(
    private page: PDFPage,
    public reg: PDFFont,
    public bold: PDFFont,
    public italic: PDFFont,
    public boldItalic: PDFFont,
  ) {}

  private Y(topMm: number) {
    return PAGE_H - topMm * MM;
  }

  rect(x: number, y: number, w: number, h: number, opts: { fill?: RGB; border?: RGB; lw?: number } = {}) {
    this.page.drawRectangle({
      x: x * MM,
      y: this.Y(y + h),
      width: w * MM,
      height: h * MM,
      color: opts.fill,
      borderColor: opts.border,
      borderWidth: opts.border ? (opts.lw ?? 0.4) : undefined,
    });
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB = LINE, lw = 0.4) {
    this.page.drawLine({
      start: { x: x1 * MM, y: this.Y(y1) },
      end: { x: x2 * MM, y: this.Y(y2) },
      color,
      thickness: lw,
    });
  }

  width(text: string, size: number, font: PDFFont) {
    return font.widthOfTextAtSize(text, size) / MM;
  }

  /** Draws text; baseline positioned at `y` (mm from top). */
  text(
    text: string,
    x: number,
    y: number,
    opts: { size?: number; font?: PDFFont; color?: RGB; align?: 'left' | 'center' | 'right'; maxWidth?: number } = {},
  ) {
    const size = opts.size ?? 8;
    const font = opts.font ?? this.reg;
    let str = String(text ?? '');
    let fs = size;
    if (opts.maxWidth) {
      while (fs > 4 && this.width(str, fs, font) > opts.maxWidth) fs -= 0.25;
      if (this.width(str, fs, font) > opts.maxWidth) {
        while (str.length > 1 && this.width(str + '…', fs, font) > opts.maxWidth) str = str.slice(0, -1);
        str += '…';
      }
    }
    const w = this.width(str, fs, font);
    let px = x;
    if (opts.align === 'center') px = x - w / 2;
    if (opts.align === 'right') px = x - w;
    this.page.drawText(str, {
      x: px * MM,
      y: this.Y(y),
      size: fs,
      font,
      color: opts.color ?? BLACK,
    });
    return fs;
  }

  /** Word-wrapped paragraph. Returns the number of lines drawn. */
  paragraph(text: string, x: number, y: number, maxWidth: number, size: number, lineH: number, font: PDFFont, color: RGB, maxLines = 3) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (this.width(test, size, font) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
      if (lines.length >= maxLines) break;
    }
    if (current && lines.length < maxLines) lines.push(current);
    lines.forEach((l, i) => this.text(l, x, y + i * lineH, { size, font, color, maxWidth }));
    return lines.length;
  }

  image(img: any, x: number, y: number, w: number, h: number, opacity = 1) {
    this.page.drawImage(img, { x: x * MM, y: this.Y(y + h), width: w * MM, height: h * MM, opacity, rotate: degrees(0) });
  }
}

const embedImage = async (doc: PDFDocument, dataUrl?: string | null) => {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return null;
  try {
    if (/^data:image\/(jpe?g)/i.test(dataUrl)) return await doc.embedJpg(dataUrl);
    return await doc.embedPng(dataUrl);
  } catch {
    try {
      return await doc.embedJpg(dataUrl);
    } catch {
      return null;
    }
  }
};

/* ------------------------------------------------------------------ */
/* Template                                                             */
/* ------------------------------------------------------------------ */

export const buildOLevelReportPdf = async (data: OLevelPdfData): Promise<Uint8Array> => {
  const {
    student, term, schoolInfo, marks, reportData,
    reportColor = 'white', classTeacherSignature, headteacherSignature,
    stampUrl, stampConfig, feesData,
  } = data;

  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const c = new Canvas(
    page,
    await doc.embedFont(StandardFonts.Helvetica),
    await doc.embedFont(StandardFonts.HelveticaBold),
    await doc.embedFont(StandardFonts.HelveticaOblique),
    await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  );

  const [br, bg, bb] = bgHex[reportColor] || bgHex.white;
  c.rect(0, 0, 210, 297, { fill: rgb(br, bg, bb) });

  const L = 8;          // content left
  const R = 202;        // content right
  const W = R - L;      // 194mm

  // Outer double border
  c.rect(5, 5, 200, 287, { border: NAVY, lw: 1.2 });
  c.rect(6.2, 6.2, 197.6, 284.6, { border: LINE, lw: 0.4 });

  let y = 10;

  /* ---------------- Header ---------------- */
  const logo = await embedImage(doc, (schoolInfo as any).logo_url);
  const photo = await embedImage(doc, (student as any).photo_url);

  const boxTop = y;
  const logoBox = 24;
  c.rect(L + 1, boxTop, logoBox, logoBox, { border: NAVY, lw: 0.6 });
  if (logo) c.image(logo, L + 2, boxTop + 1, logoBox - 2, logoBox - 2);

  const photoW = 22, photoH = 26;
  c.rect(R - photoW - 1, boxTop, photoW, photoH, { border: NAVY, lw: 0.6 });
  if (photo) c.image(photo, R - photoW, boxTop + 1, photoW - 2, photoH - 2);
  else c.text('PHOTO', R - photoW / 2 - 1, boxTop + photoH / 2, { size: 6.5, color: GREY, align: 'center' });

  const cx = (L + R) / 2;
  const centerW = W - (logoBox + photoW + 16);

  let hy = boxTop + 5.5;
  const nameSize = c.text(schoolInfo.school_name.toUpperCase(), cx, hy, {
    size: 16, font: c.bold, color: NAVY, align: 'center', maxWidth: centerW,
  });
  hy += nameSize > 12 ? 5 : 4.5;

  if (schoolInfo.motto) {
    c.text(`"${schoolInfo.motto}"`, cx, hy, { size: 8, font: c.italic, color: RED, align: 'center', maxWidth: centerW });
    hy += 4.5;
  }
  c.text(formatSchoolAddress(schoolInfo), cx, hy, { size: 8, color: BLACK, align: 'center', maxWidth: centerW });
  hy += 4;
  c.text(`TEL: ${schoolInfo.telephone || '—'}`, cx, hy, { size: 8, color: BLACK, align: 'center', maxWidth: centerW });
  hy += 4;
  const contact = schoolInfo.website
    ? `Email: ${schoolInfo.email || '—'}   |   Website: ${schoolInfo.website}`
    : `Email: ${schoolInfo.email || '—'}`;
  c.text(contact, cx, hy, { size: 7.5, color: BLUE, align: 'center', maxWidth: centerW });

  y = Math.max(hy + 3, boxTop + logoBox + 3, boxTop + photoH + 3);

  /* ---------------- Title ---------------- */
  const termLabel = stripTermPrefix(term.term_name).toUpperCase() || '1';
  c.rect(L, y, W, 9, { fill: NAVY });
  c.text(`TERM ${termLabel} REPORT CARD ${term.year}`, cx, y + 6.2, {
    size: 12.5, font: c.bold, color: WHITE, align: 'center', maxWidth: W - 6,
  });
  y += 12;

  /* ---------------- Student information ---------------- */
  const infoH = 19;
  c.rect(L, y, W, infoH, { border: NAVY, lw: 0.6 });
  const colX = [L + 3, L + W / 3 + 2, L + (2 * W) / 3 + 2];
  const colMax = W / 3 - 6;
  const rows: [string, string][][] = [
    [['NAME:', student.name?.toUpperCase() || ''], ['GENDER:', (student.gender || '').toUpperCase()], ['TERM:', `TERM ${termLabel}`]],
    [['CLASS:', student.classes?.class_name || ''], ['SECTION:', student.classes?.section || ''], ['YEAR:', String(term.year || '')]],
    [['HOUSE:', student.house || '—'], ['AGE:', student.age ? String(student.age) : '—'], ['STUDENT NO:', (student as any).student_number || '—']],
  ];
  rows.forEach((row, ri) => {
    const ry = y + 5.5 + ri * 5;
    row.forEach(([label, value], ci) => {
      const lw = c.width(label, 7.5, c.bold);
      c.text(label, colX[ci], ry, { size: 7.5, font: c.bold, color: BLACK });
      c.text(value, colX[ci] + lw + 1.5, ry, { size: 7.5, font: c.bold, color: BLUE, maxWidth: colMax - lw - 1.5 });
    });
  });
  c.line(L + W / 3, y, L + W / 3, y + infoH);
  c.line(L + (2 * W) / 3, y, L + (2 * W) / 3, y + infoH);
  y += infoH + 3;

  /* ---------------- Performance records ---------------- */
  c.rect(L, y, W, 6.5, { fill: NAVY });
  c.text('PERFORMANCE RECORDS', cx, y + 4.6, { size: 9.5, font: c.bold, color: WHITE, align: 'center' });
  y += 6.5;

  const headers = ['CODE', 'SUBJECT', 'A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'IDENT', 'GRADE', 'REMARK', 'TR'];
  const weights = [13, 40, 8, 8, 8, 9, 9, 9, 10, 10, 11, 30, 9];
  const totalW = weights.reduce((a, b) => a + b, 0);
  const cw = weights.map((w) => (w / totalW) * W);
  const cxs: number[] = [];
  weights.reduce((acc, _, i) => {
    cxs[i] = acc;
    return acc + cw[i];
  }, L);

  const headH = 6.5;
  const tableTop = y;
  c.rect(L, y, W, headH, { fill: LIGHT });
  headers.forEach((h, i) => {
    c.text(h, cxs[i] + cw[i] / 2, y + 4.4, { size: 6.6, font: c.bold, color: NAVY, align: 'center', maxWidth: cw[i] - 1 });
  });
  y += headH;

  // Vertical space budget for everything below the subject rows
  const BELOW = 6 /*avg*/ + 7 /*overall*/ + 12 /*scale*/ + 3 + 32 /*comments*/ + 3 + 17 /*key*/ + 3 + 12 /*footer*/ + 10 /*motto*/ + 8;
  const rowsCount = Math.max(marks.length, 8);
  let rowH = (297 - BELOW - y) / rowsCount;
  rowH = Math.max(4.2, Math.min(8.5, rowH));
  const rowFs = rowH < 5 ? 6.2 : rowH < 6.5 ? 7 : 7.6;

  const bodyTop = y;
  for (let i = 0; i < rowsCount; i++) {
    const m = marks[i];
    if (i % 2 === 1) c.rect(L, y, W, rowH, { fill: rgb(0.972, 0.98, 0.996) });
    const cells = m
      ? [
          m.subjects?.subject_code || (m as any).subject_code || '',
          m.subjects?.subject_name || '',
          m.a1_score?.toFixed(0) ?? '',
          m.a2_score?.toFixed(0) ?? '',
          m.a3_score?.toFixed(0) ?? '',
          m.average_score?.toFixed(1) ?? '',
          m.twenty_percent?.toFixed(1) ?? '',
          m.eighty_percent?.toFixed(1) ?? '',
          m.hundred_percent?.toFixed(0) ?? '',
          m.identifier?.toString() ?? '',
          m.final_grade || '',
          m.achievement_level || '',
          m.teacher_initials || '',
        ]
      : new Array(13).fill('');
    cells.forEach((val, ci) => {
      const isLeft = ci === 0 || ci === 1 || ci === 11;
      const font = ci === 10 ? c.bold : c.reg;
      const color = ci === 10 ? NAVY : BLACK;
      const baseline = y + rowH / 2 + rowFs * 0.12;
      if (isLeft) c.text(val, cxs[ci] + 1.2, baseline, { size: rowFs, font, color, maxWidth: cw[ci] - 2 });
      else c.text(val, cxs[ci] + cw[ci] / 2, baseline, { size: rowFs, font, color, align: 'center', maxWidth: cw[ci] - 1.5 });
    });
    y += rowH;
    if (i < rowsCount - 1) c.line(L, y, R, y);
  }

  // Table grid
  c.rect(L, tableTop, W, y - tableTop, { border: NAVY, lw: 0.6 });
  c.line(L, bodyTop, R, bodyTop, NAVY, 0.6);
  cxs.slice(1).forEach((x) => c.line(x, tableTop, x, y));

  /* ---------------- Average row ---------------- */
  const avgH = 6;
  c.rect(L, y, W, avgH, { fill: LIGHT, border: NAVY, lw: 0.6 });
  c.text('AVERAGE', cxs[1] + 1.2, y + 4.1, { size: 7.5, font: c.bold, color: NAVY });
  c.text((reportData.overall_average ?? 0).toFixed(1), cxs[5] + cw[5] / 2, y + 4.1, {
    size: 7.5, font: c.bold, color: NAVY, align: 'center',
  });
  c.text(reportData.overall_grade || '—', cxs[10] + cw[10] / 2, y + 4.1, {
    size: 7.5, font: c.bold, color: NAVY, align: 'center',
  });
  y += avgH + 0.5;

  /* ---------------- Overall summary ---------------- */
  const ovH = 7;
  c.rect(L, y, W, ovH, { border: NAVY, lw: 0.6 });
  const ovCells: [string, string][] = [
    ['OVERALL IDENTIFIER:', String(reportData.overall_identifier ?? '—')],
    ['OVERALL ACHIEVEMENT:', reportData.achievement_level || '—'],
    ['OVERALL GRADE:', reportData.overall_grade || '—'],
  ];
  ovCells.forEach(([label, value], i) => {
    const x = L + (W / 3) * i + 3;
    const lw = c.width(label, 7.5, c.bold);
    c.text(label, x, y + 4.7, { size: 7.5, font: c.bold, color: BLACK });
    c.text(value, x + lw + 2, y + 4.7, { size: 8.5, font: c.bold, color: BLUE, maxWidth: W / 3 - lw - 6 });
    if (i > 0) c.line(L + (W / 3) * i, y, L + (W / 3) * i, y + ovH, NAVY, 0.6);
  });
  y += ovH + 2;

  /* ---------------- Grade scale ---------------- */
  const gsRow = 5.6;
  const gsCol = W / 6;
  c.rect(L, y, W, gsRow * 2, { border: NAVY, lw: 0.6 });
  c.rect(L, y, gsCol, gsRow, { fill: LIGHT });
  c.rect(L, y + gsRow, gsCol, gsRow, { fill: LIGHT });
  c.text('GRADE', L + gsCol / 2, y + 3.9, { size: 7.2, font: c.bold, color: NAVY, align: 'center' });
  c.text('SCORE', L + gsCol / 2, y + gsRow + 3.9, { size: 7.2, font: c.bold, color: NAVY, align: 'center' });
  ['A', 'B', 'C', 'D', 'E'].forEach((g, i) => {
    c.text(g, L + gsCol * (i + 1) + gsCol / 2, y + 3.9, { size: 7.6, font: c.bold, color: BLACK, align: 'center' });
  });
  ['100 - 80', '79 - 70', '69 - 60', '59 - 40', '39 - 0'].forEach((s, i) => {
    c.text(s, L + gsCol * (i + 1) + gsCol / 2, y + gsRow + 3.9, { size: 7.2, color: BLACK, align: 'center' });
  });
  for (let i = 1; i < 6; i++) c.line(L + gsCol * i, y, L + gsCol * i, y + gsRow * 2, NAVY, 0.4);
  c.line(L, y + gsRow, R, y + gsRow, NAVY, 0.4);
  y += gsRow * 2 + 3;

  /* ---------------- Comments ---------------- */
  const cmtH = 32;
  const cmtW = (W - 3) / 2;
  const sigCT = await embedImage(doc, classTeacherSignature);
  const sigHT = await embedImage(doc, headteacherSignature);

  const drawComment = (x: number, title: string, body: string, sig: any) => {
    c.rect(x, y, cmtW, cmtH, { border: NAVY, lw: 0.6 });
    c.rect(x, y, cmtW, 5.5, { fill: LIGHT });
    c.text(title, x + 2, y + 3.9, { size: 7.4, font: c.bold, color: NAVY, maxWidth: cmtW - 4 });
    c.paragraph(body || 'No comment provided.', x + 2, y + 9.5, cmtW - 4, 7, 3.6, c.italic, BLACK, 4);
    c.text('Signature:', x + 2, y + cmtH - 3.5, { size: 7, font: c.bold, color: BLACK });
    if (sig) c.image(sig, x + 18, y + cmtH - 12, 26, 10);
    c.line(x + 17, y + cmtH - 3, x + cmtW - 2, y + cmtH - 3, GREY, 0.4);
  };
  drawComment(L, "CLASS TEACHER'S COMMENT", reportData.class_teacher_comment, sigCT);
  drawComment(L + cmtW + 3, "HEADTEACHER'S COMMENT", reportData.headteacher_comment, sigHT);
  y += cmtH + 3;

  /* ---------------- Key to identifier ---------------- */
  const keyH = 17;
  c.rect(L, y, W, keyH, { border: NAVY, lw: 0.6 });
  c.rect(L, y, W, 5.5, { fill: LIGHT });
  c.text('KEY TO IDENTIFIER', cx, y + 3.9, { size: 7.6, font: c.bold, color: NAVY, align: 'center' });
  const keys: [string, string, string][] = [
    ['1 - BASIC', '0.9 - 1.49', 'Few LOs achieved, not sufficient for overall achievement'],
    ['2 - MODERATE', '1.5 - 2.49', 'Many LOs achieved, enough for overall achievement'],
    ['3 - OUTSTANDING', '2.5 - 3.0', 'Most or all LOs achieved for overall achievement'],
  ];
  keys.forEach(([label, range, desc], i) => {
    const x = L + (W / 3) * i + 2.5;
    if (i > 0) c.line(L + (W / 3) * i, y + 5.5, L + (W / 3) * i, y + keyH, LINE, 0.4);
    c.text(`${label}  (${range})`, x, y + 9.5, { size: 6.6, font: c.bold, color: NAVY, maxWidth: W / 3 - 5 });
    c.paragraph(desc, x, y + 13, W / 3 - 5, 6, 3, c.reg, BLACK, 2);
  });
  y += keyH + 3;

  /* ---------------- Footer ---------------- */
  const ftH = 12;
  const nextTermDate = new Date(new Date(term.end_date).getTime() + 30 * 86400000).toISOString();
  const ftCells: [string, string][] = [
    ['TERM ENDED ON', fmtDate(term.end_date)],
    ['NEXT TERM BEGINS', fmtDate(nextTermDate)],
    ['FEES BALANCE', feesData ? `UGX ${Number(feesData.feesBalance || 0).toLocaleString()}` : '—'],
    ['OTHER REQUIREMENTS', feesData?.otherRequirements || '—'],
  ];
  c.rect(L, y, W, ftH, { border: NAVY, lw: 0.6 });
  const ftW = W / ftCells.length;
  ftCells.forEach(([label, value], i) => {
    const x = L + ftW * i;
    if (i > 0) c.line(x, y, x, y + ftH, NAVY, 0.4);
    c.text(label, x + ftW / 2, y + 4.8, { size: 6.8, font: c.bold, color: NAVY, align: 'center', maxWidth: ftW - 3 });
    c.text(value, x + ftW / 2, y + 9.2, { size: 7.4, font: c.bold, color: BLACK, align: 'center', maxWidth: ftW - 3 });
  });
  y += ftH + 2;

  /* ---------------- Motto bar ---------------- */
  c.rect(L, y, W, 7.5, { fill: NAVY });
  c.text(schoolInfo.motto || 'Work hard to excel', cx, y + 5, {
    size: 8.5, font: c.boldItalic, color: WHITE, align: 'center', maxWidth: W - 6,
  });

  /* ---------------- Stamp overlay ---------------- */
  if (stampUrl && stampConfig) {
    const stamp = await embedImage(doc, stampUrl);
    if (stamp) {
      const sizeMm = (Number(stampConfig.size) || 60) * 0.35;
      const px = ((Number(stampConfig.positionX) || 75) / 100) * 210;
      const py = ((Number(stampConfig.positionY) || 80) / 100) * 297;
      const opacity = Math.max(0, Math.min(100, Number(stampConfig.opacity) || 70)) / 100;
      c.image(stamp, px - sizeMm / 2, py - sizeMm / 2, sizeMm, sizeMm, opacity);
    }
  }

  return await doc.save();
};

export const buildOLevelReportBlob = async (data: OLevelPdfData): Promise<Blob> => {
  const bytes = await buildOLevelReportPdf(data);
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
};
