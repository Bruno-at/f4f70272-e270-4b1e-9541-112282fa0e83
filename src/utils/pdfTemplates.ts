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
  const margin = 10;
  
  // Add border around entire document
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.8);
  pdf.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
  
  let yPos = margin + 5;
  
  // ========== HEADER SECTION ==========
  // Left: School logo
  if (schoolInfo.logo_url && schoolInfo.logo_url.startsWith('data:image')) {
    try {
      pdf.addImage(schoolInfo.logo_url, 'PNG', margin + 3, yPos, 20, 20);
    } catch (error) {
      console.log('Could not add logo');
    }
  }
  
  // Right: Student photo box
  const photoBoxX = pageWidth - margin - 28;
  const photoBoxY = yPos;
  const photoBoxSize = 25;
  
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(photoBoxX, photoBoxY, photoBoxSize, photoBoxSize);
  
  if (student.photo_url && student.photo_url.startsWith('data:image')) {
    try {
      pdf.addImage(student.photo_url, 'PNG', photoBoxX + 0.5, photoBoxY + 0.5, photoBoxSize - 1, photoBoxSize - 1);
    } catch (error) {
      console.log('Could not add photo');
    }
  } else {
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Image', photoBoxX + photoBoxSize / 2, photoBoxY + photoBoxSize / 2, { align: 'center' });
  }
  
  // Center: School name and details
  pdf.setTextColor(0, 0, 200);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name.toUpperCase(), pageWidth / 2, yPos + 5, { align: 'center' });
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  if (schoolInfo.motto) {
    pdf.text(schoolInfo.motto, pageWidth / 2, yPos + 10, { align: 'center' });
  }
  
  const addressLine = `${schoolInfo.location || ''} | P.O BOX: ${schoolInfo.po_box || ''} | TEL: ${schoolInfo.telephone || ''}`;
  pdf.setFontSize(7);
  pdf.text(addressLine, pageWidth / 2, yPos + 14, { align: 'center' });
  
  if (schoolInfo.email || schoolInfo.website) {
    const contactLine = `Email: ${schoolInfo.email || ''} Website: ${schoolInfo.website || ''}`;
    pdf.text(contactLine, pageWidth / 2, yPos + 17, { align: 'center' });
  }
  
  yPos += 28;
  
  // Title: END OF TERM REPORT CARD
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`END OF ${term.term_name.toUpperCase()} REPORT CARD ${term.year}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 6;
  
  // ========== STUDENT INFORMATION TABLE ==========
  const studentInfoStartY = yPos;
  const colWidths = [25, 50, 25, 40];
  const rowHeight = 6;
  
  // Draw table for student info
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  
  const studentInfo = [
    ['NAME:', student.name.toUpperCase(), 'GENDER:', student.gender.toUpperCase()],
    ['CLASS:', student.classes?.class_name || '', 'TERM:', term.term_name],
    ['HOUSE:', student.house || '', 'YEAR:', term.year.toString()]
  ];
  
  let currentY = studentInfoStartY;
  
  studentInfo.forEach((row) => {
    let currentX = margin + 5;
    
    row.forEach((cell, colIndex) => {
      // Draw cell border
      pdf.rect(currentX, currentY, colWidths[colIndex], rowHeight);
      
      // Set font style
      if (colIndex % 2 === 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
      }
      
      // Add text
      pdf.text(cell, currentX + 2, currentY + 4);
      currentX += colWidths[colIndex];
    });
    
    currentY += rowHeight;
  });
  
  yPos = currentY + 4;
  
  // ========== PERFORMANCE RECORDS TABLE ==========
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PERFORMANCE RECORDS', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 5;
  
  const tableStartX = margin + 5;
  const tableWidth = pageWidth - 2 * margin - 10;
  const tableColWidths = [10, 35, 12, 12, 12, 12, 12, 12, 12, 12, 30];
  const tableRowHeight = 6;
  
  // Table header
  const headers = ['Code', 'Subject', 'A1', 'A2', 'A3', 'AVG', '20%', '80%', '100%', 'GRADE', 'Remarks/Descriptors'];
  
  pdf.setFillColor(220, 220, 220);
  pdf.rect(tableStartX, yPos, tableWidth, tableRowHeight, 'F');
  
  let headerX = tableStartX;
  headers.forEach((header, index) => {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(headerX, yPos, tableColWidths[index], tableRowHeight);
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(header, headerX + tableColWidths[index] / 2, yPos + 4, { align: 'center' });
    
    headerX += tableColWidths[index];
  });
  
  yPos += tableRowHeight;
  
  // Table rows - Subjects
  marks.forEach((mark, index) => {
    const rowData = [
      mark.subject_code || '',
      mark.subjects?.subject_name || '',
      mark.a1_score?.toString() || '',
      mark.a2_score?.toString() || '',
      mark.a3_score?.toString() || '',
      mark.average_score?.toFixed(1) || '',
      mark.twenty_percent?.toFixed(1) || '',
      mark.eighty_percent?.toFixed(1) || '',
      mark.hundred_percent?.toFixed(1) || '',
      mark.final_grade || '',
      mark.achievement_level || ''
    ];
    
    let cellX = tableStartX;
    rowData.forEach((cell, colIndex) => {
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.rect(cellX, yPos, tableColWidths[colIndex], tableRowHeight);
      
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      if (colIndex === 1) {
        pdf.text(cell, cellX + 2, yPos + 4);
      } else {
        pdf.text(cell, cellX + tableColWidths[colIndex] / 2, yPos + 4, { align: 'center' });
      }
      
      cellX += tableColWidths[colIndex];
    });
    
    yPos += tableRowHeight;
  });
  
  yPos += 3;
  
  // ========== SUMMARY SECTION ==========
  const summaryStartY = yPos;
  const summaryColWidths = [35, 35, 35, 35, 35];
  const summaryHeight = 12;
  
  const summaryLabels = ['Overall identifier', 'Overall average', 'Overall grade', 'Overall rank', 'Achievement level'];
  const summaryValues = [
    reportData.overall_identifier?.toString() || '',
    reportData.overall_average?.toFixed(2) || '',
    reportData.overall_grade || '',
    '', // Rank not in current data
    reportData.achievement_level || ''
  ];
  
  // Summary labels row
  let summaryX = tableStartX;
  summaryLabels.forEach((label, index) => {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(summaryX, summaryStartY, summaryColWidths[index], summaryHeight / 2);
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, summaryX + summaryColWidths[index] / 2, summaryStartY + 3.5, { align: 'center' });
    
    summaryX += summaryColWidths[index];
  });
  
  // Summary values row
  summaryX = tableStartX;
  summaryValues.forEach((value, index) => {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(summaryX, summaryStartY + summaryHeight / 2, summaryColWidths[index], summaryHeight / 2);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, summaryX + summaryColWidths[index] / 2, summaryStartY + summaryHeight / 2 + 4, { align: 'center' });
    
    summaryX += summaryColWidths[index];
  });
  
  yPos = summaryStartY + summaryHeight + 5;
  
  // ========== KEY TO TERMS SECTION ==========
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Key to Terms used:', tableStartX, yPos);
  
  yPos += 4;
  
  const keyTerms = [
    'A1, A2, A3: 3 Assessment Scores out of 100% | AVG: Average of 3 Assessments',
    '20%: 20% of AVG Assessment Score | 80%: End of term Exam Score out of 80%',
    '100%: Total Final Score = 20% + 80% | GRADE: Final Letter Grade'
  ];
  
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  keyTerms.forEach((term) => {
    pdf.text(term, tableStartX, yPos);
    yPos += 3.5;
  });
  
  yPos += 2;
  
  // ========== COMMENTS SECTION ==========
  const commentBoxHeight = 20;
  const commentBoxWidth = (tableWidth - 2) / 2;
  
  // Class Teacher Comment
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.rect(tableStartX, yPos, commentBoxWidth, commentBoxHeight);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CLASS TEACHER COMMENT:', tableStartX + 2, yPos + 4);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  const ctComment = pdf.splitTextToSize(reportData.class_teacher_comment || '', commentBoxWidth - 4);
  pdf.text(ctComment, tableStartX + 2, yPos + 8);
  
  // Head Teacher Comment
  pdf.rect(tableStartX + commentBoxWidth + 2, yPos, commentBoxWidth, commentBoxHeight);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('HEAD TEACHER COMMENT:', tableStartX + commentBoxWidth + 4, yPos + 4);
  
  pdf.setFont('helvetica', 'normal');
  const htComment = pdf.splitTextToSize(reportData.headteacher_comment || '', commentBoxWidth - 4);
  pdf.text(htComment, tableStartX + commentBoxWidth + 4, yPos + 8);
  
  yPos += commentBoxHeight + 5;
  
  // ========== SIGNATURES SECTION ==========
  const sigBoxWidth = tableWidth / 4;
  const sigBoxHeight = 15;
  
  const signatures = [
    'CLASS TEACHER',
    'PARENT/GUARDIAN',
    'HEAD TEACHER',
    'HEADTEACHER'
  ];
  
  let sigX = tableStartX;
  signatures.forEach((sig) => {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(sigX, yPos, sigBoxWidth, sigBoxHeight);
    
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text(sig, sigX + sigBoxWidth / 2, yPos + 4, { align: 'center' });
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.text('Sign:', sigX + 2, yPos + 9);
    pdf.text('Date:', sigX + 2, yPos + 13);
    
    // Draw line for signature
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.line(sigX + 10, yPos + 9, sigX + sigBoxWidth - 2, yPos + 9);
    pdf.line(sigX + 10, yPos + 13, sigX + sigBoxWidth - 2, yPos + 13);
    
    sigX += sigBoxWidth;
  });
  
  // Footer note
  yPos += sigBoxHeight + 3;
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('NB: All PARENT / GUARDIAN to sign in the specified column.', pageWidth / 2, yPos, { align: 'center' });
  
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
