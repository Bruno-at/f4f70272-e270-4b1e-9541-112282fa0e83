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

export const generateClassicTemplate = (data: TemplateData) => {
  const { student, term, schoolInfo, marks, reportData } = data;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Add blue border around entire document
  pdf.setDrawColor(0, 102, 204);
  pdf.setLineWidth(1.5);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
  
  let yPosition = 12;
  
  // Header Section
  // Left: School logo placeholder
  const logoBoxSize = 22;
  pdf.setDrawColor(0, 102, 204);
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
  const photoBoxX = pageWidth - 38;
  const photoBoxY = yPosition;
  const photoBoxW = 28;
  const photoBoxH = 30;
  
  pdf.setDrawColor(0, 102, 204);
  pdf.setLineWidth(0.5);
  pdf.rect(photoBoxX, photoBoxY, photoBoxW, photoBoxH);
  
  if (student.photo_url && student.photo_url.startsWith('data:image')) {
    try {
      pdf.addImage(student.photo_url, 'PNG', photoBoxX + 0.5, photoBoxY + 0.5, photoBoxW - 1, photoBoxH - 1);
    } catch (error) {
      console.log('Could not add photo');
    }
  }
  
  // Center: School details
  pdf.setTextColor(0, 102, 204);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name.toUpperCase(), pageWidth / 2, yPosition + 7, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`"${schoolInfo.motto || 'Mbizi we are'}"`, pageWidth / 2, yPosition + 12, { align: 'center' });
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Location: ${schoolInfo.location || 'Kibizi'}`, pageWidth / 2, yPosition + 17, { align: 'center' });
  pdf.text(`P.O BOX: ${schoolInfo.po_box || '104 Kampala'}`, pageWidth / 2, yPosition + 21, { align: 'center' });
  pdf.text(`TEL: ${schoolInfo.telephone || '+256705746484'}`, pageWidth / 2, yPosition + 25, { align: 'center' });
  
  pdf.setTextColor(0, 102, 204);
  pdf.setFontSize(7);
  pdf.text(`Email: ${schoolInfo.email || 'mugabifood@gmail.com'} | Website: ${schoolInfo.website || 'mugabifood@gmail.com'}`, pageWidth / 2, yPosition + 29, { align: 'center' });
  
  yPosition = 47;
  
  // Title Section
  pdf.setTextColor(0, 102, 204);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const reportTitle = `TERM ${term.term_name.toUpperCase()} REPORT CARD ${term.year}`;
  pdf.text(reportTitle, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  
  // Student Information - Horizontal Layout with blue lines
  pdf.setDrawColor(0, 102, 204);
  pdf.setLineWidth(0.8);
  pdf.line(10, yPosition, pageWidth - 10, yPosition);
  
  yPosition += 1;
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  // Row 1
  pdf.text('NAME:', 12, yPosition + 4);
  pdf.setTextColor(0, 102, 204);
  pdf.text(student.name.toUpperCase(), 28, yPosition + 4);
  
  pdf.setTextColor(0, 0, 0);
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
  pdf.text('House', 12, yPosition + 14);
  pdf.setTextColor(0, 102, 204);
  pdf.text(student.house || 'Blue', 26, yPosition + 14);
  
  pdf.setTextColor(0, 0, 0);
  pdf.text('Age', 50, yPosition + 14);
  pdf.text(student.age?.toString() || 'N/A', 60, yPosition + 14);
  
  yPosition += 16;
  pdf.setDrawColor(0, 102, 204);
  pdf.setLineWidth(0.8);
  pdf.line(10, yPosition, pageWidth - 10, yPosition);
  
  yPosition += 3;
  
  // Performance Records Section
  pdf.setFillColor(0, 102, 204);
  pdf.rect(10, yPosition, pageWidth - 20, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PERFORMANCE RECORDS', pageWidth / 2, yPosition + 4.5, { align: 'center' });
  
  yPosition += 6;
  
  // Performance Table Header
  const tableStartY = yPosition;
  pdf.setFillColor(220, 235, 250);
  pdf.setDrawColor(0, 102, 204);
  pdf.setLineWidth(0.3);
  pdf.rect(10, yPosition, pageWidth - 20, 6, 'F');
  
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
    pdf.setDrawColor(0, 102, 204);
    pdf.setLineWidth(0.2);
    
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
  pdf.setDrawColor(0, 102, 204);
  pdf.setLineWidth(0.3);
  pdf.rect(10, tableStartY, pageWidth - 20, yPosition - tableStartY);
  
  const verticalX = [10, 23, 51, 59, 67, 75, 84, 93, 102, 112, 123, 137, 189, pageWidth - 10];
  verticalX.forEach(x => {
    pdf.line(x, tableStartY, x, yPosition);
  });
  
  // AVERAGE row
  pdf.setFillColor(220, 235, 250);
  pdf.rect(10, yPosition, pageWidth - 20, 5, 'F');
  pdf.setDrawColor(0, 102, 204);
  pdf.rect(10, yPosition, pageWidth - 20, 5);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('AVERAGE:', 12, yPosition + 3.5);
  pdf.text(reportData.overall_average?.toFixed(0) || '0', 85, yPosition + 3.5);
  
  yPosition += 7;
  
  // Overall stats row
  pdf.setFillColor(245, 245, 245);
  pdf.setDrawColor(0, 102, 204);
  pdf.setLineWidth(0.3);
  pdf.rect(10, yPosition, pageWidth - 20, 6, 'F');
  pdf.rect(10, yPosition, pageWidth - 20, 6);
  
  pdf.line(55, yPosition, 55, yPosition + 6);
  pdf.line(115, yPosition, 115, yPosition + 6);
  pdf.line(160, yPosition, 160, yPosition + 6);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(7);
  pdf.text('Overall Identifier', 12, yPosition + 4);
  pdf.setTextColor(0, 102, 204);
  pdf.text(reportData.overall_identifier?.toString() || '0', 45, yPosition + 4);
  
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall Achievement', 57, yPosition + 4);
  pdf.text(reportData.achievement_level || 'N/A', 95, yPosition + 4);
  
  pdf.text('Overall grade', 117, yPosition + 4);
  
  // Grade box
  pdf.setFillColor(0, 102, 204);
  pdf.rect(145, yPosition + 0.5, 12, 5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text(reportData.overall_grade || 'N/A', 151, yPosition + 4.5, { align: 'center' });
  
  yPosition += 9;
  
  // GRADE SCORES Table - Colored
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(0, 102, 204);
  
  const gradeTableY = yPosition;
  const gradeColW = (pageWidth - 20) / 6;
  
  // Grade row
  // GRADE label cell
  pdf.setFillColor(230, 230, 230);
  pdf.rect(10, gradeTableY, gradeColW, 6, 'F');
  pdf.setTextColor(0, 0, 0);
  pdf.text('GRADE', 12, gradeTableY + 4);
  
  // A - Blue
  pdf.setFillColor(66, 133, 244);
  pdf.rect(10 + gradeColW, gradeTableY, gradeColW, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text('A', 10 + gradeColW + gradeColW/2, gradeTableY + 4, { align: 'center' });
  
  // B - Light Blue
  pdf.setFillColor(100, 160, 255);
  pdf.rect(10 + gradeColW*2, gradeTableY, gradeColW, 6, 'F');
  pdf.text('B', 10 + gradeColW*2 + gradeColW/2, gradeTableY + 4, { align: 'center' });
  
  // C - Yellow
  pdf.setFillColor(255, 235, 59);
  pdf.rect(10 + gradeColW*3, gradeTableY, gradeColW, 6, 'F');
  pdf.setTextColor(0, 0, 0);
  pdf.text('C', 10 + gradeColW*3 + gradeColW/2, gradeTableY + 4, { align: 'center' });
  
  // D - Orange
  pdf.setFillColor(255, 167, 38);
  pdf.rect(10 + gradeColW*4, gradeTableY, gradeColW, 6, 'F');
  pdf.text('D', 10 + gradeColW*4 + gradeColW/2, gradeTableY + 4, { align: 'center' });
  
  // E - Red
  pdf.setFillColor(244, 67, 54);
  pdf.rect(10 + gradeColW*5, gradeTableY, gradeColW, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text('E', 10 + gradeColW*5 + gradeColW/2, gradeTableY + 4, { align: 'center' });
  
  // SCORES row
  pdf.setFillColor(230, 230, 230);
  pdf.rect(10, gradeTableY + 6, gradeColW, 6, 'F');
  pdf.setTextColor(0, 0, 0);
  pdf.text('SCORES', 12, gradeTableY + 10);
  
  pdf.setFillColor(66, 133, 244);
  pdf.rect(10 + gradeColW, gradeTableY + 6, gradeColW, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text('100 - 80', 10 + gradeColW + gradeColW/2, gradeTableY + 10, { align: 'center' });
  
  pdf.setFillColor(100, 160, 255);
  pdf.rect(10 + gradeColW*2, gradeTableY + 6, gradeColW, 6, 'F');
  pdf.text('80 - 70', 10 + gradeColW*2 + gradeColW/2, gradeTableY + 10, { align: 'center' });
  
  pdf.setFillColor(255, 235, 59);
  pdf.rect(10 + gradeColW*3, gradeTableY + 6, gradeColW, 6, 'F');
  pdf.setTextColor(0, 0, 0);
  pdf.text('69 - 60', 10 + gradeColW*3 + gradeColW/2, gradeTableY + 10, { align: 'center' });
  
  pdf.setFillColor(255, 167, 38);
  pdf.rect(10 + gradeColW*4, gradeTableY + 6, gradeColW, 6, 'F');
  pdf.text('60 - 40', 10 + gradeColW*4 + gradeColW/2, gradeTableY + 10, { align: 'center' });
  
  pdf.setFillColor(244, 67, 54);
  pdf.rect(10 + gradeColW*5, gradeTableY + 6, gradeColW, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text('40 - 0', 10 + gradeColW*5 + gradeColW/2, gradeTableY + 10, { align: 'center' });
  
  // Border
  pdf.setDrawColor(0, 102, 204);
  pdf.rect(10, gradeTableY, pageWidth - 20, 12);
  
  yPosition = gradeTableY + 15;
  
  // Comments Section
  pdf.setFillColor(220, 235, 250);
  pdf.setDrawColor(0, 102, 204);
  pdf.rect(10, yPosition, pageWidth - 20, 20, 'F');
  pdf.rect(10, yPosition, pageWidth - 20, 20);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Class teacher's Comment:", 12, yPosition + 4);
  
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7);
  const teacherComment = reportData.class_teacher_comment || 'No comment provided';
  pdf.text(teacherComment.substring(0, 100), 12, yPosition + 8);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text("Headteacher's Comment:", 12, yPosition + 13);
  
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7);
  const headComment = reportData.headteacher_comment || 'No comment provided';
  pdf.text(headComment.substring(0, 70), 12, yPosition + 17);
  
  // Headteacher's Signature - on the right
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text("Headteacher's Signature:", 145, yPosition + 13);
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(0, 0, 0);
  pdf.line(145, yPosition + 18, 195, yPosition + 18);
  
  yPosition += 23;
  
  // Key to Terms Used
  pdf.setDrawColor(0, 102, 204);
  pdf.setLineWidth(0.3);
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
  
  pdf.setFillColor(220, 235, 250);
  pdf.setDrawColor(0, 102, 204);
  pdf.rect(10, yPosition, pageWidth - 20, 10, 'F');
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
  
  // Motto
  pdf.setFillColor(0, 102, 204);
  pdf.rect(10, yPosition, pageWidth - 20, 6, 'F');
  pdf.setTextColor(255, 255, 255);
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
