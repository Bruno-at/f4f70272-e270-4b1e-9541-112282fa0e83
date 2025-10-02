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
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const primaryColor = '#1e40af';
  const redLine = '#dc2626';
  const lightGray = '#f1f5f9';
  
  let yPosition = 15;
  
  // Header
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
  
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name.toUpperCase(), 40, 20);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  const contactLines = [
    `Location: ${schoolInfo.location || ''}`,
    `P.O BOX: ${schoolInfo.po_box || ''}`,
    `TEL: ${schoolInfo.telephone || ''}`,
    `Email: ${schoolInfo.email || ''} Website: ${schoolInfo.website || ''}`
  ];
  
  contactLines.forEach((line, index) => {
    if (line.split(': ')[1]) {
      pdf.text(line, 40, 26 + (index * 4));
    }
  });
  
  yPosition = 55;
  
  // Report Title
  pdf.setFillColor(primaryColor);
  pdf.rect(0, yPosition - 3, pageWidth, 12, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const reportTitle = `TERM ${term.term_name.toUpperCase()} REPORT CARD ${term.year}`;
  const titleWidth = pdf.getStringUnitWidth(reportTitle) * pdf.getFontSize() / pdf.internal.scaleFactor;
  pdf.text(reportTitle, (pageWidth - titleWidth) / 2, yPosition + 5);
  
  yPosition += 20;
  
  pdf.setDrawColor(redLine);
  pdf.setLineWidth(1);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);
  
  yPosition += 10;
  
  // Student Info
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  const studentInfo = [
    [`NAME: ${student.name.toUpperCase()}`, `GENDER: ${student.gender.toUpperCase()}`],
    [`SECTION: ${student.classes?.section || 'N/A'}`, `CLASS: ${student.classes?.class_name || 'N/A'}`, `TERM: ${term.term_name.toUpperCase()}`],
    [`House: ${student.house || 'N/A'}`, `Age: ${student.age || 'N/A'}`, `Printed on: ${new Date().toLocaleDateString('en-GB')}`]
  ];
  
  studentInfo.forEach((row, index) => {
    row.forEach((info, colIndex) => {
      const xPos = 15 + (colIndex * (pageWidth - 30) / 3);
      pdf.text(info, xPos, yPosition + (index * 6));
    });
  });
  
  yPosition += 25;
  pdf.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 10;
  
  // Performance Records
  pdf.setFillColor(primaryColor);
  pdf.rect(0, yPosition - 3, pageWidth, 12, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  const perfTitle = 'PERFORMANCE RECORDS';
  const perfTitleWidth = pdf.getStringUnitWidth(perfTitle) * pdf.getFontSize() / pdf.internal.scaleFactor;
  pdf.text(perfTitle, (pageWidth - perfTitleWidth) / 2, yPosition + 5);
  
  yPosition += 20;
  
  // Table
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  const headers = ['Code Subject', 'A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'Ident', 'GRADE', 'Remarks/Descriptors', 'TR'];
  const colWidths = [30, 12, 12, 12, 12, 15, 15, 15, 15, 18, 40, 15];
  let xPos = 15;
  
  headers.forEach((header, index) => {
    pdf.text(header, xPos, yPosition);
    xPos += colWidths[index];
  });
  
  yPosition += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  marks.forEach((mark, index) => {
    if (index % 2 !== 0) {
      pdf.setFillColor(lightGray);
      pdf.rect(10, yPosition - 2, pageWidth - 20, 6, 'F');
    }
    
    const rowData = [
      `${mark.subject_code || ''} ${mark.subjects?.subject_name || 'Unknown'}`,
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
    
    xPos = 15;
    rowData.forEach((data, colIndex) => {
      pdf.text(data, xPos, yPosition + 2);
      xPos += colWidths[colIndex];
    });
    
    yPosition += 6;
  });
  
  yPosition += 5;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('AVERAGE:', 15, yPosition);
  pdf.text(reportData.overall_identifier?.toString() || '2', 131, yPosition);
  pdf.text(reportData.overall_average?.toFixed(1) || '0.0', 146, yPosition);
  pdf.text(reportData.overall_average?.toFixed(1) || '0.0', 161, yPosition);
  
  yPosition += 8;
  
  pdf.setFontSize(9);
  pdf.text(`Overall Identifier: ${reportData.overall_identifier || 2}`, 15, yPosition);
  pdf.text(`Overall Achievement: ${reportData.achievement_level || 'Moderate'}`, 80, yPosition);
  pdf.text(`Overall grade: ${reportData.overall_grade || 'B'}`, 150, yPosition);
  
  yPosition += 10;
  
  // Grade Scale
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('GRADE', 50, yPosition);
  pdf.text('A', 70, yPosition);
  pdf.text('B', 90, yPosition);
  pdf.text('C', 110, yPosition);
  pdf.text('D', 130, yPosition);
  pdf.text('E', 150, yPosition);
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('SCORES', 30, yPosition + 6);
  pdf.text('100 - 80', 65, yPosition + 6);
  pdf.text('80 - 70', 85, yPosition + 6);
  pdf.text('69 - 60', 105, yPosition + 6);
  pdf.text('60 - 40', 125, yPosition + 6);
  pdf.text('40 - 0', 145, yPosition + 6);
  
  yPosition += 20;
  
  // Comments
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text("Class teacher's Comment:", 15, yPosition);
  
  yPosition += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  const teacherCommentLines = pdf.splitTextToSize(reportData.class_teacher_comment || 'No comment provided.', pageWidth - 30);
  teacherCommentLines.forEach((line: string) => {
    pdf.text(line, 15, yPosition);
    yPosition += 4;
  });
  
  yPosition += 8;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text("Headteacher's Comment:", 15, yPosition);
  
  yPosition += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  const headCommentLines = pdf.splitTextToSize(reportData.headteacher_comment || 'No comment provided.', pageWidth - 30);
  headCommentLines.forEach((line: string) => {
    pdf.text(line, 15, yPosition);
    yPosition += 4;
  });
  
  yPosition += 10;
  
  // Key to Terms
  pdf.setFillColor(lightGray);
  pdf.rect(10, yPosition - 2, pageWidth - 20, 25, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Key to Terms Used: A1 Average Chapter Assessment  80% End of term assessment', 15, yPosition + 5);
  
  pdf.setFont('helvetica', 'normal');
  const keyTerms = [
    '1 - Basic      0.9-1.49 Few LOs achieved, but not sufficient for overall achievement',
    '2 - Moderate   1.5-2.49 Many LOs achieved, enough for overall achievement',
    '3 - Outstanding 2.5-3.0 Most or all LOs achieved for overall achievement'
  ];
  
  keyTerms.forEach((term, index) => {
    pdf.text(term, 15, yPosition + 10 + (index * 4));
  });
  
  // Footer
  yPosition = pageHeight - 25;
  
  pdf.setFontSize(9);
  const termEndDate = new Date(term.end_date).toLocaleDateString('en-GB');
  const nextTermDate = new Date(new Date(term.end_date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
  
  pdf.text(`${termEndDate}`, 15, yPosition);
  pdf.text(`${nextTermDate}`, 65, yPosition);
  pdf.text('FEES BALANCE  FEES NEXT TERM', 115, yPosition);
  pdf.text('TERM ENDED ON', 15, yPosition + 4);
  pdf.text('NEXT TERM BEGINS', 65, yPosition + 4);
  
  yPosition += 12;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const msg = 'Work hard to excel';
  const msgWidth = pdf.getStringUnitWidth(msg) * pdf.getFontSize() / pdf.internal.scaleFactor;
  pdf.text(msg, (pageWidth - msgWidth) / 2, yPosition);
  
  return pdf;
};

export const generateModernTemplate = (data: TemplateData) => {
  const { student, term, schoolInfo, marks, reportData } = data;
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  let yPosition = 20;
  
  // Modern gradient header (simulated with colors)
  pdf.setFillColor(79, 70, 229); // Indigo
  pdf.rect(0, 0, pageWidth, 45, 'F');
  
  // Logo and Photo
  if (schoolInfo.logo_url && schoolInfo.logo_url.startsWith('data:image')) {
    try {
      pdf.addImage(schoolInfo.logo_url, 'PNG', 15, 10, 30, 30);
    } catch (error) {
      console.log('Could not add logo');
    }
  }
  
  if (student.photo_url && student.photo_url.startsWith('data:image')) {
    try {
      pdf.addImage(student.photo_url, 'PNG', pageWidth - 50, 7, 40, 40);
    } catch (error) {
      console.log('Could not add photo');
    }
  }
  
  // School name
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name.toUpperCase(), 50, 25);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Academic Excellence Report', 50, 35);
  
  yPosition = 55;
  
  // Term badge
  pdf.setFillColor(139, 92, 246); // Purple
  pdf.roundedRect(15, yPosition, pageWidth - 30, 15, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const termText = `Term ${term.term_name} Report • ${term.year}`;
  const termWidth = pdf.getStringUnitWidth(termText) * pdf.getFontSize() / pdf.internal.scaleFactor;
  pdf.text(termText, (pageWidth - termWidth) / 2, yPosition + 10);
  
  yPosition += 25;
  
  // Student info card
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(15, yPosition, pageWidth - 30, 25, 3, 3, 'F');
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(student.name.toUpperCase(), 20, yPosition + 8);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Class ${student.classes?.class_name || 'N/A'} • ${student.gender} • House: ${student.house || 'N/A'}`, 20, yPosition + 14);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(79, 70, 229);
  pdf.setFontSize(12);
  pdf.text(`Grade: ${reportData.overall_grade}`, pageWidth - 50, yPosition + 8);
  
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Average: ${reportData.overall_average.toFixed(1)}%`, pageWidth - 50, yPosition + 14);
  
  yPosition += 35;
  
  // Performance section
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PERFORMANCE OVERVIEW', 20, yPosition);
  
  yPosition += 10;
  
  // Subject cards
  marks.forEach((mark, index) => {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }
    
    if (index % 2 === 0) {
      pdf.setFillColor(255, 255, 255);
    } else {
      pdf.setFillColor(248, 250, 252);
    }
    pdf.roundedRect(15, yPosition, pageWidth - 30, 12, 2, 2, 'F');
    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(15, yPosition, pageWidth - 30, 12, 2, 2, 'S');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${mark.subject_code || ''} ${mark.subjects?.subject_name || 'Unknown'}`, 20, yPosition + 8);
    
    // Score badge
    pdf.setFillColor(224, 231, 255);
    pdf.roundedRect(pageWidth - 95, yPosition + 3, 25, 6, 1, 1, 'F');
    pdf.setTextColor(79, 70, 229);
    pdf.setFontSize(9);
    pdf.text(`${mark.hundred_percent?.toFixed(0) || 0}%`, pageWidth - 87, yPosition + 7);
    
    // Achievement badge
    if (mark.achievement_level === 'Outstanding') {
      pdf.setFillColor(220, 252, 231);
      pdf.roundedRect(pageWidth - 65, yPosition + 3, 45, 6, 1, 1, 'F');
      pdf.setTextColor(22, 163, 74);
    } else if (mark.achievement_level === 'Moderate') {
      pdf.setFillColor(254, 249, 195);
      pdf.roundedRect(pageWidth - 65, yPosition + 3, 45, 6, 1, 1, 'F');
      pdf.setTextColor(234, 179, 8);
    } else {
      pdf.setFillColor(254, 226, 226);
      pdf.roundedRect(pageWidth - 65, yPosition + 3, 45, 6, 1, 1, 'F');
      pdf.setTextColor(220, 38, 38);
    }
    
    pdf.setFontSize(8);
    pdf.text(mark.achievement_level || 'N/A', pageWidth - 62, yPosition + 7);
    
    yPosition += 14;
  });
  
  yPosition += 10;
  
  // Comments section
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(15, yPosition, pageWidth - 30, 40, 3, 3, 'F');
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Teacher\'s Feedback', 20, yPosition + 8);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  const teacherComment = pdf.splitTextToSize(reportData.class_teacher_comment, pageWidth - 40);
  let commentY = yPosition + 14;
  teacherComment.forEach((line: string) => {
    pdf.text(line, 20, commentY);
    commentY += 4;
  });
  
  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`Generated on ${new Date().toLocaleDateString('en-GB')}`, 20, pageHeight - 10);
  pdf.text(schoolInfo.email || '', pageWidth - 70, pageHeight - 10);
  
  return pdf;
};

export const generateProfessionalTemplate = (data: TemplateData) => {
  const { student, term, schoolInfo, marks, reportData } = data;
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  let yPosition = 20;
  
  // Professional header
  pdf.setDrawColor(30, 64, 175);
  pdf.setLineWidth(4);
  pdf.line(0, 15, pageWidth, 15);
  
  if (schoolInfo.logo_url && schoolInfo.logo_url.startsWith('data:image')) {
    try {
      pdf.addImage(schoolInfo.logo_url, 'PNG', 15, 20, 28, 28);
    } catch (error) {
      console.log('Could not add logo');
    }
  }
  
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name.toUpperCase(), 50, 30);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Official Academic Performance Report', 50, 38);
  
  if (student.photo_url && student.photo_url.startsWith('data:image')) {
    try {
      pdf.addImage(student.photo_url, 'PNG', pageWidth - 45, 20, 35, 35);
    } catch (error) {
      console.log('Could not add photo');
    }
  }
  
  yPosition = 55;
  
  // Info grid
  pdf.setFillColor(245, 245, 245);
  pdf.rect(15, yPosition, pageWidth - 30, 20, 'F');
  
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  
  const infoLabels = ['STUDENT NAME', 'CLASS', 'TERM', 'REPORT DATE'];
  const infoValues = [
    student.name.toUpperCase(),
    student.classes?.class_name || 'N/A',
    `${term.term_name.toUpperCase()} ${term.year}`,
    new Date().toLocaleDateString('en-GB')
  ];
  
  const colWidth = (pageWidth - 30) / 4;
  infoLabels.forEach((label, index) => {
    pdf.text(label, 20 + (index * colWidth), yPosition + 7);
  });
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  infoValues.forEach((value, index) => {
    pdf.text(value, 20 + (index * colWidth), yPosition + 15);
  });
  
  yPosition += 30;
  
  // Performance table
  pdf.setFillColor(30, 64, 175);
  pdf.rect(15, yPosition, pageWidth - 30, 10, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ACADEMIC PERFORMANCE SUMMARY', 20, yPosition + 7);
  
  yPosition += 15;
  
  // Table headers
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  
  const headers = ['SUBJECT', 'SCORE (%)', 'GRADE', 'ACHIEVEMENT'];
  const colWidths = [70, 35, 35, 45];
  let xPos = 20;
  
  pdf.setTextColor(50, 50, 50);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  
  headers.forEach((header, index) => {
    pdf.text(header, xPos, yPosition);
    xPos += colWidths[index];
  });
  
  yPosition += 8;
  
  // Table rows
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  marks.forEach((mark, index) => {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }
    
    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(15, yPosition - 5, pageWidth - 30, 10, 'F');
    }
    
    pdf.line(15, yPosition + 5, pageWidth - 15, yPosition + 5);
    
    xPos = 20;
    const rowData = [
      `${mark.subject_code || ''} ${mark.subjects?.subject_name || 'Unknown'}`,
      mark.hundred_percent?.toFixed(1) || '0.0',
      mark.final_grade || 'N/A',
      mark.achievement_level || 'N/A'
    ];
    
    rowData.forEach((data, colIndex) => {
      pdf.text(data, xPos, yPosition);
      xPos += colWidths[colIndex];
    });
    
    yPosition += 10;
  });
  
  yPosition += 5;
  
  // Overall summary
  pdf.setFillColor(240, 240, 240);
  pdf.rect(15, yPosition, pageWidth - 30, 12, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('OVERALL PERFORMANCE:', 20, yPosition + 8);
  pdf.text(`Grade ${reportData.overall_grade}`, 80, yPosition + 8);
  pdf.text(`Average: ${reportData.overall_average.toFixed(1)}%`, 120, yPosition + 8);
  pdf.text(reportData.achievement_level, 165, yPosition + 8);
  
  yPosition += 20;
  
  // Evaluation
  pdf.setDrawColor(30, 64, 175);
  pdf.setLineWidth(2);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);
  
  yPosition += 10;
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EVALUATION SUMMARY', 20, yPosition);
  
  yPosition += 8;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const evalComment = pdf.splitTextToSize(
    `Class Teacher: ${reportData.class_teacher_comment}\n\nHeadteacher: ${reportData.headteacher_comment}`,
    pageWidth - 40
  );
  
  evalComment.forEach((line: string) => {
    pdf.text(line, 20, yPosition);
    yPosition += 5;
  });
  
  // Footer
  pdf.setDrawColor(30, 64, 175);
  pdf.setLineWidth(2);
  pdf.line(0, pageHeight - 20, pageWidth, pageHeight - 20);
  
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`${schoolInfo.email || ''} | ${schoolInfo.telephone || ''} | ${schoolInfo.website || ''}`, 20, pageHeight - 12);
  
  return pdf;
};

export const generateMinimalTemplate = (data: TemplateData) => {
  const { student, term, schoolInfo, marks, reportData } = data;
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  let yPosition = 30;
  
  // Simple header
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  const schoolNameWidth = pdf.getStringUnitWidth(schoolInfo.school_name) * pdf.getFontSize() / pdf.internal.scaleFactor;
  pdf.text(schoolInfo.school_name, (pageWidth - schoolNameWidth) / 2, yPosition);
  
  yPosition += 10;
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(120, 120, 120);
  const termText = `Term ${term.term_name} Report ${term.year}`;
  const termTextWidth = pdf.getStringUnitWidth(termText) * pdf.getFontSize() / pdf.internal.scaleFactor;
  pdf.text(termText, (pageWidth - termTextWidth) / 2, yPosition);
  
  yPosition += 20;
  
  // Separator
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(30, yPosition, pageWidth - 30, yPosition);
  
  yPosition += 15;
  
  // Student info
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Student:', 30, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(student.name, 60, yPosition);
  
  yPosition += 8;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Class:', 30, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(student.classes?.class_name || 'N/A', 60, yPosition);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Gender:', 110, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(student.gender, 135, yPosition);
  
  yPosition += 15;
  
  // Separator
  pdf.line(30, yPosition, pageWidth - 30, yPosition);
  
  yPosition += 15;
  
  // Subjects
  pdf.setFontSize(10);
  
  marks.forEach((mark, index) => {
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = 30;
    }
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(mark.subjects?.subject_name || 'Unknown', 30, yPosition);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${mark.hundred_percent?.toFixed(0) || 0}%`, pageWidth - 80, yPosition);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Grade ${mark.final_grade || 'N/A'}`, pageWidth - 55, yPosition);
    
    // Light separator
    pdf.setDrawColor(240, 240, 240);
    pdf.line(30, yPosition + 3, pageWidth - 30, yPosition + 3);
    
    yPosition += 10;
  });
  
  yPosition += 10;
  
  // Overall
  pdf.setFillColor(250, 250, 250);
  pdf.rect(30, yPosition - 5, pageWidth - 60, 15, 'F');
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Overall:', 35, yPosition + 5);
  pdf.text(`Grade ${reportData.overall_grade}`, 75, yPosition + 5);
  pdf.text(`${reportData.overall_average.toFixed(1)}%`, 125, yPosition + 5);
  
  yPosition += 25;
  
  // Comments
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  
  const comment = pdf.splitTextToSize(reportData.class_teacher_comment, pageWidth - 60);
  comment.forEach((line: string) => {
    pdf.text(line, 30, yPosition);
    yPosition += 6;
  });
  
  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(180, 180, 180);
  const footerText = `${new Date().toLocaleDateString('en-GB')} • ${schoolInfo.email || ''}`;
  const footerWidth = pdf.getStringUnitWidth(footerText) * pdf.getFontSize() / pdf.internal.scaleFactor;
  pdf.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 15);
  
  return pdf;
};
