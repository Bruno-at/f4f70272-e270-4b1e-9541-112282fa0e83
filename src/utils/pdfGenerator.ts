import jsPDF from 'jspdf';
import { Student, Term, SchoolInfo, StudentMark, Subject } from '@/types/database';
import { generateClassicTemplate, generateModernTemplate, generateProfessionalTemplate, generateMinimalTemplate } from './pdfTemplates';

export type ReportColor = 'white' | 'green' | 'blue' | 'pink' | 'yellow' | 'gray';

export const reportColorHex: Record<ReportColor, string> = {
  white: '#FFFFFF',
  green: '#DCFCE7',
  blue: '#DBEAFE',
  pink: '#FCE7F3',
  yellow: '#FEF9C3',
  gray: '#F3F4F6',
};

export interface ReportCardData {
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
  template?: 'classic' | 'modern' | 'professional' | 'minimal';
  reportColor?: ReportColor;
  classTeacherSignature?: string | null;
}

export const generateReportCardPDF = async (data: ReportCardData) => {
  const { student, term, template = 'classic' } = data;
  
  // Select template generator
  let pdf: jsPDF;
  
  switch (template) {
    case 'modern':
      pdf = generateModernTemplate(data);
      break;
    case 'professional':
      pdf = generateProfessionalTemplate(data);
      break;
    case 'minimal':
      pdf = generateMinimalTemplate(data);
      break;
    case 'classic':
    default:
      pdf = generateClassicTemplate(data);
      break;
  }
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