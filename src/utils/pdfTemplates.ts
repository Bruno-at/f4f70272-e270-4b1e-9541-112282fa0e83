import jsPDF from 'jspdf';
import { Student, Term, SchoolInfo, StudentMark } from '@/types/database';

export type ReportColor = 'white' | 'green' | 'blue' | 'pink' | 'yellow' | 'gray';

export const reportColorHex: Record<ReportColor, string> = {
  white: '#FFFFFF',
  green: '#DCFCE7',
  blue: '#DBEAFE',
  pink: '#FCE7F3',
  yellow: '#FEF9C3',
  gray: '#F3F4F6',
};

// Unique accent colors for sensitive fields based on background color
export const sensitiveFieldColors: Record<ReportColor, {
  gradeA: string;
  gradeB: string;
  gradeC: string;
  gradeD: string;
  gradeE: string;
  comments: string;
  overallStats: string;
}> = {
  white: {
    gradeA: '#FFFFFF',
    gradeB: '#FFFFFF',
    gradeC: '#FFFFFF',
    gradeD: '#FFFFFF',
    gradeE: '#FFFFFF',
    comments: '#FFFFFF',
    overallStats: '#FFFFFF',
  },
  green: {
    gradeA: '#FEF3C7', // Amber light
    gradeB: '#DBEAFE', // Blue light
    gradeC: '#E0E7FF', // Indigo light
    gradeD: '#FCE7F3', // Pink light
    gradeE: '#FEE2E2', // Red light
    comments: '#FFFBEB', // Warm cream
    overallStats: '#F0FDF4', // Light green
  },
  blue: {
    gradeA: '#DCFCE7', // Green light
    gradeB: '#FEF3C7', // Amber light
    gradeC: '#FCE7F3', // Pink light
    gradeD: '#FEF9C3', // Yellow light
    gradeE: '#FEE2E2', // Red light
    comments: '#F0F9FF', // Light blue
    overallStats: '#EFF6FF', // Soft blue
  },
  pink: {
    gradeA: '#DCFCE7', // Green light
    gradeB: '#DBEAFE', // Blue light
    gradeC: '#FEF3C7', // Amber light
    gradeD: '#E0E7FF', // Indigo light
    gradeE: '#FEE2E2', // Red light
    comments: '#FFF1F2', // Soft pink
    overallStats: '#FDF2F8', // Light pink
  },
  yellow: {
    gradeA: '#DCFCE7', // Green light
    gradeB: '#DBEAFE', // Blue light
    gradeC: '#E0E7FF', // Indigo light
    gradeD: '#FCE7F3', // Pink light
    gradeE: '#FEE2E2', // Red light
    comments: '#FFFBEB', // Warm cream
    overallStats: '#FEFCE8', // Soft yellow
  },
  gray: {
    gradeA: '#DCFCE7', // Green light
    gradeB: '#DBEAFE', // Blue light
    gradeC: '#FEF3C7', // Amber light
    gradeD: '#FCE7F3', // Pink light
    gradeE: '#FEE2E2', // Red light
    comments: '#FFFFFF', // White
    overallStats: '#F9FAFB', // Soft gray
  },
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
};

interface TemplateData {
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
}

