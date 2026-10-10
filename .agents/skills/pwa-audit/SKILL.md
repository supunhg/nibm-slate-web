---
name: pwa-audit
description: Runbook for auditing and testing NIBM Slate Progressive Web App (PWA) manifest, Service Worker lifecycle, offline capability, and background update checks.
---

# PWA Audit Skill

This skill provides step-by-step procedures to verify and maintain the Progressive Web App (PWA) capabilities of NIBM Slate.

## Components Under Audit

1. **Manifest File**: `public/manifest.json`
   - `name`: "NIBM Slate — Academic Roster & Resource Engine"
   - `short_name`: "NIBM Slate"
   - `start_url`: "/roster"
   - `display`: "standalone"
   - `background_color`: "#0b0f17"
   - `theme_color`: "#0b0f17"
   - Standard icons (192x192, 512x512) and maskable icons.

2. **Service Worker Core**: `public/sw.js`
   - Cache versioning: `CACHE_NAME = 'slate-cache-v1'`
   - Static asset cache: Pre-caches critical routes (`/roster`, `/login`, `/manifest.json`, icon assets).
   - Network strategy: Network-first with cache fallback for HTML navigations.
   - Asset strategy: Cache-first for images, fonts, styles, scripts.
   - Push notifications: `self.addEventListener('push', ...)` and `notificationclick`.
   - Update handshake: `SKIP_WAITING` event trigger to activate pending workers immediately.

3. **Client Registration & Offline Radar**: `src/components/pwa-register.tsx`
   - Must use React 19 `useSyncExternalStore` for `navigator.onLine` subscription.
   - Silent update checks on page visibility change (`document.visibilityState === 'visible'`) and periodic intervals.
   - Offline floating indicator banner with transition animation.

## Audit Runbook

### Step 1: Manifest Syntax & Integrity Check
Run command to verify `manifest.json` is valid JSON and contains required PWA fields:
```powershell
node -e "const m = require('./public/manifest.json'); console.assert(m.start_url === '/roster', 'start_url check failed'); console.assert(m.display === 'standalone', 'display check failed'); console.log('Manifest OK:', m.name);"
```

### Step 2: Service Worker Syntax Check
Verify JavaScript syntax of `public/sw.js`:
```powershell
node -c public/sw.js
```

### Step 3: Registration Component Lint Check
Verify React 19 compliance:
```powershell
cmd /c "npx eslint src/components/pwa-register.tsx"
```
Ensure no `setState` is directly called inside `useEffect` bodies.

### Step 4: End-to-End Build Integration
Confirm Next.js serves public assets without collision:
```powershell
cmd /c "npm run build"
```
