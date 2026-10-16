import { NextResponse } from 'next/server';
import { authenticateMobileRequest, mobileAuthErrorResponse } from '@/lib/mobile-auth';
import {
  getOrCreateRosterWeek,
  getDutyAssignments,
  getNightShifts,
  getCatalog,
  getInstructors,
  getAllLeaveRequests,
} from '@/lib/storage';
import { mergeDutyAssignments } from '@/lib/roster-utils';
import { scanRosterHealth, extractHealthSummary } from '@/lib/ai-scheduler';
import { startOfWeek, format } from 'date-fns';

export async function GET(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if ('error' in auth) {
    return mobileAuthErrorResponse(auth);
  }

  try {
    const { searchParams } = new URL(request.url);
    let startDate = searchParams.get('startDate');

    if (!startDate) {
      // Default to Monday of current week
      startDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    }

    const week = await getOrCreateRosterWeek(startDate);
    const [rawDuties, nightShifts, catalog, instructors, leaves] = await Promise.all([
      getDutyAssignments(week.id),
      getNightShifts(week.id),
      getCatalog(),
      getInstructors(),
      getAllLeaveRequests(),
    ]);

    const mergedDuties = mergeDutyAssignments(rawDuties);

    let aiHealth = undefined;
    try {
      const aiReport = scanRosterHealth({
        rosterWeek: week,
        dutyAssignments: rawDuties,
        nightShifts,
        leaveRequests: leaves,
        allInstructors: instructors,
      });
      aiHealth = extractHealthSummary(aiReport);
    } catch (e) {
      console.warn('[Mobile Schedule] AI scan skipped:', e);
    }

    return NextResponse.json({
      week,
      duties: rawDuties,
      mergedDuties,
      nightShifts,
      catalog,
      instructors,
      aiHealth,
    });
  } catch (error) {
    console.error('Error fetching mobile schedule:', error);
    return NextResponse.json({ error: 'Failed to load schedule data' }, { status: 500 });
  }
}
