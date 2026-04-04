import jsPDF from 'jspdf';
import { Student, Term, SchoolInfo, StudentMark } from '@/types/database';
import { ReportColor, reportColorHex } from './pdfTemplates';

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
};

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
  feesData?: {
    feesBalance: number;
    feesNextTerm: number;
    otherRequirements: string;
  };
}

export const generateALevelTemplate = (data: ALevelTemplateData): jsPDF => {
  const { student, term, schoolInfo, marks, reportData, reportColor = 'white', classTeacherSignature, headteacherSignature, feesData } = data;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Background
  const bgColor = hexToRgb(reportColorHex[reportColor]);
  pdf.setFillColor(bgColor.r, bgColor.g, bgColor.b);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer border
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.3);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

  let y = 12;

  // ===== HEADER =====
  const logoSize = 22;
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  pdf.rect(10, y, logoSize, logoSize);
  if (schoolInfo.logo_url && schoolInfo.logo_url.startsWith('data:image')) {
    try { pdf.addImage(schoolInfo.logo_url, 'PNG', 10.5, y + 0.5, logoSize - 1, logoSize - 1); } catch {}
  }

  // Student photo box (right)
  const photoX = pageWidth - 38;
  const photoW = 28;
  const photoH = 30;
  pdf.rect(photoX, y, photoW, photoH);
  if (student.photo_url && student.photo_url.startsWith('data:image')) {
    try { pdf.addImage(student.photo_url, 'PNG', photoX + 0.5, y + 0.5, photoW - 1, photoH - 1); } catch {}
  }

  // School name & details
  pdf.setTextColor(0, 0, 128);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name.toUpperCase(), pageWidth / 2, y + 6, { align: 'center' });

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`P.O BOX ${schoolInfo.po_box || ''}, ${schoolInfo.location || ''}`, pageWidth / 2, y + 11, { align: 'center' });
  pdf.text(`EMAIL: ${schoolInfo.email || ''}`, pageWidth / 2, y + 15, { align: 'center' });
  pdf.text(`CONTACTS: ${schoolInfo.telephone || ''}`, pageWidth / 2, y + 19, { align: 'center' });

  y = 36;

  // ===== TITLE =====
  pdf.setFillColor(0, 0, 128);
  pdf.rect(10, y, pageWidth - 20, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`A LEVEL END OF TERM ${term.term_name.toUpperCase()} REPORT CARD ${term.year}`, pageWidth / 2, y + 6, { align: 'center' });

  y += 10;

  // ===== STUDENT INFO =====
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');

  const className = student.classes?.class_name || '';
  const section = student.classes?.section || '';
  // Combination is a placeholder - could be derived from subjects
  const combination = marks.length > 0
    ? marks.slice(0, 3).map(m => m.subjects?.subject_name?.substring(0, 3).toUpperCase() || '').filter(Boolean).join('/')
    : '';

  const infoRows = [
    [{ label: 'NAME:', value: student.name.toUpperCase() }, { label: 'GENDER:', value: student.gender.toUpperCase() }],
    [{ label: 'AGE:', value: student.age?.toString() || '' }, { label: 'Roll No', value: student.student_id || '' }, { label: 'TERM:', value: term.term_name.toUpperCase() }],
    [{ label: 'CLASS', value: className }, { label: 'Stream', value: section }, { label: 'Combination', value: combination }],
  ];

  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);

  infoRows.forEach((row) => {
    pdf.line(10, y, pageWidth - 10, y);
    y += 1;
    let xPos = 12;
    row.forEach((item) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${item.label}`, xPos, y + 3.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.value, xPos + pdf.getTextWidth(item.label) + 2, y + 3.5);
      xPos += 60;
    });
    y += 5;
  });
  pdf.line(10, y, pageWidth - 10, y);

  y += 3;

  // ===== TERM PERFORMANCE RECORDS =====
  pdf.setFillColor(0, 0, 128);
  pdf.rect(10, y, pageWidth - 20, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TERM PERFORMANCE RECORDS', pageWidth / 2, y + 4.5, { align: 'center' });
  y += 6;

  // Sub-headers
  const tableStartY = y;

  // Column definitions for A-Level
  // Code Subject | PAPER | FORMATIVE: A1 A2 A3 AVG 20% | SUMMATIVE: EOT 80% 100% | GRADE | COMMENT | TR
  const colDefs = [
    { label: 'Code Subject', x: 10, w: 32 },
    { label: 'P\nA\nP\nE\nR', x: 42, w: 8 },
    { label: 'A1', x: 50, w: 10 },
    { label: 'A2', x: 60, w: 10 },
    { label: 'A3', x: 70, w: 10 },
    { label: 'AVG', x: 80, w: 10 },
    { label: '20%', x: 90, w: 10 },
    { label: 'EOT', x: 100, w: 10 },
    { label: '80%', x: 110, w: 10 },
    { label: '100%', x: 120, w: 12 },
    { label: 'GRADE\nS', x: 132, w: 10 },
    { label: 'COMMENT', x: 142, w: 34 },
    { label: 'TR', x: 176, w: 14 },
  ];

  // Header row 1: group headers
  pdf.setFillColor(248, 248, 248);
  pdf.rect(10, y, pageWidth - 20, 5, 'FD');
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'bold');

  pdf.text('Code Subject', 11, y + 3.5);
  pdf.text('FORMATIVE', 67, y + 3.5, { align: 'center' });
  pdf.text('SUMMATIVE', 112, y + 3.5, { align: 'center' });
  pdf.text('GRADE', 134, y + 3.5);
  pdf.text('COMMENT', 150, y + 3.5);
  pdf.text('TR', 180, y + 3.5);

  y += 5;

  // Header row 2: column labels
  pdf.setFillColor(248, 248, 248);
  pdf.rect(10, y, pageWidth - 20, 5, 'FD');
  pdf.setFontSize(6);

  const headerLabels = ['', 'P', 'A1', 'A2', 'A3', 'AVG', '20%', 'EOT', '80%', '100%', '', '', ''];
  colDefs.forEach((col, i) => {
    if (headerLabels[i]) {
      pdf.text(headerLabels[i], col.x + col.w / 2, y + 3.5, { align: 'center' });
    }
  });

  y += 5;

  // ===== TABLE ROWS =====
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);

  marks.forEach((mark) => {
    const rowH = 5.5;
    // Paper 1 row
    pdf.setDrawColor(120, 120, 120);
    pdf.setLineWidth(0.1);

    const subjectLabel = `${mark.subject_code || ''} ${mark.subjects?.subject_name?.toUpperCase() || ''}`;

    // Subject code + name
    pdf.setFont('helvetica', 'bold');
    pdf.text(subjectLabel.substring(0, 22), 11, y + 3.8);
    pdf.setFont('helvetica', 'normal');

    // Paper number
    pdf.text('1', colDefs[1].x + colDefs[1].w / 2, y + 3.8, { align: 'center' });

    // Formative scores
    pdf.setFont('helvetica', 'bold');
    pdf.text(mark.a1_score?.toFixed(1) || '', colDefs[2].x + colDefs[2].w / 2, y + 3.8, { align: 'center' });
    pdf.text(mark.a2_score?.toFixed(1) || '', colDefs[3].x + colDefs[3].w / 2, y + 3.8, { align: 'center' });
    pdf.text(mark.a3_score?.toFixed(1) || '', colDefs[4].x + colDefs[4].w / 2, y + 3.8, { align: 'center' });
    pdf.text(mark.average_score?.toFixed(1) || '', colDefs[5].x + colDefs[5].w / 2, y + 3.8, { align: 'center' });
    pdf.text(mark.twenty_percent?.toFixed(1) || '', colDefs[6].x + colDefs[6].w / 2, y + 3.8, { align: 'center' });

    // Summative scores
    pdf.text(mark.eighty_percent?.toFixed(0) || '', colDefs[7].x + colDefs[7].w / 2, y + 3.8, { align: 'center' });
    const eightyPct = mark.eighty_percent ? (mark.eighty_percent * 0.8 / (mark.eighty_percent > 0 ? 1 : 1)) : 0;
    pdf.text(mark.eighty_percent?.toFixed(1) || '', colDefs[8].x + colDefs[8].w / 2, y + 3.8, { align: 'center' });
    pdf.text(mark.hundred_percent?.toFixed(1) || '', colDefs[9].x + colDefs[9].w / 2, y + 3.8, { align: 'center' });

    // Grade
    const grade = mark.final_grade || '';
    if (grade === 'A' || grade === 'B') pdf.setTextColor(0, 0, 128);
    else if (grade === 'C') pdf.setTextColor(0, 100, 0);
    else if (grade === 'D' || grade === 'E') pdf.setTextColor(180, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(grade, colDefs[10].x + colDefs[10].w / 2, y + 3.8, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');

    // Comment (achievement level)
    const comment = mark.achievement_level || '';
    if (comment.toLowerCase().includes('outstanding')) pdf.setTextColor(0, 0, 128);
    else if (comment.toLowerCase().includes('satisfactory')) pdf.setTextColor(0, 100, 0);
    pdf.setFont('helvetica', 'italic');
    pdf.text(comment.substring(0, 20), colDefs[11].x + 1, y + 3.8);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');

    // Teacher initials
    pdf.text(mark.teacher_initials || '', colDefs[12].x + colDefs[12].w / 2, y + 3.8, { align: 'center' });

    pdf.line(10, y + rowH, pageWidth - 10, y + rowH);

    // Paper 2 row (empty placeholder)
    y += rowH;
    pdf.text('2', colDefs[1].x + colDefs[1].w / 2, y + 3.8, { align: 'center' });
    pdf.line(10, y + rowH, pageWidth - 10, y + rowH);
    y += rowH;
  });

  // Draw table borders
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  pdf.rect(10, tableStartY, pageWidth - 20, y - tableStartY);

  // Vertical lines
  const vLines = [10, 42, 50, 60, 70, 80, 90, 100, 110, 120, 132, 142, 176, pageWidth - 10];
  vLines.forEach(x => {
    pdf.line(x, tableStartY, x, y);
  });

  // ===== AVERAGE SCORES ROW =====
  pdf.setFillColor(200, 180, 255);
  pdf.rect(10, y, pageWidth - 20, 5.5, 'F');
  pdf.setDrawColor(120, 120, 120);
  pdf.rect(10, y, pageWidth - 20, 5.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 0);
  pdf.text('AVERAGE SCORES', 12, y + 4);
  pdf.text(reportData.overall_average?.toFixed(2) || '0', colDefs[6].x + colDefs[6].w / 2, y + 4, { align: 'center' });
  // 80% and 100% averages
  const avg80 = marks.length > 0 ? marks.reduce((s, m) => s + (m.eighty_percent || 0), 0) / marks.length : 0;
  pdf.text(avg80.toFixed(2) || '', colDefs[8].x + colDefs[8].w / 2, y + 4, { align: 'center' });
  pdf.text(reportData.overall_average?.toFixed(2) || '0', colDefs[9].x + colDefs[9].w / 2, y + 4, { align: 'center' });
  pdf.text(reportData.overall_grade || '', colDefs[10].x + colDefs[10].w / 2, y + 4, { align: 'center' });
  pdf.setFont('helvetica', 'bolditalic');
  pdf.text(reportData.achievement_level || '', colDefs[11].x + 1, y + 4);
  y += 5.5;

  // Overall stats row
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.rect(10, y, pageWidth - 20, 5);
  pdf.text('Overall Identifier', 12, y + 3.5);
  pdf.text('Overall Achievement', 65, y + 3.5);
  pdf.text('Overall grade', 140, y + 3.5);
  y += 5;

  // ===== GRADE SCALE TABLE =====
  y += 2;
  const gradeData = [
    { grade: 'A', range: '75-100' },
    { grade: 'B', range: '65-74' },
    { grade: 'C', range: '50-64' },
    { grade: 'D', range: '35-49' },
    { grade: 'E', range: '0-34' },
  ];

  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  const gw = (pageWidth - 20) / 6;

  // Grade row
  pdf.setFillColor(248, 248, 248);
  pdf.rect(10, y, gw, 5, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('GRADE', 12, y + 3.5);
  gradeData.forEach((g, i) => {
    pdf.rect(10 + gw * (i + 1), y, gw, 5);
    pdf.text(g.grade, 10 + gw * (i + 1) + gw / 2, y + 3.5, { align: 'center' });
  });

  // Scores row
  pdf.setFillColor(248, 248, 248);
  pdf.rect(10, y + 5, gw, 5, 'FD');
  pdf.text('SCORES', 12, y + 8.5);
  pdf.setFont('helvetica', 'normal');
  gradeData.forEach((g, i) => {
    pdf.rect(10 + gw * (i + 1), y + 5, gw, 5);
    pdf.text(g.range, 10 + gw * (i + 1) + gw / 2, y + 8.5, { align: 'center' });
  });

  y += 12;

  // ===== KEY TO TERMS USED =====
  pdf.setDrawColor(120, 120, 120);
  pdf.rect(10, y, pageWidth - 20, 20);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.text('Key to Terms Used:', 12, y + 4);
  pdf.setFont('helvetica', 'normal');
  pdf.text('A1 End of Chapter Assessment', 48, y + 4);
  pdf.text('80% End of term assessment', 110, y + 4);

  pdf.setFont('helvetica', 'bold');
  pdf.text('1 - Basic', 12, y + 9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('0.9-1.49  Few LOs achieved, but not sufficient for overall achievement', 30, y + 9);

  pdf.setFont('helvetica', 'bold');
  pdf.text('2 - Moderate', 12, y + 13);
  pdf.setFont('helvetica', 'normal');
  pdf.text('1.5-2.49  Many LOs achieved, enough for overall achievement', 38, y + 13);

  pdf.setFont('helvetica', 'bold');
  pdf.text('3 - Outstanding', 12, y + 17);
  pdf.setFont('helvetica', 'normal');
  pdf.text('2.5-3.0  Most or all LOs achieved for overall achievement', 42, y + 17);

  y += 22;

  // ===== STUDENT'S PROJECTS WORK =====
  pdf.setFillColor(0, 0, 128);
  pdf.rect(10, y, pageWidth - 20, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text("STUDENT'S PROJECTS WORK", pageWidth / 2, y + 4.5, { align: 'center' });
  y += 6;

  pdf.setTextColor(0, 0, 0);
  // Project work table header
  const projCols = [
    { label: 'TERMLY\nPROJECT WORK', x: 10, w: 30 },
    { label: 'AVERAGE\nSCORE(10)', x: 40, w: 22 },
    { label: 'OUT\nOF 100', x: 62, w: 18 },
    { label: 'GRADE', x: 80, w: 14 },
    { label: 'REMARKS', x: 94, w: 60 },
    { label: 'TEACHER', x: 154, w: 36 },
  ];

  pdf.setFillColor(248, 248, 248);
  pdf.rect(10, y, pageWidth - 20, 6, 'FD');
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  projCols.forEach(col => {
    pdf.text(col.label.split('\n')[0], col.x + col.w / 2, y + 3, { align: 'center' });
    if (col.label.includes('\n')) {
      pdf.text(col.label.split('\n')[1], col.x + col.w / 2, y + 5.5, { align: 'center' });
    }
  });
  y += 6;

  // Empty project row
  pdf.rect(10, y, pageWidth - 20, 6);
  projCols.forEach(col => {
    pdf.line(col.x, y, col.x, y + 6);
  });
  pdf.line(pageWidth - 10, y, pageWidth - 10, y + 6);
  y += 8;

  // ===== COMMENTS =====
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  const commentBoxH = 14;

  // Class Teacher comment
  pdf.rect(10, y, pageWidth - 20, commentBoxH);
  pdf.setFont('helvetica', 'bolditalic');
  pdf.setFontSize(7);
  pdf.text("Class teacher's", 12, y + 4);
  pdf.text("Comment:", 12, y + 8);
  pdf.setFont('helvetica', 'italic');
  const ctComment = reportData.class_teacher_comment || 'No comment provided';
  const ctLines = pdf.splitTextToSize(ctComment, 120);
  pdf.text(ctLines, 38, y + 5);

  if (classTeacherSignature && classTeacherSignature.startsWith('data:image')) {
    try { pdf.addImage(classTeacherSignature, 'PNG', pageWidth - 50, y + 1, 35, 12); } catch {}
  }

  y += commentBoxH;

  // Headteacher comment
  pdf.rect(10, y, pageWidth - 20, commentBoxH);
  pdf.setFont('helvetica', 'bolditalic');
  pdf.text("Headteacher's", 12, y + 4);
  pdf.text("Comment:", 12, y + 8);
  pdf.setFont('helvetica', 'italic');
  const htComment = reportData.headteacher_comment || 'No comment provided';
  const htLines = pdf.splitTextToSize(htComment, 120);
  pdf.text(htLines, 38, y + 5);

  if (headteacherSignature && headteacherSignature.startsWith('data:image')) {
    try { pdf.addImage(headteacherSignature, 'PNG', pageWidth - 50, y + 1, 35, 12); } catch {}
  }

  y += commentBoxH + 3;

  // ===== FOOTER =====
  const termEndDate = new Date(term.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const nextTermDate = new Date(new Date(term.end_date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  const footW = (pageWidth - 20) / 4;
  pdf.rect(10, y, pageWidth - 20, 10);
  for (let i = 1; i < 4; i++) {
    pdf.line(10 + footW * i, y, 10 + footW * i, y + 10);
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 0);

  pdf.text(termEndDate, 10 + footW * 0.5, y + 4, { align: 'center' });
  pdf.setFontSize(6);
  pdf.text('TERM ENDED ON', 10 + footW * 0.5, y + 8, { align: 'center' });

  pdf.setFontSize(7);
  pdf.text(nextTermDate, 10 + footW * 1.5, y + 4, { align: 'center' });
  pdf.setFontSize(6);
  pdf.text('NEXT TERM BEGINS', 10 + footW * 1.5, y + 8, { align: 'center' });

  pdf.setFontSize(7);
  pdf.text(feesData ? `Ugx ${feesData.feesBalance.toLocaleString()}/=` : '', 10 + footW * 2.5, y + 4, { align: 'center' });
  pdf.setFontSize(6);
  pdf.text('FEES BALANCE', 10 + footW * 2.5, y + 8, { align: 'center' });

  pdf.setFontSize(7);
  pdf.text(feesData ? `Ugx ${feesData.feesNextTerm.toLocaleString()}/=` : '', 10 + footW * 3.5, y + 4, { align: 'center' });
  pdf.setFontSize(6);
  pdf.text('FEES NEXT TERM', 10 + footW * 3.5, y + 8, { align: 'center' });

  y += 13;

  // ===== MOTTO =====
  pdf.setFont('helvetica', 'bolditalic');
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  pdf.text(schoolInfo.motto?.toUpperCase() || 'SUCCESS AFTER STRUGGLE', pageWidth / 2, y + 3, { align: 'center' });

  return pdf;
};
