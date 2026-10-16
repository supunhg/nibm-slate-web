'use client';

import React, { useRef, useState } from 'react';
import { DayPicker, type DateRange, type Matcher } from 'react-day-picker';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Popover } from './Popover';
import { addDaysYmd, parseYmd, todayYmd, toYmd, useWeekStart } from '@/lib/week-start';

const fmt = (s: string, withWeekday = true) =>
  parseYmd(s)?.toLocaleDateString('en-GB', {
    ...(withWeekday ? { weekday: 'short' as const } : {}),
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) ?? '';

// Calendar styling (react-day-picker is unstyled here; every part maps to the design system).
const calendarClassNames = {
  root: 'w-full select-none',
  months: 'relative',
  month: 'w-full',
  month_caption: 'flex h-10 items-center px-2',
  caption_label: 'text-sm font-semibold text-neutral-900 dark:text-white',
  nav: 'absolute right-0 top-0 flex h-10 items-center gap-1',
  button_previous: 'btn btn-ghost btn-icon size-8',
  button_next: 'btn btn-ghost btn-icon size-8',
  month_grid: 'w-full border-collapse',
  weekdays: '',
  weekday: 'h-8 text-[11px] font-medium text-neutral-500',
  week: '',
  day: 'relative p-0 text-center text-sm',
  day_button:
    'mx-auto flex size-10 cursor-pointer items-center justify-center rounded-lg font-medium tabular-nums text-neutral-800 transition-colors duration-150 hover:bg-neutral-100 sm:size-9 sm:text-[13px] dark:text-neutral-200 dark:hover:bg-white/[0.08]',
  today: '[&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-neutral-400 dark:[&>button]:ring-white/30',
  selected:
    '[&>button]:bg-neutral-900 [&>button]:text-white [&>button]:hover:bg-neutral-800 dark:[&>button]:bg-white dark:[&>button]:text-neutral-950 dark:[&>button]:hover:bg-neutral-200',
  range_middle:
    'bg-neutral-100 dark:bg-white/[0.07] [&>button]:!bg-transparent [&>button]:!text-neutral-900 [&>button]:rounded-none dark:[&>button]:!text-white',
  range_start: 'rounded-l-lg bg-neutral-100 dark:bg-white/[0.07]',
  range_end: 'rounded-r-lg bg-neutral-100 dark:bg-white/[0.07]',
  outside: '[&>button]:text-neutral-300 dark:[&>button]:text-neutral-600',
  disabled: '[&>button]:cursor-not-allowed [&>button]:text-neutral-300 [&>button]:line-through [&>button]:hover:bg-transparent dark:[&>button]:text-neutral-700',
  hidden: 'invisible',
  chevron: 'size-4 fill-current',
};

function Chevron({ orientation }: { orientation?: string }) {
  return orientation === 'left' ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />;
}

function Trigger({
  triggerRef,
  open,
  onClick,
  label,
  text,
  placeholder,
  size,
  className,
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClick: () => void;
  label: string;
  text: string;
  placeholder: string;
  size: 'sm' | 'md';
  className: string;
}) {
  return (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`${label}: ${text || placeholder}`}
      onClick={onClick}
      className={`field flex cursor-pointer items-center gap-2 text-left ${size === 'sm' ? 'h-9 text-xs' : 'text-sm'} ${className}`}
    >
      <CalendarDays className="size-4 shrink-0 text-neutral-400" />
      <span className={`min-w-0 flex-1 truncate ${text ? 'font-medium' : 'text-neutral-400 dark:text-neutral-500'}`}>
        {text || placeholder}
      </span>
    </button>
  );
}

/** Single-date picker. `weekWindow` highlights the 7-day window starting at the chosen date. */
export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Pick a date',
  size = 'md',
  className = '',
  min,
  max,
  shortcuts,
  weekWindow = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  size?: 'sm' | 'md';
  className?: string;
  min?: string;
  max?: string;
  shortcuts?: { label: string; value: string }[];
  weekWindow?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const weekStartsOn = useWeekStart();
  const selected = parseYmd(value);

  const disabled: Matcher[] = [];
  if (min) disabled.push({ before: parseYmd(min)! });
  if (max) disabled.push({ after: parseYmd(max)! });

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const pick = (v: string) => {
    onChange(v);
    close();
  };

  const windowEnd = weekWindow && value ? addDaysYmd(value, 6) : '';

  return (
    <>
      <Trigger
        triggerRef={triggerRef}
        open={open}
        onClick={() => setOpen((v) => !v)}
        label={label}
        text={value ? (weekWindow ? `${fmt(value, false)} – ${fmt(windowEnd, false)}` : fmt(value)) : ''}
        placeholder={placeholder}
        size={size}
        className={className}
      />
      <Popover open={open} onClose={close} anchorRef={triggerRef} title={label}>
        {shortcuts && shortcuts.length > 0 && (
          <div className="no-scrollbar mb-1 flex gap-1.5 overflow-x-auto px-1 pt-1">
            {shortcuts.map((s) => (
              <button key={s.label} type="button" onClick={() => pick(s.value)} className="btn btn-secondary btn-sm h-7 shrink-0">
                {s.label}
              </button>
            ))}
          </div>
        )}
        <DayPicker
          mode="single"
          required
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => d && pick(toYmd(d))}
          weekStartsOn={weekStartsOn}
          showOutsideDays
          fixedWeeks
          disabled={disabled}
          modifiers={weekWindow && selected ? { window: { from: selected, to: parseYmd(windowEnd)! } } : undefined}
          modifiersClassNames={{ window: 'bg-neutral-100 dark:bg-white/[0.06] first:rounded-l-lg last:rounded-r-lg' }}
          classNames={calendarClassNames}
          components={{ Chevron }}
        />
      </Popover>
    </>
  );
}

