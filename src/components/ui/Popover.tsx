'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Floating panel used by the pickers: anchored under (or above) its trigger
 * on desktop, a bottom sheet on phones. Escape and outside clicks close it.
 */
export function Popover({
  open,
  onClose,
  anchorRef,
  title,
  width = 300,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Shown as the bottom-sheet heading on phones. */
  title: string;
  width?: number;
  children: React.ReactNode;
}) {
  const [layout, setLayout] = useState<{ sheet: boolean; left: number; top: number; above: boolean } | null>(null);

  const measure = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const sheet = window.matchMedia('(max-width: 639px)').matches;
    const r = el.getBoundingClientRect();
    const above = window.innerHeight - r.bottom < 380 && r.top > window.innerHeight - r.bottom;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    setLayout({ sheet, left, top: above ? r.top : r.bottom, above });
  }, [anchorRef, width]);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(measure);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, measure, onClose]);

  if (!open || !layout || typeof document === 'undefined') return null;

  const panel = layout.sheet ? (
    <div className="fixed inset-0 z-[120] flex animate-fade-in items-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="w-full animate-sheet-up rounded-t-2xl border-t border-neutral-200 bg-white pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-white/10 dark:bg-[#141414]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-neutral-300 dark:bg-white/15" aria-hidden />
        <div className="px-5 pb-1 pt-3 text-sm font-semibold text-neutral-900 dark:text-white">{title}</div>
        <div className="px-3">{children}</div>
      </div>
    </div>
  ) : (
    <>
      <div className="fixed inset-0 z-[110]" onMouseDown={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label={title}
        style={{
          left: layout.left,
          width,
          ...(layout.above ? { bottom: window.innerHeight - layout.top + 6 } : { top: layout.top + 6 }),
        }}
        className={`fixed z-[120] animate-pop-in rounded-2xl border border-neutral-200 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#161616]/95 ${
          layout.above ? 'origin-bottom-left' : 'origin-top-left'
        }`}
      >
        {children}
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
