import React, { useState } from 'react';
import { Printer, Download, X, Settings, Check } from 'lucide-react';

const KNOWN_COURSES = {
  CEUC301: { short: 'OSD', full: 'FUNDAMENTALS OF OPERATING SYSTEM DESIGN', credit: '3+1 (T+P)' },
  CSUC301: { short: 'ML', full: 'MACHINE LEARNING', credit: '3+1 (T+P)' },
  ITUE301: { short: 'AWDF', full: 'ADVANCED WEB DEVELOPMENT FRAMEWORKS', credit: '0+2 (T+P)' },
  ITUC301: { short: 'DE', full: 'DATA ENGINEERING', credit: '3+1 (T+P)' },
  CSUA301: { short: 'RM', full: 'INTRODUCTION TO RESEARCH METHODOLOGY', credit: '1+1 (T+P)' },
  CEUA301: { short: 'CPE', full: 'COMPETITIVE PROGRAMMING ESSENTIALS', credit: '1+1 (T+P)' },
  CSUE301: { short: 'BDA', full: 'BIG DATA ANALYTICS', credit: '2+1 (T+P)' },
  CSUE302: { short: 'IOT', full: 'INTERNET OF THINGS', credit: '2+1 (T+P)' },
  CEUE301: { short: 'DIP', full: 'DIGITAL IMAGE PROCESSING', credit: '2+1 (T+P)' },
  CEUE302: { short: 'FGD', full: 'FUNDAMENTALS OF GAME DEVELOPMENT', credit: '2+1 (T+P)' },
  ITUE302: { short: 'EHE', full: 'ETHICAL HACKING ESSENTIALS', credit: '2+1 (T+P)' },
  ITUE303: { short: 'NDE', full: 'NETWORK DEFENCE ESSENTIALS', credit: '2+1 (T+P)' },
  HSUA301: { short: 'HS', full: 'COMMUNICATION AND SOFT SKILLS', credit: '0+2 (T+P)' },
  HSUS301: { short: 'FRENCH', full: 'FRENCH 1', credit: '0+2 (T+P)' },
};

const KNOWN_FACULTY_ABBR = {
  'Hitesh Makwana': 'HPM',
  'Radhika Patel': 'RHP',
  'Madhav Ajwalia': 'MMA',
  'Rajesh Patel': 'RVP',
  'Dweepna Garg': 'DG',
  'Mrugendra Rahevar': 'MLR',
  'Ashish Katira': 'ADK',
  'Mohini Darji': 'MPD',
  'Hardik Parmar': 'HPP',
  'Priyanka Padhiyar': 'PGP',
  'Chintal Raval': 'CUR',
  'Arpit Bhatt': 'ARB',
  'Akash Patel': 'ARP',
  'Mikin Patel': 'MRP',
  'Parth Goel': 'PNG',
  'Pooja Chaudhary': 'PC',
  'Sachin Patel': 'SHP',
  'Nirav Narayan': 'NN',
  'Dipika Damodar': 'DAD',
  'Shital Sharma': 'SYS',
  'Khushi Patel': 'KAP',
  'Pradip Zala': 'PZ',
  'Jayshree Mehta': 'JM',
};

export const getFacultyAbbr = (fullName) => {
  if (!fullName) return '';
  const clean = fullName.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/, '').trim();
  if (KNOWN_FACULTY_ABBR[clean]) return KNOWN_FACULTY_ABBR[clean];
  // Auto-generate abbreviation from initials
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1].slice(0, 2)).toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
};

export const getCourseMeta = (subject) => {
  if (!subject) return { short: 'SUB', full: 'Subject', credit: '3 (T)' };
  const code = (subject.code || '').trim().toUpperCase();
  if (KNOWN_COURSES[code]) return KNOWN_COURSES[code];

  // Auto-generate short name from words
  const words = (subject.name || '').split(/\s+/);
  let short = words.map((w) => w[0]).join('').toUpperCase().slice(0, 5);
  if (!short) short = code.slice(0, 4);

  const isLab = subject.required_room_type === 'laboratory' || subject.subject_type === 'practical';
  const credit = isLab ? `0+2 (T+P)` : `${subject.weekly_sessions || 3}+1 (T+P)`;

  return {
    short,
    full: (subject.name || '').toUpperCase(),
    credit,
  };
};

