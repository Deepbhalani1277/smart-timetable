import { BookOpen, Building2, CalendarClock, ClipboardList, GraduationCap, LayoutDashboard, Menu, Network, UsersRound, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useEffect } from 'react';
import { api } from '@/lib/api';

const nav = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/faculty', label: 'Faculty', icon: UsersRound },
  { href: '/classrooms', label: 'Classrooms', icon: Building2 },
  { href: '/student-groups', label: 'Student groups', icon: GraduationCap },
  { href: '/time-slots', label: 'Time slots', icon: CalendarClock },
];
const assignmentNav = [
  { href: '/assignments/faculty', label: 'Faculty assignments', icon: Network },
  { href: '/assignments/student-groups', label: 'Group assignments', icon: ClipboardList },
];

export default function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => { let active = true; api.health().then(() => active && setOnline(true)).catch(() => active && setOnline(false)); return () => { active = false; }; }, [location]);
  const links = [...nav, ...assignmentNav];
  return <div className="app-shell noise">
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))] transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="mb-8 flex items-center justify-between px-2"><Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)} data-testid="link-brand"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]"><span className="mono font-bold">SC</span></div><div><div className="text-sm font-bold tracking-tight">Schedule<span className="text-[hsl(var(--sidebar-primary))]">craft</span></div><div className="mt-0.5 font-mono text-[9px] uppercase tracking-[.14em] opacity-50">Registrar workspace</div></div></Link><button className="btn btn-icon md:hidden text-[hsl(var(--sidebar-foreground))]" onClick={() => setOpen(false)} aria-label="Close navigation" data-testid="button-close-navigation"><X size={17} /></button></div>
      <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[.14em] opacity-40">Planning desk</div>
      <nav className="space-y-1">{links.map(({ href, label, icon: Icon }, index) => {
        const active = href === '/' ? location === '/' : location.startsWith(href);
        const isAssignment = index === nav.length;
        return <div key={href}>{isAssignment && <div className="mb-2 mt-6 px-2 font-mono text-[10px] uppercase tracking-[.14em] opacity-40">Relationships</div>}<Link href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? 'bg-[hsl(var(--sidebar-accent))] font-semibold text-[hsl(var(--sidebar-accent-foreground))]' : 'opacity-70 hover:bg-[hsl(var(--sidebar-accent))] hover:opacity-100'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} /><span>{label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}</Link></div>;
      })}</nav>
      <div className="mt-auto rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.55)] p-3"><div className="flex items-center gap-2 text-xs font-semibold"><span className={`status-dot ${online === false ? 'text-[hsl(var(--accent))]' : 'text-emerald-400'}`} />{online === true ? 'API connected' : online === false ? 'API offline' : 'Checking API'}</div><p className="mt-1.5 text-[11px] leading-4 opacity-55">{online === false ? 'Changes are paused until the service is reachable.' : 'Timetable data syncs with your university service.'}</p></div>
    </aside>
    {open && <button className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setOpen(false)} aria-label="Close navigation overlay" data-testid="button-navigation-overlay" />}
    <div className="md:pl-[248px]"><header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[hsl(var(--border)/.7)] bg-[hsl(var(--background)/.88)] px-4 backdrop-blur-md sm:px-7"><button className="btn btn-quiet btn-icon md:hidden" onClick={() => setOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={18} /></button><div className="desktop-only text-xs text-[hsl(var(--muted-foreground))]"><span className="mono">CURRENT CYCLE</span><span className="mx-2 opacity-40">/</span>Teaching plan</div><div className="ml-auto flex items-center gap-3 text-xs"><span className={`hidden items-center gap-1.5 sm:flex ${online === false ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))]'}`}><span className="status-dot" />{online === false ? 'Service unavailable' : online === true ? 'Live connection' : 'Connecting'}</span><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] font-semibold text-[hsl(var(--primary-foreground))]">CC</div></div></header><main className="page-content mx-auto max-w-[1440px] p-5 sm:p-7">{children}</main></div>
  </div>;
}