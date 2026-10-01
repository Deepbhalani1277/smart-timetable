import { Activity, ArrowUpRight, BookOpen, Building2, CalendarClock, GraduationCap, RefreshCw, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { api, messageFrom } from '@/lib/api';
import { Notice, SkeletonRows } from '@/components/ui';

const metrics = [
  { key: 'subjects', label: 'Subjects', icon: BookOpen, href: '/subjects', tone: 'teal' },
  { key: 'faculty', label: 'Faculty', icon: UsersRound, href: '/faculty', tone: 'gold' },
  { key: 'classrooms', label: 'Classrooms', icon: Building2, href: '/classrooms', tone: 'coral' },
  { key: 'student-groups', label: 'Student groups', icon: GraduationCap, href: '/student-groups', tone: 'ink' },
];

export default function Dashboard() {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState('');
  const load = async () => {
    setLoading(true); setOffline('');
    const results = await Promise.allSettled(metrics.map((metric) => api.getAll<unknown>(`/${metric.key}`)));
    const next: Record<string, number | null> = {};
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        next[metrics[index].key] = result.value.length;
      } else next[metrics[index].key] = null;
    });
    setCounts(next); if (results.some((result) => result.status === 'rejected')) setOffline(messageFrom(results.find((result) => result.status === 'rejected') as PromiseRejectedResult));
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  return <div className="fade-in space-y-7">
    <div className="page-header flex items-end justify-between gap-4"><div><div className="eyebrow mb-2">Planning desk / overview</div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your planning desk.</h1><p className="mt-1 max-w-xl text-sm text-[hsl(var(--muted-foreground))]">Keep the teaching plan balanced before the first bell. Start with your source data, then wire the relationships.</p></div><button className="btn btn-quiet" onClick={() => void load()} data-testid="button-refresh-dashboard"><RefreshCw size={15} /> Refresh</button></div>
    {offline && <Notice type="error">{offline} Live totals are hidden until the service responds. <button className="ml-1 underline" onClick={() => void load()} data-testid="button-retry-dashboard">Retry</button></Notice>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ key, label, icon: Icon, href, tone }) => <Link href={href} className="panel group relative overflow-hidden p-5 transition-transform hover:-translate-y-0.5" key={key} data-testid={`card-metric-${key}`}><div className={`absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full ${tone === 'teal' ? 'bg-[hsl(var(--primary)/.12)]' : tone === 'gold' ? 'bg-[hsl(var(--secondary)/.17)]' : tone === 'coral' ? 'bg-[hsl(var(--accent)/.12)]' : 'bg-[hsl(var(--foreground)/.07)]'}`} /><div className="relative flex items-start justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><Icon size={18} /></div><ArrowUpRight size={16} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div><div className="relative mt-6">{loading ? <div className="skeleton h-9 w-16" /> : <div className="mono text-3xl font-bold">{counts[key] === null || counts[key] === undefined ? '—' : counts[key]}</div>}<div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{label}</div></div></Link>)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
      <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-[hsl(var(--border)/.7)] p-5"><div><div className="eyebrow mb-2">Next actions</div><h2 className="font-bold">Build the timetable foundation</h2></div><Activity size={18} className="text-[hsl(var(--primary))]" /></div><div className="divide-y divide-[hsl(var(--border)/.65)]">{[{ label: 'Define subjects', detail: 'Add codes, teaching rhythm, and room requirements.', href: '/subjects', icon: BookOpen }, { label: 'Set up faculty', detail: 'Record capacity limits before assigning sessions.', href: '/faculty', icon: UsersRound }, { label: 'Shape the clock grid', detail: 'Add teaching blocks and mark breaks.', href: '/time-slots', icon: CalendarClock }].map(({ label, detail, href, icon: Icon }, index) => <Link href={href} className="flex items-center gap-4 p-5 transition-colors hover:bg-[hsl(var(--primary)/.04)]" key={href} data-testid={`link-action-${index}`}><div className="mono flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-xs text-[hsl(var(--primary))]">0{index + 1}</div><div className="flex-1"><div className="flex items-center gap-2 text-sm font-semibold"><Icon size={15} className="text-[hsl(var(--primary))]" />{label}</div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{detail}</p></div><ArrowUpRight size={16} className="text-[hsl(var(--muted-foreground))]" /></Link>)}</div></section>
      <section className="panel flex flex-col overflow-hidden"><div className="border-b border-[hsl(var(--border)/.7)] p-5"><div className="eyebrow mb-2">Operating note</div><h2 className="font-bold">A dependable plan starts with clean inputs.</h2></div><div className="flex flex-1 flex-col justify-between p-5"><p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">Schedulecraft keeps the source records separate from the relationships between them. That makes it easier to spot capacity gaps before they become timetable conflicts.</p><div className="mt-8 rounded-lg bg-[hsl(var(--muted)/.7)] p-4"><div className="mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Connection status</div><div className="mt-2 flex items-center gap-2 text-sm font-semibold"><span className="status-dot text-emerald-600" />Live service checks run on each view</div></div></div></section>
    </div>
    <section className="panel grid gap-4 p-5 sm:grid-cols-3"><div><div className="eyebrow mb-2">Quick links</div><h2 className="font-bold">Keep moving</h2></div><Link className="btn btn-quiet justify-between" href="/assignments/faculty" data-testid="link-quick-faculty-assignments">Faculty assignments <ArrowUpRight size={15} /></Link><Link className="btn btn-quiet justify-between" href="/assignments/student-groups" data-testid="link-quick-group-assignments">Group assignments <ArrowUpRight size={15} /></Link></section>
    {loading && <div className="hidden"><SkeletonRows /></div>}
  </div>;
}