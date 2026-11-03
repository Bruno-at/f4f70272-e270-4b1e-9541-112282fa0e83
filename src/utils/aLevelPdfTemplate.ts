import jsPDF from 'jspdf';
import { Student, Term, SchoolInfo, StudentMark } from '@/types/database';
import { ReportColor, reportColorHex } from './pdfTemplates';
import { getDisplaySubjectName, getSubjectShortCode } from './subjectCode';
import { formatSchoolAddress } from './schoolAddress';
import {
  aLevelReportTitle, deriveCombination, DEFAULT_GRADE_BANDS, GradeBand, gradeBandRange,
} from './aLevelReportData';

type RGB = [number, number, number];

const hexToRgb = (hex: string): RGB => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [255, 255, 255];
};

export type ALevelTemplateStyle = 'classic' | 'modern' | 'professional' | 'minimal' | 'standard';

export interface ALevelTemplateData {
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
  classTeacherName?: string | null;
  headteacherName?: string | null;
  feesData?: { feesBalance: number; feesNextTerm: number; otherRequirements: string };
  template?: ALevelTemplateStyle;
  /** School grading bands (highest first). Defaults to the system fallback scale. */
  gradeBands?: GradeBand[];
  /** Start date of the next recorded term. */
  nextTermBegins?: string | null;
}

const NAVY: RGB = [14, 38, 99];
const BLUE: RGB = [28, 64, 160];
const INK: RGB = [20, 20, 20];
const LINE: RGB = [40, 40, 40];
const HEAD_FILL: RGB = [222, 224, 228];
const WHITE: RGB = [255, 255, 255];

const imgFormat = (url: string) => {
  const m = url.match(/^data:image\/([a-z0-9+.-]+);/i)?.[1]?.toLowerCase();
  return m === 'jpg' || m === 'jpeg' ? 'JPEG' : m === 'webp' ? 'WEBP' : 'PNG';
};

/**
 * Default A-Level (S5–S6) report card. Every value comes from the school,
 * student, marks, comments, fees and term records passed in — nothing is sample data.
 */
