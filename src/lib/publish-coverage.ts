import type { RosterWeek } from '@/types';

export type PublishCoverage = 'published' | 'partial' | 'draft';

/**
 * Roster Weeks can be planned from any start day and overlap, so a window
 * counts as Published when every one of its days is covered by some
 * Published Roster Week, not only when its own row is.
 */
export function publishCoverage(week: RosterWeek, publishedDates?: string[]): PublishCoverage {
  if (week.status === 'PUBLISHED') return 'published';
  const n = publishedDates?.length ?? 0;
  if (n >= 7) return 'published';
  return n > 0 ? 'partial' : 'draft';
}
