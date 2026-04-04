import { Student, Term, SchoolInfo, StudentMark, Subject } from '@/types/database';
import { StampConfig } from './StampConfigurator';
import { detectAcademicLevel } from '@/utils/academicLevel';

export type StampPosition = 'bottom-right' | 'bottom-center' | 'over-signatures' | 'center';

interface ReportCardPreviewProps {
  student: Student;
  term: Term;
  schoolInfo: SchoolInfo;
  marks: StudentMark[];
  subjects: Subject[];
  reportData: {
    overall_average: number;
    overall_grade: string;
    overall_identifier: number;
    achievement_level: string;
    class_teacher_comment: string;
    headteacher_comment: string;
  };
  classTeacherSignature?: string | null;
  headteacherSignature?: string | null;
  stampUrl?: string | null;
  stampPosition?: StampPosition;
  stampConfig?: StampConfig | null;
  feesData?: {
    feesBalance: number;
    feesNextTerm: number;
    otherRequirements: string;
  } | null;
}

// ===== A-LEVEL PREVIEW =====
const ALevelPreview = ({
  student, term, schoolInfo, marks, reportData,
  classTeacherSignature, headteacherSignature, stampUrl, stampConfig, feesData
}: Omit<ReportCardPreviewProps, 'subjects' | 'stampPosition'>) => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const getNextTermDate = (endDate: string) => {
    const date = new Date(endDate);
    date.setDate(date.getDate() + 30);
    return formatDate(date.toISOString());
  };

  const combination = marks.length > 0
    ? marks.slice(0, 3).map(m => m.subjects?.subject_name?.substring(0, 3).toUpperCase() || '').filter(Boolean).join('/')
    : '';

  const getStampStyle = (): React.CSSProperties | null => {
    if (!stampUrl || !stampConfig) return null;
    return {
      position: 'absolute' as const,
      left: `${stampConfig.positionX}%`,
      top: `${stampConfig.positionY}%`,
      transform: 'translate(-50%, -50%)',
      width: `${stampConfig.size}px`,
      height: 'auto',
      opacity: stampConfig.opacity / 100,
      pointerEvents: 'none' as const,
      zIndex: 10,
    };
  };
  const stampStyle = getStampStyle();

  return (
    <div className="report-card-container bg-white text-black p-4 border border-gray-400 text-[10px] leading-tight relative" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="w-16 h-16 border border-gray-400 flex items-center justify-center overflow-hidden bg-white">
          {schoolInfo.logo_url ? (
            <img src={schoolInfo.logo_url} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[8px] text-gray-400">LOGO</span>
          )}
        </div>
        <div className="flex-1 text-center px-3">
          <h1 className="font-bold text-lg uppercase tracking-wide" style={{ color: '#000080' }}>{schoolInfo.school_name}</h1>
          <p className="text-[9px]">P.O BOX {schoolInfo.po_box || ''}, {schoolInfo.location || ''}</p>
          <p className="text-[9px]">EMAIL: {schoolInfo.email || ''}</p>
          <p className="text-[9px]">CONTACTS: {schoolInfo.telephone || ''}</p>
        </div>
        <div className="w-20 h-20 border border-gray-400 flex items-center justify-center overflow-hidden bg-white">
          {student.photo_url ? (
            <img src={student.photo_url} alt="Student" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[8px] text-gray-400">PHOTO</span>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-2 py-1.5" style={{ backgroundColor: '#000080' }}>
        <h2 className="text-white font-bold text-sm uppercase tracking-wide">
          A LEVEL END OF TERM {term.term_name.toUpperCase()} REPORT CARD {term.year}
        </h2>
      </div>

      {/* Student Info */}
      <div className="border-t border-b border-gray-400 py-1.5 mb-2 text-[9px]">
        <div className="flex justify-between">
          <div><span className="font-bold">NAME:</span> <span className="font-semibold">{student.name.toUpperCase()}</span></div>
          <div><span className="font-bold">GENDER:</span> <span className="font-semibold">{student.gender.toUpperCase()}</span></div>
        </div>
        <div className="flex justify-between mt-0.5">
          <div><span className="font-bold">AGE:</span> <span>{student.age || ''}</span></div>
          <div><span className="font-bold">Roll No</span> <span>{student.student_id || ''}</span></div>
          <div><span className="font-bold">TERM:</span> <span className="font-semibold">{term.term_name.toUpperCase()}</span></div>
        </div>
        <div className="flex justify-between mt-0.5">
          <div><span className="font-bold">CLASS</span> <span className="font-semibold">{student.classes?.class_name || ''}</span></div>
          <div><span className="font-bold">Stream</span> <span>{student.classes?.section || ''}</span></div>
          <div><span className="font-bold">Combination</span> <span>{combination}</span></div>
        </div>
      </div>

      {/* Performance Records Header */}
      <div className="text-center py-1 font-bold text-[10px] text-white mb-0" style={{ backgroundColor: '#000080' }}>
        TERM PERFORMANCE RECORDS
      </div>

      {/* Performance Table */}
      <table className="w-full border-collapse text-[7px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-400 p-0.5 text-left font-bold" rowSpan={2}>Code Subject</th>
            <th className="border border-gray-400 p-0.5 text-center font-bold text-[6px]" rowSpan={2}>P<br/>A<br/>P<br/>E<br/>R</th>
            <th className="border border-gray-400 p-0.5 text-center font-bold" colSpan={5}>FORMATIVE</th>
            <th className="border border-gray-400 p-0.5 text-center font-bold" colSpan={3}>SUMMATIVE</th>
            <th className="border border-gray-400 p-0.5 text-center font-bold" rowSpan={2}>GRADE<br/>S</th>
            <th className="border border-gray-400 p-0.5 text-center font-bold" rowSpan={2}>COMMENT</th>
            <th className="border border-gray-400 p-0.5 text-center font-bold" rowSpan={2}>TR</th>
          </tr>
          <tr className="bg-gray-50">
            <th className="border border-gray-400 p-0.5 text-center font-bold">A1</th>
            <th className="border border-gray-400 p-0.5 text-center font-bold">A2</th>
            <th className="border border-gray-400 p-0.5 text-center font-bold">A3</th>
            <th className="border border-gray-400 p-0.5 text-center font-bold">AVG</th>
            <th className="border border-gray-400 p-0.5 text-center font-bold">20%</th>
            <th className="border border-gray-400 p-0.5 text-center font-bold">EOT</th>
            <th className="border border-gray-400 p-0.5 text-center font-bold">80%</th>
            <th className="border border-gray-400 p-0.5 text-center font-bold">100%</th>
          </tr>
        </thead>
        <tbody>
          {marks.map((mark, index) => (
            <>
              <tr key={`${mark.id || index}-1`}>
                <td className="border border-gray-400 p-0.5 font-bold" rowSpan={2}>
                  {mark.subject_code || ''} {mark.subjects?.subject_name?.toUpperCase() || ''}
                </td>
                <td className="border border-gray-400 p-0.5 text-center">1</td>
                <td className="border border-gray-400 p-0.5 text-center font-bold">{mark.a1_score?.toFixed(1) || ''}</td>
                <td className="border border-gray-400 p-0.5 text-center font-bold">{mark.a2_score?.toFixed(1) || ''}</td>
                <td className="border border-gray-400 p-0.5 text-center font-bold">{mark.a3_score?.toFixed(1) || ''}</td>
                <td className="border border-gray-400 p-0.5 text-center font-bold">{mark.average_score?.toFixed(1) || ''}</td>
                <td className="border border-gray-400 p-0.5 text-center font-bold">{mark.twenty_percent?.toFixed(1) || ''}</td>
                <td className="border border-gray-400 p-0.5 text-center font-bold">{mark.eighty_percent?.toFixed(0) || ''}</td>
                <td className="border border-gray-400 p-0.5 text-center font-bold">{mark.eighty_percent?.toFixed(1) || ''}</td>
                <td className="border border-gray-400 p-0.5 text-center font-bold">{mark.hundred_percent?.toFixed(1) || ''}</td>
                <td className="border border-gray-400 p-0.5 text-center font-bold" style={{
                  color: (mark.final_grade === 'A' || mark.final_grade === 'B') ? '#000080' :
                    mark.final_grade === 'D' || mark.final_grade === 'E' ? '#B40000' : '#006400'
                }}>{mark.final_grade || ''}</td>
                <td className="border border-gray-400 p-0.5 italic" style={{
                  color: mark.achievement_level?.toLowerCase().includes('outstanding') ? '#000080' : '#006400'
                }}>{mark.achievement_level || ''}</td>
                <td className="border border-gray-400 p-0.5 text-center">{mark.teacher_initials || ''}</td>
              </tr>
              <tr key={`${mark.id || index}-2`}>
                <td className="border border-gray-400 p-0.5 text-center">2</td>
                <td className="border border-gray-400 p-0.5" colSpan={11}></td>
              </tr>
            </>
          ))}
        </tbody>
      </table>

      {/* Average Scores */}
      <div className="border-x border-b border-gray-400 p-1 text-[8px] font-bold" style={{ backgroundColor: '#C8B4FF' }}>
        <span>AVERAGE SCORES</span>
        <span className="ml-20">{reportData.overall_average?.toFixed(2) || '0'}</span>
        <span className="ml-10">{reportData.overall_grade || ''}</span>
        <span className="ml-4 italic">{reportData.achievement_level || ''}</span>
      </div>

      {/* Overall stats */}
      <div className="border border-gray-400 flex text-[8px] mt-1">
        <div className="flex-1 p-1 border-r border-gray-400">
          <span>Overall Identifier</span>
        </div>
        <div className="flex-1 p-1 border-r border-gray-400">
          <span>Overall Achievement</span>
        </div>
        <div className="flex-1 p-1">
          <span>Overall grade</span>
        </div>
      </div>

      {/* Grade Scale */}
      <table className="w-full border-collapse border border-gray-400 mt-2 text-[8px]">
        <tbody>
          <tr>
            <td className="border border-gray-400 p-1 font-bold bg-gray-50">GRADE</td>
            <td className="border border-gray-400 p-1 text-center font-bold">A</td>
            <td className="border border-gray-400 p-1 text-center font-bold">B</td>
            <td className="border border-gray-400 p-1 text-center font-bold">C</td>
            <td className="border border-gray-400 p-1 text-center font-bold">D</td>
            <td className="border border-gray-400 p-1 text-center font-bold">E</td>
          </tr>
          <tr>
            <td className="border border-gray-400 p-1 font-bold bg-gray-50">SCORES</td>
            <td className="border border-gray-400 p-1 text-center">75-100</td>
            <td className="border border-gray-400 p-1 text-center">65-74</td>
            <td className="border border-gray-400 p-1 text-center">50-64</td>
            <td className="border border-gray-400 p-1 text-center">35-49</td>
            <td className="border border-gray-400 p-1 text-center">0-34</td>
          </tr>
        </tbody>
      </table>

      {/* Key to Terms */}
      <div className="mt-1 text-[7px] border border-gray-400 p-1.5">
        <p><span className="font-bold">Key to Terms Used:</span> <span className="font-bold">A1</span> End of Chapter Assessment &nbsp;&nbsp; <span className="font-bold">80%</span> End of term assessment</p>
        <p className="mt-0.5"><span className="font-bold">1 - Basic</span> &nbsp; <span className="font-bold">0.9-1.49</span> Few LOs achieved, but not sufficient for overall achievement</p>
        <p><span className="font-bold">2 - Moderate</span> &nbsp; <span className="font-bold">1.5-2.49</span> Many LOs achieved, enough for overall achievement</p>
        <p><span className="font-bold">3 - Outstanding</span> &nbsp; <span className="font-bold">2.5-3.0</span> Most or all LOs achieved for overall achievement</p>
      </div>

      {/* Student's Projects Work */}
      <div className="text-center py-1 font-bold text-[9px] text-white mt-2" style={{ backgroundColor: '#000080' }}>
        STUDENT'S PROJECTS WORK
      </div>
      <table className="w-full border-collapse text-[8px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-400 p-1 font-bold">TERMLY<br/>PROJECT WORK</th>
            <th className="border border-gray-400 p-1 font-bold">AVERAGE<br/>SCORE(10)</th>
            <th className="border border-gray-400 p-1 font-bold">OUT<br/>OF 100</th>
            <th className="border border-gray-400 p-1 font-bold">GRADE</th>
            <th className="border border-gray-400 p-1 font-bold">REMARKS</th>
            <th className="border border-gray-400 p-1 font-bold">TEACHER</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-400 p-1">&nbsp;</td>
            <td className="border border-gray-400 p-1">&nbsp;</td>
            <td className="border border-gray-400 p-1">&nbsp;</td>
            <td className="border border-gray-400 p-1">&nbsp;</td>
            <td className="border border-gray-400 p-1">&nbsp;</td>
            <td className="border border-gray-400 p-1">&nbsp;</td>
          </tr>
        </tbody>
      </table>

      {/* Comments */}
      <div className="mt-2 border border-gray-400 text-[9px]">
        <div className="flex p-2">
          <div style={{ width: '70%' }}>
            <p className="font-bold italic">Class teacher's Comment:</p>
            <p className="italic">{reportData.class_teacher_comment || 'No comment provided'}</p>
          </div>
          <div className="text-right" style={{ width: '30%' }}>
            {classTeacherSignature && (
              <img src={classTeacherSignature} alt="Signature" className="h-10 w-auto object-contain ml-auto" />
            )}
          </div>
        </div>
        <div className="flex p-2 border-t border-gray-400">
          <div style={{ width: '70%' }}>
            <p className="font-bold italic">Headteacher's Comment:</p>
            <p className="italic">{reportData.headteacher_comment || 'No comment provided'}</p>
          </div>
          <div className="text-right" style={{ width: '30%' }}>
            {headteacherSignature && (
              <img src={headteacherSignature} alt="Signature" className="h-10 w-auto object-contain ml-auto" />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 border border-gray-400">
        <div className="grid grid-cols-4 text-[8px] text-center">
          <div className="border-r border-gray-400 p-1">
            <p className="font-bold">{formatDate(term.end_date)}</p>
            <p className="font-bold">TERM ENDED ON</p>
          </div>
          <div className="border-r border-gray-400 p-1">
            <p className="font-bold">{getNextTermDate(term.end_date)}</p>
            <p className="font-bold">NEXT TERM BEGINS</p>
          </div>
          <div className="border-r border-gray-400 p-1">
            <p className="font-bold">{feesData ? `Ugx ${feesData.feesBalance.toLocaleString()}/=` : ''}</p>
            <p className="font-bold">FEES BALANCE</p>
          </div>
          <div className="p-1">
            <p className="font-bold">{feesData ? `Ugx ${feesData.feesNextTerm.toLocaleString()}/=` : ''}</p>
            <p className="font-bold">FEES NEXT TERM</p>
          </div>
        </div>
      </div>

      {/* Motto */}
      <div className="text-center mt-2 font-bold italic text-[10px]">
        {schoolInfo.motto?.toUpperCase() || 'SUCCESS AFTER STRUGGLE'}
      </div>

      {/* Stamp */}
      {stampUrl && stampStyle && (
        <img src={stampUrl} alt="School Stamp" className="report-card-stamp" style={stampStyle} />
      )}
    </div>
  );
};

// ===== O-LEVEL PREVIEW (existing) =====
const OLevelPreview = ({
  student, term, schoolInfo, marks, reportData,
  classTeacherSignature, headteacherSignature, stampUrl, stampPosition = 'bottom-right', stampConfig, feesData
}: ReportCardPreviewProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getNextTermDate = (endDate: string) => {
    const date = new Date(endDate);
    date.setDate(date.getDate() + 30);
    return formatDate(date.toISOString());
  };

  const getStampStyle = (): React.CSSProperties | null => {
    if (!stampUrl) return null;
    if (stampConfig) {
      return {
        position: 'absolute' as const,
        left: `${stampConfig.positionX}%`,
        top: `${stampConfig.positionY}%`,
        transform: 'translate(-50%, -50%)',
        width: `${stampConfig.size}px`,
        height: 'auto',
        opacity: stampConfig.opacity / 100,
        pointerEvents: 'none' as const,
        zIndex: 10,
      };
    }
    return null;
  };

  const stampStyle = getStampStyle();

  return (
    <div className="report-card-container bg-white text-black p-4 border border-gray-400 text-[10px] leading-tight relative" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header Section */}
      <div className="flex justify-between items-start mb-3">
        <div className="w-16 h-16 border border-gray-400 flex items-center justify-center overflow-hidden bg-white">
          {schoolInfo.logo_url ? (
            <img src={schoolInfo.logo_url} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[8px] text-gray-400">LOGO</span>
          )}
        </div>
        <div className="flex-1 text-center px-3">
          <h1 className="text-gray-800 font-bold text-lg uppercase tracking-wide">{schoolInfo.school_name}</h1>
          <p className="italic text-[10px] text-gray-600">"{schoolInfo.motto || 'Mbizi we are'}"</p>
          <p className="text-[9px]">Location: {schoolInfo.location || 'Kibizi'}</p>
          <p className="text-[9px]">P.O BOX: {schoolInfo.po_box || '104 Kampala'}</p>
          <p className="text-[9px]">TEL: {schoolInfo.telephone || '+256705746484'}</p>
          <p className="text-gray-600 text-[8px]">
            Email: {schoolInfo.email || 'mugabifood@gmail.com'} | Website: {schoolInfo.website || 'mugabifood@gmail.com'}
          </p>
        </div>
        <div className="w-20 h-20 border border-gray-400 flex items-center justify-center overflow-hidden bg-white">
          {student.photo_url ? (
            <img src={student.photo_url} alt="Student" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[8px] text-gray-400">PHOTO</span>
          )}
        </div>
      </div>

      {/* Report Title */}
      <div className="text-center mb-3">
        <h2 className="text-gray-800 font-bold text-base uppercase tracking-wide">
          TERM {term.term_name.toUpperCase()} REPORT CARD {term.year}
        </h2>
      </div>

      {/* Student Information */}
      <div className="border-t border-b border-gray-400 py-2 mb-3 text-[9px]">
        <div className="flex justify-between items-center">
          <div className="flex gap-1"><span className="font-bold">NAME:</span><span className="font-semibold">{student.name.toUpperCase()}</span></div>
          <div className="flex gap-1"><span className="font-bold">GENDER:</span><span className="font-semibold">{student.gender.toUpperCase()}</span></div>
          <div className="flex gap-1"><span className="font-bold">TERM:</span><span className="font-semibold">{term.term_name.toUpperCase()}</span></div>
        </div>
        <div className="flex justify-between items-center mt-1">
          <div className="flex gap-1"><span className="font-bold">SECTION:</span><span className="font-semibold">{student.classes?.section || 'East'}</span></div>
          <div className="flex gap-1"><span className="font-bold">CLASS:</span><span className="font-semibold">{student.classes?.class_name || 'S.1'}</span></div>
          <div className="flex gap-1"><span>Printed on</span><span className="font-semibold">{new Date().toLocaleDateString('en-GB')}</span></div>
        </div>
        <div className="flex gap-6 mt-1">
          <div className="flex gap-1"><span className="font-bold">House:</span><span className="font-semibold">{student.house || 'Blue'}</span></div>
          <div className="flex gap-1"><span className="font-bold">Age:</span><span className="font-semibold">{student.age || 'N/A'}</span></div>
        </div>
      </div>

      {/* Performance Records Header */}
      <div className="bg-gray-100 text-gray-800 text-center py-1 font-bold text-[10px] border border-gray-400">
        PERFORMANCE RECORDS
      </div>

      {/* Performance Table */}
      <table className="w-full border-collapse text-[8px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-400 p-1 text-left font-bold">Code</th>
            <th className="border border-gray-400 p-1 text-left font-bold">Subject</th>
            <th className="border border-gray-400 p-1 text-center font-bold">A1</th>
            <th className="border border-gray-400 p-1 text-center font-bold">A2</th>
            <th className="border border-gray-400 p-1 text-center font-bold">A3</th>
            <th className="border border-gray-400 p-1 text-center font-bold">AVG</th>
            <th className="border border-gray-400 p-1 text-center font-bold">20%</th>
            <th className="border border-gray-400 p-1 text-center font-bold">80%</th>
            <th className="border border-gray-400 p-1 text-center font-bold">100%</th>
            <th className="border border-gray-400 p-1 text-center font-bold">Ident</th>
            <th className="border border-gray-400 p-1 text-center font-bold">GRADE</th>
            <th className="border border-gray-400 p-1 text-left font-bold">Remarks/Descriptors</th>
            <th className="border border-gray-400 p-1 text-center font-bold">TR</th>
          </tr>
        </thead>
        <tbody>
          {marks.map((mark, index) => (
            <tr key={mark.id || index}>
              <td className="border border-gray-400 p-1">{mark.subject_code || ''}</td>
              <td className="border border-gray-400 p-1">{mark.subjects?.subject_name || 'Unknown'}</td>
              <td className="border border-gray-400 p-1 text-center">{mark.a1_score?.toFixed(0) || ''}</td>
              <td className="border border-gray-400 p-1 text-center">{mark.a2_score?.toFixed(0) || ''}</td>
              <td className="border border-gray-400 p-1 text-center">{mark.a3_score?.toFixed(0) || ''}</td>
              <td className="border border-gray-400 p-1 text-center">{mark.average_score?.toFixed(0) || ''}</td>
              <td className="border border-gray-400 p-1 text-center">{mark.twenty_percent?.toFixed(0) || ''}</td>
              <td className="border border-gray-400 p-1 text-center">{mark.eighty_percent?.toFixed(0) || ''}</td>
              <td className="border border-gray-400 p-1 text-center">{mark.hundred_percent?.toFixed(0) || ''}</td>
              <td className="border border-gray-400 p-1 text-center">{mark.identifier || ''}</td>
              <td className="border border-gray-400 p-1 text-center font-bold">{mark.final_grade || ''}</td>
              <td className="border border-gray-400 p-1">{mark.achievement_level || ''}</td>
              <td className="border border-gray-400 p-1 text-center">{mark.teacher_initials || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Average Row */}
      <div className="border-x border-b border-gray-400 p-1 text-[9px] bg-gray-50">
        <span className="font-bold">AVERAGE:</span>
        <span className="ml-20 font-bold">{reportData.overall_average?.toFixed(0) || '0'}</span>
      </div>

      {/* Overall Stats Row */}
      <div className="border border-gray-400 flex items-center text-[9px] mt-2">
        <div className="border-r border-gray-400 p-1 flex-1">
          <span className="font-bold">Overall Identifier:</span>
          <span className="ml-2 font-bold">{reportData.overall_identifier || '0'}</span>
        </div>
        <div className="border-r border-gray-400 p-1 flex-1">
          <span className="font-bold">Overall Achievement:</span>
          <span className="ml-2 font-bold">{reportData.achievement_level || 'N/A'}</span>
        </div>
        <div className="p-1 flex-1 flex items-center gap-2">
          <span className="font-bold">Overall Grade:</span>
          <span className="bg-gray-200 px-3 py-0.5 font-bold text-sm">{reportData.overall_grade || 'N/A'}</span>
        </div>
      </div>

      {/* Grade Scores Table */}
      <table className="w-full border-collapse border border-gray-400 mt-2 text-[9px]">
        <tbody>
          <tr>
            <td className="border border-gray-400 p-1 font-bold bg-gray-50">GRADE</td>
            <td className="border border-gray-400 p-1 text-center font-bold">A</td>
            <td className="border border-gray-400 p-1 text-center font-bold">B</td>
            <td className="border border-gray-400 p-1 text-center font-bold">C</td>
            <td className="border border-gray-400 p-1 text-center font-bold">D</td>
            <td className="border border-gray-400 p-1 text-center font-bold">E</td>
          </tr>
          <tr>
            <td className="border border-gray-400 p-1 font-bold bg-gray-50">SCORES</td>
            <td className="border border-gray-400 p-1 text-center">100 - 80</td>
            <td className="border border-gray-400 p-1 text-center">80 - 70</td>
            <td className="border border-gray-400 p-1 text-center">69 - 60</td>
            <td className="border border-gray-400 p-1 text-center">60 - 40</td>
            <td className="border border-gray-400 p-1 text-center">40 - 0</td>
          </tr>
        </tbody>
      </table>

      {/* Comments Section with Signatures */}
      <div className="mt-2 border border-gray-400 text-[9px] relative">
        <div className="flex p-2">
          <div className="flex-1" style={{ width: '70%' }}>
            <p className="font-bold italic">Class teacher's Comment:</p>
            <p className="italic">{reportData.class_teacher_comment || 'No comment provided'}</p>
          </div>
          <div className="text-right" style={{ width: '30%' }}>
            <p className="font-bold italic">Class Teacher's Signature:</p>
            {classTeacherSignature ? (
              <img src={classTeacherSignature} alt="Class Teacher Signature" className="h-10 w-auto object-contain ml-auto mt-1" />
            ) : (
              <div className="border-b border-gray-600 w-28 h-8 mt-1 ml-auto"></div>
            )}
          </div>
        </div>
        <div className="flex p-2">
          <div className="flex-1" style={{ width: '70%' }}>
            <p className="font-bold italic">Headteacher's Comment:</p>
            <p className="italic">{reportData.headteacher_comment || 'No comment provided'}</p>
          </div>
          <div className="text-right" style={{ width: '30%' }}>
            <p className="font-bold italic">Headteacher's Signature:</p>
            {headteacherSignature ? (
              <img src={headteacherSignature} alt="Headteacher Signature" className="h-10 w-auto object-contain ml-auto mt-1" />
            ) : (
              <div className="border-b border-gray-600 w-28 h-8 mt-1 ml-auto"></div>
            )}
          </div>
        </div>
      </div>

      {/* Key to Terms Used */}
      <div className="mt-2 text-[8px] border border-gray-400 p-2">
        <p className="font-bold mb-1">Key to Terms Used: A1 Average Chapter Assessment 80% End of term assessment</p>
        <div className="flex gap-4">
          <div>
            <p><span className="font-bold">1 - 0.9-</span> Few LOs achieved, but not</p>
            <p><span className="font-bold">Basic 1.49</span> sufficient for overall achievement</p>
          </div>
          <div>
            <p><span className="font-bold">2 - 1.5-</span> Many LOs achieved,</p>
            <p><span className="font-bold">Moderate 2.49</span> enough for overall achievement</p>
          </div>
          <div>
            <p><span className="font-bold">3 - 2.5-</span> Most or all LOs</p>
            <p><span className="font-bold">Outstanding 3.0</span> achieved for overall achievement</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 border border-gray-400">
        <div className="grid grid-cols-5 text-[8px] text-center">
          <div className="border-r border-gray-400 p-1">
            <p className="font-bold">{formatDate(term.end_date)}</p>
            <p className="font-bold">TERM ENDED ON</p>
          </div>
          <div className="border-r border-gray-400 p-1">
            <p className="font-bold">{getNextTermDate(term.end_date)}</p>
            <p className="font-bold">NEXT TERM BEGINS</p>
          </div>
          <div className="border-r border-gray-400 p-1">
            <p className="font-bold">{feesData ? `${feesData.feesBalance.toLocaleString()} UGX` : ''}</p>
            <p className="font-bold">FEES BALANCE</p>
          </div>
          <div className="border-r border-gray-400 p-1">
            <p className="font-bold">{feesData ? `${feesData.feesNextTerm.toLocaleString()} UGX` : ''}</p>
            <p className="font-bold">FEES NEXT TERM</p>
          </div>
          <div className="p-1">
            <p className="font-bold italic">{feesData?.otherRequirements || 'Other Requirement'}</p>
          </div>
        </div>
      </div>

      {/* Motto */}
      <div className="text-center mt-2 bg-gray-100 border border-gray-400 py-1 font-bold italic text-[10px]">
        {schoolInfo.motto || 'Work hard to excel'}
      </div>

      {/* Stamp overlay */}
      {stampUrl && stampStyle && (
        <img src={stampUrl} alt="School Stamp" className="report-card-stamp" style={stampStyle} />
      )}

      {/* Fallback: legacy preset position stamp */}
      {stampUrl && !stampConfig && (
        <div className={`absolute pointer-events-none ${
          stampPosition === 'bottom-right' ? 'bottom-2 right-2' :
          stampPosition === 'bottom-center' ? 'bottom-2 left-1/2 -translate-x-1/2' :
          stampPosition === 'over-signatures' ? 'bottom-2 right-8' :
          'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
        }`}>
          <img src={stampUrl} alt="School Stamp" className="report-card-stamp h-20 w-auto object-contain opacity-80" />
        </div>
      )}
    </div>
  );
};

// ===== MAIN COMPONENT =====
const ReportCardPreview = (props: ReportCardPreviewProps) => {
  const className = props.student.classes?.class_name || '';
  const level = detectAcademicLevel(className);

  if (level === 'a-level') {
    return <ALevelPreview {...props} />;
  }

  return <OLevelPreview {...props} />;
};

export default ReportCardPreview;
