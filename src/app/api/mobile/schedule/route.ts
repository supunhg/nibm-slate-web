import { NextResponse } from 'next/server';
import { authenticateMobileRequest, mobileAuthErrorResponse } from '@/lib/mobile-auth';
import {
  getOrCreateRosterWeek,
  getDutyAssignmentsInRange,
  getNightShiftsInRange,
  getCatalog,
  getInstructors,
} from '@/lib/storage';
import { mergeDutyAssignments } from '@/lib/roster-utils';
import { addDaysToYmd, rosterWeekStart, todayInColombo } from '@/lib/roster-week';

export async function GET(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if ('error' in auth) {
    return mobileAuthErrorResponse(auth);
  }

  try {
    const { searchParams } = new URL(request.url);
    // Roster Weeks run Sunday to Saturday. Older app builds still ask for a
    // Monday and draw seven days from it, so the duties returned cover the
    // window that was asked for, while `week` is the Roster Week it falls in.
    const requested = searchParams.get('startDate');
    const startDate = /^\d{4}-\d{2}-\d{2}$/.test(requested ?? '') ? requested! : rosterWeekStart(todayInColombo());
    const endDate = addDaysToYmd(startDate, 6);

    const week = await getOrCreateRosterWeek(startDate);
    const [rawDuties, nightShifts, catalog, instructors] = await Promise.all([
      getDutyAssignmentsInRange(startDate, endDate),
      getNightShiftsInRange(startDate, endDate),
      getCatalog(),
      getInstructors(),
    ]);

    const mergedDuties = mergeDutyAssignments(rawDuties);

    return NextResponse.json({
      week,
      duties: rawDuties,
      mergedDuties,
      nightShifts,
      catalog,
      instructors,
    });
  } catch (error) {
    console.error('Error fetching mobile schedule:', error);
    return NextResponse.json({ error: 'Failed to load schedule data' }, { status: 500 });
  }
}
