import { ArrowRight, BookOpen, Check, Plus, RefreshCw, Trash2, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, messageFrom } from '@/lib/api';
import type { DataRecord } from '@/lib/types';
import { EmptyState, Notice, SkeletonRows } from '@/components/ui';

export default function AssignmentPage({ kind }: { kind: 'faculty' | 'student-groups' }) {
  const [owners, setOwners] = useState<DataRecord[]>([]);
  const [subjects, setSubjects] = useState<DataRecord[]>([]);
  const [assigned, setAssigned] = useState<DataRecord[]>([]);
  const [selected, setSelected] = useState('');
  const [subjectToAdd, setSubjectToAdd] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const ownerLabel = kind === 'faculty' ? 'faculty member' : 'student group';
  const ownerPath = kind === 'faculty' ? 'faculty' : 'student-groups';
  const assignmentLabel = kind === 'faculty' ? 'Faculty assignments' : 'Group assignments';

  const loadOwnersAndSubjects = async () => {
    setLoading(true);
    setError('');
    try {
      const [ownerList, subjectList] = await Promise.all([
        api.getAll<DataRecord>(`/${ownerPath}`),
        api.getAll<DataRecord>('/subjects'),
      ]);
      setOwners(ownerList);
      setSubjects(subjectList);
      if (!selected && ownerList[0]) setSelected(String(ownerList[0].id));
      if (selected && !ownerList.some((owner) => String(owner.id) === selected)) setSelected('');
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setLoading(false);
    }
  };

  const loadAssigned = async (ownerId = selected) => {
    if (!ownerId) {
      setAssigned([]);
      return;
    }
    setAssignmentLoading(true);
    setError('');
    try {
      setAssigned(await api.getAll<DataRecord>(`/${ownerPath}/${ownerId}/subjects`));
    } catch (err) {
      setError(messageFrom(err));
      setAssigned([]);
    } finally {
      setAssignmentLoading(false);
    }
  };

  useEffect(() => {
    void loadOwnersAndSubjects();
  }, [kind]);

  useEffect(() => {
    void loadAssigned();
    setSubjectToAdd('');
  }, [selected, ownerPath]);

  const selectedOwner = owners.find((owner) => String(owner.id) === selected);
  const assignedIds = useMemo(() => new Set(assigned.map((subject) => String(subject.id))), [assigned]);
  const availableSubjects = subjects.filter((subject) => !assignedIds.has(String(subject.id)));

  const addAssignment = async () => {
    if (!selected || !subjectToAdd) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`/${ownerPath}/${selected}/subjects`, { subject_id: subjectToAdd });
      setNotice('Subject assigned successfully.');
      setSubjectToAdd('');
      await loadAssigned();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async (subject: DataRecord) => {
    if (!selected || !window.confirm(`Remove ${subject.name || subject.code || 'this subject'} from this ${ownerLabel}?`)) return;
    setSaving(true);
    setError('');
    try {
      await api.delete(`/${ownerPath}/${selected}/subjects/${subject.id}`);
      setNotice('Assignment removed.');
      await loadAssigned();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  };

  return <div className="fade-in space-y-5">
    <div className="page-header flex items-end justify-between gap-4">
      <div><div className="eyebrow mb-2">Relationships / {kind === 'faculty' ? 'faculty' : 'cohorts'}</div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{assignmentLabel}</h1><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Review which subjects are connected to each {ownerLabel}.</p></div>
      <button className="btn btn-quiet" onClick={() => { void loadOwnersAndSubjects(); void loadAssigned(); }} disabled={loading || saving} data-testid="button-refresh-assignments"><RefreshCw size={15} /> Refresh</button>
    </div>
    {notice && <Notice type="success" onClose={() => setNotice('')}>{notice}</Notice>}
    {error && <Notice type="error">{error} <button className="ml-1 underline" onClick={() => { void loadOwnersAndSubjects(); void loadAssigned(); }} data-testid="button-retry-assignments">Retry</button></Notice>}
    <section className="panel overflow-hidden">
      <div className="border-b border-[hsl(var(--border)/.7)] bg-[hsl(var(--muted)/.35)] p-4 sm:p-5">
        <label className="field-label" htmlFor="assignment-owner">Select {ownerLabel}</label>
        <select id="assignment-owner" className="field max-w-xl" value={selected} onChange={(event) => setSelected(event.target.value)} disabled={loading && owners.length === 0} data-testid="select-assignment-owner">
          <option value="">Select {ownerLabel}</option>{owners.map((owner) => <option value={String(owner.id)} key={String(owner.id)}>{owner.name || owner.code}</option>)}
        </select>
        {selectedOwner && <div className="mt-3 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><span className="status-dot text-[hsl(var(--primary))]" />{selectedOwner.department || 'Department not set'}<span className="opacity-40">·</span><span className="mono">ID {selectedOwner.id}</span></div>}
      </div>
      {selected && !loading && <div className="flex flex-col gap-3 border-b border-[hsl(var(--border)/.7)] p-4 sm:flex-row sm:items-end">
        <label className="flex-1"><span className="field-label">Available subject</span><select className="field" value={subjectToAdd} onChange={(event) => setSubjectToAdd(event.target.value)} disabled={saving || availableSubjects.length === 0} data-testid="select-available-subject"><option value="">{availableSubjects.length ? 'Select a subject to assign' : 'All subjects are assigned'}</option>{availableSubjects.map((subject) => <option value={String(subject.id)} key={String(subject.id)}>{subject.code ? `${subject.code} · ` : ''}{subject.name || `Subject ${subject.id}`}</option>)}</select></label>
        <button className="btn btn-primary" onClick={() => void addAssignment()} disabled={!subjectToAdd || saving} data-testid="button-assign-subject"><Plus size={15} /> Assign subject</button>
      </div>}
      {loading || assignmentLoading ? <SkeletonRows columns={3} /> : !selected ? <EmptyState title={`Select a ${ownerLabel}`} detail={`Choose a ${ownerLabel} above to inspect connected subjects.`} /> : assigned.length === 0 ? <EmptyState title="No subjects assigned" detail="This relationship is empty in the scheduling service." /> : <div className="divide-y divide-[hsl(var(--border)/.65)]">{assigned.map((subject, index) => <div className="flex items-center gap-4 p-5" key={String(subject.id)} data-testid={`assignment-row-${subject.id}`}><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><BookOpen size={17} /></div><div className="flex-1"><div className="font-semibold">{subject.name || subject.code || `Subject ${index + 1}`}</div><div className="mt-1 flex gap-2 text-xs text-[hsl(var(--muted-foreground))]"><span className="mono">{subject.code || `ID ${subject.id}`}</span>{subject.department && <><span>·</span><span>{subject.department}</span></>}</div></div><button className="btn btn-quiet text-[hsl(var(--destructive))]" onClick={() => void removeAssignment(subject)} disabled={saving} data-testid={`button-remove-assignment-${subject.id}`}><Trash2 size={14} /> Remove</button><ArrowRight size={15} className="text-[hsl(var(--muted-foreground))]" /></div>)}</div>}
    </section>
    <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-4 text-xs text-[hsl(var(--muted-foreground))]"><UsersRound size={15} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" /><span>Assignments are managed by the university scheduling service. This view reads the current server state and only reports a change after the API confirms it.</span><Check size={15} className="hidden text-[hsl(var(--primary))] sm:block" /></div>
  </div>;
}