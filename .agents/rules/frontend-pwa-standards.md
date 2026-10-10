# Frontend & PWA Architectural Standards

## 1. Design System & Theme Parity
- **Authoritative Palette**: Linear / Raycast-inspired Obsidian Velvet:
  - Deep Canvas: `#080b12`
  - Elevated Surface: `#0d1424`
  - Elevated Card: `#11192d`
  - Subtle Borders: `border-slate-200 dark:border-slate-800`
  - Primary Accent: Indigo (`#6366f1` / `bg-indigo-600`)
  - Standby Accent: Emerald (`#10b981`)
  - Warning / Shift: Amber (`#f59e0b`)
  - Conflict / Leave: Rose (`#f43f5e`)
- **Theme Switching**:
  - Light mode: crisp, high-contrast `#f8fafc` canvas.
  - Dark mode: deep Obsidian Velvet `#080b12`.
  - System mode: responds to OS `prefers-color-scheme`.
  - Zero-FOUC inline script in `<head>` ensures theme is applied before hydration.

## 2. Standardized Button & Component Hierarchy
- `sm` (32px / `h-8`): Table actions, horizon pills, secondary filters.
- `md` (36px / `h-9`): Form submission buttons, modal triggers, header action buttons.
- `lg` (44px / `h-11`): Login primary CTA, hero actions.
- All interactive triggers MUST include:
  - `cursor-pointer`
  - `active:scale-95` (micro-interaction)
  - `transition-all`
  - `disabled:opacity-50 disabled:cursor-not-allowed`

## 3. React 19 State Synchronization Rules
- **NEVER** call `setState` synchronously within a `useEffect` body. This triggers cascading renders and is flagged as an error by React 19 ESLint.
- For external browser state (`localStorage`, `window.matchMedia`, `navigator.onLine`), ALWAYS use `useSyncExternalStore` or lazy initial state:
  ```typescript
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  ```

## 4. PWA & Service Worker Rules
- `public/sw.js` must activate immediately via `self.skipWaiting()` and `self.clients.claim()`.
- API endpoints (`/api/*`) MUST NEVER be cached statically (always Network-first or Network-only).
- Navigation requests must fall back to the cached app shell when offline.
- Static assets (`_next/static`, icons, fonts) use Stale-While-Revalidate caching.
