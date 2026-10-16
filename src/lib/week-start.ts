'use client';

import { useSyncExternalStore } from 'react';

/** 0 = Sunday (default, matches the roster week), 1 = Monday. Per-device preference. */
export type WeekStart = 0 | 1;

const KEY = 'slate_week_start';
const listeners = new Set<() => void>();

function read(): WeekStart {
  try {
    return localStorage.getItem(KEY) === '1' ? 1 : 0;
  } catch {
    return 0;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useWeekStart(): WeekStart {
  return useSyncExternalStore(subscribe, read, () => 0);
}

export function setWeekStart(value: WeekStart) {
  try {
    localStorage.setItem(KEY, String(value));
  } catch {
    // Storage unavailable (private mode): the default still applies.
  }
  listeners.forEach((l) => l());
}

/** "YYYY-MM-DD" <-> local Date without UTC shifts (see AGENTS.md invariant 4). */
export function parseYmd(s: string | undefined | null): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayYmd(): string {
  return toYmd(new Date());
}

export function addDaysYmd(s: string, days: number): string {
  const d = parseYmd(s) ?? new Date();
  d.setDate(d.getDate() + days);
  return toYmd(d);
}
