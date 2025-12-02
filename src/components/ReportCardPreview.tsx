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
    <div className="bg-white text-black p-4 border-2 border-black text-[10px] leading-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header Section */}
      <div className="flex justify-between items-start mb-2">
        {/* Logo */}
        <div className="w-16 h-16 border border-black flex items-center justify-center overflow-hidden">
          {schoolInfo.logo_url ? (
            <img src={schoolInfo.logo_url} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[8px] text-gray-400">LOGO</span>
          )}
        </div>

        {/* School Details */}
        <div className="flex-1 text-center px-2">
          <h1 className="text-blue-600 font-bold text-sm uppercase">{schoolInfo.school_name}</h1>
          <p className="italic text-[9px]">"{schoolInfo.motto || 'Nibizi iva are'}"</p>
          <p className="text-[8px]">Location: {schoolInfo.location || 'Kibizi'}</p>
          <p className="text-[8px]">P.O.BOX: {schoolInfo.po_box || '104 Kampala'}</p>
          <p className="text-[8px]">TEL: {schoolInfo.telephone || '+256705746484'}</p>
          <p className="text-blue-600 text-[7px]">
            Email: {schoolInfo.email || 'mugabifood@gmail.com'} | Website: {schoolInfo.website || 'mugabifood@gmail.com'}
          </p>
        </div>

        {/* Student Photo */}
        <div className="w-20 h-20 border border-black flex items-center justify-center overflow-hidden">
          {student.photo_url ? (
            <img src={student.photo_url} alt="Student" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[8px] text-gray-400">PHOTO</span>
          )}
        </div>
      </div>

      {/* Report Title */}
      <div className="text-center mb-2">
        <h2 className="text-blue-600 font-bold text-xs">
          TERM {term.term_name.toUpperCase()} REPORT CARD {term.year}
        </h2>
      </div>

      {/* Student Information Table */}
      <table className="w-full border-collapse border border-black mb-2 text-[9px]">
        <tbody>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1">
              <span className="font-normal">NAME: </span>
              <span className="font-bold text-blue-600">{student.name.toUpperCase()}</span>
            </td>
            <td className="border-r border-black p-1">
              <span className="font-normal">GENDER: </span>
              <span className="font-bold text-blue-600">{student.gender.toUpperCase()}</span>
            </td>
            <td className="p-1">
              <span className="font-normal">TERM: </span>
              <span className="font-bold text-blue-600">{term.term_name.toUpperCase()}</span>
            </td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-1">
              <span className="font-normal">SECTION: </span>
              <span className="font-bold">{student.classes?.section || 'East'}</span>
            </td>
            <td className="border-r border-black p-1">
              <span className="font-normal">CLASS: </span>
              <span className="font-bold">{student.classes?.class_name || 'S 1'}</span>
            </td>
            <td className="p-1">
              Printed on {new Date().toLocaleDateString('en-GB')}
            </td>
          </tr>
          <tr>
            <td className="border-r border-black p-1" colSpan={2}>
              <span className="font-normal">House: </span>
              <span className="font-bold text-blue-600">{student.house || 'Blue'}</span>
              <span className="ml-4 font-normal">Age: </span>
              <span className="font-bold">{student.age || 'N/A'}</span>
            </td>
            <td className="p-1"></td>
          </tr>
        </tbody>
      </table>

      {/* Performance Records Header */}
      <div className="bg-blue-600 text-white text-center py-1 font-bold text-[10px] mb-0">
        PERFORMANCE RECORDS
      </div>

      {/* Performance Table */}
      <table className="w-full border-collapse border border-black text-[8px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-0.5 text-left">Code</th>
            <th className="border border-black p-0.5 text-left">Subject</th>
            <th className="border border-black p-0.5 text-center">A1</th>
            <th className="border border-black p-0.5 text-center">A2</th>
            <th className="border border-black p-0.5 text-center">A3</th>
            <th className="border border-black p-0.5 text-center">AVG</th>
            <th className="border border-black p-0.5 text-center">20%</th>
            <th className="border border-black p-0.5 text-center">80%</th>
            <th className="border border-black p-0.5 text-center">100%</th>
            <th className="border border-black p-0.5 text-center">Ident</th>
            <th className="border border-black p-0.5 text-center">GRADE</th>
            <th className="border border-black p-0.5 text-left">Remarks</th>
            <th className="border border-black p-0.5 text-center">TR</th>
          </tr>
        </thead>
        <tbody>
          {marks.map((mark, index) => (
            <tr key={mark.id || index}>
              <td className="border border-black p-0.5">{mark.subject_code || ''}</td>
              <td className="border border-black p-0.5">{mark.subjects?.subject_name || 'Unknown'}</td>
              <td className="border border-black p-0.5 text-center">{mark.a1_score?.toFixed(0) || ''}</td>
              <td className="border border-black p-0.5 text-center">{mark.a2_score?.toFixed(0) || ''}</td>
              <td className="border border-black p-0.5 text-center">{mark.a3_score?.toFixed(0) || ''}</td>
              <td className="border border-black p-0.5 text-center">{mark.average_score?.toFixed(0) || ''}</td>
              <td className="border border-black p-0.5 text-center">{mark.twenty_percent?.toFixed(0) || ''}</td>
              <td className="border border-black p-0.5 text-center">{mark.eighty_percent?.toFixed(0) || ''}</td>
              <td className="border border-black p-0.5 text-center">{mark.hundred_percent?.toFixed(0) || ''}</td>
              <td className="border border-black p-0.5 text-center">{mark.identifier || ''}</td>
              <td className="border border-black p-0.5 text-center font-bold">{mark.final_grade || ''}</td>
              <td className="border border-black p-0.5">{mark.achievement_level || ''}</td>
              <td className="border border-black p-0.5 text-center">{mark.teacher_initials || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Average Row */}
      <div className="border-x border-b border-black p-1 text-[9px]">
        <span className="font-bold">AVERAGE: </span>
        <span className="ml-16">{reportData.overall_average?.toFixed(0) || '0'}</span>
      </div>

      {/* Overall Stats Row */}
      <div className="border border-black grid grid-cols-4 text-[9px] mt-1">
        <div className="border-r border-black p-1">
          <span>Overall Identifier: </span>
          <span className="font-bold">{reportData.overall_identifier || '0'}</span>
        </div>
        <div className="border-r border-black p-1">
          <span>Overall Achievement: </span>
          <span className="font-bold text-blue-600">{reportData.achievement_level || 'N/A'}</span>
        </div>
        <div className="border-r border-black p-1">
          <span>Overall grade: </span>
          <span className="font-bold text-blue-600 text-sm">{reportData.overall_grade || 'N/A'}</span>
        </div>
        <div className="p-1"></div>
      </div>

      {/* Grade Scores Table */}
      <table className="w-3/4 mx-auto border-collapse border border-black mt-2 text-[8px]">
        <tbody>
          <tr>
            <td className="border border-black p-1 font-bold">GRADE</td>
            <td className="border border-black p-1 text-center">A</td>
            <td className="border border-black p-1 text-center">B</td>
            <td className="border border-black p-1 text-center">C</td>
            <td className="border border-black p-1 text-center">D</td>
            <td className="border border-black p-1 text-center">E</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold">SCORES</td>
            <td className="border border-black p-1 text-center">100-80</td>
            <td className="border border-black p-1 text-center">80-70</td>
            <td className="border border-black p-1 text-center">69-60</td>
            <td className="border border-black p-1 text-center">60-40</td>
            <td className="border border-black p-1 text-center">40-0</td>
          </tr>
        </tbody>
      </table>

      {/* Comments Section */}
      <div className="mt-2 text-[9px]">
        <p className="font-bold">Class teacher's Comment:</p>
        <p className="italic pl-2">{reportData.class_teacher_comment || 'No comment provided'}</p>
      </div>

      <div className="mt-2 text-[9px]">
        <p className="font-bold">Headteacher's Comment:</p>
        <p className="italic pl-2">{reportData.headteacher_comment || 'No comment provided'}</p>
      </div>

      {/* Key to Terms */}
      <div className="mt-2 text-[8px]">
        <p className="font-bold">Key to Terms Used: A1 Average Chapter Assessment 80% End of term assessment</p>
        <div className="pl-2 mt-1">
          <p><span className="font-bold">1 - 0.9-</span> Few LOs achieved, but not sufficient for overall</p>
          <p className="pl-4">Basic 1.49 achievement</p>
          <p><span className="font-bold">2 - 1.5-</span> Many LOs achieved,</p>
          <p className="pl-4">Moderate 2.49 enough for overall achievement</p>
          <p><span className="font-bold">3 - 2.5-</span> Most or all LOs achieved for overall</p>
          <p className="pl-4">Outstanding 3.0 achievement</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 grid grid-cols-5 gap-1 text-[8px]">
        <div>
          <p className="font-bold">{formatDate(term.end_date)}</p>
          <p>TERM ENDED ON</p>
        </div>
        <div>
          <p className="font-bold">{getNextTermDate(term.end_date)}</p>
          <p>NEXT TERM BEGINS</p>
        </div>
        <div className="text-center">
          <p className="font-bold">FEES BALANCE</p>
        </div>
        <div className="text-center">
          <p className="font-bold">FEES NEXT TERM</p>
        </div>
        <div className="text-center">
          <p className="font-bold">Other Requirement</p>
        </div>
      </div>

      {/* Motto */}
      <div className="text-center mt-3 font-bold text-[10px]">
        {schoolInfo.motto || 'Work hard to excel'}
      </div>
    </div>
  );
};

export default ReportCardPreview;
