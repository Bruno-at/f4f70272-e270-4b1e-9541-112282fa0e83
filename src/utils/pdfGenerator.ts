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
  
  let yPosition = 20;
  
  // Header Section
  pdf.setFillColor(primaryColor);
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  // School Logo (if available)
  if (schoolInfo.logo_url && schoolInfo.logo_url.startsWith('data:image')) {
    try {
      pdf.addImage(schoolInfo.logo_url, 'PNG', 15, 5, 30, 30);
    } catch (error) {
      console.log('Could not add logo to PDF');
    }
  }
  
  // School Name and Info
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(schoolInfo.school_name, schoolInfo.logo_url ? 50 : 20, 20);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  if (schoolInfo.motto) {
    pdf.text(`"${schoolInfo.motto}"`, schoolInfo.logo_url ? 50 : 20, 28);
  }
  
  // School contact info
  pdf.setFontSize(8);
  const contactInfo = [
    schoolInfo.location,
    schoolInfo.po_box,
    schoolInfo.telephone,
    schoolInfo.email,
    schoolInfo.website
  ].filter(Boolean).join(' • ');
  
  if (contactInfo) {
    pdf.text(contactInfo, schoolInfo.logo_url ? 50 : 20, 35);
  }
  
  yPosition = 55;
  
  // Report Title
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const reportTitle = 'STUDENT REPORT CARD';
  const titleWidth = pdf.getStringUnitWidth(reportTitle) * pdf.getFontSize() / pdf.internal.scaleFactor;
  pdf.text(reportTitle, (pageWidth - titleWidth) / 2, yPosition);
  
  yPosition += 20;
  
  // Term and Date Info
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const termInfo = `${term.term_name} ${term.year}`;
  const currentDate = new Date().toLocaleDateString();
  
  pdf.text(`Term: ${termInfo}`, 20, yPosition);
  pdf.text(`Generated: ${currentDate}`, pageWidth - 60, yPosition);
  
  yPosition += 15;
  
  // Student Information Section
  pdf.setFillColor(lightGray);
  pdf.rect(15, yPosition - 5, pageWidth - 30, 30, 'F');
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('STUDENT INFORMATION', 20, yPosition + 5);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  const studentInfo = [
    [`Name: ${student.name}`, `Gender: ${student.gender}`],
    [`Class: ${student.classes?.class_name || 'N/A'} ${student.classes?.section || ''}`, `House: ${student.house || 'N/A'}`],
    [`Student ID: ${student.student_id || 'N/A'}`, '']
  ];
  
  studentInfo.forEach((row, index) => {
    pdf.text(row[0], 20, yPosition + 15 + (index * 5));
    if (row[1]) {
      pdf.text(row[1], pageWidth / 2, yPosition + 15 + (index * 5));
    }
  });
  
  yPosition += 40;
  
  // Academic Performance Table
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('ACADEMIC PERFORMANCE', 20, yPosition);
  
  yPosition += 10;
  
  // Table headers
  const tableStartY = yPosition;
  const colWidths = [80, 25, 25, 25, 45]; // Subject, Marks, Grade, %, Remarks
  const colPositions = [20, 100, 125, 150, 175];
  
  pdf.setFillColor(primaryColor);
  pdf.rect(15, yPosition - 3, pageWidth - 30, 10, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  
  const headers = ['Subject', 'Marks', 'Grade', '%', 'Remarks'];
  headers.forEach((header, index) => {
    pdf.text(header, colPositions[index], yPosition + 4);
  });
  
  yPosition += 12;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  
  // Subject rows
  marks.forEach((mark, index) => {
    const bgColor = index % 2 === 0 ? '#ffffff' : lightGray;
    
    if (index % 2 === 0) {
      pdf.setFillColor(bgColor);
      pdf.rect(15, yPosition - 3, pageWidth - 30, 8, 'F');
    }
    
    const percentage = ((mark.marks_obtained / (mark.subjects?.max_marks || 100)) * 100).toFixed(0);
    
    const rowData = [
      mark.subjects?.subject_name || 'Unknown Subject',
      `${mark.marks_obtained}/${mark.subjects?.max_marks || 100}`,
      mark.grade || calculateGrade(parseInt(percentage)),
      `${percentage}%`,
      mark.remarks || 'Good'
    ];
    
    rowData.forEach((data, colIndex) => {
      pdf.text(data, colPositions[colIndex], yPosition + 3);
    });
    
    yPosition += 8;
  });
  
  // Overall Performance
  yPosition += 10;
  pdf.setFillColor(lightGray);
  pdf.rect(15, yPosition - 3, pageWidth - 30, 12, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('OVERALL PERFORMANCE', 20, yPosition + 4);
  
  const overallText = `Average: ${reportData.overall_average.toFixed(1)}% | Grade: ${reportData.overall_grade}`;
  pdf.text(overallText, pageWidth - 120, yPosition + 4);
  
  yPosition += 20;
  
  // Comments Section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('CLASS TEACHER\'S COMMENT', 20, yPosition);
  
  yPosition += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  
  // Word wrap for teacher comment
  const teacherCommentLines = pdf.splitTextToSize(
    reportData.class_teacher_comment || 'No comment provided.',
    pageWidth - 40
  );
  
  teacherCommentLines.forEach((line: string) => {
    pdf.text(line, 20, yPosition);
    yPosition += 5;
  });
  
  yPosition += 10;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('HEADTEACHER\'S COMMENT', 20, yPosition);
  
  yPosition += 8;
  pdf.setFont('helvetica', 'normal');
  
  const headteacherCommentLines = pdf.splitTextToSize(
    reportData.headteacher_comment || 'No comment provided.',
    pageWidth - 40
  );
  
  headteacherCommentLines.forEach((line: string) => {
    pdf.text(line, 20, yPosition);
    yPosition += 5;
  });
  
  // Footer
  yPosition = pageHeight - 30;
  
  pdf.setDrawColor(primaryColor);
  pdf.line(20, yPosition, pageWidth - 20, yPosition);
  
  yPosition += 8;
  pdf.setFontSize(8);
  pdf.setTextColor(secondaryColor);
  
  const footerInfo = [
    `Term Dates: ${new Date(term.start_date).toLocaleDateString()} - ${new Date(term.end_date).toLocaleDateString()}`,
    'Next Term Begins: Please check school calendar',
    'Fees Balance: Contact bursar for details'
  ];
  
  footerInfo.forEach((info) => {
    pdf.text(info, 20, yPosition);
    yPosition += 4;
  });
  
  // Save the PDF
  const fileName = `${student.name.replace(/\s+/g, '_')}_Report_${term.term_name}_${term.year}.pdf`;
  pdf.save(fileName);
};

const calculateGrade = (percentage: number): string => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  return 'F';
};