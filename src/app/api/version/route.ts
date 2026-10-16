import { NextResponse } from 'next/server';

// Always answered by the running deployment, never cached, so a client built
// from an older deployment sees a different id and can prompt to reload.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? 'unknown' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
