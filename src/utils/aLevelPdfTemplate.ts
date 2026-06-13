import jsPDF from 'jspdf';
import { Student, Term, SchoolInfo, StudentMark } from '@/types/database';
import { ReportColor, reportColorHex } from './pdfTemplates';
import { getDisplaySubjectName } from './subjectCode';

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 255, g: 255, b: 255 };
};

export type ALevelTemplateStyle = 'classic' | 'modern' | 'professional' | 'minimal' | 'standard';

interface ALevelTemplateData {
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
  feesData?: { feesBalance: number; feesNextTerm: number; otherRequirements: string };
  template?: ALevelTemplateStyle;
}

// Dedicated A-Level Report Card Template
// Used exclusively for S5/S6 students. Matches the official A-Level layout.
export const generateALevelTemplate = (data: ALevelTemplateData): jsPDF => {
  const {
    student, term, schoolInfo, marks, reportData, reportColor = 'white',
    classTeacherSignature, headteacherSignature, feesData,
  } = data;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();   // 210
  const pageH = pdf.internal.pageSize.getHeight();  // 297

  // Color palette - matches reference image
  const NAVY = { r: 0, g: 32, b: 96 };
  const RED = { r: 0, g: 0, b: 0 }; // borders now black per design requirement
  const RED_TEXT = { r: 200, g: 30, b: 30 }; // kept for accent text labels
  const VAL_BLUE = { r: 30, g: 80, b: 170 };
  const RED_VAL = { r: 200, g: 30, b: 30 };
  const GREEN_VAL = { r: 0, g: 120, b: 0 };
  const BLACK = { r: 0, g: 0, b: 0 };
  const LIGHT_BORDER = { r: 220, g: 120, b: 120 };

  // Background
  const bg = hexToRgb(reportColorHex[reportColor]);
  pdf.setFillColor(bg.r, bg.g, bg.b);
  pdf.rect(0, 0, pageW, pageH, 'F');

  const M = 6; // page margin
  const contentW = pageW - M * 2;
  let y = M;

  // ============ HEADER ============
  const logoSize = 24;
  // Logo box
  pdf.setDrawColor(RED.r, RED.g, RED.b);
  pdf.setLineWidth(0.4);
  pdf.rect(M, y, logoSize, logoSize);
  if (schoolInfo.logo_url && schoolInfo.logo_url.startsWith('data:image')) {
    try { pdf.addImage(schoolInfo.logo_url, 'PNG', M + 0.5, y + 0.5, logoSize - 1, logoSize - 1); } catch {}
  }

  // Photo box (right)
  const photoW = 26, photoH = 28;
  const photoX = pageW - M - photoW;
  pdf.setDrawColor(RED.r, RED.g, RED.b);
  pdf.rect(photoX, y, photoW, photoH);
  if (student.photo_url && student.photo_url.startsWith('data:image')) {
    try { pdf.addImage(student.photo_url, 'PNG', photoX + 0.5, y + 0.5, photoW - 1, photoH - 1); } catch {}
  }

  // School name centered
  pdf.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.text((schoolInfo.school_name || '').toUpperCase(), pageW / 2, y + 6, { align: 'center' });

  // School contact info centered
  pdf.setTextColor(BLACK.r, BLACK.g, BLACK.b);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  const poBox = schoolInfo.po_box ? `P.O BOX ${schoolInfo.po_box}` : '';
  const loc = schoolInfo.location || '';
  pdf.text(`${poBox}${poBox && loc ? ', ' : ''}${loc}`, pageW / 2, y + 11.5, { align: 'center' });
  if (schoolInfo.email) {
    pdf.text(`EMAIL: ${schoolInfo.email}`, pageW / 2, y + 15.5, { align: 'center' });
  }
  if (schoolInfo.telephone) {
    pdf.text(`CONTACTS: ${schoolInfo.telephone}`, pageW / 2, y + 19.5, { align: 'center' });
  }

  y += 26;

  // Double red separator line
  pdf.setDrawColor(RED.r, RED.g, RED.b);
  pdf.setLineWidth(0.6);
  pdf.line(M, y, pageW - M, y);
  pdf.setLineWidth(0.3);
  pdf.line(M, y + 1.2, pageW - M, y + 1.2);
  y += 5;

  // ============ TITLE ============
  pdf.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(
    `A LEVEL END OF TERM ${(term.term_name || '').toUpperCase()} REPORT CARD ${term.year}`,
    pageW / 2, y + 5, { align: 'center' }
  );
  y += 8;

  // ============ STUDENT INFO TABLE ============
  pdf.setDrawColor(RED.r, RED.g, RED.b);
  pdf.setLineWidth(0.3);

  const className = student.classes?.class_name || '';
  const section = student.classes?.section || '';
  const combination = (student as any).combination
    || (marks.length > 0 ? marks.slice(0, 3).map(m => (m.subjects?.subject_name || '').substring(0, 3).toUpperCase()).filter(Boolean).join('/') : '');

  const infoRowH = 6;
  const drawInfoRow = (cells: { label: string; value: string; w: number }[]) => {
    let x = M;
    pdf.rect(M, y, contentW, infoRowH);
    cells.forEach((c, i) => {
      if (i > 0) pdf.line(x, y, x, y + infoRowH);
      // label
      pdf.setTextColor(RED_TEXT.r, RED_TEXT.g, RED_TEXT.b);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(c.label, x + 1.5, y + 4);
      // value
      pdf.setTextColor(VAL_BLUE.r, VAL_BLUE.g, VAL_BLUE.b);
      pdf.setFont('helvetica', 'bold');
      pdf.text(c.value, x + 1.5 + pdf.getTextWidth(c.label) + 3, y + 4);
      x += c.w;
    });
    y += infoRowH;
  };

  drawInfoRow([
    { label: 'NAME:', value: student.name.toUpperCase(), w: contentW * 0.6 },
    { label: 'GENDER:', value: (student.gender || '').toUpperCase(), w: contentW * 0.4 },
  ]);
  drawInfoRow([
    { label: 'AGE:', value: student.age?.toString() || '', w: contentW * 0.3 },
    { label: 'Roll No', value: student.student_id || '', w: contentW * 0.35 },
    { label: 'TERM:', value: (term.term_name || '').toUpperCase(), w: contentW * 0.35 },
  ]);
  drawInfoRow([
    { label: 'CLASS:', value: `${className}${section ? ' ' + section : ''}`, w: contentW * 0.3 },
    { label: 'Stream:', value: section || className, w: contentW * 0.35 },
    { label: 'Combination:', value: combination, w: contentW * 0.35 },
  ]);

  y += 1;

  // ============ TERM PERFORMANCE RECORDS title ============
  pdf.setTextColor(RED_TEXT.r, RED_TEXT.g, RED_TEXT.b);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('TERM PERFORMANCE RECORDS', pageW / 2, y + 4, { align: 'center' });
  y += 6;

  // ============ MARKS TABLE ============
  // Column layout (mm)
  const cols = [
    { key: 'code',    label: 'Code',    w: 14 },
    { key: 'subject', label: 'Subject', w: 44 },
    { key: 'paper',   label: 'P\nA\nP\nE\nR', w: 7 },
    { key: 'a1',      label: 'A1',      w: 10 },
    { key: 'a2',      label: 'A2',      w: 10 },
    { key: 'a3',      label: 'A3',      w: 10 },
    { key: 'avg',     label: 'AVG',     w: 10 },
    { key: 'p20',     label: '20%',     w: 10 },
    { key: 'eot',     label: 'EOT',     w: 10 },
    { key: 'p80',     label: '80%',     w: 10 },
    { key: 'p100',    label: '100%',    w: 11 },
    { key: 'grade',   label: 'GRADE',   w: 14 },
    { key: 'comment', label: 'COMMENT', w: 18 },
    { key: 'tr',      label: 'TR',      w: 10 },
  ];
  // Normalize widths to contentW
  const sumW = cols.reduce((s, c) => s + c.w, 0);
  const scale = contentW / sumW;
  cols.forEach(c => (c.w = c.w * scale));

  const colX: number[] = [];
  let cx = M;
  cols.forEach(c => { colX.push(cx); cx += c.w; });

  // Header rows
  const headerH1 = 4.5;
  const headerH2 = 5.5;

  // Row 1: group headers (FORMATIVE / SUMMATIVE)
  pdf.setDrawColor(RED.r, RED.g, RED.b);
  pdf.setLineWidth(0.25);
  pdf.rect(M, y, contentW, headerH1);
  // formative spans a1..p20 (indices 3..7)
  const formStart = colX[3];
  const formEnd = colX[7] + cols[7].w;
  const sumStart = colX[8];
  const sumEnd = colX[10] + cols[10].w;
  pdf.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('FORMATIVE', (formStart + formEnd) / 2, y + 3.2, { align: 'center' });
  pdf.text('SUMMATIVE', (sumStart + sumEnd) / 2, y + 3.2, { align: 'center' });
  // vertical separators for grouping
  pdf.line(formStart, y, formStart, y + headerH1);
  pdf.line(formEnd, y, formEnd, y + headerH1);
  pdf.line(sumEnd, y, sumEnd, y + headerH1);
  y += headerH1;

  // Row 2: actual column labels
  pdf.rect(M, y, contentW, headerH2);
  pdf.setFontSize(7);
  pdf.setTextColor(BLACK.r, BLACK.g, BLACK.b);
  cols.forEach((c, i) => {
    if (i > 0) pdf.line(colX[i], y, colX[i], y + headerH2);
    if (c.key === 'paper') {
      // Stacked PAPER label
      pdf.setFontSize(5);
      const letters = ['P', 'A', 'P', 'E', 'R'];
      letters.forEach((l, idx) => {
        pdf.text(l, colX[i] + c.w / 2, y + 1.2 + idx * 0.85, { align: 'center' });
      });
      pdf.setFontSize(7);
    } else if (['code', 'subject', 'grade', 'comment', 'tr'].includes(c.key)) {
      pdf.text(c.label, colX[i] + c.w / 2, y + 3.5, { align: 'center' });
    } else {
      pdf.text(c.label, colX[i] + c.w / 2, y + 3.5, { align: 'center' });
    }
  });
  y += headerH2;

  // ============ Data rows ============
  const subjectCount = Math.max(marks.length, 1);
  // Two rows per subject (Paper 1 / Paper 2)
  // Use remaining vertical space to size rows dynamically.
  // Reserve space for AverageScores + overall + grade scale + key + projects + comments + footer
  // Reserved space below the marks table: averages(6) + overall(8) + grade scale(12.5)
  // + key(19.5) + projects(19.5) + comments(23.5) + footer(12) + motto(5) ~= 106
  const reservedBelow = 118;
  const availableForBody = pageH - y - reservedBelow - M;
  const totalDataRows = subjectCount * 2;
  const minRowH = 3.8;
  const maxRowH = 6.5;
  let rowH = availableForBody / totalDataRows;
  if (rowH < minRowH) rowH = minRowH;
  if (rowH > maxRowH) rowH = maxRowH;

  const drawCell = (x: number, w: number, h: number, text: string, opts: {
    bold?: boolean; italic?: boolean; size?: number; color?: { r: number; g: number; b: number }; align?: 'left' | 'center';
  } = {}) => {
    const { bold = false, italic = false, size = 7.5, color = BLACK, align = 'center' } = opts;
    pdf.setFont('helvetica', bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(color.r, color.g, color.b);
    // Fit text inside the cell: shrink font until it fits the available width,
    // then truncate with an ellipsis if still overflowing.
    let str = text || '';
    const maxW = Math.max(0, w - 1.4);
    let fs = size;
    while (fs > 4 && pdf.getTextWidth(str) > maxW) {
      fs -= 0.5;
      pdf.setFontSize(fs);
    }
    while (str.length > 1 && pdf.getTextWidth(str) > maxW) {
      str = str.slice(0, -1);
    }
    const tx = align === 'center' ? x + w / 2 : x + 0.8;
    pdf.text(str, tx, h, { align: align === 'center' ? 'center' : 'left' });
  };

  const tableBodyStart = y;
  pdf.setDrawColor(RED.r, RED.g, RED.b);
  pdf.setLineWidth(0.2);

  for (let s = 0; s < subjectCount; s++) {
    const mark = marks[s];
    const subjBlockH = rowH * 2;
    const subjTop = y;

    // Paper 1 row
    for (let p = 0; p < 2; p++) {
      const ry = y;
      pdf.rect(M, ry, contentW, rowH);
      cols.forEach((c, i) => {
        if (i > 0) pdf.line(colX[i], ry, colX[i], ry + rowH);
      });

      if (p === 0 && mark) {
        // Subject info spans both paper rows visually (drawn once)
        drawCell(colX[0], cols[0].w, subjTop + subjBlockH / 2 + 1.2, mark.subject_code || (mark.subjects as any)?.subject_code || '', { bold: true, color: NAVY, size: 8 });
        const subjFullName = mark.subjects?.subject_name || '';
        const subjCodeForName = mark.subject_code || (mark.subjects as any)?.subject_code || '';
        const displaySubj = getDisplaySubjectName(subjFullName, subjCodeForName).toUpperCase();
        drawCell(colX[1], cols[1].w, subjTop + subjBlockH / 2 + 1.2, displaySubj, { bold: true, color: NAVY, size: 8 });
      }

      // Paper number
      drawCell(colX[2], cols[2].w, ry + rowH / 2 + 1.2, p === 0 ? '1' : '2', { bold: true, size: 7 });

      if (p === 0 && mark) {
        // Formative scores
        const fmt = (v: any, d = 1) => (v === null || v === undefined || v === '') ? '' : Number(v).toFixed(d);
        drawCell(colX[3], cols[3].w, ry + rowH / 2 + 1.2, fmt(mark.a1_score), { bold: true, color: RED_VAL });
        drawCell(colX[4], cols[4].w, ry + rowH / 2 + 1.2, fmt(mark.a2_score), { bold: true, color: RED_VAL });
        drawCell(colX[5], cols[5].w, ry + rowH / 2 + 1.2, fmt(mark.a3_score), { bold: true, color: RED_VAL });
        drawCell(colX[6], cols[6].w, ry + rowH / 2 + 1.2, fmt(mark.average_score), { bold: true, color: RED_VAL });
        drawCell(colX[7], cols[7].w, ry + rowH / 2 + 1.2, fmt(mark.twenty_percent), { bold: true, color: RED_VAL });
        // Summative scores - 80%, 100% on paper 1 row
        drawCell(colX[9], cols[9].w, ry + rowH / 2 + 1.2, fmt(mark.eighty_percent), { bold: true, color: RED_VAL });
        drawCell(colX[10], cols[10].w, ry + rowH / 2 + 1.2, fmt(mark.hundred_percent), { bold: true, color: GREEN_VAL });

        // Grade
        const grade = mark.final_grade || '';
        const gradeColor = grade === 'A' || grade === 'B' ? NAVY : grade === 'C' ? GREEN_VAL : RED_VAL;
        drawCell(colX[11], cols[11].w, subjTop + subjBlockH / 2 + 1.2, grade, { bold: true, size: 9, color: gradeColor });

        // Comment
        drawCell(colX[12], cols[12].w, subjTop + subjBlockH / 2 + 1.2, (mark.achievement_level || '').substring(0, 18), { italic: true, color: RED_VAL });

        // TR
        drawCell(colX[13], cols[13].w, subjTop + subjBlockH / 2 + 1.2, mark.teacher_initials || '', { bold: true, color: NAVY });
      }

      // EOT raw score per paper
      if (mark) {
        const eotVals = [(mark as any).eot_paper1, (mark as any).eot_paper2];
        const ev = eotVals[p];
        // Fallback: if no per-paper data, show 80% raw on row 1, blank on row 2
        const eotShown = ev !== undefined && ev !== null
          ? String(ev)
          : (p === 0 ? (mark.eighty_percent !== null && mark.eighty_percent !== undefined ? String(Math.round((mark.eighty_percent as number) / 0.8)) : '') : '');
        drawCell(colX[8], cols[8].w, ry + rowH / 2 + 1.2, eotShown, { bold: true, color: RED_VAL });
      }

      y += rowH;
    }
  }

  // Outer table border
  pdf.setLineWidth(0.3);
  pdf.rect(M, tableBodyStart, contentW, y - tableBodyStart);

  // ============ AVERAGE SCORES row ============
  const avgRowH = 6;
  pdf.setFillColor(255, 248, 248);
  pdf.rect(M, y, contentW, avgRowH, 'F');
  pdf.setDrawColor(RED.r, RED.g, RED.b);
  pdf.rect(M, y, contentW, avgRowH);
  cols.forEach((c, i) => {
    if (i > 0) pdf.line(colX[i], y, colX[i], y + avgRowH);
  });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  pdf.text('AVERAGE SCORES', M + 2, y + 4);

  const avg20 = marks.length > 0 ? marks.reduce((s, m) => s + (Number(m.twenty_percent) || 0), 0) / marks.length : 0;
  const avg80 = marks.length > 0 ? marks.reduce((s, m) => s + (Number(m.eighty_percent) || 0), 0) / marks.length : 0;
  const avg100 = marks.length > 0 ? marks.reduce((s, m) => s + (Number(m.hundred_percent) || 0), 0) / marks.length : 0;

  pdf.setTextColor(RED_VAL.r, RED_VAL.g, RED_VAL.b);
  pdf.text(avg20.toFixed(2), colX[7] + cols[7].w / 2, y + 4, { align: 'center' });
  pdf.text(avg80.toFixed(2), colX[9] + cols[9].w / 2, y + 4, { align: 'center' });
  pdf.text(avg100.toFixed(2), colX[10] + cols[10].w / 2, y + 4, { align: 'center' });
  pdf.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  pdf.text(reportData.overall_grade || '', colX[11] + cols[11].w / 2, y + 4, { align: 'center' });
  pdf.setFont('helvetica', 'bolditalic');
  pdf.setTextColor(RED_VAL.r, RED_VAL.g, RED_VAL.b);
  pdf.text(reportData.achievement_level || '', colX[12] + cols[12].w / 2, y + 4, { align: 'center' });
  y += avgRowH;

  // Overall stats row (3 cells)
  const oRowH = 6;
  const oW = contentW / 3;
  pdf.setDrawColor(RED.r, RED.g, RED.b);
  pdf.rect(M, y, contentW, oRowH);
  pdf.line(M + oW, y, M + oW, y + oRowH);
  pdf.line(M + oW * 2, y, M + oW * 2, y + oRowH);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(BLACK.r, BLACK.g, BLACK.b);
  pdf.text('Overall Identifier', M + 2, y + 4);
  pdf.text('Overall Achievement', M + oW + 2, y + 4);
  pdf.text('Overall grade', M + oW * 2 + 2, y + 4);
  // Values
  pdf.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  pdf.text(reportData.overall_identifier?.toString() || '', M + oW - 4, y + 4, { align: 'right' });
  pdf.text(reportData.achievement_level || '', M + oW * 2 - 4, y + 4, { align: 'right' });
  pdf.text(reportData.overall_grade || '', M + contentW - 4, y + 4, { align: 'right' });
  y += oRowH + 2;

  // ============ GRADE SCALE ============
  const gradeData = [
    { g: 'A', r: '75-100' },
    { g: 'B', r: '65-74' },
    { g: 'C', r: '50-64' },
    { g: 'D', r: '35-49' },
    { g: 'E', r: '0-34' },
  ];
  const gw = contentW / 6;
  const ghRow = 5.5;
  pdf.setDrawColor(RED.r, RED.g, RED.b);

  // Row 1: GRADE
  pdf.rect(M, y, contentW, ghRow);
  for (let i = 1; i < 6; i++) pdf.line(M + gw * i, y, M + gw * i, y + ghRow);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  pdf.text('GRADE', M + gw / 2, y + 3.8, { align: 'center' });
  gradeData.forEach((g, i) => {
    pdf.text(g.g, M + gw * (i + 1) + gw / 2, y + 3.8, { align: 'center' });
  });
  y += ghRow;

  // Row 2: SCORES
  pdf.rect(M, y, contentW, ghRow);
  for (let i = 1; i < 6; i++) pdf.line(M + gw * i, y, M + gw * i, y + ghRow);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(BLACK.r, BLACK.g, BLACK.b);
  pdf.text('SCORES', M + gw / 2, y + 3.8, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  gradeData.forEach((g, i) => {
    pdf.text(g.r, M + gw * (i + 1) + gw / 2, y + 3.8, { align: 'center' });
  });
  y += ghRow + 1.5;

  // ============ KEY TO TERMS USED ============
  const keyH = 18;
  pdf.setDrawColor(RED.r, RED.g, RED.b);
  pdf.rect(M, y, contentW, keyH);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(BLACK.r, BLACK.g, BLACK.b);
  pdf.text('Key to Terms Used:', M + 2, y + 3.5);
  pdf.text('A1', M + 40, y + 3.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text('End of Chapter Assessment', M + 46, y + 3.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('80%', M + 105, y + 3.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text('End of term assessment', M + 113, y + 3.5);

  // Identifier definitions
  const idDefs = [
    { l: '1 - Basic', range: '0.9 - 1.49', d: 'Few LOs achieved, but not sufficient for overall achievement' },
    { l: '2 - Moderate', range: '1.5 - 2.49', d: 'Many LOs achieved, enough for overall achievement' },
    { l: '3 - Outstanding', range: '2.5 - 3.0', d: 'Most or all LOs achieved for overall achievement' },
  ];
  let ky = y + 7;
  idDefs.forEach((d) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(d.l, M + 2, ky);
    pdf.setFont('helvetica', 'normal');
    pdf.text(d.range, M + 30, ky);
    pdf.text(d.d, M + 52, ky);
    ky += 3.5;
  });
  y += keyH + 1.5;

  // ============ STUDENT'S PROJECTS WORK ============
  pdf.setTextColor(RED_TEXT.r, RED_TEXT.g, RED_TEXT.b);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text("STUDENT'S PROJECTS WORK", pageW / 2, y + 3.5, { align: 'center' });
  y += 5;

  const projCols = [
    { l: 'TERMLY\nPROJECT WORK', w: contentW * 0.18 },
    { l: 'AVERAGE\nSCORE(10)', w: contentW * 0.12 },
    { l: 'OUT\nOF 100', w: contentW * 0.1 },
    { l: 'GRADE', w: contentW * 0.08 },
    { l: 'REMARKS', w: contentW * 0.32 },
    { l: 'TEACHER', w: contentW * 0.2 },
  ];
  const projHdrH = 6;
  const projRowH = 7;
  pdf.setDrawColor(RED.r, RED.g, RED.b);
  pdf.setFillColor(255, 248, 248);
  pdf.rect(M, y, contentW, projHdrH, 'FD');
  let px = M;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  projCols.forEach((c, i) => {
    if (i > 0) pdf.line(px, y, px, y + projHdrH);
    const lines = c.l.split('\n');
    lines.forEach((ln, li) => {
      pdf.text(ln, px + c.w / 2, y + 2.6 + li * 2.6, { align: 'center' });
    });
    px += c.w;
  });
  y += projHdrH;
  // Empty project row
  pdf.rect(M, y, contentW, projRowH);
  px = M;
  projCols.forEach((c, i) => {
    if (i > 0) pdf.line(px, y, px, y + projRowH);
    px += c.w;
  });
  y += projRowH + 1.5;

  // ============ COMMENTS ============
  const cmtH = 11;
  pdf.setDrawColor(RED.r, RED.g, RED.b);
  pdf.rect(M, y, contentW, cmtH);
  pdf.setFont('helvetica', 'bolditalic');
  pdf.setFontSize(7.5);
  pdf.setTextColor(BLACK.r, BLACK.g, BLACK.b);
  pdf.text("Class teacher's", M + 2, y + 3.8);
  pdf.text('Comment:', M + 2, y + 7.5);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(VAL_BLUE.r, VAL_BLUE.g, VAL_BLUE.b);
  const ctLines = pdf.splitTextToSize(reportData.class_teacher_comment || '', contentW - 70);
  pdf.text(ctLines, M + 28, y + 4.5);
  if (classTeacherSignature && classTeacherSignature.startsWith('data:image')) {
    try { pdf.addImage(classTeacherSignature, 'PNG', pageW - M - 38, y + 1, 35, cmtH - 2); } catch {}
  }
  y += cmtH;

  pdf.rect(M, y, contentW, cmtH);
  pdf.setFont('helvetica', 'bolditalic');
  pdf.setFontSize(7.5);
  pdf.setTextColor(BLACK.r, BLACK.g, BLACK.b);
  pdf.text("Headteacher's", M + 2, y + 3.8);
  pdf.text('Comment:', M + 2, y + 7.5);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(VAL_BLUE.r, VAL_BLUE.g, VAL_BLUE.b);
  const htLines = pdf.splitTextToSize(reportData.headteacher_comment || '', contentW - 70);
  pdf.text(htLines, M + 28, y + 4.5);
  if (headteacherSignature && headteacherSignature.startsWith('data:image')) {
    try { pdf.addImage(headteacherSignature, 'PNG', pageW - M - 38, y + 1, 35, cmtH - 2); } catch {}
  }
  y += cmtH + 1.5;

  // ============ FOOTER (dates & fees) ============
  const footH = 10;
  const footW = contentW / 4;
  pdf.setDrawColor(RED.r, RED.g, RED.b);
  pdf.rect(M, y, contentW, footH);
  for (let i = 1; i < 4; i++) pdf.line(M + footW * i, y, M + footW * i, y + footH);

  const termEnd = term.end_date ? new Date(term.end_date) : null;
  const nextTerm = termEnd ? new Date(termEnd.getTime() + 30 * 86400000) : null;
  const fmtDate = (d: Date | null) => d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  const footCells = [
    { v: fmtDate(termEnd), l: 'TERM ENDED ON', valColor: BLACK },
    { v: fmtDate(nextTerm), l: 'NEXT TERM BEGINS', valColor: BLACK },
    { v: feesData ? `Ugx ${feesData.feesBalance.toLocaleString()}/=` : '', l: 'FEES BALANCE', valColor: BLACK },
    { v: feesData ? `Ugx ${feesData.feesNextTerm.toLocaleString()}/=` : '', l: 'FEES NEXT TERM', valColor: BLACK },
  ];
  footCells.forEach((fc, i) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(fc.valColor.r, fc.valColor.g, fc.valColor.b);
    pdf.text(fc.v, M + footW * i + footW / 2, y + 4, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.text(fc.l, M + footW * i + footW / 2, y + 8, { align: 'center' });
  });
  y += footH + 2;

  // Motto
  pdf.setFont('helvetica', 'bolditalic');
  pdf.setFontSize(10);
  pdf.setTextColor(BLACK.r, BLACK.g, BLACK.b);
  pdf.text((schoolInfo.motto || 'SUCCESS AFTER STRUGGLE').toUpperCase(), pageW / 2, y + 3, { align: 'center' });

  return pdf;
};
