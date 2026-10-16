import React from 'react';

/**
 * The opening block of every screen: a small eyebrow, the page title, an
 * optional one-line description, and actions on the right (wrapping beneath
 * on phones). Keeps hierarchy identical across the app.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  status,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5 flex items-center gap-1.5">{eyebrow}</div>}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-[28px] dark:text-white">{title}</h1>
          {status}
        </div>
        {description && <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
      </div>
      {actions && <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
    </div>
  );
}

/** Small status pill with a coloured dot (e.g. Draft / Published, Live). */
export function StatusPill({ tone, children, pulse }: { tone: 'emerald' | 'amber' | 'rose' | 'neutral'; children: React.ReactNode; pulse?: boolean }) {
  const tones = {
    emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    amber: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    rose: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    neutral: 'border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-300',
  } as const;
  const dots = { emerald: 'bg-emerald-500', amber: 'bg-amber-400', rose: 'bg-rose-500', neutral: 'bg-neutral-400' } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
      <span className={`size-1.5 rounded-full ${dots[tone]} ${pulse ? 'animate-pulse' : ''}`} />
      {children}
    </span>
  );
}
