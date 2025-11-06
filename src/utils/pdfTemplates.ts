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
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Add border around entire document
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.8);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
  
  let yPosition = 12;
  
  // Header Section
  // Left: School logo placeholder (small demarcated box)
  const logoBoxSize = 25;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.rect(10, yPosition, logoBoxSize, logoBoxSize);
  
  if (schoolInfo.logo_url && schoolInfo.logo_url.startsWith('data:image')) {
    try {
      pdf.addImage(schoolInfo.logo_url, 'PNG', 10.5, yPosition + 0.5, logoBoxSize - 1, logoBoxSize - 1);
    } catch (error) {
      console.log('Could not add logo');
    }
  }
  
  // Right: Student photo demarcation box
  const photoBoxX = pageWidth - 35;
  const photoBoxY = yPosition;
  const photoBoxSize = 35;
  
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.rect(photoBoxX, photoBoxY, photoBoxSize, photoBoxSize);
  
  if (student.photo_url && student.photo_url.startsWith('data:image')) {
    try {
      pdf.addImage(student.photo_url, 'PNG', photoBoxX + 0.5, photoBoxY + 0.5, photoBoxSize - 1, photoBoxSize - 1);
    } catch (error) {
      console.log('Could not add photo');
    }
  }
  
  // Center: School details
  pdf.setTextColor(0, 0, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name.toUpperCase(), pageWidth / 2, yPosition + 8, { align: 'center' });
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.text(`"${schoolInfo.motto || 'Nibizi iva are'}"`, pageWidth / 2, yPosition + 13, { align: 'center' });
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(7);
  pdf.text(`Location: ${schoolInfo.location || 'Kibizi'}`, pageWidth / 2, yPosition + 18, { align: 'center' });
  pdf.text(`P.O.BOX: ${schoolInfo.po_box || '104 Kampala'}`, pageWidth / 2, yPosition + 22, { align: 'center' });
  pdf.text(`TEL: ${schoolInfo.telephone || '+256705746484'}`, pageWidth / 2, yPosition + 26, { align: 'center' });
  
  pdf.setTextColor(0, 0, 255);
  pdf.setFontSize(6.5);
  pdf.text(`Email: ${schoolInfo.email || 'mugabifood@gmail.com'} | Website: ${schoolInfo.website || 'mugabifood@gmail.com'}`, pageWidth / 2, yPosition + 30, { align: 'center' });
  
  yPosition = 50;
  
  // Title Section
  pdf.setTextColor(0, 0, 255);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  const reportTitle = `TERM ${term.term_name.toUpperCase()} REPORT CARD ${term.year}`;
  pdf.text(reportTitle, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 7;
  
  // Student Information Table
  const studentInfoY = yPosition;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.rect(10, studentInfoY, pageWidth - 20, 15);
  
  // Horizontal lines
  pdf.line(10, studentInfoY + 5, pageWidth - 10, studentInfoY + 5);
  pdf.line(10, studentInfoY + 10, pageWidth - 10, studentInfoY + 10);
  
  // Vertical lines
  pdf.line(80, studentInfoY, 80, studentInfoY + 5);
  pdf.line(145, studentInfoY, 145, studentInfoY + 10);
  pdf.line(80, studentInfoY + 5, 80, studentInfoY + 10);
  pdf.line(35, studentInfoY + 10, 35, studentInfoY + 15);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  
  // Row 1
  pdf.text('NAME:', 12, studentInfoY + 3.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 255);
  pdf.text(student.name.toUpperCase(), 28, studentInfoY + 3.5);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('GENDER:', 82, studentInfoY + 3.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 255);
  pdf.text(student.gender.toUpperCase(), 100, studentInfoY + 3.5);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('TERM:', 147, studentInfoY + 3.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 255);
  pdf.text(term.term_name.toUpperCase(), 162, studentInfoY + 3.5);
  
  // Row 2
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('SECTION:', 12, studentInfoY + 8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(student.classes?.section || 'East', 30, studentInfoY + 8.5);
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('CLASS:', 82, studentInfoY + 8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(student.classes?.class_name || 'S 1', 97, studentInfoY + 8.5);
  
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Printed on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, 147, studentInfoY + 8.5);
  
  // Row 3
  pdf.text('House', 12, studentInfoY + 13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 255);
  pdf.text(student.house || 'Blue', 24, studentInfoY + 13);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Age', 37, studentInfoY + 13);
  pdf.setFont('helvetica', 'bold');
  pdf.text(student.age?.toString() || 'N/A', 47, studentInfoY + 13);
  
  yPosition = studentInfoY + 20;
  
  // Performance Records Section
  pdf.setFillColor(0, 0, 255);
  pdf.rect(10, yPosition, pageWidth - 20, 5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PERFORMANCE RECORDS', pageWidth / 2, yPosition + 3.5, { align: 'center' });
  
  yPosition += 5;
  
  // Performance Table Header
  const tableStartY = yPosition;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.rect(10, yPosition, pageWidth - 20, 5);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  
  const headers = ['Code', 'Subject', 'A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'Ident', 'GRADE', 'Remarks/Descriptors', 'TR'];
  const colX = [11, 24, 54, 61, 68, 75, 84, 93, 102, 112, 122, 136, 188];
  
  headers.forEach((header, index) => {
    pdf.text(header, colX[index], yPosition + 3.5);
  });
  
  yPosition += 5;
  
  // Table rows
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  
  marks.forEach((mark, index) => {
    const rowHeight = 5;
    
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
      pdf.text(data, colX[colIndex], yPosition + 3.5);
    });
    
    // Draw horizontal line
    pdf.line(10, yPosition + rowHeight, pageWidth - 10, yPosition + rowHeight);
    
    yPosition += rowHeight;
  });
  
  // Draw table border
  pdf.setLineWidth(0.2);
  pdf.rect(10, tableStartY, pageWidth - 20, yPosition - tableStartY);
  
  // Draw vertical lines
  const verticalX = [10, 23, 53, 60, 67, 74, 83, 92, 101, 111, 121, 135, 187, pageWidth - 10];
  verticalX.forEach(x => {
    pdf.line(x, tableStartY, x, yPosition);
  });
  
  yPosition += 1;
  
  // AVERAGE row
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('AVERAGE:', 11, yPosition + 3);
  pdf.text(reportData.overall_average?.toFixed(0) || '2', 84, yPosition + 3);
  
  yPosition += 6;
  
  // Overall stats row
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.rect(10, yPosition, pageWidth - 20, 5);
  pdf.line(42, yPosition, 42, yPosition + 5);
  pdf.line(110, yPosition, 110, yPosition + 5);
  pdf.line(155, yPosition, 155, yPosition + 5);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(6.5);
  pdf.text('Overall Identifier', 12, yPosition + 3.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(reportData.overall_identifier?.toString() || '2', 35, yPosition + 3.5);
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Overall Achievement', 44, yPosition + 3.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 255);
  pdf.text(reportData.achievement_level || 'Moderate', 80, yPosition + 3.5);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall grade', 112, yPosition + 3.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 255);
  pdf.setFontSize(10);
  pdf.text(reportData.overall_grade || 'F', 145, yPosition + 3.8);
  
  yPosition += 8;
  
  // GRADE SCORES Table
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  
  const gradeTableY = yPosition;
  pdf.rect(25, gradeTableY, 155, 5);
  pdf.rect(25, gradeTableY + 5, 155, 5);
  
  const gradeX = [27, 56, 87, 118, 149, 166];
  const gradeLabels = ['GRADE', 'A', 'B', 'C', 'D', 'E'];
  
  gradeLabels.forEach((label, index) => {
    pdf.text(label, gradeX[index], gradeTableY + 3.5);
    if (index > 0) {
      pdf.line(gradeX[index] - 2, gradeTableY, gradeX[index] - 2, gradeTableY + 10);
    }
  });
  
  pdf.text('SCORES', 27, gradeTableY + 8.5);
  const ranges = ['100 - 80', '80 - 70', '69 - 60', '60 - 40', '40 - 0'];
  pdf.setFont('helvetica', 'normal');
  ranges.forEach((range, index) => {
    pdf.text(range, gradeX[index + 1], gradeTableY + 8.5);
  });
  
  yPosition = gradeTableY + 14;
  
  // Comments Section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Class teacher's Comment:", 10, yPosition);
  
  yPosition += 3;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(6.5);
  
  const teacherCommentLines = pdf.splitTextToSize(reportData.class_teacher_comment || 'No comment provided', pageWidth - 20);
  teacherCommentLines.forEach((line: string) => {
    pdf.text(line, 10, yPosition);
    yPosition += 3;
  });
  
  yPosition += 2;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text("Headteacher's Comment:", 10, yPosition);
  
  yPosition += 3;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(6.5);
  
  const headCommentLines = pdf.splitTextToSize(reportData.headteacher_comment || 'No comment provided', pageWidth - 20);
  headCommentLines.forEach((line: string) => {
    pdf.text(line, 10, yPosition);
    yPosition += 3;
  });
  
  yPosition += 3;
  
  // Key to Terms Used
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Key to Terms Used: A1 Average Chapter Assessment 80% End of term assessment', 10, yPosition);
  
  yPosition += 3.5;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.text('1 -', 10, yPosition);
  pdf.setFont('helvetica', 'bold');
  pdf.text('0.9- Few LOs achieved, but not sufficient for overall', 18, yPosition);
  
  yPosition += 3;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Basic 1.49 achievement', 35, yPosition);
  
  yPosition += 3.5;
  pdf.text('2 -', 10, yPosition);
  pdf.setFont('helvetica', 'bold');
  pdf.text('1.5- Many LOs achieved,', 18, yPosition);
  
  yPosition += 3;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Moderate 2.49 enough for overall achievement', 35, yPosition);
  
  yPosition += 3.5;
  pdf.text('3 -', 10, yPosition);
  pdf.setFont('helvetica', 'bold');
  pdf.text('2.5- Most or all LOs achieved for overall', 18, yPosition);
  
  yPosition += 3;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Outstanding 3.0 achievement', 35, yPosition);
  
  yPosition += 5;
  
  // Footer Section
  const termEndDate = new Date(term.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const nextTermDate = new Date(new Date(term.end_date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  
  pdf.text(termEndDate, 24, yPosition);
  pdf.text(nextTermDate, 75, yPosition);
  pdf.text('FEES BALANCE', 120, yPosition);
  pdf.text('FEES NEXT TERM', 145, yPosition);
  pdf.text('Other Requirement', 175, yPosition);
  
  yPosition += 3.5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.text('TERM ENDED ON', 10, yPosition);
  pdf.text('NEXT TERM BEGINS', 62, yPosition);
  
  yPosition += 5;
  
  // Motto
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  const motto = schoolInfo.motto || 'Work hard to excel';
  pdf.text(motto, pageWidth / 2, yPosition, { align: 'center' });
  
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
