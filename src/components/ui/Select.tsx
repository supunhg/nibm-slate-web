'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  /** Secondary text on the right, e.g. "On leave". */
  hint?: React.ReactNode;
  disabled?: boolean;
}

/**
 * Custom select that matches the design system instead of the OS picker:
 * an anchored dropdown on desktop, a bottom sheet on phones. Keyboard:
 * arrows / Home / End move, Enter or Space picks, Escape closes.
 */
export function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  label,
  icon,
  size = 'md',
  className = '',
  sheetTitle,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  /** Accessible name (also the bottom-sheet title unless sheetTitle is set). */
  label: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
  sheetTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [asSheet, setAsSheet] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; above: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const enabledIndexes = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const above = spaceBelow < 280 && r.top > spaceBelow;
    setRect({ left: r.left, top: above ? r.top : r.bottom, width: r.width, above });
  }, []);

  const openMenu = () => {
    const sheet = window.matchMedia('(max-width: 639px)').matches;
    setAsSheet(sheet);
    if (!sheet) measure();
    const current = options.findIndex((o) => o.value === value && !o.disabled);
    setActiveIndex(current >= 0 ? current : (enabledIndexes[0] ?? -1));
    setOpen(true);
    navigator.vibrate?.(8);
  };

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const pick = (opt: SelectOption<T>) => {
    if (opt.disabled) return;
    onChange(opt.value);
    close();
  };

  // Keep the dropdown attached to its trigger while the page scrolls/resizes.
  useEffect(() => {
    if (!open || asSheet) return;
    const onMove = () => measure();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, asSheet, measure]);

  // Focus the list on open and keep the active option in view.
  useLayoutEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const onListKeyDown = (e: React.KeyboardEvent) => {
    const pos = enabledIndexes.indexOf(activeIndex);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(enabledIndexes[Math.min(pos + 1, enabledIndexes.length - 1)] ?? activeIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(enabledIndexes[Math.max(pos - 1, 0)] ?? activeIndex);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(enabledIndexes[0] ?? -1);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(enabledIndexes[enabledIndexes.length - 1] ?? -1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) pick(opt);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  const optionList = (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      tabIndex={-1}
      aria-label={label}
      aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
      onKeyDown={onListKeyDown}
      className={`overflow-y-auto overscroll-contain outline-none ${asSheet ? 'max-h-[60dvh] p-2' : 'max-h-72 p-1'}`}
    >
      {options.map((opt, i) => {
        const isSelected = opt.value === value;
        const isActive = i === activeIndex;
        return (
          <li
            key={opt.value || `__empty-${i}`}
            id={`${listId}-${i}`}
            data-index={i}
            role="option"
            aria-selected={isSelected}
            aria-disabled={opt.disabled || undefined}
            onMouseEnter={() => !opt.disabled && setActiveIndex(i)}
            onClick={() => pick(opt)}
            className={`flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 ${
              asSheet ? 'min-h-12 text-sm' : 'min-h-9 text-xs'
            } ${
              opt.disabled
                ? 'cursor-not-allowed text-neutral-400 dark:text-neutral-600'
                : isActive
                  ? 'bg-neutral-100 text-neutral-900 dark:bg-white/[0.07] dark:text-white'
                  : 'text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <span className={`min-w-0 flex-1 truncate ${isSelected ? 'font-semibold' : 'font-medium'}`}>{opt.label}</span>
            {opt.hint && <span className="shrink-0 text-[11px] text-neutral-500">{opt.hint}</span>}
            <Check className={`size-4 shrink-0 ${isSelected ? 'text-neutral-900 dark:text-white' : 'invisible'}`} />
          </li>
        );
      })}
    </ul>
  );

  const popup = !open ? null : asSheet ? (
    <div className="fixed inset-0 z-[120] flex animate-fade-in items-end bg-black/60 backdrop-blur-sm" onClick={() => close()}>
      <div
        className="w-full animate-sheet-up rounded-t-2xl border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:border-white/10 dark:bg-[#141414]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-neutral-300 dark:bg-white/15" aria-hidden />
        <div className="px-5 pb-1 pt-3 text-sm font-semibold text-neutral-900 dark:text-white">{sheetTitle ?? label}</div>
        {optionList}
      </div>
    </div>
  ) : (
    <>
      <div className="fixed inset-0 z-[110]" onMouseDown={() => close(false)} aria-hidden />
      {rect && (
        <div
          style={{
            left: rect.left,
            width: Math.max(rect.width, 200),
            ...(rect.above ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.top + 6 }),
          }}
          className={`fixed z-[120] animate-pop-in overflow-hidden rounded-xl border border-neutral-200 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#161616]/95 ${
            rect.above ? 'origin-bottom' : 'origin-top'
          }`}
        >
          {optionList}
        </div>
      )}
    </>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${typeof selected?.label === 'string' ? selected.label : placeholder}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openMenu();
          }
        }}
        className={`field flex cursor-pointer items-center gap-2 text-left ${size === 'sm' ? 'h-9 text-xs' : 'text-sm'} ${className}`}
      >
        {icon && <span className="shrink-0 text-neutral-400">{icon}</span>}
        <span className={`min-w-0 flex-1 truncate ${selected ? 'font-medium' : 'text-neutral-400 dark:text-neutral-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-neutral-400 transition-transform duration-200 ease-[var(--ease-soft)] ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {typeof document !== 'undefined' && popup && createPortal(popup, document.body)}
    </>
  );
}
