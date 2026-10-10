# Engineering Learnings & Operational Insights

## 1. Windows Shell & Process Execution
- **Context**: The development environment runs on Windows with PowerShell as the default shell.
- **Gotcha**: PowerShell blocks execution of unapproved `.ps1` scripts by default policy, and POSIX shell scripts (`.sh`) cannot execute without Bash.
- **Solution**: Always execute npm scripts through `cmd /c "npm run <script>"` or `cmd /c "npx <command>"`. This guarantees consistent execution, proper exit code propagation, and immunity to PowerShell execution policy restrictions.

---

## 2. React 19 & Next.js 16 Component Patterns
- **Gotcha**: React 19 linter strictly flags `setState` calls directly within `useEffect` bodies, specifically when synchronizing with external browser state like `navigator.onLine`, `localStorage`, or `window.matchMedia`.
- **Solution**: Use `useSyncExternalStore`:
  ```tsx
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true // SSR fallback
  );
  ```
  This eliminates hydration mismatches, removes unnecessary render cycles, and satisfies React 19 compiler invariants.

---

## 3. Atomic File Writes with Concurrency Locks
- **Gotcha**: When using the file fallback in `data/roster-store.json`, concurrent requests or tests writing to the same file can corrupt JSON contents.
- **Solution**: `src/lib/roster-store.ts` implements a write queue with lock acquisition and writes to a temporary file (`.tmp`) before atomic rename. When writing tests, always isolate test data using `ROSTER_STORE_PATH` environment overrides to prevent clobbering production data.

---

## 4. Constraint Satisfaction Problem (CSP) Boundary Conditions
- **Gotcha**: In large academic batches, greedy scheduling algorithms can encounter deadlocks where an instructor has no available days remaining without violating the 4-day consecutive threshold.
- **Solution**: The solver in `src/lib/csp-solver.ts` employs forward-checking with most-constrained-variable (MCV) ordering and minimum-remaining-values (MRV) heuristic. It detects unsolvable states early and yields actionable conflict logs rather than hanging.

---

## 5. Mobile TypeScript Contract Synchronization
- **Gotcha**: Adding or modifying API response shapes in Next.js backend routes can silently desynchronize mobile app TypeScript types in `mobile/`.
- **Solution**: `scripts/verify-all.ts` includes `npm --prefix mobile run typecheck` in the mandatory verification pipeline. This catches any API contract drift between web backend and mobile client before code lands.
