---
name: verify-all
description: >-
  Run the full SLATE verification harness across ESLint, domain invariants,
  mobile REST API, mobile TypeScript, and Next.js production build.
---

# Full System Verification Runbook

Use this skill to certify that all layers of the SLATE platform are 100% operational before delivering work or deploying.

## Command Execution
Run the unified verification script:
```bash
cmd /c "npm run verify"
```

## Expected Output
A successful run outputs:
```text
====================================================
🛡️  SLATE FULL-SYSTEM VERIFICATION HARNESS
====================================================
⏳ Running ESLint Static Analysis... ✅ PASS
⏳ Running Core Domain Invariants (35 Rules)... ✅ PASS
⏳ Running Mobile Companion API (28 Endpoints)... ✅ PASS
⏳ Running Mobile TypeScript Typecheck... ✅ PASS
⏳ Running Next.js Production Build... ✅ PASS

====================================================
📊 VERIFICATION SUMMARY
====================================================
1. ESLint Static Analysis                 [✅ PASS]
2. Core Domain Invariants (35 Rules)      [✅ PASS]
3. Mobile Companion API (28 Endpoints)    [✅ PASS]
4. Mobile TypeScript Typecheck            [✅ PASS]
5. Next.js Production Build               [✅ PASS]
====================================================
🎯 100% HEALTH: ALL 5 SYSTEM CHECKS PASSED SUCCESSFULLY!
====================================================
```
