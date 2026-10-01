import React, { useState, useEffect } from 'react';
import {
  Calendar,
  BookOpen,
  Users,
  Building,
  GraduationCap,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Download,
  Printer,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Search,
  Filter,
  UserCheck,
  Sliders,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import './App.css';
import UniversityPrintSheet from './components/UniversityPrintSheet';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('timetable');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [printModal, setPrintModal] = useState(null);

  const getActiveTabLabel = (tab) => {
    switch (tab) {
      case 'timetable': return 'Master Timetable';
      case 'faculty-portal': return 'Faculty Timetable Portal';
      case 'slots': return 'Time Slots & Shifts Configuration';
      case 'subjects': return 'Academic Subjects Directory';
      case 'faculty': return 'Faculty Directory & Workload';
      case 'classrooms': return 'Classrooms & Laboratories';
      case 'groups': return 'Student Groups & Cohorts';
      default: return 'Master Timetable';
    }
  };

  // Core data states
  const [timetables, setTimetables] = useState([]);
  const [currentTimetable, setCurrentTimetable] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  // Faculty Timetable Portal State
  const [selectedFacultyId, setSelectedFacultyId] = useState('');

  // Master Timetable Filter states
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterFaculty, setFilterFaculty] = useState('all');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterBatch, setFilterBatch] = useState('all');
  const [facultySemesterFilter, setFacultySemesterFilter] = useState('all');

  // Generator Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genForm, setGenForm] = useState({ name: 'Academic Schedule 2026-27', department: '', semester: '' });

  // Subject Modal
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    department: 'Computer Science',
    semester: 3,
    weekly_sessions: 3,
    duration_minutes: 60,
    subject_type: 'theory',
    required_room_type: 'classroom',
    requires_consecutive_slots: false,
  });

  // Faculty Modal
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [facultyForm, setFacultyForm] = useState({
    name: '',
    email: '',
    department: 'Computer Science',
    designation: 'Professor',
    max_hours_per_day: 4,
    max_hours_per_week: 16,
  });

  // Classroom Modal
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: '',
    building: 'Academic Block A',
    capacity: 60,
    room_type: 'classroom',
    has_projector: true,
    has_computers: false,
  });

  // Student Group Modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: '',
    department: 'Computer Science',
    academic_year: '2026-27',
    semester: 3,
    division: 'A',
    student_count: 55,
  });

  // Time Slot Modals (Add, Edit, and College Presets)
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [slotApplyAllDays, setSlotApplyAllDays] = useState(true);
  const [editingOriginalTiming, setEditingOriginalTiming] = useState(null);
  const [slotViewMode, setSlotViewMode] = useState('standard'); // 'standard' or 'daily'
  const [slotDayFilter, setSlotDayFilter] = useState('all');
  const [slotForm, setSlotForm] = useState({
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    label: 'Period 1',
    is_break: false,
  });

  const [showPresetsPanel, setShowPresetsPanel] = useState(false);
  const [customShiftForm, setCustomShiftForm] = useState({
    startTime: '08:30',
    periodDuration: 50,
    periodCount: 6,
    recessAfterPeriod: 2,
    recessDuration: 20,
    lunchAfterPeriod: 4,
    lunchDuration: 40,
    includeSaturday: false,
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  };

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      setIsBackendHealthy(res.ok);
    } catch {
      setIsBackendHealthy(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      await checkHealth();

      const [resSub, resFac, resRooms, resGroups, resSlots, resTT] = await Promise.all([
        fetch(`${API_BASE}/subjects?per_page=100`).then((r) => r.json()),
        fetch(`${API_BASE}/faculty?per_page=100`).then((r) => r.json()),
        fetch(`${API_BASE}/classrooms?per_page=100`).then((r) => r.json()),
        fetch(`${API_BASE}/student-groups?per_page=100`).then((r) => r.json()),
        fetch(`${API_BASE}/time-slots?per_page=200`).then((r) => r.json()),
        fetch(`${API_BASE}/timetables?per_page=20`).then((r) => r.json()),
      ]);

      if (resSub.data) setSubjects(resSub.data);
      if (resFac.data) {
        setFaculty(resFac.data);
        if (!selectedFacultyId && resFac.data.length > 0) {
          setSelectedFacultyId(String(resFac.data[0].id));
        }
      }
      if (resRooms.data) setClassrooms(resRooms.data);
      if (resGroups.data) setGroups(resGroups.data);
      if (resSlots.data) setTimeSlots(resSlots.data);

      if (resTT.data && resTT.data.length > 0) {
        setTimetables(resTT.data);
        const preferredTT =
          resTT.data.find((t) => t.status === 'published' && t.entries_count > 0) ||
          resTT.data.find((t) => t.entries_count > 0) ||
          resTT.data[0];
        const ttDetail = await fetch(`${API_BASE}/timetables/${preferredTT.id}`).then((r) => r.json());
        if (ttDetail.data) {
          setCurrentTimetable(ttDetail.data);
        }
      } else {
        setTimetables([]);
        setCurrentTimetable(null);
      }
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/seed`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('University academic data seeded successfully!');
        await loadAllData();
      } else {
        showToast(data.message || 'Seeding failed', 'error');
      }
    } catch {
      showToast('Error seeding database', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTimetable = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/timetables/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Clash-free timetable generated (${data.data.entries_count} entries)!`);
        setShowGenerateModal(false);
        setCurrentTimetable(data.data);
        setActiveTab('timetable');
        await loadAllData();
      } else {
        showToast(data.message || (data.details && JSON.stringify(data.details)) || 'Generation failed', 'error');
      }
    } catch {
      showToast('Failed to connect to scheduler backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- TIME SLOTS HANDLERS (STANDARD WEEK-WIDE & DAILY SYNC) ---
  const handleOpenAddSlot = () => {
    setEditingSlotId(null);
    setEditingOriginalTiming(null);
    setSlotApplyAllDays(true);
    setSlotForm({
      day_of_week: 'Monday',
      start_time: '09:00',
      end_time: '10:00',
      label: 'Lecture Period',
      is_break: false,
    });
    setShowSlotModal(true);
  };

  const handleOpenEditSlot = (slot, forceAllDays = false) => {
    setEditingSlotId(slot.id);
    setEditingOriginalTiming({
      start_time: slot.start_time,
      end_time: slot.end_time,
      label: slot.label,
    });
    setSlotApplyAllDays(forceAllDays || slotViewMode === 'standard');
    setSlotForm({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      label: slot.label || '',
      is_break: Boolean(slot.is_break),
    });
    setShowSlotModal(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingSlotId) {
        if (slotApplyAllDays && editingOriginalTiming) {
          // Find all slots with the same original timing across all days of the week
          const matchingSlots = timeSlots.filter(
            (ts) => ts.start_time === editingOriginalTiming.start_time && ts.end_time === editingOriginalTiming.end_time
          );

          const existingDays = new Set(matchingSlots.map((ts) => ts.day_of_week));
          const targetDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          if (timeSlots.some((ts) => ts.day_of_week === 'Saturday')) targetDays.push('Saturday');

          if (matchingSlots.length > 0) {
            const updateCalls = matchingSlots.map((ts) =>
              fetch(`${API_BASE}/time-slots/${ts.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  day_of_week: ts.day_of_week,
                  start_time: slotForm.start_time,
                  end_time: slotForm.end_time,
                  label: slotForm.label,
                  is_break: slotForm.is_break,
                }),
              })
            );

            // If any weekday was missing this period, create it so all weekdays are synchronized
            const missingDays = targetDays.filter((d) => !existingDays.has(d));
            const createCalls = missingDays.map((day) =>
              fetch(`${API_BASE}/time-slots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  day_of_week: day,
                  start_time: slotForm.start_time,
                  end_time: slotForm.end_time,
                  label: slotForm.label,
                  is_break: slotForm.is_break,
                }),
              })
            );

            await Promise.all([...updateCalls, ...createCalls]);
            showToast(`Standard slot (${slotForm.start_time} – ${slotForm.end_time}) updated across all weekdays!`);
          } else {
            await fetch(`${API_BASE}/time-slots/${editingSlotId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(slotForm),
            });
            showToast('Time slot updated!');
          }
        } else {
          const res = await fetch(`${API_BASE}/time-slots/${editingSlotId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slotForm),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Failed to update slot');
          }
          showToast(`Time slot updated for ${slotForm.day_of_week}!`);
        }
      } else {
        // Create slot
        if (slotApplyAllDays) {
          const targetDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          const hasSaturday = timeSlots.some((ts) => ts.day_of_week === 'Saturday');
          if (hasSaturday) targetDays.push('Saturday');

          await Promise.all(
            targetDays.map((day) =>
              fetch(`${API_BASE}/time-slots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  day_of_week: day,
                  start_time: slotForm.start_time,
                  end_time: slotForm.end_time,
                  label: slotForm.label,
                  is_break: slotForm.is_break,
                }),
              })
            )
          );
          showToast(`Standard slot (${slotForm.start_time} – ${slotForm.end_time}) created across all weekdays!`);
        } else {
          const res = await fetch(`${API_BASE}/time-slots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slotForm),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Failed to create slot');
          }
          showToast(`Time slot created for ${slotForm.day_of_week}!`);
        }
      }
      setShowSlotModal(false);
      await loadAllData();
    } catch (err) {
      showToast(err.message || 'Error saving time slot', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Delete this time slot? If it is referenced in an existing timetable, referenced sessions will be cleared.')) return;
    try {
      const res = await fetch(`${API_BASE}/time-slots/${slotId}?force=true`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        showToast('Time slot removed');
        loadAllData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Cannot delete time slot', 'error');
      }
    } catch {
      showToast('Error deleting time slot', 'error');
    }
  };

  const handleDeleteStandardPeriod = async (period) => {
    const matching = timeSlots.filter(
      (ts) => ts.start_time === period.start_time && ts.end_time === period.end_time
    );
    if (!window.confirm(`Delete "${period.label || period.start_time + ' - ' + period.end_time}" across all ${matching.length} weekdays?`)) return;

    setLoading(true);
    try {
      await Promise.all(
        matching.map((ts) =>
          fetch(`${API_BASE}/time-slots/${ts.id}?force=true`, { method: 'DELETE' })
        )
      );
      showToast(`Removed period across all weekdays`);
      await loadAllData();
    } catch {
      showToast('Error removing standard period', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to add minutes to HH:MM
  const addMinutes = (timeStr, mins) => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMins = h * 60 + m + mins;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // Apply predefined College Templates
  const handleApplyPreset = async (presetType) => {
    let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    let periods = [];

    if (presetType === '50min') {
      // 50-minute periods: 08:30 start, recess at 10:10 (20m), lunch at 12:00 (40m)
      periods = [
        { start_time: '08:30', end_time: '09:20', label: 'Period 1', is_break: false },
        { start_time: '09:20', end_time: '10:10', label: 'Period 2', is_break: false },
        { start_time: '10:10', end_time: '10:30', label: 'Morning Recess', is_break: true },
        { start_time: '10:30', end_time: '11:20', label: 'Period 3', is_break: false },
        { start_time: '11:20', end_time: '12:10', label: 'Period 4', is_break: false },
        { start_time: '12:10', end_time: '12:50', label: 'Lunch Break', is_break: true },
        { start_time: '12:50', end_time: '13:40', label: 'Period 5', is_break: false },
        { start_time: '13:40', end_time: '14:30', label: 'Period 6', is_break: false },
      ];
    } else if (presetType === '60min') {
      // 60-minute standard: 09:00 - 16:00
      periods = [
        { start_time: '09:00', end_time: '10:00', label: 'Period 1', is_break: false },
        { start_time: '10:00', end_time: '11:00', label: 'Period 2', is_break: false },
        { start_time: '11:00', end_time: '11:15', label: 'Tea Break', is_break: true },
        { start_time: '11:15', end_time: '12:15', label: 'Period 3', is_break: false },
        { start_time: '12:15', end_time: '13:15', label: 'Period 4', is_break: false },
        { start_time: '13:15', end_time: '14:00', label: 'Lunch Break', is_break: true },
        { start_time: '14:00', end_time: '15:00', label: 'Period 5', is_break: false },
        { start_time: '15:00', end_time: '16:00', label: 'Period 6', is_break: false },
      ];
    } else if (presetType === 'morning45') {
      // Morning shift: 07:30 - 12:30
      periods = [
        { start_time: '07:30', end_time: '08:15', label: 'Period 1', is_break: false },
        { start_time: '08:15', end_time: '09:00', label: 'Period 2', is_break: false },
        { start_time: '09:00', end_time: '09:30', label: 'Breakfast Break', is_break: true },
        { start_time: '09:30', end_time: '10:15', label: 'Period 3', is_break: false },
        { start_time: '10:15', end_time: '11:00', label: 'Period 4', is_break: false },
        { start_time: '11:00', end_time: '11:45', label: 'Period 5', is_break: false },
        { start_time: '11:45', end_time: '12:30', label: 'Period 6', is_break: false },
      ];
    }

    if (!window.confirm(`Apply this college template to all weekdays? This will reconfigure time slots for your institution.`)) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/time-slots/bulk-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, periods, clear_existing: true }),
      });
      if (res.ok) {
        showToast('College schedule template applied!');
        setShowPresetsPanel(false);
        await loadAllData();
      } else {
        const d = await res.json();
        showToast(d.message || 'Failed to apply schedule', 'error');
      }
    } catch {
      showToast('Error configuring schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Build custom college shift
  const handleApplyCustomShift = async (e) => {
    e.preventDefault();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    if (customShiftForm.includeSaturday) days.push('Saturday');

    let curTime = customShiftForm.startTime;
    const periods = [];
    const dur = parseInt(customShiftForm.periodDuration) || 50;
    const count = parseInt(customShiftForm.periodCount) || 6;
    const recessAfter = parseInt(customShiftForm.recessAfterPeriod);
    const recessDur = parseInt(customShiftForm.recessDuration) || 15;
    const lunchAfter = parseInt(customShiftForm.lunchAfterPeriod);
    const lunchDur = parseInt(customShiftForm.lunchDuration) || 45;

    for (let i = 1; i <= count; i++) {
      const nextTime = addMinutes(curTime, dur);
      periods.push({
        start_time: curTime,
        end_time: nextTime,
        label: `Period ${i}`,
        is_break: false,
      });
      curTime = nextTime;

      if (recessAfter && i === recessAfter) {
        const recessEnd = addMinutes(curTime, recessDur);
        periods.push({
          start_time: curTime,
          end_time: recessEnd,
          label: 'Morning Recess',
          is_break: true,
        });
        curTime = recessEnd;
      }

      if (lunchAfter && i === lunchAfter) {
        const lunchEnd = addMinutes(curTime, lunchDur);
        periods.push({
          start_time: curTime,
          end_time: lunchEnd,
          label: 'Lunch Break',
          is_break: true,
        });
        curTime = lunchEnd;
      }
    }

    if (!window.confirm(`Configure custom college schedule (${count} periods, ${dur} mins each) across ${days.join(', ')}?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/time-slots/bulk-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, periods, clear_existing: true }),
      });
      if (res.ok) {
        showToast('Custom college time slots generated and applied!');
        setShowPresetsPanel(false);
        await loadAllData();
      } else {
        const d = await res.json();
        showToast(d.message || 'Failed to apply custom shift', 'error');
      }
    } catch {
      showToast('Error applying custom schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD HANDLERS FOR OTHER ENTITIES ---
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Subject created successfully!');
        setShowSubjectModal(false);
        loadAllData();
      } else {
        showToast(data.message || 'Could not create subject', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Delete subject?')) return;
    try {
      const res = await fetch(`${API_BASE}/subjects/${id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        showToast('Subject deleted');
        loadAllData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Cannot delete subject', 'error');
      }
    } catch {
      showToast('Error deleting subject', 'error');
    }
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/faculty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facultyForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Faculty member added!');
        setShowFacultyModal(false);
        loadAllData();
      } else {
        showToast(data.message || 'Could not add faculty', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleDeleteFaculty = async (id) => {
    if (!window.confirm('Delete faculty member?')) return;
    try {
      const res = await fetch(`${API_BASE}/faculty/${id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        showToast('Faculty removed');
        loadAllData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Cannot delete faculty', 'error');
      }
    } catch {
      showToast('Error deleting faculty', 'error');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/classrooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Classroom created!');
        setShowRoomModal(false);
        loadAllData();
      } else {
        showToast(data.message || 'Could not create classroom', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Delete classroom?')) return;
    try {
      const res = await fetch(`${API_BASE}/classrooms/${id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        showToast('Classroom removed');
        loadAllData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Cannot delete room', 'error');
      }
    } catch {
      showToast('Error deleting room', 'error');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/student-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Student group created!');
        setShowGroupModal(false);
        loadAllData();
      } else {
        showToast(data.message || 'Could not create group', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm('Delete student group?')) return;
    try {
      const res = await fetch(`${API_BASE}/student-groups/${id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        showToast('Student group deleted');
        loadAllData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Cannot delete group', 'error');
      }
    } catch {
      showToast('Error deleting group', 'error');
    }
  };

  // --- MATRIX COMPUTATIONS ---
  const activeDays = Array.from(new Set(timeSlots.map((ts) => ts.day_of_week)));
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const sortedDays = activeDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

  const uniqueTimeRanges = Array.from(
    new Set(timeSlots.map((ts) => `${ts.start_time} - ${ts.end_time}`))
  ).sort();

  // Group slots into standard daily bell schedule (deduplicated by timing across weekdays)
  const standardPeriodsMap = new Map();
  timeSlots.forEach((ts) => {
    const key = `${ts.start_time} - ${ts.end_time}`;
    if (!standardPeriodsMap.has(key)) {
      const [sh, sm] = (ts.start_time || '00:00').split(':').map(Number);
      const [eh, em] = (ts.end_time || '00:00').split(':').map(Number);
      const durMins = eh * 60 + em - (sh * 60 + sm);
      standardPeriodsMap.set(key, {
        timeRange: key,
        start_time: ts.start_time,
        end_time: ts.end_time,
        duration: durMins > 0 ? `${durMins} mins` : '—',
        label: ts.label || (ts.is_break ? 'Recess / Break' : 'Academic Lecture'),
        is_break: Boolean(ts.is_break),
        days: [ts.day_of_week],
        sampleSlot: ts,
        slotIds: [ts.id],
      });
    } else {
      const existing = standardPeriodsMap.get(key);
      if (!existing.days.includes(ts.day_of_week)) {
        existing.days.push(ts.day_of_week);
      }
      existing.slotIds.push(ts.id);
    }
  });

  const standardPeriods = Array.from(standardPeriodsMap.values()).sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  const sortedDailySlots = [...timeSlots]
    .filter((ts) => slotDayFilter === 'all' || ts.day_of_week === slotDayFilter)
    .sort((a, b) => {
      const dayDiff = dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week);
      if (dayDiff !== 0) return dayDiff;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

  // Filtered entries for Master Timetable
  const masterFilteredEntries = (currentTimetable?.entries || []).filter((entry) => {
    if (filterSemester !== 'all') {
      const sem = entry.subject?.semester || entry.student_group?.semester;
      if (String(sem) !== filterSemester) return false;
    }
    if (filterGroup !== 'all' && String(entry.student_group?.id) !== filterGroup) return false;
    if (filterFaculty !== 'all' && String(entry.faculty?.id) !== filterFaculty) return false;
    if (filterRoom !== 'all' && String(entry.classroom?.id) !== filterRoom) return false;
    if (filterBatch !== 'all') {
      if (filterBatch === 'theory' && entry.batch) return false;
      if (filterBatch !== 'theory' && entry.batch !== filterBatch) return false;
    }
    return true;
  });

  const getMasterEntriesForCell = (day, timeRange) => {
    return masterFilteredEntries.filter((entry) => {
      const slot = entry.time_slot;
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
    return slot?.label;
  };

  // --- FACULTY TIMETABLE COMPUTATIONS ---
  const selectedFacultyObj = faculty.find((f) => String(f.id) === String(selectedFacultyId)) || faculty[0];

  const facultyAllEntries = (currentTimetable?.entries || []).filter(
    (entry) => String(entry.faculty?.id) === String(selectedFacultyObj?.id)
  );

  const facultySemesters = Array.from(
    new Set(
      facultyAllEntries
        .map((e) => e.subject?.semester || e.student_group?.semester)
        .filter(Boolean)
    )
  ).sort();

  const facultyEntries = facultyAllEntries.filter((entry) => {
    if (facultySemesterFilter === 'all') return true;
    const sem = entry.subject?.semester || entry.student_group?.semester;
    return String(sem) === String(facultySemesterFilter);
  });

  const getFacultyEntriesForCell = (day, timeRange) => {
    return facultyEntries.filter((entry) => {
      const slot = entry.time_slot;
      if (!slot) return false;
      return slot.day_of_week === day && `${slot.start_time} - ${slot.end_time}` === timeRange;
    });
  };

  const exportFacultyCSV = () => {
    if (!selectedFacultyObj) return;
    const headers = ['Day', 'Time Slot', 'Subject Code', 'Subject Name', 'Room', 'Student Group', 'Type'];
    const rows = facultyEntries.map((e) => [
      e.time_slot?.day_of_week || '',
      `${e.time_slot?.start_time} - ${e.time_slot?.end_time}`,
      e.subject?.code || '',
      `"${e.subject?.name || ''}"`,
      `"${e.classroom?.name || ''}"`,
      `"${e.student_group?.name || ''}"`,
      e.subject?.required_room_type === 'laboratory' ? 'Lab' : 'Lecture',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedFacultyObj.name.replace(/\s+/g, '_')}_Schedule.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Schedule exported for ${selectedFacultyObj.name}!`);
  };

  const handleExportCSV = () => {
    if (!currentTimetable?.entries?.length) {
      showToast('No timetable entries to export', 'error');
      return;
    }
    const headers = ['Day', 'Time', 'Subject Code', 'Subject Name', 'Faculty', 'Classroom', 'Student Group'];
    const rows = masterFilteredEntries.map((e) => [
      e.time_slot?.day_of_week || '',
      `${e.time_slot?.start_time} - ${e.time_slot?.end_time}`,
      e.subject?.code || '',
      `"${e.subject?.name || ''}"`,
      `"${e.faculty?.name || ''}"`,
      `"${e.classroom?.name || ''}"`,
      `"${e.student_group?.name || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentTimetable.name || 'timetable'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Master timetable CSV exported!');
  };

  return (
    <div className="app-shell">
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={18} color="#059669" /> : <AlertCircle size={18} color="#dc2626" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Modern High-Contrast Sidebar (Deep Slate ERP Shell) */}
      <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-logo-icon">
              <Calendar size={20} />
            </div>
            {!sidebarCollapsed && (
              <div className="brand-text">
                <span className="brand-title">Smart Timetable</span>
                <span className="brand-subtitle">DEPSTAR • CHARUSAT</span>
              </div>
            )}
          </div>
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-section-title">
            {!sidebarCollapsed && <span>Academic Timetables</span>}
          </div>

          <button
            className={`sidebar-nav-item ${activeTab === 'timetable' ? 'active' : ''}`}
            onClick={() => setActiveTab('timetable')}
            title="Master Timetable"
          >
            <Calendar size={18} />
            {!sidebarCollapsed && (
              <>
                <span className="nav-label">Master Timetable</span>
                {currentTimetable?.entries?.length > 0 && (
                  <span className="nav-badge blue">{currentTimetable.entries.length}</span>
                )}
              </>
            )}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === 'faculty-portal' ? 'active' : ''}`}
            onClick={() => setActiveTab('faculty-portal')}
            title="Faculty Timetable Portal"
          >
            <UserCheck size={18} />
            {!sidebarCollapsed && (
              <>
                <span className="nav-label">Faculty Timetable</span>
                <span className="nav-badge teal">Portal</span>
              </>
            )}
          </button>

          <div className="sidebar-nav-section-title">
            {!sidebarCollapsed && <span>Shift Configuration</span>}
          </div>

          <button
            className={`sidebar-nav-item ${activeTab === 'slots' ? 'active' : ''}`}
            onClick={() => setActiveTab('slots')}
            title="Time Slots & Shifts"
          >
            <Clock size={18} />
            {!sidebarCollapsed && (
              <>
                <span className="nav-label">Time Slots & Shifts</span>
                <span className="nav-badge gray">{timeSlots.length}</span>
              </>
            )}
          </button>

          <div className="sidebar-nav-section-title">
            {!sidebarCollapsed && <span>Academic Entities</span>}
          </div>

          <button
            className={`sidebar-nav-item ${activeTab === 'subjects' ? 'active' : ''}`}
            onClick={() => setActiveTab('subjects')}
            title="Subjects"
          >
            <BookOpen size={18} />
            {!sidebarCollapsed && (
              <>
                <span className="nav-label">Subjects</span>
                <span className="nav-badge gray">{subjects.length}</span>
              </>
            )}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === 'faculty' ? 'active' : ''}`}
            onClick={() => setActiveTab('faculty')}
            title="Faculty Members"
          >
            <Users size={18} />
            {!sidebarCollapsed && (
              <>
                <span className="nav-label">Faculty</span>
                <span className="nav-badge gray">{faculty.length}</span>
              </>
            )}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === 'classrooms' ? 'active' : ''}`}
            onClick={() => setActiveTab('classrooms')}
            title="Classrooms & Laboratories"
          >
            <Building size={18} />
            {!sidebarCollapsed && (
              <>
                <span className="nav-label">Classrooms & Labs</span>
                <span className="nav-badge gray">{classrooms.length}</span>
              </>
            )}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
            title="Student Groups & Batches"
          >
            <GraduationCap size={18} />
            {!sidebarCollapsed && (
              <>
                <span className="nav-label">Student Groups</span>
                <span className="nav-badge gray">{groups.length}</span>
              </>
            )}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className={`sidebar-status-box ${isBackendHealthy ? 'healthy' : 'unhealthy'}`}>
            <span className="status-dot"></span>
            {!sidebarCollapsed && (
              <div className="status-text">
                <span className="status-title">{isBackendHealthy ? 'Backend Connected' : 'Backend Offline'}</span>
                <span className="status-sub">REST API :5000</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="app-main-layout">
        {/* Top Header */}
        <header className="app-top-header">
          <div className="header-breadcrumbs">
            <span className="crumb-root">Academic ERP</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-active">{getActiveTabLabel(activeTab)}</span>
          </div>

          <div className="header-actions">
            <div className={`status-pill ${isBackendHealthy ? 'online' : 'offline'}`}>
              <span className="status-indicator"></span>
              <span>{isBackendHealthy ? 'API Online :5000' : 'API Offline'}</span>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={handleSeed} disabled={loading} title="Populate realistic demo data">
              <Sparkles size={14} color="#f59e0b" />
              <span>Seed Sample Data</span>
            </button>

            <button className="btn btn-secondary btn-sm" onClick={loadAllData} disabled={loading} title="Refresh all data">
              <RefreshCw size={14} className={loading ? 'spinner' : ''} />
              <span>Refresh</span>
            </button>

            <button className="btn btn-primary btn-sm" onClick={() => setShowGenerateModal(true)}>
              <Sparkles size={14} />
              <span>Generate Schedule</span>
            </button>

            <div className="user-profile-badge">
              <div className="user-avatar">AD</div>
              <div className="user-info-text">
                <span className="user-name">Academic Admin</span>
                <span className="user-role">Dean / HOD Office</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="app-content-body">
          {/* Metrics Row */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon-box metric-icon-indigo">
                <BookOpen size={22} />
              </div>
              <div className="metric-info">
                <h3>{subjects.length}</h3>
                <p>Active Subjects</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-box metric-icon-purple">
                <Users size={22} />
              </div>
              <div className="metric-info">
                <h3>{faculty.length}</h3>
                <p>Faculty Members</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-box metric-icon-emerald">
                <Building size={22} />
              </div>
              <div className="metric-info">
                <h3>{classrooms.length}</h3>
                <p>Classrooms & Labs</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-box metric-icon-amber">
                <GraduationCap size={22} />
              </div>
              <div className="metric-info">
                <h3>{groups.length}</h3>
                <p>Student Groups</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-box metric-icon-cyan">
                <Clock size={22} />
              </div>
              <div className="metric-info">
                <h3>{timeSlots.length}</h3>
                <p>Configured Slots</p>
              </div>
            </div>
          </div>

      {/* 1. MASTER TIMETABLE TAB */}
      {activeTab === 'timetable' && (
        <section className="section-card animate-fade-in">
          <div className="section-toolbar">
            <div className="toolbar-title">
              <h2>{currentTimetable ? currentTimetable.name : 'Master Academic Schedule'}</h2>
              <p>
                {currentTimetable
                  ? `Status: ${currentTimetable.status.toUpperCase()} • 0 Clashes • Showing ${masterFilteredEntries.length} scheduled periods`
                  : 'No timetable generated yet. Click "Generate Schedule" or "Seed Sample Data" to start.'}
              </p>
            </div>

            <div className="toolbar-controls">
              {timetables.length > 1 && (
                <select
                  className="input-select"
                  value={currentTimetable?.id || ''}
                  onChange={async (e) => {
                    const selectedId = e.target.value;
                    const ttDetail = await fetch(`${API_BASE}/timetables/${selectedId}`).then((r) => r.json());
                    if (ttDetail.data) setCurrentTimetable(ttDetail.data);
                  }}
                  title="Select Active Timetable"
                  style={{ fontWeight: 600, color: 'var(--primary, #0284c7)' }}
                >
                  {timetables.map((t) => (
                    <option key={t.id} value={t.id}>
                      📅 {t.name} ({t.entries_count} periods)
                    </option>
                  ))}
                </select>
              )}
              <select
                className="input-select"
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                title="Filter by Semester"
              >
                <option value="all">All Semesters</option>
                <option value="5">Semester 5 (Odd Term)</option>
                <option value="3">Semester 3 (Odd Term)</option>
              </select>

              <select
                className="input-select"
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
                title="Filter by Batch"
              >
                <option value="all">All Batches & Lectures</option>
                <option value="theory">Theory Lectures Only</option>
                <option value="A">Lab Batch A Only</option>
                <option value="B">Lab Batch B Only</option>
                <option value="C">Lab Batch C Only</option>
              </select>

              <select
                className="input-select"
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
              >
                <option value="all">All Student Groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    {g.name}
                  </option>
                ))}
              </select>

              <select
                className="input-select"
                value={filterFaculty}
                onChange={(e) => setFilterFaculty(e.target.value)}
              >
                <option value="all">All Faculty</option>
                {faculty.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.name}
                  </option>
                ))}
              </select>

              <select
                className="input-select"
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
              >
                <option value="all">All Rooms & Labs</option>
                {classrooms.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name}
                  </option>
                ))}
              </select>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => setPrintModal({ mode: 'student' })}
                title="Print Official University Timetable (CHARUSAT / DEPSTAR Format)"
              >
                <FileText size={15} />
                <span>Official Print Sheet (PDF Style)</span>
              </button>
            </div>
          </div>

          <div className="matrix-container">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="time-col">Time Slot</th>
                  {sortedDays.map((day) => (
                    <th key={day}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uniqueTimeRanges.length === 0 ? (
                  <tr>
                    <td colSpan={sortedDays.length + 1} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No time slots available. Please go to the <strong>Time Slots & Shifts</strong> tab to configure or seed your college timings.
                    </td>
                  </tr>
                ) : (
                  uniqueTimeRanges.map((timeRange) => {
                    const isAllBreak = sortedDays.every((d) => isBreakSlot(d, timeRange));
                    if (isAllBreak) {
                      const label = getSlotLabel(sortedDays[0], timeRange) || 'BREAK / RECESS';
                      return (
                        <tr key={timeRange}>
                          <td className="time-col">{timeRange}</td>
                          <td colSpan={sortedDays.length} className="break-cell">
                            ☕ {label.toUpperCase()}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={timeRange}>
                        <td className="time-col">{timeRange}</td>
                        {sortedDays.map((day) => {
                          if (isBreakSlot(day, timeRange)) {
                            const lbl = getSlotLabel(day, timeRange) || 'Break';
                            return (
                              <td key={day} className="break-cell">
                                {lbl}
                              </td>
                            );
                          }

                          const entries = getMasterEntriesForCell(day, timeRange);
                          return (
                            <td key={day}>
                              {entries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className={`entry-card ${entry.subject?.required_room_type === 'laboratory' || entry.batch ? 'lab' : ''}`}
                                >
                                  <div className="entry-top">
                                    <span className="entry-code">{entry.subject?.code}</span>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                      {entry.batch && <span className="entry-batch-badge">🧪 Batch {entry.batch}</span>}
                                      {(entry.subject?.semester || entry.student_group?.semester) && (
                                        <span className="entry-sem-badge">Sem {entry.subject?.semester || entry.student_group?.semester}</span>
                                      )}
                                      <span
                                        className={`entry-badge ${
                                          entry.subject?.required_room_type === 'laboratory' || entry.batch ? 'practical' : 'theory'
                                        }`}
                                      >
                                        {entry.subject?.required_room_type === 'laboratory' || entry.batch ? 'LAB' : 'THEORY'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="entry-title">{entry.subject?.name}</div>
                                  <div className="entry-meta">
                                    <div className="entry-meta-item">
                                      <span>👨‍🏫 {entry.faculty?.name}</span>
                                    </div>
                                    <div className="entry-meta-item">
                                      <span>🏛️ {entry.classroom?.name}</span>
                                    </div>
                                    <div className="entry-meta-item">
                                      <span>👥 {entry.student_group?.name}{entry.batch ? ` (Batch ${entry.batch})` : ''}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 2. FACULTY-SIDE TIMETABLE TAB */}
      {activeTab === 'faculty-portal' && (
        <section className="section-card animate-fade-in">
          <div className="section-toolbar">
            <div className="toolbar-title">
              <h2>Faculty Timetable Portal</h2>
              <p>Individual schedule, weekly classroom locations, and teaching workload per professor</p>
            </div>

            <div className="toolbar-controls">
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>SELECT PROFESSOR:</label>
              <select
                className="input-select"
                style={{ minWidth: '240px', fontWeight: '600' }}
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
              >
                {faculty.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.name} — {f.department} ({f.designation || 'Faculty'})
                  </option>
                ))}
              </select>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => setPrintModal({ mode: 'faculty' })}
                title="Print Official Faculty Personal Timetable (CHARUSAT / DEPSTAR Format)"
              >
                <FileText size={15} />
                <span>Official Print Sheet (PDF Style)</span>
              </button>
            </div>
          </div>

          {/* Faculty Header Card */}
          {selectedFacultyObj && (
            <div className="faculty-portal-card">
              <div className="faculty-profile">
                <div className="faculty-avatar-large">
                  {selectedFacultyObj.name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/, '').charAt(0)}
                </div>
                <div className="faculty-details">
                  <h2>{selectedFacultyObj.name}</h2>
                  <p>
                    <span>🏛️ {selectedFacultyObj.department}</span>
                    <span>•</span>
                    <span>🎓 {selectedFacultyObj.designation || 'Instructor'}</span>
                    <span>•</span>
                    <span>✉️ {selectedFacultyObj.email || 'No email registered'}</span>
                  </p>
                  {facultySemesters.length > 0 && (
                    <div className="semester-pill-group">
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>TEACHING IN:</span>
                      <button
                        className={`sem-pill-btn ${facultySemesterFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setFacultySemesterFilter('all')}
                      >
                        All Semesters ({facultyAllEntries.length} periods)
                      </button>
                      {facultySemesters.map((s) => {
                        const cnt = facultyAllEntries.filter((e) => String(e.subject?.semester || e.student_group?.semester) === String(s)).length;
                        return (
                          <button
                            key={s}
                            className={`sem-pill-btn ${facultySemesterFilter === String(s) ? 'active' : ''}`}
                            onClick={() => setFacultySemesterFilter(String(s))}
                          >
                            Semester {s} ({cnt} periods)
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="faculty-stats-row">
                <div className="faculty-stat-item">
                  <div className="faculty-stat-label">Assigned Sessions</div>
                  <div className="faculty-stat-val">{facultyEntries.length} periods / wk</div>
                </div>

                <div className="faculty-stat-item">
                  <div className="faculty-stat-label">Semesters Taught</div>
                  <div className="faculty-stat-val" style={{ color: '#0284c7' }}>
                    {facultySemesters.length > 0 ? `Sem ${facultySemesters.join(' & ')}` : 'All'}
                  </div>
                </div>

                <div className="faculty-stat-item">
                  <div className="faculty-stat-label">Weekly Hours</div>
                  <div className="faculty-stat-val">
                    {facultyEntries.length}h / {selectedFacultyObj.max_hours_per_week || 16}h max
                  </div>
                </div>

                <div className="faculty-stat-item">
                  <div className="faculty-stat-label">Teaching Clash</div>
                  <div className="faculty-stat-val" style={{ color: '#059669' }}>
                    0 Clashes (Safe)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Faculty Matrix Grid */}
          <div className="matrix-container">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="time-col">Time Slot</th>
                  {sortedDays.map((day) => (
                    <th key={day}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uniqueTimeRanges.length === 0 ? (
                  <tr>
                    <td colSpan={sortedDays.length + 1} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No time slots available.
                    </td>
                  </tr>
                ) : (
                  uniqueTimeRanges.map((timeRange) => {
                    const isAllBreak = sortedDays.every((d) => isBreakSlot(d, timeRange));
                    if (isAllBreak) {
                      const label = getSlotLabel(sortedDays[0], timeRange) || 'BREAK / RECESS';
                      return (
                        <tr key={timeRange}>
                          <td className="time-col">{timeRange}</td>
                          <td colSpan={sortedDays.length} className="break-cell">
                            ☕ {label.toUpperCase()}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={timeRange}>
                        <td className="time-col">{timeRange}</td>
                        {sortedDays.map((day) => {
                          if (isBreakSlot(day, timeRange)) {
                            const lbl = getSlotLabel(day, timeRange) || 'Break';
                            return (
                              <td key={day} className="break-cell">
                                {lbl}
                              </td>
                            );
                          }

                          const cellEntries = getFacultyEntriesForCell(day, timeRange);
                          if (!cellEntries || cellEntries.length === 0) {
                            return (
                              <td key={day}>
                                <div className="free-slot-card">
                                  <span>✨ Free Period</span>
                                  <span style={{ fontSize: '10px' }}>Office Hours / Prep</span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={day}>
                              {cellEntries.map((entry) => {
                                const isLab = entry.subject?.required_room_type === 'laboratory' || Boolean(entry.batch);
                                const sem = entry.subject?.semester || entry.student_group?.semester;
                                return (
                                  <div
                                    key={entry.id}
                                    className={`entry-card ${isLab ? 'lab' : ''}`}
                                    style={{ margin: cellEntries.length > 1 ? '0 0 6px 0' : 0 }}
                                  >
                                    <div className="entry-top">
                                      <span className="entry-code">{entry.subject?.code}</span>
                                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        {entry.batch && <span className="entry-batch-badge">🧪 Batch {entry.batch}</span>}
                                        {sem && <span className="entry-sem-badge">Sem {sem}</span>}
                                        <span className={`entry-badge ${isLab ? 'practical' : 'theory'}`}>
                                          {isLab ? 'LAB' : 'THEORY'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="entry-title">{entry.subject?.name}</div>
                                    <div className="entry-meta">
                                      <div className="entry-meta-item">
                                        <span>👥 Group: {entry.student_group?.name}{entry.batch ? ` (Batch ${entry.batch})` : ''}</span>
                                      </div>
                                      <div className="entry-meta-item">
                                        <span>🏛️ Room: {entry.classroom?.name} ({entry.classroom?.building})</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. TIME SLOTS & SHIFTS TAB (EDITABLE & CUSTOMIZABLE) */}
      {activeTab === 'slots' && (
        <section className="section-card animate-fade-in">
          <div className="section-toolbar">
            <div className="toolbar-title">
              <h2>College Time Slots & Shifts Customizer</h2>
              <p>
                Configure custom period lengths, morning/afternoon shifts, and college-specific break intervals
              </p>
            </div>

            <div className="toolbar-controls">
              <button
                className="btn btn-secondary"
                onClick={() => setShowPresetsPanel(!showPresetsPanel)}
                title="Choose college timing templates or custom shifts"
              >
                <Sliders size={16} />
                <span>Configure College Timings</span>
              </button>

              <button className="btn btn-primary" onClick={handleOpenAddSlot}>
                <Plus size={16} />
                <span>Add Custom Slot</span>
              </button>
            </div>
          </div>

          {/* College Timings Presets Banner */}
          {showPresetsPanel && (
            <div className="college-presets-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>⚡ Quick College Schedule Presets</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPresetsPanel(false)}>
                  <X size={15} />
                </button>
              </div>

              <div className="template-presets-grid">
                <div className="preset-card" onClick={() => handleApplyPreset('50min')}>
                  <div className="preset-title">
                    <span>Engineering / Polytechnic (50 Mins)</span>
                    <span className="tag-badge emerald">Popular</span>
                  </div>
                  <div className="preset-desc">
                    8:30 AM to 2:30 PM • 6 periods of 50 mins • 20m Morning Recess • 40m Lunch Break
                  </div>
                </div>

                <div className="preset-card" onClick={() => handleApplyPreset('60min')}>
                  <div className="preset-title">
                    <span>Standard University (60 Mins)</span>
                    <span className="tag-badge indigo">Standard</span>
                  </div>
                  <div className="preset-desc">
                    9:00 AM to 4:00 PM • 6 periods of 60 mins • 15m Tea Break • 45m Lunch Break
                  </div>
                </div>

                <div className="preset-card" onClick={() => handleApplyPreset('morning45')}>
                  <div className="preset-title">
                    <span>Morning Shift College (45 Mins)</span>
                    <span className="tag-badge amber">Shift</span>
                  </div>
                  <div className="preset-desc">
                    7:30 AM to 12:30 PM • 6 periods of 45 mins • 30m Breakfast / Recess
                  </div>
                </div>
              </div>

              {/* Custom Shift Builder Form */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '18px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>🛠️ Custom College Timing Generator</h4>
                <form onSubmit={handleApplyCustomShift}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>College Start Time</label>
                      <input
                        type="time"
                        className="form-control"
                        required
                        value={customShiftForm.startTime}
                        onChange={(e) => setCustomShiftForm({ ...customShiftForm, startTime: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Period Length (mins)</label>
                      <input
                        type="number"
                        className="form-control"
                        required
                        min={30}
                        max={120}
                        value={customShiftForm.periodDuration}
                        onChange={(e) => setCustomShiftForm({ ...customShiftForm, periodDuration: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Periods Per Day</label>
                      <input
                        type="number"
                        className="form-control"
                        required
                        min={3}
                        max={10}
                        value={customShiftForm.periodCount}
                        onChange={(e) => setCustomShiftForm({ ...customShiftForm, periodCount: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Recess After Period #</label>
                      <input
                        type="number"
                        className="form-control"
                        min={1}
                        max={8}
                        value={customShiftForm.recessAfterPeriod}
                        onChange={(e) => setCustomShiftForm({ ...customShiftForm, recessAfterPeriod: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Recess Mins</label>
                      <input
                        type="number"
                        className="form-control"
                        min={5}
                        max={60}
                        value={customShiftForm.recessDuration}
                        onChange={(e) => setCustomShiftForm({ ...customShiftForm, recessDuration: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Lunch After Period #</label>
                      <input
                        type="number"
                        className="form-control"
                        min={1}
                        max={8}
                        value={customShiftForm.lunchAfterPeriod}
                        onChange={(e) => setCustomShiftForm({ ...customShiftForm, lunchAfterPeriod: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Lunch Mins</label>
                      <input
                        type="number"
                        className="form-control"
                        min={15}
                        max={90}
                        value={customShiftForm.lunchDuration}
                        onChange={(e) => setCustomShiftForm({ ...customShiftForm, lunchDuration: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={customShiftForm.includeSaturday}
                        onChange={(e) => setCustomShiftForm({ ...customShiftForm, includeSaturday: e.target.checked })}
                      />
                      <span>Include Saturday Schedule</span>
                    </label>

                    <button type="submit" className="btn btn-primary btn-sm">
                      <Sparkles size={14} />
                      <span>Generate & Apply Custom Shift</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Standard Bell Schedule vs Day-by-Day View Mode Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px',
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${slotViewMode === 'standard' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSlotViewMode('standard')}
                style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Clock size={15} />
                <span>Standard Weekly Bell Schedule ({standardPeriods.length} periods)</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    background: slotViewMode === 'standard' ? 'rgba(255,255,255,0.25)' : 'var(--border-subtle)',
                    padding: '1px 7px',
                    borderRadius: '10px',
                  }}
                >
                  Syncs All Weeks
                </span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${slotViewMode === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSlotViewMode('daily')}
                style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Calendar size={15} />
                <span>Day-by-Day List ({timeSlots.length} slots)</span>
              </button>
            </div>

            {slotViewMode === 'daily' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Filter Day:</span>
                <select
                  className="form-control"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', height: '34px' }}
                  value={slotDayFilter}
                  onChange={(e) => setSlotDayFilter(e.target.value)}
                >
                  <option value="all">All Days ({timeSlots.length})</option>
                  {sortedDays.map((d) => (
                    <option key={d} value={d}>
                      {d} ({timeSlots.filter((t) => t.day_of_week === d).length})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Standard Weekly Schedule View (DEFAULT / PRIMARY) */}
          {slotViewMode === 'standard' ? (
            <>
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '13px',
                  color: '#0369a1',
                }}
              >
                <span style={{ fontSize: '18px' }}>🔁</span>
                <div>
                  <strong>Recurring Standard Weekly Schedule:</strong> Modifying or adding any time slot here applies across all weeks and working days (Monday – Friday). You only need to set it once for the entire semester.
                </div>
              </div>

              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Period / Label</th>
                      <th>Standard Timing</th>
                      <th>Duration</th>
                      <th>Slot Category</th>
                      <th>Applied Days</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standardPeriods.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No time slots configured. Use "Configure College Timings" or "Add Standard Period" to get started.
                        </td>
                      </tr>
                    ) : (
                      standardPeriods.map((period, idx) => {
                        const isAllWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].every((d) =>
                          period.days.includes(d)
                        );

                        return (
                          <tr key={period.timeRange}>
                            <td>
                              <strong>{period.label || `Period ${idx + 1}`}</strong>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-mono, monospace)',
                                  fontSize: '13px',
                                  color: 'var(--primary, #0284c7)',
                                  background: 'var(--primary-light, #e0f2fe)',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #bae6fd',
                                }}
                              >
                                {period.start_time} – {period.end_time}
                              </span>
                            </td>
                            <td>{period.duration}</td>
                            <td>
                              <span className={`tag-badge ${period.is_break ? 'amber' : 'indigo'}`}>
                                {period.is_break ? '☕ Break / Recess' : '📚 Academic Period'}
                              </span>
                            </td>
                            <td>
                              {isAllWeekdays ? (
                                <span className="tag-badge emerald" title="Applies to Monday through Friday">
                                  🔁 All Weekdays (Mon – Fri)
                                </span>
                              ) : (
                                <span className="tag-badge cyan">
                                  {period.days.join(', ')}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="btn-icon-group" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenEditSlot(period.sampleSlot, true)}
                                  title="Edit this standard period across all weekdays"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                >
                                  <Edit2 size={13} />
                                  <span>Edit (All Days)</span>
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleDeleteStandardPeriod(period)}
                                  title="Delete this period across all weekdays"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Day-by-Day Table */
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Day of Week</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Duration</th>
                    <th>Label / Title</th>
                    <th>Slot Category</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDailySlots.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No time slots found matching the selected day filter.
                      </td>
                    </tr>
                  ) : (
                    sortedDailySlots.map((ts) => {
                      const [sh, sm] = (ts.start_time || '00:00').split(':').map(Number);
                      const [eh, em] = (ts.end_time || '00:00').split(':').map(Number);
                      const durMins = eh * 60 + em - (sh * 60 + sm);

                      return (
                        <tr key={ts.id}>
                          <td>
                            <strong>{ts.day_of_week}</strong>
                          </td>
                          <td>{ts.start_time}</td>
                          <td>{ts.end_time}</td>
                          <td>{durMins > 0 ? `${durMins} mins` : '—'}</td>
                          <td>{ts.label || (ts.is_break ? 'Recess / Break' : 'Academic Lecture')}</td>
                          <td>
                            <span className={`tag-badge ${ts.is_break ? 'amber' : 'indigo'}`}>
                              {ts.is_break ? '☕ Break / Recess' : '📚 Academic Period'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="btn-icon-group" style={{ justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEditSlot(ts, false)}
                                title="Edit this time slot"
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteSlot(ts.id)}
                                title="Delete this time slot"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 4. SUBJECTS TAB */}
      {activeTab === 'subjects' && (
        <section className="section-card animate-fade-in">
          <div className="section-toolbar">
            <div className="toolbar-title">
              <h2>Academic Subjects</h2>
              <p>Configure course subjects, type requirements, and weekly hour quotas</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowSubjectModal(true)}>
              <Plus size={16} />
              <span>Add Subject</span>
            </button>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Sem</th>
                  <th>Type</th>
                  <th>Required Room</th>
                  <th>Weekly Sessions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.code}</strong>
                    </td>
                    <td>{s.name}</td>
                    <td>{s.department}</td>
                    <td>Sem {s.semester}</td>
                    <td>
                      <span className={`tag-badge ${s.subject_type === 'practical' ? 'emerald' : 'indigo'}`}>
                        {s.subject_type}
                      </span>
                    </td>
                    <td>{s.required_room_type}</td>
                    <td>{s.weekly_sessions} sessions / wk</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSubject(s.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. FACULTY TAB */}
      {activeTab === 'faculty' && (
        <section className="section-card animate-fade-in">
          <div className="section-toolbar">
            <div className="toolbar-title">
              <h2>Faculty Members</h2>
              <p>Manage professors, instructors, designations, and workload constraints</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowFacultyModal(true)}>
              <Plus size={16} />
              <span>Add Faculty</span>
            </button>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Max Hrs/Day</th>
                  <th>Max Hrs/Week</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {faculty.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <strong>{f.name}</strong>
                    </td>
                    <td>
                      <span className="tag-badge indigo">{f.designation || 'Faculty'}</span>
                    </td>
                    <td>{f.department}</td>
                    <td>{f.email || '—'}</td>
                    <td>{f.max_hours_per_day || 4}h</td>
                    <td>{f.max_hours_per_week || 16}h</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteFaculty(f.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. CLASSROOMS TAB */}
      {activeTab === 'classrooms' && (
        <section className="section-card animate-fade-in">
          <div className="section-toolbar">
            <div className="toolbar-title">
              <h2>Classrooms & Laboratories</h2>
              <p>Manage lecture halls, smart classrooms, and hardware/software computer labs</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowRoomModal(true)}>
              <Plus size={16} />
              <span>Add Classroom</span>
            </button>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Room Name</th>
                  <th>Building</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Projector</th>
                  <th>Computers</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classrooms.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                    </td>
                    <td>{c.building}</td>
                    <td>
                      <span className={`tag-badge ${c.room_type === 'laboratory' ? 'emerald' : 'indigo'}`}>
                        {c.room_type}
                      </span>
                    </td>
                    <td>{c.capacity} students</td>
                    <td>{c.has_projector ? '✅ Yes' : '❌ No'}</td>
                    <td>{c.has_computers ? '✅ Yes' : '❌ No'}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRoom(c.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 7. STUDENT GROUPS TAB */}
      {activeTab === 'groups' && (
        <section className="section-card animate-fade-in">
          <div className="section-toolbar">
            <div className="toolbar-title">
              <h2>Student Groups / Batches</h2>
              <p>Manage academic divisions, cohort strength, and assigned curriculum</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowGroupModal(true)}>
              <Plus size={16} />
              <span>Add Group</span>
            </button>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Group Name</th>
                  <th>Department</th>
                  <th>Academic Year</th>
                  <th>Semester</th>
                  <th>Division</th>
                  <th>Student Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <strong>{g.name}</strong>
                    </td>
                    <td>{g.department}</td>
                    <td>{g.academic_year}</td>
                    <td>Sem {g.semester}</td>
                    <td>Div {g.division || 'A'}</td>
                    <td>{g.student_count} students</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteGroup(g.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
        </main>
      </div>

      {/* TIME SLOT ADD/EDIT MODAL */}
      {showSlotModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                {editingSlotId
                  ? (slotApplyAllDays ? 'Edit Standard Weekly Slot (All Weekdays)' : 'Edit Time Slot')
                  : (slotApplyAllDays ? 'Add Standard Weekly Slot (All Weekdays)' : 'Add Custom Time Slot')}
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSlotModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveSlot}>
              {/* Sync Across All Weeks / Weekdays Toggle Banner */}
              <div
                style={{
                  background: slotApplyAllDays ? '#f0fdf4' : '#f8fafc',
                  border: `1.5px solid ${slotApplyAllDays ? '#86efac' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  transition: 'all 0.2s ease',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                  <input
                    type="checkbox"
                    checked={slotApplyAllDays}
                    onChange={(e) => setSlotApplyAllDays(e.target.checked)}
                    style={{ width: '17px', height: '17px', accentColor: '#16a34a' }}
                  />
                  <span>🔁 Apply to all weekdays (Monday – Friday)</span>
                </label>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', marginLeft: '27px' }}>
                  {slotApplyAllDays
                    ? 'Changing this standard slot will automatically update every week across all weekdays so you do not need to configure each day separately.'
                    : 'Applies only to the specific day selected below.'}
                </div>
              </div>

              {!slotApplyAllDays && (
                <div className="form-group">
                  <label>Day of Week</label>
                  <select
                    className="form-control"
                    value={slotForm.day_of_week}
                    onChange={(e) => setSlotForm({ ...slotForm, day_of_week: e.target.value })}
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time (HH:MM)</label>
                  <input
                    type="time"
                    className="form-control"
                    required
                    value={slotForm.start_time}
                    onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Time (HH:MM)</label>
                  <input
                    type="time"
                    className="form-control"
                    required
                    value={slotForm.end_time}
                    onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Slot Label / Description</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Period 1, Morning Assembly, Lunch Break"
                  value={slotForm.label}
                  onChange={(e) => setSlotForm({ ...slotForm, label: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={slotForm.is_break}
                    onChange={(e) => setSlotForm({ ...slotForm, is_break: e.target.checked })}
                  />
                  <span>Mark as Break / Recess / Lunch (Non-academic interval)</span>
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSlotModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSlotId
                    ? (slotApplyAllDays ? 'Update for All Weekdays' : 'Save Changes')
                    : (slotApplyAllDays ? 'Create for All Weekdays' : 'Create Time Slot')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATE SCHEDULE MODAL */}
      {showGenerateModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Generate Clash-Free Timetable</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowGenerateModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleGenerateTimetable}>
              <div className="form-group">
                <label>Timetable Title</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={genForm.name}
                  onChange={(e) => setGenForm({ ...genForm, name: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Department (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="All Departments"
                    value={genForm.department}
                    onChange={(e) => setGenForm({ ...genForm, department: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Semester (Optional)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="All Semesters"
                    value={genForm.semester}
                    onChange={(e) => setGenForm({ ...genForm, semester: e.target.value })}
                  />
                </div>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                💡 Solves constraints for zero faculty overlap, zero room double-booking, and zero student cohort clashes across your configured time slots.
              </p>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Sparkles size={16} />
                  <span>{loading ? 'Solving...' : 'Run Generator'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SUBJECT MODAL */}
      {showSubjectModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Subject</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSubjectModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateSubject}>
              <div className="form-row">
                <div className="form-group">
                  <label>Subject Name</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. Operating Systems"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Course Code</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. CS302"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={subjectForm.department}
                    onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min={1}
                    value={subjectForm.semester}
                    onChange={(e) => setSubjectForm({ ...subjectForm, semester: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Subject Type</label>
                  <select
                    className="form-control"
                    value={subjectForm.subject_type}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subject_type: e.target.value })}
                  >
                    <option value="theory">Theory</option>
                    <option value="practical">Practical</option>
                    <option value="tutorial">Tutorial</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Required Room Type</label>
                  <select
                    className="form-control"
                    value={subjectForm.required_room_type}
                    onChange={(e) => setSubjectForm({ ...subjectForm, required_room_type: e.target.value })}
                  >
                    <option value="classroom">Classroom</option>
                    <option value="laboratory">Laboratory</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Weekly Sessions Needed</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  min={1}
                  max={10}
                  value={subjectForm.weekly_sessions}
                  onChange={(e) => setSubjectForm({ ...subjectForm, weekly_sessions: parseInt(e.target.value) || 3 })}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSubjectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE FACULTY MODAL */}
      {showFacultyModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Faculty Member</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowFacultyModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateFaculty}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Dr. Alan Turing"
                  value={facultyForm.name}
                  onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="alan@university.edu"
                    value={facultyForm.email}
                    onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    className="form-control"
                    value={facultyForm.designation}
                    onChange={(e) => setFacultyForm({ ...facultyForm, designation: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={facultyForm.department}
                  onChange={(e) => setFacultyForm({ ...facultyForm, department: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFacultyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CLASSROOM MODAL */}
      {showRoomModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Classroom / Lab</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowRoomModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateRoom}>
              <div className="form-row">
                <div className="form-group">
                  <label>Room Name / Number</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. Room 101"
                    value={roomForm.name}
                    onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Building</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Academic Block A"
                    value={roomForm.building}
                    onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Room Type</label>
                  <select
                    className="form-control"
                    value={roomForm.room_type}
                    onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}
                  >
                    <option value="classroom">Classroom</option>
                    <option value="laboratory">Laboratory</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Student Capacity</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min={1}
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 50 })}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRoomModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE STUDENT GROUP MODAL */}
      {showGroupModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Student Group</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowGroupModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. CS-A (3rd Sem)"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={groupForm.department}
                    onChange={(e) => setGroupForm({ ...groupForm, department: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min={1}
                    value={groupForm.semester}
                    onChange={(e) => setGroupForm({ ...groupForm, semester: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Division</label>
                  <input
                    type="text"
                    className="form-control"
                    value={groupForm.division}
                    onChange={(e) => setGroupForm({ ...groupForm, division: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Student Count</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min={1}
                    value={groupForm.student_count}
                    onChange={(e) => setGroupForm({ ...groupForm, student_count: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowGroupModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL UNIVERSITY PRINT SHEET MODAL (PDF STYLE) */}
      {printModal && (
        <UniversityPrintSheet
          mode={printModal.mode}
          timetable={currentTimetable}
          selectedFaculty={selectedFacultyObj}
          selectedGroup={filterGroup}
          timeSlots={timeSlots}
          subjects={subjects}
          facultyList={faculty}
          onClose={() => setPrintModal(null)}
        />
      )}
    </div>
  );
}
