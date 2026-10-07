import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { getApiBaseUrl } from './api';

export interface MobileVersionInfo {
  latestVersion: string;
  versionCode: number;
  releaseName: string;
  releaseNotes: string[];
  apkUrl: string;
  releasePageUrl: string;
  publishedAt: string;
  minRequiredVersion: string;
}

export interface AppUpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string[];
  apkUrl: string;
  releasePageUrl: string;
  publishedAt: string;
}

export const CURRENT_APP_VERSION = Constants.expoConfig?.version || '1.0.0';

/**
 * Compare two semantic version strings (e.g. "1.0.1" and "1.0.0").
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/, '').split('-')[0];
  const clean2 = v2.replace(/^v/, '').split('-')[0];

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Check whether a newer version of the mobile app is available.
 */
export async function checkAppUpdate(): Promise<AppUpdateCheckResult> {
  const server = getApiBaseUrl();
  const url = `${server}/api/mobile/version?_t=${Date.now()}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to check updates: HTTP ${res.status}`);
    }

    const data: MobileVersionInfo = await res.json();
    const hasUpdate = compareSemver(data.latestVersion, CURRENT_APP_VERSION) > 0;

    return {
      hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: data.latestVersion,
      releaseNotes: data.releaseNotes || [],
      apkUrl: data.apkUrl,
      releasePageUrl: data.releasePageUrl,
      publishedAt: data.publishedAt,
    };
  } catch (error) {
    console.warn('[Updates] Update check error:', error);
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      releaseNotes: [],
      apkUrl: '',
      releasePageUrl: '',
      publishedAt: '',
    };
  }
}

/**
 * Open the direct APK download link in Android browser / download manager
 * to pull the new version and launch the package installer.
 */
export async function downloadAndInstallUpdate(apkUrl: string): Promise<boolean> {
  if (!apkUrl) return false;
  try {
    const canOpen = await Linking.canOpenURL(apkUrl);
    if (canOpen) {
      await Linking.openURL(apkUrl);
      return true;
    }
  } catch (err) {
    console.error('[Updates] Failed opening APK download link:', err);
  }
  return false;
}