/**
 * Tap-start-then-end range picker. Optional coverage hints: `awayDates`
 * (colleagues on approved leave per day) and `dutyDates` (days the person is
 * on duty) render as small dots, and the footer explains them.
 */
export function DateRangePicker({
  value,
  onChange,
  label,
  placeholder = 'Pick dates',
  className = '',
  min,
  awayDates,
  dutyDates,
}: {
  value: { from: string; to: string };
  onChange: (value: { from: string; to: string }) => void;
  label: string;
  placeholder?: string;
  className?: string;
  min?: string;
  awayDates?: Record<string, string[]>;
  dutyDates?: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const weekStartsOn = useWeekStart();
  const range: DateRange | undefined = value.from ? { from: parseYmd(value.from), to: parseYmd(value.to || value.from) } : undefined;

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const from = value.from;
  const to = value.to || value.from;
  const days = from ? Math.round((parseYmd(to)!.getTime() - parseYmd(from)!.getTime()) / 86_400_000) + 1 : 0;
  const text = from ? (from === to ? fmt(from) : `${fmt(from, false)} – ${fmt(to, false)}`) : '';

  // Coverage inside the chosen range, for the footer summary.
  const inRange = (d: string) => from && d >= from && d <= to;
  const awayInRange = new Set(Object.entries(awayDates ?? {}).filter(([d]) => inRange(d)).flatMap(([, n]) => n));
  const dutyInRange = [...(dutyDates ?? [])].filter((d) => inRange(d)).length;

  return (
    <>
      <Trigger
        triggerRef={triggerRef}
        open={open}
        onClick={() => setOpen((v) => !v)}
        label={label}
        text={text ? `${text}${days > 1 ? ` · ${days} days` : ''}` : ''}
        placeholder={placeholder}
        size="md"
        className={className}
      />
      <Popover open={open} onClose={close} anchorRef={triggerRef} title={label} width={320}>
        <DayPicker
          mode="range"
          selected={range}
          defaultMonth={range?.from ?? (min ? parseYmd(min) : undefined)}
          onSelect={(r) => {
            // First tap sets a one-day range; the second extends it.
            onChange({ from: r?.from ? toYmd(r.from) : '', to: r?.to ? toYmd(r.to) : r?.from ? toYmd(r.from) : '' });
          }}
          weekStartsOn={weekStartsOn}
          showOutsideDays
          fixedWeeks
          disabled={min ? { before: parseYmd(min)! } : undefined}
          modifiers={{
            away: Object.keys(awayDates ?? {}).map((d) => parseYmd(d)!),
            duty: [...(dutyDates ?? [])].map((d) => parseYmd(d)!),
          }}
          modifiersClassNames={{
            away: 'after:pointer-events-none after:absolute after:bottom-1 after:left-[calc(50%-5px)] after:size-1 after:rounded-full after:bg-rose-400',
            duty: 'before:pointer-events-none before:absolute before:bottom-1 before:left-[calc(50%+1px)] before:size-1 before:rounded-full before:bg-amber-400',
          }}
          classNames={calendarClassNames}
          components={{ Chevron }}
        />
        <div className="mt-1 space-y-2 border-t border-neutral-100 px-1.5 pt-2.5 dark:border-white/[0.06]">
          {(awayDates || dutyDates) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500">
              {awayDates && (
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-rose-400" /> Colleague away
                </span>
              )}
              {dutyDates && (
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-amber-400" /> You&rsquo;re on duty
                </span>
              )}
            </div>
          )}
          {from && (awayInRange.size > 0 || dutyInRange > 0) && (
            <p className="animate-fade-in rounded-lg bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug text-amber-800 dark:text-amber-200">
              {dutyInRange > 0 && `You have duty on ${dutyInRange} ${dutyInRange === 1 ? 'day' : 'days'} in this range. `}
              {awayInRange.size > 0 && `Also away: ${[...awayInRange].join(', ')}.`}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 pb-0.5">
            <span className="text-xs text-neutral-500">
              {from ? `${days} ${days === 1 ? 'day' : 'days'}` : 'Tap a start day, then an end day'}
            </span>
            <div className="flex gap-1.5">
              {from && (
                <button type="button" onClick={() => onChange({ from: '', to: '' })} className="btn btn-ghost btn-sm">
                  <X /> Clear
                </button>
              )}
              <button type="button" onClick={close} className="btn btn-primary btn-sm px-4">
                Done
              </button>
            </div>
          </div>
        </div>
      </Popover>
    </>
  );
}

export { todayYmd };
