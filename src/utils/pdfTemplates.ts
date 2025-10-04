import jsPDF from 'jspdf';
import { Student, Term, SchoolInfo, StudentMark } from '@/types/database';

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
}

// Helper function to draw thin table borders
const drawTableBorder = (pdf: jsPDF, x: number, y: number, width: number, height: number) => {
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, width, height);
};

// Helper function to draw faint horizontal line
const drawFaintLine = (pdf: jsPDF, x1: number, y1: number, x2: number, y2: number) => {
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(x1, y1, x2, y2);
};

export const generateClassicTemplate = (data: TemplateData) => {
  const { student, term, schoolInfo, marks, reportData } = data;
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const primaryColor = '#1e40af';
  const redLine = '#dc2626';
  
  // Add border around entire document
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
  
  let yPosition = 15;
  
  // Header Section
  // Left: School logo
  if (schoolInfo.logo_url && schoolInfo.logo_url.startsWith('data:image')) {
    try {
      pdf.addImage(schoolInfo.logo_url, 'PNG', 10, 8, 25, 25);
    } catch (error) {
      console.log('Could not add logo');
    }
  }
  
  // Right: Student photo
  if (student.photo_url && student.photo_url.startsWith('data:image')) {
    try {
      pdf.addImage(student.photo_url, 'PNG', pageWidth - 45, 8, 35, 35);
    } catch (error) {
      console.log('Could not add photo');
    }
  }
  
  // Center: School details
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name.toUpperCase(), pageWidth / 2, 15, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  const contactLines = [
    `Location: ${schoolInfo.location || ''}`,
    `P.O BOX: ${schoolInfo.po_box || ''}`,
    `TEL: ${schoolInfo.telephone || ''}`,
  ];
  
  contactLines.forEach((line, index) => {
    if (line.split(': ')[1]) {
      pdf.text(line, pageWidth / 2, 21 + (index * 4), { align: 'center' });
    }
  });
  
  pdf.setTextColor(0, 100, 255);
  pdf.text(`Email: ${schoolInfo.email || ''} Website: ${schoolInfo.website || ''}`, pageWidth / 2, 33, { align: 'center' });
  
  yPosition = 45;
  
  // Title Section with red line
  pdf.setDrawColor(220, 38, 38);
  pdf.setLineWidth(1.5);
  pdf.line(10, yPosition - 2, pageWidth - 10, yPosition - 2);
  
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const reportTitle = `TERM ${term.term_name.toUpperCase()} REPORT CARD ${term.year}`;
  pdf.text(reportTitle, pageWidth / 2, yPosition + 5, { align: 'center' });
  
  pdf.setDrawColor(220, 38, 38);
  pdf.line(10, yPosition + 8, pageWidth - 10, yPosition + 8);
  
  yPosition += 18;
  
  // Student Information Section (table format with thin borders)
  const studentInfoY = yPosition;
  const studentInfoHeight = 18;
  
  // Draw table borders
  drawTableBorder(pdf, 10, studentInfoY, pageWidth - 20, studentInfoHeight);
  drawFaintLine(pdf, 10, studentInfoY + 6, pageWidth - 10, studentInfoY + 6);
  drawFaintLine(pdf, 10, studentInfoY + 12, pageWidth - 10, studentInfoY + 12);
  drawFaintLine(pdf, pageWidth / 2, studentInfoY, pageWidth / 2, studentInfoY + 12);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  // Row 1
  pdf.text(`NAME:`, 12, studentInfoY + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(student.name.toUpperCase(), 30, studentInfoY + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`GENDER:`, pageWidth / 2 + 2, studentInfoY + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(student.gender.toUpperCase(), pageWidth / 2 + 22, studentInfoY + 4);
  
  // Row 2
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`SECTION: ${student.classes?.section || 'N/A'}`, 12, studentInfoY + 10);
  pdf.text(`CLASS: ${student.classes?.class_name || 'N/A'}`, 70, studentInfoY + 10);
  pdf.text(`TERM:`, pageWidth / 2 + 2, studentInfoY + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(term.term_name.toUpperCase(), pageWidth / 2 + 18, studentInfoY + 10);
  
  // Row 3
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`House`, 12, studentInfoY + 16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(student.house || 'N/A', 30, studentInfoY + 16);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Age`, 70, studentInfoY + 16);
  pdf.text(`Printed on ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2 + 2, studentInfoY + 16);
  
  yPosition = studentInfoY + studentInfoHeight + 10;
  
  // Performance Records Section Title
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PERFORMANCE RECORDS', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  
  // Performance Records Table
  const tableStartY = yPosition;
  const headers = ['Code', 'Subject', 'A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'Ident', 'GRADE', 'Remarks/Descriptors', 'TR'];
  const colWidths = [12, 32, 10, 10, 10, 11, 11, 11, 11, 11, 13, 35, 12];
  const colX = [10, 22, 54, 64, 74, 84, 95, 106, 117, 128, 139, 152, 187];
  
  // Draw header background
  pdf.setFillColor(30, 64, 175);
  pdf.rect(10, yPosition - 4, pageWidth - 20, 7, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  
  headers.forEach((header, index) => {
    pdf.text(header, colX[index] + 1, yPosition + 1);
  });
  
  yPosition += 5;
  
  // Draw table rows
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  
  marks.forEach((mark, index) => {
    // Draw faint horizontal line
    drawFaintLine(pdf, 10, yPosition, pageWidth - 10, yPosition);
    
    const rowData = [
      mark.subject_code || '',
      mark.subjects?.subject_name || 'Unknown',
      mark.a1_score?.toFixed(1) || '',
      mark.a2_score?.toFixed(1) || '',
      mark.a3_score?.toFixed(1) || '',
      mark.average_score?.toFixed(1) || '',
      mark.twenty_percent?.toFixed(1) || '',
      mark.eighty_percent?.toFixed(1) || '',
      mark.hundred_percent?.toFixed(1) || '',
      mark.identifier?.toString() || '',
      mark.final_grade || '',
      mark.achievement_level || '',
      mark.teacher_initials || ''
    ];
    
    rowData.forEach((data, colIndex) => {
      pdf.text(data, colX[colIndex] + 1, yPosition + 4);
    });
    
    yPosition += 5.5;
  });
  
  // Draw bottom line and outer borders
  drawFaintLine(pdf, 10, yPosition, pageWidth - 10, yPosition);
  drawTableBorder(pdf, 10, tableStartY - 4, pageWidth - 20, yPosition - tableStartY + 4);
  
  // Draw vertical lines
  colX.forEach((x, index) => {
    if (index > 0) {
      drawFaintLine(pdf, x, tableStartY - 4, x, yPosition);
    }
  });
  drawFaintLine(pdf, pageWidth - 10, tableStartY - 4, pageWidth - 10, yPosition);
  
  yPosition += 8;
  
  // Summary Row
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('AVERAGE:', 10, yPosition);
  pdf.text(reportData.overall_average?.toFixed(1) || '0.0', 95, yPosition);
  
  pdf.text('Overall Identifier', 12, yPosition + 5);
  pdf.setTextColor(30, 64, 175);
  pdf.text(reportData.overall_identifier?.toString() || '2', 50, yPosition + 5);
  
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall Achievement', 75, yPosition + 5);
  pdf.setTextColor(30, 64, 175);
  pdf.text(reportData.achievement_level || 'Moderate', 115, yPosition + 5);
  
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall grade', 155, yPosition + 5);
  pdf.setTextColor(30, 64, 175);
  pdf.text(reportData.overall_grade || 'B', 185, yPosition + 5);
  
  yPosition += 15;
  
  // Grades Table Section
  const gradeTableY = yPosition;
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  // Draw grades table
  drawTableBorder(pdf, 40, gradeTableY, 130, 12);
  drawFaintLine(pdf, 40, gradeTableY + 6, 170, gradeTableY + 6);
  
  const gradeHeaders = ['GRADE', 'A', 'B', 'C', 'D', 'E'];
  const gradeX = [42, 68, 94, 120, 146, 160];
  
  gradeHeaders.forEach((grade, index) => {
    pdf.text(grade, gradeX[index], gradeTableY + 4);
  });
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('SCORES', 42, gradeTableY + 10);
  const gradeRanges = ['100 - 80', '80 - 70', '69 - 60', '60 - 40', '40 - 0'];
  gradeRanges.forEach((range, index) => {
    pdf.text(range, gradeX[index + 1], gradeTableY + 10);
  });
  
  // Draw vertical lines for grade table
  [68, 94, 120, 146, 160, 170].forEach(x => {
    drawFaintLine(pdf, x, gradeTableY, x, gradeTableY + 12);
  });
  
  yPosition = gradeTableY + 20;
  
  // Comments Section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text("Class teacher's Comment:", 10, yPosition);
  
  yPosition += 5;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  
  const teacherCommentLines = pdf.splitTextToSize(reportData.class_teacher_comment || 'No comment provided.', pageWidth - 20);
  teacherCommentLines.forEach((line: string) => {
    pdf.text(line, 10, yPosition);
    yPosition += 4;
  });
  
  yPosition += 3;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text("Headteacher's Comment:", 10, yPosition);
  
  yPosition += 5;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  
  const headCommentLines = pdf.splitTextToSize(reportData.headteacher_comment || 'No comment provided.', pageWidth - 20);
  headCommentLines.forEach((line: string) => {
    pdf.text(line, 10, yPosition);
    yPosition += 4;
  });
  
  yPosition += 5;
  
  // Key to Terms Used Section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Key to Terms Used:', 10, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text('A1 Average Chapter Assessment  80% End of term assessment', 40, yPosition);
  
  yPosition += 5;
  
  const keyTerms = [
    '1 - Basic         0.9-1.49 Few LOs achieved, but not sufficient for overall achievement',
    '2 - Moderate      1.5-2.49 Many LOs achieved, enough for overall achievement',
    '3 - Outstanding   2.5-3.0 Most or all LOs achieved for overall achievement'
  ];
  
  pdf.setFontSize(7);
  keyTerms.forEach((term) => {
    pdf.text(term, 10, yPosition);
    yPosition += 4;
  });
  
  yPosition += 5;
  
  // Term Dates & Fees Section
  const termEndDate = new Date(term.end_date).toLocaleDateString('en-GB');
  const nextTermDate = new Date(new Date(term.end_date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  pdf.text(termEndDate, 25, yPosition);
  pdf.text(nextTermDate, 70, yPosition);
  pdf.text('FEES BALANCE  FEES NEXT TERM', 115, yPosition);
  pdf.text('Other Requirement', 170, yPosition);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('TERM ENDED ON', 10, yPosition + 4);
  pdf.text('NEXT TERM BEGINS', 60, yPosition + 4);
  
  yPosition += 12;
  
  // Footer Section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const motto = schoolInfo.motto || 'Work hard to excel';
  pdf.text(motto, pageWidth / 2, yPosition, { align: 'center' });
  
  return pdf;
};

export const generateModernTemplate = (data: TemplateData) => {
  const { student, term, schoolInfo, marks, reportData } = data;
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Add border around entire document
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
  
  let yPosition = 15;
  
  // Header Section
  if (schoolInfo.logo_url && schoolInfo.logo_url.startsWith('data:image')) {
    try {
      pdf.addImage(schoolInfo.logo_url, 'PNG', 10, 8, 25, 25);
    } catch (error) {
      console.log('Could not add logo');
    }
  }
  
  if (student.photo_url && student.photo_url.startsWith('data:image')) {
    try {
      pdf.addImage(student.photo_url, 'PNG', pageWidth - 45, 8, 35, 35);
    } catch (error) {
      console.log('Could not add photo');
    }
  }
  
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name.toUpperCase(), pageWidth / 2, 15, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  const contactLines = [
    `Location: ${schoolInfo.location || ''}`,
    `P.O BOX: ${schoolInfo.po_box || ''}`,
    `TEL: ${schoolInfo.telephone || ''}`,
  ];
  
  contactLines.forEach((line, index) => {
    if (line.split(': ')[1]) {
      pdf.text(line, pageWidth / 2, 21 + (index * 4), { align: 'center' });
    }
  });
  
  pdf.setTextColor(0, 100, 255);
  pdf.text(`Email: ${schoolInfo.email || ''} Website: ${schoolInfo.website || ''}`, pageWidth / 2, 33, { align: 'center' });
  
  yPosition = 45;
  
  pdf.setDrawColor(220, 38, 38);
  pdf.setLineWidth(1.5);
  pdf.line(10, yPosition - 2, pageWidth - 10, yPosition - 2);
  
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const reportTitle = `TERM ${term.term_name.toUpperCase()} REPORT CARD ${term.year}`;
  pdf.text(reportTitle, pageWidth / 2, yPosition + 5, { align: 'center' });
  
  pdf.setDrawColor(220, 38, 38);
  pdf.line(10, yPosition + 8, pageWidth - 10, yPosition + 8);
  
  yPosition += 18;
  
  // Student Information Section
  const studentInfoY = yPosition;
  const studentInfoHeight = 18;
  
  drawTableBorder(pdf, 10, studentInfoY, pageWidth - 20, studentInfoHeight);
  drawFaintLine(pdf, 10, studentInfoY + 6, pageWidth - 10, studentInfoY + 6);
  drawFaintLine(pdf, 10, studentInfoY + 12, pageWidth - 10, studentInfoY + 12);
  drawFaintLine(pdf, pageWidth / 2, studentInfoY, pageWidth / 2, studentInfoY + 12);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text(`NAME:`, 12, studentInfoY + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(student.name.toUpperCase(), 30, studentInfoY + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`GENDER:`, pageWidth / 2 + 2, studentInfoY + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(student.gender.toUpperCase(), pageWidth / 2 + 22, studentInfoY + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`SECTION: ${student.classes?.section || 'N/A'}`, 12, studentInfoY + 10);
  pdf.text(`CLASS: ${student.classes?.class_name || 'N/A'}`, 70, studentInfoY + 10);
  pdf.text(`TERM:`, pageWidth / 2 + 2, studentInfoY + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(term.term_name.toUpperCase(), pageWidth / 2 + 18, studentInfoY + 10);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`House`, 12, studentInfoY + 16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(student.house || 'N/A', 30, studentInfoY + 16);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Age`, 70, studentInfoY + 16);
  pdf.text(`Printed on ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2 + 2, studentInfoY + 16);
  
  yPosition = studentInfoY + studentInfoHeight + 10;
  
  // Performance Records
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PERFORMANCE RECORDS', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  
  const tableStartY = yPosition;
  const headers = ['Code', 'Subject', 'A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'Ident', 'GRADE', 'Remarks/Descriptors', 'TR'];
  const colX = [10, 22, 54, 64, 74, 84, 95, 106, 117, 128, 139, 152, 187];
  
  pdf.setFillColor(30, 64, 175);
  pdf.rect(10, yPosition - 4, pageWidth - 20, 7, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  
  headers.forEach((header, index) => {
    pdf.text(header, colX[index] + 1, yPosition + 1);
  });
  
  yPosition += 5;
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  
  marks.forEach((mark) => {
    drawFaintLine(pdf, 10, yPosition, pageWidth - 10, yPosition);
    
    const rowData = [
      mark.subject_code || '',
      mark.subjects?.subject_name || 'Unknown',
      mark.a1_score?.toFixed(1) || '',
      mark.a2_score?.toFixed(1) || '',
      mark.a3_score?.toFixed(1) || '',
      mark.average_score?.toFixed(1) || '',
      mark.twenty_percent?.toFixed(1) || '',
      mark.eighty_percent?.toFixed(1) || '',
      mark.hundred_percent?.toFixed(1) || '',
      mark.identifier?.toString() || '',
      mark.final_grade || '',
      mark.achievement_level || '',
      mark.teacher_initials || ''
    ];
    
    rowData.forEach((data, colIndex) => {
      pdf.text(data, colX[colIndex] + 1, yPosition + 4);
    });
    
    yPosition += 5.5;
  });
  
  drawFaintLine(pdf, 10, yPosition, pageWidth - 10, yPosition);
  drawTableBorder(pdf, 10, tableStartY - 4, pageWidth - 20, yPosition - tableStartY + 4);
  
  colX.forEach((x, index) => {
    if (index > 0) {
      drawFaintLine(pdf, x, tableStartY - 4, x, yPosition);
    }
  });
  drawFaintLine(pdf, pageWidth - 10, tableStartY - 4, pageWidth - 10, yPosition);
  
  yPosition += 8;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('AVERAGE:', 10, yPosition);
  pdf.text(reportData.overall_average?.toFixed(1) || '0.0', 95, yPosition);
  
  pdf.text('Overall Identifier', 12, yPosition + 5);
  pdf.setTextColor(30, 64, 175);
  pdf.text(reportData.overall_identifier?.toString() || '2', 50, yPosition + 5);
  
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall Achievement', 75, yPosition + 5);
  pdf.setTextColor(30, 64, 175);
  pdf.text(reportData.achievement_level || 'Moderate', 115, yPosition + 5);
  
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall grade', 155, yPosition + 5);
  pdf.setTextColor(30, 64, 175);
  pdf.text(reportData.overall_grade || 'B', 185, yPosition + 5);
  
  yPosition += 15;
  
  // Grades Table
  const gradeTableY = yPosition;
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  drawTableBorder(pdf, 40, gradeTableY, 130, 12);
  drawFaintLine(pdf, 40, gradeTableY + 6, 170, gradeTableY + 6);
  
  const gradeHeaders = ['GRADE', 'A', 'B', 'C', 'D', 'E'];
  const gradeX = [42, 68, 94, 120, 146, 160];
  
  gradeHeaders.forEach((grade, index) => {
    pdf.text(grade, gradeX[index], gradeTableY + 4);
  });
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('SCORES', 42, gradeTableY + 10);
  const gradeRanges = ['100 - 80', '80 - 70', '69 - 60', '60 - 40', '40 - 0'];
  gradeRanges.forEach((range, index) => {
    pdf.text(range, gradeX[index + 1], gradeTableY + 10);
  });
  
  [68, 94, 120, 146, 160, 170].forEach(x => {
    drawFaintLine(pdf, x, gradeTableY, x, gradeTableY + 12);
  });
  
  yPosition = gradeTableY + 20;
  
  // Comments
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text("Class teacher's Comment:", 10, yPosition);
  
  yPosition += 5;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  
  const teacherCommentLines = pdf.splitTextToSize(reportData.class_teacher_comment || 'No comment provided.', pageWidth - 20);
  teacherCommentLines.forEach((line: string) => {
    pdf.text(line, 10, yPosition);
    yPosition += 4;
  });
  
  yPosition += 3;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text("Headteacher's Comment:", 10, yPosition);
  
  yPosition += 5;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  
  const headCommentLines = pdf.splitTextToSize(reportData.headteacher_comment || 'No comment provided.', pageWidth - 20);
  headCommentLines.forEach((line: string) => {
    pdf.text(line, 10, yPosition);
    yPosition += 4;
  });
  
  yPosition += 5;
  
  // Key to Terms
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Key to Terms Used:', 10, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text('A1 Average Chapter Assessment  80% End of term assessment', 40, yPosition);
  
  yPosition += 5;
  
  const keyTerms = [
    '1 - Basic         0.9-1.49 Few LOs achieved, but not sufficient for overall achievement',
    '2 - Moderate      1.5-2.49 Many LOs achieved, enough for overall achievement',
    '3 - Outstanding   2.5-3.0 Most or all LOs achieved for overall achievement'
  ];
  
  pdf.setFontSize(7);
  keyTerms.forEach((term) => {
    pdf.text(term, 10, yPosition);
    yPosition += 4;
  });
  
  yPosition += 5;
  
  // Term Dates & Fees
  const termEndDate = new Date(term.end_date).toLocaleDateString('en-GB');
  const nextTermDate = new Date(new Date(term.end_date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  pdf.text(termEndDate, 25, yPosition);
  pdf.text(nextTermDate, 70, yPosition);
  pdf.text('FEES BALANCE  FEES NEXT TERM', 115, yPosition);
  pdf.text('Other Requirement', 170, yPosition);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('TERM ENDED ON', 10, yPosition + 4);
  pdf.text('NEXT TERM BEGINS', 60, yPosition + 4);
  
  yPosition += 12;
  
  // Footer
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const motto = schoolInfo.motto || 'Work hard to excel';
  pdf.text(motto, pageWidth / 2, yPosition, { align: 'center' });
  
  return pdf;
};

export const generateProfessionalTemplate = (data: TemplateData) => {
  const { student, term, schoolInfo, marks, reportData } = data;
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Add border around entire document
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
  
  let yPosition = 15;
  
  // Header Section
  if (schoolInfo.logo_url && schoolInfo.logo_url.startsWith('data:image')) {
    try {
      pdf.addImage(schoolInfo.logo_url, 'PNG', 10, 8, 25, 25);
    } catch (error) {
      console.log('Could not add logo');
    }
  }
  
  if (student.photo_url && student.photo_url.startsWith('data:image')) {
    try {
      pdf.addImage(student.photo_url, 'PNG', pageWidth - 45, 8, 35, 35);
    } catch (error) {
      console.log('Could not add photo');
    }
  }
  
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name.toUpperCase(), pageWidth / 2, 15, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  const contactLines = [
    `Location: ${schoolInfo.location || ''}`,
    `P.O BOX: ${schoolInfo.po_box || ''}`,
    `TEL: ${schoolInfo.telephone || ''}`,
  ];
  
  contactLines.forEach((line, index) => {
    if (line.split(': ')[1]) {
      pdf.text(line, pageWidth / 2, 21 + (index * 4), { align: 'center' });
    }
  });
  
  pdf.setTextColor(0, 100, 255);
  pdf.text(`Email: ${schoolInfo.email || ''} Website: ${schoolInfo.website || ''}`, pageWidth / 2, 33, { align: 'center' });
  
  yPosition = 45;
  
  pdf.setDrawColor(220, 38, 38);
  pdf.setLineWidth(1.5);
  pdf.line(10, yPosition - 2, pageWidth - 10, yPosition - 2);
  
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const reportTitle = `TERM ${term.term_name.toUpperCase()} REPORT CARD ${term.year}`;
  pdf.text(reportTitle, pageWidth / 2, yPosition + 5, { align: 'center' });
  
  pdf.setDrawColor(220, 38, 38);
  pdf.line(10, yPosition + 8, pageWidth - 10, yPosition + 8);
  
  yPosition += 18;
  
  // Student Information Section
  const studentInfoY = yPosition;
  const studentInfoHeight = 18;
  
  drawTableBorder(pdf, 10, studentInfoY, pageWidth - 20, studentInfoHeight);
  drawFaintLine(pdf, 10, studentInfoY + 6, pageWidth - 10, studentInfoY + 6);
  drawFaintLine(pdf, 10, studentInfoY + 12, pageWidth - 10, studentInfoY + 12);
  drawFaintLine(pdf, pageWidth / 2, studentInfoY, pageWidth / 2, studentInfoY + 12);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text(`NAME:`, 12, studentInfoY + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(student.name.toUpperCase(), 30, studentInfoY + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`GENDER:`, pageWidth / 2 + 2, studentInfoY + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(student.gender.toUpperCase(), pageWidth / 2 + 22, studentInfoY + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`SECTION: ${student.classes?.section || 'N/A'}`, 12, studentInfoY + 10);
  pdf.text(`CLASS: ${student.classes?.class_name || 'N/A'}`, 70, studentInfoY + 10);
  pdf.text(`TERM:`, pageWidth / 2 + 2, studentInfoY + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(term.term_name.toUpperCase(), pageWidth / 2 + 18, studentInfoY + 10);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`House`, 12, studentInfoY + 16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(student.house || 'N/A', 30, studentInfoY + 16);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Age`, 70, studentInfoY + 16);
  pdf.text(`Printed on ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2 + 2, studentInfoY + 16);
  
  yPosition = studentInfoY + studentInfoHeight + 10;
  
  // Performance Records
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PERFORMANCE RECORDS', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  
  const tableStartY = yPosition;
  const headers = ['Code', 'Subject', 'A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'Ident', 'GRADE', 'Remarks/Descriptors', 'TR'];
  const colX = [10, 22, 54, 64, 74, 84, 95, 106, 117, 128, 139, 152, 187];
  
  pdf.setFillColor(30, 64, 175);
  pdf.rect(10, yPosition - 4, pageWidth - 20, 7, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  
  headers.forEach((header, index) => {
    pdf.text(header, colX[index] + 1, yPosition + 1);
  });
  
  yPosition += 5;
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  
  marks.forEach((mark) => {
    drawFaintLine(pdf, 10, yPosition, pageWidth - 10, yPosition);
    
    const rowData = [
      mark.subject_code || '',
      mark.subjects?.subject_name || 'Unknown',
      mark.a1_score?.toFixed(1) || '',
      mark.a2_score?.toFixed(1) || '',
      mark.a3_score?.toFixed(1) || '',
      mark.average_score?.toFixed(1) || '',
      mark.twenty_percent?.toFixed(1) || '',
      mark.eighty_percent?.toFixed(1) || '',
      mark.hundred_percent?.toFixed(1) || '',
      mark.identifier?.toString() || '',
      mark.final_grade || '',
      mark.achievement_level || '',
      mark.teacher_initials || ''
    ];
    
    rowData.forEach((data, colIndex) => {
      pdf.text(data, colX[colIndex] + 1, yPosition + 4);
    });
    
    yPosition += 5.5;
  });
  
  drawFaintLine(pdf, 10, yPosition, pageWidth - 10, yPosition);
  drawTableBorder(pdf, 10, tableStartY - 4, pageWidth - 20, yPosition - tableStartY + 4);
  
  colX.forEach((x, index) => {
    if (index > 0) {
      drawFaintLine(pdf, x, tableStartY - 4, x, yPosition);
    }
  });
  drawFaintLine(pdf, pageWidth - 10, tableStartY - 4, pageWidth - 10, yPosition);
  
  yPosition += 8;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('AVERAGE:', 10, yPosition);
  pdf.text(reportData.overall_average?.toFixed(1) || '0.0', 95, yPosition);
  
  pdf.text('Overall Identifier', 12, yPosition + 5);
  pdf.setTextColor(30, 64, 175);
  pdf.text(reportData.overall_identifier?.toString() || '2', 50, yPosition + 5);
  
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall Achievement', 75, yPosition + 5);
  pdf.setTextColor(30, 64, 175);
  pdf.text(reportData.achievement_level || 'Moderate', 115, yPosition + 5);
  
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall grade', 155, yPosition + 5);
  pdf.setTextColor(30, 64, 175);
  pdf.text(reportData.overall_grade || 'B', 185, yPosition + 5);
  
  yPosition += 15;
  
  // Grades Table
  const gradeTableY = yPosition;
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  drawTableBorder(pdf, 40, gradeTableY, 130, 12);
  drawFaintLine(pdf, 40, gradeTableY + 6, 170, gradeTableY + 6);
  
  const gradeHeaders = ['GRADE', 'A', 'B', 'C', 'D', 'E'];
  const gradeX = [42, 68, 94, 120, 146, 160];
  
  gradeHeaders.forEach((grade, index) => {
    pdf.text(grade, gradeX[index], gradeTableY + 4);
  });
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('SCORES', 42, gradeTableY + 10);
  const gradeRanges = ['100 - 80', '80 - 70', '69 - 60', '60 - 40', '40 - 0'];
  gradeRanges.forEach((range, index) => {
    pdf.text(range, gradeX[index + 1], gradeTableY + 10);
  });
  
  [68, 94, 120, 146, 160, 170].forEach(x => {
    drawFaintLine(pdf, x, gradeTableY, x, gradeTableY + 12);
  });
  
  yPosition = gradeTableY + 20;
  
  // Comments
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text("Class teacher's Comment:", 10, yPosition);
  
  yPosition += 5;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  
  const teacherCommentLines = pdf.splitTextToSize(reportData.class_teacher_comment || 'No comment provided.', pageWidth - 20);
  teacherCommentLines.forEach((line: string) => {
    pdf.text(line, 10, yPosition);
    yPosition += 4;
  });
  
  yPosition += 3;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text("Headteacher's Comment:", 10, yPosition);
  
  yPosition += 5;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  
  const headCommentLines = pdf.splitTextToSize(reportData.headteacher_comment || 'No comment provided.', pageWidth - 20);
  headCommentLines.forEach((line: string) => {
    pdf.text(line, 10, yPosition);
    yPosition += 4;
  });
  
  yPosition += 5;
  
  // Key to Terms
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Key to Terms Used:', 10, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text('A1 Average Chapter Assessment  80% End of term assessment', 40, yPosition);
  
  yPosition += 5;
  
  const keyTerms = [
    '1 - Basic         0.9-1.49 Few LOs achieved, but not sufficient for overall achievement',
    '2 - Moderate      1.5-2.49 Many LOs achieved, enough for overall achievement',
    '3 - Outstanding   2.5-3.0 Most or all LOs achieved for overall achievement'
  ];
  
  pdf.setFontSize(7);
  keyTerms.forEach((term) => {
    pdf.text(term, 10, yPosition);
    yPosition += 4;
  });
  
  yPosition += 5;
  
  // Term Dates & Fees
  const termEndDate = new Date(term.end_date).toLocaleDateString('en-GB');
  const nextTermDate = new Date(new Date(term.end_date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  pdf.text(termEndDate, 25, yPosition);
  pdf.text(nextTermDate, 70, yPosition);
  pdf.text('FEES BALANCE  FEES NEXT TERM', 115, yPosition);
  pdf.text('Other Requirement', 170, yPosition);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('TERM ENDED ON', 10, yPosition + 4);
  pdf.text('NEXT TERM BEGINS', 60, yPosition + 4);
  
  yPosition += 12;
  
  // Footer
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const motto = schoolInfo.motto || 'Work hard to excel';
  pdf.text(motto, pageWidth / 2, yPosition, { align: 'center' });
  
  return pdf;
};

export const generateMinimalTemplate = (data: TemplateData) => {
  const { student, term, schoolInfo, marks, reportData } = data;
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Add border around entire document
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
  
  let yPosition = 15;
  
  // Header Section
  if (schoolInfo.logo_url && schoolInfo.logo_url.startsWith('data:image')) {
    try {
      pdf.addImage(schoolInfo.logo_url, 'PNG', 10, 8, 25, 25);
    } catch (error) {
      console.log('Could not add logo');
    }
  }
  
  if (student.photo_url && student.photo_url.startsWith('data:image')) {
    try {
      pdf.addImage(student.photo_url, 'PNG', pageWidth - 45, 8, 35, 35);
    } catch (error) {
      console.log('Could not add photo');
    }
  }
  
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name.toUpperCase(), pageWidth / 2, 15, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  const contactLines = [
    `Location: ${schoolInfo.location || ''}`,
    `P.O BOX: ${schoolInfo.po_box || ''}`,
    `TEL: ${schoolInfo.telephone || ''}`,
  ];
  
  contactLines.forEach((line, index) => {
    if (line.split(': ')[1]) {
      pdf.text(line, pageWidth / 2, 21 + (index * 4), { align: 'center' });
    }
  });
  
  pdf.setTextColor(0, 100, 255);
  pdf.text(`Email: ${schoolInfo.email || ''} Website: ${schoolInfo.website || ''}`, pageWidth / 2, 33, { align: 'center' });
  
  yPosition = 45;
  
  pdf.setDrawColor(220, 38, 38);
  pdf.setLineWidth(1.5);
  pdf.line(10, yPosition - 2, pageWidth - 10, yPosition - 2);
  
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const reportTitle = `TERM ${term.term_name.toUpperCase()} REPORT CARD ${term.year}`;
  pdf.text(reportTitle, pageWidth / 2, yPosition + 5, { align: 'center' });
  
  pdf.setDrawColor(220, 38, 38);
  pdf.line(10, yPosition + 8, pageWidth - 10, yPosition + 8);
  
  yPosition += 18;
  
  // Student Information Section
  const studentInfoY = yPosition;
  const studentInfoHeight = 18;
  
  drawTableBorder(pdf, 10, studentInfoY, pageWidth - 20, studentInfoHeight);
  drawFaintLine(pdf, 10, studentInfoY + 6, pageWidth - 10, studentInfoY + 6);
  drawFaintLine(pdf, 10, studentInfoY + 12, pageWidth - 10, studentInfoY + 12);
  drawFaintLine(pdf, pageWidth / 2, studentInfoY, pageWidth / 2, studentInfoY + 12);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text(`NAME:`, 12, studentInfoY + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(student.name.toUpperCase(), 30, studentInfoY + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`GENDER:`, pageWidth / 2 + 2, studentInfoY + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(student.gender.toUpperCase(), pageWidth / 2 + 22, studentInfoY + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`SECTION: ${student.classes?.section || 'N/A'}`, 12, studentInfoY + 10);
  pdf.text(`CLASS: ${student.classes?.class_name || 'N/A'}`, 70, studentInfoY + 10);
  pdf.text(`TERM:`, pageWidth / 2 + 2, studentInfoY + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(term.term_name.toUpperCase(), pageWidth / 2 + 18, studentInfoY + 10);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`House`, 12, studentInfoY + 16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(student.house || 'N/A', 30, studentInfoY + 16);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Age`, 70, studentInfoY + 16);
  pdf.text(`Printed on ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2 + 2, studentInfoY + 16);
  
  yPosition = studentInfoY + studentInfoHeight + 10;
  
  // Performance Records
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PERFORMANCE RECORDS', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  
  const tableStartY = yPosition;
  const headers = ['Code', 'Subject', 'A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'Ident', 'GRADE', 'Remarks/Descriptors', 'TR'];
  const colX = [10, 22, 54, 64, 74, 84, 95, 106, 117, 128, 139, 152, 187];
  
  pdf.setFillColor(30, 64, 175);
  pdf.rect(10, yPosition - 4, pageWidth - 20, 7, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  
  headers.forEach((header, index) => {
    pdf.text(header, colX[index] + 1, yPosition + 1);
  });
  
  yPosition += 5;
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  
  marks.forEach((mark) => {
    drawFaintLine(pdf, 10, yPosition, pageWidth - 10, yPosition);
    
    const rowData = [
      mark.subject_code || '',
      mark.subjects?.subject_name || 'Unknown',
      mark.a1_score?.toFixed(1) || '',
      mark.a2_score?.toFixed(1) || '',
      mark.a3_score?.toFixed(1) || '',
      mark.average_score?.toFixed(1) || '',
      mark.twenty_percent?.toFixed(1) || '',
      mark.eighty_percent?.toFixed(1) || '',
      mark.hundred_percent?.toFixed(1) || '',
      mark.identifier?.toString() || '',
      mark.final_grade || '',
      mark.achievement_level || '',
      mark.teacher_initials || ''
    ];
    
    rowData.forEach((data, colIndex) => {
      pdf.text(data, colX[colIndex] + 1, yPosition + 4);
    });
    
    yPosition += 5.5;
  });
  
  drawFaintLine(pdf, 10, yPosition, pageWidth - 10, yPosition);
  drawTableBorder(pdf, 10, tableStartY - 4, pageWidth - 20, yPosition - tableStartY + 4);
  
  colX.forEach((x, index) => {
    if (index > 0) {
      drawFaintLine(pdf, x, tableStartY - 4, x, yPosition);
    }
  });
  drawFaintLine(pdf, pageWidth - 10, tableStartY - 4, pageWidth - 10, yPosition);
  
  yPosition += 8;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('AVERAGE:', 10, yPosition);
  pdf.text(reportData.overall_average?.toFixed(1) || '0.0', 95, yPosition);
  
  pdf.text('Overall Identifier', 12, yPosition + 5);
  pdf.setTextColor(30, 64, 175);
  pdf.text(reportData.overall_identifier?.toString() || '2', 50, yPosition + 5);
  
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall Achievement', 75, yPosition + 5);
  pdf.setTextColor(30, 64, 175);
  pdf.text(reportData.achievement_level || 'Moderate', 115, yPosition + 5);
  
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall grade', 155, yPosition + 5);
  pdf.setTextColor(30, 64, 175);
  pdf.text(reportData.overall_grade || 'B', 185, yPosition + 5);
  
  yPosition += 15;
  
  // Grades Table
  const gradeTableY = yPosition;
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  drawTableBorder(pdf, 40, gradeTableY, 130, 12);
  drawFaintLine(pdf, 40, gradeTableY + 6, 170, gradeTableY + 6);
  
  const gradeHeaders = ['GRADE', 'A', 'B', 'C', 'D', 'E'];
  const gradeX = [42, 68, 94, 120, 146, 160];
  
  gradeHeaders.forEach((grade, index) => {
    pdf.text(grade, gradeX[index], gradeTableY + 4);
  });
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('SCORES', 42, gradeTableY + 10);
  const gradeRanges = ['100 - 80', '80 - 70', '69 - 60', '60 - 40', '40 - 0'];
  gradeRanges.forEach((range, index) => {
    pdf.text(range, gradeX[index + 1], gradeTableY + 10);
  });
  
  [68, 94, 120, 146, 160, 170].forEach(x => {
    drawFaintLine(pdf, x, gradeTableY, x, gradeTableY + 12);
  });
  
  yPosition = gradeTableY + 20;
  
  // Comments
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text("Class teacher's Comment:", 10, yPosition);
  
  yPosition += 5;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  
  const teacherCommentLines = pdf.splitTextToSize(reportData.class_teacher_comment || 'No comment provided.', pageWidth - 20);
  teacherCommentLines.forEach((line: string) => {
    pdf.text(line, 10, yPosition);
    yPosition += 4;
  });
  
  yPosition += 3;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text("Headteacher's Comment:", 10, yPosition);
  
  yPosition += 5;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  
  const headCommentLines = pdf.splitTextToSize(reportData.headteacher_comment || 'No comment provided.', pageWidth - 20);
  headCommentLines.forEach((line: string) => {
    pdf.text(line, 10, yPosition);
    yPosition += 4;
  });
  
  yPosition += 5;
  
  // Key to Terms
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Key to Terms Used:', 10, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text('A1 Average Chapter Assessment  80% End of term assessment', 40, yPosition);
  
  yPosition += 5;
  
  const keyTerms = [
    '1 - Basic         0.9-1.49 Few LOs achieved, but not sufficient for overall achievement',
    '2 - Moderate      1.5-2.49 Many LOs achieved, enough for overall achievement',
    '3 - Outstanding   2.5-3.0 Most or all LOs achieved for overall achievement'
  ];
  
  pdf.setFontSize(7);
  keyTerms.forEach((term) => {
    pdf.text(term, 10, yPosition);
    yPosition += 4;
  });
  
  yPosition += 5;
  
  // Term Dates & Fees
  const termEndDate = new Date(term.end_date).toLocaleDateString('en-GB');
  const nextTermDate = new Date(new Date(term.end_date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  pdf.text(termEndDate, 25, yPosition);
  pdf.text(nextTermDate, 70, yPosition);
  pdf.text('FEES BALANCE  FEES NEXT TERM', 115, yPosition);
  pdf.text('Other Requirement', 170, yPosition);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('TERM ENDED ON', 10, yPosition + 4);
  pdf.text('NEXT TERM BEGINS', 60, yPosition + 4);
  
  yPosition += 12;
  
  // Footer
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const motto = schoolInfo.motto || 'Work hard to excel';
  pdf.text(motto, pageWidth / 2, yPosition, { align: 'center' });
  
  return pdf;
};
