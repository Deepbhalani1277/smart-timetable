import { ArrowRight, Check, ChevronLeft, ChevronRight, Edit3, Eye, Filter, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { api, listFrom, messageFrom } from '@/lib/api';
import type { DataRecord, FieldConfig, ResourceConfig, ResourceKey } from '@/lib/types';
import { EmptyState, Modal, Notice, SkeletonRows } from '@/components/ui';

const configs: Record<ResourceKey, ResourceConfig> = {
  subjects: {
    key: 'subjects', title: 'Subjects', singular: 'subject', description: 'The teaching units that shape this term’s plan.', icon: 'SUBJECTS',
    fields: [
      { key: 'name', label: 'Subject name', required: true, placeholder: 'e.g. Distributed Systems' }, { key: 'code', label: 'Code', required: true, placeholder: 'e.g. CS401' },
      { key: 'department', label: 'Department', required: true, placeholder: 'e.g. Computer Science' }, { key: 'semester', label: 'Semester', type: 'number', required: true, placeholder: '1' },
      { key: 'weekly_sessions', label: 'Sessions / week', type: 'number', required: true, placeholder: '2' }, { key: 'duration_minutes', label: 'Duration (minutes)', type: 'number', required: true, placeholder: '90' },
      { key: 'subject_type', label: 'Subject type', type: 'select', required: true, options: [{ value: 'theory', label: 'Theory' }, { value: 'practical', label: 'Practical' }, { value: 'tutorial', label: 'Tutorial' }] },
      { key: 'required_room_type', label: 'Required room', type: 'select', options: [{ value: 'classroom', label: 'Lecture room' }, { value: 'laboratory', label: 'Computer lab' }] },
      { key: 'requires_consecutive_slots', label: 'Requires consecutive slots', type: 'checkbox' },
    ],
    columns: [{ key: 'code', label: 'Code', mono: true }, { key: 'name', label: 'Subject' }, { key: 'department', label: 'Department' }, { key: 'semester', label: 'Sem.' }, { key: 'subject_type', label: 'Type' }],
    filters: [
      { key: 'department', label: 'Department' },
      { key: 'semester', label: 'Semester' },
      { key: 'subject_type', label: 'Type', options: [{ value: 'theory', label: 'Theory' }, { value: 'practical', label: 'Practical' }, { value: 'tutorial', label: 'Tutorial' }] },
      { key: 'required_room_type', label: 'Room type', options: [{ value: 'classroom', label: 'Lecture' }, { value: 'laboratory', label: 'Lab' }] },
    ],
  },
  faculty: {
    key: 'faculty', title: 'Faculty', singular: 'faculty member', description: 'Teaching capacity and availability constraints.', icon: 'FACULTY',
    fields: [{ key: 'name', label: 'Full name', required: true, placeholder: 'e.g. Dr. Maya Chen' }, { key: 'email', label: 'University email', type: 'email', required: true, placeholder: 'name@university.edu' }, { key: 'department', label: 'Department', required: true, placeholder: 'e.g. Engineering' }, { key: 'designation', label: 'Designation', required: true, placeholder: 'e.g. Senior Lecturer' }, { key: 'max_hours_per_day', label: 'Max hours / day', type: 'number', required: true, placeholder: '6' }, { key: 'max_hours_per_week', label: 'Max hours / week', type: 'number', required: true, placeholder: '18' }],
    columns: [{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email', mono: true }, { key: 'department', label: 'Department' }, { key: 'designation', label: 'Designation' }, { key: 'max_hours_per_week', label: 'Weekly cap' }],
    filters: [{ key: 'department', label: 'Department' }, { key: 'designation', label: 'Designation' }],
  },
  classrooms: {
    key: 'classrooms', title: 'Classrooms', singular: 'classroom', description: 'Rooms, capacity, and equipment available to the scheduler.', icon: 'ROOMS',
    fields: [{ key: 'name', label: 'Room name', required: true, placeholder: 'e.g. North Hall 204' }, { key: 'building', label: 'Building', required: true, placeholder: 'e.g. North Hall' }, { key: 'capacity', label: 'Capacity', type: 'number', required: true, placeholder: '80' }, { key: 'room_type', label: 'Room type', type: 'select', required: true, options: [{ value: 'classroom', label: 'Lecture room' }, { value: 'laboratory', label: 'Computer lab' }] }, { key: 'has_projector', label: 'Projector available', type: 'checkbox' }, { key: 'has_computers', label: 'Computers available', type: 'checkbox' }],
    columns: [{ key: 'name', label: 'Room' }, { key: 'building', label: 'Building' }, { key: 'capacity', label: 'Seats' }, { key: 'room_type', label: 'Type' }, { key: 'has_projector', label: 'Projector' }, { key: 'has_computers', label: 'Computers' }],
    filters: [
      { key: 'building', label: 'Building' },
      { key: 'room_type', label: 'Room type', options: [{ value: 'classroom', label: 'Lecture' }, { value: 'laboratory', label: 'Lab' }] },
      { key: 'has_projector', label: 'Projector', options: [{ value: 'true', label: 'Available' }, { value: 'false', label: 'None' }] },
      { key: 'has_computers', label: 'Computers', options: [{ value: 'true', label: 'Available' }, { value: 'false', label: 'None' }] },
    ],
  },
  'student-groups': {
    key: 'student-groups', title: 'Student groups', singular: 'student group', description: 'Cohorts that move through the teaching plan together.', icon: 'COHORTS',
    fields: [{ key: 'name', label: 'Group name', required: true, placeholder: 'e.g. BSc CS · Year 2 · A' }, { key: 'department', label: 'Department', required: true, placeholder: 'e.g. Computer Science' }, { key: 'academic_year', label: 'Academic year', required: true, placeholder: '2025 / 26' }, { key: 'semester', label: 'Semester', type: 'number', required: true, placeholder: '3' }, { key: 'division', label: 'Division', required: true, placeholder: 'A' }, { key: 'student_count', label: 'Students', type: 'number', required: true, placeholder: '42' }],
    columns: [{ key: 'name', label: 'Group' }, { key: 'department', label: 'Department' }, { key: 'academic_year', label: 'Year' }, { key: 'semester', label: 'Sem.' }, { key: 'division', label: 'Division' }, { key: 'student_count', label: 'Students' }],
    filters: [{ key: 'department', label: 'Department' }, { key: 'academic_year', label: 'Academic year' }, { key: 'semester', label: 'Semester' }, { key: 'division', label: 'Division' }],
  },
  'time-slots': {
    key: 'time-slots', title: 'Time slots', singular: 'time slot', description: 'The clock grid used when building a conflict-free timetable.', icon: 'TIME GRID',
    fields: [{ key: 'day_of_week', label: 'Day', type: 'select', required: true, options: [{ value: 'monday', label: 'Monday' }, { value: 'tuesday', label: 'Tuesday' }, { value: 'wednesday', label: 'Wednesday' }, { value: 'thursday', label: 'Thursday' }, { value: 'friday', label: 'Friday' }, { value: 'saturday', label: 'Saturday' }] }, { key: 'start_time', label: 'Start time', type: 'time', required: true }, { key: 'end_time', label: 'End time', type: 'time', required: true }, { key: 'label', label: 'Display label', required: true, placeholder: 'e.g. Morning block 1' }, { key: 'is_break', label: 'Break / unavailable', type: 'checkbox' }],
    columns: [{ key: 'day_of_week', label: 'Day' }, { key: 'start_time', label: 'Start', mono: true }, { key: 'end_time', label: 'End', mono: true }, { key: 'label', label: 'Label' }, { key: 'is_break', label: 'Status' }],
    filters: [{ key: 'day_of_week', label: 'Day', options: [{ value: 'monday', label: 'Monday' }, { value: 'tuesday', label: 'Tuesday' }, { value: 'wednesday', label: 'Wednesday' }, { value: 'thursday', label: 'Thursday' }, { value: 'friday', label: 'Friday' }, { value: 'saturday', label: 'Saturday' }] }],
  },
};

function display(value: unknown, field?: string) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'day_of_week' || field === 'subject_type' || field === 'room_type') return String(value).replaceAll('_', ' ');
  return String(value);
}

function initialValues(fields: FieldConfig[], item?: DataRecord) {
  return fields.reduce<Record<string, string | number | boolean>>((all, field) => {
    all[field.key] = item?.[field.key] !== undefined && item?.[field.key] !== null ? item[field.key] as string | number | boolean : field.type === 'checkbox' ? false : '';
    return all;
  }, {});
}

export default function ResourcePage({ resourceKey }: { resourceKey: ResourceKey }) {
  const config = configs[resourceKey];
  const [items, setItems] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [minimumCapacity, setMinimumCapacity] = useState('');
  const [breakFilter, setBreakFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<DataRecord | undefined>();
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ReturnType<typeof setTimeout> | null>(null);
  const pageSize = 8;

  const load = async () => {
    setLoading(true); setError('');
    try { setItems(await api.getAll<DataRecord>(`/${config.key}`)); }
    catch (err) { setError(messageFrom(err)); setItems([]); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [resourceKey]);
  const filtered = useMemo(() => items.filter((item) => {
    const haystack = config.columns.map((column) => item[column.key]).join(' ').toLowerCase();
    const matchesBreak = resourceKey !== 'time-slots' || breakFilter === 'all' || String(Boolean(item.is_break)) === breakFilter;
    const matchesCapacity = resourceKey !== 'classrooms' || !minimumCapacity || Number(item.capacity || 0) >= Number(minimumCapacity);
     return haystack.includes(search.toLowerCase()) &&
       (config.filters || []).every((entry) => !filters[entry.key] || String(item[entry.key]) === filters[entry.key]) &&
       matchesBreak && matchesCapacity;
  }).sort((a, b) => resourceKey === 'time-slots'
    ? `${String(a.day_of_week || '')}-${String(a.start_time || '')}`.localeCompare(`${String(b.day_of_week || '')}-${String(b.start_time || '')}`)
    : 0), [items, search, filters, minimumCapacity, breakFilter, config, resourceKey]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const openCreate = () => { setEditing(undefined); setForm(initialValues(config.fields)); setFormError(''); setModal('create'); };
  const openEdit = (item: DataRecord) => { setEditing(item); setForm(initialValues(config.fields, item)); setFormError(''); setModal('edit'); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setFormError('');
    const missing = config.fields.find((field) => field.required && (form[field.key] === '' || form[field.key] === undefined));
    if (missing) { setFormError(`${missing.label} is required.`); return; }
    const payload = Object.fromEntries(config.fields.map((field) => [field.key, field.type === 'number' ? Number(form[field.key]) : form[field.key]]));
    setSaving(true);
    try { if (modal === 'edit' && editing) await api.put(`/${config.key}/${editing.id}`, payload); else await api.post(`/${config.key}`, payload); setModal(null); setNotice(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} ${modal === 'edit' ? 'updated' : 'created'}.`); await load(); }
    catch (err) { setFormError(messageFrom(err)); } finally { setSaving(false); }
  };
  const remove = async (item: DataRecord) => {
    if (!window.confirm(`Delete ${item.name || item.code || config.singular}? This cannot be undone.`)) return;
    setDeleting(setTimeout(() => undefined, 1)); setError('');
    try { await api.delete(`/${config.key}/${item.id}`); setNotice(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} deleted.`); await load(); }
    catch (err) { setError(messageFrom(err)); } finally { if (deleting) clearTimeout(deleting); setDeleting(null); }
  };
  return <div className="fade-in space-y-5">
    <div className="page-header flex items-end justify-between gap-4"><div><div className="eyebrow mb-2">{config.icon}</div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{config.title}</h1><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{config.description}</p></div><button className="btn btn-primary" onClick={openCreate} data-testid={`button-add-${config.key}`}><Plus size={16} /> Add {config.singular}</button></div>
    {notice && <Notice type="success" onClose={() => setNotice('')}>{notice}</Notice>}
    {error && <Notice type="error" onClose={() => setError('')}>{error} <button className="ml-2 underline" onClick={() => void load()} data-testid="button-retry-load">Retry</button></Notice>}
    <section className="panel overflow-hidden">
       <div className="flex flex-wrap items-center gap-3 border-b border-[hsl(var(--border)/.7)] p-3 sm:p-4"><div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input className="field !pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={`Search ${config.title.toLowerCase()}...`} aria-label={`Search ${config.title}`} data-testid={`input-search-${config.key}`} /></div>{(config.filters || []).map((entry) => { const options = entry.options || [...new Set(items.map((item) => String(item[entry.key] ?? '')).filter(Boolean))].map((value) => ({ value, label: display(value, entry.key) })); return <div className="flex items-center gap-2" key={entry.key}><Filter size={15} className="text-[hsl(var(--muted-foreground))]" /><select className="field w-auto min-w-[135px]" value={filters[entry.key] || ''} onChange={(event) => { setFilters((current) => ({ ...current, [entry.key]: event.target.value })); setPage(1); }} aria-label={`Filter by ${entry.label}`} data-testid={`select-filter-${config.key}-${entry.key}`}><option value="">All {entry.label.toLowerCase()}s</option>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>; })}{resourceKey === 'classrooms' && <input className="field w-auto min-w-[135px]" type="number" min="0" value={minimumCapacity} onChange={(event) => { setMinimumCapacity(event.target.value); setPage(1); }} placeholder="Min capacity" aria-label="Minimum classroom capacity" data-testid="input-filter-min-capacity" />}{resourceKey === 'time-slots' && <select className="field w-auto min-w-[145px]" value={breakFilter} onChange={(event) => { setBreakFilter(event.target.value); setPage(1); }} aria-label="Filter time slot breaks" data-testid="select-filter-breaks"><option value="all">All slot types</option><option value="false">Teaching slots</option><option value="true">Breaks</option></select>}<button className="btn btn-quiet btn-icon" onClick={() => void load()} aria-label="Refresh data" data-testid="button-refresh-data"><RefreshCw size={15} /></button></div>
      {loading ? <SkeletonRows columns={config.columns.length + 1} /> : visible.length === 0 ? <EmptyState title={items.length ? 'No matching records' : `No ${config.title.toLowerCase()} yet`} detail={items.length ? 'Try adjusting the search or filter.' : `Add your first ${config.singular} to start planning.`} /> : <><div className="table-wrap"><table className="data-table"><thead><tr>{config.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map((item) => <tr key={String(item.id)} data-testid={`row-${config.key}-${item.id}`}>{config.columns.map((column) => <td key={column.key} className={column.mono ? 'mono' : ''}>{column.key === 'name' || column.key === 'code' ? <div className="font-semibold">{display(item[column.key], column.key)}</div> : column.key === 'has_projector' || column.key === 'has_computers' || column.key === 'is_break' || column.key === 'requires_consecutive_slots' ? <span className={`inline-flex items-center gap-1.5 text-xs ${item[column.key] ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}><span className="status-dot" />{display(item[column.key], column.key)}</span> : display(item[column.key], column.key)}</td>)}<td><div className="flex justify-end gap-1"><button className="btn btn-quiet btn-icon" onClick={() => openEdit(item)} aria-label={`Edit ${config.singular}`} data-testid={`button-edit-${config.key}-${item.id}`}><Edit3 size={14} /></button><button className="btn btn-quiet btn-icon text-[hsl(var(--destructive))]" onClick={() => void remove(item)} disabled={deleting !== null} aria-label={`Delete ${config.singular}`} data-testid={`button-delete-${config.key}-${item.id}`}><Trash2 size={14} /></button>{(resourceKey === 'faculty' || resourceKey === 'student-groups') && <Link className="btn btn-quiet btn-icon" href={`/assignments/${resourceKey === 'faculty' ? 'faculty' : 'student-groups'}?${resourceKey === 'faculty' ? 'facultyId' : 'groupId'}=${item.id}`} aria-label="View assignments" data-testid={`link-assignments-${item.id}`}><ArrowRight size={14} /></Link>}</div></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-[hsl(var(--border)/.7)] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]"><span className="mono">{filtered.length} {filtered.length === 1 ? 'record' : 'records'}</span><div className="flex items-center gap-2"><span>Page {page} of {totalPages}</span><button className="btn btn-quiet btn-icon" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page" data-testid="button-previous-page"><ChevronLeft size={14} /></button><button className="btn btn-quiet btn-icon" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Next page" data-testid="button-next-page"><ChevronRight size={14} /></button></div></div></>}
    </section>
    {modal && <Modal title={`${modal === 'edit' ? 'Edit' : 'Add'} ${config.singular}`} onClose={() => !saving && setModal(null)}><form onSubmit={submit} className="space-y-4">{formError && <Notice type="error">{formError}</Notice>}<div className="grid gap-4 sm:grid-cols-2">{config.fields.map((field) => <label className={field.type === 'checkbox' ? 'flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-3 sm:col-span-2' : ''} key={field.key}>{field.type === 'checkbox' ? <><input type="checkbox" checked={Boolean(form[field.key])} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.checked }))} data-testid={`input-${field.key}`} /><span className="text-sm font-medium">{field.label}</span></> : <><span className="field-label">{field.label}{field.required && <span className="text-[hsl(var(--accent))]"> *</span>}</span>{field.type === 'select' ? <select className="field" value={String(form[field.key] ?? '')} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} data-testid={`input-${field.key}`}><option value="">Select {field.label.toLowerCase()}</option>{field.options?.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select> : <input className="field" type={field.type || 'text'} value={String(form[field.key] ?? '')} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} data-testid={`input-${field.key}`} />}</>}</label>)}</div><div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-5"><button type="button" className="btn btn-quiet" onClick={() => setModal(null)} disabled={saving} data-testid="button-cancel-form"><X size={15} /> Cancel</button><button type="submit" className="btn btn-primary" disabled={saving} data-testid="button-submit-form">{saving ? 'Saving…' : <><Check size={15} /> Save {config.singular}</>}</button></div></form></Modal>}
  </div>;
}