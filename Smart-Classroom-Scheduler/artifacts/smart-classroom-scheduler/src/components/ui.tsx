import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Notice({ type = 'error', children, onClose }: { type?: 'error' | 'success' | 'info'; children: ReactNode; onClose?: () => void }) {
  const styles = { error: 'border-red-200 bg-red-50 text-red-800', success: 'border-emerald-200 bg-emerald-50 text-emerald-800', info: 'border-sky-200 bg-sky-50 text-sky-800' };
  const Icon = type === 'error' ? AlertCircle : type === 'success' ? CheckCircle2 : Info;
  return <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${styles[type]}`} role="status" data-testid={`notice-${type}`}>
    <Icon size={16} className="mt-0.5 shrink-0" /><span className="flex-1">{children}</span>{onClose && <button className="opacity-60 hover:opacity-100" onClick={onClose} aria-label="Dismiss message" data-testid="button-dismiss-notice"><X size={15} /></button>}
  </div>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="flex flex-col items-center justify-center px-5 py-16 text-center" data-testid="empty-state">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><span className="mono text-lg">—</span></div>
    <h3 className="font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>
  </div>;
}

export function SkeletonRows({ columns = 5 }: { columns?: number }) {
  return <div className="space-y-2 p-4" data-testid="loading-skeleton">{Array.from({ length: 5 }).map((_, row) => <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} key={row}>{Array.from({ length: columns }).map((__, col) => <div className="skeleton h-8" key={col} />)}</div>)}</div>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-[hsl(204_31%_16%/.42)] p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="fade-in max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-[hsl(var(--card))] p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4"><div><div className="eyebrow mb-2">Configuration</div><h2 id="modal-title" className="text-xl font-bold">{title}</h2></div><button className="btn btn-quiet btn-icon" onClick={onClose} aria-label="Close dialog" data-testid="button-close-dialog"><X size={17} /></button></div>
      {children}
    </div>
  </div>;
}