import { Student, Term, SchoolInfo, StudentMark, Subject } from '@/types/database';

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
}

const ReportCardPreview = ({
  student,
  term,
  schoolInfo,
  marks,
  reportData
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

  return (
    <div className="bg-white text-black p-4 border border-gray-400 text-[10px] leading-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header Section */}
      <div className="flex justify-between items-start mb-3">
        {/* Logo */}
        <div className="w-16 h-16 border border-gray-400 flex items-center justify-center overflow-hidden bg-white">
          {schoolInfo.logo_url ? (
            <img src={schoolInfo.logo_url} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[8px] text-gray-400">LOGO</span>
          )}
        </div>

        {/* School Details */}
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

        {/* Student Photo */}
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

      {/* Student Information - Horizontal Layout */}
      <div className="border-t border-b border-gray-400 py-2 mb-3 text-[9px]">
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            <span className="font-bold">NAME:</span>
            <span className="font-semibold">{student.name.toUpperCase()}</span>
          </div>
          <div className="flex gap-1">
            <span className="font-bold">GENDER:</span>
            <span className="font-semibold">{student.gender.toUpperCase()}</span>
          </div>
          <div className="flex gap-1">
            <span className="font-bold">TERM:</span>
            <span className="font-semibold">{term.term_name.toUpperCase()}</span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-1">
          <div className="flex gap-1">
            <span className="font-bold">SECTION:</span>
            <span className="font-semibold">{student.classes?.section || 'East'}</span>
          </div>
          <div className="flex gap-1">
            <span className="font-bold">CLASS:</span>
            <span className="font-semibold">{student.classes?.class_name || 'S.1'}</span>
          </div>
          <div className="flex gap-1">
            <span>Printed on</span>
            <span className="font-semibold">{new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>
        <div className="flex gap-6 mt-1">
          <div className="flex gap-1">
            <span className="font-bold">House:</span>
            <span className="font-semibold">{student.house || 'Blue'}</span>
          </div>
          <div className="flex gap-1">
            <span className="font-bold">Age:</span>
            <span className="font-semibold">{student.age || 'N/A'}</span>
          </div>
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

      {/* Comments Section */}
      <div className="mt-2 border border-gray-400 p-2 text-[9px]">
        <div className="mb-2">
          <p className="font-bold">Class Teacher's Comment:</p>
          <p className="italic">{reportData.class_teacher_comment || 'No comment provided'}</p>
        </div>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="font-bold">Headteacher's Comment:</p>
            <p className="italic">{reportData.headteacher_comment || 'No comment provided'}</p>
          </div>
          <div className="ml-4 text-right">
            <p className="font-bold">Headteacher's Signature:</p>
            <div className="border-b border-gray-600 w-32 h-6 mt-1"></div>
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
            <p className="font-bold">FEES BALANCE</p>
          </div>
          <div className="border-r border-gray-400 p-1">
            <p className="font-bold">FEES NEXT TERM</p>
          </div>
          <div className="p-1">
            <p className="font-bold italic">Other Requirement</p>
          </div>
        </div>
      </div>

      {/* Motto */}
      <div className="text-center mt-2 bg-gray-100 border border-gray-400 py-1 font-bold italic text-[10px]">
        {schoolInfo.motto || 'Work hard to excel'}
      </div>
    </div>
  );
};

export default ReportCardPreview;