# Architecture Decision Records (ADRs)

## ADR-001: Obsidian Velvet Design System
- **Context**: The user requested a consistent, modern, executive-grade dark UI across all dashboard views, avoiding inconsistent button sizes and scattered colors.
- **Decision**: Standardized on the Obsidian Velvet design language:
  - Base background: `#0b0f17` (obsidian charcoal).
  - Surface cards: `#101726` with subtle borders (`rgba(255,255,255,0.08)`).
  - Primary accents: Emerald (`#10b981`), Indigo (`#6366f1`), Amber (`#f59e0b`).
  - Standard button heights: `h-9 px-4 text-xs font-semibold` for standard actions, `h-11 px-5` for primary hero actions.
- **Status**: Implemented and verified across all pages.

---

## ADR-002: Unified 09:00–16:00 Single-Session Model
- **Context**: NIBM courses operate on intensive full-day schedules. Splitting into fragmented morning/afternoon slots created scheduling fragmentation and double-booking risks.
- **Decision**: Timetables are modeled strictly around 09:00 to 16:00 (7 hours per day, lunch embedded). The CSP solver enforces a single session per batch per day.
- **Status**: Implemented in `src/lib/csp-solver.ts` and locked by domain invariant test suite.

---

## ADR-003: Dual-Backend Persistence Strategy
- **Context**: The system must run smoothly in cloud environments (Vercel, Neon) and zero-config local/offline development.
- **Decision**: `src/lib/roster-store.ts` checks `process.env.DATABASE_URL`. If present, it connects via Neon Serverless Postgres (`@neondatabase/serverless`). If absent or connection fails, it seamlessly falls back to `data/roster-store.json` using atomic file writes with file locking.
- **Status**: Implemented and verified with 35 domain invariant tests.

---

## ADR-004: Standalone Progressive Web App with Silent Updates
- **Context**: Mobile users and coordinators need app-like installation and offline status visibility without intrusive update prompts.
- **Decision**: Added `public/manifest.json`, `public/sw.js`, and `src/components/pwa-register.tsx`. Service worker caches static assets aggressively and navigations network-first. Updates check silently on tab focus/visibility change and hourly intervals, activating automatically on the next reload.
- **Status**: Implemented and verified.

---

## ADR-005: Balanced 2-Column Layout for Profiles
- **Context**: Instructor profile view previously crammed information into a single column, leaving wide empty gaps on widescreen displays.
- **Decision**: Refactored `src/app/roster/instructors/[id]/page.tsx` into a balanced 2-column layout:
  - Column 1 (Left, 40% width): Instructor bio, qualifications, contact cards, teaching constraints, active batches.
  - Column 2 (Right, 60% width): Master calendar schedule, assigned modules timeline, availability matrix.
- **Status**: Implemented and verified.

---

## ADR-006: React 19 State Subscription Pattern
- **Context**: React 19 compiler and ESLint strictly flag calling `setState` directly inside a `useEffect` body when reading browser state.
- **Decision**: All external browser events (`navigator.onLine`, media queries, storage sync) must use React 19 `useSyncExternalStore` with snapshot subscribers instead of `useEffect` + `useState`.
- **Status**: Standardized across components (e.g. `pwa-register.tsx`).

---

## ADR-007: Master Verification Harness (`npm run verify`)
- **Context**: Multi-agent workflows need a single, fast, deterministic verification signal to validate changes and self-heal before completing tasks.
- **Decision**: Created `scripts/verify-all.ts` running ESLint, 35 Domain Invariants, 28 Mobile Endpoints, Mobile TypeScript Check, and Next.js Build sequentially in under 35 seconds.
- **Status**: Bound to `npm run verify` in `package.json`.

---

## ADR-008: Real-Time Mobile & Web AI Health Radar & Remediation Engine
- **Context**: AI conflict radar metrics were confined to the web drawer, preventing mobile executives from assessing schedule integrity at a glance, and lacked structured one-click remediation actions.
- **Decision**: Extended `scanRosterHealth` with a normalized 0-100% composite health index, 4 multi-constraint metrics (Conflict-Free, Night Coverage, Cadre Balance, Curriculum Slots), and actionable smart fix suggestions. Enriched mobile companion `/api/mobile/dashboard` and `/api/mobile/schedule` with `AiHealthSummary`. Added an executive-grade AI Health Radar card to `ExecutiveCockpitScreen` and status pills to `ScheduleScreen`.
- **Status**: Implemented and verified across Web & Mobile.