export const generateClassicTemplate = (data: TemplateData) => {
  const { student, term, schoolInfo, marks, reportData, reportColor = 'white' } = data;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Apply background color to entire page
  const bgColor = hexToRgb(reportColorHex[reportColor]);
  pdf.setFillColor(bgColor.r, bgColor.g, bgColor.b);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Thin outer border
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.3);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
  
  let yPosition = 12;
  
  // Header Section
  // Left: School logo placeholder
  const logoBoxSize = 22;
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  pdf.rect(10, yPosition, logoBoxSize, logoBoxSize);
  
  if (schoolInfo.logo_url && schoolInfo.logo_url.startsWith('data:image')) {
    try {
      pdf.addImage(schoolInfo.logo_url, 'PNG', 10.5, yPosition + 0.5, logoBoxSize - 1, logoBoxSize - 1);
    } catch (error) {
      console.log('Could not add logo');
    }
  }
  
  // Right: Student photo demarcation box
  const photoBoxX = pageWidth - 38;
  const photoBoxY = yPosition;
  const photoBoxW = 28;
  const photoBoxH = 30;
  
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  pdf.rect(photoBoxX, photoBoxY, photoBoxW, photoBoxH);
  
  if (student.photo_url && student.photo_url.startsWith('data:image')) {
    try {
      pdf.addImage(student.photo_url, 'PNG', photoBoxX + 0.5, photoBoxY + 0.5, photoBoxW - 1, photoBoxH - 1);
    } catch (error) {
      console.log('Could not add photo');
    }
  }
  
  // Center: School details
  pdf.setTextColor(50, 50, 50);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name.toUpperCase(), pageWidth / 2, yPosition + 7, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(80, 80, 80);
  pdf.text(`"${schoolInfo.motto || 'Mbizi we are'}"`, pageWidth / 2, yPosition + 12, { align: 'center' });
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  pdf.text(`Location: ${schoolInfo.location || 'Kibizi'}`, pageWidth / 2, yPosition + 17, { align: 'center' });
  pdf.text(`P.O BOX: ${schoolInfo.po_box || '104 Kampala'}`, pageWidth / 2, yPosition + 21, { align: 'center' });
  pdf.text(`TEL: ${schoolInfo.telephone || '+256705746484'}`, pageWidth / 2, yPosition + 25, { align: 'center' });
  
  pdf.setTextColor(80, 80, 80);
  pdf.setFontSize(7);
  pdf.text(`Email: ${schoolInfo.email || 'mugabifood@gmail.com'} | Website: ${schoolInfo.website || 'mugabifood@gmail.com'}`, pageWidth / 2, yPosition + 29, { align: 'center' });
  
  yPosition = 47;
  
  // Title Section
  pdf.setTextColor(50, 50, 50);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const reportTitle = `TERM ${term.term_name.toUpperCase()} REPORT CARD ${term.year}`;
  pdf.text(reportTitle, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  
  // Student Information - Horizontal Layout with thin lines
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  pdf.line(10, yPosition, pageWidth - 10, yPosition);
  
  yPosition += 1;
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  // Row 1
  pdf.text('NAME:', 12, yPosition + 4);
  pdf.text(student.name.toUpperCase(), 28, yPosition + 4);
  
  pdf.text('GENDER:', 85, yPosition + 4);
  pdf.text(student.gender.toUpperCase(), 105, yPosition + 4);
  
  pdf.text('TERM:', 150, yPosition + 4);
  pdf.text(term.term_name.toUpperCase(), 165, yPosition + 4);
  
  // Row 2
  pdf.text('SECTION:', 12, yPosition + 9);
  pdf.text(student.classes?.section || 'East', 32, yPosition + 9);
  
  pdf.text('CLASS:', 85, yPosition + 9);
  pdf.text(student.classes?.class_name || 'S.1', 101, yPosition + 9);
  
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Printed on ${new Date().toLocaleDateString('en-GB')}`, 150, yPosition + 9);
  
  // Row 3
  pdf.setFont('helvetica', 'bold');
  pdf.text('House:', 12, yPosition + 14);
  pdf.text(student.house || 'Blue', 26, yPosition + 14);
  
  pdf.text('Age:', 50, yPosition + 14);
  pdf.text(student.age?.toString() || 'N/A', 60, yPosition + 14);
  
  yPosition += 16;
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  pdf.line(10, yPosition, pageWidth - 10, yPosition);
  
  yPosition += 3;
  
  // Performance Records Section
  pdf.setFillColor(240, 240, 240);
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  pdf.rect(10, yPosition, pageWidth - 20, 6, 'FD');
  pdf.setTextColor(50, 50, 50);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PERFORMANCE RECORDS', pageWidth / 2, yPosition + 4.5, { align: 'center' });
  
  yPosition += 6;
  
  // Performance Table Header
  const tableStartY = yPosition;
  pdf.setFillColor(248, 248, 248);
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  pdf.rect(10, yPosition, pageWidth - 20, 6, 'FD');
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  
  const headers = ['Code', 'Subject', 'A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'Ident', 'GRADE', 'Remarks/Descriptors', 'TR'];
  const colX = [11, 24, 52, 60, 68, 76, 85, 94, 103, 113, 124, 138, 190];
  const colW = [13, 28, 8, 8, 8, 9, 9, 9, 10, 11, 14, 52, 10];
  
  headers.forEach((header, index) => {
    pdf.text(header, colX[index], yPosition + 4.5);
  });
  
  yPosition += 6;
  
  // Table rows
  marks.forEach((mark) => {
    const rowHeight = 5.5;
    
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(120, 120, 120);
    pdf.setLineWidth(0.1);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    
    const rowData = [
      mark.subject_code || '',
      mark.subjects?.subject_name || 'Unknown',
      mark.a1_score?.toFixed(0) || '',
      mark.a2_score?.toFixed(0) || '',
      mark.a3_score?.toFixed(0) || '',
      mark.average_score?.toFixed(0) || '',
      mark.twenty_percent?.toFixed(0) || '',
      mark.eighty_percent?.toFixed(0) || '',
      mark.hundred_percent?.toFixed(0) || '',
      mark.identifier?.toString() || '',
      mark.final_grade || '',
      mark.achievement_level || '',
      mark.teacher_initials || ''
    ];
    
    rowData.forEach((data, colIndex) => {
      if (colIndex === 10) {
        pdf.setFont('helvetica', 'bold');
      }
      pdf.text(data, colX[colIndex], yPosition + 4);
      pdf.setFont('helvetica', 'normal');
    });
    
    pdf.line(10, yPosition + rowHeight, pageWidth - 10, yPosition + rowHeight);
    yPosition += rowHeight;
  });
  
  // Draw table border and vertical lines
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  pdf.rect(10, tableStartY, pageWidth - 20, yPosition - tableStartY);
  
  const verticalX = [10, 23, 51, 59, 67, 75, 84, 93, 102, 112, 123, 137, 189, pageWidth - 10];
  verticalX.forEach(x => {
    pdf.line(x, tableStartY, x, yPosition);
  });
  
  // AVERAGE row
  pdf.setFillColor(248, 248, 248);
  pdf.rect(10, yPosition, pageWidth - 20, 5, 'F');
  pdf.setDrawColor(120, 120, 120);
  pdf.rect(10, yPosition, pageWidth - 20, 5);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('AVERAGE:', 12, yPosition + 3.5);
  pdf.text(reportData.overall_average?.toFixed(0) || '0', 85, yPosition + 3.5);
  
  yPosition += 7;
  
  // Get sensitive field colors
  const fieldColors = sensitiveFieldColors[reportColor];
  const overallStatsColor = hexToRgb(fieldColors.overallStats);
  
  // Overall stats row - with unique background
  pdf.setFillColor(overallStatsColor.r, overallStatsColor.g, overallStatsColor.b);
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  pdf.rect(10, yPosition, pageWidth - 20, 6, 'F');
  pdf.rect(10, yPosition, pageWidth - 20, 6);
  
  pdf.line(55, yPosition, 55, yPosition + 6);
  pdf.line(115, yPosition, 115, yPosition + 6);
  pdf.line(160, yPosition, 160, yPosition + 6);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(7);
  pdf.text('Overall Identifier:', 12, yPosition + 4);
  pdf.text(reportData.overall_identifier?.toString() || '0', 45, yPosition + 4);
  
  pdf.text('Overall Achievement:', 57, yPosition + 4);
  pdf.text(reportData.achievement_level || 'N/A', 95, yPosition + 4);
  
  pdf.text('Overall Grade:', 117, yPosition + 4);
  
  // Grade box - subtle
  pdf.setFillColor(230, 230, 230);
  pdf.rect(145, yPosition + 0.5, 12, 5, 'F');
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.text(reportData.overall_grade || 'N/A', 151, yPosition + 4.5, { align: 'center' });
  
  yPosition += 9;
  
  // GRADE SCORES Table - Minimal colors
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setLineWidth(0.2);
  pdf.setDrawColor(120, 120, 120);
  
  const gradeTableY = yPosition;
  const gradeColW = (pageWidth - 20) / 6;
  
  // Grade row - header cell
  pdf.setFillColor(248, 248, 248);
  pdf.rect(10, gradeTableY, gradeColW, 6, 'F');
  pdf.setTextColor(0, 0, 0);
  pdf.text('GRADE', 12, gradeTableY + 4);
  
  // A-E grade cells - use unique colors for each grade
  const grades = ['A', 'B', 'C', 'D', 'E'];
  const gradeColors = [
    hexToRgb(fieldColors.gradeA),
    hexToRgb(fieldColors.gradeB),
    hexToRgb(fieldColors.gradeC),
    hexToRgb(fieldColors.gradeD),
    hexToRgb(fieldColors.gradeE),
  ];
  grades.forEach((grade, i) => {
    pdf.setFillColor(gradeColors[i].r, gradeColors[i].g, gradeColors[i].b);
    pdf.rect(10 + gradeColW * (i + 1), gradeTableY, gradeColW, 6, 'F');
    pdf.setTextColor(0, 0, 0);
    pdf.text(grade, 10 + gradeColW * (i + 1) + gradeColW / 2, gradeTableY + 4, { align: 'center' });
  });
  
  // SCORES row - header cell
  pdf.setFillColor(248, 248, 248);
  pdf.rect(10, gradeTableY + 6, gradeColW, 6, 'F');
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SCORES', 12, gradeTableY + 10);
  
  // Score range cells - use same unique colors as grades
  const scores = ['100 - 80', '79 - 70', '69 - 60', '59 - 40', '39 - 0'];
  pdf.setFont('helvetica', 'normal');
  scores.forEach((score, i) => {
    pdf.setFillColor(gradeColors[i].r, gradeColors[i].g, gradeColors[i].b);
    pdf.rect(10 + gradeColW * (i + 1), gradeTableY + 6, gradeColW, 6, 'F');
    pdf.setTextColor(0, 0, 0);
    pdf.text(score, 10 + gradeColW * (i + 1) + gradeColW / 2, gradeTableY + 10, { align: 'center' });
  });
  
  // Draw table border and lines AFTER filling cells
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  pdf.rect(10, gradeTableY, pageWidth - 20, 12);
  // Vertical lines
  for (let i = 1; i <= 5; i++) {
    pdf.line(10 + gradeColW * i, gradeTableY, 10 + gradeColW * i, gradeTableY + 12);
  }
  // Horizontal line between rows
  pdf.line(10, gradeTableY + 6, pageWidth - 10, gradeTableY + 6);
  
  yPosition = gradeTableY + 15;
  
  // Comments Section - with unique background
  const commentsColor = hexToRgb(fieldColors.comments);
  pdf.setFillColor(commentsColor.r, commentsColor.g, commentsColor.b);
  pdf.setDrawColor(120, 120, 120);
  pdf.rect(10, yPosition, pageWidth - 20, 20, 'F');
  pdf.rect(10, yPosition, pageWidth - 20, 20);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Class Teacher's Comment:", 12, yPosition + 4);
  
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7);
  const teacherComment = reportData.class_teacher_comment || 'No comment provided';
  pdf.text(teacherComment.substring(0, 80), 12, yPosition + 8);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text("Headteacher's Comment:", 12, yPosition + 13);
  
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7);
  const headComment = reportData.headteacher_comment || 'No comment provided';
  pdf.text(headComment.substring(0, 60), 12, yPosition + 17);
  
  // Class Teacher's Signature - on the right, above Headteacher's
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text("Class Teacher's Signature:", 145, yPosition + 4);
  pdf.setLineWidth(0.2);
  pdf.setDrawColor(80, 80, 80);
  pdf.line(145, yPosition + 9, 195, yPosition + 9);
  
  // Headteacher's Signature - on the right, below Class Teacher's
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text("Headteacher's Signature:", 145, yPosition + 13);
  pdf.setLineWidth(0.2);
  pdf.setDrawColor(80, 80, 80);
  pdf.line(145, yPosition + 18, 195, yPosition + 18);
  
  yPosition += 23;
  
  // Key to Terms Used
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  pdf.rect(10, yPosition, pageWidth - 20, 18);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Key to Terms Used: A1 Average Chapter Assessment 80% End of term assessment', 12, yPosition + 4);
  
  pdf.setFontSize(6);
  pdf.text('1 -   0.9-', 12, yPosition + 8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Few LOs achieved, but not', 28, yPosition + 8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Basic 1.49', 12, yPosition + 11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('sufficient for overall achievement', 28, yPosition + 11);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('2 -   1.5-', 75, yPosition + 8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Many LOs achieved,', 91, yPosition + 8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Moderate 2.49', 75, yPosition + 11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('enough for overall achievement', 91, yPosition + 11);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('3 -   2.5-', 138, yPosition + 8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Most or all LOs', 154, yPosition + 8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Outstanding 3.0', 138, yPosition + 11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('achieved for overall achievement', 154, yPosition + 11);
  
  yPosition += 21;
  
  // Footer Section
  const termEndDate = new Date(term.end_date).toLocaleDateString('en-GB');
  const nextTermDate = new Date(new Date(term.end_date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
  
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(120, 120, 120);
  pdf.rect(10, yPosition, pageWidth - 20, 10);
  
  const footerColW = (pageWidth - 20) / 5;
  for (let i = 1; i < 5; i++) {
    pdf.line(10 + footerColW * i, yPosition, 10 + footerColW * i, yPosition + 10);
  }
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  
  pdf.text(termEndDate, 10 + footerColW * 0.5, yPosition + 4, { align: 'center' });
  pdf.text('TERM ENDED ON', 10 + footerColW * 0.5, yPosition + 8, { align: 'center' });
  
  pdf.text(nextTermDate, 10 + footerColW * 1.5, yPosition + 4, { align: 'center' });
  pdf.text('NEXT TERM BEGINS', 10 + footerColW * 1.5, yPosition + 8, { align: 'center' });
  
  pdf.text('FEES BALANCE', 10 + footerColW * 2.5, yPosition + 6, { align: 'center' });
  pdf.text('FEES NEXT TERM', 10 + footerColW * 3.5, yPosition + 6, { align: 'center' });
  
  pdf.setFont('helvetica', 'italic');
  pdf.text('Other Requirement', 10 + footerColW * 4.5, yPosition + 6, { align: 'center' });
  
  yPosition += 13;
  
  // Motto - subtle
  pdf.setFillColor(240, 240, 240);
  pdf.rect(10, yPosition, pageWidth - 20, 6, 'F');
  pdf.setDrawColor(120, 120, 120);
  pdf.rect(10, yPosition, pageWidth - 20, 6);
  pdf.setTextColor(50, 50, 50);
  pdf.setFont('helvetica', 'bolditalic');
  pdf.setFontSize(9);
  const motto = schoolInfo.motto || 'Work hard to excel';
  pdf.text(motto, pageWidth / 2, yPosition + 4.5, { align: 'center' });
  
  return pdf;
};

export const generateModernTemplate = (data: TemplateData) => {
  return generateClassicTemplate(data);
};

export const generateProfessionalTemplate = (data: TemplateData) => {
  return generateClassicTemplate(data);
};

export const generateMinimalTemplate = (data: TemplateData) => {
  return generateClassicTemplate(data);
};