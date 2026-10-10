---
name: self-heal
description: >-
  Autonomous self-healing procedure to diagnose, isolate, and resolve compiler errors,
  test assertion failures, or lint issues across SLATE web and mobile companion codebases.
---

# Autonomous Self-Healing Runbook

When any test or build fails, activate this skill to methodically diagnose and correct the defect.

## Step 1: Run Verification Harness & Capture Diagnostics
Execute the unified verification suite:
```bash
cmd /c "npm run verify"
```
Inspect the output to determine which layer failed:
- **Layer 1 (ESLint)**: Syntax, unused variables, React 19 hook violations (`set-state-in-effect`).
- **Layer 2 (Domain Invariants)**: 35 critical business rule checks in `scripts/verify-domain-rules.ts`.
- **Layer 3 (Mobile API)**: 28 REST endpoint assertions in `scripts/verify-mobile-api.ts`.
- **Layer 4 (Mobile Check)**: React Native / TypeScript type discrepancies in `mobile/`.
- **Layer 5 (Build)**: Next.js Turbopack compilation or App Router static generation errors.

## Step 2: Trace Isolation
Identify the exact file and line number:
```bash
# Example isolated runs
cmd /c "npm run lint"
cmd /c "npm test"
cmd /c "npm run test:mobile"
cmd /c "npm run mobile:check"
cmd /c "npm run build"
```

## Step 3: Minimal Surgical Fix
1. View the failing file range using `view_file`.
2. Formulate a minimal drop-in correction addressing the root cause.
3. Apply the fix using `replace_file_content`.

## Step 4: Validate Correction
Re-run the verification harness:
```bash
cmd /c "npm run verify"
```
If passing: exit with evidence.
If still failing and under 3 iterations: repeat from Step 2.
