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

// Written by .github/workflows/build-apk.yml next to every APK it publishes,
// so the app's update prompt always reflects the newest build without
// anyone editing this file.
const MANIFEST_URL = 'https://github.com/supunhg/nibm-slate-web/releases/latest/download/version.json';

// Used only if GitHub is unreachable or no manifest has been published yet.
const FALLBACK: MobileVersionResponse = {
  latestVersion: '1.0.0',
  versionCode: 1,
  releaseName: 'NIBM Slate',
  releaseNotes: ['Performance and reliability improvements'],
  apkUrl: 'https://github.com/supunhg/nibm-slate-web/releases/latest/download/nibm-slate.apk',
  releasePageUrl: 'https://github.com/supunhg/nibm-slate-web/releases',
  publishedAt: '2026-10-07T07:15:00.000Z',
  minRequiredVersion: '1.0.0',
};

async function loadManifest(): Promise<MobileVersionResponse> {
  try {
    const res = await fetch(MANIFEST_URL, { next: { revalidate: 300 } });
    if (!res.ok) return FALLBACK;
    const data = (await res.json()) as Partial<MobileVersionResponse>;
    if (typeof data.latestVersion !== 'string' || typeof data.apkUrl !== 'string') return FALLBACK;
    return { ...FALLBACK, ...data, releaseNotes: Array.isArray(data.releaseNotes) && data.releaseNotes.length ? data.releaseNotes : FALLBACK.releaseNotes };
  } catch {
    return FALLBACK;
  }
}

export async function GET() {
  const versionInfo = await loadManifest();
  return NextResponse.json(versionInfo, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