export default function UniversityPrintSheet({
  mode = 'student', // 'student' or 'faculty'
  timetable,
  selectedFaculty,
  selectedGroup,
  timeSlots = [],
  subjects = [],
  facultyList = [],
  onClose,
}) {
  const [facultySemesterFilter, setFacultySemesterFilter] = useState('all');

  const [header, setHeader] = useState({
    university: 'Charotar University of Science and Technology (CHARUSAT)',
    faculty: 'Faculty of Technology and Engineering',
    institute: 'Devang Patel Institute of Advance Technology and Research',
    department: 'Department of Information Technology',
    programme: 'B. Tech IT',
    title: mode === 'faculty' ? `Faculty Time Table — ${selectedFaculty?.name || 'Faculty'}` : 'Time Table',
    academicYear: '2026-27',
    term: mode === 'faculty' ? 'Odd Term (Multi-Semester: Sem 3 & Sem 5)' : 'Semester - 5th (Odd Term)',
    effectiveDate: '06/07/2026',
  });

  const [showConfig, setShowConfig] = useState(false);

  // Available semesters for faculty
  const facultyAllEntries = (timetable?.entries || []).filter(
    (e) => mode === 'faculty' && selectedFaculty && String(e.faculty?.id) === String(selectedFaculty.id)
  );
  const facultySemesters = Array.from(
    new Set(facultyAllEntries.map((e) => e.subject?.semester || e.student_group?.semester).filter(Boolean))
  ).sort();

  // Active days & slots
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const uniqueTimeRanges = Array.from(
    new Set(timeSlots.map((ts) => `${ts.start_time} - ${ts.end_time}`))
  ).sort();

  // Filter entries
  const entries = (timetable?.entries || []).filter((e) => {
    if (mode === 'faculty' && selectedFaculty) {
      if (String(e.faculty?.id) !== String(selectedFaculty.id)) return false;
      if (facultySemesterFilter !== 'all') {
        const sem = e.subject?.semester || e.student_group?.semester;
        if (String(sem) !== facultySemesterFilter) return false;
      }
      return true;
    }
    if (mode === 'student' && selectedGroup && selectedGroup !== 'all') {
      return String(e.student_group?.id) === String(selectedGroup);
    }
    return true;
  });

  const getCellEntry = (day, timeRange) => {
    return entries.filter((e) => {
      const slot = e.time_slot;
      if (!slot) return false;
      return slot.day_of_week === day && `${slot.start_time} - ${slot.end_time}` === timeRange;
    });
  };

  const isBreakSlot = (day, timeRange) => {
    const slot = timeSlots.find(
      (ts) => ts.day_of_week === day && `${ts.start_time} - ${ts.end_time}` === timeRange
    );
    return slot?.is_break;
  };

  const getSlotLabel = (day, timeRange) => {
    const slot = timeSlots.find(
      (ts) => ts.day_of_week === day && `${ts.start_time} - ${ts.end_time}` === timeRange
    );
    return slot?.label || (slot?.is_break ? 'Break' : '');
  };

  // Build course legend for bottom table
  const relevantSubjects = subjects.filter((sub) => {
    if (mode === 'faculty' && selectedFaculty) {
      return entries.some((e) => e.subject?.id === sub.id);
    }
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-modal-overlay">
      {/* Top Floating Controls Bar (Hidden on Print) */}
      <div className="print-controls-bar no-print">
        <div className="print-controls-left">
          <span className="print-tag-badge">
            {mode === 'faculty' ? `👨‍🏫 Faculty Sheet: ${selectedFaculty?.name || 'Selected Faculty'}` : `📅 Student Time Table Sheet`}
          </span>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>
            A4 Landscape Official University Layout (CHARUSAT / DEPSTAR Format)
          </span>
        </div>

        <div className="print-controls-right">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowConfig(!showConfig)}>
            <Settings size={14} />
            <span>{showConfig ? 'Hide Header Config' : 'Edit Header'}</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            <Printer size={15} />
            <span>Print / Save PDF</span>
          </button>
          {onClose && (
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              <X size={15} />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Config Panel (Hidden on Print) */}
      {showConfig && (
        <div className="header-config-drawer no-print">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <div>
              <label>University Name</label>
              <input
                type="text"
                className="form-control"
                value={header.university}
                onChange={(e) => setHeader({ ...header, university: e.target.value })}
              />
            </div>
            <div>
              <label>Faculty / Faculty of</label>
              <input
                type="text"
                className="form-control"
                value={header.faculty}
                onChange={(e) => setHeader({ ...header, faculty: e.target.value })}
              />
            </div>
            <div>
              <label>Institute Name</label>
              <input
                type="text"
                className="form-control"
                value={header.institute}
                onChange={(e) => setHeader({ ...header, institute: e.target.value })}
              />
            </div>
            <div>
              <label>Department</label>
              <input
                type="text"
                className="form-control"
                value={header.department}
                onChange={(e) => setHeader({ ...header, department: e.target.value })}
              />
            </div>
            <div>
              <label>Programme / Degree</label>
              <input
                type="text"
                className="form-control"
                value={header.programme}
                onChange={(e) => setHeader({ ...header, programme: e.target.value })}
              />
            </div>
            <div>
              <label>Academic Year</label>
              <input
                type="text"
                className="form-control"
                value={header.academicYear}
                onChange={(e) => setHeader({ ...header, academicYear: e.target.value })}
              />
            </div>
            <div>
              <label>Semester / Term</label>
              <input
                type="text"
                className="form-control"
                value={header.term}
                onChange={(e) => setHeader({ ...header, term: e.target.value })}
              />
            </div>
            <div>
              <label>With Effect From (Date)</label>
              <input
                type="text"
                className="form-control"
                value={header.effectiveDate}
                onChange={(e) => setHeader({ ...header, effectiveDate: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* The Official Printable University Sheet */}
      <div className="university-sheet-page" id="printable-university-sheet">
        {/* University Header */}
        <div className="univ-header-box">
          <div className="univ-logo left">
            <img src="/charusat_logo.png" alt="CHARUSAT Logo" className="official-univ-logo charusat" />
          </div>

          <div className="univ-titles">
            <h1 className="univ-title-1">{header.university}</h1>
            <h2 className="univ-title-2">{header.faculty}</h2>
            <h3 className="univ-title-3">{header.institute}</h3>
            <h4 className="univ-title-4">{header.department}</h4>
            <h5 className="univ-title-5">{header.programme}</h5>
            <div className="univ-timetable-banner">
              <span>{header.title}</span>
            </div>
          </div>

          <div className="univ-logo right">
            <img src="/depstar_logo.png" alt="DEPSTAR Logo" className="official-univ-logo depstar" />
          </div>
        </div>

        {/* Sub-header 3-column banner */}
        <table className="univ-sub-banner-table">
          <tbody>
            <tr>
              <td style={{ width: '32%', fontWeight: '700' }}>Academic Year : {header.academicYear}</td>
              <td style={{ width: '38%', fontWeight: '700', textAlign: 'center' }}>
                {mode === 'faculty' && selectedFaculty
                  ? `Faculty: ${selectedFaculty.name} (${getFacultyAbbr(selectedFaculty.name)})`
                  : header.term}
              </td>
              <td style={{ width: '30%', fontWeight: '700', textAlign: 'right' }}>
                With Effect From ({header.effectiveDate})
              </td>
            </tr>
          </tbody>
        </table>

        {/* Master Timetable Grid */}
        <table className="univ-grid-table">
          <thead>
            <tr>
              <th className="cell-day-time">Day / Time</th>
              {uniqueTimeRanges.map((range) => {
                const parts = range.split('-').map((s) => s.trim());
                return (
                  <th key={range} className="cell-time-header">
                    <div>{parts[0]} –</div>
                    <div>{parts[1]}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              if (day === 'Saturday') {
                return (
                  <tr key={day} className="row-saturday">
                    <td className="cell-day-label">{day}</td>
                    <td colSpan={uniqueTimeRanges.length} className="cell-special-session">
                      Skill Enhancement Sessions / Training and Placement sessions / Expert talks
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={day}>
                  <td className="cell-day-label">{day}</td>
                  {uniqueTimeRanges.map((range) => {
                    const isBreak = isBreakSlot(day, range);
                    const label = getSlotLabel(day, range);

                    if (isBreak) {
                      return (
                        <td key={range} className="cell-break">
                          <div className="break-text">{label || 'Break'}</div>
                        </td>
                      );
                    }

                    const cellEntries = getCellEntry(day, range);

                    if (cellEntries.length === 0) {
                      return (
                        <td key={range} className="cell-empty">
                          {mode === 'faculty' ? <span className="free-prep">Office Hours</span> : ''}
                        </td>
                      );
                    }

                    // Render Lecture or Multiple Lab Batches
                    return (
                      <td key={range} className="cell-content">
                        {cellEntries.map((e, idx) => {
                          const meta = getCourseMeta(e.subject);
                          const facAbbr = getFacultyAbbr(e.faculty?.name);
                          const roomName = (e.classroom?.name || '').replace(/Room\s*|Hall\s*|Lab\s*/gi, '').trim();

                          if (mode === 'faculty') {
                            const isLab = e.subject?.required_room_type === 'laboratory' || Boolean(e.batch);
                            const sem = e.subject?.semester || e.student_group?.semester;
                            return (
                              <div key={e.id} className="faculty-print-cell-box">
                                <div className="faculty-print-cell-title">
                                  <strong>{meta.short}</strong> ({isLab ? 'P' : 'T'})
                                </div>
                                <div className="faculty-print-cell-sub">
                                  <span>{e.subject?.code}</span>
                                  {e.batch && <span className="faculty-print-batch">Batch {e.batch}</span>}
                                </div>
                                <div className="faculty-print-cell-room">Rm: {roomName}</div>
                                <div className="faculty-print-cell-grp">Sem {sem || '5'} • {e.student_group?.name || 'Class'}</div>
                              </div>
                            );
                          }

                          if (cellEntries.length > 1 || e.batch) {
                            // Multiple practical batches (e.g. A, B, C)
                            const batchLetter = e.batch || String.fromCharCode(65 + (idx % 3));
                            return (
                              <div key={e.id} className="batch-entry-line">
                                <strong>{batchLetter}:</strong> {e.subject?.code}: {meta.short} (P) {roomName} - {facAbbr}
                              </div>
                            );
                          }

                          // Single theory lecture or main lab
                          const isLab = e.subject?.required_room_type === 'laboratory';
                          return (
                            <div key={e.id} className="single-entry-box">
                              <div className="entry-line-code">{e.subject?.code}</div>
                              <div className="entry-line-sub">
                                {meta.short} ({isLab ? 'P' : 'T'})
                              </div>
                              <div className="entry-line-room">{roomName}</div>
                              <div className="entry-line-fac">{facAbbr}</div>
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Bottom Course & Faculty Reference Matrix / Legend */}
        <div className="univ-legend-wrapper">
          <table className="univ-legend-table">
            <thead>
              <tr>
                <th style={{ width: '10%' }}>Course Code</th>
                <th style={{ width: '12%' }}>Course Name<br />(Short Name)</th>
                <th style={{ width: '28%' }}>Course Name<br />(Full Name)</th>
                <th style={{ width: '10%' }}>Credit of the Course</th>
                <th style={{ width: '14%' }}>Faculty Name Abbreviation</th>
                <th style={{ width: '20%' }}>Name of the Faculty Member</th>
                <th style={{ width: '6%' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {relevantSubjects.map((sub) => {
                const meta = getCourseMeta(sub);
                // Find all faculty teaching this subject
                const assignedFac = (facultyList || []).filter((f) =>
                  (f.subjects || []).some((s) => s.id === sub.id) ||
                  entries.some((e) => e.subject?.id === sub.id && e.faculty?.id === f.id)
                );

                const abbrs = assignedFac.map((f) => getFacultyAbbr(f.name)).join(', ') || '—';
                const names = assignedFac.map((f) => f.name).join(', ') || 'Department Faculty';

                return (
                  <tr key={sub.id}>
                    <td className="text-center font-bold">{sub.code}</td>
                    <td className="text-center font-bold">{meta.short}</td>
                    <td className="font-semibold">{meta.full}</td>
                    <td className="text-center">{meta.credit}</td>
                    <td className="text-center font-bold">{abbrs}</td>
                    <td>{names}</td>
                    <td className="text-center">-</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
