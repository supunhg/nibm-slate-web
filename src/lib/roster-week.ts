/**
 * Roster Week boundaries (GLOSSARY.md): every Roster Week runs Sunday to
 * Saturday, so planning, publishing and what the Cadre sees always line up.
 * Pure "YYYY-MM-DD" string helpers, safe on the server and the client.
 */

/** Calendar arithmetic on a plain date string, done in UTC so no timezone shifts creep in. */
export function addDaysToYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The Sunday that starts the Roster Week containing `ymd`. */
export function rosterWeekStart(ymd: string): string {
  const day = new Date(`${ymd}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDaysToYmd(ymd, -day);
}

/** The Saturday that ends a Roster Week starting on `startYmd`. */
export function rosterWeekEnd(startYmd: string): string {
  return addDaysToYmd(startYmd, 6);
}

/** Today's date at NIBM (Sri Lanka, UTC+5:30), regardless of the server's timezone. */
export function todayInColombo(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
}
