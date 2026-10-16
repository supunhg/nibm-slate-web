import { NextResponse } from 'next/server';
import { authenticateMobileRequest, mobileAuthErrorResponse } from '@/lib/mobile-auth';
import {
  getExecutiveStatus,
  getOrCreateRosterWeek,
  getDutyAssignments,
  getNightShifts,
  getAllLeaveRequests,
  getInstructors,
} from '@/lib/storage';
import { scanRosterHealth, extractHealthSummary } from '@/lib/ai-scheduler';
import { format, parseISO, startOfWeek } from 'date-fns';

export async function GET(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if ('error' in auth) {
    return mobileAuthErrorResponse(auth);
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam || format(new Date(), 'yyyy-MM-dd');

    const report = await getExecutiveStatus(targetDate, 'ALL');

    // Synthesize real-time AI Health Radar for the active week
    try {
      const weekMonday = format(startOfWeek(parseISO(targetDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const week = await getOrCreateRosterWeek(weekMonday);
      const [duties, nightShifts, leaves, instructors] = await Promise.all([
        getDutyAssignments(week.id),
        getNightShifts(week.id),
        getAllLeaveRequests(),
        getInstructors(),
      ]);

      const aiReport = scanRosterHealth({
        rosterWeek: week,
        dutyAssignments: duties,
        nightShifts,
        leaveRequests: leaves,
        allInstructors: instructors,
      });

      report.aiHealth = extractHealthSummary(aiReport);
    } catch (aiErr) {
      console.warn('[Mobile Dashboard] Could not compute AI health summary:', aiErr);
    }

    return NextResponse.json({
      date: targetDate,
      report,
    });
  } catch (error) {
    console.error('Error fetching mobile executive status:', error);
    return NextResponse.json({ error: 'Failed to generate status report' }, { status: 500 });
  }
}
