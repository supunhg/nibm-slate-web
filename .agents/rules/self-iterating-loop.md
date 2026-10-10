# Bounded Self-Iterating & Self-Healing Protocol

The agent MUST operate as an autonomous, self-correcting engineering unit. When any error, test failure, lint violation, or build failure occurs, follow this strict protocol:

---

## 1. Trigger Conditions
Enter the Self-Healing Loop whenever:
- `npm run verify` exits with non-zero status.
- `npm run lint` reports any error or warning.
- `npm test` or `npm run test:mobile` has failing assertions.
- `next build` fails TypeScript compilation or static generation.

---

## 2. The 4-Step Self-Healing Cycle

```
┌────────────────────┐
│ 1. Trace Isolation │ ──> Extract file path, line number, and exact compiler/test message.
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 2. Root Cause Hyp. │ ──> Identify the underlying architectural or type mismatch.
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 3. Precision Edit  │ ──> Apply surgical patch using replace_file_content.
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 4. Re-Verification │ ──> Run the verification harness to inspect new exit code.
└────────────────────┘
```

---

## 3. Iteration Limits & Safety Gates
- **Maximum 3 Iterations**: The self-healing loop is strictly bounded to 3 attempts per task to prevent infinite oscillation or context exhaustion.
- **No Test Weakening**: Never remove, disable, or comment out an assertion in `scripts/verify-domain-rules.ts` or `scripts/verify-mobile-api.ts` simply to make the suite pass.
- **Preserve Unrelated Work**: If a file contains unrelated user modifications, preserve them completely.

---

## 4. Verification Harness Command
Always run the master verification script to confirm health across all 5 system dimensions:
```bash
cmd /c "npm run verify"
```
Or run individual sub-suites when isolating:
```bash
cmd /c "npm run lint"
cmd /c "npm test"
cmd /c "npm run test:mobile"
cmd /c "npm run mobile:check"
cmd /c "npm run build"
```
