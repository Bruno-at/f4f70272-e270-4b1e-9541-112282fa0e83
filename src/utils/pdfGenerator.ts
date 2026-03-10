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

export interface StampConfig {
  positionX: number;
  positionY: number;
  size: number;
  opacity: number;
}

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
  headteacherSignature?: string | null;
  stampUrl?: string | null;
  stampConfig?: StampConfig | null;
  feesData?: {
    feesBalance: number;
    feesNextTerm: number;
    otherRequirements: string;
  };
}

export const generateReportCardPDF = async (data: ReportCardData) => {
  const { student, term, template = 'classic' } = data;
  
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

  // Add stamp overlay to PDF if available
  if (data.stampUrl && data.stampUrl.startsWith('data:image') && data.stampConfig) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const cfg = data.stampConfig;
    
    // Convert percentage position to mm coordinates
    const stampX = (cfg.positionX / 100) * pageWidth;
    const stampY = (cfg.positionY / 100) * pageHeight;
    // Scale size: cfg.size is in px, convert to mm (roughly 1px = 0.264mm)
    const stampSizeMm = cfg.size * 0.35;
    
    try {
      const gState = new (pdf as any).GState({ opacity: cfg.opacity / 100 });
      pdf.saveGraphicsState();
      pdf.setGState(gState);
      pdf.addImage(
        data.stampUrl,
        'PNG',
        stampX - stampSizeMm / 2,
        stampY - stampSizeMm / 2,
        stampSizeMm,
        stampSizeMm
      );
      pdf.restoreGraphicsState();
    } catch (error) {
      console.error('Error adding stamp to PDF:', error);
      // Fallback without opacity
      try {
        pdf.addImage(
          data.stampUrl,
          'PNG',
          stampX - stampSizeMm / 2,
          stampY - stampSizeMm / 2,
          stampSizeMm,
          stampSizeMm
        );
      } catch (e) {
        console.error('Fallback stamp also failed:', e);
      }
    }
  }

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