export const generateALevelTemplate = (data: ALevelTemplateData): jsPDF => {
  const {
    student, term, schoolInfo, marks, reportData, reportColor = 'white',
    classTeacherSignature, headteacherSignature, feesData,
  } = data;
  const bands = (data.gradeBands && data.gradeBands.length ? data.gradeBands : DEFAULT_GRADE_BANDS).slice(0, 9);

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();  // 210
  const pageH = pdf.internal.pageSize.getHeight(); // 297

  const bg = hexToRgb(reportColorHex[reportColor] || '#FFFFFF');
  pdf.setFillColor(...bg);
  pdf.rect(0, 0, pageW, pageH, 'F');

  const M = 8;
  const W = pageW - M * 2;
  const right = M + W;

  const font = (style: 'normal' | 'bold' | 'italic' | 'bolditalic', size: number, color: RGB = INK) => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
  };
  /** Draw text shrunk (then trimmed) to fit maxW. */
  const fit = (text: string, x: number, y: number, maxW: number, align: 'left' | 'center' | 'right' = 'left', min = 4.5) => {
    let s = String(text ?? '');
    if (!s) return;
    let size = pdf.getFontSize();
    while (size > min && pdf.getTextWidth(s) > maxW) { size -= 0.25; pdf.setFontSize(size); }
    while (s.length > 1 && pdf.getTextWidth(s) > maxW) s = s.slice(0, -1);
    pdf.text(s, x, y, { align });
  };
  const box = (x: number, y: number, w: number, h: number, fill?: RGB, stroke: RGB = LINE, lw = 0.25) => {
    pdf.setLineWidth(lw);
    pdf.setDrawColor(...stroke);
    if (fill) { pdf.setFillColor(...fill); pdf.rect(x, y, w, h, 'FD'); } else pdf.rect(x, y, w, h);
  };
  const vline = (x: number, y1: number, y2: number) => { pdf.setDrawColor(...LINE); pdf.setLineWidth(0.25); pdf.line(x, y1, x, y2); };
  const bar = (label: string, y: number, h = 6.5) => {
    pdf.setFillColor(...NAVY);
    pdf.rect(M, y, W, h, 'F');
    font('bold', 11, WHITE);
    pdf.text(label, pageW / 2, y + h / 2 + 1.4, { align: 'center' });
  };
  const addImg = (url: string | null | undefined, x: number, y: number, w: number, h: number) => {
    if (!url || !url.startsWith('data:image')) return false;
    try { pdf.addImage(url, imgFormat(url), x, y, w, h); return true; } catch { return false; }
  };

  // ============ PAGE FRAME ============
  pdf.setDrawColor(...BLUE);
  pdf.setLineWidth(0.5);
  pdf.rect(4.5, 4.5, pageW - 9, pageH - 9);

  // ============ HEADER ============
  let y = 8;
  const logoS = 27;
  addImg(schoolInfo.logo_url, M + 1, y, logoS, logoS);

  const photoW = 25, photoH = 29;
  const photoX = right - photoW - 1;
  if (!addImg(student.photo_url, photoX, y, photoW, photoH)) {
    font('normal', 6, [140, 140, 140]);
    pdf.text('PHOTO', photoX + photoW / 2, y + photoH / 2, { align: 'center' });
  }
  pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.35);
  pdf.rect(photoX, y, photoW, photoH);

  const centerL = M + logoS + 4;
  const centerR = photoX - 3;
  const cx = (centerL + centerR) / 2;
  const centerW = centerR - centerL;

  // School name (wraps to two lines when long)
  font('bold', 21, NAVY);
  const name = (schoolInfo.school_name || '').toUpperCase();
  let nameLines: string[] = [name];
  if (pdf.getTextWidth(name) > centerW) {
    pdf.setFontSize(16);
    nameLines = pdf.splitTextToSize(name, centerW).slice(0, 2);
    if (nameLines.length > 1) pdf.setFontSize(14.5);
  }
  const nameSize = pdf.getFontSize();
  let hy = y + (nameLines.length > 1 ? 6 : 8);
  nameLines.forEach((ln) => { fit(ln, cx, hy, centerW, 'center', 10); pdf.setFontSize(nameSize); hy += nameSize * 0.42; });
  hy += 0.8;

  const address = formatSchoolAddress(schoolInfo);
  const contactLines = [
    address,
    schoolInfo.email ? `EMAIL: ${schoolInfo.email}` : '',
    [schoolInfo.telephone ? `TEL: ${schoolInfo.telephone}` : '', schoolInfo.website ? `WEBSITE: ${schoolInfo.website}` : ''].filter(Boolean).join('   '),
  ].filter(Boolean);
  const cSize = nameLines.length > 1 ? 9 : 10.5;
  contactLines.forEach((ln) => {
    font('bold', cSize, [30, 40, 70]);
    fit(ln, cx, hy, centerW, 'center', 6);
    hy += cSize * 0.42;
  });

  y = Math.max(y + photoH, hy - 2) + 2.5;
  pdf.setDrawColor(...NAVY);
  pdf.setLineWidth(0.9); pdf.line(M, y, right, y);
  pdf.setLineWidth(0.3); pdf.line(M, y + 1.3, right, y + 1.3);
  y += 8;

  // ============ TITLE ============
  font('bold', 15, NAVY);
  fit(aLevelReportTitle(term.term_name, term.year), pageW / 2, y, W, 'center', 10);
  y += 3.5;

  // ============ STUDENT INFO ============
  const cls = student.classes;
  const className = [cls?.class_name, cls?.section].filter(Boolean).join(' ');
  const stream = cls?.section || '';
  const combination = (student as any).combination || deriveCombination(marks);
  const termLabel = (term.term_name || '').toUpperCase().startsWith('TERM') ? (term.term_name || '').toUpperCase() : `TERM ${(term.term_name || '').toUpperCase()}`;

  const infoH = 21;
  box(M, y, W, infoH, undefined, NAVY, 0.35);
  const cols3 = [
    { lx: M + 3, vx: M + 22, end: M + 70 },
    { lx: M + 72, vx: M + 93, end: M + 124 },
    { lx: M + 126, vx: M + 154, end: right - 2 },
  ];
  const infoRows: [number, string, string][][] = [
    [[0, 'NAME:', student.name || ''], [2, 'GENDER:', student.gender || '']],
    [[0, 'AGE:', student.age != null ? String(student.age) : ''], [1, 'ROLL NO:', student.student_id || ''], [2, 'TERM:', termLabel]],
    [[0, 'CLASS:', className], [1, 'STREAM:', stream], [2, 'COMBINATION:', combination]],
  ];
  infoRows.forEach((row, ri) => {
    const ry = y + 5.6 + ri * 6.4;
    row.forEach(([ci, label, value]) => {
      const c = cols3[ci];
      font('bold', 9, INK);
      pdf.text(label, c.lx, ry);
      // NAME spans into the middle column
      const end = ci === 0 && ri === 0 ? cols3[1].end : c.end;
      fit(String(value).toUpperCase(), c.vx, ry, end - c.vx);
    });
  });
  y += infoH + 2.5;

  // ============ TERM PERFORMANCE RECORDS ============
  bar('TERM PERFORMANCE RECORDS', y);
  y += 7.5;

  const colDefs = [
    { k: 'code', l: 'Code', w: 15 }, { k: 'subject', l: 'Subject', w: 32 }, { k: 'r', l: 'R', w: 10 },
    { k: 'a1', l: 'A1', w: 10 }, { k: 'a2', l: 'A2', w: 10 }, { k: 'a3', l: 'A3', w: 10 },
    { k: 'avg', l: 'AVG', w: 10.5 }, { k: 'p20', l: '20%', w: 11 },
    { k: 'eot', l: 'EQT', w: 12 }, { k: 'p80', l: '80%', w: 12 }, { k: 'p100', l: '100%', w: 14 },
    { k: 'grade', l: 'GRADE', w: 13 }, { k: 'comment', l: 'COMMENT', w: 23 }, { k: 'tr', l: 'TR', w: 9 },
  ];
  const scale = W / colDefs.reduce((s, c) => s + c.w, 0);
  const cw = colDefs.map((c) => c.w * scale);
  const xs: number[] = []; { let x = M; cw.forEach((w) => { xs.push(x); x += w; }); }
  const ci = (k: string) => colDefs.findIndex((c) => c.k === k);
  const mid = (k: string) => xs[ci(k)] + cw[ci(k)] / 2;

  // Header
  const h1 = 5.5, h2 = 5.5, hTop = y;
  box(M, y, W, h1 + h2, HEAD_FILL);
  const fStart = xs[ci('a1')], fEnd = xs[ci('p20')] + cw[ci('p20')];
  const sStart = xs[ci('eot')], sEnd = xs[ci('p100')] + cw[ci('p100')];
  pdf.setDrawColor(...LINE); pdf.setLineWidth(0.25);
  pdf.line(fStart, y + h1, sEnd, y + h1);
  font('bold', 8.5, INK);
  pdf.text('FORMATIVE', (fStart + fEnd) / 2, y + 3.9, { align: 'center' });
  pdf.text('SUMMATIVE', (sStart + sEnd) / 2, y + 3.9, { align: 'center' });
  colDefs.forEach((c, i) => {
    if (i > 0) {
      const spanned = (i > ci('a1') && i <= ci('p20')) || (i > ci('eot') && i <= ci('p100'));
      vline(xs[i], spanned ? y + h1 : y, y + h1 + h2);
    }
    const grouped = i >= ci('a1') && i <= ci('p100');
    font('bold', grouped ? 8 : 8.5, INK);
    fit(c.l, xs[i] + cw[i] / 2, grouped ? y + h1 + 3.9 : y + (h1 + h2) / 2 + 1.3, cw[i] - 1, 'center');
  });
  y += h1 + h2;

  // Exact space used below the marks table (mm) — the table stretches to fill the rest,
  // so the card always reaches the bottom of the A4 page with no empty gap.
  const hasMotto = !!(schoolInfo.motto || '').trim();
  const BELOW = 6.5 + 8 + 13 + 20.5 + 7.5 + 15 + 22.5 + (hasMotto ? 16 + 3 : 11);
  const bottomLimit = pageH - 8; // just inside the page frame
  const available = bottomLimit - BELOW - y;
  const PREF_BLOCK = 11; // comfortable height for one subject (two paper rows)
  const subjectCount = Math.max(marks.length, Math.floor(available / PREF_BLOCK), 1);
  const rowH = Math.max(3.2, available / (subjectCount * 2));

  const fmt = (v: any, d = 1) => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? '' : Number(v).toFixed(d);
  for (let s = 0; s < subjectCount; s++) {
    const m = marks[s];
    const top = y, blockH = rowH * 2, blockMid = top + blockH / 2 + 1.3;
    box(M, top, W, blockH);
    // split R..p100 into two paper rows
    pdf.setDrawColor(...LINE); pdf.setLineWidth(0.2);
    pdf.line(xs[ci('r')], top + rowH, sEnd, top + rowH);
    colDefs.forEach((_, i) => { if (i > 0) vline(xs[i], top, top + blockH); });
    font('bold', 8.5, INK);
    pdf.text('1', mid('r'), top + rowH / 2 + 1.2, { align: 'center' });
    pdf.text('2', mid('r'), top + rowH + rowH / 2 + 1.2, { align: 'center' });

    if (m) {
      const subjName = m.subjects?.subject_name || '';
      const subjCode = m.subject_code || (m.subjects as any)?.subject_code || '';
      font('bold', 8, INK);
      fit(subjCode || getSubjectShortCode(subjName), mid('code'), blockMid, cw[ci('code')] - 1.2, 'center');
      font('bold', 8.5, NAVY);
      fit(getDisplaySubjectName(subjName, subjCode, { maxChars: 16 }).toUpperCase(), mid('subject'), blockMid, cw[ci('subject')] - 1.5, 'center');

      const r1 = top + rowH / 2 + 1.2;
      const eot = m.eighty_percent != null && !isNaN(Number(m.eighty_percent)) ? String(Math.round(Number(m.eighty_percent) / 0.8)) : '';
      const vals: [string, string][] = [
        ['a1', fmt(m.a1_score)], ['a2', fmt(m.a2_score)], ['a3', fmt(m.a3_score)], ['avg', fmt(m.average_score)],
        ['p20', fmt(m.twenty_percent)], ['eot', eot], ['p80', fmt(m.eighty_percent)], ['p100', fmt(m.hundred_percent)],
      ];
      font('bold', 8.3, INK);
      vals.forEach(([k, v]) => { pdf.setFontSize(8.3); fit(v, mid(k), r1, cw[ci(k)] - 1, 'center'); });
      font('bold', 9, NAVY);
      fit(m.final_grade || '', mid('grade'), blockMid, cw[ci('grade')] - 1, 'center');
      font('bold', 8, INK);
      fit(m.achievement_level || '', mid('comment'), blockMid, cw[ci('comment')] - 1.2, 'center');
      font('bold', 7.5, INK);
      fit(m.teacher_initials || '', mid('tr'), blockMid, cw[ci('tr')] - 0.8, 'center');
    }
    y += blockH;
  }
  box(M, hTop, W, y - hTop, undefined, LINE, 0.35);

  // AVERAGE SCORES
  const avgH = 6;
  const avgOf = (k: keyof StudentMark) => {
    const v = marks.map((m) => m[k]).filter((n) => n !== null && n !== undefined && (n as any) !== '' && !isNaN(Number(n))).map(Number);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  box(M, y, W, avgH);
  [ci('r'), ci('a1'), ci('a2'), ci('a3'), ci('avg'), ci('p20'), ci('eot'), ci('p80'), ci('p100'), ci('grade'), ci('comment'), ci('tr')]
    .forEach((i) => vline(xs[i], y, y + avgH));
  font('bold', 8.5, INK);
  pdf.text('AVERAGE SCORES', (M + xs[ci('r')]) / 2, y + 4.2, { align: 'center' });
  const a20 = avgOf('twenty_percent'), a80 = avgOf('eighty_percent'), a100 = avgOf('hundred_percent');
  pdf.setFontSize(8.3);
  if (a20 != null) fit(a20.toFixed(2), mid('p20'), y + 4.2, cw[ci('p20')] - 1, 'center');
  if (a80 != null) fit(a80.toFixed(2), mid('p80'), y + 4.2, cw[ci('p80')] - 1, 'center');
  if (a100 != null) fit(a100.toFixed(2), mid('p100'), y + 4.2, cw[ci('p100')] - 1, 'center');
  font('bold', 9, NAVY);
  fit(reportData.overall_grade || '', mid('grade'), y + 4.2, cw[ci('grade')] - 1, 'center');
  font('bold', 8, INK);
  fit(reportData.achievement_level || '', mid('comment'), y + 4.2, cw[ci('comment')] - 1.2, 'center');
  y += avgH + 0.5;

  // Overall row
  const oH = 6;
  const oCells: [string, string, number][] = [
    ['Overall Identifier', '', 0.21], [reportData.overall_identifier ? String(reportData.overall_identifier) : '', 'v', 0.09],
    ['Overall Achievement', '', 0.19], [reportData.achievement_level || '', 'v', 0.18],
    ['Overall grade', '', 0.16], [reportData.overall_grade || '', 'v', 0.17],
  ];
  box(M, y, W, oH);
  let ox = M;
  oCells.forEach(([t], i) => {
    const w = W * oCells[i][2];
    if (i > 0) vline(ox, y, y + oH);
    font('bold', 9, oCells[i][1] ? NAVY : INK);
    fit(t, ox + w / 2, y + 4.2, w - 1.5, 'center');
    ox += w;
  });
  y += oH + 2;

  // ============ GRADE SCALE ============
  const gH = 5.5;
  const labelW = W * 0.185;
  const gW = (W - labelW) / bands.length;
  [['GRADE', (b: GradeBand) => b.grade], ['SCORES', gradeBandRange]].forEach(([label, get], r) => {
    const ry = y + r * gH;
    box(M, ry, W, gH);
    vline(M + labelW, ry, ry + gH);
    font('bold', 8.5, INK);
    pdf.text(label as string, M + labelW / 2, ry + 3.9, { align: 'center' });
    bands.forEach((b, i) => {
      if (i > 0) vline(M + labelW + gW * i, ry, ry + gH);
      font('bold', 8.5, INK);
      fit((get as (b: GradeBand) => string)(b), M + labelW + gW * i + gW / 2, ry + 3.9, gW - 1, 'center');
    });
  });
  y += gH * 2 + 2;

  // ============ KEY TO TERMS ============
  const kH = 18;
  box(M, y, W, kH, undefined, NAVY, 0.35);
  const kSplit = M + W * 0.335;
  pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.3); pdf.line(kSplit, y, kSplit, y + kH);
  font('bold', 8.5, INK);
  pdf.text('Key to Terms Used:', M + 3, y + 4);
  const ids = [
    ['1 - Basic', '0.9 - 1.49', 'Few LOs achieved, but not sufficient for overall achievement'],
    ['2 - Moderate', '1.5 - 2.49', 'Many LOs achieved, enough for overall achievement'],
    ['3 - Outstanding', '2.5 - 3.0', 'Most or all LOs achieved for overall achievement'],
  ];
  ids.forEach(([l, r], i) => {
    const ky = y + 8.3 + i * 3.8;
    font('bold', 8.3, INK); pdf.text(l, M + 3, ky);
    font('normal', 8.3, INK); pdf.text(r, M + 38, ky);
  });
  font('bold', 8.3, INK); pdf.text('A1', kSplit + 5, y + 4);
  font('normal', 8.3, INK); pdf.text('End of Chapter Assessment', kSplit + 16, y + 4);
  font('bold', 8.3, INK); pdf.text('80%', kSplit + 62, y + 4);
  font('normal', 8.3, INK); pdf.text('End of term assessment', kSplit + 71, y + 4);
  ids.forEach(([, , d], i) => { font('normal', 8, INK); fit(d, kSplit + 16, y + 8.3 + i * 3.8, right - kSplit - 18); });
  y += kH + 2.5;

  // ============ STUDENT'S PROJECTS WORK ============
  bar("STUDENT'S PROJECTS WORK", y);
  y += 7.5;
  const pCols = [
    ['TERMLY', 'PROJECT WORK', 0.175], ['AVERAGE', 'SCORE(%)', 0.168], ['OUT', 'OF 100', 0.135],
    ['GRADE', '', 0.11], ['REMARKS', '', 0.207], ['TEACHER', '', 0.205],
  ] as const;
  const pHH = 9, pRH = 6;
  box(M, y, W, pHH, HEAD_FILL);
  box(M, y + pHH, W, pRH);
  let px = M;
  pCols.forEach(([a, b, f], i) => {
    const w = W * f;
    if (i > 0) vline(px, y, y + pHH + pRH);
    font('bold', 7.8, INK);
    if (b) { pdf.text(a, px + w / 2, y + 3.8, { align: 'center' }); pdf.text(b, px + w / 2, y + 7.2, { align: 'center' }); }
    else pdf.text(a, px + w / 2, y + 5.5, { align: 'center' });
    px += w;
  });
  y += pHH + pRH;

  // ============ COMMENTS ============
  const cH = 10;
  const labW = W * 0.185;
  const sigW = 34;
  const commentRow = (l1: string, comment: string, sig: string | null | undefined, who: string | null | undefined) => {
    box(M, y, W, cH);
    vline(M + labW, y, y + cH);
    font('bold', 8.3, INK);
    pdf.text(l1, M + labW / 2, y + 4.2, { align: 'center' });
    pdf.text('Comment:', M + labW / 2, y + 7.8, { align: 'center' });
    const textW = W - labW - sigW - 6;
    font('italic', 9.5, BLUE);
    let lines: string[] = pdf.splitTextToSize(comment || '', textW);
    if (lines.length > 2) { pdf.setFontSize(8); lines = pdf.splitTextToSize(comment || '', textW).slice(0, 2); }
    pdf.text(lines, M + labW + 3, y + (lines.length > 1 ? 4.3 : 6.2));
    const sx = right - sigW - 2;
    addImg(sig, sx, y + 0.6, sigW, cH - (who ? 4 : 1.2));
    if (who) { font('bold', 6.5, INK); fit(`Name: ${who}`, sx + sigW / 2, y + cH - 1.1, sigW + 2, 'center'); }
    y += cH;
  };
  commentRow("Class teacher's", reportData.class_teacher_comment, classTeacherSignature, data.classTeacherName);
  commentRow("Headteacher's", reportData.headteacher_comment, headteacherSignature, data.headteacherName);
  y += 2.5;

  // ============ FOOTER ============
  const fH = 11;
  const fW = W / 4;
  box(M, y, W, fH, undefined, NAVY, 0.35);
  const fmtDate = (d?: string | null) => {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const money = (n?: number) => (feesData ? `Ugx ${Number(n || 0).toLocaleString()}/=` : '');
  const feet: [string, string][] = [
    [fmtDate(term.end_date), 'TERM ENDED ON'],
    [fmtDate(data.nextTermBegins), 'NEXT TERM BEGINS'],
    [money(feesData?.feesBalance), 'FEES BALANCE'],
    [money(feesData?.feesNextTerm), 'FEES NEXT TERM'],
  ];
  feet.forEach(([v, l], i) => {
    const fx = M + fW * i;
    if (i > 0) { pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.3); pdf.line(fx, y, fx, y + fH); }
    font('bold', 9, INK); fit(v, fx + fW / 2, y + 4.6, fW - 2, 'center');
    font('bold', 8.5, INK); fit(l, fx + fW / 2, y + 9, fW - 2, 'center');
  });
  y += fH + 5;

  // ============ MOTTO ============
  const motto = (schoolInfo.motto || '').toUpperCase();
  if (motto) {
    font('bolditalic', 15, NAVY);
    fit(motto, pageW / 2, y + 2, W * 0.6, 'center', 8);
    const tw = Math.min(pdf.getTextWidth(motto), W * 0.6);
    const l1 = pageW / 2 - tw / 2 - 4, r1 = pageW / 2 + tw / 2 + 4;
    pdf.setDrawColor(...BLUE);
    [[-0.7, 0.8], [0.7, 0.4]].forEach(([dy, lw]) => {
      pdf.setLineWidth(lw);
      pdf.line(M + 2, y + dy, l1, y + dy);
      pdf.line(r1, y + dy, right - 2, y + dy);
    });
  }

  return pdf;
};
