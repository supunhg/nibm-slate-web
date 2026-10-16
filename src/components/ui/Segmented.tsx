'use client';

import React, { useLayoutEffect, useRef } from 'react';

/**
 * Segmented control with a pill that slides to the selected option.
 * Scrolls horizontally on narrow screens instead of wrapping.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className = '',
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[];
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  // Position the pill from the measured button (DOM write only).
  useLayoutEffect(() => {
    const track = trackRef.current;
    const pill = pillRef.current;
    if (!track || !pill) return;
    const place = () => {
      const active = track.querySelector<HTMLElement>('[aria-checked="true"]');
      if (!active) return;
      pill.style.width = `${active.offsetWidth}px`;
      pill.style.transform = `translateX(${active.offsetLeft}px)`;
      pill.style.opacity = '1';
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(track);
    return () => ro.disconnect();
  }, [value, options.length]);

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={label}
      className={`no-scrollbar relative inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-100/70 p-1 dark:border-white/[0.06] dark:bg-white/[0.03] ${className}`}
    >
      <span
        ref={pillRef}
        aria-hidden
        className="absolute bottom-1 left-0 top-1 rounded-lg bg-white opacity-0 shadow-sm transition-[transform,width,opacity] duration-300 ease-[var(--ease-soft)] dark:bg-white/[0.1] dark:shadow-none"
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (!active && typeof navigator !== 'undefined') navigator.vibrate?.(8);
              onChange(opt.value);
            }}
            className={`relative z-10 inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors duration-200 ${
              size === 'sm' ? 'h-7 px-2.5 text-[11px]' : 'h-8 px-3 text-xs'
            } ${active ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'}`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
