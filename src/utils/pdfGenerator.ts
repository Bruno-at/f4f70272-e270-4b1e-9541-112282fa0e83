import jsPDF from 'jspdf';
import { Student, Term, SchoolInfo, StudentMark, Subject } from '@/types/database';

interface ReportCardData {
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
  subjects: Subject[];
}

export const generateReportCardPDF = async (data: ReportCardData) => {
  const { student, term, schoolInfo, marks, reportData } = data;
  
  // Create new PDF document
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Colors
  const primaryColor = '#1e40af';
  const secondaryColor = '#64748b';
  const lightGray = '#f1f5f9';
  const redLine = '#dc2626';
  
  let yPosition = 15;
  
  // Header Section with school info
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, 50, 'F');
  
  // School Logo (if available)
  if (schoolInfo.logo_url && schoolInfo.logo_url.startsWith('data:image')) {
    try {
      pdf.addImage(schoolInfo.logo_url, 'PNG', 10, 8, 25, 25);
    } catch (error) {
      console.log('Could not add logo to PDF');
    }
  }
  
  // Student Photo (if available)
  if (student.photo_url && student.photo_url.startsWith('data:image')) {
    try {
      pdf.addImage(student.photo_url, 'PNG', pageWidth - 45, 8, 35, 35);
    } catch (error) {
      console.log('Could not add student photo to PDF');
    }
  }
  
  // School Name and Info
  pdf.setTextColor(primaryColor);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  const schoolNameX = schoolInfo.logo_url ? 40 : 15;
  pdf.text(schoolInfo.school_name.toUpperCase(), schoolNameX, 20);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  // School contact info
  const contactLines = [
    `Location: ${schoolInfo.location || ''}`,
    `P.O BOX: ${schoolInfo.po_box || ''}`,
    `TEL: ${schoolInfo.telephone || ''}`,
    `Email: ${schoolInfo.email || ''} Website: ${schoolInfo.website || ''}`
  ];
  
  contactLines.forEach((line, index) => {
    if (line.split(': ')[1]) {
      pdf.text(line, schoolNameX, 26 + (index * 4));
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
  
  // Red separator line
  pdf.setDrawColor(redLine);
  pdf.setLineWidth(1);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);
  
  yPosition += 10;
  
  // Student Information Section
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
      if (info) {
        const xPos = 15 + (colIndex * (pageWidth - 30) / 3);
        pdf.text(info, xPos, yPosition + (index * 6));
      }
    });
  });
  
  yPosition += 25;
  
  // Red separator line
  pdf.setDrawColor(redLine);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);
  
  yPosition += 10;
  
  // Performance Records Title
  pdf.setFillColor(primaryColor);
  pdf.rect(0, yPosition - 3, pageWidth, 12, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  const perfTitle = 'PERFORMANCE RECORDS';
  const perfTitleWidth = pdf.getStringUnitWidth(perfTitle) * pdf.getFontSize() / pdf.internal.scaleFactor;
  pdf.text(perfTitle, (pageWidth - perfTitleWidth) / 2, yPosition + 5);
  
  yPosition += 20;
  
  // Table headers
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
  
  // Table content
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  marks.forEach((mark, index) => {
    const bgColor = index % 2 === 0 ? '#ffffff' : lightGray;
    
    if (index % 2 !== 0) {
      pdf.setFillColor(lightGray);
      pdf.rect(10, yPosition - 2, pageWidth - 20, 6, 'F');
    }
    
    const rowData = [
      `${mark.subject_code || ''} ${mark.subjects?.subject_name || 'Unknown Subject'}`,
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
  
  // Average row
  pdf.setFont('helvetica', 'bold');
  pdf.text('AVERAGE:', 15, yPosition);
  pdf.text(reportData.overall_identifier?.toString() || '2', 131, yPosition);
  pdf.text(reportData.overall_average?.toFixed(1) || '0.0', 146, yPosition);
  pdf.text(reportData.overall_average?.toFixed(1) || '0.0', 161, yPosition);
  
  yPosition += 8;
  
  // Overall Performance Summary
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
  
  // Comments Section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text("Class teacher's", 15, yPosition);
  pdf.text("Comment:", 15, yPosition + 5);
  
  yPosition += 12;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  const teacherCommentLines = pdf.splitTextToSize(
    reportData.class_teacher_comment || 'No comment provided.',
    pageWidth - 30
  );
  
  teacherCommentLines.forEach((line: string) => {
    pdf.text(line, 15, yPosition);
    yPosition += 4;
  });
  
  yPosition += 8;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text("Headteacher's", 15, yPosition);
  pdf.text("Comment:", 15, yPosition + 5);
  
  yPosition += 12;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  const headteacherCommentLines = pdf.splitTextToSize(
    reportData.headteacher_comment || 'No comment provided.',
    pageWidth - 30
  );
  
  headteacherCommentLines.forEach((line: string) => {
    pdf.text(line, 15, yPosition);
    yPosition += 4;
  });
  
  yPosition += 10;
  
  // Key to Terms Used
  pdf.setFillColor(lightGray);
  pdf.rect(10, yPosition - 2, pageWidth - 20, 25, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Key to Terms Used:', 15, yPosition + 5);
  pdf.text('A1 Average Chapter Assessment  80% End of term assessment', 40, yPosition + 5);
  
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
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  const termEndDate = new Date(term.end_date).toLocaleDateString('en-GB');
  const nextTermDate = new Date(new Date(term.end_date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
  
  pdf.text(`${termEndDate}`, 15, yPosition);
  pdf.text(`${nextTermDate}`, 65, yPosition);
  pdf.text('FEES BALANCE  FEES NEXT TERM  Other Requirement', 115, yPosition);
  
  pdf.text('TERM ENDED ON', 15, yPosition + 4);
  pdf.text('NEXT TERM BEGINS', 65, yPosition + 4);
  
  yPosition += 12;
  
  // Motivational message
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const motivationalMsg = 'Work hard to excel';
  const msgWidth = pdf.getStringUnitWidth(motivationalMsg) * pdf.getFontSize() / pdf.internal.scaleFactor;
  pdf.text(motivationalMsg, (pageWidth - msgWidth) / 2, yPosition);
  
  // Save the PDF
  const fileName = `${student.name.replace(/\s+/g, '_')}_Report_${term.term_name}_${term.year}.pdf`;
  pdf.save(fileName);
};

const calculateGrade = (percentage: number): string => {
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 40) return 'D';
  return 'E';
};

const calculateAchievementLevel = (identifier: number): string => {
  if (identifier >= 2.5) return 'Outstanding';
  if (identifier >= 1.5) return 'Moderate';
  return 'Basic';
};

export { calculateGrade, calculateAchievementLevel };