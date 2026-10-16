# Project Memory — NIBM Slate

## System Overview
**NIBM Slate** (National Institute of Business Management — Academic Roster & Resource Engine) is a production-grade academic scheduling, conflict detection, and resource management platform.

## Technology Stack
- **Web Core**: Next.js 16 (App Router), React 19, TypeScript 5.
- **Styling**: Tailwind CSS v4, Obsidian Velvet design palette (`#0b0f17` base, `#101726` surface, `#1e293b` borders, emerald/indigo/amber badges), Lucide React.
- **Persistence Layer**: `src/lib/roster-store.ts`
  - Primary / Cloud: Neon Serverless PostgreSQL (`@neondatabase/serverless`) via `DATABASE_URL`.
  - Fallback / Local: Atomic JSON store in `data/roster-store.json`.
- **Mobile Companion**: React Native + Expo SDK 52 located in `mobile/`.
- **PWA Capabilities**: Full standalone PWA with `public/manifest.json`, `public/sw.js` (versioned caching, background update checks), and `src/components/pwa-register.tsx`.
- **AI & Scheduling Engines**:
  - `src/lib/csp-solver.ts`: Deterministic constraint satisfaction problem solver adhering to the unified 09:00–16:00 session model.
  - `src/lib/ai-assistant.ts`: AI Health Radar conflict scanner & copilot natural language planner.

## Critical Paths & File Map
- `src/lib/roster-store.ts`: Master data store, data schemas, CRUD operations, transactions.
- `src/lib/csp-solver.ts`: Constraint solver for timetable generation.
- `src/lib/ai-assistant.ts`: AI Health Radar conflict metrics.
- `src/app/roster/page.tsx`: Executive 3-bucket roster dashboard (Active Batches, Available Faculty, Room Capacity).
- `src/app/roster/instructors/[id]/page.tsx`: 2-column balanced instructor profile & calendar.
- `src/app/login/page.tsx`: Role-based authentication portal with quick-login buttons.
- `src/components/pwa-register.tsx`: Service Worker registrar and offline radar.
- `public/sw.js`: Service worker with cache-first static, network-first navigation, and prompted updates (registered as /sw.js?v=<buildId>, waits for SKIP_WAITING from the "Reload now" prompt).
- `public/manifest.json`: Web app manifest configured for standalone mode.
- `scripts/verify-all.ts`: Master verification harness for ESLint, domain invariants, mobile APIs, mobile typecheck, and Next.js build.
- `mobile/`: Expo companion codebase.

## Default Credentials & Roles
| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@nibm.lk` | `Admin@123` | Full control plane, audit logs, configuration |
| **Academic Coordinator** | `coordinator@nibm.lk` | `Coord@123` | Roster edits, schedule generation, batch management |
| **Department Head** | `hod.it@nibm.lk` | `Hod@123` | Faculty approvals, curriculum validation, workload review |
| **Visiting Lecturer** | `lecturer@nibm.lk` | `Lect@123` | Personal assigned timetable, availability calendar |
| **Auditor / Observer** | `auditor@nibm.lk` | `Audit@123` | Read-only compliance and utilization audits |

## Verification Commands
All changes must be validated against the 5-point verification harness:
```powershell
cmd /c "npm run verify"
```
Sub-checks:
- `cmd /c "npm run lint"` — ESLint check.
- `cmd /c "npx tsx scripts/verify-domain-rules.ts"` — 35 domain invariant assertions.
- `cmd /c "npx tsx scripts/verify-mobile-api.ts"` — 28 mobile API endpoint assertions.
- `cmd /c "npm --prefix mobile run typecheck"` — Mobile companion TypeScript typecheck.
- `cmd /c "npm run build"` — Next.js production build check.
