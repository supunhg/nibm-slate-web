import { NextResponse } from 'next/server';

export interface MobileVersionResponse {
  latestVersion: string;
  versionCode: number;
  releaseName: string;
  releaseNotes: string[];
  apkUrl: string;
  releasePageUrl: string;
  publishedAt: string;
  minRequiredVersion: string;
}

export async function GET() {
  const versionInfo: MobileVersionResponse = {
    latestVersion: '1.0.1',
    versionCode: 2,
    releaseName: 'NIBM Slate v1.0.1',
    releaseNotes: [
      'Resolved navigation back button trapping in settings and profile screens',
      'Redesigned Public Status Board with modern high-contrast duty cards',
      'Overhauled instructor portal sub-tabs with responsive segmented pill bar',
      'Fixed auto-refresh dropdown off-screen clipping on mobile screens',
      'Integrated in-app update checking and direct APK download mechanism',
    ],
    apkUrl: 'https://github.com/supunhg/nibm-slate-web/releases/latest/download/nibm-slate.apk',
    releasePageUrl: 'https://github.com/supunhg/nibm-slate-web/releases',
    publishedAt: '2026-10-07T07:15:00.000Z',
    minRequiredVersion: '1.0.0',
  };

  return NextResponse.json(versionInfo, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
