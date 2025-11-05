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
  const logoBoxSize = 20;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
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
  const photoBoxSize = 30;
  
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
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
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name.toUpperCase(), pageWidth / 2, yPosition + 6, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  pdf.text(schoolInfo.motto || '"Nibizi Iva are"', pageWidth / 2, yPosition + 12, { align: 'center' });
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  pdf.text(`Location: ${schoolInfo.location || 'Kibizi'}`, pageWidth / 2, yPosition + 17, { align: 'center' });
  pdf.text(`P.O BOX: ${schoolInfo.po_box || '104 Kampala'}`, pageWidth / 2, yPosition + 21, { align: 'center' });
  pdf.text(`TEL: ${schoolInfo.telephone || '+256705746484'}`, pageWidth / 2, yPosition + 25, { align: 'center' });
  
  pdf.setTextColor(0, 0, 255);
  pdf.setFontSize(7);
  pdf.text(`Email: ${schoolInfo.email || 'mugabifood@gmail.com'} | Website: ${schoolInfo.website || 'mugabifood@gmail.com'}`, pageWidth / 2, yPosition + 29, { align: 'center' });
  
  yPosition = 47;
  
  // Title Section
  pdf.setTextColor(0, 0, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const reportTitle = `TERM ${term.term_name.toUpperCase()} REPORT CARD ${term.year}`;
  pdf.text(reportTitle, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  
  // Student Information Table
  const studentInfoY = yPosition;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(10, studentInfoY, pageWidth - 20, 18);
  
  // Horizontal lines
  pdf.line(10, studentInfoY + 6, pageWidth - 10, studentInfoY + 6);
  pdf.line(10, studentInfoY + 12, pageWidth - 10, studentInfoY + 12);
  
  // Vertical lines
  pdf.line(70, studentInfoY, 70, studentInfoY + 6);
  pdf.line(140, studentInfoY, 140, studentInfoY + 12);
  pdf.line(70, studentInfoY + 6, 70, studentInfoY + 12);
  pdf.line(30, studentInfoY + 12, 30, studentInfoY + 18);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  
  // Row 1
  pdf.text('NAME:', 12, studentInfoY + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 255);
  pdf.text(student.name.toUpperCase(), 30, studentInfoY + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('GENDER:', 72, studentInfoY + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 255);
  pdf.text(student.gender.toUpperCase(), 92, studentInfoY + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('TERM:', 142, studentInfoY + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 255);
  pdf.text(term.term_name.toUpperCase(), 158, studentInfoY + 4);
  
  // Row 2
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('SECTION:', 12, studentInfoY + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(student.classes?.section || 'East', 32, studentInfoY + 10);
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('CLASS:', 72, studentInfoY + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(student.classes?.class_name || 'S 1', 90, studentInfoY + 10);
  
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Printed on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, 142, studentInfoY + 10);
  
  // Row 3
  pdf.text('House', 12, studentInfoY + 16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 255);
  pdf.text(student.house || 'Blue', 32, studentInfoY + 16);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Age', 72, studentInfoY + 16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(student.age?.toString() || 'N/A', 90, studentInfoY + 16);
  
  yPosition = studentInfoY + 24;
  
  // Performance Records Section
  pdf.setFillColor(0, 0, 255);
  pdf.rect(10, yPosition, pageWidth - 20, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PERFORMANCE RECORDS', pageWidth / 2, yPosition + 4, { align: 'center' });
  
  yPosition += 6;
  
  // Performance Table Header
  const tableStartY = yPosition;
  pdf.setFillColor(0, 0, 255);
  pdf.rect(10, yPosition, pageWidth - 20, 6, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  
  const headers = ['Code', 'Subject', 'A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'Ident', 'GRADE', 'Remarks/Descriptors', 'TR'];
  const colX = [11, 24, 55, 63, 71, 79, 89, 99, 109, 119, 129, 142, 188];
  
  headers.forEach((header, index) => {
    pdf.text(header, colX[index], yPosition + 4);
  });
  
  yPosition += 6;
  
  // Table rows
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  
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
  pdf.setLineWidth(0.5);
  pdf.rect(10, tableStartY, pageWidth - 20, yPosition - tableStartY);
  
  // Draw vertical lines
  const verticalX = [10, 23, 54, 62, 70, 78, 88, 98, 108, 118, 128, 141, 187, pageWidth - 10];
  verticalX.forEach(x => {
    pdf.line(x, tableStartY, x, yPosition);
  });
  
  yPosition += 2;
  
  // AVERAGE row
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('AVERAGE:', 11, yPosition + 3);
  pdf.text(reportData.overall_average?.toFixed(0) || '2', 89, yPosition + 3);
  
  yPosition += 7;
  
  // Overall stats row
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.rect(10, yPosition, pageWidth - 20, 6);
  pdf.line(50, yPosition, 50, yPosition + 6);
  pdf.line(105, yPosition, 105, yPosition + 6);
  pdf.line(150, yPosition, 150, yPosition + 6);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall Identifier', 12, yPosition + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 255);
  pdf.text(reportData.overall_identifier?.toString() || '2', 40, yPosition + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall Achievement', 52, yPosition + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 255);
  pdf.text(reportData.achievement_level || 'Moderate', 88, yPosition + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall grade', 107, yPosition + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 255);
  pdf.setFontSize(12);
  pdf.text(reportData.overall_grade || 'F', 137, yPosition + 4.5);
  
  yPosition += 10;
  
  // GRADE SCORES Table
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  
  const gradeTableY = yPosition;
  pdf.rect(25, gradeTableY, 155, 6);
  pdf.rect(25, gradeTableY + 6, 155, 6);
  
  const gradeX = [27, 58, 89, 120, 151, 165];
  const gradeLabels = ['GRADE', 'A', 'B', 'C', 'D', 'E'];
  
  gradeLabels.forEach((label, index) => {
    pdf.text(label, gradeX[index], gradeTableY + 4);
    if (index > 0) {
      pdf.line(gradeX[index] - 2, gradeTableY, gradeX[index] - 2, gradeTableY + 12);
    }
  });
  
  pdf.text('SCORES', 27, gradeTableY + 10);
  const ranges = ['100 - 80', '80 - 70', '69 - 60', '60 - 40', '40 - 0'];
  pdf.setFont('helvetica', 'normal');
  ranges.forEach((range, index) => {
    pdf.text(range, gradeX[index + 1], gradeTableY + 10);
  });
  
  yPosition = gradeTableY + 18;
  
  // Comments Section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Class teacher's Comment:", 10, yPosition);
  
  yPosition += 4;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7);
  
  const teacherCommentLines = pdf.splitTextToSize(reportData.class_teacher_comment || 'No comment provided', pageWidth - 20);
  teacherCommentLines.forEach((line: string) => {
    pdf.text(line, 10, yPosition);
    yPosition += 3.5;
  });
  
  yPosition += 2;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text("Headteacher's Comment:", 10, yPosition);
  
  yPosition += 4;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7);
  
  const headCommentLines = pdf.splitTextToSize(reportData.headteacher_comment || 'No comment provided', pageWidth - 20);
  headCommentLines.forEach((line: string) => {
    pdf.text(line, 10, yPosition);
    yPosition += 3.5;
  });
  
  yPosition += 4;
  
  // Key to Terms Used
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Key to Terms Used: A1 Average Chapter Assessment 80% End of term assessment', 10, yPosition);
  
  yPosition += 4;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('1 -', 10, yPosition);
  pdf.setFont('helvetica', 'bold');
  pdf.text('0.9- Few LOs achieved, but not sufficient for overall', 20, yPosition);
  
  yPosition += 3.5;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Basic 1.49 achievement', 40, yPosition);
  
  yPosition += 4;
  pdf.text('2 -', 10, yPosition);
  pdf.setFont('helvetica', 'bold');
  pdf.text('1.5- Many LOs achieved,', 20, yPosition);
  
  yPosition += 3.5;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Moderate 2.49 enough for overall achievement', 40, yPosition);
  
  yPosition += 4;
  pdf.text('3 -', 10, yPosition);
  pdf.setFont('helvetica', 'bold');
  pdf.text('2.5- Most or all LOs achieved for overall', 20, yPosition);
  
  yPosition += 3.5;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Outstanding 3.0 achievement', 40, yPosition);
  
  yPosition += 6;
  
  // Footer Section
  const termEndDate = new Date(term.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const nextTermDate = new Date(new Date(term.end_date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  pdf.text(termEndDate, 27, yPosition);
  pdf.text(nextTermDate, 80, yPosition);
  pdf.text('FEES BALANCE', 125, yPosition);
  pdf.text('FEES NEXT TERM', 150, yPosition);
  pdf.text('Other Requirement', 177, yPosition);
  
  yPosition += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('TERM ENDED ON', 10, yPosition);
  pdf.text('NEXT TERM BEGINS', 65, yPosition);
  
  yPosition += 6;
  
  // Motto
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
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
