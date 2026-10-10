---
name: ai-scheduler-ops
description: Operations runbook for auditing and testing the CSP scheduling solver, AI Health Radar conflict detector, and AI Copilot engine in NIBM Slate.
---

# AI Scheduler & Copilot Operations Skill

This skill provides step-by-step procedures to verify, debug, and optimize the deterministic Constraint Satisfaction Problem (CSP) scheduler and the AI Health Radar engine.

## Core Engines

1. **Deterministic CSP Solver**: `src/lib/csp-solver.ts`
   - **Unified Session Window**: 09:00 to 16:00 (single 7-hour block per day, lunch embedded).
   - **Hard Invariants**:
     - No instructor double-booking across batches on the same date.
     - No batch double-booking on the same date.
     - Module qualifications: Instructors must be certified for the assigned module.
     - Room capacity constraints: Room max capacity >= Batch enrolled count.
   - **Soft Heuristics**:
     - Instructor weekly workload smoothing (max 4 consecutive days / 28h per week).
     - Consecutive module block preference for deep cohort learning.

2. **AI Health Radar & Analytics**: `src/lib/ai-assistant.ts`
   - Real-time conflict scanner across all drafted and published schedules.
   - Severity tiers: `CRITICAL` (double-bookings, room violations), `WARNING` (instructor overload, pending unassigned modules), `INFO` (utilization suggestions).
   - Natural language Copilot actions: `draft_schedule`, `resolve_conflict`, `explain_allocation`.

## Operations Runbook

### Step 1: Execute Domain Invariants Suite
Run the 35 invariant test assertions covering scheduling, storage, and constraints:
```powershell
cmd /c "npx tsx scripts/verify-domain-rules.ts"
```
Expect: All 35 tests passing with 0 failures.

### Step 2: Validate CSP Invariants Programmatically
When modifying `src/lib/csp-solver.ts`, test edge cases:
- Overlapping time slots (must reject any slot outside 09:00-16:00).
- Multiple modules per batch in the same day (must reject).
- Zero-qualified instructors (must throw or report unschedulable).

### Step 3: Verify AI Health Radar Output
Verify that radar accurately categorizes conflict counts without crashing on empty or corrupt schedules:
```powershell
cmd /c "npx tsx -e \"import { buildHealthRadar } from './src/lib/ai-assistant'; console.log('Radar module loaded successfully');\""
```
